import assert from "node:assert/strict";
import test from "node:test";
import {
  clampPlanProposal,
  domainName,
  mockPlan,
  planErrors,
  readPlan,
} from "./plan";

test("mock plan passes readPlan (including localhost)", () => {
  const plan = mockPlan();
  assert.equal(domainName("localhost"), "localhost");
  assert.equal(domainName("http://localhost:5173"), "localhost");
  const parsed = readPlan(plan);
  assert.ok(parsed);
  assert.equal(parsed?.title, "japan trip fund");
  assert.deepEqual(parsed?.domains, ["localhost", "amazon.com", "target.com"]);
  assert.equal(parsed?.enabled, true);
  assert.equal(parsed?.minAmount, 40);
  assert.equal(parsed?.cooldownMinutes, 15);
  assert.ok(!planErrors(parsed!).some(Boolean));
});

test("SAVE_PLAN / PLAN_ENABLED semantics via readPlan mirroring", () => {
  const base = readPlan(mockPlan())!;
  assert.equal(readPlan({ ...base, title: "" }), null);
  assert.equal(readPlan({ ...base, minAmount: -1 }), null);
  assert.equal(readPlan({ ...base, cooldownMinutes: 0 }), null);
  assert.equal(readPlan({ ...base, domains: ["not a site"] }), null);

  const saved = readPlan({ ...base, title: "  weekend away  ", domains: ["amazon.com", "amazon.com"] });
  assert.equal(saved?.title, "weekend away");
  assert.deepEqual(saved?.domains, ["amazon.com"]);

  // PLAN_ENABLED only flips the flag on an existing plan (reducer returns s unchanged when plan is null).
  const disabled = { ...base, enabled: false };
  assert.equal(readPlan(disabled)?.enabled, false);
  assert.equal(readPlan(null), null);
});

test("clampPlanProposal validates and clamps a fake Gemini response", () => {
  const proposal = clampPlanProposal({
    domains: ["https://www.Amazon.com/cart", "localhost", "!!!", "target.com"],
    minAmount: 50.456,
    schedule: "scheduled",
    days: [1, 1, 9, -1, 5, 3.5],
    start: "21:00",
    end: "08:00",
    mode: "pause",
    cooldownMinutes: 2000,
    allowOverride: true,
    summary: "  pause amazon and target after 9  ",
  });
  assert.ok(proposal);
  assert.deepEqual(proposal?.domains, ["amazon.com", "localhost", "target.com"]);
  assert.equal(proposal?.minAmount, 50.46);
  assert.equal(proposal?.schedule, "scheduled");
  assert.deepEqual(proposal?.days, [1, 5]);
  assert.equal(proposal?.start, "21:00");
  assert.equal(proposal?.end, "08:00");
  assert.equal(proposal?.mode, "pause");
  assert.equal(proposal?.cooldownMinutes, 1440);
  assert.equal(proposal?.allowOverride, true);
  assert.equal(proposal?.summary, "pause amazon and target after 9");

  assert.equal(clampPlanProposal({ summary: "" }), null);
  assert.equal(clampPlanProposal({ minAmount: 10 }), null);
  assert.equal(clampPlanProposal(null), null);

  const partial = clampPlanProposal({
    summary: "soft nudge",
    mode: "nudge",
    schedule: "sometimes",
    start: "25:00",
    minAmount: -1,
    cooldownMinutes: -1,
  });
  assert.ok(partial);
  assert.equal(partial?.mode, "nudge");
  assert.equal(partial?.schedule, undefined);
  assert.equal(partial?.start, undefined);
  assert.equal(partial?.minAmount, undefined);
  assert.equal(partial?.cooldownMinutes, undefined);
});
