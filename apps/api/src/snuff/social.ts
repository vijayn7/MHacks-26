import type { Slice, Sql } from "./slice";

const HUES = ["Ember", "Azure", "Verdigris", "Violet", "Crimson", "Ash"] as const;
type Hue = (typeof HUES)[number];

type FriendRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  contact_id: string | null;
  hue: string;
  base_savings: number;
  created_at: Date | string;
};

type ContactCandidate = { id: string; name: string; email: string; phone: string };

type Friend = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  contactId?: string;
  hue: Hue;
  savings: number;
};

// Dollars per hour of live drift for a few seeded friends (monotonic, whole dollars).
const DRIFT_PER_HOUR: Record<string, number> = {
  jules: 1,
  kai: 2,
  noah: 1,
  mila: 1,
};

const MOCK: Array<{
  id: string;
  name: string;
  email: string;
  hue: Hue;
  base_savings: number;
}> = [
  { id: "jules", name: "Jules", email: "jules@example.com", hue: "Violet", base_savings: 362 },
  { id: "sam", name: "Sam", email: "sam@example.com", hue: "Azure", base_savings: 248 },
  { id: "ria", name: "Ria", email: "ria@example.com", hue: "Verdigris", base_savings: 195 },
  { id: "kai", name: "Kai Chen", email: "kai@example.com", hue: "Ember", base_savings: 428 },
  { id: "noah", name: "Noah Park", email: "noah@example.com", hue: "Crimson", base_savings: 331 },
  { id: "mila", name: "Mila Ortiz", email: "mila@example.com", hue: "Ash", base_savings: 276 },
  { id: "leo", name: "Leo Nguyen", email: "leo@example.com", hue: "Azure", base_savings: 512 },
];

export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const phoneKey = (value: string) => value.replace(/\D/g, "");

export function normalizeContact(raw: {
  id: string;
  fullName?: string | null;
  emails?: { address?: string | null }[];
  phones?: { number?: string | null }[];
}): ContactCandidate | null {
  const email =
    raw.emails
      ?.map((e) => e.address?.trim().toLowerCase() || "")
      .find((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) || "";
  const phone =
    raw.phones
      ?.map((p) => p.number?.trim() || "")
      .find((p) => {
        const n = phoneKey(p);
        return n.length >= 7 && n.length <= 15;
      }) || "";
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
      id: "contact-" + c.id,
      contactId: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      hue: "Verdigris",
      savings: 0,
    });
  }
  return next;
}

// Live savings = base_savings + modest hourly drift for a few friends so the leaderboard moves without user action.
export function liveSavings(base: number, id: string, createdAt: Date | string, now = Date.now()) {
  const seeded = typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
  if (!Number.isFinite(seeded)) return Math.round(base);
  const hours = Math.max(0, Math.floor((now - seeded) / 3_600_000));
  const rate = DRIFT_PER_HOUR[id] ?? 0;
  return Math.round(base + rate * hours);
}

function asFriend(row: FriendRow, now = Date.now()): Friend {
  const friend: Friend = {
    id: row.id,
    name: row.name,
    email: row.email,
    hue: (HUES.includes(row.hue as Hue) ? row.hue : "Verdigris") as Hue,
    savings: liveSavings(Number(row.base_savings) || 0, row.id, row.created_at, now),
  };
  if (row.phone != null) friend.phone = row.phone;
  if (row.contact_id != null) friend.contactId = row.contact_id;
  return friend;
}

async function nextPosition(sql: Sql, userId: string) {
  const [row] = await sql<{ max: number | null }[]>`
    select max(position) as max from snuff_friends where user_id = ${userId}`;
  return (row?.max ?? -1) + 1;
}

async function loadFriends(sql: Sql, userId: string): Promise<Friend[]> {
  const rows = await sql<FriendRow[]>`
    select id, name, email, phone, contact_id, hue, base_savings, created_at
    from snuff_friends
    where user_id = ${userId}
    order by position asc, created_at asc`;
  return rows.map((row) => asFriend(row));
}

