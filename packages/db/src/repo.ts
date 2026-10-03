/// <reference path="./sqlite.d.ts" />
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import {
  aggregateInsights,
  catalogFor,
  clampCooldownSeconds,
  clampReflectionSeconds,
  emptyDraft,
  explainScore,
  hostMatchesDomain,
  planContinue,
  pointsFor,
  preferenceFromDraft,
  scoreIdempotencyKey,
  shouldIntervene,
  streakFromDays,
  type ApprovalStatus,
  type HomeSnapshot,
  type InsightStats,
  type OnboardingDraft,
  type OnboardingPreference,
  type RestrictionLevel,
  type ScoreAction,
  type SiteCategory,
  type UserSettings,
} from '@impulse/shared'
import { AppError } from './errors'
import { SCHEMA } from './schema'

type Sql = DatabaseSync

export type SessionUser = { userId: string; kind: 'user' | 'extension'; sessionId: string }

export type InterventionResult = {
  interventionId: string
  status: 'continued' | 'saved' | 'dropped' | 'reflection_required' | 'approval_required'
  seconds?: number
  contacts?: Array<{ id: string; displayName: string }>
  scoreAwarded: number
  deferredId?: string
  cooldownUntil?: string
}

const FINAL = new Set(['continue', 'save', 'drop'])
const ONLINE_MS = 15 * 60 * 1000

export class SqliteRepo {
  constructor(
    private db: Sql,
    private opts: { now?: () => Date; pepper?: string } = {},
  ) {
    this.db.exec('PRAGMA foreign_keys = ON')
    this.db.exec(SCHEMA)
  }

  private now(): Date {
    return this.opts.now?.() ?? new Date()
  }

  private iso(date = this.now()): string {
    return date.toISOString()
  }

  private pepper(): string {
    return this.opts.pepper ?? 'impulse-dev-pepper'
  }

  private hash(value: string): string {
    return createHash('sha256').update(this.pepper()).update(value).digest('hex')
  }

  private token(prefix: string): string {
    return `${prefix}_${randomBytes(32).toString('base64url')}`
  }

  private code(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const bytes = randomBytes(8)
    return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')
  }

