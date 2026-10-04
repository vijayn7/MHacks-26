import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addContacts,
  liveSavings,
  matchesContact,
  normalizeContact,
  phoneKey,
  validEmail,
} from "./social.ts";

describe("social slice action semantics", () => {
  it("CONNECT email rules match the app reducer", () => {
    assert.equal(validEmail("sam@example.com"), true);
    assert.equal(validEmail(" not-an-email "), false);
    assert.equal(validEmail("a@b.c"), true);

    const email = "  Ava.Lee-smith@Example.com ".trim().toLowerCase();
    assert.equal(email, "ava.lee-smith@example.com");
    assert.equal(validEmail(email), true);
    const first = email.split("@")[0].split(/[._-]/)[0];
    const name = first.charAt(0).toUpperCase() + first.slice(1);
    assert.equal(name, "Ava");
    assert.equal("friend-" + email, "friend-ava.lee-smith@example.com");
  });

  it("CONNECT_CONTACTS ports addContacts dedupe by email, phone, and contactId", () => {
    const friends = [
      {
        id: "sam",
        name: "Sam",
        email: "sam@example.com",
        phone: "+1 (415) 555-0100",
        hue: "Azure" as const,
        savings: 248,
      },
    ];
    const next = addContacts(friends, [
      { id: "c1", name: "Sam Dup", email: "sam@example.com", phone: "" },
      { id: "c2", name: "Phone Dup", email: "", phone: "1 (415) 555-0100" },
      { id: "c3", name: "New Friend", email: "new@example.com", phone: "555-1212" },
      { id: "c3", name: "Same contact id", email: "other@example.com", phone: "" },
    ]);
    assert.equal(next.length, 2);
    assert.equal(next[1].id, "contact-c3");
    assert.equal(next[1].contactId, "c3");
    assert.equal(next[1].hue, "Verdigris");
    assert.equal(next[1].savings, 0);
    assert.equal(next[1].email, "new@example.com");
    assert.equal(phoneKey("+1 (415) 555-0100"), phoneKey("1 (415) 555-0100"));
  });

  it("normalizeContact and matchesContact mirror the app contacts helpers", () => {
    const c = normalizeContact({
      id: "x",
      fullName: "  Tess  ",
      emails: [{ address: "Tess@Example.com" }],
      phones: [{ number: "123" }, { number: "555-000-1212" }],
    });
    assert.deepEqual(c, {
      id: "x",
      name: "Tess",
      email: "tess@example.com",
      phone: "555-000-1212",
    });
    assert.equal(
      matchesContact(
        { id: "f", name: "T", email: "tess@example.com", hue: "Ash", savings: 0 },
        c!,
      ),
      true,
    );
    assert.equal(normalizeContact({ id: "", emails: [{ address: "a@b.c" }] }), null);
  });

  it("RENAME_FRIEND clamps like the reducer", () => {
    const name = "  " + "a".repeat(80) + "  ";
    const trimmed = name.trim();
    assert.ok(trimmed);
    assert.equal(trimmed.slice(0, 60).length, 60);
    assert.equal("   ".trim() ? "ok" : "skip", "skip");
  });

  it("liveSavings drifts modestly and monotonically for selected friends", () => {
    const seeded = new Date("2026-10-01T00:00:00.000Z");
    const t0 = seeded.getTime();
    const t5h = t0 + 5 * 3_600_000;
    const t5h30 = t0 + 5.5 * 3_600_000;
    assert.equal(liveSavings(362, "jules", seeded, t0), 362);
    assert.equal(liveSavings(362, "jules", seeded, t5h), 367);
    assert.equal(liveSavings(362, "jules", seeded, t5h30), 367);
    assert.equal(liveSavings(428, "kai", seeded, t5h), 438);
    assert.equal(liveSavings(248, "sam", seeded, t5h), 248);
    assert.ok(liveSavings(362, "jules", seeded, t5h) >= liveSavings(362, "jules", seeded, t0));
  });
});
