import { addContacts, type ContactCandidate } from './contacts';
import { readArchive, type SavedItem } from './archive';
import { readPlan, type BlockPlan } from './blocking';
import { isFace, type Face } from '../design/faces';
import type { Hue } from '../design/tokens';

export type Friend = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  contactId?: string;
  hue: Hue;
  savings: number;
};
export type Nudge = {
  id: string;
  name: string;
  amount: number;
  status: 'waiting' | 'snuffed' | 'kept' | 'saved';
  dueAt: number | null;
};
export type AppState = {
  version: 2;
  plan: BlockPlan | null;
  name: string;
  hue: Hue;
  face: Face;
  blendHue: Hue;
  blend: number;
  burnRate: number;
  trustedFriendId: string | null;
  savings: number;
  pauses: number;
  notificationsEnabled: boolean;
  dailySavings: Record<string, number>;
  friends: Friend[];
  nudges: Nudge[];
  archive: SavedItem[];
};
export type Action =
  | { type: 'SAVE_PLAN'; plan: BlockPlan }
  | { type: 'PLAN_ENABLED'; enabled: boolean }
  | { type: 'PAUSE'; at?: number }
  | { type: 'NAME'; name: string }
  | { type: 'HUE'; hue: Hue }
  | { type: 'FACE'; face: Face }
  | { type: 'BLEND_HUE'; hue: Hue }
  | { type: 'BLEND'; value: number }
  | { type: 'BURN_RATE'; value: number }
  | { type: 'TRUSTED_FRIEND'; id: string | null }
  | { type: 'NOTIFICATIONS'; enabled: boolean }
  | { type: 'CONNECT_CONTACTS'; contacts: ContactCandidate[] }
  | { type: 'CONNECT'; email: string }
  | { type: 'SAVE_FOR_LATER'; id: string; at?: number }
  | { type: 'REVISIT_ITEM'; id: string }
  | { type: 'KEEP_NUDGE'; id: string }
  | { type: 'SNUFF_NUDGE'; id: string; at?: number }
  | { type: 'SNOOZE_NUDGE'; id: string; until: number };
export const dayKey = (at: number) => new Date(at).toLocaleDateString('en-CA');
export const money = (amount: number) =>
  '$' + amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
export function initialState(now = Date.now()): AppState {
  return {
    version: 2,
    plan: null,
    archive: [],
    name: 'Alex',
    hue: 'Ember',
    face: 'classic',
    blendHue: 'Violet',
    blend: 38,
    burnRate: 54,
    trustedFriendId: 'sam',
    savings: 284,
    pauses: 11,
    notificationsEnabled: false,
    dailySavings: Object.fromEntries(
      [8, 24, 12, 19, 32, 51, 138].map((v, i) => [dayKey(now - (6 - i) * 86400000), v]),
    ),
    friends: [
      { id: 'jules', name: 'Jules', email: 'jules@example.com', hue: 'Violet', savings: 362 },
      { id: 'sam', name: 'Sam', email: 'sam@example.com', hue: 'Azure', savings: 248 },
      { id: 'ria', name: 'Ria', email: 'ria@example.com', hue: 'Verdigris', savings: 195 },
    ],
    nudges: [
      { id: 'headphones', name: 'Studio headphones', amount: 149, status: 'waiting', dueAt: null },
    ],
  };
}
const hues: Hue[] = ['Ember', 'Azure', 'Verdigris', 'Violet', 'Crimson', 'Ash'];
const percent = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;

