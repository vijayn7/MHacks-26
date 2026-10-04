import type postgres from "postgres";

export const SCORE_POLICY = {
  version: 1,
  currency: "USD",
  // Points per dollar. Prices are stored as integer cents.
  drop: 2, save: 0.25, checkIn: -0.5,
} as const;
export const DEFAULT_DEMO_AMOUNT_CENTS = 6499;
export type ScoreAction = "drop" | "save" | "check_in";
export type ScoreSource = "web" | "ios";
export type ScoreEvent = { id: string; pauseId: string; type: string; ruleId: string | null; source: ScoreSource; amountCents?: number; at: string };
export class ScoreError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
const kinds = new Set(["checkout_detected", "pause_started", "pause_opened", "purchase_dropped", "drop_selected", "saved_for_later", "continue_selected", "friend_ping_requested", "friend_message_sent", "friend_replied", "friend_request_accepted", "friend_approved", "friend_denied", "block_released", "pause_resolved"]);
export function validAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000;
}
export function scoreEvent(body: unknown): ScoreEvent {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b.id !== "string" || !b.id || b.id.length > 160
    || typeof b.pauseId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.pauseId)
    || typeof b.type !== "string" || !kinds.has(b.type) || (b.source !== "web" && b.source !== "ios")
    || (b.ruleId != null && (typeof b.ruleId !== "string" || b.ruleId.length > 160))
    || (b.amountCents !== undefined && !validAmount(b.amountCents))
    || (b.at !== undefined && (typeof b.at !== "string" || !Number.isFinite(Date.parse(b.at))))) {
    throw new ScoreError(400, "invalid_score_event");
  }
  return { id: b.id, pauseId: b.pauseId.toLowerCase(), type: b.type, source: b.source,
    ruleId: typeof b.ruleId === "string" ? b.ruleId : null,
    amountCents: b.source === "web" ? b.amountCents as number | undefined : undefined,
    at: typeof b.at === "string" ? new Date(b.at).toISOString() : new Date().toISOString() };
}
export function pointsFor(action: ScoreAction, amountCents: number): number {
  if (!validAmount(amountCents)) throw new ScoreError(400, "invalid_amount");
  // Round magnitude before applying sign so +/− half points are symmetrical.
  const weight = action === "check_in" ? SCORE_POLICY.checkIn : SCORE_POLICY[action];
  return Math.sign(weight) * Math.round(amountCents * Math.abs(weight) / 100);
}
export function actionFor(event: Pick<ScoreEvent, "type" | "source">): ScoreAction | null {
  if (event.type === "purchase_dropped" || event.type === "drop_selected") return "drop";
  if (event.type === "saved_for_later") return "save";
  if (event.type === "friend_ping_requested" || (event.source === "ios" && event.type === "continue_selected")) return "check_in";
  return null; // Direct browser Continue and approval/delivery callbacks score zero.
}
export function decisionFor(event: Pick<ScoreEvent, "type" | "source">): "drop" | "save" | "continue" | null {
  const action = actionFor(event);
  if (action === "drop" || action === "save") return action;
  if ((event.source === "web" && event.type === "continue_selected") || event.type === "friend_approved") return "continue";
  return null;
}

// Additive migration: old events have NULL scoring fields and are not rewarded
// retroactively. Keep the immutable ledger alongside the cached per-user total.
export async function ensureScoreSchema(sql: postgres.Sql) {
  await sql`create table if not exists user_scores (
    user_id text primary key references users(id), score bigint not null default 0,
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists scored_pauses (
    user_id text not null references users(id), source text not null, pause_id text not null,
    amount_cents integer not null check (amount_cents >= 0), price_source text not null,
    currency text not null default 'USD', decision text,
    primary key (user_id, source, pause_id)
  )`;
  await sql`alter table pause_events add column if not exists user_id text`;
  await sql`alter table pause_events add column if not exists pause_id text`;
  await sql`alter table pause_events add column if not exists source text`;
  await sql`alter table pause_events add column if not exists amount_cents integer`;
  await sql`alter table pause_events add column if not exists currency text`;
  await sql`alter table pause_events add column if not exists score_action text`;
  await sql`alter table pause_events add column if not exists score_delta integer`;
  await sql`alter table pause_events add column if not exists score_version integer`;
  // Local iPhone rules are identifiers, not rows in the website's rules table.
  // Preserve that identifier separately and keep the existing rule_id FK intact.
  await sql`alter table pause_events add column if not exists score_rule_id text`;
  // Existing Neon installations constrain types to the original web events.
  // Replace that constraint atomically with the web + native event vocabulary.
  await sql.begin(async tx => {
    await tx`alter table pause_events drop constraint if exists pause_events_type_check`;
    // These literals come only from the source-controlled vocabulary above.
    await tx.unsafe(`alter table pause_events add constraint pause_events_type_check check (type in (${[...kinds].map(kind => `'${kind}'`).join(",")}))`);
  });
  await sql`create unique index if not exists pause_score_action_once on pause_events (user_id, source, pause_id, score_action) where score_action is not null`;
  await sql`create index if not exists pause_scores_user_history on pause_events (user_id, at desc) where user_id is not null`;
}

