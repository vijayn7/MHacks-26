import type { SiteCategory } from './types'

export type CatalogEntry = { domain: string; category: Exclude<SiteCategory, 'custom'>; label: string }

export const SITE_CATALOG: CatalogEntry[] = [
  { domain: 'amazon.com', category: 'shopping', label: 'Amazon' },
  { domain: 'ebay.com', category: 'shopping', label: 'eBay' },
  { domain: 'etsy.com', category: 'shopping', label: 'Etsy' },
  { domain: 'walmart.com', category: 'shopping', label: 'Walmart' },
  { domain: 'target.com', category: 'shopping', label: 'Target' },
  { domain: 'shein.com', category: 'shopping', label: 'SHEIN' },
  { domain: 'nike.com', category: 'shopping', label: 'Nike' },
  { domain: 'stockx.com', category: 'shopping', label: 'StockX' },
  { domain: 'bestbuy.com', category: 'shopping', label: 'Best Buy' },
  { domain: 'draftkings.com', category: 'betting', label: 'DraftKings' },
  { domain: 'fanduel.com', category: 'betting', label: 'FanDuel' },
  { domain: 'betmgm.com', category: 'betting', label: 'BetMGM' },
  { domain: 'bet365.com', category: 'betting', label: 'bet365' },
  { domain: 'caesars.com', category: 'betting', label: 'Caesars' },
  { domain: 'pointsbet.com', category: 'betting', label: 'PointsBet' },
]

const CHECKOUT = /\/(checkout|cart|payment|place-order|order|betslip|wager|stake|cashier|deposit)(\/|$|\?)/i

export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] ?? ''
  const host = raw.replace(/\.$/, '').replace(/^www\./, '')
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null
  if (host.includes('..')) return null
  return host
}

export function hostMatchesDomain(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const root = domain.toLowerCase()
  return host === root || host.endsWith(`.${root}`)
}

export function isCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return CHECKOUT.test(parsed.pathname)
  } catch {
    return false
  }
}

export function shouldIntervene(input: {
  url: string
  monitoringEnabled: boolean
  sites: Array<{ domain: string; enabled: boolean }>
}): { ok: true; domain: string } | { ok: false; reason: string } {
  if (!input.monitoringEnabled) return { ok: false, reason: 'monitoring_off' }
  let parsed: URL
  try {
    parsed = new URL(input.url)
  } catch {
    return { ok: false, reason: 'bad_url' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'bad_url' }
  }
  const enabled = input.sites.filter((site) => site.enabled)
  const match = enabled.find((site) => hostMatchesDomain(parsed.hostname, site.domain))
  if (!match) return { ok: false, reason: 'not_protected' }
  if (!isCheckoutUrl(input.url)) return { ok: false, reason: 'not_checkout' }
  return { ok: true, domain: match.domain }
}

export function catalogFor(categories: Array<'shopping' | 'betting'>): CatalogEntry[] {
  return SITE_CATALOG.filter((entry) => categories.includes(entry.category))
}
