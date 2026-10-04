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

export const upsert_pause_status = spacetimedb.reducer(
  {
    sessionId: t.string(),
    state: t.string(),
    friendReply: t.option(t.string()),
  },
  (ctx, { sessionId, state, friendReply }) => {
    const row = {
      sessionId,
      state,
      friendReply,
      updatedAt: ctx.timestamp,
    };
    if (ctx.db.pauseStatus.sessionId.find(sessionId)) {
      ctx.db.pauseStatus.sessionId.update(row);
    } else {
      ctx.db.pauseStatus.insert(row);
    }
  },
);

export default spacetimedb;
