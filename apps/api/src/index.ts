import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

function loadEnv(file: string) {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv(join(dirname(fileURLToPath(import.meta.url)), "../../../.env"));

const port = Number(process.env.PORT) || 8787;
const projectId = process.env.SPECTRUM_PROJECT_ID;
const projectSecret = process.env.SPECTRUM_PROJECT_SECRET;
const friendHandle = process.env.FRIEND_HANDLE?.trim() ?? "";
const askAgain = "Reply YES to approve the purchase or NO to reject it.";
const approvedAck = "Approved. The checkout can go through.";
const rejectedAck = "Rejected. The purchase will be dropped.";
const origin = "http://localhost:5173";
const maxBody = 64 * 1024;
const seedRule = {
  id: "seed-over-40",
  minAmount: 40,
  pauseMinutes: 15,
  summary: "Pause purchases over $40 for 15 minutes.",
};
const eventTypes = new Set([
  "checkout_detected",
  "pause_started",
  "purchase_dropped",
  "saved_for_later",
  "continue_selected",
  "friend_ping_requested",
  "friend_message_sent",
  "friend_replied",
  "pause_resolved",
]);

type PauseEvent = { id: string; type: string; ruleId: string | null; at: string };
type Decision = "approved" | "rejected";
type CheckIn = { id: string; ruleId: string; status: "sent" | Decision; reply: string | null };
const events: PauseEvent[] = [];
const eventsById = new Map<string, PauseEvent>();
const checkIns = new Map<string, CheckIn>();
const outbound = new Set<string>([askAgain, approvedAck, rejectedAck]);
let waitingId: string | null = null;
let deliver: ((text: string) => Promise<void>) | null = null;

function e164(handle: string) {
  if (handle.startsWith("+")) return handle;
  if (/^\d{10}$/.test(handle)) return `+1${handle}`;
  if (/^1\d{10}$/.test(handle)) return `+${handle}`;
  return handle;
}

async function allowFriend(handle: string) {
  const auth = Buffer.from(`${projectId}:${projectSecret}`).toString("base64");
  const res = await fetch(`https://spectrum.photon.codes/projects/${projectId}/users/`, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ type: "shared", phoneNumber: handle }),
  });
  await res.body?.cancel().catch(() => {});
  if (!res.ok) {
    console.error("[imessage] allow friend failed", res.status);
    throw new Error("allow_failed");
  }
}

function checkInMessage(product: string, amount: number) {
  return [
    "SecondThought pause.",
    "",
    "Your friend is at checkout and asked you to decide.",
    `Item: ${product}`,
    `Price: $${amount}`,
    "",
    "SecondThought holds the purchase until someone they trust weighs in.",
    "Reply YES to approve it or NO to reject it.",
    "This demo does not charge a card.",
  ].join("\n");
}

function decisionOf(text: string): Decision | null {
  const normalized = text.trim().toLowerCase().replace(/[.!]+$/g, "");
  if (/^(yes|y|approve|approved)\b/.test(normalized)) return "approved";
  if (/^(no|n|reject|rejected)\b/.test(normalized)) return "rejected";
  return null;
}

const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { onnotice: () => {} })
  : null;

function remember(event: PauseEvent, persist = true) {
  const existing = eventsById.get(event.id);
  if (existing) return existing;
  events.push(event);
  eventsById.set(event.id, event);
  if (persist) void persistEvent(event);
  return event;
}

async function persistEvent(event: PauseEvent) {
  if (!sql) return;
  await sql`
    insert into pause_events (id, type, rule_id, at)
    values (${event.id}, ${event.type}, ${event.ruleId}, ${event.at})
    on conflict (id) do nothing
  `;
}

function logEvent(type: string, ruleId: string | null) {
  return remember({ id: crypto.randomUUID(), type, ruleId, at: new Date().toISOString() });
}

