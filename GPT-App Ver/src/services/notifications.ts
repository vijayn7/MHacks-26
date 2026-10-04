import type { Nudge } from '../state/model';
export type NudgeResponse = { id: string; action: 'open' | 'snuff' | 'later' };
// Browser preview uses the same in-app interaction, without asking for browser permissions.
export async function enableNudges() {
  return true;
}
export async function disableNudges() {}
export async function scheduleNudge(_nudge: Nudge, _seconds: number) {}
export async function cancelNudge(_id: string) {}
export function subscribeToNudges(_listener: (response: NudgeResponse) => void) {
  return () => {};
}
