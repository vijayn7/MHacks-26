# Chrome extension

## Build and load

```bash
pnpm --filter @impulse/extension build      # WXT, Manifest V3, output: apps/extension/.output/chrome-mv3
```

In `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and select `apps/extension/.output/chrome-mv3`. For development, `pnpm --filter @impulse/extension dev` runs WXT’s watcher. Rebuild and reload after changing `VITE_API_URL`.

The API must be running (`pnpm --filter @impulse/web dev`). The default origin is `http://localhost:3000`.

## Pairing

1. Sign in on the phone and open the connection screen. It shows an 8-character code, valid for 10 minutes and usable once.
2. Open the Impulse popup and enter the code. The extension posts it to `POST /api/extension/pair` and receives its own **extension session** (90 days). The phone’s token is never copied or shared.
3. Choose **Allow selected sites**. Chrome asks for those origins only. The extension does not request every website up front.
4. Open a checkout URL on an enabled domain, for example `https://www.amazon.com/checkout`, after shopping sites are on.

An extension session can read its own settings and sites, record interventions, request approvals, and read the change feed. The one setting it can change is monitoring on/off. Everything else (restriction level, allowed sites, cooldown, reflection seconds, trusted contacts) is changed from the phone and rejected for a browser session.

## Staying in sync

The service worker has a 30-second alarm (`periodInMinutes: 0.5`) that calls `GET /api/changes?since=<last revision>` with the extension session. The last revision, the last sync time, and the connection state (`ok`, `offline`, `unauthorized`, `unlinked`) are stored in `chrome.storage.local` under `sync`.

When the revision changed, the extension drops its cached bootstrap, reloads `/api/extension/bootstrap`, and re-registers the content script. Restriction level, monitoring on/off, allowed sites, cooldown, and reflection seconds then apply on the next page load, without reopening the popup. The revision is only advanced after the refresh succeeds, so a failed refresh is retried on the next tick.

Failure behavior:

- Offline or server error: the extension keeps the last known settings (`lastBootstrap`) and its current content-script registration, and the popup says it cannot reach Impulse and shows the last sync time. It does not turn protection off or on by guessing.
- 401/403 (session revoked or expired): polling stops and the popup asks to link again with a new code.
- Save-for-later and continue records are retried from a local queue only after network or server errors. A request the API rejected is not queued. Records carry an idempotency key, so a retry cannot double count.

This is polling every 30 seconds, not push. A change made on the phone can take up to about 30 seconds to reach the browser, and nothing syncs while Chrome is closed.

## Popup

- Connection status and the last sync time.
- Monitoring on/off. This calls `POST /api/extension/monitoring` with `{ "enabled": true | false }`. Turning it off unregisters the content script.
- “Account settings” opens the web app URL (`VITE_APP_URL`, else the API origin; both can be overridden with `appUrl` / `apiBase` in `chrome.storage.local`). The web app today is a handoff site with no settings screen, so settings are changed from the phone.
- The popup re-renders when the stored sync state or revision changes.

## What it does on a page

The content script leaves product pages alone. It looks for checkout, cart, payment, bet slip, and similar paths. It reads the page URL, the title, and a product price meta tag when one exists. It does not read form fields.

The same checkout path will not open the pause twice in a session.

Continue follows the account’s current restriction:

- Low can continue immediately. Holding is optional and can still score a reflection.
- Mid requires the hold, or the “pause without holding” control, or the Space key.
- High asks an accepted trusted contact when that setting is on. The page polls until the link is answered.

Save for later and Drop it write the same records the phone shows on the next refresh.

## Limits

The extension only works in Chrome, on the domains the person enabled, on pages whose URL looks like a checkout. It cannot block native apps, bank apps, or all payments, and it is not online continuously. “Last seen” on the phone is the last time the browser contacted the API.
