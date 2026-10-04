export type ShareDetails = { name?: string; amount?: number };

export type CheckInStatus = "sent" | "replied";

export type CheckInRow = {
  id: string;
  ruleId: string | null;
  status: CheckInStatus;
  reply: string | null;
};

export const thankYouAck =
  "thanks — they still choose for themselves. your note is with them.";

/** Warm generic iMessage. Omits item/price unless the shopper shared them. */
export function buildCheckInMessage(
  shopperName?: string | null,
  share?: ShareDetails | null,
): string {
  const who = shopperName?.trim() || "your friend";
  let text =
    `snuff check-in: ${who} is taking a pause before a purchase and asked for a little support. ` +
    `reply with anything encouraging. you're not deciding for them.`;
  if (share) {
    const bits: string[] = [];
    if (typeof share.name === "string" && share.name.trim()) bits.push(share.name.trim());
    if (typeof share.amount === "number" && Number.isFinite(share.amount)) {
      bits.push(`$${share.amount}`);
    }
    if (bits.length) text += ` they shared: ${bits.join(" · ")}.`;
  }
  return text;
}

/** Extract inbound friend text; ignore receipts, non-text, and our own outbound copy. */
export function inboundFriendText(
  message: {
    direction?: string;
    content: { type: string; text?: string | null };
  },
  outbound: ReadonlySet<string>,
): string | null {
  if (message.direction === "outbound") return null;
  if (message.content.type !== "text") return null;
  const text = message.content.text?.trim() ?? "";
  if (!text || outbound.has(text)) return null;
  return text;
}

/** Attach a supportive reply once. Returns null if already replied. */
export function attachFriendReply(row: CheckInRow, text: string): CheckInRow | null {
  if (row.status !== "sent") return null;
  const reply = text.trim();
  if (!reply) return null;
  return { ...row, status: "replied", reply };
}

export function parseShare(value: unknown): ShareDetails | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const share: ShareDetails = {};
  if (typeof record.name === "string" && record.name.trim()) {
    share.name = record.name.trim().slice(0, 80);
  }
  if (typeof record.amount === "number" && Number.isFinite(record.amount) && record.amount >= 0) {
    share.amount = record.amount;
  }
  return share.name !== undefined || share.amount !== undefined ? share : undefined;
}
