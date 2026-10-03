# Impulse

A pause before a purchase. Impulse is a phone app, a Chrome extension, and a small API. It is a behavioral support tool for adults, not a lock on anyone’s money and not a treatment for addiction.

The repository started empty. The screens follow the product map: welcome, a short conversation, a restriction level (low, mid, high), Google sign-in, an optional trusted contact, then Home, Social, and Profile. The hold interaction cools an ember instead of playing a game.

## What runs today

Local development uses a SQLite database inside the API process. The rules, scores, approvals, and row ownership are enforced there and covered by tests. Supabase SQL and Row Level Security live in `supabase/migrations` for a hosted deploy. Clients never receive the service-role key.

| Integration | Without credentials | With credentials |
| --- | --- | --- |
| Sign-in | Development sign-in (`ALLOW_DEV_AUTH`) | Google via Supabase Auth, PKCE |
| Onboarding copy | Deterministic questions and a validated preference | Same structure; summaries can use an LLM |
| Insights | Counts only. Dollars appear only when a price was actually known | Optional model text, rejected if it disagrees with the counts |
| Approval delivery | Link the person can open, or the iOS Messages composer | Twilio SMS if `TWILIO_*` is set |
| Extension presence | Last-seen time. The app does not pretend the browser is online | Same |

## Apps

- `apps/mobile` — Expo / React Native
- `apps/extension` — WXT, React popup, Manifest V3
- `apps/web` — Next.js API, approval links, trust consent, OAuth handoff
- `packages/shared` — rules, scoring, site matching, schemas
- `packages/db` — SQLite repository
- `packages/api` — HTTP API used by the web server and the tests

## Scripts

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm --filter @impulse/web build
pnpm --filter @impulse/extension build
```

Copy `.env.example` to `apps/web/.env.local` before `pnpm --filter @impulse/web dev`.

See `docs/setup.md`, `docs/extension.md`, `docs/deployment.md`, and `docs/integrations.md`.
