import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { actionFor, pointsFor, scoreEvent } from "./scoring.js";
import { ScoreQueue, type ScoreEventInput } from "../../extension/src/score-queue.js";

test("action weights grow with price, with a small Save reward and negative check-in", () => {
  assert.equal(pointsFor("drop", 10000), 200);
  assert.equal(pointsFor("save", 10000), 25);
  assert.equal(pointsFor("check_in", 10000), -50);
  assert.equal(pointsFor("drop", 6499), 130);
  assert.equal(pointsFor("save", 6499), 16);
  assert.equal(pointsFor("check_in", 6499), -32);
  assert.equal(pointsFor("drop", 20000), 400);
  assert.equal(pointsFor("check_in", 100), -1);
  for (const invalid of [-1, 1.5, NaN, Infinity, 100_000_001]) assert.throws(() => pointsFor("drop", invalid));
});
test("only requesting a friend check-in incurs a penalty", () => {
  assert.equal(actionFor({ source: "web", type: "friend_ping_requested" }), "check_in");
  assert.equal(actionFor({ source: "ios", type: "continue_selected" }), "check_in");
  for (const type of ["continue_selected", "friend_approved", "friend_request_accepted", "pause_resolved"])
    assert.equal(actionFor({ source: "web", type }), null);
});
test("metadata validation rejects fractional/negative prices and strips user-provided identity", () => {
  const event = { id: "event", pauseId: randomUUID(), source: "web", type: "pause_started", amountCents: 6499 };
  assert.equal(scoreEvent(event).amountCents, 6499);
  assert.equal(scoreEvent({ ...event, source: "ios", amountCents: 99999 }).amountCents, undefined);
  assert.equal("userId" in scoreEvent({ ...event, userId: "another-user" }), false);
  for (const change of [{ amountCents: -10 }, { amountCents: 1.1 }, { source: "other" }, { pauseId: "bad" }, { type: "award_points" }])
    assert.throws(() => scoreEvent({ ...event, ...change }));
});
class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
}
function webEvent(type = "purchase_dropped"): ScoreEventInput {
  const id = randomUUID();
  return { id, pauseId: randomUUID(), source: "web", type, amountCents: 6499, ruleId: "test", at: new Date().toISOString() };
}
test("browser queue survives an outage/reload and only removes acknowledged events", async () => {
  const storage = new MemoryStorage(); const event = webEvent();
  const offline = new ScoreQueue(storage, async () => { throw new Error("offline"); });
  offline.enqueue(event);
  await assert.rejects(offline.flush(), /offline/);
  assert.equal(storage.length, 1);
  const recovered = new ScoreQueue(storage, async e => ({ eventId: e.id, score: 130, delta: 130, amountCents: 6499 }));
  const results = await recovered.flush();
  assert.equal(results[0]?.score, 130); assert.equal(storage.length, 0);
});
test("overlapping flushes share one send and a mismatched receipt remains queued", async () => {
  const storage = new MemoryStorage(); const event = webEvent(); let sends = 0;
  const queue = new ScoreQueue(storage, async e => { sends++; return { eventId: e.id, score: 130, delta: 130, amountCents: 6499 }; });
  queue.enqueue(event);
  await Promise.all([queue.flush(), queue.flush()]);
  assert.equal(sends, 1);
  const invalid = new ScoreQueue(storage, async () => ({ eventId: "wrong", score: 1, delta: 1, amountCents: 1 }));
  invalid.enqueue(event);
  await assert.rejects(invalid.flush(), /invalid_score_receipt/);
  assert.equal(storage.length, 1);
});