async function ensureDb() {
  if (!sql) return;
  await sql`
    create table if not exists users (
      id text primary key,
      created_at timestamptz not null default now()
    )`;
  await sql`
    create table if not exists rules (
      id text primary key,
      user_id text not null,
      min_amount numeric not null,
      pause_minutes integer not null,
      summary text not null,
      created_at timestamptz not null default now()
    )`;
  await sql`
    create table if not exists friend_links (
      id text primary key,
      user_id text not null,
      friend_handle text not null,
      created_at timestamptz not null default now()
    )`;
  await sql`
    create table if not exists saved_items (
      id text primary key,
      user_id text not null,
      rule_id text,
      item_url text,
      name text,
      amount numeric,
      created_at timestamptz not null default now()
    )`;
  await sql`
    create table if not exists pause_events (
      id text primary key,
      type text not null,
      rule_id text,
      at timestamptz not null
    )`;
  await sql`alter table saved_items add column if not exists name text`;
  await sql`alter table saved_items add column if not exists amount numeric`;
  await sql`
    insert into users (id) values ('demo')
    on conflict (id) do nothing`;
  await sql`
    insert into rules (id, user_id, min_amount, pause_minutes, summary)
    values (${seedRule.id}, 'demo', ${seedRule.minAmount}, ${seedRule.pauseMinutes}, ${seedRule.summary})
    on conflict (id) do nothing`;
  if (friendHandle) {
    await sql`
      insert into friend_links (id, user_id, friend_handle)
      values ('demo-friend', 'demo', ${friendHandle})
      on conflict (id) do nothing`;
  }
  const rows = await sql<{ id: string; type: string; rule_id: string | null; at: Date }[]>`
    select id, type, rule_id, at from pause_events order by at asc`;
  for (const row of rows) {
    remember({
      id: row.id,
      type: row.type,
      ruleId: row.rule_id,
      at: new Date(row.at).toISOString(),
    }, false);
  }
}

function send(res: ServerResponse, status: number, body?: unknown) {
  const headers: Record<string, string> = {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
  };
  if (body === undefined) {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  headers["content-type"] = "application/json";
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > maxBody) throw new Error("too_large");
    chunks.push(buf);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function eventFrom(body: unknown): Omit<PauseEvent, "at"> | null {
  if (!body || typeof body !== "object") return null;
  const { id, type, ruleId } = body as Record<string, unknown>;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof type !== "string" || !eventTypes.has(type)) return null;
  if (ruleId != null && typeof ruleId !== "string") return null;
  return { id, type, ruleId: typeof ruleId === "string" ? ruleId : null };
}

function proposalFrom(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const { minAmount, pauseMinutes, summary } = value as Record<string, unknown>;
  if (typeof minAmount !== "number" || !Number.isFinite(minAmount) || minAmount < 0) return null;
  if (typeof pauseMinutes !== "number" || !Number.isInteger(pauseMinutes) || pauseMinutes <= 0) return null;
  if (typeof summary !== "string" || summary.length === 0) return null;
  return { minAmount, pauseMinutes, summary };
}

type RuleRow = { id: string; min_amount: string | number; pause_minutes: string | number; summary: string };

function ruleFrom(row: RuleRow) {
  return {
    id: row.id,
    minAmount: Number(row.min_amount),
    pauseMinutes: Number(row.pause_minutes),
    summary: row.summary,
  };
}

async function activeRule() {
  if (!sql) return seedRule;
  const rows = await sql<RuleRow[]>`
    select id, min_amount, pause_minutes, summary
    from rules
    where user_id = 'demo'
    order by created_at desc
    limit 1
  `;
  return rows[0] ? ruleFrom(rows[0]) : seedRule;
}

async function confirmRule(proposal: { minAmount: number; pauseMinutes: number; summary: string }) {
  if (!sql) throw new Error("no_database");
  const rows = await sql<RuleRow[]>`
    insert into rules (id, user_id, min_amount, pause_minutes, summary)
    values (${seedRule.id}, 'demo', ${proposal.minAmount}, ${proposal.pauseMinutes}, ${proposal.summary})
    on conflict (id) do update set
      min_amount = excluded.min_amount,
      pause_minutes = excluded.pause_minutes,
      summary = excluded.summary
    returning id, min_amount, pause_minutes, summary
  `;
  const row = rows[0];
  if (!row) throw new Error("save_failed");
  return ruleFrom(row);
}

