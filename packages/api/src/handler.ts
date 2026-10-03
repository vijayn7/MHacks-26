import { AppError, type SessionUser, type SqliteRepo } from '@impulse/db'
import {
  advanceOnboarding,
  approvalCreateSchema,
  approvalRespondSchema,
  challengeSchema,
  devAuthSchema,
  interventionSchema,
  normalizeDomain,
  onboardingMessageSchema,
  pairSchema,
  preferenceFromDraft,
  preferenceSchema,
  settingsPatchSchema,
  siteSchema,
  trustedInviteSchema,
  SITE_CATALOG,
} from '@impulse/shared'
import { z, ZodError } from 'zod'
import { summarizeStats, type AiConfig } from './ai'

export type AppConfig = {
  allowDevAuth: boolean
  appBaseUrl: string
  supabaseUrl?: string
  ai: AiConfig
  smsConfigured: boolean
  googleConfigured: boolean
}

export type OAuthExchange = (
  code: string,
  codeVerifier?: string,
) => Promise<{ providerId: string; email: string; displayName: string }>

export type SendSms = (to: string, body: string) => Promise<void>

type Ctx = {
  repo: SqliteRepo
  config: AppConfig
  request: Request
  url: URL
  parts: string[]
  user: SessionUser | null
  body: unknown
  exchange?: OAuthExchange
  sendSms?: SendSms
}

export function createApp(repo: SqliteRepo, config: AppConfig, deps: { exchange?: OAuthExchange; sendSms?: SendSms } = {}) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return json(null, 204)
    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean)
    let body: unknown = null
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      const text = await request.text()
      if (text.length > 100_000) return fail(413, 'too_large', 'Request is too large.')
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          return fail(400, 'bad_json', 'Expected JSON.')
        }
      }
    }
    const header = request.headers.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const user = token ? repo.sessionFromToken(token) : null
    const ctx: Ctx = { repo, config, request, url, parts, user, body, exchange: deps.exchange, sendSms: deps.sendSms }
    try {
      return await route(ctx)
    } catch (error) {
      if (error instanceof AppError) return fail(error.status, error.code, error.message)
      if (error instanceof ZodError) return fail(400, 'invalid', error.issues[0]?.message ?? 'Invalid request.')
      console.error(error)
      return fail(500, 'internal', 'Something went wrong.')
    }
  }
}

