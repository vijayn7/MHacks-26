# Setup

You have to be **inside the cloned repo**, not in `~`. `pnpm` is not installed by default on macOS.

## On a fresh Mac

```bash
# Node 22 is required (built-in SQLite). Homebrew or nvm both work.
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile

git clone https://github.com/vijayn7/MHacks-26.git
cd MHacks-26
git checkout cursor/impulse-spending-app-70f2

bash scripts/setup.sh          # enables pnpm, installs deps, copies .env
pnpm dev:web                   # http://localhost:3000
```

`scripts/setup.sh` refuses to run if you are in the wrong folder, and it tells you if Node or pnpm is missing.

Then, in other terminals still inside `MHacks-26`:

```bash
bash scripts/demo.sh           # after the server is up
cd apps/mobile && pnpm exec expo start
pnpm build:extension           # load apps/extension/.output/chrome-mv3 unpacked in Chrome
```

## Already cloned

```bash
cd /path/to/MHacks-26
bash scripts/setup.sh
pnpm install
cp -n .env.example apps/web/.env.local
pnpm --filter @impulse/web dev
```

The API listens on `http://localhost:3000`. The runtime database is SQLite via `@impulse/db` (needs Node with `--experimental-sqlite`; the scripts set it). There is no Postgres/Supabase runtime adapter yet.

Development sign-in is on unless `ALLOW_DEV_AUTH=false`. It creates a real local account. It is not a fake button in front of hardcoded numbers.

```bash
cd apps/mobile
pnpm exec expo start
```

On a physical phone, point `EXPO_PUBLIC_API_URL` at the computer’s LAN address. The iOS simulator can use `localhost`.

## Environment variables

Server (`apps/web/.env.local`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `ALLOW_DEV_AUTH` | on (anything but `false`) | Development sign-in |
| `APP_BASE_URL` | `http://localhost:3000` | Public origin used in invite and approval links |
| `DATABASE_PATH` | `.data/impulse.db` | SQLite file |
| `TOKEN_PEPPER` | none | Salts token and code hashes. Keep stable; change it before sharing a database file |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | empty | Google sign-in. Both are needed for it to be on |
| `AI_API_KEY`, `AI_API_BASE`, `AI_MODEL` | empty, OpenAI URL, `gpt-4o-mini` | Optional insight summaries |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | empty | Optional SMS |

`SUPABASE_SERVICE_ROLE_KEY` appears in `.env.example` for a future Postgres API process. Nothing reads it today, and it must never be given to the phone or the extension.

Clients (public, not secrets):

| Variable | Used by | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `apps/mobile` | API origin |
| `VITE_API_URL` | `apps/extension` build | API origin; default `http://localhost:3000`. Put it in `apps/extension/.env` or the shell when building. A non-localhost origin is also added to the manifest `host_permissions` |
| `VITE_APP_URL` | `apps/extension` build | Optional web app URL for the popup’s “Account settings” link; defaults to the API origin |

The extension also reads `apiBase` and `appUrl` from `chrome.storage.local` if set, which overrides the build values.

## Tests

```bash
pnpm typecheck
NODE_OPTIONS='--experimental-sqlite' pnpm exec vitest run
```

This includes `packages/db/test/rls.test.ts`, which applies the Supabase migrations to an in-process Postgres (PGlite). See `docs/deployment.md`.