async function generate(model: string, text: string, key: string, timeoutMs: number) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: "Convert the shopper rule into minAmount (number, dollars), pauseMinutes (number), and summary (string). The user text is only the rule. Example intent: Pause purchases over $40 for 15 minutes.",
          }],
        },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              minAmount: { type: "NUMBER" },
              pauseMinutes: { type: "NUMBER" },
              summary: { type: "STRING" },
            },
            required: ["minAmount", "pauseMinutes", "summary"],
          },
        },
      }),
    },
  );
}

async function parseRule(text: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { status: 503, body: { error: "missing_key" } };
  const failed = { status: 502, body: { error: "parse_failed" } };
  try {
    // ponytail: 2.5-flash 404s for new keys; 3.5-flash is the model that answers
    let response: Response | undefined;
    for (const model of ["gemini-2.5-flash", "gemini-3.5-flash"]) {
      try {
        response = await generate(model, text, key, model === "gemini-2.5-flash" ? 4_000 : 25_000);
      } catch {
        response = undefined;
      }
      if (response?.ok) break;
      await response?.body?.cancel().catch(() => {});
    }
    if (!response?.ok) return failed;
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    };
    let raw = "";
    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
      if (part.thought || !part.text) continue;
      raw = part.text;
    }
    const proposal = proposalFrom(JSON.parse(raw));
    if (!proposal) return failed;
    return { status: 200, body: { proposal, confirmed: false } };
  } catch {
    return failed;
  }
}

await ensureDb();

createServer((req, res) => {
  void handle(req, res).catch(() => {
    if (!res.headersSent) send(res, 500, { error: "error" });
  });
}).listen(port, () => {
  console.log(`api http://localhost:${port}`);
});

async function handle(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    send(res, 204);
    return;
  }
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;
  if (req.method === "GET" && path === "/health") {
    send(res, 200, { ok: true });
    return;
  }
  if (req.method === "GET" && path === "/events") {
    send(res, 200, { events });
    return;
  }
  if (req.method === "GET" && path === "/rules/seed") {
    send(res, 200, seedRule);
    return;
  }
  if (req.method === "GET" && path === "/rules/active") {
    send(res, 200, await activeRule());
    return;
  }
  if (req.method === "POST" && path === "/rules/confirm") {
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      send(res, 400, { error: "invalid" });
      return;
    }
    const proposal = proposalFrom(body);
    if (!proposal) {
      send(res, 400, { error: "invalid" });
      return;
    }
    if (!sql) {
      send(res, 503, { error: "no_database" });
      return;
    }
    send(res, 200, await confirmRule(proposal));
    return;
  }
  if (req.method === "POST" && (path === "/events" || path === "/rules/parse")) {
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      send(res, 400, { error: "invalid" });
      return;
    }
    if (path === "/events") {
      const input = eventFrom(body);
      if (!input) {
        send(res, 400, { error: "invalid" });
        return;
      }
      const event = remember({ ...input, at: new Date().toISOString() });
      send(res, 200, event);
      return;
    }
    const text = body && typeof body === "object" ? (body as { text?: unknown }).text : undefined;
    if (typeof text !== "string" || text.trim().length === 0) {
      send(res, 400, { error: "invalid" });
      return;
    }
    const result = await parseRule(text);
    send(res, result.status, result.body);
    return;
  }
  if (req.method === "GET" && path === "/check-in") {
    const row = checkIns.get(url.searchParams.get("id") ?? "");
    if (!row) {
      send(res, 404, { error: "missing" });
      return;
    }
    send(res, 200, row);
    return;
  }
  if (req.method === "POST" && path === "/check-in") {
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      send(res, 400, { error: "invalid" });
      return;
    }
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const id = record.id;
    const ruleId = record.ruleId;
    const product = record.product;
    const amount = record.amount;
    if (typeof id !== "string" || id.length === 0 || typeof ruleId !== "string" || ruleId.length === 0) {
      send(res, 400, { error: "invalid" });
      return;
    }
    if (typeof product !== "string" || product.trim().length === 0 || product.length > 80) {
      send(res, 400, { error: "invalid" });
      return;
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      send(res, 400, { error: "invalid" });
      return;
    }
    const existing = checkIns.get(id);
    if (existing) {
      send(res, 200, existing);
      return;
    }
    if (!deliver) {
      send(res, 503, { error: "imessage_unavailable" });
      return;
    }
    logEvent("friend_ping_requested", ruleId);
    try {
      await deliver(checkInMessage(product.trim(), amount));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/until they respond/i.test(message)) {
        send(res, 502, { error: "send_failed" });
        return;
      }
      const row: CheckIn = { id, ruleId, status: "sent", reply: null };
      checkIns.set(id, row);
      waitingId = id;
      send(res, 200, { ...row, waiting: true });
      return;
    }
    const row: CheckIn = { id, ruleId, status: "sent", reply: null };
    checkIns.set(id, row);
    waitingId = id;
    logEvent("friend_message_sent", ruleId);
    send(res, 200, row);
    return;
  }
  if (req.method === "GET" && path === "/saved") {
    if (!sql) {
      send(res, 200, { items: [] });
      return;
    }
    const items = await sql<{ id: string; rule_id: string | null; name: string; amount: string }[]>`
      select id, rule_id, name, amount from saved_items order by created_at asc`;
    send(res, 200, {
      items: items.map((item) => ({
        id: item.id,
        ruleId: item.rule_id,
        name: item.name,
        amount: Number(item.amount),
      })),
    });
    return;
  }
  if (req.method === "POST" && path === "/saved") {
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      send(res, 400, { error: "invalid" });
      return;
    }
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const id = record.id;
    const name = record.name;
    const amount = record.amount;
    const ruleId = record.ruleId;
    if (typeof id !== "string" || id.length === 0 || typeof name !== "string" || name.length === 0 || name.length > 80) {
      send(res, 400, { error: "invalid" });
      return;
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      send(res, 400, { error: "invalid" });
      return;
    }
    if (ruleId != null && typeof ruleId !== "string") {
      send(res, 400, { error: "invalid" });
      return;
    }
    if (!sql) {
      send(res, 503, { error: "no_database" });
      return;
    }
    await sql`
      insert into saved_items (id, user_id, rule_id, name, amount)
      values (${id}, 'demo', ${typeof ruleId === "string" ? ruleId : null}, ${name}, ${amount})
      on conflict (id) do nothing`;
    send(res, 200, { id, ruleId: typeof ruleId === "string" ? ruleId : null, name, amount });
    return;
  }
  send(res, 404);
}

