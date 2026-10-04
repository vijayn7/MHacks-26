export type SavedItem = { id: string; name: string; amount: number; savedAt: number };
export function readArchive(raw: unknown): SavedItem[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  return raw
    .filter((v): v is SavedItem => {
      if (
        !v ||
        typeof v.id !== 'string' ||
        !v.id ||
        ids.has(v.id) ||
        typeof v.name !== 'string' ||
        !v.name.trim() ||
        !Number.isFinite(v.amount) ||
        v.amount < 0 ||
        !Number.isFinite(v.savedAt) ||
        v.savedAt <= 0 ||
        Number.isNaN(new Date(v.savedAt).getTime())
      )
        return false;
      ids.add(v.id);
      return true;
    })
    .map(({ id, name, amount, savedAt }) => ({ id, name, amount, savedAt }))
    .sort((a, b) => b.savedAt - a.savedAt);
}
export const savedDate = (at: number) =>
  new Date(at)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toLowerCase();
export function archiveSamples(now = Date.now()): SavedItem[] {
  return [
    ['table light', 89],
    ['film camera', 240],
    ['studio headphones', 149],
    ['everyday tote', 64],
    ['desk speaker', 120],
    ['weekend watch', 180],
  ].map(([name, amount], i) => ({
    id: `sample-${i}`,
    name: String(name),
    amount: Number(amount),
    savedAt: now - (i + 1) * 86400000,
  }));
}
