import type { Feeling, Wearable } from '../state/wearable';

// Replace this adapter with consented native samples. Emotions are scripted demo
// estimates, not an inference from heart rate or an Apple Watch emotion API.
export function sampleWatchReading(now = Date.now()): NonNullable<Wearable['reading']> {
  const phase = now / 9000;
  const intensity = Math.round(50 + 22 * Math.sin(phase));
  const emotions: Feeling[] = intensity > 55 ? ['excited', 'unsure'] : ['calm', 'unsure'];
  return { bpm: Math.round(80 + 5 * Math.sin(phase)), at: now, emotions, intensity };
}