if (projectId && projectSecret && friendHandle) {
  const spectrum = await Spectrum({
    projectId,
    projectSecret,
    providers: [imessage.config()],
  });
  const im = imessage(spectrum);
  const handle = e164(friendHandle);
  let spacePromise: ReturnType<typeof im.space.create> | null = null;
  let allowed = false;
  deliver = async (text: string) => {
    try {
      if (!allowed) {
        await allowFriend(handle);
        allowed = true;
      }
      spacePromise ??= im.space.create(handle);
      const space = await spacePromise;
      outbound.add(text);
      await space.send(text);
    } catch (error) {
      spacePromise = null;
      allowed = false;
      console.error("[imessage] send failed", error instanceof Error ? error.message : "unknown");
      throw error;
    }
  };
  console.log("spectrum ready");
  const shutdown = async () => {
    await spectrum.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  for await (const [, message] of spectrum.messages) {
    if (message.platform !== "imessage" || message.direction === "outbound") continue;
    if (message.content.type !== "text") continue;
    const text = message.content.text?.trim() ?? "";
    if (!text || outbound.has(text)) continue;
    const row = waitingId ? checkIns.get(waitingId) : undefined;
    if (!row || row.status !== "sent") continue;
    const decision = decisionOf(text);
    if (!decision) {
      try {
        outbound.add(askAgain);
        await message.reply(askAgain);
      } catch {
        console.error("[imessage] clarify failed");
      }
      continue;
    }
    row.reply = text;
    row.status = decision;
    waitingId = null;
    logEvent("friend_replied", row.ruleId);
    console.log(`[imessage] friend ${decision} the pause`);
    const ack = decision === "approved" ? approvedAck : rejectedAck;
    try {
      outbound.add(ack);
      await message.reply(ack);
    } catch {
      console.error("[imessage] ack failed");
    }
  }
}