export class ScoreService {
  constructor(private sql: postgres.Sql, readonly demoAmountCents = DEFAULT_DEMO_AMOUNT_CENTS) {
    if (!validAmount(demoAmountCents)) throw new Error("PACT_DEMO_AMOUNT_CENTS must be integer USD cents between 0 and 100000000");
  }
  async summary(userId: string) {
    const rows = await this.sql<{ score: string; updated_at: Date }[]>`select score, updated_at from user_scores where user_id = ${userId}`;
    return { userId, score: Number(rows[0]?.score ?? 0), updatedAt: rows[0]?.updated_at ?? null,
      demoAmountCents: this.demoAmountCents, policy: SCORE_POLICY };
  }
  async history(userId: string) {
    return this.sql`select id, pause_id, source, type, amount_cents, currency, score_action, score_delta, score_version, rule_id, score_rule_id, at
      from pause_events where user_id = ${userId} order by at desc, id desc limit 100`;
  }
  async record(userId: string, event: ScoreEvent) {
    if (!userId || userId.length > 100) throw new ScoreError(400, "invalid_user");
    return this.sql.begin(async tx => {
      await tx`insert into users (id) values (${userId}) on conflict (id) do nothing`;
      await tx`insert into user_scores (user_id) values (${userId}) on conflict (user_id) do nothing`;
      // Serialize scoring per user, including different pauses, to prevent lost
      // increments and concurrent Drop/Save rewards. Other users stay independent.
      const balances = await tx<{ score: string }[]>`select score from user_scores where user_id = ${userId} for update`;
      const balance = Number(balances[0]!.score);
      const id = `score-v1:${userId}:${event.source}:${event.pauseId}:${event.type}`;
      const prior = await tx`select score_delta, amount_cents, coalesce(score_rule_id, rule_id) as rule_id from pause_events where id = ${id}`;
      if (prior[0]) {
        if (prior[0].rule_id !== event.ruleId || (event.amountCents !== undefined && prior[0].amount_cents !== event.amountCents)) throw new ScoreError(409, "conflicting_event");
        return { eventId: event.id, duplicate: true, delta: 0, score: balance, amountCents: Number(prior[0].amount_cents) };
      }
      const amount = event.amountCents ?? this.demoAmountCents;
      await tx`insert into scored_pauses (user_id, source, pause_id, amount_cents, price_source)
        values (${userId}, ${event.source}, ${event.pauseId}, ${amount}, ${event.amountCents === undefined ? "demo" : "checkout"})
        on conflict (user_id, source, pause_id) do nothing`;
      const pauses = await tx<{ amount_cents: number; decision: string | null }[]>`select amount_cents, decision from scored_pauses
        where user_id = ${userId} and source = ${event.source} and pause_id = ${event.pauseId}`;
      const pause = pauses[0]!;
      if (event.amountCents !== undefined && pause.amount_cents !== event.amountCents) throw new ScoreError(409, "pause_price_changed");
      let action = actionFor(event);
      const decision = decisionFor(event);
      if (decision && pause.decision && pause.decision !== decision) action = null;
      if (decision && !pause.decision) await tx`update scored_pauses set decision = ${decision}
        where user_id = ${userId} and source = ${event.source} and pause_id = ${event.pauseId}`;
      // One check-in penalty plus at most one Drop/Save reward. A delayed check-in
      // still counts once if its event reaches us after the final choice.
      if (action) {
        const awarded = await tx`select id from pause_events where user_id = ${userId} and source = ${event.source}
          and pause_id = ${event.pauseId} and score_action = ${action}`;
        if (awarded.length) action = null;
      }
      const delta = action ? pointsFor(action, pause.amount_cents) : 0;
      await tx`insert into pause_events (id, type, rule_id, at, user_id, pause_id, source, amount_cents, currency, score_action, score_delta, score_version, score_rule_id)
        values (${id}, ${event.type}, (select id from rules where id = ${event.ruleId} and user_id = ${userId}), ${event.at}, ${userId}, ${event.pauseId}, ${event.source}, ${pause.amount_cents}, 'USD', ${action}, ${delta}, ${SCORE_POLICY.version}, ${event.ruleId})`;
      const updated = await tx<{ score: string }[]>`update user_scores set score = score + ${delta}, updated_at = now()
        where user_id = ${userId} returning score`;
      return { eventId: event.id, duplicate: false, delta, score: Number(updated[0]!.score), amountCents: pause.amount_cents };
    });
  }
}
