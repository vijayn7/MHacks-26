# Deployment

## API

The Next.js app in `apps/web` is the API and the public approval site.

```bash
pnpm --filter @impulse/web build
NODE_OPTIONS='--experimental-sqlite' pnpm --filter @impulse/web start
```

Set `APP_BASE_URL` to the public origin so invite and approval links are correct. Keep `TOKEN_PEPPER` stable. The SQLite file is `DATABASE_PATH` (default `.data/impulse.db`) and needs a persistent disk; a serverless host with an ephemeral filesystem will lose data. Node has to allow the built-in SQLite module (`--experimental-sqlite` on Node 22).

**The deployed API uses SQLite.** A Postgres/Supabase runtime repository adapter is not implemented, so applying the Supabase migrations does not change where the API stores data.

## Supabase schema (provided, not yet used by the API)

Two migrations are in `supabase/migrations`:

- `20261003120000_init.sql` — tables for profiles, protected sites, interventions, deferred purchases, approvals, trusted contacts, friendships, scores, challenges, notifications. Row Level Security is on for every table, with select-only policies for the owner. There are no insert, update, or delete policies, so a signed-in client cannot write.
- `20261003130000_sync_and_hardening.sql` —
  - token-hash columns, pairing codes, friend invites, onboarding drafts (RLS on, no policies: service role only);
  - indexes and a unique index allowing one pending approval per purchase;
  - trigger state machines: an approval request is immutable except its status and is answered once; score events are append-only; a finished intervention cannot change its decision or owner; a revoked trusted contact stays revoked and cancels its open requests; `updated_at` is maintained;
  - privileges: `anon` has nothing, `authenticated` has no write grants, and column-level `select` grants on `trusted_contacts`, `approval_requests`, and `extension_connections` leave out `token_hash`;
  - narrower policies for trusted contacts and challenges;
  - adds the main tables to the `supabase_realtime` publication when it exists, so realtime subscribers only receive rows their select policies allow.

Apply them in order with the Supabase CLI or SQL editor.

### Verification

`packages/db/test/rls.test.ts` loads both migrations into PGlite (real Postgres) with stand-ins for `auth.uid()` and the `anon` / `authenticated` roles, then queries as a non-superuser. It checks row isolation, refusal of client writes, anonymous denial, hidden token hashes and pairing codes, trusted-contact scoping, challenge visibility, the state-machine triggers, and cascade on account deletion. It does not exercise the realtime publication (PGlite has none, so that block is a no-op) and does not test the API against Postgres.

Run it with the rest of the suite:

```bash
NODE_OPTIONS='--experimental-sqlite' pnpm exec vitest run
```

### Google sign-in

Google sign-in uses Supabase Auth only for the OAuth exchange, and works without the Postgres schema:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` on the server exchange only
- Redirect URL `https://<your-api>/auth/callback` and the app scheme `impulse://auth`
- The phone builds a PKCE challenge and posts the code plus verifier to `/api/auth/google/callback`

Do not put `SUPABASE_SERVICE_ROLE_KEY` in Expo or the extension. Nothing in the repository reads it yet.

## Phone

Expo can be built with EAS. `app.json` sets the scheme `impulse` and bundle ids `app.impulse.mobile`.

## Extension

Build with `pnpm --filter @impulse/extension build` and ship `apps/extension/.output/chrome-mv3` (zip it for the Chrome Web Store). Set `VITE_API_URL` (and optionally `VITE_APP_URL`) at build time to your public API origin; that origin is added to `host_permissions`. Host permissions for shopping and betting domains are optional and requested when the person allows them. The extension holds only a pairing-derived extension session, never a service-role, AI, or messaging key.
