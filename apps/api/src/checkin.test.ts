import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachFriendReply,
  buildCheckInMessage,
  inboundFriendText,
  thankYouAck,
  type CheckInRow,
} from "./checkin.ts";

describe("buildCheckInMessage", () => {
  it("keeps a generic request with no item or price when share is absent", () => {
    const text = buildCheckInMessage("Alex");
    assert.match(text, /snuff check-in: Alex/);
    assert.match(text, /you're not deciding for them/);
    assert.doesNotMatch(text, /\$/);
    assert.doesNotMatch(text, /whey|headphones|shared/i);
  });

  it("falls back to 'your friend' without a shopper name", () => {
    assert.match(buildCheckInMessage(null), /snuff check-in: your friend/);
    assert.match(buildCheckInMessage("   "), /snuff check-in: your friend/);
  });

  it("includes shared item and price only when provided", () => {
    const text = buildCheckInMessage("Alex", { name: "studio headphones", amount: 149 });
    assert.match(text, /they shared: studio headphones · \$149/);
    assert.match(text, /you're not deciding for them/);
  });
});

describe("inboundFriendText", () => {
  const outbound = new Set([thankYouAck, "snuff check-in: your friend is taking a pause"]);

  it("ignores read receipts and non-text content", () => {
    assert.equal(
      inboundFriendText({ content: { type: "read_receipt" } }, outbound),
      null,
    );
    assert.equal(
      inboundFriendText({ content: { type: "typing_indicator" } }, outbound),
      null,
    );
  });

  it("ignores outbound direction and our own outbound text", () => {
    assert.equal(
      inboundFriendText(
        { direction: "outbound", content: { type: "text", text: "hi" } },
        outbound,
      ),
      null,
    );
    assert.equal(
      inboundFriendText(
        { content: { type: "text", text: thankYouAck } },
        outbound,
      ),
      null,
    );
  });

  it("returns trimmed inbound friend text", () => {
    assert.equal(
      inboundFriendText({ content: { type: "text", text: "  you got this  " } }, outbound),
      "you got this",
    );
  });
});

describe("attachFriendReply", () => {
  it("sets status replied once and keeps a later reply from overwriting", () => {
    const open: CheckInRow = { id: "n1", ruleId: null, status: "sent", reply: null };
    const first = attachFriendReply(open, "take a breath");
    assert.deepEqual(first, {
      id: "n1",
      ruleId: null,
      status: "replied",
      reply: "take a breath",
    });
    assert.equal(attachFriendReply(first!, "second thought"), null);
  });
});
