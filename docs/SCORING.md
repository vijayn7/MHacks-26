# Pause prices and user scores

The backend stores the amount of potential spending for a pause and updates a per-user score. These are game points, not a bank balance or verified dollars saved. Existing pause events remain untouched and receive no retroactive points.

## Policy v1

| Action | Points per dollar | $64.99 pause | $100 pause |
| --- | ---: | ---: | ---: |
| Ask a friend (check-in) | -0.5 | -32 | -50 |
| Drop | +2 | +130 | +200 |
| Save for later | +0.25 | +16 | +25 |

Round the absolute result to the nearest whole point, then apply its sign. Scores may be negative. A check-in followed by Drop counts both actions once: at $64.99, -32 + 130 = +98. A retry, message delivery, approval callback, repeated tap or reopening the same event adds no extra points. Drop and Save cannot both earn rewards for one pause. Direct Continue on the website adds no points or penalty, per the requirement to penalize asking a friend specifically. Native Continue asks the friend, so it incurs the check-in penalty.

Weights live in `apps/api/src/scoring.ts` (`SCORE_POLICY`). Increment its policy version when changing weights. Each event records its applied version and delta; changing policy does not rewrite old totals.

The website snapshots the cart's price when opening the pause and submits integer USD cents. Specifically, the demo store exposes `data-total="64.99"` on its buy box; the extension reads the first `[data-total]` attribute and applies `Math.round(Number(value) * 100)`. This is a contract with our single-product demo store, not price recognition for arbitrary websites. The iPhone sends no real price: the server assigns `PACT_DEMO_AMOUNT_CENTS`, default `6499`. Missing web prices use that same fallback. `scored_pauses.price_source` distinguishes `checkout` from `demo`. Prices are fixed on first receipt for that pause; a later conflicting supplied price is rejected. Historical demo prices remain fixed even if the configuration changes.

## Identity and storage

The current project has one demo account, not user sign-in. Both clients resolve to server-configured `PACT_DEMO_USER_ID` (default `demo`). Client-provided `userId` and point values are ignored. `ScoreService.record(userId, event)` and all tables support separate users; connect this argument to the authenticated account when login ships. Do not use a client-editable ID for real accounts. Native requests use `PACT_IOS_TOKEN`; existing web endpoints remain a local, single-user demo and must not be exposed as an authenticated multi-user leaderboard.

- `user_scores`: one `user_id`, running signed total, update timestamp.
- `scored_pauses`: one row per user/source/pause; fixed amount in cents, currency, price source and terminal decision.
- `pause_events`: existing table extended with `user_id`, `pause_id`, `source`, `amount_cents`, `currency`, `score_action`, `score_delta`, `score_version`, and `score_rule_id`. This is the score ledger as well as event history. `score_rule_id` preserves the client rule identifier, including local iPhone rules and demo labels. The original `rule_id` retains its foreign key and is populated only when the identifier matches a server rule owned by that user. The legacy event-type constraint is expanded to accept both web and iPhone events.

Schema setup is additive and runs during API startup. A transaction locks the user's balance, validates/pins the pause amount, deduplicates the event and action, appends the event, and updates the balance. A failure rolls all of that back. A unique partial index prevents a second award for the same user/source/pause/action. Different users can update independently. Old rows keep NULL scoring fields.

## API

`GET /score` returns the current demo user's total, policy, and demo amount. `GET /score/events` returns their latest 100 price-tagged events. Native callers add `?source=ios` and `Authorization: Bearer <PACT_IOS_TOKEN>`.

`POST /pause-events`:

```json
{
  "id": "stable-event-id",
  "pauseId": "a-valid-UUID",
  "source": "web",
  "type": "purchase_dropped",
  "ruleId": "seed-over-40",
  "amountCents": 6499,
  "at": "2026-10-03T20:00:00Z"
}
```

Response:

```json
{"eventId":"stable-event-id","duplicate":false,"delta":130,"score":130,"amountCents":6499}
```

