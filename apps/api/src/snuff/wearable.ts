import type { Slice, Sql } from "./slice";

const feelings = ["calm", "excited", "anxious", "bored", "unsure"] as const;
type Feeling = (typeof feelings)[number];
type WatchStatus = "disconnected" | "connected" | "denied" | "unavailable";
type Moment = {
  id: string;
  at: number;
  name: string;
  outcome: "saved" | "kept" | "snuffed";
  before: Feeling[];
  after: Feeling[];
  intensity: number;
  bpm: [number, number, number] | null;
  baseline: number | null;
  simulated: true;
};
type Wearable = {
  status: WatchStatus;
  enabled: boolean;
  baseline: number | null;
  reading: { bpm: number; at: number } | null;
  moments: Moment[];
};

const statuses: WatchStatus[] = ["connected", "disconnected", "denied", "unavailable"];
const outcomes = ["saved", "kept", "snuffed"] as const;

export const freshWearable = (): Wearable => ({
  status: "disconnected",
  enabled: false,
  baseline: null,
  reading: null,
  moments: [],
});

const validBpm = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 30 && v <= 220;

function isFeeling(v: unknown): v is Feeling {
  return typeof v === "string" && (feelings as readonly string[]).includes(v);
}

function readMoment(m: unknown): Moment | null {
  if (!m || typeof m !== "object") return null;
  const row = m as Moment;
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    !Number.isFinite(row.at) ||
    !outcomes.includes(row.outcome as (typeof outcomes)[number]) ||
    !Array.isArray(row.before) ||
    !Array.isArray(row.after) ||
    ![...row.before, ...row.after].every(isFeeling) ||
    !Number.isFinite(row.intensity) ||
    row.intensity < 0 ||
    row.intensity > 100 ||
    !(
      row.bpm === null ||
      (Array.isArray(row.bpm) && row.bpm.length === 3 && row.bpm.every(validBpm))
    ) ||
    !(row.baseline === null || validBpm(row.baseline)) ||
    row.simulated !== true
  ) {
    return null;
  }
  return {
    id: row.id,
    at: row.at,
    name: row.name,
    outcome: row.outcome,
    before: row.before,
    after: row.after,
    intensity: row.intensity,
    bpm: row.bpm,
    baseline: row.baseline,
    simulated: true,
  };
}

// Mirrors GPT-App Ver/src/state/wearable.ts `readWearable` exactly (50-moment cap, keep order).
export function readWearable(raw: unknown): Wearable {
  if (!raw || typeof raw !== "object") return freshWearable();
  const w = raw as Wearable;
  return {
    status: statuses.includes(w.status) ? w.status : "disconnected",
    enabled: w.enabled === true,
    baseline: validBpm(w.baseline) ? w.baseline : null,
    reading:
      w.reading && validBpm(w.reading.bpm) && Number.isFinite(w.reading.at) ? w.reading : null,
    moments: Array.isArray(w.moments)
      ? w.moments.map(readMoment).filter((m): m is Moment => m !== null).slice(0, 50)
      : [],
  };
}

// Mirrors reducer SAVE_MOMENT: prepend/upsert by id, cap 50, then readWearable filter.
export function mergeMoment(moments: Moment[], moment: unknown): Moment[] {
  const id =
    moment && typeof moment === "object" && typeof (moment as { id?: unknown }).id === "string"
      ? (moment as { id: string }).id
      : null;
  const raw = [moment, ...moments.filter((m) => id === null || m.id !== id)].slice(0, 50);
  return readWearable({ moments: raw }).moments;
}

type WearableRow = {
  status: string;
  enabled: boolean;
  baseline: number | null;
  reading_bpm: number | null;
  reading_at: number | null;
};

type MomentRow = {
  id: string;
  at: number;
  name: string;
  outcome: string;
  before: Feeling[];
  after: Feeling[];
  intensity: number;
  bpm: [number, number, number] | null;
  baseline: number | null;
  simulated: boolean;
};

