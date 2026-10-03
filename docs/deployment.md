# Deployment

## API

The Next.js app in `apps/web` is the API and the public approval site.

```bash
pnpm --filter @impulse/web build
NODE_OPTIONS='--experimental-sqlite' pnpm --filter @impulse/web start
```

Set `APP_BASE_URL` to the public origin so invite and approval links are correct. Keep `TOKEN_PEPPER` stable. The SQLite file is `DATABASE_PATH` (default `.data/impulse.db`).

Node has to allow the built-in SQLite module (`--experimental-sqlite` on Node 22).

## Supabase

`supabase/migrations/20261003120000_init.sql` is the hosted schema. Apply it with the Supabase CLI or SQL editor. Row Level Security lets a signed-in person read their own rows. There are no client write policies. The service role is for a future API process only and must not ship in the app or the extension.

Google sign-in uses Supabase Auth:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` on the server exchange only
- Redirect URL `https://<your-api>/auth/callback` and the app scheme `impulse://auth`
- The phone builds a PKCE challenge and posts the code plus verifier to `/api/auth/google/callback`

Do not put `SUPABASE_SERVICE_ROLE_KEY` in Expo or the extension.

## Phone

Expo can be built with EAS. `app.json` sets the scheme `impulse` and bundle ids `app.impulse.mobile`.

## Extension

Ship the `chrome-mv3` output from `pnpm --filter @impulse/extension build`, or zip that directory for the Chrome Web Store. Host permissions for shopping and betting domains are optional and requested when the person allows them.