Native uses source `ios` and omits amount. Supported input events are in `scoring.ts`. Website `friend_ping_requested` and native `continue_selected` map to check-in. `purchase_dropped`/`drop_selected` and `saved_for_later` map to rewards. Other recognized events are audit-only. The client never computes the authoritative delta.

Duplicates return delta zero and the current total. A conflicting event/price returns 409. A missing Neon configuration returns 503, so clients keep events queued instead of pretending the score was saved. The API does not send a Photon message or execute a purchase when recording a score event.

## Offline behavior and UI replacement

The website queues one metadata record per localStorage key and retries on reconnect, page load and a 15-second timer. The iPhone stores a separate outbox in its protected App Group state; clearing the visible history retains unsent events. App, shield and active broadcast can retry the same event safely. Native sync is separate from blocking decisions; a scoring outage never approves or prevents a verified friend approval. Old app state files decode without an outbox, and isolated previews are never uploaded.

The website pause card and the native `PauseScoreCard` show the server total. Designers can replace either without changing the backend API or policy.

## Running and verifying

Restart the API after applying this change, rebuild/reload the extension, and rebuild the iPhone app. `.env.example` documents the two demo settings. Read-only inspection:

```sh
curl http://localhost:8787/score
curl http://localhost:8787/score/events
```

```sql
SELECT user_id, score, updated_at FROM user_scores;
SELECT user_id, pause_id, source, amount_cents, score_action, score_delta
FROM pause_events WHERE user_id IS NOT NULL ORDER BY at DESC;
```

### Persistent demo in Neon

Start the API in one terminal with `npm run dev:api`, then run this from the repo root in another:

```sh
npm run demo:scoring
```

This module posts simulated web events through `/pause-events`, then independently queries the database from the repo-root `.env`. Each step checks the stored event, amount, running score, and sum of the ledger. For a new run starting at zero:

| Step | Delta | Neon total |
| --- | ---: | ---: |
| Ask a friend | -32 | -32 |
| Drop that purchase | +130 | 98 |
| Retry Drop | 0 | 98 |
| Save a different purchase | +16 | 114 |

It leaves the rows in the current demo account for inspection. It does not reset any scores, send Photon messages, or record purchases. The default label is `score-demo:v1`; repeating the command reuses the same pause IDs and adds no more points. Choose a new run ID to demonstrate changes again. To refresh Neon's SQL editor between individual actions:

```sh
npm run demo:scoring -- --run-id rehearsal-2 --step check-in
npm run demo:scoring -- --run-id rehearsal-2 --step drop
npm run demo:scoring -- --run-id rehearsal-2 --step save
```

The first two actions share one pause. Save uses a different pause, because Drop and Save cannot both earn rewards for the same checkout. Avoid other checkout activity during verification so the total does not change between the API response and the independent database read. A fresh complete run adds 114 points to the existing score; reusing its run ID adds zero.

In the Neon SQL editor, use the database and branch from `DATABASE_URL`:

```sql
SELECT user_id, score, updated_at
FROM user_scores WHERE user_id = 'demo';

SELECT at, type, amount_cents, score_action, score_delta, pause_id, score_rule_id
FROM pause_events
WHERE user_id = 'demo' AND score_rule_id LIKE 'score-demo:%'
ORDER BY at;
```

Replace `demo` if you configured `PACT_DEMO_USER_ID`. Amounts are in cents: `6499` means $64.99. These are simulated scoring decisions, not proof that money was actually saved.

### Automated checks

```sh
npm run test --workspace @secondthought/api
npm run typecheck --workspace @secondthought/api
npm run typecheck --workspace @secondthought/extension
npm run build:extension
swift test --package-path pact-ios
```

`npm run test:scoring-db --workspace @secondthought/api` additionally uses `SCORE_TEST_DATABASE_URL` if explicitly configured. It creates and verifies an isolated random schema, tests concurrent transactions and separate users, and drops only that schema afterward. For Neon it uses the direct connection for schema isolation; the application's normal pooled connection remains unchanged. No test invokes Photon or Nessie.