  private tx<T>(fn: () => T): T {
    this.db.exec('BEGIN')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  private get(sql: string, ...params: Array<string | number | null>): Record<string, unknown> | undefined {
    return this.db.prepare(sql).get(...params) as Record<string, unknown> | undefined
  }

  private all(sql: string, ...params: Array<string | number | null>): Record<string, unknown>[] {
    return this.db.prepare(sql).all(...params) as Record<string, unknown>[]
  }

  private run(sql: string, ...params: Array<string | number | null>): void {
    this.db.prepare(sql).run(...params)
  }

  createDevUser(displayName: string, email?: string): { token: string; userId: string } {
    const existing = email
      ? this.get(`SELECT id FROM users WHERE email = ? AND deleted_at IS NULL AND provider = 'dev'`, email)
      : undefined
    const userId = existing ? String(existing.id) : randomUUID()
    if (!existing) {
      const now = this.iso()
      this.run(
        `INSERT INTO users (id, display_name, email, provider, provider_id, created_at) VALUES (?, ?, ?, 'dev', ?, ?)`,
        userId,
        displayName,
        email ?? null,
        email ?? userId,
        now,
      )
      this.insertProfile(userId, now)
    }
    return { userId, token: this.createSession(userId, 'user', 'Development', 1000 * 60 * 60 * 24 * 30).token }
  }

  upsertGoogleUser(input: { providerId: string; email: string; displayName: string }): { token: string; userId: string } {
    const byProvider = this.get(
      `SELECT id FROM users WHERE provider = 'google' AND provider_id = ? AND deleted_at IS NULL`,
      input.providerId,
    )
    const byEmail = this.get(`SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`, input.email)
    const userId = String(byProvider?.id ?? byEmail?.id ?? randomUUID())
    const now = this.iso()
    if (!byProvider && !byEmail) {
      this.run(
        `INSERT INTO users (id, display_name, email, provider, provider_id, created_at) VALUES (?, ?, ?, 'google', ?, ?)`,
        userId,
        input.displayName,
        input.email,
        input.providerId,
        now,
      )
      this.insertProfile(userId, now)
    }
    return { userId, token: this.createSession(userId, 'user', 'Google', 1000 * 60 * 60 * 24 * 30).token }
  }

  private insertProfile(userId: string, now: string): void {
    this.run(
      `INSERT INTO profiles (user_id, updated_at) VALUES (?, ?)`,
      userId,
      now,
    )
  }

  private createSession(userId: string, kind: 'user' | 'extension', label: string, ttlMs: number): { token: string; sessionId: string } {
    const token = this.token(kind === 'user' ? 'usr' : 'ext')
    const sessionId = randomUUID()
    const now = this.now()
    this.run(
      `INSERT INTO sessions (id, user_id, token_hash, kind, device_label, last_seen_at, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      userId,
      this.hash(token),
      kind,
      label,
      now.toISOString(),
      now.toISOString(),
      new Date(now.getTime() + ttlMs).toISOString(),
    )
    return { token, sessionId }
  }

  sessionFromToken(token: string): SessionUser | null {
    const row = this.get(
      `SELECT id, user_id, kind, expires_at, revoked_at FROM sessions WHERE token_hash = ?`,
      this.hash(token),
    )
    if (!row || row.revoked_at) return null
    if (String(row.expires_at) <= this.iso()) return null
    this.run(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`, this.iso(), String(row.id))
    return { userId: String(row.user_id), kind: row.kind === 'extension' ? 'extension' : 'user', sessionId: String(row.id) }
  }

  revokeSession(sessionId: string, userId: string): void {
    this.run(`UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ?`, this.iso(), sessionId, userId)
  }

  deleteAccount(userId: string): void {
    this.run(`DELETE FROM users WHERE id = ?`, userId)
  }

  exportAccount(userId: string): Record<string, unknown> {
    const tables = [
      'users',
      'profiles',
      'onboarding_responses',
      'protected_sites',
      'trusted_contacts',
      'friendships',
      'interventions',
      'deferred_purchases',
      'approval_requests',
      'score_events',
      'challenges',
      'challenge_members',
      'notification_deliveries',
    ]
    const data: Record<string, unknown> = {}
    for (const table of tables) {
      if (table === 'users') data.users = this.all(`SELECT id, display_name, email, provider, created_at FROM users WHERE id = ?`, userId)
      else if (table === 'friendships') {
        data.friendships = this.all(`SELECT * FROM friendships WHERE requester_id = ? OR addressee_id = ?`, userId, userId)
      } else if (table === 'challenges') data.challenges = this.all(`SELECT * FROM challenges WHERE creator_id = ?`, userId)
      else if (table === 'challenge_members') data.challenge_members = this.all(`SELECT * FROM challenge_members WHERE user_id = ?`, userId)
      else if (table === 'approval_requests') data.approval_requests = this.all(`SELECT id, intervention_id, requester_id, contact_id, status, expires_at, responded_at, created_at FROM approval_requests WHERE requester_id = ?`, userId)
      else {
        const column = table === 'profiles' || table === 'onboarding_responses' || table === 'protected_sites' || table === 'interventions' || table === 'deferred_purchases' || table === 'score_events' || table === 'notification_deliveries'
          ? 'user_id'
          : 'owner_id'
        data[table] = this.all(`SELECT * FROM ${table} WHERE ${column} = ?`, userId)
      }
    }
    return data
  }

  getSettings(userId: string): UserSettings & { onboardingComplete: boolean } {
    const row = this.mustProfile(userId)
    return this.mapSettings(row)
  }

  updateSettings(userId: string, patch: Partial<UserSettings>): UserSettings & { onboardingComplete: boolean } {
    const current = this.getSettings(userId)
    const next = {
      ...current,
      ...patch,
      reflectionSeconds: clampReflectionSeconds(patch.reflectionSeconds ?? current.reflectionSeconds),
      cooldownSeconds: clampCooldownSeconds(patch.cooldownSeconds ?? current.cooldownSeconds),
    }
    this.run(
      `UPDATE profiles SET restriction_level = ?, reflection_seconds = ?, cooldown_seconds = ?, approval_required = ?,
        monitoring_enabled = ?, leaderboard_opt_in = ?, profile_visibility = ?, social_enabled = ?,
        notify_saved = ?, notify_approvals = ?, notify_challenges = ?, updated_at = ? WHERE user_id = ?`,
      next.restrictionLevel,
      next.reflectionSeconds,
      next.cooldownSeconds,
      next.approvalRequired ? 1 : 0,
      next.monitoringEnabled ? 1 : 0,
      next.leaderboardOptIn ? 1 : 0,
      next.profileVisibility,
      next.socialEnabled ? 1 : 0,
      next.notifySaved ? 1 : 0,
      next.notifyApprovals ? 1 : 0,
      next.notifyChallenges ? 1 : 0,
      this.iso(),
      userId,
    )
    return this.getSettings(userId)
  }

  listSites(userId: string): Array<{ id: string; domain: string; category: SiteCategory; enabled: boolean }> {
    return this.all(`SELECT id, domain, category, enabled FROM protected_sites WHERE user_id = ? ORDER BY domain`, userId).map((row) => ({
      id: String(row.id),
      domain: String(row.domain),
      category: row.category as SiteCategory,
      enabled: Boolean(row.enabled),
    }))
  }

  addSite(userId: string, domain: string, category: SiteCategory, enabled = true): void {
    this.run(
      `INSERT INTO protected_sites (id, user_id, domain, category, enabled) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, domain) DO UPDATE SET enabled = excluded.enabled, category = excluded.category`,
      randomUUID(),
      userId,
      domain,
      category,
      enabled ? 1 : 0,
    )
  }

  enableCategories(userId: string, categories: Array<'shopping' | 'betting'>): void {
    for (const entry of catalogFor(categories)) this.addSite(userId, entry.domain, entry.category, true)
  }

  readDraft(userId: string): OnboardingDraft {
    const row = this.get(`SELECT payload FROM onboarding_drafts WHERE user_id = ?`, userId)
    if (!row) return emptyDraft()
    return JSON.parse(String(row.payload)) as OnboardingDraft
  }

  saveDraft(userId: string, draft: OnboardingDraft): void {
    this.run(
      `INSERT INTO onboarding_drafts (user_id, payload, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      userId,
      JSON.stringify(draft),
      this.iso(),
    )
  }

  completeOnboarding(userId: string, preference: OnboardingPreference, source: 'ai' | 'deterministic'): void {
    const now = this.iso()
    this.run(
      `INSERT INTO onboarding_responses (id, user_id, consent, payload, source, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      userId,
      preference.consentToStore ? 1 : 0,
      JSON.stringify(preference),
      source,
      now,
    )
    this.run(
      `UPDATE profiles SET onboarding_complete = 1, restriction_level = ?, approval_required = ?, updated_at = ? WHERE user_id = ?`,
      preference.chosenLevel,
      preference.chosenLevel === 'high' && preference.wantsTrustedContact ? 1 : 0,
      now,
      userId,
    )
    this.enableCategories(userId, preference.categories)
  }

  createPairCode(userId: string): { code: string; expiresAt: string } {
    const code = this.code()
    const expires = new Date(this.now().getTime() + 10 * 60 * 1000)
    this.run(
      `INSERT INTO pair_codes (id, user_id, code_hash, expires_at) VALUES (?, ?, ?, ?)`,
      randomUUID(),
      userId,
      this.hash(code),
      expires.toISOString(),
    )
    return { code, expiresAt: expires.toISOString() }
  }

  consumePairCode(code: string, deviceLabel: string): { token: string; userId: string } {
    const row = this.get(`SELECT id, user_id, expires_at, consumed_at FROM pair_codes WHERE code_hash = ?`, this.hash(code.toUpperCase()))
    if (!row || row.consumed_at || String(row.expires_at) <= this.iso()) {
      throw new AppError(400, 'invalid_code', 'That connection code is invalid or expired.')
    }
    this.run(`UPDATE pair_codes SET consumed_at = ? WHERE id = ?`, this.iso(), String(row.id))
    const session = this.createSession(String(row.user_id), 'extension', deviceLabel || 'Chrome', 1000 * 60 * 60 * 24 * 90)
    return { token: session.token, userId: String(row.user_id) }
  }

  extensionStatus(userId: string): { linked: boolean; lastSeenAt: string | null; online: boolean } {
    const row = this.get(
      `SELECT last_seen_at FROM sessions WHERE user_id = ? AND kind = 'extension' AND revoked_at IS NULL ORDER BY last_seen_at DESC LIMIT 1`,
      userId,
    )
    if (!row) return { linked: false, lastSeenAt: null, online: false }
    const last = String(row.last_seen_at)
    return { linked: true, lastSeenAt: last, online: this.now().getTime() - new Date(last).getTime() < ONLINE_MS }
  }

  inviteTrusted(userId: string, input: { displayName: string; email?: string; phone?: string }): { id: string; token: string } {
    if (!input.email && !input.phone) throw new AppError(400, 'contact_required', 'Add an email or a phone number.')
    const token = this.token('trust')
    const id = randomUUID()
    this.run(
      `INSERT INTO trusted_contacts (id, owner_id, display_name, email, phone, status, token_hash, created_at)
       VALUES (?, ?, ?, ?, ?, 'invited', ?, ?)`,
      id,
      userId,
      input.displayName,
      input.email ?? null,
      input.phone ?? null,
      this.hash(token),
      this.iso(),
    )
    return { id, token }
  }

  acceptTrusted(token: string): { ownerId: string; contactId: string } {
    const row = this.get(`SELECT id, owner_id, status FROM trusted_contacts WHERE token_hash = ?`, this.hash(token))
    if (!row || row.status === 'revoked') throw new AppError(404, 'not_found', 'This invitation is not active.')
    if (row.status === 'accepted') return { ownerId: String(row.owner_id), contactId: String(row.id) }
    this.run(`UPDATE trusted_contacts SET status = 'accepted', consent_at = ? WHERE id = ?`, this.iso(), String(row.id))
    return { ownerId: String(row.owner_id), contactId: String(row.id) }
  }

  contactPhone(userId: string, contactId: string): string | null {
    const row = this.get(`SELECT phone FROM trusted_contacts WHERE id = ? AND owner_id = ? AND status = 'accepted'`, contactId, userId)
    return row?.phone ? String(row.phone) : null
  }

  listTrusted(userId: string): Array<{ id: string; displayName: string; status: string; email: string | null }> {
    return this.all(
      `SELECT id, display_name, status, email FROM trusted_contacts WHERE owner_id = ? ORDER BY created_at`,
      userId,
    ).map((row) => ({
      id: String(row.id),
      displayName: String(row.display_name),
      status: String(row.status),
      email: row.email ? String(row.email) : null,
    }))
  }

  revokeTrusted(userId: string, contactId: string): void {
    const row = this.get(`SELECT id FROM trusted_contacts WHERE id = ? AND owner_id = ?`, contactId, userId)
    if (!row) throw new AppError(404, 'not_found', 'Contact not found.')
    this.run(`UPDATE trusted_contacts SET status = 'revoked' WHERE id = ?`, contactId)
    this.run(
      `UPDATE approval_requests SET status = 'canceled', responded_at = ? WHERE contact_id = ? AND status = 'pending'`,
      this.iso(),
      contactId,
    )
  }

  inviteFriend(userId: string, email: string): { token: string; friendshipId: string | null } {
    const person = this.get(`SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`, email)
    if (person && String(person.id) !== userId) {
      const id = randomUUID()
      this.run(
        `INSERT INTO friendships (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)
         ON CONFLICT(requester_id, addressee_id) DO NOTHING`,
        id,
        userId,
        String(person.id),
        this.iso(),
      )
      return { token: '', friendshipId: id }
    }
    const token = this.token('friend')
    const expires = new Date(this.now().getTime() + 1000 * 60 * 60 * 24 * 14)
    this.run(
      `INSERT INTO friend_invites (id, inviter_id, email, token_hash, status, expires_at, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      randomUUID(),
      userId,
      email,
      this.hash(token),
      expires.toISOString(),
      this.iso(),
    )
    return { token, friendshipId: null }
  }

  acceptFriendInvite(token: string, userId: string): void {
    const invite = this.get(`SELECT id, inviter_id, expires_at, status FROM friend_invites WHERE token_hash = ?`, this.hash(token))
    if (!invite || invite.status !== 'pending' || String(invite.expires_at) <= this.iso()) {
      throw new AppError(400, 'invalid_invite', 'This friend invitation is no longer valid.')
    }
    if (String(invite.inviter_id) === userId) throw new AppError(400, 'invalid_invite', 'You cannot accept your own invitation.')
    this.run(
      `INSERT INTO friendships (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, 'accepted', ?)
       ON CONFLICT(requester_id, addressee_id) DO UPDATE SET status = 'accepted'`,
      randomUUID(),
      String(invite.inviter_id),
      userId,
      this.iso(),
    )
    this.run(`UPDATE friend_invites SET status = 'accepted' WHERE id = ?`, String(invite.id))
  }

  respondFriend(userId: string, friendshipId: string, accept: boolean): void {
    const row = this.get(`SELECT addressee_id, status FROM friendships WHERE id = ?`, friendshipId)
    if (!row || String(row.addressee_id) !== userId) throw new AppError(404, 'not_found', 'Invitation not found.')
    this.run(`UPDATE friendships SET status = ? WHERE id = ?`, accept ? 'accepted' : 'removed', friendshipId)
  }

  removeFriend(userId: string, friendshipId: string): void {
    const row = this.get(`SELECT requester_id, addressee_id FROM friendships WHERE id = ?`, friendshipId)
    if (!row || (String(row.requester_id) !== userId && String(row.addressee_id) !== userId)) {
      throw new AppError(404, 'not_found', 'Friend not found.')
    }
    this.run(`UPDATE friendships SET status = 'removed' WHERE id = ?`, friendshipId)
  }

  listFriends(userId: string): Array<{ id: string; name: string; status: string; direction: 'in' | 'out' }> {
    return this.all(
      `SELECT f.id, f.status, f.requester_id, u.display_name
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status != 'removed'`,
      userId,
      userId,
      userId,
    ).map((row) => ({
      id: String(row.id),
      name: String(row.display_name),
      status: String(row.status),
      direction: String(row.requester_id) === userId ? 'out' : 'in',
    }))
  }

  createIntervention(
    userId: string,
    input: {
      idempotencyKey: string
      url: string
      itemName?: string
      amountCents?: number | null
      decision: 'continue' | 'save' | 'drop'
      reflectionCompleted?: boolean
      overrideEssential?: boolean
      shareDetails?: boolean
    },
  ): InterventionResult {
    return this.tx(() => {
      const settings = this.getSettings(userId)
      const sites = this.listSites(userId)
      const gate = shouldIntervene({ url: input.url, monitoringEnabled: settings.monitoringEnabled, sites })
      if (!gate.ok) throw new AppError(422, gate.reason, 'This page is not an eligible protected checkout.')
      const domain = gate.domain
      const category = sites.find((site) => site.domain === domain)?.category ?? 'custom'
      const amount = typeof input.amountCents === 'number' ? input.amountCents : null
      const existing = this.get(
        `SELECT * FROM interventions WHERE user_id = ? AND idempotency_key = ?`,
        userId,
        input.idempotencyKey,
      )
      if (existing && FINAL.has(String(existing.decision))) return this.resultFrom(existing)

      const id = existing ? String(existing.id) : randomUUID()
      const contacts = this.listTrusted(userId).filter((contact) => contact.status === 'accepted')
      const approval = existing ? this.latestApproval(id) : undefined
      const now = this.iso()

      if (input.decision === 'drop') {
        this.upsertIntervention({ id, userId, input, domain, category, amount, decision: 'drop', level: settings.restrictionLevel, now, existing: Boolean(existing) })
        const awarded = this.award(userId, 'abandon', id, domain, id, null)
        return { interventionId: id, status: 'dropped', scoreAwarded: awarded }
      }

      if (input.decision === 'save') {
        this.upsertIntervention({ id, userId, input, domain, category, amount, decision: 'save', level: settings.restrictionLevel, now, existing: Boolean(existing) })
        const deferredId = this.ensureDeferred(userId, id, input.url, domain, input.itemName ?? null, amount, settings.cooldownSeconds)
        const awarded = this.award(userId, 'defer', id, domain, id, deferredId)
        const row = this.get(`SELECT cooldown_until FROM deferred_purchases WHERE id = ?`, deferredId)
        return {
          interventionId: id,
          status: 'saved',
          scoreAwarded: awarded,
          deferredId,
          cooldownUntil: row ? String(row.cooldown_until) : undefined,
        }
      }

      const plan = planContinue({
        level: settings.restrictionLevel,
        reflectionSeconds: settings.reflectionSeconds,
        approvalRequired: settings.approvalRequired,
        hasTrustedContact: contacts.length > 0,
        reflectionCompleted: Boolean(input.reflectionCompleted),
        approvalStatus: (approval?.status as ApprovalStatus | undefined) ?? null,
        overrideEssential: Boolean(input.overrideEssential),
      })

      if (plan.type === 'need_reflection') {
        this.upsertIntervention({ id, userId, input, domain, category, amount, decision: 'reflecting', level: settings.restrictionLevel, now, existing: Boolean(existing) })
        return { interventionId: id, status: 'reflection_required', seconds: plan.seconds, scoreAwarded: 0 }
      }
      if (plan.type === 'need_approval') {
        this.upsertIntervention({ id, userId, input, domain, category, amount, decision: 'awaiting_approval', level: settings.restrictionLevel, now, existing: Boolean(existing) })
        return {
          interventionId: id,
          status: 'approval_required',
          contacts: contacts.map((contact) => ({ id: contact.id, displayName: contact.displayName })),
          scoreAwarded: 0,
        }
      }

      this.upsertIntervention({
        id,
        userId,
        input,
        domain,
        category,
        amount,
        decision: 'continue',
        level: settings.restrictionLevel,
        now,
        existing: Boolean(existing),
        override: plan.type === 'allowed_override',
      })
      const awarded = plan.type === 'allow' && plan.awardReflection ? this.award(userId, 'reflection_complete', id, domain, id, null) : 0
      return { interventionId: id, status: 'continued', scoreAwarded: awarded }
    })
  }

  private upsertIntervention(args: {
    id: string
    userId: string
    input: { idempotencyKey: string; url: string; itemName?: string; shareDetails?: boolean }
    domain: string
    category: string
    amount: number | null
    decision: string
    level: RestrictionLevel
    now: string
    existing: boolean
    override?: boolean
  }): void {
    if (!args.existing) {
      this.run(
        `INSERT INTO interventions (id, user_id, idempotency_key, domain, url, category, item_name, amount_cents, decision, restriction_level, override_essential, share_details, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args.id,
        args.userId,
        args.input.idempotencyKey,
        args.domain,
        args.input.url,
        args.category,
        args.input.itemName ?? null,
        args.amount,
        args.decision,
        args.level,
        args.override ? 1 : 0,
        args.input.shareDetails ? 1 : 0,
        args.now,
        args.now,
      )
      return
    }
    this.run(
      `UPDATE interventions SET decision = ?, amount_cents = ?, item_name = ?, override_essential = ?, share_details = ?, updated_at = ? WHERE id = ?`,
      args.decision,
      args.amount,
      args.input.itemName ?? null,
      args.override ? 1 : 0,
      args.input.shareDetails ? 1 : 0,
      args.now,
      args.id,
    )
  }

  private ensureDeferred(userId: string, interventionId: string, url: string, domain: string, itemName: string | null, amount: number | null, cooldownSeconds: number): string {
    const existing = this.get(`SELECT id FROM deferred_purchases WHERE intervention_id = ?`, interventionId)
    if (existing) return String(existing.id)
    const id = randomUUID()
    const saved = this.now()
    this.run(
      `INSERT INTO deferred_purchases (id, user_id, intervention_id, url, domain, item_name, amount_cents, saved_at, cooldown_until, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'saved')`,
      id,
      userId,
      interventionId,
      url,
      domain,
      itemName,
      amount,
      saved.toISOString(),
      new Date(saved.getTime() + cooldownSeconds * 1000).toISOString(),
    )
    return id
  }

  private award(userId: string, action: ScoreAction, subjectId: string, domain: string, interventionId: string | null, deferredId: string | null): number {
    const points = pointsFor(action)
    const key = scoreIdempotencyKey(action, subjectId)
    const result = this.db.prepare(
      `INSERT OR IGNORE INTO score_events (id, user_id, action, points, idempotency_key, explanation, intervention_id, deferred_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), userId, action, points, key, explainScore(action, domain), interventionId, deferredId, this.iso())
    return Number(result.changes) > 0 ? points : 0
  }

  private resultFrom(row: Record<string, unknown>): InterventionResult {
    const decision = String(row.decision)
    const status = decision === 'continue' ? 'continued' : decision === 'save' ? 'saved' : 'dropped'
    return { interventionId: String(row.id), status, scoreAwarded: 0 }
  }

  private latestApproval(interventionId: string): { status: string; id: string } | undefined {
    const row = this.get(
      `SELECT id, status, expires_at FROM approval_requests WHERE intervention_id = ? ORDER BY created_at DESC LIMIT 1`,
      interventionId,
    )
    if (!row) return undefined
    if (row.status === 'pending' && String(row.expires_at) <= this.iso()) {
      this.run(`UPDATE approval_requests SET status = 'expired', responded_at = ? WHERE id = ?`, this.iso(), String(row.id))
      return { status: 'expired', id: String(row.id) }
    }
    return { status: String(row.status), id: String(row.id) }
  }

  createApproval(userId: string, interventionId: string, contactId: string): { id: string; token: string; expiresAt: string } {
    const intervention = this.get(`SELECT id, decision, domain, item_name, amount_cents, share_details FROM interventions WHERE id = ? AND user_id = ?`, interventionId, userId)
    if (!intervention || intervention.decision !== 'awaiting_approval') {
      throw new AppError(409, 'not_waiting', 'This intervention is not waiting for approval.')
    }
    const contact = this.get(`SELECT id, status FROM trusted_contacts WHERE id = ? AND owner_id = ?`, contactId, userId)
    if (!contact || contact.status !== 'accepted') throw new AppError(403, 'forbidden', 'That contact cannot receive requests.')
    const pending = this.get(`SELECT id FROM approval_requests WHERE intervention_id = ? AND status = 'pending'`, interventionId)
    if (pending) throw new AppError(409, 'already_pending', 'A request is already open for this purchase.')
    const token = this.token('approve')
    const id = randomUUID()
    const expires = new Date(this.now().getTime() + 2 * 60 * 60 * 1000)
    this.run(
      `INSERT INTO approval_requests (id, intervention_id, requester_id, contact_id, status, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      id,
      interventionId,
      userId,
      contactId,
      this.hash(token),
      expires.toISOString(),
      this.iso(),
    )
    return { id, token, expiresAt: expires.toISOString() }
  }

  approvalForUser(userId: string, approvalId: string): Record<string, unknown> | null {
    this.expireApproval(approvalId)
    const row = this.get(
      `SELECT a.id, a.status, a.expires_at, a.requester_id, i.domain, i.item_name, i.amount_cents, i.share_details
       FROM approval_requests a JOIN interventions i ON i.id = a.intervention_id
       WHERE a.id = ? AND a.requester_id = ?`,
      approvalId,
      userId,
    )
    if (!row) return null
    return {
      id: row.id,
      status: row.status,
      expiresAt: row.expires_at,
      domain: row.domain,
      itemName: row.share_details ? row.item_name : null,
      amountCents: row.share_details ? row.amount_cents : null,
    }
  }

  previewApproval(token: string): { status: string; domain: string; expiresAt: string } | null {
    const row = this.get(
      `SELECT a.status, a.expires_at, i.domain FROM approval_requests a
       JOIN interventions i ON i.id = a.intervention_id WHERE a.token_hash = ?`,
      this.hash(token),
    )
    if (!row) return null
    return { status: String(row.status), domain: String(row.domain), expiresAt: String(row.expires_at) }
  }

  respondApproval(token: string, decision: 'approve' | 'decline'): { status: ApprovalStatus } {
    const row = this.get(`SELECT id, status, expires_at FROM approval_requests WHERE token_hash = ?`, this.hash(token))
    if (!row) throw new AppError(404, 'not_found', 'Request not found.')
    if (row.status !== 'pending') throw new AppError(409, 'already_resolved', 'This request was already answered.')
    if (String(row.expires_at) <= this.iso()) {
      this.run(`UPDATE approval_requests SET status = 'expired', responded_at = ? WHERE id = ?`, this.iso(), String(row.id))
      throw new AppError(410, 'expired', 'This request expired.')
    }
    const status = decision === 'approve' ? 'approved' : 'declined'
    this.run(`UPDATE approval_requests SET status = ?, responded_at = ? WHERE id = ? AND status = 'pending'`, status, this.iso(), String(row.id))
    return { status }
  }

  cancelApproval(userId: string, approvalId: string): void {
    const row = this.get(`SELECT id, status FROM approval_requests WHERE id = ? AND requester_id = ?`, approvalId, userId)
    if (!row) throw new AppError(404, 'not_found', 'Request not found.')
    if (row.status !== 'pending') throw new AppError(409, 'already_resolved', 'This request was already answered.')
    this.run(`UPDATE approval_requests SET status = 'canceled', responded_at = ? WHERE id = ?`, this.iso(), approvalId)
  }

  private expireApproval(approvalId: string): void {
    const row = this.get(`SELECT status, expires_at FROM approval_requests WHERE id = ?`, approvalId)
    if (row && row.status === 'pending' && String(row.expires_at) <= this.iso()) {
      this.run(`UPDATE approval_requests SET status = 'expired', responded_at = ? WHERE id = ?`, this.iso(), approvalId)
    }
  }

  listSaved(userId: string): Array<Record<string, unknown>> {
    this.sweepNotifications(userId)
    return this.all(
      `SELECT id, url, domain, item_name, amount_cents, saved_at, cooldown_until, status, revisited_at
       FROM deferred_purchases WHERE user_id = ? AND status != 'removed' ORDER BY saved_at DESC`,
      userId,
    ).map((row) => this.mapSaved(row))
  }

  updateCooldown(userId: string, deferredId: string, cooldownSeconds: number): void {
    const row = this.mustDeferred(userId, deferredId)
    if (row.status === 'purchased' || row.status === 'removed') throw new AppError(409, 'closed', 'This item is closed.')
    const until = new Date(this.now().getTime() + clampCooldownSeconds(cooldownSeconds) * 1000).toISOString()
    const status = until <= this.iso() ? 'eligible' : 'saved'
    this.run(
      `UPDATE deferred_purchases SET cooldown_until = ?, status = ?, notified_at = NULL WHERE id = ?`,
      until,
      status,
      deferredId,
    )
  }

  revisitSaved(userId: string, deferredId: string): { url: string; scoreAwarded: number } {
    const row = this.mustDeferred(userId, deferredId)
    if (String(row.cooldown_until) > this.iso()) throw new AppError(409, 'cooling_down', 'The cooldown has not finished.')
    if (!row.revisited_at) {
      this.run(`UPDATE deferred_purchases SET status = 'eligible', revisited_at = ? WHERE id = ?`, this.iso(), deferredId)
    } else {
      this.run(`UPDATE deferred_purchases SET status = 'eligible' WHERE id = ?`, deferredId)
    }
    const awarded = this.award(userId, 'revisit', deferredId, String(row.domain), String(row.intervention_id), deferredId)
    return { url: String(row.url), scoreAwarded: awarded }
  }

  markPurchased(userId: string, deferredId: string): void {
    this.mustDeferred(userId, deferredId)
    this.run(`UPDATE deferred_purchases SET status = 'purchased' WHERE id = ?`, deferredId)
  }

  removeSaved(userId: string, deferredId: string): void {
    this.mustDeferred(userId, deferredId)
    this.run(`UPDATE deferred_purchases SET status = 'removed' WHERE id = ?`, deferredId)
  }

  private mustDeferred(userId: string, deferredId: string): Record<string, unknown> {
    const row = this.get(`SELECT * FROM deferred_purchases WHERE id = ? AND user_id = ?`, deferredId, userId)
    if (!row) throw new AppError(404, 'not_found', 'Saved purchase not found.')
    return row
  }

  private mapSaved(row: Record<string, unknown>): Record<string, unknown> {
    const eligible = String(row.cooldown_until) <= this.iso() && row.status === 'saved'
    return {
      id: row.id,
      url: row.url,
      domain: row.domain,
      itemName: row.item_name,
      amountCents: row.amount_cents,
      savedAt: row.saved_at,
      cooldownUntil: row.cooldown_until,
      status: eligible ? 'eligible' : row.status,
      revisitedAt: row.revisited_at,
    }
  }

  sweepNotifications(userId: string): void {
    const settings = this.getSettings(userId)
    const due = this.all(
      `SELECT id, domain FROM deferred_purchases
       WHERE user_id = ? AND status = 'saved' AND cooldown_until <= ? AND notified_at IS NULL`,
      userId,
      this.iso(),
    )
    for (const row of due) {
      this.run(`UPDATE deferred_purchases SET status = 'eligible', notified_at = ? WHERE id = ?`, this.iso(), String(row.id))
      if (settings.notifySaved) {
        this.run(
          `INSERT INTO notification_deliveries (id, user_id, kind, channel, status, subject_id, detail, created_at)
           VALUES (?, ?, 'saved_eligible', 'in_app', 'sent', ?, ?, ?)`,
          randomUUID(),
          userId,
          String(row.id),
          `${String(row.domain)} is ready to review.`,
          this.iso(),
        )
      }
    }
  }

  createChallenge(userId: string, input: { title: string; goalType: ScoreAction; goalCount: number; days: number; inviteUserIds?: string[] }): { id: string } {
    const settings = this.getSettings(userId)
    if (!settings.socialEnabled) throw new AppError(403, 'social_off', 'Social features are off for this account.')
    const id = randomUUID()
    const start = this.now()
    const end = new Date(start.getTime() + input.days * 86_400_000)
    this.run(
      `INSERT INTO challenges (id, creator_id, title, goal_type, goal_count, starts_at, ends_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      id,
      userId,
      input.title,
      input.goalType,
      input.goalCount,
      start.toISOString(),
      end.toISOString(),
    )
    this.run(
      `INSERT INTO challenge_members (challenge_id, user_id, status, joined_at) VALUES (?, ?, 'accepted', ?)`,
      id,
      userId,
      start.toISOString(),
    )
    for (const friendId of input.inviteUserIds ?? []) {
      if (!this.areFriends(userId, friendId)) continue
      this.run(
        `INSERT OR IGNORE INTO challenge_members (challenge_id, user_id, status) VALUES (?, ?, 'invited')`,
        id,
        friendId,
      )
    }
    return { id }
  }

  joinChallenge(userId: string, challengeId: string): void {
    const member = this.get(`SELECT status FROM challenge_members WHERE challenge_id = ? AND user_id = ?`, challengeId, userId)
    if (!member) throw new AppError(404, 'not_found', 'Challenge not found.')
    this.run(`UPDATE challenge_members SET status = 'accepted', joined_at = ? WHERE challenge_id = ? AND user_id = ?`, this.iso(), challengeId, userId)
  }

  listChallenges(userId: string): Array<Record<string, unknown>> {
    return this.all(
      `SELECT c.id, c.title, c.goal_type, c.goal_count, c.ends_at, m.status, m.joined_at
       FROM challenge_members m JOIN challenges c ON c.id = m.challenge_id
       WHERE m.user_id = ? AND c.status = 'active'`,
      userId,
    ).map((row) => ({
      id: row.id,
      title: row.title,
      goalType: row.goal_type,
      goal: row.goal_count,
      endsAt: row.ends_at,
      membership: row.status,
      progress: row.status === 'accepted' ? this.challengeProgress(userId, String(row.goal_type), String(row.joined_at ?? this.iso())) : 0,
    }))
  }

  private challengeProgress(userId: string, action: string, joinedAt: string): number {
    const row = this.get(
      `SELECT COUNT(*) AS n FROM score_events WHERE user_id = ? AND action = ? AND created_at >= ?`,
      userId,
      action,
      joinedAt,
    )
    return Number(row?.n ?? 0)
  }

  leaderboard(viewerId: string): Array<{ name: string; score: number }> {
    const people = this.all(
      `SELECT u.id, u.display_name, p.profile_visibility, p.leaderboard_opt_in
       FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.deleted_at IS NULL`,
    )
    const rows: Array<{ name: string; score: number }> = []
    for (const person of people) {
      if (!person.leaderboard_opt_in) continue
      const visibility = String(person.profile_visibility)
      const id = String(person.id)
      if (visibility === 'private') continue
      if (visibility === 'friends' && id !== viewerId && !this.areFriends(viewerId, id)) continue
      const score = this.get(`SELECT COALESCE(SUM(points), 0) AS n FROM score_events WHERE user_id = ?`, id)
      rows.push({ name: String(person.display_name), score: Number(score?.n ?? 0) })
    }
    return rows.sort((a, b) => b.score - a.score).slice(0, 50)
  }

  insights(userId: string, period: 'week' | 'month'): InsightStats {
    const since = new Date(this.now().getTime() - (period === 'week' ? 7 : 30) * 86_400_000).toISOString()
    const rows = this.all(
      `SELECT decision, amount_cents, category, domain FROM interventions WHERE user_id = ? AND created_at >= ?`,
      userId,
      since,
    ).map((row) => ({
      decision: String(row.decision),
      amountCents: row.amount_cents == null ? null : Number(row.amount_cents),
      category: String(row.category),
      domain: String(row.domain),
    }))
    return aggregateInsights(period, rows)
  }

  home(userId: string): HomeSnapshot {
    this.sweepNotifications(userId)
    const scoreRow = this.get(`SELECT COALESCE(SUM(points), 0) AS n FROM score_events WHERE user_id = ?`, userId)
    const days = this.all(`SELECT DISTINCT substr(created_at, 1, 10) AS day FROM score_events WHERE user_id = ?`, userId).map((row) => String(row.day))
    const counts = this.all(
      `SELECT decision, amount_cents FROM interventions WHERE user_id = ?`,
      userId,
    )
    const finished = counts.filter((row) => FINAL.has(String(row.decision)))
    const priced = finished.filter((row) => (row.decision === 'save' || row.decision === 'drop') && row.amount_cents != null)
    const recent = this.all(
      `SELECT id, domain, decision, amount_cents, created_at FROM interventions WHERE user_id = ? ORDER BY created_at DESC LIMIT 8`,
      userId,
    )
    const challenges = this.listChallenges(userId).filter((item) => item.membership === 'accepted')
    const first = challenges[0]
    const notes = this.all(
      `SELECT id, kind, detail, created_at FROM notification_deliveries WHERE user_id = ? ORDER BY created_at DESC LIMIT 8`,
      userId,
    )
    return {
      score: Number(scoreRow?.n ?? 0),
      streakDays: streakFromDays(days, this.iso().slice(0, 10)),
      interventions: finished.length,
      saved: finished.filter((row) => row.decision === 'save').length,
      abandoned: finished.filter((row) => row.decision === 'drop').length,
      avoidedCents: priced.length ? priced.reduce((sum, row) => sum + Number(row.amount_cents), 0) : null,
      pricedCount: priced.length,
      recent: recent.map((row) => ({
        id: String(row.id),
        domain: String(row.domain),
        decision: row.decision as HomeSnapshot['recent'][number]['decision'],
        amountCents: row.amount_cents == null ? null : Number(row.amount_cents),
        createdAt: String(row.created_at),
      })),
      week: this.insights(userId, 'week'),
      month: this.insights(userId, 'month'),
      challenge: first
        ? { id: String(first.id), title: String(first.title), progress: Number(first.progress), goal: Number(first.goal) }
        : null,
      extension: this.extensionStatus(userId),
      notifications: notes.map((row) => ({
        id: String(row.id),
        kind: String(row.kind),
        detail: String(row.detail),
        createdAt: String(row.created_at),
      })),
    }
  }

  scoreEvents(userId: string): Array<{ action: string; points: number; explanation: string }> {
    return this.all(`SELECT action, points, explanation FROM score_events WHERE user_id = ? ORDER BY created_at`, userId).map((row) => ({
      action: String(row.action),
      points: Number(row.points),
      explanation: String(row.explanation),
    }))
  }

  private areFriends(a: string, b: string): boolean {
    const row = this.get(
      `SELECT id FROM friendships WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
      a,
      b,
      b,
      a,
    )
    return Boolean(row)
  }

  private mustProfile(userId: string): Record<string, unknown> {
    const row = this.get(`SELECT * FROM profiles WHERE user_id = ?`, userId)
    if (!row) throw new AppError(404, 'not_found', 'Profile not found.')
    return row
  }

  private mapSettings(row: Record<string, unknown>): UserSettings & { onboardingComplete: boolean } {
    return {
      onboardingComplete: Boolean(row.onboarding_complete),
      restrictionLevel: row.restriction_level as RestrictionLevel,
      reflectionSeconds: Number(row.reflection_seconds),
      cooldownSeconds: Number(row.cooldown_seconds),
      approvalRequired: Boolean(row.approval_required),
      monitoringEnabled: Boolean(row.monitoring_enabled),
      leaderboardOptIn: Boolean(row.leaderboard_opt_in),
      profileVisibility: row.profile_visibility as UserSettings['profileVisibility'],
      socialEnabled: Boolean(row.social_enabled),
      notifySaved: Boolean(row.notify_saved),
      notifyApprovals: Boolean(row.notify_approvals),
      notifyChallenges: Boolean(row.notify_challenges),
    }
  }

  /** Domain check used by tests and the extension bootstrap. */
  domainAllowed(hostname: string, userId: string): boolean {
    return this.listSites(userId).some((site) => site.enabled && hostMatchesDomain(hostname, site.domain))
  }
}

export function openMemory(opts?: { now?: () => Date; pepper?: string }): SqliteRepo {
  return new SqliteRepo(new DatabaseSync(':memory:'), opts)
}

export function openFile(path: string, opts?: { now?: () => Date; pepper?: string }): SqliteRepo {
  return new SqliteRepo(new DatabaseSync(path), opts)
}
