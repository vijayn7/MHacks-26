import { shouldPause } from "./checkout-analyzer";
import { DbConnection, tables, type SubscriptionHandle } from "./module_bindings";

const fallback = { id: "seed-over-40", minAmount: 40, pauseMinutes: 15, enabled: true };
let rule = {
  id: fallback.id,
  minAmount: fallback.minAmount,
  pauseMinutes: fallback.pauseMinutes,
  enabled: fallback.enabled,
};

function pauseCopy() {
  return `Pause purchases over $${rule.minAmount} for ${rule.pauseMinutes} minutes.`;
}

let shown = false;
let pauseId = "";
let poll: ReturnType<typeof setInterval> | undefined;
let decided = false;
let live: { id: string; conn: DbConnection; sub?: SubscriptionHandle } | undefined;

const host = document.createElement("div");
const shadow = host.attachShadow({ mode: "open" });
shadow.innerHTML = `
<style>
  .overlay[hidden],
  .status[hidden] { display: none; }
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20, 20, 20, 0.45);
    font: 16px/1.4 system-ui, sans-serif;
  }
  .card {
    background: #fff;
    color: #111;
    padding: 24px;
    border-radius: 12px;
    width: min(360px, calc(100% - 32px));
  }
  .card p { margin: 0 0 16px; }
  .note, .friend { color: #444; font-size: 14px; }
  .friend { margin-top: -8px; }
  button {
    background: #111;
    color: #fff;
    border: 0;
    border-radius: 8px;
    padding: 8px 12px;
    margin: 0 8px 0 0;
    font: inherit;
    cursor: pointer;
  }
  button.ask {
    display: block;
    width: 100%;
    margin: 12px 0 0;
    background: #fff;
    color: #111;
    border: 1px solid #111;
  }
  .status {
    position: fixed;
    z-index: 2147483647;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    margin: 0;
    padding: 10px 14px;
    border-radius: 8px;
    background: #111;
    color: #fff;
    font: 16px/1.4 system-ui, sans-serif;
  }
</style>
<div class="overlay" hidden>
  <div class="card" role="dialog" aria-label="Checkout pause">
    <p class="copy">${pauseCopy()}</p>
    <p class="note">Ask a friend. NO closes this tab. YES leaves it open.</p>
    <p class="friend" hidden></p>
    <button type="button" data-action="drop">Drop</button>
    <button type="button" data-action="save">Save for later</button>
    <button type="button" data-action="continue">Continue</button>
    <button type="button" class="ask" data-action="ask">Ask my friend</button>
  </div>
</div>
<p class="status" hidden></p>
`;

const overlay = shadow.querySelector<HTMLElement>(".overlay")!;
const statusEl = shadow.querySelector<HTMLElement>(".status")!;
const friendEl = shadow.querySelector<HTMLElement>(".friend")!;
const askBtn = shadow.querySelector<HTMLButtonElement>(".ask")!;
const copyEl = shadow.querySelector<HTMLElement>(".copy")!;

async function loadRule() {
  try {
    const res = await fetch("http://localhost:8787/rules/active");
    if (!res.ok) return;
    const data = (await res.json()) as {
      id?: unknown;
      minAmount?: unknown;
      pauseMinutes?: unknown;
      enabled?: unknown;
    };
    if (typeof data.id !== "string" || data.id.length === 0) return;
    if (typeof data.minAmount !== "number" || !Number.isFinite(data.minAmount)) return;
    if (typeof data.pauseMinutes !== "number" || !Number.isFinite(data.pauseMinutes)) return;
    rule = {
      id: data.id,
      minAmount: data.minAmount,
      pauseMinutes: data.pauseMinutes,
      // Missing enabled keeps the old always-on behavior; only an explicit false skips pauses.
      enabled: data.enabled !== false,
    };
    copyEl.textContent = pauseCopy();
  } catch {
    // Keep the hardcoded seed when the API or database is unavailable.
  }
}

function post(type: string, id: string = crypto.randomUUID()): Promise<void> {
  return fetch("http://localhost:8787/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, type, ruleId: rule.id }),
  }).then(
    () => undefined,
    () => undefined,
  );
}

function stopLive() {
  const current = live;
  live = undefined;
  if (!current) return;
  try {
    if (current.sub?.isActive()) current.sub.unsubscribe();
  } catch {
    /* subscription already ended */
  }
  try {
    current.conn.disconnect();
  } catch {
    /* already disconnected */
  }
}

function openCard() {
  if (!overlay.hidden) return;
  stopLive();
  decided = false;
  pauseId = crypto.randomUUID();
  friendEl.hidden = true;
  friendEl.textContent = "";
  askBtn.disabled = false;
  askBtn.textContent = "Ask my friend";
  post("checkout_detected", `${pauseId}:checkout_detected`);
  overlay.hidden = false;
  post("pause_started");
}

function closeCard(type: string, status?: string): Promise<void> {
  if (poll) clearInterval(poll);
  poll = undefined;
  stopLive();
  overlay.hidden = true;
  const writes = [post(type)];
  if (pauseId) writes.push(post("pause_resolved", `${pauseId}:pause_resolved`));
  statusEl.hidden = !status;
  if (status) statusEl.textContent = status;
  return Promise.all(writes).then(() => undefined);
}

