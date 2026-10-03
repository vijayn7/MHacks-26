/** Ember cools toward ash as a hold completes. Progress is 0 (hot) to 1 (out). */
export function emberColor(progress: number): string {
  const t = clamp01(progress)
  return mix('#E23B1F', '#8C857C', t)
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

export const palette = {
  paper: '#F6F3EE',
  ink: '#1C140F',
  ash: '#8C857C',
  line: '#E4DDD4',
  ember: '#E23B1F',
  cool: '#6E7C74',
  card: '#FFFCF8',
}
