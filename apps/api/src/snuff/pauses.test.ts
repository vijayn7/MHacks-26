import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import postgres from "postgres";
import { createNudge, nudgeStatus, pauses } from "./pauses";

const url = process.env.DATABASE_URL;
if (!url) {
  test("pauses slice requires DATABASE_URL", { skip: true }, () => {});
} else {
  const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10, onnotice: () => {} });
  const userId = `pauses-test-${randomUUID()}`;

  test("pauses slice mirrors reducer money-loop semantics", async (t) => {
    t.after(async () => {
      await pauses.reset(sql, userId);
      await sql`delete from snuff_actions where user_id = ${userId}`;
      await sql.end({ timeout: 5 });
    });

    await pauses.reset(sql, userId);
    await pauses.setup(sql, userId);
    const seeded = await pauses.read(sql, userId);

    assert.ok(seeded.savings as number >= 300 && (seeded.savings as number) <= 450);
    assert.ok((seeded.pauses as number) >= 10 && (seeded.pauses as number) <= 15);
    assert.equal((seeded.nudges as { status: string }[]).filter((n) => n.status === "waiting").length, 1);
    assert.ok(((seeded.archive as unknown[]) || []).length >= 2);

    const waiting = (seeded.nudges as { id: string; amount: number; status: string }[]).find(
      (n) => n.status === "waiting",
    )!;
    const beforeSavings = seeded.savings as number;
    const beforePauses = seeded.pauses as number;
    const at = Date.UTC(2026, 9, 4, 18, 0, 0);

    await pauses.actions.SNUFF_NUDGE(sql, userId, { type: "SNUFF_NUDGE", id: waiting.id, at });
    let state = await pauses.read(sql, userId);
    assert.equal(state.savings, Math.round((beforeSavings + waiting.amount) * 100) / 100);
    assert.equal(state.pauses, beforePauses + 1);
    assert.equal(
      (state.nudges as { id: string; status: string }[]).find((n) => n.id === waiting.id)?.status,
      "snuffed",
    );
    const day = Object.entries(state.dailySavings as Record<string, number>).find(
      ([, v]) => v >= waiting.amount,
    );
    assert.ok(day, "snuff amount lands in dailySavings");

    // Second snuff on same id is a no-op (status guard + ledger conflict).
    await pauses.actions.SNUFF_NUDGE(sql, userId, { type: "SNUFF_NUDGE", id: waiting.id, at });
    assert.equal((await pauses.read(sql, userId)).savings, state.savings);

    await pauses.actions.DEMO_PURCHASE(sql, userId, { type: "DEMO_PURCHASE", id: "demo-headphones" });
    await pauses.actions.DEMO_PURCHASE(sql, userId, { type: "DEMO_PURCHASE", id: "demo-headphones" });
    state = await pauses.read(sql, userId);
    const demos = (state.nudges as { id: string; name: string; amount: number }[]).filter(
      (n) => n.id === "demo-headphones",
    );
    assert.equal(demos.length, 1);
    assert.equal(demos[0].name, "Studio headphones");
    assert.equal(demos[0].amount, 149);

    await pauses.actions.KEEP_NUDGE(sql, userId, { type: "KEEP_NUDGE", id: "demo-headphones" });
    assert.equal(await nudgeStatus(sql, userId, "demo-headphones"), "kept");
    await pauses.actions.SNOOZE_NUDGE(sql, userId, {
      type: "SNOOZE_NUDGE",
      id: "demo-headphones",
      until: 123,
    });
    state = await pauses.read(sql, userId);
    const snoozed = (state.nudges as { id: string; status: string; dueAt: number | null }[]).find(
      (n) => n.id === "demo-headphones",
    )!;
    assert.equal(snoozed.status, "waiting");
    assert.equal(snoozed.dueAt, 123);

    await createNudge(sql, userId, { id: "later-lamp", name: "Table lamp", amount: 72 });
    const savedAt = 1_791_079_200_000;
    await pauses.actions.SAVE_FOR_LATER(sql, userId, {
      type: "SAVE_FOR_LATER",
      id: "later-lamp",
      at: savedAt,
    });
    state = await pauses.read(sql, userId);
    const archived = (state.archive as { id: string; savedAt: number }[]).find(
      (a) => a.id === "later-lamp",
    )!;
    assert.equal(archived.savedAt, savedAt);
    assert.equal(await nudgeStatus(sql, userId, "later-lamp"), "saved");

    // Dedupe keeps original savedAt.
    await pauses.actions.REVISIT_ITEM(sql, userId, { type: "REVISIT_ITEM", id: "later-lamp" });
    await pauses.actions.SAVE_FOR_LATER(sql, userId, {
      type: "SAVE_FOR_LATER",
      id: "later-lamp",
      at: savedAt + 999999,
    });
    state = await pauses.read(sql, userId);
    assert.equal(
      (state.archive as { id: string; savedAt: number }[]).find((a) => a.id === "later-lamp")
        ?.savedAt,
      savedAt,
    );

    const pausesBefore = state.pauses as number;
    await pauses.actions.PAUSE(sql, userId, { type: "PAUSE" });
    assert.equal((await pauses.read(sql, userId)).pauses, pausesBefore + 1);

    await pauses.reset(sql, userId);
    await pauses.setup(sql, userId);
    const restored = await pauses.read(sql, userId);
    assert.equal(
      (restored.nudges as { status: string }[]).filter((n) => n.status === "waiting").length,
      1,
    );
    assert.ok((restored.savings as number) >= 300);
  });
}
