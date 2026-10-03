import { schema, table, t } from "spacetimedb/server";

const pauseStatus = table(
  { name: "pause_status", public: true },
  {
    sessionId: t.string().primaryKey(),
    state: t.string(),
    friendReply: t.option(t.string()),
    updatedAt: t.timestamp(),
  },
);

const spacetimedb = schema({ pauseStatus });
export default spacetimedb;
