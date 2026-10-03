export const restrictionLevels = ['low', 'medium', 'high'] as const
export type RestrictionLevel = (typeof restrictionLevels)[number]

export const decisions = ['continue', 'save', 'drop'] as const
export type Decision = (typeof decisions)[number]

export const interventionStates = [
  'reflecting',
  'awaiting_approval',
  'continue',
  'save',
  'drop',
] as const
export type InterventionState = (typeof interventionStates)[number]

export const approvalStatuses = ['pending', 'approved', 'declined', 'expired', 'canceled'] as const
export type ApprovalStatus = (typeof approvalStatuses)[number]

export const deferredStatuses = ['saved', 'eligible', 'purchased', 'removed'] as const
export type DeferredStatus = (typeof deferredStatuses)[number]

export const siteCategories = ['shopping', 'betting', 'custom'] as const
export type SiteCategory = (typeof siteCategories)[number]

export const scoreActions = ['reflection_complete', 'defer', 'revisit', 'abandon'] as const
export type ScoreAction = (typeof scoreActions)[number]

export const POINTS: Record<ScoreAction, number> = {
  reflection_complete: 10,
  defer: 15,
  revisit: 10,
  abandon: 20,
}

export type ProfileVisibility = 'private' | 'friends' | 'public'

export type UserSettings = {
  restrictionLevel: RestrictionLevel
  reflectionSeconds: number
  cooldownSeconds: number
  approvalRequired: boolean
  monitoringEnabled: boolean
  leaderboardOptIn: boolean
  profileVisibility: ProfileVisibility
  socialEnabled: boolean
  notifySaved: boolean
  notifyApprovals: boolean
  notifyChallenges: boolean
}

export type ProtectedSite = {
  id: string
  domain: string
  category: SiteCategory
  enabled: boolean
}

export type OnboardingPreference = {
  categories: Array<'shopping' | 'betting'>
  triggers: string[]
  goals: string[]
  recommendedLevel: RestrictionLevel
  chosenLevel: RestrictionLevel
  wantsTrustedContact: boolean
  consentToStore: boolean
}

export type InsightStats = {
  period: 'week' | 'month'
  interventions: number
  continued: number
  saved: number
  abandoned: number
  avoidedCents: number | null
  pricedCount: number
  byCategory: Record<string, number>
  byDomain: Record<string, number>
}

export type HomeSnapshot = {
  score: number
  streakDays: number
  interventions: number
  saved: number
  abandoned: number
  avoidedCents: number | null
  pricedCount: number
  recent: Array<{
    id: string
    domain: string
    decision: InterventionState
    amountCents: number | null
    createdAt: string
  }>
  week: InsightStats
  month: InsightStats
  challenge: { id: string; title: string; progress: number; goal: number } | null
  extension: { linked: boolean; lastSeenAt: string | null; online: boolean }
  notifications: Array<{ id: string; kind: string; detail: string; createdAt: string }>
}
