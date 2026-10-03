# Setup

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm --filter @impulse/web dev
```

The API listens on `http://localhost:3000`. The phone app reads `EXPO_PUBLIC_API_URL`. The extension defaults to `http://localhost:3000` and can store another `apiBase` in `chrome.storage.local`.

Development sign-in is on unless `ALLOW_DEV_AUTH=false`. It creates a real local account. It is not a fake button in front of hardcoded numbers.

```bash
cd apps/mobile
pnpm exec expo start
```

On a physical phone, point `EXPO_PUBLIC_API_URL` at the computer’s LAN address. The iOS simulator can use `localhost`.

`TOKEN_PEPPER` salts session hashes. Change it before sharing a database file.
