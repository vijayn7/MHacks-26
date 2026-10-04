HELLO

## GPT-App Ver — Snuff

- [Mobile app and setup](GPT-App%20Ver/README.md)
- [Portable design system for designers](design-system/snuff/README.md)
- [Offline visual reference](design-system/snuff/index.html) — download the kit and open this file in a browser.

Run the standalone Expo app with `cd "GPT-App Ver"`, `npm ci`, then `npm run web`. It uses local demo data and is not yet connected to the backend in this repository.

---

# Impulse

A pause before a purchase. Impulse is a phone app, a Chrome extension, and a small API. It is a behavioral support tool for adults, not a lock on anyone’s money and not a treatment for addiction.

The screens follow the product map: welcome, a short conversation, a restriction level (low, mid, high), Google sign-in, an optional trusted contact, then Home, Social, and Profile. The hold interaction cools an ember instead of playing a game.

## What runs today

The runtime database is SQLite, opened through `@impulse/db` inside the API process. The rules, scores, approvals, challenges, change feed, and row ownership are enforced there and covered by tests.

A Postgres/Supabase runtime repository adapter is **not implemented**. `supabase/migrations` holds a hosted schema with Row Level Security, column grants, state-machine triggers, and a realtime publication. It is verified against real Postgres (PGlite) by `packages/db/test/rls.test.ts`, but the API does not run against it yet. Wiring it up needs a repository that implements the same interface as `SqliteRepo`. Clients never receive the service-role key.

## Integrations

| Integration | Status | Without credentials | With credentials |
| --- | --- | --- | --- |
| API, SQLite store, scoring, approvals, challenges, change feed | LIVE | Works | n/a |
| Extension pairing, monitoring toggle, change-feed sync | LIVE | Works | n/a |
| Google sign-in (Supabase Auth, PKCE) | CREDENTIAL-GATED | Development sign-in (`ALLOW_DEV_AUTH`) | Needs `SUPABASE_URL` and `SUPABASE_ANON_KEY` |
| SMS delivery of invite and approval links (Twilio) | CREDENTIAL-GATED | Link is returned; the phone shares it | Needs `TWILIO_*` |
| AI insight summaries | CREDENTIAL-GATED | SIMULATED/FALLBACK: deterministic summary from counts | Needs `AI_API_KEY`; rejected if it disagrees with the counts |
| Onboarding questions | SIMULATED/FALLBACK | Deterministic questions, validated preference | Same (no model is called) |
| Development sign-in | SIMULATED/FALLBACK | Creates a real local account | Disable with `ALLOW_DEV_AUTH=false` |
| iMessage | SIMULATED/FALLBACK | iOS Messages composer with the link | No automated iMessage API exists |
| Push notifications | Not implemented | In-app notification rows only | n/a |
| Postgres/Supabase runtime | Not implemented | Schema and RLS only | n/a |

Details are in `docs/integrations.md`.

## Limits

The extension pauses supported checkout pages in Chrome, on sites the person enabled. It cannot block native apps, bank apps, or every payment. It does not claim to be online continuously: the popup and the phone show a last-seen / last-sync time.

## Apps

- `apps/mobile` — Expo / React Native
- `apps/extension` — SecondThought checkout pause (esbuild) plus legacy Impulse WXT entrypoints
- `apps/web` — Next.js API, approval links, trust consent, OAuth handoff
- `apps/api` / `apps/store` — SecondThought demo API and mock store
- `GPT-App Ver` — standalone Snuff Expo app
- `packages/shared` — rules, scoring, site matching, schemas
- `packages/db` — SQLite repository
- `packages/api` — HTTP API used by the web server and the tests
- `supabase/migrations` — hosted Postgres schema (not used at runtime yet)

## Run it on your machine

Those commands only work **after** you clone this repo and install Node 22 + pnpm. From `~` they will fail with `command not found` and `No such file or directory`.

```bash
brew install node@22                       # or: nvm install 22
git clone https://github.com/vijayn7/MHacks-26.git
cd MHacks-26
git checkout cursor/impulse-spending-app-70f2
bash scripts/setup.sh                      # pnpm, install, .env.local
pnpm dev:web                               # http://localhost:3000
```

See `docs/setup.md` for Expo, the extension, and the demo script.

## Scripts

```bash
pnpm setup                                 # first-time: pnpm, install, env file
pnpm install
pnpm test                                  # includes the PGlite RLS test
pnpm typecheck
pnpm --filter @impulse/web build
npm run build:extension                    # SecondThought extension
npm run dev:store
npm run dev:api
```

`pnpm test` runs `vitest` with `NODE_OPTIONS='--experimental-sqlite'`.

Copy `.env.example` to `apps/web/.env.local` before `pnpm --filter @impulse/web dev`.

See `docs/setup.md`, `docs/extension.md`, `docs/deployment.md`, and `docs/integrations.md`.
