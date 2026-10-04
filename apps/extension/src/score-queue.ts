export type ScoreEventInput = { id: string; pauseId: string; type: string; ruleId: string; source: "web"; amountCents?: number; at: string };
export type ScoreReceipt = { eventId: string; score: number; delta: number; amountCents: number };
export const scoreQueuePrefix = "pact:score-event:v1:";

// One key per event avoids lost updates between store tabs. Stable IDs also
// make a crash after the server commits safe to replay. No product text stored.
export class ScoreQueue {
  private inFlight?: Promise<ScoreReceipt[]>;
  constructor(private storage: Storage, private deliver: (event: ScoreEventInput) => Promise<ScoreReceipt>) {}
  enqueue(event: ScoreEventInput) { this.storage.setItem(scoreQueuePrefix + event.id, JSON.stringify(event)); }
  flush(): Promise<ScoreReceipt[]> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.drain().finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  }
  private async drain() {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i); if (key?.startsWith(scoreQueuePrefix)) keys.push(key);
    }
    const events = keys.map(key => ({ key, event: JSON.parse(this.storage.getItem(key)!) as ScoreEventInput }))
      .sort((a, b) => a.event.at.localeCompare(b.event.at));
    const receipts: ScoreReceipt[] = [];
    for (const { key, event } of events) {
      const receipt = await this.deliver(event);
      if (receipt.eventId !== event.id || !Number.isSafeInteger(receipt.score)) throw new Error("invalid_score_receipt");
      this.storage.removeItem(key);
      receipts.push(receipt);
    }
    return receipts;
  }
}