function rowToWearable(row: WearableRow | undefined, moments: Moment[]): Wearable {
  if (!row) return readWearable({ ...freshWearable(), moments });
  return readWearable({
    status: row.status,
    enabled: row.enabled,
    baseline: row.baseline,
    reading:
      row.reading_bpm !== null && row.reading_at !== null
        ? { bpm: row.reading_bpm, at: Number(row.reading_at) }
        : null,
    moments,
  });
}

async function loadMoments(sql: Sql, userId: string): Promise<Moment[]> {
  const rows = await sql<MomentRow[]>`
    select id, at, name, outcome, before, after, intensity, bpm, baseline, simulated
    from snuff_moments
    where user_id = ${userId}
    order by listed_at desc, at desc`;
  return rows
    .map((r) =>
      readMoment({
        id: r.id,
        at: Number(r.at),
        name: r.name,
        outcome: r.outcome,
        before: r.before,
        after: r.after,
        intensity: Number(r.intensity),
        bpm: r.bpm,
        baseline: r.baseline === null ? null : Number(r.baseline),
        simulated: r.simulated === true ? true : r.simulated,
      }),
    )
    .filter((m): m is Moment => m !== null)
    .slice(0, 50);
}

async function loadWearable(sql: Sql, userId: string): Promise<Wearable> {
  const rows = await sql<WearableRow[]>`
    select status, enabled, baseline, reading_bpm, reading_at
    from snuff_wearables
    where user_id = ${userId}
    limit 1`;
  const moments = await loadMoments(sql, userId);
  return rowToWearable(rows[0], moments);
}

async function writeWearable(sql: Sql, userId: string, w: Wearable) {
  await sql`
    insert into snuff_wearables (user_id, status, enabled, baseline, reading_bpm, reading_at)
    values (
      ${userId},
      ${w.status},
      ${w.enabled},
      ${w.baseline},
      ${w.reading ? w.reading.bpm : null},
      ${w.reading ? w.reading.at : null}
    )
    on conflict (user_id) do update set
      status = excluded.status,
      enabled = excluded.enabled,
      baseline = excluded.baseline,
      reading_bpm = excluded.reading_bpm,
      reading_at = excluded.reading_at`;
}

async function writeMoments(sql: Sql, userId: string, moments: Moment[]) {
  await sql`delete from snuff_moments where user_id = ${userId}`;
  let i = 0;
  for (const m of moments.slice(0, 50)) {
    // listed_at decreases so order by listed_at desc matches newest-first array order.
    const listedAt = new Date(Date.now() - i * 1000);
    i += 1;
    await sql`
      insert into snuff_moments (
        user_id, id, at, name, outcome, before, after, intensity, bpm, baseline, simulated, listed_at
      ) values (
        ${userId},
        ${m.id},
        ${m.at},
        ${m.name},
        ${m.outcome},
        ${sql.json(m.before)},
        ${sql.json(m.after)},
        ${m.intensity},
        ${m.bpm === null ? null : sql.json(m.bpm)},
        ${m.baseline},
        ${true},
        ${listedAt}
      )`;
  }
}

