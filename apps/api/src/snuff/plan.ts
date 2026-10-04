import type { Slice, Sql } from "./slice";

// Mirrors GPT-App Ver/src/state/blocking.ts BlockPlan + readPlan.
export type BlockPlan = {
  title: string;
  target: number;
  horizonDays: number;
  createdAt: number;
  baselineSavings: number;
  domains: string[];
  minAmount: number;
  schedule: "always" | "scheduled";
  days: number[];
  start: string;
  end: string;
  mode: "nudge" | "pause";
  cooldownMinutes: number;
  allowOverride: boolean;
  requireReason: boolean;
  enabled: boolean;
};

export type PlanProposal = {
  domains?: string[];
  minAmount?: number;
  schedule?: "always" | "scheduled";
  days?: number[];
  start?: string;
  end?: string;
  mode?: "nudge" | "pause";
  cooldownMinutes?: number;
  allowOverride?: boolean;
  summary: string;
};

export function domainName(input: string): string | null {
  try {
    const url = new URL(input.includes("://") ? input.trim() : "https://" + input.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const domain = url.hostname.toLowerCase().replace(/^www\./, "");
    // Demo storefront is http://localhost:5173; treat localhost as a valid domain.
    if (domain === "localhost") return domain;
    return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) ? domain : null;
  } catch {
    return null;
  }
}

const clock = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function planErrors(p: BlockPlan): (string | null)[] {
  return [
    !p.title.trim() || p.title.length > 60
      ? "give your goal a name, up to 60 characters."
      : !Number.isFinite(p.target) || p.target < 1 || p.target > 1000000
        ? "choose a savings goal between $1 and $1,000,000."
        : !Number.isInteger(p.horizonDays) || p.horizonDays < 1 || p.horizonDays > 365
          ? "choose between 1 and 365 days."
          : null,
    !p.domains.length || p.domains.some((d) => domainName(d) !== d)
      ? "add at least one valid website."
      : !Number.isFinite(p.minAmount) || p.minAmount < 0 || p.minAmount > 1000000
        ? "enter a purchase limit from $0 to $1,000,000."
        : null,
    p.schedule === "scheduled" &&
    (!p.days.length ||
      p.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
      !clock(p.start) ||
      !clock(p.end) ||
      p.start === p.end)
      ? "choose days and two different times in 24-hour format."
      : null,
    p.mode === "pause" &&
    (!Number.isInteger(p.cooldownMinutes) || p.cooldownMinutes < 1 || p.cooldownMinutes > 1440)
      ? "choose a pause between 1 and 1,440 minutes."
      : null,
  ];
}

export function readPlan(raw: unknown): BlockPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as BlockPlan;
  if (
    typeof p.title !== "string" ||
    !Array.isArray(p.domains) ||
    !p.domains.every((d) => typeof d === "string") ||
    !Array.isArray(p.days) ||
    !["always", "scheduled"].includes(p.schedule) ||
    !["pause", "nudge"].includes(p.mode) ||
    typeof p.start !== "string" ||
    typeof p.end !== "string" ||
    !["allowOverride", "requireReason", "enabled"].every(
      (key) => typeof p[key as keyof BlockPlan] === "boolean",
    ) ||
    !Number.isFinite(p.createdAt) ||
    !Number.isFinite(p.baselineSavings) ||
    p.baselineSavings < 0 ||
    planErrors(p).some(Boolean)
  )
    return null;
  return { ...p, title: p.title.trim(), domains: [...new Set(p.domains)] };
}

export function planSummary(p: BlockPlan): string {
  if (p.mode === "pause") {
    return `Pause purchases over $${p.minAmount} for ${p.cooldownMinutes} minutes.`;
  }
  return `Nudge on purchases over $${p.minAmount}.`;
}

