import { randomUUID } from "node:crypto";
import type { Slice, Sql } from "./slice";

export type NudgeStatus = "waiting" | "snuffed" | "kept" | "saved";

type NudgeRow = {
  id: string;
  name: string;
  amount: number;
  status: NudgeStatus;
  dueAt: number | null;
};

// Day keys for dailySavings use the America/New_York calendar date of each ledger
// timestamp (`(at at time zone 'America/New_York')::date`), which matches the app's
// `dayKey` (`toLocaleDateString('en-CA')`) for shoppers in that zone.

const STATUSES = new Set<NudgeStatus>(["waiting", "snuffed", "kept", "saved"]);

function asAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function actionAt(action: Record<string, unknown>, fallback = Date.now()): number {
  const at = action.at;
  if (typeof at === "number" && Number.isFinite(at) && at > 0 && !Number.isNaN(new Date(at).getTime())) {
    return at;
  }
  return fallback;
}

async function ensureTables(sql: Sql) {
  // users is owned by ensureDb; create/insert so archive seeds satisfy saved_items_user_id_fkey.
  await sql`
    create table if not exists users (
      id text primary key,
      created_at timestamptz not null default now()
    )`;
  await sql`
    create table if not exists snuff_ledger (
      user_id text not null,
      id text not null,
      kind text not null,
      amount double precision not null default 0,
      at timestamptz not null,
      primary key (user_id, id)
    )`;
  await sql`
    create table if not exists snuff_nudges (
      user_id text not null,
      id text not null,
      name text not null,
      amount double precision not null,
      status text not null,
      due_at double precision,
      pos bigint not null,
      primary key (user_id, id)
    )`;
  // Shared with the Chrome extension via GET/POST /saved (created in ensureDb).
  await sql`
    create table if not exists saved_items (
      id text primary key,
      user_id text not null,
      rule_id text,
      item_url text,
      name text,
      amount numeric,
      created_at timestamptz not null default now()
    )`;
}

async function ensureUser(sql: Sql, userId: string) {
  await sql`
    insert into users (id) values (${userId})
    on conflict (id) do nothing`;
}

async function nextPos(sql: Sql, userId: string): Promise<number> {
  const rows = await sql<{ max: string | number | null }[]>`
    select coalesce(max(pos), 0) as max from snuff_nudges where user_id = ${userId}`;
  return Number(rows[0]?.max ?? 0) + 1;
}

async function loadNudge(sql: Sql, userId: string, id: string): Promise<NudgeRow | null> {
  const rows = await sql<{
    id: string;
    name: string;
    amount: number | string;
    status: string;
    due_at: number | string | null;
  }[]>`
    select id, name, amount, status, due_at
    from snuff_nudges
    where user_id = ${userId} and id = ${id}
    limit 1`;
  const row = rows[0];
  if (!row || !STATUSES.has(row.status as NudgeStatus)) return null;
  const amount = asAmount(row.amount);
  const dueAt =
    row.due_at == null || row.due_at === ""
      ? null
      : asAmount(row.due_at);
  return {
    id: row.id,
    name: row.name,
    amount,
    status: row.status as NudgeStatus,
    dueAt: dueAt != null && Number.isFinite(dueAt) ? dueAt : null,
  };
}

/** Insert a waiting nudge when `id` is new. Used by checkout → pause wiring. */
export async function createNudge(
  sql: Sql,
  userId: string,
  nudge: { id: string; name: string; amount: number },
): Promise<void> {
  if (!nudge.id || !nudge.name.trim() || !Number.isFinite(nudge.amount)) return;
  const pos = await nextPos(sql, userId);
  await sql`
    insert into snuff_nudges (user_id, id, name, amount, status, due_at, pos)
    values (${userId}, ${nudge.id}, ${nudge.name}, ${nudge.amount}, 'waiting', null, ${pos})
    on conflict (user_id, id) do nothing`;
}

