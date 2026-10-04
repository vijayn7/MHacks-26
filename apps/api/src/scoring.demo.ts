import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import postgres from "postgres";

// Exercise the same HTTP scoring route as the extension, then read Neon
// independently. Keep labeled rows for inspection; never reset a user's score.
const { values } = parseArgs({ options: {
  "run-id": { type: "string", default: "v1" },
  step: { type: "string", default: "all" },
  help: { type: "boolean", default: false },
} });
const runId = values["run-id"]!;
const step = values.step!;
const ruleId = `score-demo:${runId}`;
const amountCents = 6499;
const api = "http://localhost:8787";

function pauseId(flow: string) {
  // A stable ID makes retries and repeated demo runs award each action once.
  const bytes = createHash("sha256").update(`${ruleId}:${flow}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}. Check that dev:api has Neon configured.`);
  return response.json() as Promise<T>;
}

async function main() {
  if (values.help) {
    console.log("npm run demo:scoring -- [--run-id NAME] [--step all|check-in|drop|save]");
    console.log("Writes labeled events to the configured demo user's Neon score. Reusing a run ID does not add points again.");
    return;
  }
  assert.match(runId, /^[a-zA-Z0-9_-]{1,64}$/, "Use a run ID of 1–64 letters, digits, underscores or hyphens.");
  assert.ok(["all", "check-in", "drop", "save"].includes(step), "Step must be all, check-in, drop or save.");
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in the repo-root .env first.");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
  try {
    const initial = await request<{ userId: string; score: number }>("/score");
    const userId = initial.userId;
    assert.equal(typeof userId, "string");
    // Refuse to write if the CLI and API are configured for different users.
    assert.equal(userId, process.env.PACT_DEMO_USER_ID?.trim() || "demo", "Restart dev:api with the current .env.");

    async function storedTotal() {
      const [row] = await sql`select
        coalesce((select score from user_scores where user_id = ${userId}), 0) as score,
        coalesce((select sum(score_delta) from pause_events where user_id = ${userId}), 0) as ledger`;
      assert.equal(Number(row!.score), Number(row!.ledger), "Neon total must equal its event ledger.");
      return Number(row!.score);
    }
    assert.equal(initial.score, await storedTotal(), "API and .env database scores differ; check their configuration.");
    console.log(`User: ${userId} | label: ${ruleId} | price: $64.99 | starting Neon score: ${initial.score}`);
    console.log("Simulated pause decisions only. This command sends no iMessage and creates no purchase.");

    async function record(flow: string, type: string, expectedDelta: number, label?: string) {
      const id = pauseId(flow);
      const event = { id: `${id}:${type}`, pauseId: id, source: "web", type, ruleId, amountCents, at: new Date().toISOString() };
      const receipt = await request<{ eventId: string; duplicate: boolean; delta: number; score: number; amountCents: number }>("/pause-events", event);
      assert.equal(receipt.eventId, event.id);
      assert.equal(receipt.amountCents, amountCents);
      assert.equal(receipt.delta, receipt.duplicate ? 0 : expectedDelta);
      const total = await storedTotal();
      assert.equal(total, receipt.score, "Neon and API scores differ; avoid other checkout activity during this demo.");
      const rows = await sql`select amount_cents, score_delta, score_rule_id from pause_events
        where user_id = ${userId} and source = 'web' and pause_id = ${id} and type = ${type}`;
      assert.equal(rows.length, 1, "The event must be persisted exactly once in Neon.");
      assert.equal(rows[0]!.amount_cents, amountCents);
      assert.equal(rows[0]!.score_delta, expectedDelta);
      assert.equal(rows[0]!.score_rule_id, ruleId);
      if (label) console.log(`${label}: delta ${receipt.delta >= 0 ? "+" : ""}${receipt.delta} → Neon score ${total}${receipt.duplicate ? " (duplicate; no new points)" : ""}`);
      return receipt;
    }

    if (step === "all" || step === "check-in") {
      await record("drop", "pause_started", 0);
      await record("drop", "friend_ping_requested", -32, "Ask a friend");
    }
    if (step === "all" || step === "drop") {
      await record("drop", "pause_started", 0);
      await record("drop", "purchase_dropped", 130, "Drop that purchase");
      const retry = await record("drop", "purchase_dropped", 130, "Retry Drop");
      assert.equal(retry.duplicate, true, "Retry must not award points again.");
    }
    if (step === "all" || step === "save") {
      await record("save", "pause_started", 0);
      await record("save", "saved_for_later", 16, "Save a different purchase");
    }

    const final = await request<{ score: number }>("/score");
    assert.equal(final.score, await storedTotal());
    console.log(`Verified final Neon score: ${final.score}. Rows remain in user_scores and pause_events (score_rule_id = '${ruleId}').`);
    console.log("Same run ID = safe retry. A new --run-id creates new pauses and changes the score again.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(error => {
  console.error("Scoring demo failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
