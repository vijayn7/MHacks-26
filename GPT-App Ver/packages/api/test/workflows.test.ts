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

describe('product workflows', () => {
  it('onboards, links an extension, saves a purchase, and scores a drop once', async () => {
    const { call, token } = await session()
    const chat = await call('/api/onboarding', { token, body: { message: 'Shopping' } })
    expect(chat.json.done).toBe(false)
    let done = chat.json
    for (const message of ['I shop when I am bored', 'A pause before I pay', 'Mid', 'Skip for now', 'Store my answers']) {
      done = (await call('/api/onboarding', { token, body: { message } })).json
    }
    expect(done.done).toBe(true)
    expect(done.preference.chosenLevel).toBe('medium')
    expect(done.preference.triggers).toContain('I shop when I am bored')

    const sites = await call('/api/sites', { method: 'POST', token, body: { domain: 'shopping', category: 'shopping' } })
    expect(sites.json.sites.some((site: { domain: string }) => site.domain === 'amazon.com')).toBe(true)

    const code = await call('/api/extension/pair-code', { token, body: {} })
    const paired = await call('/api/extension/pair', { token: null, body: { code: code.json.code, deviceLabel: 'Chrome test' } })
    const ext = paired.json.token as string
    const status = await call('/api/extension/status', { method: 'GET', token })
    expect(status.json.linked).toBe(true)
    expect(status.json.online).toBe(true)

    const saved = await call('/api/interventions', {
      token: ext,
      body: {
        idempotencyKey: 'checkout-save-1',
        url: 'https://www.amazon.com/checkout',
        itemName: 'Lamp',
        amountCents: 4200,
        decision: 'save',
      },
    })
    expect(saved.json.status).toBe('saved')
    const list = await call('/api/saved', { method: 'GET', token })
    expect(list.json.items).toHaveLength(1)
    expect(list.json.items[0].domain).toBe('amazon.com')

    const drop = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'checkout-drop-1', url: 'https://www.amazon.com/checkout', decision: 'drop' },
    })
    expect(drop.json.scoreAwarded).toBe(20)
    const again = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'checkout-drop-1', url: 'https://www.amazon.com/checkout', decision: 'drop' },
    })
    expect(again.json.scoreAwarded).toBe(0)
    const home = await call('/api/home', { method: 'GET', token })
    expect(home.json.score).toBe(20 + 15)
    expect(home.json.abandoned).toBe(1)
    expect(home.json.saved).toBe(1)
    expect(home.json.avoidedCents).toBe(4200)
  })

  it('follows a changed restriction and does not invent amounts', async () => {
    const { call, token, ext } = await readyExtension()
    await call('/api/settings', { method: 'PATCH', token, body: { restrictionLevel: 'low', reflectionSeconds: 8 } })
    const low = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'low-continue-1', url: 'https://www.amazon.com/checkout', decision: 'continue' },
    })
    expect(low.json.status).toBe('continued')

    await call('/api/settings', { method: 'PATCH', token, body: { restrictionLevel: 'medium', reflectionSeconds: 8 } })
    const wait = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'mid-continue-1', url: 'https://www.amazon.com/checkout', decision: 'continue' },
    })
    expect(wait.json.status).toBe('reflection_required')
    const done = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'mid-continue-1', url: 'https://www.amazon.com/checkout', decision: 'continue', reflectionCompleted: true },
    })
    expect(done.json.status).toBe('continued')
    expect(done.json.scoreAwarded).toBe(10)

    const quiet = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'drop-no-price', url: 'https://www.amazon.com/checkout', decision: 'drop' },
    })
    expect(quiet.json.status).toBe('dropped')
    const summary = await call('/api/insights/summary', { token, body: { period: 'week' } })
    expect(summary.json.source).toBe('fallback')
    expect(summary.json.summary).not.toMatch(/\$\d/)
  })

  it('lets a trusted contact approve once, then loses access when revoked', async () => {
    const clock = { now: new Date('2026-04-01T12:00:00Z') }
    const repo = openMemory({ now: () => clock.now })
    const app = createApp(repo, config)
    const call = caller(app)
    const auth = await call('/api/auth/dev', { token: null, body: { displayName: 'Alex', email: 'alex@example.com' } })
    const token = auth.json.token as string
    await call('/api/settings', {
      method: 'PATCH',
      token,
      body: { restrictionLevel: 'high', approvalRequired: true, reflectionSeconds: 5 },
    })
    await call('/api/sites', { method: 'POST', token, body: { domain: 'amazon.com', category: 'shopping' } })
    const invite = await call('/api/trusted', { token, body: { displayName: 'Sam', email: 'sam@example.com' } })
    const trustToken = invite.json.url.split('/trust/')[1]
    await call('/api/trusted/accept', { token: null, body: { token: trustToken } })
    const code = await call('/api/extension/pair-code', { token, body: {} })
    const paired = await call('/api/extension/pair', { token: null, body: { code: code.json.code } })
    const ext = paired.json.token as string

    const waiting = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'need-friend', url: 'https://www.amazon.com/checkout', decision: 'continue' },
    })
    expect(waiting.json.status).toBe('approval_required')
    const contactId = waiting.json.contacts[0].id as string
    const approval = await call('/api/approvals', {
      token: ext,
      body: { interventionId: waiting.json.interventionId, contactId },
    })
    const stranger = await call('/api/auth/dev', { token: null, body: { displayName: 'Other', email: 'other@example.com' } })
    const hidden = await call(`/api/approvals/${approval.json.id}`, { method: 'GET', token: stranger.json.token })
    expect(hidden.status).toBe(404)

    const approveToken = approval.json.url.split('/approve/')[1]
    const decision = await call('/api/approvals/respond', { token: null, body: { token: approveToken, decision: 'approve' } })
    expect(decision.json.status).toBe('approved')
    const replay = await call('/api/approvals/respond', { token: null, body: { token: approveToken, decision: 'approve' } })
    expect(replay.status).toBe(409)
    const continued = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'need-friend', url: 'https://www.amazon.com/checkout', decision: 'continue' },
    })
    expect(continued.json.status).toBe('continued')

    await call(`/api/trusted/${contactId}`, { method: 'DELETE', token })
    const after = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'after-revoke', url: 'https://www.amazon.com/checkout', decision: 'continue' },
    })
    expect(after.json.status).toBe('reflection_required')

    const freshInvite = await call('/api/trusted', { token, body: { displayName: 'Sam', email: 'sam@example.com' } })
    await call('/api/trusted/accept', { token: null, body: { token: freshInvite.json.url.split('/trust/')[1] } })
    const contacts = await call('/api/trusted', { method: 'GET', token })
    const live = contacts.json.contacts.find((item: { status: string }) => item.status === 'accepted')
    const waitingAgain = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'needs-sam', url: 'https://www.amazon.com/checkout', decision: 'continue' },
    })
    expect(waitingAgain.json.status).toBe('approval_required')
    const pending = await call('/api/approvals', {
      token: ext,
      body: { interventionId: waitingAgain.json.interventionId, contactId: live.id },
    })
    await call(`/api/trusted/${live.id}`, { method: 'DELETE', token })
    const canceled = await call('/api/approvals/respond', {
      token: null,
      body: { token: pending.json.url.split('/approve/')[1], decision: 'decline' },
    })
    expect(canceled.status).toBe(409)

    const again = await call('/api/trusted', { token, body: { displayName: 'Riley', email: 'riley@example.com' } })
    await call('/api/trusted/accept', { token: null, body: { token: again.json.url.split('/trust/')[1] } })
    const roster = await call('/api/trusted', { method: 'GET', token })
    const riley = roster.json.contacts.find((item: { status: string }) => item.status === 'accepted')
    const expiring = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'will-expire', url: 'https://www.amazon.com/gp/cart/checkout', decision: 'continue' },
    })
    const open = await call('/api/approvals', {
      token: ext,
      body: { interventionId: expiring.json.interventionId, contactId: riley.id },
    })
    clock.now = new Date('2026-04-01T16:00:00Z')
    const expired = await call('/api/approvals/respond', {
      token: null,
      body: { token: open.json.url.split('/approve/')[1], decision: 'decline' },
    })
    expect(expired.status).toBe(410)
  })

  it('texts an approval link only when a sender is configured', async () => {
    const sent: string[] = []
    const app = createApp(openMemory(), { ...config, smsConfigured: true }, {
      sendSms: async (to, body) => {
        sent.push(`${to} ${body}`)
      },
    })
    const call = caller(app)
    const auth = await call('/api/auth/dev', { token: null, body: { displayName: 'Alex', email: 'alex@example.com' } })
    const token = auth.json.token as string
    const invite = await call('/api/trusted', {
      token,
      body: { displayName: 'Sam', phone: '+15555550100' },
    })
    expect(invite.json.sms).toBe('sent')
    expect(sent[0]).toContain('+15555550100')
    expect(sent[0]).toContain(invite.json.url)

    const quiet = createApp(openMemory(), { ...config, smsConfigured: true })
    const quietCall = caller(quiet)
    const quietAuth = await quietCall('/api/auth/dev', { token: null, body: { displayName: 'Alex', email: 'alex@example.com' } })
    const share = await quietCall('/api/trusted', {
      token: quietAuth.json.token,
      body: { displayName: 'Sam', phone: '+15555550100' },
    })
    expect(share.json.sms).toBe('share')

    const broken = createApp(openMemory(), { ...config, smsConfigured: true }, {
      sendSms: async () => {
        throw new Error('provider down')
      },
    })
    const brokenCall = caller(broken)
    const brokenAuth = await brokenCall('/api/auth/dev', { token: null, body: { displayName: 'Alex', email: 'alex@example.com' } })
    const failed = await brokenCall('/api/trusted', {
      token: brokenAuth.json.token,
      body: { displayName: 'Sam', phone: '+15555550100' },
    })
    expect(failed.json.sms).toBe('failed')
    expect(failed.json.url).toContain('/trust/')
  })

  it('rejects an unprotected page and an anonymous export', async () => {
    const { call, ext } = await readyExtension()
    const missed = await call('/api/interventions', {
      token: ext,
      body: { idempotencyKey: 'not-a-checkout-page', url: 'https://example.com/checkout', decision: 'drop' },
    })
    expect(missed.status).toBe(422)
    const anon = await call('/api/account/export', { method: 'GET', token: null })
    expect(anon.status).toBe(401)
  })
})

function caller(app: (request: Request) => Promise<Response>) {
  return async function call(path: string, init: { method?: string; token?: string | null; body?: unknown } = {}) {
    const headers = new Headers({ 'content-type': 'application/json' })
    if (init.token) headers.set('authorization', `Bearer ${init.token}`)
    const response = await app(
      new Request(`http://localhost:3000${path}`, {
        method: init.method ?? 'POST',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      }),
    )
    const json = response.status === 204 ? null : await response.json()
    return { status: response.status, json }
  }
}

async function session() {
  const app = createApp(openMemory(), config)
  const call = caller(app)
  const auth = await call('/api/auth/dev', { token: null, body: { displayName: 'Alex', email: 'alex@example.com' } })
  return { call, token: auth.json.token as string }
}

async function readyExtension() {
  const base = await session()
  await base.call('/api/sites', { method: 'POST', token: base.token, body: { domain: 'amazon.com', category: 'shopping' } })
  const code = await base.call('/api/extension/pair-code', { token: base.token, body: {} })
  const paired = await base.call('/api/extension/pair', { token: null, body: { code: code.json.code } })
  return { ...base, ext: paired.json.token as string }
}
