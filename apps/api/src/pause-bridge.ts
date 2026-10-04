/** Shared validation and action→status mapping for checkout pause sync. */

export type PauseCreate = { id: string; name: string; amount: number; source?: string };

export function pauseBodyFrom(body: unknown): PauseCreate | null {
  if (!body || typeof body !== "object") return null;
  const { id, name, amount, source } = body as Record<string, unknown>;
  if (typeof id !== "string" || id.length === 0 || id.length > 160) return null;
  if (typeof name !== "string" || name.trim().length === 0 || name.length > 180) return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return null;
  const pause: PauseCreate = { id, name: name.trim(), amount };
  if (typeof source === "string" && source.trim()) pause.source = source.trim().slice(0, 40);
  return pause;
}

/** Map a nudge-resolving app action to the pause_status state written to Spacetime. */
export function statusForNudgeAction(type: string): string | null {
  switch (type) {
    case "SNUFF_NUDGE":
      return "snuffed";
    case "KEEP_NUDGE":
      return "kept";
    case "SAVE_FOR_LATER":
      return "saved";
    case "SNOOZE_NUDGE":
      return "waiting";
    default:
      return null;
  }
}