/** Clamp a Gemini (or fake) JSON object into a partial BlockPlan proposal. */
export function clampPlanProposal(raw: unknown): PlanProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.summary !== "string" || !o.summary.trim()) return null;
  const proposal: PlanProposal = { summary: o.summary.trim().slice(0, 240) };

  if (Array.isArray(o.domains)) {
    const domains = [
      ...new Set(
        o.domains
          .filter((d): d is string => typeof d === "string")
          .map((d) => domainName(d))
          .filter((d): d is string => !!d),
      ),
    ];
    if (domains.length) proposal.domains = domains;
  }

  if (typeof o.minAmount === "number" && Number.isFinite(o.minAmount)) {
    proposal.minAmount = Math.max(0, Math.min(1000000, Math.round(o.minAmount * 100) / 100));
  }

  if (o.schedule === "always" || o.schedule === "scheduled") proposal.schedule = o.schedule;

  if (Array.isArray(o.days)) {
    const days = [
      ...new Set(
        o.days
          .filter((d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6)
          .sort((a, b) => a - b),
      ),
    ];
    if (days.length) proposal.days = days;
  }

  if (typeof o.start === "string" && clock(o.start)) proposal.start = o.start;
  if (typeof o.end === "string" && clock(o.end)) proposal.end = o.end;
  if (o.mode === "nudge" || o.mode === "pause") proposal.mode = o.mode;

  if (typeof o.cooldownMinutes === "number" && Number.isFinite(o.cooldownMinutes)) {
    proposal.cooldownMinutes = Math.max(1, Math.min(1440, Math.round(o.cooldownMinutes)));
  }

  if (typeof o.allowOverride === "boolean") proposal.allowOverride = o.allowOverride;

  return proposal;
}

export function mockPlan(): BlockPlan {
  // baselineSavings sits under the pauses-slice lifetime savings band (~$300–450).
  return {
    title: "japan trip fund",
    target: 2500,
    horizonDays: 90,
    createdAt: Date.UTC(2026, 8, 20, 15, 0, 0),
    baselineSavings: 280,
    domains: ["localhost", "amazon.com", "target.com"],
    minAmount: 40,
    schedule: "always",
    days: [1, 2, 3, 4, 5],
    start: "21:00",
    end: "08:00",
    mode: "pause",
    cooldownMinutes: 15,
    allowOverride: true,
    requireReason: true,
    enabled: true,
  };
}

export async function loadUserPlan(sql: Sql, userId: string): Promise<BlockPlan | null> {
  const rows = await sql<{ plan: unknown }[]>`
    select plan from snuff_plans where user_id = ${userId} limit 1`;
  return rows[0] ? readPlan(rows[0].plan) : null;
}

export async function upsertPlan(sql: Sql, userId: string, next: BlockPlan): Promise<void> {
  await sql`
    insert into snuff_plans (user_id, plan, updated_at)
    values (${userId}, ${sql.json(next as never)}, now())
    on conflict (user_id) do update set plan = excluded.plan, updated_at = now()`;
}

export const plan: Slice = {
  name: "plan",
  async setup(sql, userId) {
    await sql`
      create table if not exists snuff_plans (
        user_id text primary key,
        plan jsonb not null,
        updated_at timestamptz not null default now()
      )`;
    const existing = await sql`select 1 from snuff_plans where user_id = ${userId} limit 1`;
    if (!existing.length) {
      const seeded = readPlan(mockPlan());
      if (!seeded) throw new Error("plan_mock_invalid");
      await upsertPlan(sql, userId, seeded);
    }
  },
  async reset(sql, userId) {
    await sql`delete from snuff_plans where user_id = ${userId}`;
  },
  async read(sql, userId) {
    return { plan: await loadUserPlan(sql, userId) };
  },
  actions: {
    async SAVE_PLAN(sql, userId, action) {
      const next = readPlan(action.plan);
      if (!next) return;
      await upsertPlan(sql, userId, next);
    },
    async PLAN_ENABLED(sql, userId, action) {
      if (typeof action.enabled !== "boolean") return;
      const current = await loadUserPlan(sql, userId);
      if (!current) return;
      await upsertPlan(sql, userId, { ...current, enabled: action.enabled });
    },
  },
};