async function route(ctx: Ctx): Promise<Response> {
  const [root, a, b, c] = ctx.parts
  if (root !== 'api') return fail(404, 'not_found', 'Not found.')
  if (a === 'health' && ctx.request.method === 'GET') {
    return json({
      ok: true,
      google: ctx.config.googleConfigured,
      ai: Boolean(ctx.config.ai.apiKey),
      sms: ctx.config.smsConfigured,
      devAuth: ctx.config.allowDevAuth,
    })
  }
  if (a === 'catalog' && ctx.request.method === 'GET') return json({ sites: SITE_CATALOG })
  if (a === 'auth' && b === 'dev' && ctx.request.method === 'POST') return devAuth(ctx)
  if (a === 'auth' && b === 'google' && c === 'start' && ctx.request.method === 'POST') return googleStart(ctx)
  if (a === 'auth' && b === 'google' && c === 'callback' && ctx.request.method === 'POST') return googleCallback(ctx)
  if (a === 'auth' && b === 'signout' && ctx.request.method === 'POST') {
    const user = requireUser(ctx)
    ctx.repo.revokeSession(user.sessionId, user.userId)
    return json({ ok: true })
  }
  if (a === 'account' && ctx.request.method === 'DELETE') {
    const user = requireUser(ctx, 'user')
    ctx.repo.deleteAccount(user.userId)
    return json({ ok: true })
  }
  if (a === 'account' && b === 'export' && ctx.request.method === 'GET') {
    const user = requireUser(ctx, 'user')
    return json(ctx.repo.exportAccount(user.userId))
  }
  if (a === 'me' && ctx.request.method === 'GET') {
    const user = requireUser(ctx)
    return json({ userId: user.userId, kind: user.kind, settings: ctx.repo.getSettings(user.userId) })
  }
  if (a === 'home' && ctx.request.method === 'GET') return json(ctx.repo.home(requireUser(ctx).userId))
  if (a === 'settings' && ctx.request.method === 'PATCH') {
    const user = requireUser(ctx, 'user')
    return json(ctx.repo.updateSettings(user.userId, settingsPatchSchema.parse(ctx.body)))
  }
  if (a === 'settings' && ctx.request.method === 'GET') return json(ctx.repo.getSettings(requireUser(ctx).userId))
  if (a === 'sites' && ctx.request.method === 'GET') return json({ sites: ctx.repo.listSites(requireUser(ctx).userId) })
  if (a === 'sites' && ctx.request.method === 'POST') return addSite(ctx)
  if (a === 'onboarding' && b === 'finish' && ctx.request.method === 'POST') {
    const user = requireUser(ctx, 'user')
    const preference = preferenceSchema.parse(ctx.body)
    ctx.repo.completeOnboarding(user.userId, preference, 'deterministic')
    return json({ preference })
  }
  if (a === 'onboarding' && ctx.request.method === 'POST') return onboard(ctx)
  if (a === 'extension' && b === 'pair-code' && ctx.request.method === 'POST') {
    const user = requireUser(ctx, 'user')
    return json(ctx.repo.createPairCode(user.userId))
  }
  if (a === 'extension' && b === 'pair' && ctx.request.method === 'POST') {
    const input = pairSchema.parse(ctx.body)
    return json(ctx.repo.consumePairCode(input.code, input.deviceLabel ?? 'Chrome'))
  }
  if (a === 'extension' && b === 'monitoring' && ctx.request.method === 'POST') {
    // The only setting a browser session may change: it turns this person's own monitoring on or off.
    const user = requireUser(ctx)
    const enabled = z.object({ enabled: z.boolean() }).parse(ctx.body).enabled
    const next = ctx.repo.updateSettings(user.userId, { monitoringEnabled: enabled })
    return json({ monitoringEnabled: next.monitoringEnabled })
  }
  if (a === 'extension' && b === 'status' && ctx.request.method === 'GET') {
    return json(ctx.repo.extensionStatus(requireUser(ctx).userId))
  }
  if (a === 'extension' && b === 'bootstrap' && ctx.request.method === 'GET') {
    const user = requireUser(ctx)
    const settings = ctx.repo.getSettings(user.userId)
    return json({
      settings,
      sites: ctx.repo.listSites(user.userId),
      saved: ctx.repo.listSaved(user.userId),
      extension: ctx.repo.extensionStatus(user.userId),
    })
  }
  if (a === 'trusted' && ctx.request.method === 'GET') return json({ contacts: ctx.repo.listTrusted(requireUser(ctx, 'user').userId) })
  if (a === 'trusted' && ctx.request.method === 'POST' && !b) return await inviteTrusted(ctx)
  if (a === 'trusted' && b === 'accept' && ctx.request.method === 'POST') {
    const token = z.object({ token: z.string().min(20) }).parse(ctx.body).token
    return json(ctx.repo.acceptTrusted(token))
  }
  if (a === 'trusted' && b && ctx.request.method === 'DELETE') {
    const user = requireUser(ctx, 'user')
    ctx.repo.revokeTrusted(user.userId, b)
    return json({ ok: true })
  }
  if (a === 'friends' && ctx.request.method === 'GET') return json({ friends: ctx.repo.listFriends(requireUser(ctx, 'user').userId) })
  if (a === 'friends' && ctx.request.method === 'POST' && !b) return inviteFriend(ctx)
  if (a === 'friends' && b === 'accept' && ctx.request.method === 'POST') {
    const user = requireUser(ctx, 'user')
    const token = z.object({ token: z.string().min(20) }).parse(ctx.body).token
    ctx.repo.acceptFriendInvite(token, user.userId)
    return json({ ok: true })
  }
  if (a === 'friends' && b && c === 'respond' && ctx.request.method === 'POST') {
    const user = requireUser(ctx, 'user')
    const accept = z.object({ accept: z.boolean() }).parse(ctx.body).accept
    ctx.repo.respondFriend(user.userId, b, accept)
    return json({ ok: true })
  }
  if (a === 'friends' && b && ctx.request.method === 'DELETE') {
    const user = requireUser(ctx, 'user')
    ctx.repo.removeFriend(user.userId, b)
    return json({ ok: true })
  }
  if (a === 'interventions' && ctx.request.method === 'POST') {
    const user = requireUser(ctx)
    const input = interventionSchema.parse(ctx.body)
    return json(ctx.repo.createIntervention(user.userId, input))
  }
  if (a === 'saved' && ctx.request.method === 'GET') return json({ items: ctx.repo.listSaved(requireUser(ctx).userId) })
  if (a === 'saved' && b && c === 'revisit' && ctx.request.method === 'POST') {
    return json(ctx.repo.revisitSaved(requireUser(ctx, 'user').userId, b))
  }
  if (a === 'saved' && b && c === 'purchased' && ctx.request.method === 'POST') {
    ctx.repo.markPurchased(requireUser(ctx, 'user').userId, b)
    return json({ ok: true })
  }
  if (a === 'saved' && b && ctx.request.method === 'PATCH') {
    const seconds = z.object({ cooldownSeconds: z.number().int().min(0) }).parse(ctx.body).cooldownSeconds
    ctx.repo.updateCooldown(requireUser(ctx, 'user').userId, b, seconds)
    return json({ ok: true })
  }
  if (a === 'saved' && b && ctx.request.method === 'DELETE') {
    ctx.repo.removeSaved(requireUser(ctx, 'user').userId, b)
    return json({ ok: true })
  }
  if (a === 'approvals' && ctx.request.method === 'POST' && !b) return await createApproval(ctx)
  if (a === 'approvals' && b === 'preview' && ctx.request.method === 'POST') {
    const token = z.object({ token: z.string().min(20) }).parse(ctx.body).token
    const preview = ctx.repo.previewApproval(token)
    if (!preview) return fail(404, 'not_found', 'Request not found.')
    return json(preview)
  }
  if (a === 'approvals' && b === 'respond' && ctx.request.method === 'POST') {
    const input = approvalRespondSchema.parse(ctx.body)
    return json(ctx.repo.respondApproval(input.token, input.decision))
  }
  if (a === 'approvals' && b && c === 'cancel' && ctx.request.method === 'POST') {
    ctx.repo.cancelApproval(requireUser(ctx, 'user').userId, b)
    return json({ ok: true })
  }
  if (a === 'approvals' && b && ctx.request.method === 'GET') {
    const user = requireUser(ctx)
    const row = ctx.repo.approvalForUser(user.userId, b)
    if (!row) return fail(404, 'not_found', 'Request not found.')
    return json(row)
  }
  if (a === 'challenges' && ctx.request.method === 'GET') return json({ challenges: ctx.repo.listChallenges(requireUser(ctx, 'user').userId) })
  if (a === 'challenges' && !b && ctx.request.method === 'POST') {
    const user = requireUser(ctx, 'user')
    const input = challengeSchema.parse(ctx.body)
    return json(ctx.repo.createChallenge(user.userId, input))
  }
  if (a === 'challenges' && b && c === 'join' && ctx.request.method === 'POST') {
    ctx.repo.joinChallenge(requireUser(ctx, 'user').userId, b)
    return json({ ok: true })
  }
  if (a === 'challenges' && b && c === 'decline' && ctx.request.method === 'POST') {
    ctx.repo.declineChallenge(requireUser(ctx, 'user').userId, b)
    return json({ ok: true })
  }
  if (a === 'changes' && ctx.request.method === 'GET') return changes(ctx)
  if (a === 'leaderboard' && ctx.request.method === 'GET') return json({ leaders: ctx.repo.leaderboard(requireUser(ctx, 'user').userId) })
  if (a === 'insights' && ctx.request.method === 'GET') {
    const period = ctx.url.searchParams.get('period') === 'month' ? 'month' : 'week'
    return json(ctx.repo.insights(requireUser(ctx).userId, period))
  }
  if (a === 'insights' && b === 'summary' && ctx.request.method === 'POST') return insightSummary(ctx)
  return fail(404, 'not_found', 'Not found.')
}

