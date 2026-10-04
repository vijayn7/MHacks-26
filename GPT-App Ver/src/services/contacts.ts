import type { ContactCandidate } from '../state/contacts';
export type ContactResult =
  | { status: 'ready'; contacts: ContactCandidate[]; limited: boolean }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unsupported' };
export async function loadContacts(_signal?: AbortSignal): Promise<ContactResult> {
  return { status: 'unsupported' };
}
