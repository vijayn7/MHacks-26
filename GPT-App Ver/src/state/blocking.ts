export type BlockPlan = {
  title: string;
  target: number;
  horizonDays: number;
  createdAt: number;
  baselineSavings: number;
  domains: string[];
  minAmount: number;
  schedule: 'always' | 'scheduled';
  days: number[];
  start: string;
  end: string;
  mode: 'nudge' | 'pause';
  cooldownMinutes: number;
  allowOverride: boolean;
  requireReason: boolean;
  enabled: boolean;
};
export const freshPlan = (savings: number): BlockPlan => ({
  title: '',
  target: 500,
  horizonDays: 30,
  createdAt: Date.now(),
  baselineSavings: savings,
  domains: ['amazon.com'],
  minAmount: 40,
  schedule: 'always',
  days: [1, 2, 3, 4, 5],
  start: '21:00',
  end: '08:00',
  mode: 'pause',
  cooldownMinutes: 15,
  allowOverride: true,
  requireReason: true,
  enabled: true,
});
export function domainName(input: string): string | null {
  try {
    const url = new URL(input.includes('://') ? input.trim() : 'https://' + input.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const domain = url.hostname.toLowerCase().replace(/^www\./, '');
    return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) ? domain : null;
  } catch {
    return null;
  }
}
const clock = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function planErrors(p: BlockPlan): (string | null)[] {
  return [
    !p.title.trim() || p.title.length > 60
      ? 'give your goal a name, up to 60 characters.'
      : !Number.isFinite(p.target) || p.target < 1 || p.target > 1000000
        ? 'choose a savings goal between $1 and $1,000,000.'
        : !Number.isInteger(p.horizonDays) || p.horizonDays < 1 || p.horizonDays > 365
          ? 'choose between 1 and 365 days.'
          : null,
    !p.domains.length || p.domains.some((d) => domainName(d) !== d)
      ? 'add at least one valid website.'
      : !Number.isFinite(p.minAmount) || p.minAmount < 0 || p.minAmount > 1000000
        ? 'enter a purchase limit from $0 to $1,000,000.'
        : null,
    p.schedule === 'scheduled' &&
    (!p.days.length ||
      p.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
      !clock(p.start) ||
      !clock(p.end) ||
      p.start === p.end)
      ? 'choose days and two different times in 24-hour format.'
      : null,
    p.mode === 'pause' &&
    (!Number.isInteger(p.cooldownMinutes) || p.cooldownMinutes < 1 || p.cooldownMinutes > 1440)
      ? 'choose a pause between 1 and 1,440 minutes.'
      : null,
  ];
}
export function readPlan(raw: unknown): BlockPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as BlockPlan;
  if (
    typeof p.title !== 'string' ||
    !Array.isArray(p.domains) ||
    !p.domains.every((d) => typeof d === 'string') ||
    !Array.isArray(p.days) ||
    !['always', 'scheduled'].includes(p.schedule) ||
    !['pause', 'nudge'].includes(p.mode) ||
    typeof p.start !== 'string' ||
    typeof p.end !== 'string' ||
    !['allowOverride', 'requireReason', 'enabled'].every(
      (key) => typeof p[key as keyof BlockPlan] === 'boolean',
    ) ||
    !Number.isFinite(p.createdAt) ||
    !Number.isFinite(p.baselineSavings) ||
    p.baselineSavings < 0 ||
    planErrors(p).some(Boolean)
  )
    return null;
  return { ...p, title: p.title.trim(), domains: [...new Set(p.domains)] };
}
export function scheduledNow(p: BlockPlan, at: number) {
  if (p.schedule === 'always') return true;
  const now = new Date(at),
    day = now.getDay(),
    minutes = now.getHours() * 60 + now.getMinutes();
  const parse = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = parse(p.start),
    end = parse(p.end);
  // Overnight windows belong to the day on which they start.
  return start < end
    ? p.days.includes(day) && minutes >= start && minutes < end
    : (p.days.includes(day) && minutes >= start) ||
        (p.days.includes((day + 6) % 7) && minutes < end);
}
export function previewDecision(p: BlockPlan, website: string, amount: number, at = Date.now()) {
  if (!p.enabled) return { matched: false, reason: 'your block is paused.' };
  if (!scheduledNow(p, at)) return { matched: false, reason: 'this is outside your quiet hours.' };
  const domain = domainName(website);
  if (!domain || !p.domains.some((d) => domain === d || domain.endsWith('.' + d)))
    return { matched: false, reason: 'this website is outside your block.' };
  if (!Number.isFinite(amount) || amount < p.minAmount)
    return { matched: false, reason: 'this purchase is below your limit.' };
  return {
    matched: true,
    reason: p.mode === 'pause' ? 'a little space before you decide.' : 'does this fit your goal?',
  };
}
