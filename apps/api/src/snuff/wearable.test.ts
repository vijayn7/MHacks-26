import assert from "node:assert/strict";
import { test } from "node:test";
import { freshWearable, mergeMoment, readWearable } from "./wearable";

const validMoment = {
  id: "m1",
  at: 1_700_000_000_000,
  name: "Wireless earbuds",
  outcome: "snuffed" as const,
  before: ["excited" as const],
  after: ["calm" as const],
  intensity: 64,
  bpm: [88, 90, 86] as [number, number, number],
  baseline: 68,
  simulated: true as const,
};

test("readWearable returns fresh defaults for junk", () => {
  assert.deepEqual(readWearable(null), freshWearable());
  assert.deepEqual(readWearable("nope"), freshWearable());
});

test("readWearable keeps connected settings and newest-first cap of 50", () => {
  const moments = Array.from({ length: 60 }, (_, i) => ({
    ...validMoment,
    id: `m${i}`,
    at: 1_700_000_000_000 - i,
  }));
  const w = readWearable({
    status: "connected",
    enabled: true,
    baseline: 68,
    reading: { bpm: 82, at: 1_700_000_000_100 },
    moments,
  });
  assert.equal(w.status, "connected");
  assert.equal(w.enabled, true);
  assert.equal(w.baseline, 68);
  assert.equal(w.reading?.bpm, 82);
  assert.equal(w.moments.length, 50);
  assert.equal(w.moments[0]?.id, "m0");
  assert.equal(w.moments[49]?.id, "m49");
});

test("readWearable drops invalid moments and bpm", () => {
  const w = readWearable({
    status: "connected",
    enabled: true,
    baseline: 10,
    reading: { bpm: 900, at: 1 },
    moments: [
      validMoment,
      { ...validMoment, id: "bad-outcome", outcome: "waiting" },
      { ...validMoment, id: "bad-sim", simulated: false },
      { ...validMoment, id: "bad-feel", before: ["rage"] },
    ],
  });
  assert.equal(w.baseline, null);
  assert.equal(w.reading, null);
  assert.deepEqual(
    w.moments.map((m) => m.id),
    ["m1"],
  );
});

test("mergeMoment upserts by id, puts newest first, and caps at 50", () => {
  const existing = Array.from({ length: 50 }, (_, i) => ({
    ...validMoment,
    id: `old-${i}`,
    at: 1_700_000_000_000 - i,
  }));
  const updated = mergeMoment(existing, { ...validMoment, id: "old-3", name: "Updated" });
  assert.equal(updated.length, 50);
  assert.equal(updated[0]?.id, "old-3");
  assert.equal(updated[0]?.name, "Updated");
  assert.equal(updated.filter((m) => m.id === "old-3").length, 1);

  const capped = mergeMoment(existing, { ...validMoment, id: "brand-new", name: "New" });
  assert.equal(capped.length, 50);
  assert.equal(capped[0]?.id, "brand-new");
  assert.equal(capped.some((m) => m.id === "old-49"), false);
});

test("mergeMoment with invalid payload removes prior id", () => {
  const existing = [validMoment, { ...validMoment, id: "m2", name: "Lamp" }];
  const next = mergeMoment(existing, { id: "m1", name: "broken" });
  assert.deepEqual(
    next.map((m) => m.id),
    ["m2"],
  );
});

test("DELETE target shape matches freshWearable", () => {
  const cleared = readWearable({
    ...freshWearable(),
    status: "connected",
    enabled: true,
    moments: [validMoment],
  });
  // WEARABLE merge keeps moments; DELETE replaces with freshWearable entirely.
  assert.notDeepEqual(cleared, freshWearable());
  assert.deepEqual(freshWearable().moments, []);
  assert.equal(freshWearable().enabled, false);
  assert.equal(freshWearable().status, "disconnected");
});