const MAX_WAIT_MS = 25_000
const POLL_STEP_MS = 400

/**
 * Change feed for the phone and the extension. Without `since` it returns the
 * current revision. With `since` it holds the request open until the revision
 * differs or `waitMs` passes, so a finished intervention reaches the dashboard
 * in under a second without a client hammering the full endpoints.
 */
async function changes(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx)
  const since = ctx.url.searchParams.get('since')
  const waitMs = Math.min(Math.max(Number(ctx.url.searchParams.get('waitMs') ?? 0) || 0, 0), MAX_WAIT_MS)
  const deadline = Date.now() + waitMs
  let revision = ctx.repo.revision(user.userId)
  while (since && revision === since && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(POLL_STEP_MS, Math.max(deadline - Date.now(), 0))))
    revision = ctx.repo.revision(user.userId)
  }
  return json({ revision, changed: since ? revision !== since : true })
}

async function devAuth(ctx: Ctx): Promise<Response> {
  if (!ctx.config.allowDevAuth) return fail(403, 'dev_auth_disabled', 'Development sign-in is disabled.')
  const input = devAuthSchema.parse(ctx.body)
  return json(ctx.repo.createDevUser(input.displayName, input.email))
}

function googleStart(ctx: Ctx): Response {
  if (!ctx.config.googleConfigured || !ctx.config.supabaseUrl) {
    return fail(503, 'not_configured', 'Google sign-in is not configured on this server.')
  }
  const redirect = encodeURIComponent(`${ctx.config.appBaseUrl}/auth/callback`)
  return json({ url: `${ctx.config.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirect}` })
}

