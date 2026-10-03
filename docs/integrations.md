# Integrations

Impulse works with no third-party keys. External services add transport, not new rules. Each row is labeled by what actually happens in this repository.

| Integration | Label | Behavior |
| --- | --- | --- |
| API + SQLite store (`@impulse/db`) | LIVE | The runtime database. All rules and ownership checks run here |
| Change feed `GET /api/changes` | LIVE | Revision hash per user; optional long-poll |
| Extension pairing and sessions | LIVE | Pair code, then a separate `extension` session |
| Extension monitoring toggle | LIVE | `POST /api/extension/monitoring` |
| Google sign-in | CREDENTIAL-GATED | Needs `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Otherwise 503 |
| SMS (Twilio) | CREDENTIAL-GATED | Needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| AI insight summaries | CREDENTIAL-GATED | Needs `AI_API_KEY` |
| Development sign-in | SIMULATED/FALLBACK | Real local account, no identity provider |
| AI-less insight text, onboarding questions | SIMULATED/FALLBACK | Deterministic, from counts |
| iMessage | SIMULATED/FALLBACK | Link is handed to the iOS Messages composer; there is no automated iMessage API |
| Supabase Postgres at runtime | NOT IMPLEMENTED | Schema and RLS exist and are tested, no runtime adapter |
| Push notifications | NOT IMPLEMENTED | In-app notification rows only |

## Change feed

`GET /api/changes` works with a user or an extension session.

- Without `since` it returns `{ revision, changed: true }`.
- With `?since=<revision>` it returns `{ revision, changed }`. Add `&waitMs=` (capped at 25000) to hold the request open until the revision differs or the wait ends. The server re-checks about every 400 ms.
- The revision is a hash over the person’s profile, protected sites, interventions, saved purchases, recent approvals, trusted contacts, friendships, challenges, notifications, and score total. A client that sees a new revision re-reads the endpoints it needs.

The extension polls without `waitMs` on a 30-second alarm because a Manifest V3 service worker should not hold long requests. This is polling, not push: changes can take up to about 30 seconds to arrive, and nothing arrives while the browser is closed or offline.

## Monitoring endpoint

`POST /api/extension/monitoring` with `{ "enabled": true | false }` returns `{ monitoringEnabled }`. It needs any valid session and changes only `monitoringEnabled` for that person. An extension session cannot change restriction level, cooldown, reflection time, approval requirement, or sites: `PATCH /api/settings` and the other write routes require a phone (user) session.

## Google

Live when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set. Otherwise the API returns 503 for `/api/auth/google/start` and the phone offers development sign-in. Development sign-in is labeled as such.

## AI

`AI_API_KEY` turns on an OpenAI-compatible chat call (`AI_API_BASE`, `AI_MODEL`) for insight summaries only. The model must echo the server’s counts. If it invents a dollar amount when no price was stored, or the counts differ, or the call fails, the API discards the text and uses the deterministic summary (`source: "fallback"`). Onboarding questions are deterministic with or without a key, and the stored result is a validated preference object.

## SMS

`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM` make the API send the invite or approval link with Twilio. The credentials stay on the server. If they are missing, the contact has no phone, or the send fails, the response is `share` or `failed` and the phone opens the iOS Messages composer with the same link.

## Notifications

When a saved purchase’s cooldown ends, the API writes an in-app notification if the person asked for one. Push delivery is not claimed without a push provider.

## What the extension cannot do

It can pause a supported checkout page in Chrome. It cannot block a native shop, a bank app, or every gambling payment. Monitoring is off when the person turns it off, and it only runs on domains they enabled. It is not continuously online: Chrome has to be running, and the popup shows the last time it synced.
