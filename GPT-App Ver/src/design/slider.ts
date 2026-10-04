// Shared response curve keeps the native and browser glow in sync.
export function sliderGlow(value: number) {
  const amount = Math.max(0, Math.min(100, value)) / 100;
  return { size: 28 + 68 * amount, opacity: 0.3 + 0.7 * amount };
}
