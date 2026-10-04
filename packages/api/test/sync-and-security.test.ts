import { createApp } from '@impulse/api'
import { openMemory } from '@impulse/db'
import { describe, expect, it } from 'vitest'

const config = {
  allowDevAuth: true,
  appBaseUrl: 'http://localhost:3000',
  ai: {},
  smsConfigured: false,
  googleConfigured: false,
}

type Init = { method?: string; token?: string | null; body?: unknown }

function world(start = '2026-10-03T12:00:00.000Z') {
  let clock = new Date(start)
  const app = createApp(openMemory({ now: () => clock }), config)
  async function call(path: string, init: Init = {}) {
    const headers = new Headers({ 'content-type': 'application/json' })
    if (init.token) headers.set('authorization', `Bearer ${init.token}`)
    const response = await app(
      new Request(`http://localhost:3000${path}`, {
        method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      }),
    )
    const json = response.status === 204 ? null : await response.json()
    return { status: response.status, json }
  }
  async function person(name: string) {
    const auth = await call('/api/auth/dev', { body: { displayName: name, email: `${name.toLowerCase()}@example.com` } })
    return { token: auth.json.token as string, id: auth.json.userId as string, name }
  }
  async function withExtension(name: string, domain = 'amazon.com') {
    const user = await person(name)
    await call('/api/sites', { token: user.token, body: { domain, category: 'shopping' } })
    const code = await call('/api/extension/pair-code', { token: user.token, body: {} })
    const paired = await call('/api/extension/pair', { body: { code: code.json.code } })
    return { ...user, ext: paired.json.token as string }
  }
  return {
    call,
    person,
    withExtension,
    advance(ms: number) {
      clock = new Date(clock.getTime() + ms)
    },
  }
}

const checkout = 'https://www.amazon.com/checkout'

describe('change feed', () => {
  it('reports a new revision when the extension finishes an intervention', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    const first = await w.call('/api/changes', { token: alex.token })
    expect(first.json.changed).toBe(true)
    const quiet = await w.call(`/api/changes?since=${first.json.revision}`, { token: alex.token })
    expect(quiet.json.changed).toBe(false)

    await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'feed-drop-1', url: checkout, decision: 'drop' } })
    const after = await w.call(`/api/changes?since=${first.json.revision}`, { token: alex.token })
    expect(after.json.changed).toBe(true)
    expect(after.json.revision).not.toBe(first.json.revision)
  })

  it('releases a held request as soon as something changes', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    const base = await w.call('/api/changes', { token: alex.token })
    const started = Date.now()
    const waiting = w.call(`/api/changes?since=${base.json.revision}&waitMs=5000`, { token: alex.token })
    await new Promise((resolve) => setTimeout(resolve, 150))
    await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'feed-save-1', url: checkout, decision: 'save' } })
    const result = await waiting
    expect(result.json.changed).toBe(true)
    expect(Date.now() - started).toBeLessThan(3000)
  })

  it('moves when a setting changes so the extension can drop its cache', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    const base = await w.call('/api/changes', { token: alex.ext })
    await w.call('/api/settings', { method: 'PATCH', token: alex.token, body: { restrictionLevel: 'low' } })
    const next = await w.call(`/api/changes?since=${base.json.revision}`, { token: alex.ext })
    expect(next.json.changed).toBe(true)
  })

  it('surfaces a saved purchase becoming eligible when its cooldown ends', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    await w.call('/api/settings', { method: 'PATCH', token: alex.token, body: { cooldownSeconds: 3600 } })
    await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'cooldown-save-1', url: checkout, decision: 'save' } })
    const base = await w.call('/api/changes', { token: alex.token })
    w.advance(2 * 3600 * 1000)
    const next = await w.call(`/api/changes?since=${base.json.revision}`, { token: alex.token })
    expect(next.json.changed).toBe(true)
    const home = await w.call('/api/home', { token: alex.token })
    expect(home.json.notifications.some((note: { kind: string }) => note.kind === 'saved_eligible')).toBe(true)
  })

  it('lets the browser switch monitoring and nothing else, and the phone sees it', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    const base = await w.call('/api/changes', { token: alex.token })
    const off = await w.call('/api/extension/monitoring', { token: alex.ext, body: { enabled: false } })
    expect(off.json.monitoringEnabled).toBe(false)
    expect((await w.call(`/api/changes?since=${base.json.revision}`, { token: alex.token })).json.changed).toBe(true)
    expect((await w.call('/api/settings', { token: alex.token })).json.monitoringEnabled).toBe(false)
    const paused = await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'paused-drop-1', url: checkout, decision: 'drop' } })
    expect(paused.status).toBe(422)
    await w.call('/api/extension/monitoring', { token: alex.ext, body: { enabled: true } })
    const live = await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'paused-drop-2', url: checkout, decision: 'drop' } })
    expect(live.json.scoreAwarded).toBe(20)
    expect((await w.call('/api/extension/monitoring', { body: { enabled: false } })).status).toBe(401)
  })

  it('requires a session', async () => {
    const w = world()
    expect((await w.call('/api/changes')).status).toBe(401)
  })
})

