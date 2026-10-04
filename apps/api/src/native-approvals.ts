import { randomBytes, timingSafeEqual } from "node:crypto";

// The native demo uses one server-configured friend and a separate pairing key.
// No phone number, shopping details or Photon credentials come from the app.
export type NativeRequest = {
  id: string; pauseId: string; source: "ios"; createdAt: number; expiresAt: number;
};
export type NativeRow = NativeRequest & {
  code: string; friend: string; status: "sending" | "sent" | "approved" | "rejected" | "send_failed";
  spaceId?: string; messageId?: string; replyId?: string;
};
export interface NativeRepository {
  get(id: string): Promise<NativeRow | undefined>;
  byCode(code: string): Promise<NativeRow | undefined>;
  insert(row: NativeRow): Promise<boolean>;
  update(row: NativeRow, previous: NativeRow["status"]): Promise<boolean>;
}
export class MemoryNativeRepository implements NativeRepository {
  private rows = new Map<string, NativeRow>();
  async get(id: string) { const row = this.rows.get(id); return row ? { ...row } : undefined; }
  async byCode(code: string) { return [...this.rows.values()].find(row => row.code === code); }
  async insert(row: NativeRow) {
    if (this.rows.has(row.id)) return false;
    this.rows.set(row.id, { ...row }); return true;
  }
  async update(row: NativeRow, previous: NativeRow["status"]) {
    if (this.rows.get(row.id)?.status !== previous) return false;
    this.rows.set(row.id, { ...row }); return true;
  }
}
export class NativeApprovalError extends Error {
  constructor(readonly httpStatus: number, readonly code: string) { super(code); }
}
export function authorizedNative(header: string | undefined, token: string) {
  if (token.length < 32 || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7)); const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function nativeRequest(body: unknown): NativeRequest {
  const row = body as Partial<NativeRequest> | null;
  if (!row || row.source !== "ios" || typeof row.id !== "string" || !uuid.test(row.id)
    || typeof row.pauseId !== "string" || !uuid.test(row.pauseId)
    || typeof row.createdAt !== "number" || !Number.isFinite(row.createdAt)
    || typeof row.expiresAt !== "number" || !Number.isFinite(row.expiresAt)
    || row.expiresAt <= row.createdAt || row.expiresAt - row.createdAt > 15 * 60_000) {
    throw new NativeApprovalError(400, "invalid");
  }
  return { id: row.id, pauseId: row.pauseId, source: "ios", createdAt: row.createdAt, expiresAt: row.expiresAt };
}
export function nativeReceipt(row: NativeRow) {
  // Provider identities and the reply code never leave the server via the API.
  return { id: row.id, pauseId: row.pauseId, source: row.source, status: row.status };
}
export function nativePrompt(code: string) {
  return `Pact checkout pause. Your friend wants to continue after taking a breath.\n\nReply CONFIRM ${code} to approve, or NO ${code} to keep the pause. This request expires in 15 minutes.\n\nNo item, price or screen content is shared. Approval only releases Pact's pause; it does not place an order.`;
}
export type Delivery = { spaceId: string; messageId: string };
export class NativeApprovals {
  constructor(private repo: NativeRepository, private friend: string, private clock = Date.now) {}

  async submit(input: NativeRequest, deliver: ((text: string) => Promise<Delivery>) | null): Promise<ReturnType<typeof nativeReceipt>> {
    const existing = await this.repo.get(input.id);
    if (existing) {
      if (existing.pauseId !== input.pauseId || existing.createdAt !== input.createdAt || existing.expiresAt !== input.expiresAt) {
        throw new NativeApprovalError(409, "conflicting_request");
      }
      return this.checked(existing);
    }
    if (input.expiresAt <= this.clock() || input.createdAt > this.clock() + 60_000) throw new NativeApprovalError(410, "expired_or_clock_skew");
    if (!deliver || !this.friend) throw new NativeApprovalError(503, "imessage_unavailable");
    const row: NativeRow = { ...input, friend: this.friend, code: randomBytes(8).toString("hex").toUpperCase(), status: "sending" };
    // Reserve durably before sending. Overlapping app / broadcast retries cannot
    // send another prompt, including after a server restart or uncertain send.
    if (!await this.repo.insert(row)) return this.submit(input, deliver);
    try {
      const delivered = await deliver(nativePrompt(row.code));
      if (!delivered.messageId || !delivered.spaceId) throw new Error("missing_receipt");
      if (!await this.repo.update({ ...row, ...delivered, status: "sent" }, "sending")) throw new Error("receipt_not_saved");
    } catch {
      await this.repo.update({ ...row, status: "send_failed" }, "sending");
      throw new NativeApprovalError(502, "send_failed");
    }
    return this.checked((await this.repo.get(row.id))!);
  }

  async status(id: string) {
    const row = await this.repo.get(id);
    if (!row) throw new NativeApprovalError(404, "missing");
    return this.checked(row);
  }

  private checked(row: NativeRow) {
    if (row.expiresAt <= this.clock()) throw new NativeApprovalError(410, "expired");
    if (row.status === "sending") throw new NativeApprovalError(503, "sending");
    if (row.status === "send_failed") throw new NativeApprovalError(502, "send_failed");
    return nativeReceipt(row);
  }

  async receive(message: { text: string; sender: string; spaceId: string; id: string; timestamp: number }) {
    // Exact commands with an unguessable request code; an old bare YES or a
    // simultaneous browser reply cannot approve a native pause.
    const match = /^(CONFIRM|YES|NO|DECLINE) ([A-F0-9]{16})$/i.exec(message.text.trim());
    if (!match) return null;
    const row = await this.repo.byCode(match[2]!.toUpperCase());
    if (!row || row.status !== "sent" || row.expiresAt <= this.clock()
      || message.sender !== row.friend || message.spaceId !== row.spaceId
      || !Number.isFinite(message.timestamp) || message.timestamp < row.createdAt
      || message.timestamp > this.clock() + 60_000 || !message.id) return null;
    const status = /^(CONFIRM|YES)$/i.test(match[1]!) ? "approved" : "rejected";
    if (!await this.repo.update({ ...row, status, replyId: message.id }, "sent")) return null;
    return { id: row.id, status };
  }
}
