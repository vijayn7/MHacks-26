import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import postgres from "postgres";
import { clearTrustedFriend, profile } from "./profile.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  test("profile slice requires DATABASE_URL", { skip: true }, () => {});
} else {
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    onnotice: () => {},
  });
  const userId = `profile-test-${randomUUID()}`;
  let createdFriendsTable = false;

  test.after(async () => {
    await sql`delete from snuff_profiles where user_id = ${userId}`;
    const tables = await sql<{ exists: boolean }[]>`
      select to_regclass('public.snuff_friends') is not null as exists`;
    if (tables[0]?.exists) {
      await sql`delete from snuff_friends where user_id = ${userId}`;
    }
    if (createdFriendsTable) {
      await sql`drop table if exists snuff_friends`;
    }
    await sql.end({ timeout: 5 });
  });

  test("setup seeds mock profile and actions mirror reducer clamps", async () => {
    await profile.reset(sql, userId);
    await profile.setup(sql, userId);
    const seeded = await profile.read(sql, userId);
    assert.equal(seeded.name, "Jordan");
    assert.equal(seeded.hue, "Azure");
    assert.equal(seeded.face, "happy");
    assert.equal(seeded.blendHue, "Crimson");
    assert.equal(seeded.blend, 62);
    assert.equal(seeded.burnRate, 72);
    assert.equal(seeded.notificationsEnabled, true);
    assert.equal(seeded.onboardingComplete, true);
    assert.deepEqual(seeded.spendingCategories, [
      "tech & gadgets",
      "food & delivery",
      "clothes & beauty",
    ]);
    assert.equal(seeded.trustedFriendId, "sam");

    await profile.actions.NAME(sql, userId, { type: "NAME", name: "  Maya  " });
    await profile.actions.NAME(sql, userId, { type: "NAME", name: "   " });
    await profile.actions.HUE(sql, userId, { type: "HUE", hue: "Violet" });
    await profile.actions.HUE(sql, userId, { type: "HUE", hue: "NotAHue" });
    await profile.actions.FACE(sql, userId, { type: "FACE", face: "wink" });
    await profile.actions.FACE(sql, userId, { type: "FACE", face: "robot" });
    await profile.actions.BLEND_HUE(sql, userId, { type: "BLEND_HUE", hue: "Ash" });
    await profile.actions.BLEND(sql, userId, { type: "BLEND", value: 140.4 });
    await profile.actions.BURN_RATE(sql, userId, { type: "BURN_RATE", value: -12 });
    await profile.actions.NOTIFICATIONS(sql, userId, { type: "NOTIFICATIONS", enabled: false });
    await profile.actions.COMPLETE_ONBOARDING(sql, userId, {
      type: "COMPLETE_ONBOARDING",
      categories: ["tech & gadgets", "tech & gadgets", "not-real", "sports betting"],
      strength: 199,
    });

    await profile.actions.TRUSTED_FRIEND(sql, userId, { type: "TRUSTED_FRIEND", id: null });
    let state = await profile.read(sql, userId);
    assert.equal(state.trustedFriendId, null);

    await profile.actions.TRUSTED_FRIEND(sql, userId, { type: "TRUSTED_FRIEND", id: "ghost" });
    state = await profile.read(sql, userId);
    assert.equal(state.trustedFriendId, null);

    const tables = await sql<{ exists: boolean }[]>`
      select to_regclass('public.snuff_friends') is not null as exists`;
    if (!tables[0]?.exists) {
      await sql`
        create table snuff_friends (
          user_id text not null,
          id text not null,
          primary key (user_id, id)
        )`;
      createdFriendsTable = true;
    }
    const existing = await sql`
      select 1 from snuff_friends where user_id = ${userId} and id = ${"sam"} limit 1`;
    if (!existing.length) {
      if (createdFriendsTable)
        await sql`insert into snuff_friends (user_id, id) values (${userId}, ${"sam"})`;
      else
        await sql`
          insert into snuff_friends (user_id, id, name, email, hue, position)
          values (${userId}, ${"sam"}, ${"Sam"}, ${"sam@example.com"}, ${"Azure"}, ${0})`;
    }
    await profile.actions.TRUSTED_FRIEND(sql, userId, { type: "TRUSTED_FRIEND", id: "sam" });

    state = await profile.read(sql, userId);
    assert.equal(state.name, "Maya");
    assert.equal(state.hue, "Violet");
    assert.equal(state.face, "wink");
    assert.equal(state.blendHue, "Ash");
    assert.equal(state.blend, 100);
    assert.equal(state.burnRate, 100);
    assert.equal(state.notificationsEnabled, false);
    assert.equal(state.onboardingComplete, true);
    assert.deepEqual(state.spendingCategories, ["tech & gadgets", "sports betting"]);
    assert.equal(state.trustedFriendId, "sam");

    await clearTrustedFriend(sql, userId, "sam");
    state = await profile.read(sql, userId);
    assert.equal(state.trustedFriendId, null);

    await profile.reset(sql, userId);
    await profile.setup(sql, userId);
    const restored = await profile.read(sql, userId);
    assert.equal(restored.name, "Jordan");
    assert.equal(restored.trustedFriendId, "sam");
  });
}