describe('account isolation', () => {
  it('keeps one person away from another person’s records', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    const blair = await w.withExtension('Blair')
    const saved = await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'iso-save-1', url: checkout, decision: 'save', itemName: 'Lamp' } })
    const itemId = saved.json.deferredId ?? (await w.call('/api/saved', { token: alex.token })).json.items[0].id

    expect((await w.call(`/api/saved/${itemId}`, { method: 'PATCH', token: blair.token, body: { cooldownSeconds: 5 } })).status).toBe(404)
    expect((await w.call(`/api/saved/${itemId}`, { method: 'DELETE', token: blair.token })).status).toBe(404)
    expect((await w.call(`/api/saved/${itemId}/purchased`, { token: blair.token, body: {} })).status).toBe(404)
    expect((await w.call(`/api/saved/${itemId}/revisit`, { token: blair.token, body: {} })).status).toBe(404)
    expect((await w.call('/api/saved', { token: blair.token })).json.items).toHaveLength(0)
    expect((await w.call('/api/saved', { token: alex.token })).json.items).toHaveLength(1)
  })

  it('does not let a stranger read, cancel, or answer someone else’s approval', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    const blair = await w.person('Blair')
    await w.call('/api/settings', { method: 'PATCH', token: alex.token, body: { restrictionLevel: 'high', approvalRequired: true } })
    const invite = await w.call('/api/trusted', { token: alex.token, body: { displayName: 'Sam', email: 'sam@example.com' } })
    await w.call('/api/trusted/accept', { body: { token: invite.json.url.split('/trust/')[1] } })
    const contact = (await w.call('/api/trusted', { token: alex.token })).json.contacts[0]
    const waiting = await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'iso-cont-1', url: checkout, decision: 'continue' } })
    const request = await w.call('/api/approvals', {
      token: alex.ext,
      body: { interventionId: waiting.json.interventionId ?? waiting.json.id, contactId: contact.id },
    })
    expect(request.status).toBe(200)

    expect((await w.call(`/api/approvals/${request.json.id}`, { token: blair.token })).status).toBe(404)
    expect((await w.call(`/api/approvals/${request.json.id}/cancel`, { token: blair.token, body: {} })).status).toBe(404)
    expect((await w.call(`/api/trusted/${contact.id}`, { method: 'DELETE', token: blair.token })).json).toBeDefined()
    expect((await w.call('/api/trusted', { token: alex.token })).json.contacts[0].status).toBe('accepted')
    const guessed = await w.call('/api/approvals/respond', { body: { token: 'x'.repeat(40), decision: 'approve' } })
    expect(guessed.status).toBe(404)
  })

  it('keeps extension sessions out of account-level actions', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    expect((await w.call('/api/settings', { method: 'PATCH', token: alex.ext, body: { restrictionLevel: 'low' } })).status).toBe(403)
    expect((await w.call('/api/account', { method: 'DELETE', token: alex.ext })).status).toBe(403)
    expect((await w.call('/api/account/export', { token: alex.ext })).status).toBe(403)
    expect((await w.call('/api/trusted', { token: alex.ext, body: { displayName: 'Sam', email: 'sam@example.com' } })).status).toBe(403)
  })

  it('deletes everything with the account and invalidates its sessions', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'delete-drop-1', url: checkout, decision: 'drop' } })
    const exported = await w.call('/api/account/export', { token: alex.token })
    expect(exported.status).toBe(200)
    expect(JSON.stringify(exported.json)).toContain('amazon.com')
    expect((await w.call('/api/account', { method: 'DELETE', token: alex.token })).status).toBe(200)
    expect((await w.call('/api/home', { token: alex.token })).status).toBe(401)
    expect((await w.call('/api/extension/bootstrap', { token: alex.ext })).status).toBe(401)
  })

  it('signs out one device without ending the others', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    await w.call('/api/auth/signout', { token: alex.ext, body: {} })
    expect((await w.call('/api/extension/bootstrap', { token: alex.ext })).status).toBe(401)
    expect((await w.call('/api/home', { token: alex.token })).status).toBe(200)
  })
})

