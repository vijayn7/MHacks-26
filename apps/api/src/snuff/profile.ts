import type { Slice, Sql } from "./slice";

const hues = ["Ember", "Azure", "Verdigris", "Violet", "Crimson", "Ash"] as const;
const faces = ["classic", "happy", "dreamy", "wink"] as const;
const spendingCategories = [
  "clothes & beauty",
  "tech & gadgets",
  "food & delivery",
  "games & in-app purchases",
  "sports betting",
  "other",
] as const;

const mock = {
  name: "Jordan",
  hue: "Azure" as const,
  face: "happy" as const,
  blendHue: "Crimson" as const,
  blend: 62,
  burnRate: 72,
  notificationsEnabled: true,
  onboardingComplete: true,
  spendingCategories: ["tech & gadgets", "food & delivery", "clothes & beauty"],
  trustedFriendId: "sam",
};

const percent = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;

const isHue = (value: unknown): value is (typeof hues)[number] =>
  typeof value === "string" && (hues as readonly string[]).includes(value);

const isFace = (value: unknown): value is (typeof faces)[number] =>
  typeof value === "string" && (faces as readonly string[]).includes(value);

async function ensureTable(sql: Sql) {
  await sql`
    create table if not exists snuff_profiles (
      user_id text primary key,
      name text not null,
      hue text not null,
      face text not null,
      blend_hue text not null,
      blend int not null,
      burn_rate int not null,
      notifications_enabled boolean not null,
      onboarding_complete boolean not null,
      spending_categories text[] not null default '{}',
      trusted_friend_id text
    )`;
}

async function friendExists(sql: Sql, userId: string, friendId: string): Promise<boolean> {
  // Social owns snuff_friends; tolerate the table not existing yet.
  const tables = await sql<{ exists: boolean }[]>`
    select to_regclass('public.snuff_friends') is not null as exists`;
  if (!tables[0]?.exists) return false;
  const rows = await sql`
    select 1 from snuff_friends where user_id = ${userId} and id = ${friendId} limit 1`;
  return rows.length > 0;
}

/** Social's REMOVE_FRIEND should call this so trustedFriendId clears when that friend is removed. */
export async function clearTrustedFriend(sql: Sql, userId: string, friendId: string) {
  await ensureTable(sql);
  await sql`
    update snuff_profiles
    set trusted_friend_id = null
    where user_id = ${userId} and trusted_friend_id = ${friendId}`;
}

export const profile: Slice = {
  name: "profile",

  async setup(sql, userId) {
    await ensureTable(sql);
    await sql`
      insert into snuff_profiles (
        user_id, name, hue, face, blend_hue, blend, burn_rate,
        notifications_enabled, onboarding_complete, spending_categories, trusted_friend_id
      ) values (
        ${userId},
        ${mock.name},
        ${mock.hue},
        ${mock.face},
        ${mock.blendHue},
        ${mock.blend},
        ${mock.burnRate},
        ${mock.notificationsEnabled},
        ${mock.onboardingComplete},
        ${mock.spendingCategories},
        ${mock.trustedFriendId}
      )
      on conflict (user_id) do nothing`;
  },

  async reset(sql, userId) {
    await ensureTable(sql);
    await sql`delete from snuff_profiles where user_id = ${userId}`;
  },

  async read(sql, userId) {
    await ensureTable(sql);
    const rows = await sql<
      {
        name: string;
        hue: string;
        face: string;
        blend_hue: string;
        blend: number;
        burn_rate: number;
        notifications_enabled: boolean;
        onboarding_complete: boolean;
        spending_categories: string[] | null;
        trusted_friend_id: string | null;
      }[]
    >`
      select
        name, hue, face, blend_hue, blend, burn_rate,
        notifications_enabled, onboarding_complete, spending_categories, trusted_friend_id
      from snuff_profiles
      where user_id = ${userId}
      limit 1`;
    const row = rows[0];
    if (!row) return {};
    return {
      name: row.name,
      hue: row.hue,
      face: row.face,
      blendHue: row.blend_hue,
      blend: row.blend,
      burnRate: row.burn_rate,
      notificationsEnabled: row.notifications_enabled,
      onboardingComplete: row.onboarding_complete,
      spendingCategories: Array.isArray(row.spending_categories) ? row.spending_categories : [],
      trustedFriendId: row.trusted_friend_id,
    };
  },

  actions: {
    async NAME(sql, userId, action) {
      if (typeof action.name !== "string") return;
      const name = action.name.trim().slice(0, 60);
      if (!name) return;
      await ensureTable(sql);
      await sql`update snuff_profiles set name = ${name} where user_id = ${userId}`;
    },

    async HUE(sql, userId, action) {
      if (!isHue(action.hue)) return;
      await ensureTable(sql);
      await sql`update snuff_profiles set hue = ${action.hue} where user_id = ${userId}`;
    },

    async FACE(sql, userId, action) {
      if (!isFace(action.face)) return;
      await ensureTable(sql);
      await sql`update snuff_profiles set face = ${action.face} where user_id = ${userId}`;
    },

    async BLEND_HUE(sql, userId, action) {
      if (!isHue(action.hue)) return;
      await ensureTable(sql);
      await sql`update snuff_profiles set blend_hue = ${action.hue} where user_id = ${userId}`;
    },

    async BLEND(sql, userId, action) {
      await ensureTable(sql);
      const rows = await sql<{ blend: number }[]>`
        select blend from snuff_profiles where user_id = ${userId} limit 1`;
      if (!rows[0]) return;
      const blend = percent(Number(action.value), rows[0].blend);
      await sql`update snuff_profiles set blend = ${blend} where user_id = ${userId}`;
    },

    async BURN_RATE(sql, userId, action) {
      await ensureTable(sql);
      const rows = await sql<{ burn_rate: number }[]>`
        select burn_rate from snuff_profiles where user_id = ${userId} limit 1`;
      if (!rows[0]) return;
      const burnRate = percent(Number(action.value), rows[0].burn_rate);
      await sql`update snuff_profiles set burn_rate = ${burnRate} where user_id = ${userId}`;
    },

    async NOTIFICATIONS(sql, userId, action) {
      if (typeof action.enabled !== "boolean") return;
      await ensureTable(sql);
      await sql`
        update snuff_profiles
        set notifications_enabled = ${action.enabled}
        where user_id = ${userId}`;
    },

    async COMPLETE_ONBOARDING(sql, userId, action) {
      const raw = Array.isArray(action.categories) ? action.categories : [];
      const categories = [...new Set(raw)]
        .filter((v): v is string => typeof v === "string")
        .filter((v) => (spendingCategories as readonly string[]).includes(v));
      const burnRate = percent(Number(action.strength), 54);
      await ensureTable(sql);
      await sql`
        update snuff_profiles
        set
          onboarding_complete = true,
          spending_categories = ${categories},
          burn_rate = ${burnRate}
        where user_id = ${userId}`;
    },

    async TRUSTED_FRIEND(sql, userId, action) {
      const id = action.id;
      if (id !== null && typeof id !== "string") return;
      if (id !== null && !(await friendExists(sql, userId, id))) return;
      await ensureTable(sql);
      await sql`
        update snuff_profiles
        set trusted_friend_id = ${id}
        where user_id = ${userId}`;
    },
  },
};
