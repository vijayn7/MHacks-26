import type { Friend } from './model';
export type ContactCandidate = { id: string; name: string; email: string; phone: string };
export const phoneKey = (value: string) => value.replace(/\D/g, '');
export function normalizeContact(raw: {
  id: string;
  fullName?: string | null;
  emails?: { address?: string | null }[];
  phones?: { number?: string | null }[];
}): ContactCandidate | null {
  const email =
    raw.emails
      ?.map((e) => e.address?.trim().toLowerCase() || '')
      .find((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) || '';
  const phone =
    raw.phones
      ?.map((p) => p.number?.trim() || '')
      .find((p) => {
        const n = phoneKey(p);
        return n.length >= 7 && n.length <= 15;
      }) || '';
  if (!raw.id || (!email && !phone)) return null;
  return { id: raw.id, name: raw.fullName?.trim().slice(0, 100) || email || phone, email, phone };
}
export function matchesContact(friend: Friend, contact: ContactCandidate) {
  return (
    friend.contactId === contact.id ||
    (!!contact.email && friend.email.toLowerCase() === contact.email.toLowerCase()) ||
    (!!contact.phone && !!friend.phone && phoneKey(friend.phone) === phoneKey(contact.phone))
  );
}
export function addContacts(friends: Friend[], contacts: ContactCandidate[]): Friend[] {
  const next = [...friends];
  for (const raw of contacts) {
    const c = normalizeContact({
      id: raw.id,
      fullName: raw.name,
      emails: [{ address: raw.email }],
      phones: [{ number: raw.phone }],
    });
    if (!c || next.some((f) => matchesContact(f, c))) continue;
    next.push({
      id: 'contact-' + c.id,
      contactId: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      hue: 'Verdigris',
      savings: 0,
    });
  }
  return next;
}
