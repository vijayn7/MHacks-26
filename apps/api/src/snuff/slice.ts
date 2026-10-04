import type postgres from "postgres";

export type Sql = postgres.Sql;

// One slice owns part of Snuff's AppState (GPT-App Ver/src/state/model.ts).
// The app's reducer is the source of truth: `read` returns that slice's AppState fields
// in exactly the app's shape, and `actions` mirror the reducer cases for those fields.
export type Slice = {
  name: string;
  // Create tables and insert mock rows for `userId` when they are missing. Must be idempotent.
  setup(sql: Sql, userId: string): Promise<void>;
  // Delete this slice's rows for `userId`. `setup` runs again afterwards to restore mock data.
  reset(sql: Sql, userId: string): Promise<void>;
  read(sql: Sql, userId: string): Promise<Record<string, unknown>>;
  // Keyed by the app's Action `type`. Receives the full action object the app dispatched.
  actions: Record<string, (sql: Sql, userId: string, action: Record<string, unknown>) => Promise<void>>;
};
