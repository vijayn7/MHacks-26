import type { IncomingMessage, ServerResponse } from "node:http";
import type { Slice, Sql } from "./slice";
import { profile } from "./profile";
import { social } from "./social";
import { pauses } from "./pauses";
import { plan } from "./plan";
import { wearable } from "./wearable";

export const slices: Slice[] = [profile, social, pauses, plan, wearable];
export const userId = "demo";

type Send = (res: ServerResponse, status: number, body?: unknown) => void;
type ReadJson = (req: IncomingMessage) => Promise<unknown>;

export async function setupSnuff(sql: Sql) {
  await sql`
    create table if not exists snuff_actions (
      id text primary key,
      user_id text not null,
      type text not null,
      body jsonb not null,
      at timestamptz not null default now()
    )`;
  for (const slice of slices) await slice.setup(sql, userId);
}

export async function snuffState(sql: Sql) {
  const parts = await Promise.all(slices.map((slice) => slice.read(sql, userId)));
  return Object.assign({ version: 2 }, ...parts) as Record<string, unknown>;
}

// GET  /app/state          full AppState for the demo user
// POST /app/actions        { id, action } applies one reducer action once per id
// POST /app/reset?slice=   restore mock data for one slice, or all slices without the parameter
export async function handleSnuff(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  url: URL,
  sql: Sql | null,
  send: Send,
  readJson: ReadJson,
) {
  if (!sql) return send(res, 503, { error: "no_database" });
  if (req.method === "GET" && path === "/app/state") return send(res, 200, await snuffState(sql));
  if (req.method === "POST" && path === "/app/actions") {
    let body: Record<string, unknown>;
    try {
      body = (await readJson(req)) as Record<string, unknown>;
    } catch {
      return send(res, 400, { error: "invalid" });
    }
    const id = body?.id;
    const action = body?.action as Record<string, unknown> | undefined;
    if (typeof id !== "string" || !id || id.length > 160 || !action || typeof action.type !== "string") {
      return send(res, 400, { error: "invalid" });
    }
    const handler = slices.find((slice) => slice.actions[action.type as string])?.actions[action.type];
    if (!handler) return send(res, 200, { ok: true, applied: false });
    const fresh = await sql`
      insert into snuff_actions (id, user_id, type, body)
      values (${id}, ${userId}, ${action.type}, ${sql.json(action as never)})
      on conflict (id) do nothing
      returning id`;
    if (fresh.length) await handler(sql, userId, action);
    return send(res, 200, { ok: true, applied: fresh.length > 0 });
  }
  if (req.method === "POST" && path === "/app/reset") {
    const name = url.searchParams.get("slice");
    const chosen = name ? slices.filter((slice) => slice.name === name) : slices;
    if (!chosen.length) return send(res, 404, { error: "unknown_slice" });
    for (const slice of chosen) {
      await slice.reset(sql, userId);
      await slice.setup(sql, userId);
    }
    return send(res, 200, await snuffState(sql));
  }
  send(res, 404);
}
