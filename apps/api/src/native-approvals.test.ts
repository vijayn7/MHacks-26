import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NativeApprovals, MemoryNativeRepository, authorizedNative, nativeRequest, type NativeRequest } from "./native-approvals.js";

const now = 1_800_000_000_000;
function setup() {
  const repo = new MemoryNativeRepository();
  const approvals = new NativeApprovals(repo, "+15555550100", () => now);
  const request: NativeRequest = { id: randomUUID(), pauseId: randomUUID(), source: "ios", createdAt: now - 1_000, expiresAt: now + 60_000 };
  let sends = 0;
  const deliver = async (_text: string) => { sends++; return { spaceId: "friend-dm", messageId: "outbound-1" }; };
  async function reply(overrides = {}) {
    const row = (await repo.get(request.id))!;
    return approvals.receive({ text: `CONFIRM ${row.code}`, sender: row.friend, spaceId: "friend-dm", id: randomUUID(), timestamp: now, ...overrides });
  }
  return { approvals, repo, request, deliver, reply, sends: () => sends };
}

test("concurrent retries reserve once, persist receipt, and approval is idempotent", async () => {
  const f = setup();
  await Promise.allSettled(Array.from({ length: 8 }, () => f.approvals.submit(f.request, f.deliver)));
  assert.equal(f.sends(), 1);
  assert.equal((await f.approvals.status(f.request.id)).status, "sent");
  assert.equal((await f.reply())?.status, "approved");
  assert.equal(await f.reply(), null);
  assert.equal((await f.approvals.submit(f.request, f.deliver)).status, "approved");
  assert.equal(f.sends(), 1);
  // A new coordinator using the same durable repository retains the decision.
  const restarted = new NativeApprovals(f.repo, "+15555550100", () => now);
  assert.equal((await restarted.status(f.request.id)).status, "approved");
});
test("wrong sender, thread, stale timestamps and bare or ambiguous replies do not approve", async () => {
  const f = setup(); await f.approvals.submit(f.request, f.deliver);
  for (const overrides of [{ sender: "+15555550101" }, { spaceId: "group" }, { timestamp: now - 60_000 },
    { text: "YES" }, { text: "CONFIRM" }, { text: "yes but no" }, { text: "CONFIRM FFFFFFFFFFFFFFFF" }]) {
    assert.equal(await f.reply(overrides), null);
    assert.equal((await f.approvals.status(f.request.id)).status, "sent");
  }
});
test("two simultaneous pauses use independent codes; rejecting one cannot unlock the other", async () => {
  const f = setup(); await f.approvals.submit(f.request, f.deliver);
  const second = { ...f.request, id: randomUUID(), pauseId: randomUUID() };
  await f.approvals.submit(second, f.deliver);
  const first = (await f.repo.get(f.request.id))!;
  assert.equal((await f.reply({ text: `NO ${first.code}` }))?.status, "rejected");
  assert.equal((await f.approvals.status(second.id)).status, "sent");
  assert.equal(await f.reply(), null);
});
test("expired requests and conflicting retries fail closed", async () => {
  const f = setup(); await f.approvals.submit(f.request, f.deliver);
  await assert.rejects(f.approvals.submit({ ...f.request, pauseId: randomUUID() }, f.deliver), /conflicting_request/);
  const later = new NativeApprovals(f.repo, "+15555550100", () => now + 120_000);
  await assert.rejects(later.status(f.request.id), /expired/);
  const row = (await f.repo.get(f.request.id))!;
  assert.equal(await later.receive({ text: `CONFIRM ${row.code}`, sender: row.friend, spaceId: "friend-dm", id: randomUUID(), timestamp: now }), null);
});
test("uncertain Photon sends never claim delivery, approve, or automatically send again", async () => {
  const f = setup(); let attempts = 0;
  const fail = async () => { attempts++; throw new Error("Cannot send until they respond"); };
  await assert.rejects(f.approvals.submit(f.request, fail), /send_failed/);
  await assert.rejects(f.approvals.submit(f.request, fail), /send_failed/);
  assert.equal(attempts, 1);
  assert.equal(await f.reply(), null);
});
test("native pairing key and bounded metadata are required", () => {
  const key = "a".repeat(32);
  assert.equal(authorizedNative(`Bearer ${key}`, key), true);
  for (const value of [undefined, "", "Bearer wrong"]) assert.equal(authorizedNative(value, key), false);
  assert.equal(authorizedNative("Bearer short", "short"), false);
  const f = setup();
  assert.deepEqual(nativeRequest({ ...f.request, product: "not uploaded", amount: 99 }), f.request);
  for (const invalid of [null, {}, { ...f.request, id: "invalid" }, { ...f.request, expiresAt: now + 3_600_000 }]) {
    assert.throws(() => nativeRequest(invalid), /invalid/);
  }
});
