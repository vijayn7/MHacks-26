import { POINTS, type ScoreAction } from './types'

export function pointsFor(action: ScoreAction): number {
  return POINTS[action]
}

export function scoreIdempotencyKey(action: ScoreAction, subjectId: string): string {
  return `${action}:${subjectId}`
}

export function explainScore(action: ScoreAction, domain: string): string {
  const points = pointsFor(action)
  switch (action) {
    case 'reflection_complete':
      return `Finished a reflection before continuing on ${domain}. +${points}`
    case 'defer':
      return `Saved a purchase on ${domain} for later. +${points}`
    case 'revisit':
      return `Reviewed a saved purchase on ${domain} after the cooldown. +${points}`
    case 'abandon':
      return `Walked away from a purchase on ${domain}. +${points}`
  }
}

/** Purchases never reduce a score. Essential spending is not a penalty. */
export function purchasePenalty(): number {
  return 0
}

export function streakFromDays(activeDays: string[], today: string): number {
  const set = new Set(activeDays)
  let streak = 0
  const cursor = new Date(`${today}T00:00:00Z`)
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