export function migrate(raw: unknown): AppState {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  const old = raw as Record<string, any>; // The previous local schema is deliberately accepted at this boundary.
  if (old.version === 2)
    return {
      ...base,
      ...old,
      plan: readPlan(old.plan),
      archive: readArchive(old.archive),
      name: typeof old.name === 'string' ? old.name : base.name,
      hue: ['Ember', 'Azure', 'Verdigris', 'Violet', 'Crimson', 'Ash'].includes(old.hue)
        ? old.hue
        : base.hue,
      face: isFace(old.face) ? old.face : base.face,
      blendHue: hues.includes(old.blendHue) ? old.blendHue : base.blendHue,
      // Keep existing single-color companions unchanged until the user mixes them.
      blend: percent(old.blend, 0),
      burnRate: percent(old.burnRate, base.burnRate),
      trustedFriendId: (Array.isArray(old.friends) ? old.friends : base.friends).some(
        (f: Friend) =>
          f.id === (old.trustedFriendId === undefined ? base.trustedFriendId : old.trustedFriendId),
      )
        ? old.trustedFriendId === undefined
          ? base.trustedFriendId
          : old.trustedFriendId
        : null,
      savings: Number.isFinite(old.savings) && old.savings >= 0 ? old.savings : base.savings,
      pauses: Number.isFinite(old.pauses) && old.pauses >= 0 ? old.pauses : base.pauses,
      friends: Array.isArray(old.friends) ? old.friends : base.friends,
      nudges: Array.isArray(old.nudges) ? old.nudges : base.nudges,
      // Populate older, empty prototypes with the same seven-day Home sample.
      ...(old.savings === 0 && Object.values(old.dailySavings || {}).every((v) => v === 0)
        ? {
            savings: base.savings,
            pauses: base.pauses + (old.pauses || 0),
            dailySavings: base.dailySavings,
          }
        : {}),
    };
  if (old.version !== 1 || !old.user) return base;
  const purchases = Array.isArray(old.purchases) ? old.purchases : [];
  const saved =
    (old.baseSavings || 0) +
    purchases
      .filter((p: any) => p.status === 'released')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
  const converted = purchases
    .filter((p: any) => !['released', 'kept'].includes(p.status))
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      status: 'waiting' as const,
      dueAt: null,
    }));
  return {
    ...base,
    name: old.user.name || base.name,
    blend: 0,
    trustedFriendId: null,
    hue: old.user.hue || base.hue,
    savings: saved || base.savings,
    pauses: (old.pauses || 0) + (saved === 0 ? base.pauses : 0),
    notificationsEnabled: !!old.user.notifications?.reminders,
    dailySavings:
      saved === 0
        ? base.dailySavings
        : old.demo && old.baseSavings === 284
          ? {
              ...base.dailySavings,
              [dayKey(Date.now())]: (base.dailySavings[dayKey(Date.now())] || 0) + saved - 284,
            }
          : { [dayKey(Date.now())]: saved },
    friends: Array.isArray(old.friends)
      ? old.friends.map((f: any) => ({
          id: f.id,
          name: f.name,
          email: f.handle,
          hue: f.hue,
          savings: f.savings,
        }))
      : base.friends,
    nudges: converted.length ? converted : base.nudges,
  };
}
export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'SAVE_PLAN': {
      const plan = readPlan(a.plan);
      return plan ? { ...s, plan } : s;
    }
    case 'PLAN_ENABLED':
      return s.plan ? { ...s, plan: { ...s.plan, enabled: a.enabled } } : s;
    case 'PAUSE':
      return { ...s, pauses: s.pauses + 1 };
    case 'NAME':
      return a.name.trim() ? { ...s, name: a.name.trim().slice(0, 60) } : s;
    case 'FACE':
      return isFace(a.face) ? { ...s, face: a.face } : s;
    case 'HUE':
      return { ...s, hue: a.hue };
    case 'BLEND_HUE':
      return { ...s, blendHue: a.hue };
    case 'BLEND':
      return { ...s, blend: percent(a.value, s.blend) };
    case 'BURN_RATE':
      return { ...s, burnRate: percent(a.value, s.burnRate) };
    case 'TRUSTED_FRIEND':
      return a.id === null || s.friends.some((friend) => friend.id === a.id)
        ? { ...s, trustedFriendId: a.id }
        : s;
    case 'NOTIFICATIONS':
      return { ...s, notificationsEnabled: a.enabled };
    case 'CONNECT_CONTACTS':
      return { ...s, friends: addContacts(s.friends, a.contacts) };
    case 'CONNECT': {
      const email = a.email.trim().toLowerCase();
      if (!validEmail(email) || s.friends.some((f) => f.email.toLowerCase() === email)) return s;
      const first = email.split('@')[0].split(/[._-]/)[0];
      return {
        ...s,
        friends: [
          ...s.friends,
          {
            id: 'friend-' + email,
            email,
            name: first.charAt(0).toUpperCase() + first.slice(1),
            hue: 'Verdigris',
            savings: 0,
          },
        ],
      };
    }
    case 'SAVE_FOR_LATER': {
      const n = s.nudges.find((n) => n.id === a.id);
      const at = a.at ?? Date.now();
      if (
        !n ||
        n.status !== 'waiting' ||
        !Number.isFinite(n.amount) ||
        n.amount < 0 ||
        !Number.isFinite(at) ||
        at <= 0 ||
        Number.isNaN(new Date(at).getTime())
      )
        return s;
      return {
        ...s,
        archive: s.archive.some((item) => item.id === n.id)
          ? s.archive
          : [{ id: n.id, name: n.name, amount: n.amount, savedAt: at }, ...s.archive],
        nudges: s.nudges.map((item) =>
          item.id === n.id ? { ...item, status: 'saved', dueAt: null } : item,
        ),
      };
    }
    case 'REVISIT_ITEM': {
      const item = s.archive.find((item) => item.id === a.id);
      if (!item) return s;
      const n = s.nudges.find((n) => n.id === a.id);
      if (n && n.status !== 'saved') return s;
      return {
        ...s,
        nudges: n
          ? s.nudges.map((v) => (v.id === a.id ? { ...v, status: 'waiting', dueAt: null } : v))
          : [
              ...s.nudges,
              { id: item.id, name: item.name, amount: item.amount, status: 'waiting', dueAt: null },
            ],
      };
    }
    case 'KEEP_NUDGE':
      return {
        ...s,
        nudges: s.nudges.map((n) =>
          n.id === a.id && n.status === 'waiting' ? { ...n, status: 'kept', dueAt: null } : n,
        ),
      };
    case 'SNUFF_NUDGE': {
      const n = s.nudges.find((n) => n.id === a.id);
      if (!n || n.status !== 'waiting' || !Number.isFinite(n.amount) || n.amount <= 0) return s;
      const key = dayKey(a.at ?? Date.now());
      return {
        ...s,
        savings: Math.round((s.savings + n.amount) * 100) / 100,
        pauses: s.pauses + 1,
        dailySavings: { ...s.dailySavings, [key]: (s.dailySavings[key] || 0) + n.amount },
        nudges: s.nudges.map((item) =>
          item.id === a.id ? { ...item, status: 'snuffed', dueAt: null } : item,
        ),
      };
    }
    case 'SNOOZE_NUDGE':
      return {
        ...s,
        nudges: s.nudges.map((n) =>
          n.id === a.id && (n.status === 'waiting' || n.status === 'kept')
            ? { ...n, status: 'waiting', dueAt: a.until }
            : n,
        ),
      };
  }
}
