import {
  defaultPurchaseRules,
  readPurchaseRules,
  matchesPurchase,
  type PurchaseRules,
} from './purchase-rules';
import { spendingCategories } from '../design/onboarding';
import { addContacts, type ContactCandidate } from './contacts';
import { readArchive, savedSource, type SavedItem } from './archive';
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
  source?: string;
  id: string;
  name: string;
  amount: number;
  status: 'waiting' | 'snuffed' | 'kept' | 'saved';
  dueAt: number | null;
};
export type AppState = {
  version: 2;
  extensionOptOutIds: string[];
  onboardingComplete: boolean;
  spendingCategories: string[];
  plan: BlockPlan | null;
  purchaseRules: PurchaseRules;
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
  protectionPaused: boolean;
  dailySavings: Record<string, number>;
  friends: Friend[];
  nudges: Nudge[];
  archive: SavedItem[];
};
export type Action =
  | { type: 'PROTECTION_PAUSED'; paused: boolean }
  | { type: 'SYNC_EXTENSION_SCORE'; ids: string[] }
  | { type: 'RENAME_FRIEND'; id: string; name: string }
  | { type: 'REMOVE_FRIEND'; id: string }
  | { type: 'DEMO_PURCHASE'; id: string }
  | { type: 'COMPLETE_ONBOARDING'; categories: string[]; strength: number; rules?: PurchaseRules }
  | {
      type: 'INCOMING_PURCHASE';
      source?: string;
      id: string;
      name: string;
      amount: number;
      category?: string;
    }
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
/** 10 points per explicit Chrome Drop; demo seeds one ID per sample pause. */
export const snuffScore = (ids: readonly string[]) => ids.length * 10;
export const sampleOptOutIds = (count = 11) =>
  Array.from({ length: count }, (_, i) => `demo-pause-${i + 1}:impulse_opt_out`);
export function initialState(now = Date.now()): AppState {
  return {
    version: 2,
    extensionOptOutIds: sampleOptOutIds(11),
    onboardingComplete: false,
    spendingCategories: [],
    plan: null,
    purchaseRules: defaultPurchaseRules(),
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
    protectionPaused: false,
    notificationsEnabled: false,
    dailySavings: Object.fromEntries(
      [8, 24, 12, 19, 32, 51, 138].map((v, i) => [dayKey(now - (6 - i) * 86400000), v]),
    ),
    friends: [
      { id: 'jules', name: 'Jules', email: 'jules@example.com', hue: 'Violet', savings: 362 },
      { id: 'sam', name: 'Sam', email: 'sam@example.com', hue: 'Azure', savings: 248 },
      { id: 'ria', name: 'Ria', email: 'ria@example.com', hue: 'Verdigris', savings: 195 },
      { id: 'leo', name: 'Leo', email: 'leo@example.com', hue: 'Ember', savings: 176 },
      { id: 'maya', name: 'Maya', email: 'maya@example.com', hue: 'Crimson', savings: 142 },
      { id: 'kai', name: 'Kai', email: 'kai@example.com', hue: 'Ash', savings: 98 },
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
  const old = { ...raw } as Record<string, any>;
  delete old.wearable; // The previous local schema is deliberately accepted at this boundary.
  if (old.version === 2)
    return {
      ...base,
      ...old,
      extensionOptOutIds: Array.isArray(old.extensionOptOutIds)
        ? [
            ...new Set<string>(
              old.extensionOptOutIds.filter(
                (id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 200,
              ),
            ),
          ]
        : base.extensionOptOutIds,
      onboardingComplete: old.onboardingComplete !== false,
      spendingCategories: Array.isArray(old.spendingCategories)
        ? old.spendingCategories.filter((v: any) => spendingCategories.includes(v))
        : [],
      protectionPaused: old.protectionPaused === true,
      plan: readPlan(old.plan),
      purchaseRules: readPurchaseRules(old.purchaseRules),
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
            extensionOptOutIds: base.extensionOptOutIds,
          }
        : Array.isArray(old.extensionOptOutIds) &&
            old.extensionOptOutIds.length === 0 &&
            Number(old.savings) === base.savings
          ? { extensionOptOutIds: base.extensionOptOutIds }
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
    case 'DEMO_PURCHASE':
      return s.nudges.some((n) => n.id === a.id)
        ? s
        : {
            ...s,
            nudges: [
              ...s.nudges,
              { id: a.id, name: 'Studio headphones', amount: 149, status: 'waiting', dueAt: null },
            ],
          };
    case 'SYNC_EXTENSION_SCORE': {
      // The API is the source of truth, so a demo reset can lower the score.
      const ids = [
        ...new Set(
          a.ids.filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 200),
        ),
      ];
      return ids.join('\n') === s.extensionOptOutIds.join('\n')
        ? s
        : { ...s, extensionOptOutIds: ids };
    }
    case 'INCOMING_PURCHASE':
      return !s.protectionPaused &&
        matchesPurchase(s.purchaseRules, a.amount, a.category) &&
        !s.nudges.some((n) => n.id === a.id)
        ? {
            ...s,
            nudges: [
              ...s.nudges,
              {
                id: a.id,
                name: a.name,
                source: savedSource(a),
                amount: a.amount,
                status: 'waiting',
                dueAt: null,
              },
            ],
          }
        : s;
    case 'COMPLETE_ONBOARDING':
      return {
        ...s,
        onboardingComplete: true,
        friends: [
          ...s.friends,
          ...initialState()
            .friends.filter((sample) => !s.friends.some((friend) => friend.hue === sample.hue))
            .map((sample) => ({
              ...sample,
              id: s.friends.some((friend) => friend.id === sample.id)
                ? `sample-${sample.hue.toLowerCase()}-${s.friends.length}`
                : sample.id,
            })),
        ],
        purchaseRules: a.rules ? readPurchaseRules(a.rules) : s.purchaseRules,
        spendingCategories: [...new Set(a.categories)].filter((v) =>
          spendingCategories.includes(v as (typeof spendingCategories)[number]),
        ),
        burnRate: percent(a.strength, 54),
      };
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
    case 'PROTECTION_PAUSED':
      return { ...s, protectionPaused: a.paused };
    case 'NOTIFICATIONS':
      return { ...s, notificationsEnabled: a.enabled };
    case 'RENAME_FRIEND':
      return a.name.trim()
        ? {
            ...s,
            friends: s.friends.map((f) =>
              f.id === a.id ? { ...f, name: a.name.trim().slice(0, 60) } : f,
            ),
          }
        : s;
    case 'REMOVE_FRIEND':
      return {
        ...s,
        friends: s.friends.filter((f) => f.id !== a.id),
        trustedFriendId: s.trustedFriendId === a.id ? null : s.trustedFriendId,
      };
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
          : [
              { id: n.id, name: n.name, amount: n.amount, savedAt: at, source: savedSource(n) },
              ...s.archive,
            ],
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
              {
                id: item.id,
                name: item.name,
                source: savedSource(item),
                amount: item.amount,
                status: 'waiting',
                dueAt: null,
              },
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
