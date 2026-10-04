import type { InsightStats } from './types'

export type SummaryEcho = {
  interventions: number
  continued: number
  saved: number
  abandoned: number
}

export function fallbackSummary(stats: InsightStats): string {
  const money =
    stats.avoidedCents == null
      ? 'No purchase amounts were recorded, so this stays with counts rather than dollars.'
      : `About $${(stats.avoidedCents / 100).toFixed(2)} was attached to items you did not continue, where a price was actually known.`
  return `In this ${stats.period} you met ${stats.interventions} interventions. You continued ${stats.continued}, saved ${stats.saved} for later, and dropped ${stats.abandoned}. ${money}`
}

export function summaryIsFaithful(stats: InsightStats, summary: string, echo: SummaryEcho): boolean {
  if (
    echo.interventions !== stats.interventions ||
    echo.continued !== stats.continued ||
    echo.saved !== stats.saved ||
    echo.abandoned !== stats.abandoned
  ) {
    return false
  }
  if (stats.avoidedCents == null && /\$\s?\d|\bdollars?\b/i.test(summary)) return false
  return summary.trim().length > 0
}

export function aggregateInsights(
  period: 'week' | 'month',
  rows: Array<{ decision: string; amountCents: number | null; category: string; domain: string }>,
): InsightStats {
  const finished = rows.filter((row) => row.decision === 'continue' || row.decision === 'save' || row.decision === 'drop')
  const saved = finished.filter((row) => row.decision === 'save')
  const abandoned = finished.filter((row) => row.decision === 'drop')
  const priced = [...saved, ...abandoned].filter((row) => row.amountCents != null)
  const byCategory: Record<string, number> = {}
  const byDomain: Record<string, number> = {}
  for (const row of finished) {
    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1
    byDomain[row.domain] = (byDomain[row.domain] ?? 0) + 1
  }
  return {
    period,
    interventions: finished.length,
    continued: finished.filter((row) => row.decision === 'continue').length,
    saved: saved.length,
    abandoned: abandoned.length,
    avoidedCents: priced.length ? priced.reduce((sum, row) => sum + (row.amountCents ?? 0), 0) : null,
    pricedCount: priced.length,
    byCategory,
    byDomain,
  }
}