export async function nudgeStatus(
  sql: Sql,
  userId: string,
  id: string,
): Promise<NudgeStatus | null> {
  const n = await loadNudge(sql, userId, id);
  return n?.status ?? null;
}

function mockLedger(now: number): { id: string; kind: "snuff" | "pause"; amount: number; at: Date }[] {
  // ~14 days of history so the Home 7-day chart has varied non-zero bars.
  // Lifetime snuffs sum to ~$334 with 12 snuffs + 1 bare pause = 13 pauses.
  const snuffs: [number, number][] = [
    [13, 25],
    [12, 30],
    [11, 18],
    [10, 40],
    [9, 22],
    [8, 35],
    [7, 28],
    [6, 8],
    [5, 24],
    [4, 12],
    [3, 19],
    [2, 32],
    [1, 51],
    [0, 48],
  ];
  // Keep offsets 13,11,10,9,8,6,5,4,3,2,1,0 (skip 12 and 7) → 12 snuffs.
  const keep = new Set([13, 11, 10, 9, 8, 6, 5, 4, 3, 2, 1, 0]);
  const rows: { id: string; kind: "snuff" | "pause"; amount: number; at: Date }[] = snuffs
    .filter(([daysAgo]) => keep.has(daysAgo))
    .map(([daysAgo, amount], i) => ({
      id: `seed-snuff-${i}`,
      kind: "snuff" as const,
      amount,
      at: new Date(now - daysAgo * 86400000 - (i % 5) * 3600000),
    }));
  rows.push({
    id: "seed-pause-0",
    kind: "pause",
    amount: 0,
    at: new Date(now - 10 * 86400000 - 2 * 3600000),
  });
  return rows;
}

async function seedIfEmpty(sql: Sql, userId: string) {
  const now = Date.now();
  const ledger = await sql`select 1 from snuff_ledger where user_id = ${userId} limit 1`;
  if (!ledger.length) {
    for (const row of mockLedger(now)) {
      await sql`
        insert into snuff_ledger (user_id, id, kind, amount, at)
        values (${userId}, ${row.id}, ${row.kind}, ${row.amount}, ${row.at})
        on conflict do nothing`;
    }
  }

  const nudges = await sql`select 1 from snuff_nudges where user_id = ${userId} limit 1`;
  if (!nudges.length) {
    const seed: { id: string; name: string; amount: number; status: NudgeStatus; dueAt: null; pos: number }[] =
      [
        {
          id: "seed-snuffed-speaker",
          name: "Desk speaker",
          amount: 120,
          status: "snuffed",
          dueAt: null,
          pos: 1,
        },
        {
          id: "seed-kept-camera",
          name: "Film camera",
          amount: 240,
          status: "kept",
          dueAt: null,
          pos: 2,
        },
        {
          id: "seed-waiting-watch",
          name: "Weekend watch",
          amount: 165,
          status: "waiting",
          dueAt: null,
          pos: 3,
        },
      ];
    for (const n of seed) {
      await sql`
        insert into snuff_nudges (user_id, id, name, amount, status, due_at, pos)
        values (${userId}, ${n.id}, ${n.name}, ${n.amount}, ${n.status}, ${n.dueAt}, ${n.pos})
        on conflict do nothing`;
    }
  }

  const archive = await sql`select 1 from saved_items where user_id = ${userId} limit 1`;
  if (!archive.length) {
    const items = [
      {
        id: "archive-camera",
        name: "Film camera",
        amount: 240,
        at: new Date(now - 18 * 86400000),
      },
      {
        id: "archive-tote",
        name: "Everyday tote",
        amount: 64,
        at: new Date(now - 11 * 86400000),
      },
      {
        id: "archive-lamp",
        name: "Ceramic table light",
        amount: 89,
        at: new Date(now - 4 * 86400000),
      },
    ];
    for (const item of items) {
      await sql`
        insert into saved_items (id, user_id, rule_id, item_url, name, amount, created_at)
        values (${item.id}, ${userId}, null, null, ${item.name}, ${item.amount}, ${item.at})
        on conflict (id) do nothing`;
    }
  }
}

