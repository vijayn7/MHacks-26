import { describe, expect, it } from 'vitest'
import {
  advanceOnboarding,
  aggregateInsights,
  emberColor,
  emptyDraft,
  explainScore,
  fallbackSummary,
  hostMatchesDomain,
  planContinue,
  pointsFor,
  preferenceFromDraft,
  purchasePenalty,
  recommendLevel,
  scoreIdempotencyKey,
  shouldIntervene,
  streakFromDays,
  summaryIsFaithful,
  transitionApproval,
} from '../src/index'

const sites = [
  { domain: 'amazon.com', enabled: true },
  { domain: 'draftkings.com', enabled: true },
  { domain: 'ebay.com', enabled: false },
]

describe('sites', () => {
  it('matches a site and its subdomains, not lookalikes', () => {
    expect(hostMatchesDomain('www.amazon.com', 'amazon.com')).toBe(true)
    expect(hostMatchesDomain('amazon.com.evil.com', 'amazon.com')).toBe(false)
    expect(hostMatchesDomain('notamazon.com', 'amazon.com')).toBe(false)
  })

  it('only intervenes on protected checkout pages', () => {
    expect(shouldIntervene({ url: 'https://www.amazon.com/checkout', monitoringEnabled: true, sites }).ok).toBe(true)
    expect(shouldIntervene({ url: 'https://www.amazon.com/gp/product/B00', monitoringEnabled: true, sites }).ok).toBe(false)
    expect(shouldIntervene({ url: 'https://example.com/checkout', monitoringEnabled: true, sites }).ok).toBe(false)
    expect(shouldIntervene({ url: 'https://www.ebay.com/checkout', monitoringEnabled: true, sites }).ok).toBe(false)
    expect(shouldIntervene({ url: 'https://www.amazon.com/checkout', monitoringEnabled: false, sites }).ok).toBe(false)
  })
})

describe('restrictions', () => {
  it('lets low continue immediately and medium wait', () => {
    expect(planContinue(base({ level: 'low' })).type).toBe('allow')
    expect(planContinue(base({ level: 'medium' }))).toEqual({ type: 'need_reflection', seconds: 15 })
    expect(planContinue(base({ level: 'medium', reflectionCompleted: true }))).toEqual({
      type: 'allow',
      awardReflection: true,
    })
  })

  it('asks for approval on high only when a contact exists', () => {
    expect(
      planContinue(base({ level: 'high', approvalRequired: true, hasTrustedContact: true })).type,
    ).toBe('need_approval')
    expect(
      planContinue(
        base({ level: 'high', approvalRequired: true, hasTrustedContact: true, approvalStatus: 'approved' }),
      ).type,
    ).toBe('allow')
    expect(planContinue(base({ level: 'high', approvalRequired: true, hasTrustedContact: false })).type).toBe(
      'need_reflection',
    )
  })

  it('allows a deliberate essential override without treating it as a reward path', () => {
    expect(planContinue(base({ level: 'high', overrideEssential: true })).type).toBe('allowed_override')
  })
})

describe('approvals', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const later = new Date('2026-01-01T03:00:00Z')
  const expires = new Date('2026-01-01T02:00:00Z')

  it('approves once and rejects replays', () => {
    expect(
      transitionApproval({
        status: 'pending',
        action: 'approve',
        now,
        expiresAt: expires,
        actorIsContact: true,
        actorIsOwner: false,
      }),
    ).toEqual({ ok: true, status: 'approved' })
    expect(
      transitionApproval({
        status: 'approved',
        action: 'approve',
        now,
        expiresAt: expires,
        actorIsContact: true,
        actorIsOwner: false,
      }),
    ).toEqual({ ok: false, code: 'already_resolved' })
  })

  it('expires a pending request and blocks strangers', () => {
    expect(
      transitionApproval({
        status: 'pending',
        action: 'approve',
        now: later,
        expiresAt: expires,
        actorIsContact: true,
        actorIsOwner: false,
      }),
    ).toEqual({ ok: true, status: 'expired' })
    expect(
      transitionApproval({
        status: 'pending',
        action: 'decline',
        now,
        expiresAt: expires,
        actorIsContact: false,
        actorIsOwner: false,
      }),
    ).toEqual({ ok: false, code: 'forbidden' })
  })
})

describe('scoring and insights', () => {
  it('awards intentional pauses and never penalizes a purchase', () => {
    expect(pointsFor('abandon')).toBe(20)
    expect(purchasePenalty()).toBe(0)
    expect(scoreIdempotencyKey('defer', 'abc')).toBe('defer:abc')
    expect(explainScore('defer', 'amazon.com')).toContain('+15')
    expect(streakFromDays(['2026-01-02', '2026-01-01'], '2026-01-02')).toBe(2)
    expect(streakFromDays(['2026-01-01'], '2026-01-03')).toBe(0)
  })

  it('does not invent money when amounts are missing', () => {
    const stats = aggregateInsights('week', [
      { decision: 'drop', amountCents: null, category: 'shopping', domain: 'amazon.com' },
      { decision: 'save', amountCents: 1200, category: 'shopping', domain: 'amazon.com' },
      { decision: 'reflecting', amountCents: 5000, category: 'betting', domain: 'draftkings.com' },
    ])
    expect(stats.interventions).toBe(2)
    expect(stats.avoidedCents).toBe(1200)
    const empty = aggregateInsights('week', [
      { decision: 'drop', amountCents: null, category: 'betting', domain: 'draftkings.com' },
    ])
    expect(empty.avoidedCents).toBeNull()
    expect(fallbackSummary(empty)).not.toMatch(/\$\d/)
    expect(summaryIsFaithful(empty, 'You dropped 1. It cost $20.', {
      interventions: 1,
      continued: 0,
      saved: 0,
      abandoned: 1,
    })).toBe(false)
  })
})

describe('onboarding', () => {
  it('recommends high for betting and still lets the person choose low', () => {
    let draft = emptyDraft()
    draft = advanceOnboarding(draft, 'Both').draft
    draft = advanceOnboarding(draft, 'I bet when I cannot sleep').draft
    const recommended = advanceOnboarding(draft, 'I want a pause')
    expect(recommended.draft.recommendedLevel).toBe('high')
    draft = advanceOnboarding(recommended.draft, 'Low').draft
    expect(draft.chosenLevel).toBe('low')
    expect(recommendLevel({ categories: ['shopping'], triggers: ['A reminder is enough'], goals: [] })).toBe('low')
  })

  it('drops narrative answers when consent is refused', () => {
    let draft = emptyDraft()
    for (const message of ['Shopping', 'Bored at night', 'Notice it', 'Use this', 'Skip for now', 'Only keep the level']) {
      draft = advanceOnboarding(draft, message).draft
    }
    const preference = preferenceFromDraft(draft)
    expect(preference.consentToStore).toBe(false)
    expect(preference.triggers).toEqual([])
    expect(preference.chosenLevel).toBeTruthy()
  })
})

describe('ember', () => {
  it('cools as the hold completes', () => {
    expect(emberColor(0).toLowerCase()).toBe('#ed7014')
    expect(emberColor(1).toLowerCase()).toBe('#8c857c')
  })
})

function base(overrides: Partial<Parameters<typeof planContinue>[0]>): Parameters<typeof planContinue>[0] {
  return {
    level: 'low',
    reflectionSeconds: 15,
    approvalRequired: false,
    hasTrustedContact: false,
    reflectionCompleted: false,
    approvalStatus: null,
    overrideEssential: false,
    ...overrides,
  }
}
