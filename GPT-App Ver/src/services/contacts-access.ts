import { normalizeContact, type ContactCandidate } from '../state/contacts';
import type { ContactResult } from './contacts';
type Permission = {
  granted: boolean;
  canAskAgain: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
};
export type ContactReader = {
  getPermission: () => Promise<Permission>;
  requestPermission: () => Promise<Permission>;
  getPage: (offset: number, limit: number) => Promise<Parameters<typeof normalizeContact>[0][]>;
};
export async function readSystemContacts(
  api: ContactReader,
  signal?: AbortSignal,
): Promise<ContactResult> {
  let permission = await api.getPermission();
  if (signal?.aborted) return { status: 'ready', contacts: [], limited: false };
  if (!permission.granted && permission.accessPrivileges !== 'limited' && permission.canAskAgain)
    permission = await api.requestPermission();
  if (!permission.granted && permission.accessPrivileges !== 'limited')
    return { status: 'denied', canAskAgain: permission.canAskAgain };
  const contacts = new Map<string, ContactCandidate>();
  for (let offset = 0; !signal?.aborted; offset += 200) {
    const page = await api.getPage(offset, 200);
    for (const raw of page) {
      const contact = normalizeContact(raw);
      if (contact) contacts.set(contact.id, contact);
    }
    if (page.length < 200) break;
  }
  return {
    status: 'ready',
    contacts: [...contacts.values()].sort((a, b) => a.name.localeCompare(b.name)),
    limited: permission.accessPrivileges === 'limited',
  };
}