export const pauses: Slice = {
  name: "pauses",

  async setup(sql, userId) {
    await ensureTables(sql);
    await ensureUser(sql, userId);
    await seedIfEmpty(sql, userId);
  },

  async reset(sql, userId) {
    await ensureTables(sql);
    await sql`delete from snuff_ledger where user_id = ${userId}`;
    await sql`delete from snuff_nudges where user_id = ${userId}`;
    await sql`delete from saved_items where user_id = ${userId}`;
  },

  async read(sql, userId) {
    const totals = await sql<{ savings: number | string | null; pauses: number | string | null }[]>`
      select
        coalesce(sum(case when kind = 'snuff' then amount else 0 end), 0) as savings,
        coalesce(count(*), 0) as pauses
      from snuff_ledger
      where user_id = ${userId}`;
    const savings = Math.round(asAmount(totals[0]?.savings ?? 0) * 100) / 100;
    const pausesCount = Math.max(0, Math.round(asAmount(totals[0]?.pauses ?? 0)));

    const dayRows = await sql<{ day: string; amount: number | string }[]>`
      select (at at time zone 'America/New_York')::date::text as day, sum(amount) as amount
      from snuff_ledger
      where user_id = ${userId} and kind = 'snuff'
      group by (at at time zone 'America/New_York')::date
      order by day asc`;
    const dailySavings: Record<string, number> = {};
    for (const row of dayRows) {
      if (!row.day) continue;
      dailySavings[row.day] = Math.round(asAmount(row.amount) * 100) / 100;
    }

    const nudgeRows = await sql<{
      id: string;
      name: string;
      amount: number | string;
      status: string;
      due_at: number | string | null;
    }[]>`
      select id, name, amount, status, due_at
      from snuff_nudges
      where user_id = ${userId}
      order by pos asc, id asc`;
    const nudges = nudgeRows
      .filter((row) => STATUSES.has(row.status as NudgeStatus))
      .map((row) => {
        const dueRaw = row.due_at == null || row.due_at === "" ? null : asAmount(row.due_at);
        return {
          id: row.id,
          name: row.name,
          amount: asAmount(row.amount),
          status: row.status as NudgeStatus,
          dueAt: dueRaw != null && Number.isFinite(dueRaw) ? dueRaw : null,
        };
      });

    const archiveRows = await sql<{
      id: string;
      name: string | null;
      amount: number | string | null;
      saved_at: number | string;
    }[]>`
      select
        id,
        name,
        amount,
        (extract(epoch from created_at) * 1000) as saved_at
      from saved_items
      where user_id = ${userId}
      order by created_at desc`;
    const seen = new Set<string>();
    const archive = archiveRows
      .filter((row) => {
        if (!row.id || seen.has(row.id)) return false;
        if (typeof row.name !== "string" || !row.name.trim()) return false;
        const amount = asAmount(row.amount);
        const savedAt = asAmount(row.saved_at);
        if (!Number.isFinite(amount) || amount < 0) return false;
        if (!Number.isFinite(savedAt) || savedAt <= 0 || Number.isNaN(new Date(savedAt).getTime()))
          return false;
        seen.add(row.id);
        return true;
      })
      .map((row) => ({
        id: row.id,
        name: row.name as string,
        amount: asAmount(row.amount),
        savedAt: asAmount(row.saved_at),
      }));

    return {
      savings: Number.isFinite(savings) && savings >= 0 ? savings : 0,
      pauses: Number.isFinite(pausesCount) && pausesCount >= 0 ? pausesCount : 0,
      dailySavings,
      nudges,
      archive,
    };
  },

  actions: {
    async SNUFF_NUDGE(sql, userId, action) {
      const id = action.id;
      if (typeof id !== "string" || !id) return;
      const n = await loadNudge(sql, userId, id);
      if (!n || n.status !== "waiting" || !Number.isFinite(n.amount) || n.amount <= 0) return;
      const at = actionAt(action);
      await sql.begin(async (tx) => {
        await tx`
          update snuff_nudges
          set status = 'snuffed', due_at = null
          where user_id = ${userId} and id = ${id} and status = 'waiting'`;
        await tx`
          insert into snuff_ledger (user_id, id, kind, amount, at)
          values (${userId}, ${"snuff-" + id}, 'snuff', ${n.amount}, ${new Date(at)})
          on conflict do nothing`;
      });
    },

    async KEEP_NUDGE(sql, userId, action) {
      const id = action.id;
      if (typeof id !== "string" || !id) return;
      await sql`
        update snuff_nudges
        set status = 'kept', due_at = null
        where user_id = ${userId} and id = ${id} and status = 'waiting'`;
    },

    async SNOOZE_NUDGE(sql, userId, action) {
      const id = action.id;
      const until = action.until;
      if (typeof id !== "string" || !id) return;
      if (typeof until !== "number" || !Number.isFinite(until)) return;
      await sql`
        update snuff_nudges
        set status = 'waiting', due_at = ${until}
        where user_id = ${userId}
          and id = ${id}
          and status in ('waiting', 'kept')`;
    },

    async SAVE_FOR_LATER(sql, userId, action) {
      const id = action.id;
      if (typeof id !== "string" || !id) return;
      const n = await loadNudge(sql, userId, id);
      const at = (typeof action.at === "number" ? action.at : undefined) ?? Date.now();
      if (
        !n ||
        n.status !== "waiting" ||
        !Number.isFinite(n.amount) ||
        n.amount < 0 ||
        !Number.isFinite(at) ||
        at <= 0 ||
        Number.isNaN(new Date(at).getTime())
      ) {
        return;
      }
      await sql.begin(async (tx) => {
        await tx`
          insert into saved_items (id, user_id, rule_id, item_url, name, amount, created_at)
          values (${n.id}, ${userId}, null, null, ${n.name}, ${n.amount}, ${new Date(at)})
          on conflict (id) do nothing`;
        await tx`
          update snuff_nudges
          set status = 'saved', due_at = null
          where user_id = ${userId} and id = ${id} and status = 'waiting'`;
      });
    },

    async REVISIT_ITEM(sql, userId, action) {
      const id = action.id;
      if (typeof id !== "string" || !id) return;
      const items = await sql<{
        id: string;
        name: string | null;
        amount: number | string | null;
      }[]>`
        select id, name, amount from saved_items
        where user_id = ${userId} and id = ${id}
        limit 1`;
      const item = items[0];
      if (!item || typeof item.name !== "string" || !item.name.trim()) return;
      const amount = asAmount(item.amount);
      if (!Number.isFinite(amount) || amount < 0) return;

      const n = await loadNudge(sql, userId, id);
      if (n && n.status !== "saved") return;
      if (n) {
        await sql`
          update snuff_nudges
          set status = 'waiting', due_at = null
          where user_id = ${userId} and id = ${id} and status = 'saved'`;
        return;
      }
      const pos = await nextPos(sql, userId);
      await sql`
        insert into snuff_nudges (user_id, id, name, amount, status, due_at, pos)
        values (${userId}, ${item.id}, ${item.name}, ${amount}, 'waiting', null, ${pos})
        on conflict (user_id, id) do nothing`;
    },

    async PAUSE(sql, userId, action) {
      const at = actionAt(action);
      const id = `pause-${randomUUID()}`;
      await sql`
        insert into snuff_ledger (user_id, id, kind, amount, at)
        values (${userId}, ${id}, 'pause', 0, ${new Date(at)})
        on conflict do nothing`;
    },

    async DEMO_PURCHASE(sql, userId, action) {
      const id = action.id;
      if (typeof id !== "string" || !id) return;
      const existing = await loadNudge(sql, userId, id);
      if (existing) return;
      await createNudge(sql, userId, { id, name: "Studio headphones", amount: 149 });
    },
  },
};
