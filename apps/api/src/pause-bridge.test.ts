import assert from "node:assert/strict";
import test from "node:test";
import { pauseBodyFrom, statusForNudgeAction } from "./pause-bridge.ts";

test("pauseBodyFrom accepts a valid pause create body", () => {
  assert.deepEqual(pauseBodyFrom({ id: "p1", name: "Whey", amount: 64.99 }), {
    id: "p1",
    name: "Whey",
    amount: 64.99,
  });
});

test("pauseBodyFrom rejects invalid bodies", () => {
  assert.equal(pauseBodyFrom(null), null);
  assert.equal(pauseBodyFrom({ id: "", name: "Whey", amount: 10 }), null);
  assert.equal(pauseBodyFrom({ id: "p1", name: "  ", amount: 10 }), null);
  assert.equal(pauseBodyFrom({ id: "p1", name: "Whey", amount: -1 }), null);
  assert.equal(pauseBodyFrom({ id: "p1", name: "Whey", amount: "10" }), null);
  assert.equal(pauseBodyFrom({ id: "p1", name: "Whey" }), null);
});

test("statusForNudgeAction maps pause lifecycle actions", () => {
  assert.equal(statusForNudgeAction("SNUFF_NUDGE"), "snuffed");
  assert.equal(statusForNudgeAction("KEEP_NUDGE"), "kept");
  assert.equal(statusForNudgeAction("SAVE_FOR_LATER"), "saved");
  assert.equal(statusForNudgeAction("SNOOZE_NUDGE"), "waiting");
  assert.equal(statusForNudgeAction("PAUSE"), null);
  assert.equal(statusForNudgeAction("DEMO_PURCHASE"), null);
});