async function googleCallback(ctx: Ctx): Promise<Response> {
  if (!ctx.exchange) return fail(503, 'not_configured', 'Google sign-in is not configured on this server.')
  const input = z.object({ code: z.string().min(4), codeVerifier: z.string().min(8).optional() }).parse(ctx.body)
  const profile = await ctx.exchange(input.code, input.codeVerifier)
  return json(ctx.repo.upsertGoogleUser(profile))
}

function addSite(ctx: Ctx): Response {
  const user = requireUser(ctx, 'user')
  const input = siteSchema.parse(ctx.body)
  if (input.category === 'shopping' || input.category === 'betting') {
    if (!input.domain || input.domain === input.category) {
      ctx.repo.enableCategories(user.userId, [input.category])
      return json({ sites: ctx.repo.listSites(user.userId) })
    }
  }
  const domain = normalizeDomain(input.domain)
  if (!domain) return fail(400, 'bad_domain', 'Enter a domain like amazon.com.')
  ctx.repo.addSite(user.userId, domain, input.category ?? 'custom', input.enabled ?? true)
  return json({ sites: ctx.repo.listSites(user.userId) })
}

function onboard(ctx: Ctx): Response {
  const user = requireUser(ctx, 'user')
  const input = onboardingMessageSchema.parse(ctx.body)
  const current = ctx.repo.readDraft(user.userId)
  const step = advanceOnboarding(current, input.message)
  ctx.repo.saveDraft(user.userId, step.draft)
  let preference = null
  if (step.done) {
    preference = preferenceFromDraft(step.draft)
    ctx.repo.completeOnboarding(user.userId, preference, 'deterministic')
  }
  return json({ reply: step.reply, suggestions: step.suggestions, done: step.done, draft: step.draft, preference })
}

async function inviteTrusted(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx, 'user')
  const input = trustedInviteSchema.parse(ctx.body)
  const created = ctx.repo.inviteTrusted(user.userId, input)
  const url = `${ctx.config.appBaseUrl}/trust/${created.token}`
  const sms = await deliverSms(ctx, input.phone, `Impulse asked if you will receive one-time purchase requests. ${url}`)
  return json({ id: created.id, url, sms })
}

function inviteFriend(ctx: Ctx): Response {
  const user = requireUser(ctx, 'user')
  const email = z.object({ email: z.string().email() }).parse(ctx.body).email
  const created = ctx.repo.inviteFriend(user.userId, email)
  return json({
    friendshipId: created.friendshipId,
    url: created.token ? `${ctx.config.appBaseUrl}/friends/invite/${created.token}` : null,
  })
}

async function createApproval(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx)
  const input = approvalCreateSchema.parse(ctx.body)
  const created = ctx.repo.createApproval(user.userId, input.interventionId, input.contactId)
  const url = `${ctx.config.appBaseUrl}/approve/${created.token}`
  const phone = ctx.repo.contactPhone(user.userId, input.contactId)
  const sms = await deliverSms(ctx, phone, `Someone you agreed to help asked about one purchase. ${url}`)
  return json({ id: created.id, expiresAt: created.expiresAt, url, sms })
}

async function deliverSms(ctx: Ctx, phone: string | null | undefined, body: string): Promise<'sent' | 'share' | 'failed'> {
  if (!phone || !ctx.config.smsConfigured || !ctx.sendSms) return 'share'
  try {
    await ctx.sendSms(phone, body)
    return 'sent'
  } catch (error) {
    console.error(error)
    return 'failed'
  }
}

async function insightSummary(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx)
  const period = z.object({ period: z.enum(['week', 'month']).default('week') }).parse(ctx.body ?? {}).period
  const stats = ctx.repo.insights(user.userId, period)
  const summary = await summarizeStats(stats, ctx.config.ai)
  return json({ stats, ...summary })
}

function requireUser(ctx: Ctx, kind?: 'user' | 'extension'): SessionUser {
  if (!ctx.user) throw new AppError(401, 'unauthorized', 'Sign in again.')
  if (kind && ctx.user.kind !== kind) throw new AppError(403, 'forbidden', 'This action needs a different session.')
  return ctx.user
}

function json(data: unknown, status = 200): Response {
  return new Response(data == null ? null : JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    },
  })
}

function fail(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status)
}