function closeTab() {
  const send = (globalThis as { chrome?: { runtime?: { sendMessage: (message: string) => void } } }).chrome
    ?.runtime?.sendMessage;
  send?.("close-tab");
}

let applying = false;

function applyDecision(status: "approved" | "rejected") {
  if (applying || overlay.hidden) return;
  applying = true;
  if (poll) clearInterval(poll);
  if (status === "approved") {
    void closeCard("continue_selected", "Friend approved");
    return;
  }
  void closeCard("purchase_dropped", "Friend rejected").then(closeTab);
}

function showFriendDecision(status: "approved" | "rejected") {
  if (decided || overlay.hidden) return;
  decided = true;
  friendEl.hidden = false;
  friendEl.textContent = status === "approved" ? "Friend approved this purchase." : "Friend rejected this purchase.";
  if (poll) clearInterval(poll);
  poll = undefined;
  setTimeout(() => applyDecision(status), 1500);
}

async function pullReply() {
  const res = await fetch(`http://localhost:8787/check-in?id=${encodeURIComponent(pauseId)}`);
  if (!res.ok) return;
  const row = (await res.json()) as { status?: string; reply?: string | null };
  if (row.status !== "approved" && row.status !== "rejected") return;
  showFriendDecision(row.status);
}

function onPauseRow(id: string, row: { sessionId: string; state: string }) {
  if (live?.id !== id || row.sessionId !== id || overlay.hidden) return;
  if (row.state === "sent") return;
  if (row.state === "approved" || row.state === "rejected") showFriendDecision(row.state);
}

async function subscribeLive() {
  const id = pauseId;
  let res: Response;
  try {
    res = await fetch("http://localhost:8787/spacetime");
  } catch {
    return;
  }
  if (!res.ok || pauseId !== id) return;
  const config = (await res.json()) as { uri?: string; database?: string };
  if (!config.uri || !config.database || pauseId !== id) return;
  const conn = DbConnection.builder()
    .withUri(config.uri)
    .withDatabaseName(config.database)
    .onConnect((ctx) => {
      if (live?.conn !== conn || live.id !== id) {
        ctx.disconnect();
        return;
      }
      ctx.db.pauseStatus.onInsert((_event, row) => onPauseRow(id, row));
      ctx.db.pauseStatus.onUpdate((_event, _old, row) => onPauseRow(id, row));
      live.sub = ctx
        .subscriptionBuilder()
        .onApplied((applied) => {
          for (const row of applied.db.pauseStatus.iter()) onPauseRow(id, row);
        })
        .subscribe(tables.pauseStatus.where((row) => row.sessionId.eq(id)));
    })
    .onConnectError(() => {})
    .build();
  if (pauseId !== id) {
    conn.disconnect();
    return;
  }
  live = { id, conn };
}

async function askFriend() {
  if (!pauseId || askBtn.disabled) return;
  askBtn.disabled = true;
  askBtn.textContent = "Asking…";
  try {
    const product = document.querySelector("[data-name]")?.getAttribute("data-name") ?? "Purchase";
    const amount = Number(document.querySelector("[data-total]")?.getAttribute("data-total"));
    const res = await fetch("http://localhost:8787/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pauseId, ruleId: rule.id, product, amount }),
    });
    const row = (await res.json()) as { waiting?: boolean };
    if (!res.ok) throw new Error(String(res.status));
    askBtn.textContent = "Asked";
    friendEl.hidden = false;
    friendEl.textContent = row.waiting
      ? "A text is already with your friend. Reply YES or NO on that thread."
      : "Text sent. Waiting for YES or NO.";
    if (poll) clearInterval(poll);
    poll = setInterval(() => {
      void pullReply();
    }, 2000);
    void subscribeLive();
  } catch {
    askBtn.disabled = false;
    askBtn.textContent = "Ask my friend";
    statusEl.hidden = false;
    statusEl.textContent = "Could not text your friend.";
  }
}

function saveItem() {
  const name = document.querySelector("[data-name]")?.getAttribute("data-name") ?? "Purchase";
  const amount = Number(document.querySelector("[data-total]")?.getAttribute("data-total"));
  return fetch("http://localhost:8787/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), ruleId: rule.id, name, amount }),
  }).catch(() => {});
}

shadow.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const action = target.closest("button")?.getAttribute("data-action");
  if (action === "ask") void askFriend();
  else if (action === "drop") closeCard("purchase_dropped", "Purchase dropped");
  else if (action === "save") {
    void saveItem();
    closeCard("saved_for_later", "Saved for later");
  }
  else if (action === "continue") void closeCard("continue_selected");
});

function markedTotal(): number | undefined {
  const marked = document.querySelector("[data-total]");
  if (!marked?.hasAttribute("data-total")) return undefined;
  const amount = Number(marked.getAttribute("data-total"));
  return Number.isFinite(amount) ? amount : undefined;
}

function visibleLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isBuyPage(): boolean {
  if (!rule.enabled) return false;
  return shouldPause(visibleLines(document.body?.innerText ?? ""), markedTotal(), rule.minAmount);
}

// ponytail: whole-document observer until the first buy page. Drop it if the scan gets janky.
function watchBuyPage() {
  const look = () => {
    if (shown || !isBuyPage()) return;
    shown = true;
    observer.disconnect();
    openCard();
  };
  const observer = new MutationObserver(look);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  look();
}

document.documentElement.appendChild(host);
void loadRule().then(watchBuyPage);