function mockMoments(now: number): Moment[] {
  const day = 86400000;
  return [
    {
      id: "moment-earbuds",
      at: now - 0.4 * day,
      name: "Wireless earbuds",
      outcome: "snuffed",
      before: ["excited"],
      after: ["calm"],
      intensity: 64,
      bpm: [88, 90, 86],
      baseline: 68,
      simulated: true,
    },
    {
      id: "moment-shoes",
      at: now - 1.5 * day,
      name: "Running shoes",
      outcome: "saved",
      before: ["unsure", "anxious"],
      after: [],
      intensity: 48,
      bpm: [76, 78, 74],
      baseline: 68,
      simulated: true,
    },
    {
      id: "moment-jacket",
      at: now - 3 * day,
      name: "Rain jacket",
      outcome: "kept",
      before: ["calm"],
      after: ["calm"],
      intensity: 28,
      bpm: [70, 72, 69],
      baseline: 68,
      simulated: true,
    },
    {
      id: "moment-blender",
      at: now - 5 * day,
      name: "Countertop blender",
      outcome: "snuffed",
      before: ["bored", "excited"],
      after: ["unsure"],
      intensity: 55,
      bpm: [84, 86, 82],
      baseline: 68,
      simulated: true,
    },
    {
      id: "moment-lamp",
      at: now - 7 * day,
      name: "Desk lamp",
      outcome: "saved",
      before: ["anxious"],
      after: ["calm"],
      intensity: 41,
      bpm: null,
      baseline: null,
      simulated: true,
    },
    {
      id: "moment-mug",
      at: now - 8.5 * day,
      name: "Travel mug",
      outcome: "kept",
      before: ["calm", "bored"],
      after: [],
      intensity: 22,
      bpm: [66, 68, 67],
      baseline: 68,
      simulated: true,
    },
    {
      id: "moment-playlist",
      at: now - 9.5 * day,
      name: "Music subscription",
      outcome: "snuffed",
      before: ["unsure"],
      after: ["calm"],
      intensity: 37,
      bpm: [74, 75, 73],
      baseline: 68,
      simulated: true,
    },
  ];
}

export const wearable: Slice = {
  name: "wearable",
  async setup(sql, userId) {
    await sql`
      create table if not exists snuff_wearables (
        user_id text primary key,
        status text not null,
        enabled boolean not null,
        baseline double precision,
        reading_bpm double precision,
        reading_at double precision
      )`;
    await sql`
      create table if not exists snuff_moments (
        user_id text not null,
        id text not null,
        at double precision not null,
        name text not null,
        outcome text not null,
        before jsonb not null,
        after jsonb not null,
        intensity double precision not null,
        bpm jsonb,
        baseline double precision,
        simulated boolean not null default true,
        listed_at timestamptz not null default now(),
        primary key (user_id, id)
      )`;

    const existing = await sql<{ user_id: string }[]>`
      select user_id from snuff_wearables where user_id = ${userId} limit 1`;
    if (existing.length) return;

    const now = Date.now();
    const seed = readWearable({
      status: "connected",
      enabled: true,
      baseline: 68,
      reading: { bpm: 82, at: now },
      moments: mockMoments(now),
    });
    await writeWearable(sql, userId, seed);
    await writeMoments(sql, userId, seed.moments);
  },
  async reset(sql, userId) {
    await sql`delete from snuff_moments where user_id = ${userId}`;
    await sql`delete from snuff_wearables where user_id = ${userId}`;
  },
  async read(sql, userId) {
    const w = await loadWearable(sql, userId);
    // The demo watch is simulated. The app treats readings older than 5 minutes as stale, so serve a
    // fresh, gently drifting value near the baseline while the watch is connected.
    if (w.status === "connected" && w.enabled) {
      const now = Date.now();
      const bpm = Math.round((w.baseline ?? 68) + 6 + 5 * Math.sin(now / 45000));
      w.reading = { bpm, at: now };
    }
    return { wearable: w };
  },
  actions: {
    async WEARABLE(sql, userId, action) {
      const settings =
        action.settings && typeof action.settings === "object"
          ? (action.settings as Record<string, unknown>)
          : {};
      // Reducer merges settings onto wearable; moments stay owned by SAVE_MOMENT.
      const { moments: _ignored, ...rest } = settings;
      const current = await loadWearable(sql, userId);
      const next = readWearable({ ...current, ...rest, moments: current.moments });
      await writeWearable(sql, userId, next);
    },
    async SAVE_MOMENT(sql, userId, action) {
      if (!action.moment || typeof action.moment !== "object") return;
      const current = await loadWearable(sql, userId);
      const moments = mergeMoment(current.moments, action.moment);
      await writeMoments(sql, userId, moments);
    },
    async DELETE_WEARABLE_DATA(sql, userId) {
      const next = freshWearable();
      await writeWearable(sql, userId, next);
      await writeMoments(sql, userId, next.moments);
    },
  },
};
