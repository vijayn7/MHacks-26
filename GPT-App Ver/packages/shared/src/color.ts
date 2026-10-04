/** Ember cools toward ash as a hold completes. Progress is 0 (hot) to 1 (out). */
export function emberColor(progress: number): string {
  const t = clamp01(progress)
  return mix(snuff.flame.edge, snuff.smoke.muted, t)
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function mix(from: string, to: string, t: number): string {
  const a = hex(from)
  const b = hex(to)
  const channel = (index: number) => Math.round(a[index]! + (b[index]! - a[index]!) * t)
  return `#${[channel(0), channel(1), channel(2)].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

function hex(value: string): [number, number, number] {
  const raw = value.slice(1)
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)]
}

/** Snuff Figma tokens — Type + Color (Lit) + Flame Ember. File WHHOz06hrCV1a5g4nKBWt3 */
export const snuff = {
  font: {
    sans: 'Satoshi',
    display: 'Neco',
    mono: 'Roboto Mono',
  },
  type: {
    displayL: { size: 44, line: 48, track: -0.8 },
    headingM: { size: 28, line: 32, track: -0.8 },
    headingS: { size: 20, line: 26, track: -0.4 },
    numeralXl: { size: 34, line: 40, track: -1 },
    bodyL: { size: 17, line: 26, track: 0 },
    bodyM: { size: 15, line: 22, track: 0 },
    bodyS: { size: 13, line: 18, track: 0 },
    labelM: { size: 14, line: 20, track: -0.1 },
    monoMeta: { size: 12, line: 16, track: 0.9 },
  },
  bg: {
    base: '#000000',
    surface: '#050505',
    raised: '#141414',
  },
  text: {
    primary: '#F2EAE4',
    secondary: '#9A918B',
    muted: '#6B625C',
    inverse: '#050505',
  },
  flame: {
    core: '#FFF3D6',
    body: '#FFD66B',
    mid: '#F5A524',
    edge: '#ED7014',
    deep: '#8E1F02',
    wash: '#3A0F02',
  },
  smoke: {
    muted: '#8C857C',
  },
  border: {
    hair: 'rgba(255, 255, 255, 0.18)',
  },
} as const

/** @deprecated Use `snuff` — kept for older call sites. */
export const palette = {
  paper: snuff.bg.base,
  ink: snuff.text.primary,
  ash: snuff.smoke.muted,
  line: snuff.border.hair,
  ember: snuff.flame.edge,
  cool: '#6E7C74',
  card: snuff.bg.surface,
}