describe('approval expiry', () => {
  it('expires an unanswered request and refuses a late answer', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    await w.call('/api/settings', { method: 'PATCH', token: alex.token, body: { restrictionLevel: 'high', approvalRequired: true } })
    const invite = await w.call('/api/trusted', { token: alex.token, body: { displayName: 'Sam', email: 'sam@example.com' } })
    await w.call('/api/trusted/accept', { body: { token: invite.json.url.split('/trust/')[1] } })
    const contact = (await w.call('/api/trusted', { token: alex.token })).json.contacts[0]
    const waiting = await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'expiry-continue-1', url: checkout, decision: 'continue' } })
    const request = await w.call('/api/approvals', {
      token: alex.ext,
      body: { interventionId: waiting.json.interventionId ?? waiting.json.id, contactId: contact.id },
    })
    w.advance(3 * 3600 * 1000)
    const status = await w.call(`/api/approvals/${request.json.id}`, { token: alex.ext })
    expect(status.json.status).toBe('expired')
    const late = await w.call('/api/approvals/respond', { body: { token: request.json.url.split('/approve/')[1], decision: 'approve' } })
    expect(late.status).toBe(409)
  })
})

describe('friends and challenges', () => {
  async function friends(w: ReturnType<typeof world>) {
    const alex = await w.withExtension('Alex')
    const blair = await w.withExtension('Blair')
    await w.call('/api/friends', { token: alex.token, body: { email: 'blair@example.com' } })
    const incoming = (await w.call('/api/friends', { token: blair.token })).json.friends[0]
    await w.call(`/api/friends/${incoming.id}/respond`, { token: blair.token, body: { accept: true } })
    return { alex, blair }
  }

  it('lists a friend’s user id so a challenge can invite them', async () => {
    const w = world()
    const { alex, blair } = await friends(w)
    const list = (await w.call('/api/friends', { token: alex.token })).json.friends
    expect(list[0]).toMatchObject({ userId: blair.id, status: 'accepted' })
  })

  it('counts only verified events inside the window and completes once', async () => {
    const w = world()
    const { alex, blair } = await friends(w)
    const made = await w.call('/api/challenges', {
      token: alex.token,
      body: { title: 'Two deferrals', goalType: 'defer', goalCount: 2, days: 3, inviteUserIds: [blair.id] },
    })
    expect(made.status).toBe(200)
    const invited = (await w.call('/api/challenges', { token: blair.token })).json.challenges[0]
    expect(invited).toMatchObject({ membership: 'invited', progress: 0, state: 'active' })

    await w.call('/api/interventions', { token: blair.ext, body: { idempotencyKey: 'challenge-blair-1', url: checkout, decision: 'save' } })
    expect((await w.call('/api/challenges', { token: blair.token })).json.challenges[0].progress).toBe(0)
    await w.call(`/api/challenges/${made.json.id}/join`, { token: blair.token, body: {} })

    await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'challenge-alex-1', url: checkout, decision: 'save' } })
    expect((await w.call('/api/challenges', { token: alex.token })).json.challenges[0]).toMatchObject({ progress: 1, state: 'active' })
    await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'challenge-alex-1', url: checkout, decision: 'save' } })
    expect((await w.call('/api/challenges', { token: alex.token })).json.challenges[0].progress).toBe(1)
    await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'challenge-alex-2', url: checkout, decision: 'save' } })
    const done = (await w.call('/api/challenges', { token: alex.token })).json.challenges[0]
    expect(done).toMatchObject({ progress: 2, goal: 2, state: 'completed' })

    const home = await w.call('/api/home', { token: alex.token })
    await w.call('/api/home', { token: alex.token })
    const notes = (await w.call('/api/home', { token: alex.token })).json.notifications.filter((n: { kind: string }) => n.kind === 'challenge_complete')
    expect(home.status).toBe(200)
    expect(notes).toHaveLength(1)
  })

  it('lets a person decline and refuses to join once the window has closed', async () => {
    const w = world()
    const { alex, blair } = await friends(w)
    const made = await w.call('/api/challenges', {
      token: alex.token,
      body: { title: 'Short', goalType: 'defer', goalCount: 1, days: 1, inviteUserIds: [blair.id] },
    })
    w.advance(2 * 86_400_000)
    const late = await w.call(`/api/challenges/${made.json.id}/join`, { token: blair.token, body: {} })
    expect(late.status).toBe(409)
    expect((await w.call(`/api/challenges/${made.json.id}/decline`, { token: blair.token, body: {} })).status).toBe(200)
    expect((await w.call('/api/challenges', { token: blair.token })).json.challenges).toHaveLength(0)
  })

  it('does not invite a stranger or reveal challenges to non-members', async () => {
    const w = world()
    const alex = await w.person('Alex')
    const blair = await w.person('Blair')
    const made = await w.call('/api/challenges', {
      token: alex.token,
      body: { title: 'Solo', goalType: 'abandon', goalCount: 1, days: 2, inviteUserIds: [blair.id] },
    })
    expect((await w.call('/api/challenges', { token: blair.token })).json.challenges).toHaveLength(0)
    expect((await w.call(`/api/challenges/${made.json.id}/join`, { token: blair.token, body: {} })).status).toBe(404)
  })

  it('turns every social surface off without touching interventions', async () => {
    const w = world()
    const alex = await w.withExtension('Alex')
    await w.call('/api/settings', { method: 'PATCH', token: alex.token, body: { socialEnabled: false, leaderboardOptIn: true, profileVisibility: 'public' } })
    const made = await w.call('/api/challenges', { token: alex.token, body: { title: 'No', goalType: 'defer', goalCount: 1, days: 2 } })
    expect(made.status).toBe(403)
    expect((await w.call('/api/challenges', { token: alex.token })).json.challenges).toEqual([])
    const drop = await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'soc-off-1', url: checkout, decision: 'drop' } })
    expect(drop.json.scoreAwarded).toBe(20)
  })

  it('shows the leaderboard only for people who opted in, and respects friends-only', async () => {
    const w = world()
    const { alex, blair } = await friends(w)
    const casey = await w.person('Casey')
    await w.call('/api/interventions', { token: alex.ext, body: { idempotencyKey: 'leaderboard-alex-1', url: checkout, decision: 'drop' } })
    await w.call('/api/settings', { method: 'PATCH', token: alex.token, body: { leaderboardOptIn: true, profileVisibility: 'friends' } })
    const board = (token: string) => w.call('/api/leaderboard', { token }).then((r) => r.json.leaders as Array<{ name: string; score: number }>)
    expect((await board(blair.token)).map((l) => l.name)).toContain('Alex')
    expect((await board(casey.token)).map((l) => l.name)).not.toContain('Alex')
    await w.call('/api/settings', { method: 'PATCH', token: alex.token, body: { leaderboardOptIn: false } })
    expect((await board(blair.token)).map((l) => l.name)).not.toContain('Alex')
    const leaked = JSON.stringify(await board(blair.token))
    expect(leaked).not.toContain('amazon')
  })
})