async function clearTrustedFriend(sql: Sql, userId: string, friendId: string) {
  const [reg] = await sql<{ exists: boolean }[]>`
    select to_regclass('snuff_profiles') is not null as exists`;
  if (!reg?.exists) return;
  await sql`
    update snuff_profiles
    set trusted_friend_id = null
    where user_id = ${userId} and trusted_friend_id = ${friendId}`;
}

export const social: Slice = {
  name: "social",

  async setup(sql, userId) {
    await sql`
      create table if not exists snuff_friends (
        user_id text not null,
        id text not null,
        name text not null,
        email text not null,
        phone text,
        contact_id text,
        hue text not null,
        base_savings integer not null default 0,
        position integer not null,
        created_at timestamptz not null default now(),
        primary key (user_id, id)
      )`;
    const existing = await sql`select 1 from snuff_friends where user_id = ${userId} limit 1`;
    if (existing.length) return;
    for (let i = 0; i < MOCK.length; i++) {
      const m = MOCK[i];
      await sql`
        insert into snuff_friends (user_id, id, name, email, phone, contact_id, hue, base_savings, position)
        values (${userId}, ${m.id}, ${m.name}, ${m.email}, ${null}, ${null}, ${m.hue}, ${m.base_savings}, ${i})`;
    }
  },

  async reset(sql, userId) {
    await sql`delete from snuff_friends where user_id = ${userId}`;
  },

  async read(sql, userId) {
    return { friends: await loadFriends(sql, userId) };
  },

  actions: {
    async CONNECT(sql, userId, action) {
      if (typeof action.email !== "string") return;
      const email = action.email.trim().toLowerCase();
      if (!validEmail(email)) return;
      const friends = await loadFriends(sql, userId);
      if (friends.some((f) => f.email.toLowerCase() === email)) return;
      const first = email.split("@")[0].split(/[._-]/)[0];
      const name = first.charAt(0).toUpperCase() + first.slice(1);
      const id = "friend-" + email;
      const position = await nextPosition(sql, userId);
      await sql`
        insert into snuff_friends (user_id, id, name, email, phone, contact_id, hue, base_savings, position)
        values (${userId}, ${id}, ${name}, ${email}, ${null}, ${null}, ${"Verdigris"}, ${0}, ${position})
        on conflict (user_id, id) do nothing`;
    },

    async CONNECT_CONTACTS(sql, userId, action) {
      if (!Array.isArray(action.contacts)) return;
      const contacts = action.contacts as ContactCandidate[];
      const friends = await loadFriends(sql, userId);
      const next = addContacts(friends, contacts);
      const added = next.slice(friends.length);
      if (!added.length) return;
      let position = await nextPosition(sql, userId);
      for (const f of added) {
        await sql`
          insert into snuff_friends (user_id, id, name, email, phone, contact_id, hue, base_savings, position)
          values (
            ${userId},
            ${f.id},
            ${f.name},
            ${f.email},
            ${f.phone ?? null},
            ${f.contactId ?? null},
            ${f.hue},
            ${0},
            ${position}
          )
          on conflict (user_id, id) do nothing`;
        position += 1;
      }
    },

    async RENAME_FRIEND(sql, userId, action) {
      if (typeof action.id !== "string" || typeof action.name !== "string") return;
      const name = action.name.trim();
      if (!name) return;
      await sql`
        update snuff_friends
        set name = ${name.slice(0, 60)}
        where user_id = ${userId} and id = ${action.id}`;
    },

    async REMOVE_FRIEND(sql, userId, action) {
      if (typeof action.id !== "string") return;
      await sql`delete from snuff_friends where user_id = ${userId} and id = ${action.id}`;
      await clearTrustedFriend(sql, userId, action.id);
    },
  },
};
