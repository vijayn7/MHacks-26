export const feelings = ['calm', 'excited', 'anxious', 'bored', 'unsure'] as const;
export type Feeling = (typeof feelings)[number];
export type WatchStatus = 'disconnected' | 'connected' | 'denied' | 'unavailable';
export type Moment = {
  id: string;
  at: number;
  name: string;
  outcome: 'saved' | 'kept' | 'snuffed';
  before: Feeling[];
  after: Feeling[];
  intensity: number;
  bpm: [number, number, number] | null;
  baseline: number | null;
  simulated: true;
};
export type Wearable = {
  status: WatchStatus;
  enabled: boolean;
  baseline: number | null;
  reading: { bpm: number; at: number; emotions?: Feeling[]; intensity?: number } | null;
  moments: Moment[];
};
export const freshWearable = (): Wearable => ({
  status: 'disconnected',
  enabled: false,
  baseline: null,
  reading: null,
  moments: [],
});
export function recentReading(w: Wearable, now = Date.now()) {
  return w.enabled &&
    w.status === 'connected' &&
    w.reading &&
    now >= w.reading.at &&
    now - w.reading.at < 5 * 60000
    ? w.reading.bpm
    : null;
}
export function readWearable(raw: unknown): Wearable {
  if (!raw || typeof raw !== 'object') return freshWearable();
  const w = raw as Wearable;
  const validBpm = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 30 && v <= 220;
  return {
    status: ['connected', 'disconnected', 'denied', 'unavailable'].includes(w.status)
      ? w.status
      : 'disconnected',
    enabled: w.enabled === true,
    baseline: validBpm(w.baseline) ? w.baseline : null,
    reading:
      w.reading && validBpm(w.reading.bpm) && Number.isFinite(w.reading.at)
        ? {
            bpm: w.reading.bpm,
            at: w.reading.at,
            emotions: Array.isArray(w.reading.emotions)
              ? w.reading.emotions.filter((f) => feelings.includes(f))
              : [],
            intensity:
              typeof w.reading.intensity === 'number' && Number.isFinite(w.reading.intensity)
                ? Math.max(0, Math.min(100, w.reading.intensity))
                : 50,
          }
        : null,
    moments: Array.isArray(w.moments)
      ? w.moments
          .filter(
            (m) =>
              m &&
              typeof m.id === 'string' &&
              typeof m.name === 'string' &&
              Number.isFinite(m.at) &&
              ['saved', 'kept', 'snuffed'].includes(m.outcome) &&
              Array.isArray(m.before) &&
              Array.isArray(m.after) &&
              [...m.before, ...m.after].every((f) => feelings.includes(f)) &&
              Number.isFinite(m.intensity) &&
              m.intensity >= 0 &&
              m.intensity <= 100 &&
              (m.bpm === null ||
                (Array.isArray(m.bpm) && m.bpm.length === 3 && m.bpm.every(validBpm))) &&
              (m.baseline === null || validBpm(m.baseline)) &&
              m.simulated === true,
          )
          .slice(0, 50)
      : [],
  };
}
