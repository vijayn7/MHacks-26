import type { ApprovalStatus, RestrictionLevel } from './types'

export type ContinuePlan =
  | { type: 'allow'; awardReflection: boolean }
  | { type: 'need_reflection'; seconds: number }
  | { type: 'need_approval' }
  | { type: 'allowed_override' }

export function planContinue(input: {
  level: RestrictionLevel
  reflectionSeconds: number
  approvalRequired: boolean
  hasTrustedContact: boolean
  reflectionCompleted: boolean
  approvalStatus: ApprovalStatus | null
  overrideEssential: boolean
}): ContinuePlan {
  if (input.overrideEssential) return { type: 'allowed_override' }

  if (input.level === 'low') {
    return { type: 'allow', awardReflection: input.reflectionCompleted }
  }

  if (input.level === 'medium' || !input.approvalRequired || !input.hasTrustedContact) {
    if (!input.reflectionCompleted) {
      return { type: 'need_reflection', seconds: Math.max(1, input.reflectionSeconds) }
    }
    return { type: 'allow', awardReflection: true }
  }

  if (input.approvalStatus !== 'approved') return { type: 'need_approval' }
  return { type: 'allow', awardReflection: input.reflectionCompleted }
}

export function clampReflectionSeconds(value: number): number {
  if (!Number.isFinite(value)) return 15
  return Math.min(180, Math.max(3, Math.round(value)))
}

export function clampCooldownSeconds(value: number): number {
  if (!Number.isFinite(value)) return 86_400
  return Math.min(60 * 60 * 24 * 30, Math.max(0, Math.round(value)))
}
