import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { ensureScoreSchema, ScoreService, scoreEvent } from "./scoring.js";

// Only runs when explicitly requested; isolated schema, no Photon or Nessie.
test("Neon transactions: retries, concurrent increments, outcomes, identities and restart", { skip: !process.env.SCORE_TEST_DATABASE_URL }, async () => {
  const schema = `pact_score_test_${randomUUID().replaceAll("-", "")}`;
  // Schema isolation needs a session connection; Neon transaction pooling
  // does not retain session settings. Only change this test connection's host.
  const connection = new URL(process.env.SCORE_TEST_DATABASE_URL!);
  if (connection.hostname.endsWith(".neon.tech")) connection.hostname = connection.hostname.replace("-pooler.", ".");
  const admin = postgres(connection.toString(), { max: 1, onnotice: () => {} });
  await admin`create schema ${admin(schema)}`;
  const sql = postgres(connection.toString(), { max: 4, onnotice: () => {} });
  try {
    // Explicitly initialize every test connection; Neon may filter startup GUCs.
    const connections = await Promise.all(Array.from({ length: 4 }, () => sql.reserve()));
    try {
      for (const connection of connections) {
        await connection`select set_config('search_path', ${schema}, false)`;
        const namespace = await connection`select current_schema() as schema`;
        assert.equal(namespace[0]!.schema, schema, "Refuse to test outside the isolated schema");
      }
    } finally { for (const connection of connections) connection.release(); }
    await sql`create table users (id text primary key, created_at timestamptz not null default now())`;
    await sql`create table rules (id text primary key, user_id text not null references users(id))`;
    // Match the deployed legacy schema, including constraints absent from the
    // API's original CREATE TABLE IF NOT EXISTS declarations.
    await sql`create table pause_events (id text primary key, type text not null,
      rule_id text references rules(id), at timestamptz not null,
      constraint pause_events_type_check check (type in (
        'checkout_detected', 'pause_started', 'purchase_dropped', 'saved_for_later',
        'continue_selected', 'friend_ping_requested', 'friend_message_sent', 'friend_replied', 'pause_resolved')))`;
    await sql`insert into users (id) values ('alice')`;
    await sql`insert into rules (id, user_id) values ('test', 'alice')`;
    // Existing history survives repeated migrations without invented scores.
    await sql`insert into pause_events values ('legacy', 'purchase_dropped', null, now())`;
    await ensureScoreSchema(sql); await ensureScoreSchema(sql);
    const scores = new ScoreService(sql);
    const pauseId = randomUUID();
    const event = (type: string, id: string = randomUUID(), source = "web", amountCents: number | undefined = 10000, pause = pauseId) => scoreEvent({ id, type, source, amountCents, pauseId: pause, ruleId: "test" });
    const start = event("pause_started"); await scores.record("alice", start);
    assert.equal((await scores.summary("alice")).score, 0);
    // A different event ID cannot duplicate the check-in penalty.
    await Promise.all(Array.from({ length: 8 }, () => scores.record("alice", event("friend_ping_requested"))));
    assert.equal((await scores.summary("alice")).score, -50);
    await Promise.all(Array.from({ length: 8 }, () => scores.record("alice", event("purchase_dropped"))));
    assert.equal((await scores.summary("alice")).score, 150);
    await scores.record("alice", event("saved_for_later"));
    assert.equal((await scores.summary("alice")).score, 150); // Cannot claim both rewards.
    await assert.rejects(scores.record("alice", event("pause_started", start.id, "web", 20000)), /conflicting_event/);
    await assert.rejects(scores.record("alice", event("pause_resolved", undefined, "web", 20000)), /pause_price_changed/);
    // Many different pauses still update the one total without lost increments.
    await Promise.all(Array.from({ length: 12 }, () => scores.record("alice", event("saved_for_later", undefined, "web", 10000, randomUUID()))));
    assert.equal((await scores.summary("alice")).score, 450);
    await scores.record("bob", event("purchase_dropped"));
    assert.equal((await scores.summary("bob")).score, 200);
    assert.equal((await scores.summary("alice")).score, 450);
    const linked = await sql`select user_id, rule_id, score_rule_id from pause_events where pause_id = ${pauseId} and type = 'purchase_dropped' order by user_id`;
    assert.equal(linked[0]!.rule_id, "test"); // Alice's server rule remains linked.
    assert.equal(linked[1]!.rule_id, null); // Bob must not link Alice's rule.
    assert.equal(linked[1]!.score_rule_id, "test"); // Raw identifier is preserved.
    // Native uses the server's demo price, even when a client invents an amount.
    const nativePause = randomUUID();
    await scores.record("bob", scoreEvent({ id: randomUUID(), pauseId: nativePause, source: "ios", type: "pause_opened", ruleId: "existing-checkout-signals-v1" }));
    await scores.record("bob", event("continue_selected", undefined, "ios", 99999, nativePause));
    await scores.record("bob", event("saved_for_later", undefined, "ios", 99999, nativePause));
    assert.equal((await scores.summary("bob")).score, 184);
    const restarted = new ScoreService(sql, 10000);
    await restarted.record("bob", event("pause_resolved", undefined, "ios", undefined, nativePause));
    assert.equal((await restarted.summary("bob")).score, 184); // Existing price remains 6499.
    const localDrop = scoreEvent({ id: randomUUID(), pauseId: randomUUID(), source: "ios", type: "drop_selected", ruleId: "existing-checkout-signals-v1" });
    await scores.record("native-local", localDrop);
    assert.equal((await scores.summary("native-local")).score, 130);
    assert.equal((await scores.record("native-local", localDrop)).duplicate, true);
    await assert.rejects(scores.record("native-local", { ...localDrop, ruleId: "different-local-rule" }), /conflicting_event/);
    const local = await scores.history("native-local");
    assert.equal(local[0]!.rule_id, null);
    assert.equal(local[0]!.score_rule_id, "existing-checkout-signals-v1");
    const sums = await sql`select user_id, sum(score_delta)::bigint as total from pause_events where user_id is not null group by user_id`;
    for (const row of sums) assert.equal((await scores.summary(row.user_id)).score, Number(row.total));
    const legacy = await sql`select score_delta from pause_events where id = 'legacy'`;
    assert.equal(legacy[0]!.score_delta, null);
    assert.equal((await scores.history("alice")).every(row => row.currency === "USD"), true);
  } finally {
    await sql.end();
    await admin`drop schema ${admin(schema)} cascade`;
    await admin.end();
  }
});
