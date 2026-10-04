# Demo site and Chrome extension

Knowledge dump for the hackathon checkout path. The iOS app lives in `pact-ios` and is a separate surface. This file covers the mock store and the extension that pauses it.

## What the demo shows

The page is a product for Optimum Nutrition Gold Standard 100% Whey, Delicious Strawberry, priced at $64.99. Buy Now opens shipping and payment on the same page. Place order matches a local rule, so the extension holds the click and shows a pause card. The shopper can drop the purchase, save it for later, continue, or ask a friend. A friend reply of YES, or Continue, runs Place order again. That second click records the purchase in Capital One Nessie. NO drops it.

The store does not charge a real card. Shipping and payment are hardcoded demo values.

## Run it

From the repo root, with Node 24:

```bash
npm install
npm run dev:store
npm run dev:api
npm run build:extension
```

- Store: http://localhost:5173
- API: http://localhost:8787

Load the extension in Chrome, not in the Cursor browser. Open `chrome://extensions`, turn on Developer mode, and load unpacked `apps/extension`. After any content-script edit, run `npm run build:extension` and reload the extension. Chrome runs `apps/extension/dist/content.js`. The manifest only matches `http://localhost:5173/*`.

`.env` stays at the repo root and is gitignored. The store and extension do not read it. The API does.

## Demo store

Package: `@secondthought/store`. Vite and React. Entry is `apps/store/src/App.tsx`.

The page is one product, not a catalog.

- Product: Optimum Nutrition Gold Standard 100% Whey Protein Powder, Delicious Strawberry, 5 lb. Price is hardcoded at $64.99.
- Buy box: `data-name="Optimum Nutrition Gold Standard 100% Whey, Delicious Strawberry"` and `data-total="64.99"`. The extension reads those attributes. Do not remove them.
- Buy Now reveals the checkout panel. It is not the pay control.
- Shipping fields are prefilled and disabled: Demo Shopper, 1600 Pennsylvania Ave NW, Washington, DC 20500. Payment is a disabled field labeled Nessie checking account. There is no card number.
- Place order is `button#checkout`. Its handler reads those data attributes and `POST`s `{ name, amount }` to `http://localhost:8787/purchase`. Amount is 64.99.
- On success the page is replaced with “Order placed.”, the Nessie purchase id, and the checking-account balance. On an API error the message stays on the panel and the order stays unplaced.
- The API reads `NESSIE_API_KEY` from the environment. Without it, `POST /purchase` returns `503` `{ "error": "missing_key" }`. With it, the API records the purchase at `https://api.nessieisreal.com` and returns `{ purchaseId, balance, amount, name }`. `purchaseId` is Nessie’s `objectCreated._id`.

The price is over $40 on purpose so the seeded rule matches.

## Chrome extension

Package: `@secondthought/extension`. Manifest V3. One content script, `apps/extension/src/content.ts`, bundled with esbuild to `dist/content.js`. No React in the extension. The pause card is a shadow DOM overlay so store CSS cannot restyle it.

The script does not use `chrome.*` for the pause itself. It can be injected into a page for a check; the real demo is the unpacked extension.

### Rule match

Loads `GET /rules/active` on startup and falls back to the seeded rule when that fails:

```ts
{ id: "seed-over-40", minAmount: 40, pauseMinutes: 15 }
```

The content script classifies the page with `checkout-analyzer` (checkout stage + total ≥ minAmount). When it matches, it opens the pause card. The card text says the pause is 15 minutes. Nothing in the extension starts a timer.

### Two-surface pause (Chrome ↔ phone)

Opening the card:

1. Posts `checkout_detected` and `pause_started` to `POST /events` (network failures ignored).
2. `POST /pauses` with `{ id, name, amount }` so the demo user’s waiting nudge appears in `GET /app/state` for the phone app.
3. Watches resolution: Spacetime `pause_status` for that session id when `/spacetime` is configured, plus `GET /pauses?id=` every 2 seconds as fallback.

| Action | What the shopper sees | What happens |
| --- | --- | --- |
| Drop | “Purchase dropped” | `POST /app/actions` `SNUFF_NUDGE` with stable id `{pauseId}:SNUFF_NUDGE`. Event `purchase_dropped`. |
| Save for later | “Saved for later” | `POST /app/actions` `SAVE_FOR_LATER` (archives via the pauses slice; no separate `POST /saved`). Event `saved_for_later`. |
| Continue | Card closes; shopper can place the order. | `POST /app/actions` `KEEP_NUDGE`. Event `continue_selected`. |
| Ask my friend | Friend check-in copy on the card. | `POST /check-in`. Card stays open and polls. |

A decision made first on either surface wins. If the phone resolves the nudge (`snuffed` / `kept` / `saved`), the card applies that outcome once and does not post a second action. Applied `/app/actions` also mirror to Spacetime via the API so the other surface updates live when Spacetime is configured.

### Friend decision

Ask my friend is an explicit click. The extension sends the product name and the cart total. The API writes the iMessage.

The card polls `GET /check-in?id=` every 2 seconds (and can also see friend states on the Spacetime row).

- `approved`: the card says the friend approved, then after 1.5 seconds it continues.
- `rejected`: the card says the friend rejected, then it drops and may close the tab.
- `waiting: true`: Photon refused another outbound text because one is already on the friend’s phone. The card says to reply on that thread and keeps polling.

Drop, Save for later, and Continue stay available while the card waits. Whichever decision arrives first is what the extension applies.

## Store contract the extension depends on

Keep these stable or the pause will miss checkout:

- `button#checkout` is the only pay control. Buy Now is a separate button.
- `[data-total]` is `64.99`, a number the extension can parse.
- `[data-name]` is `Optimum Nutrition Gold Standard 100% Whey, Delicious Strawberry`. That string is sent to the friend, stored on save, and sent as the Nessie purchase description.

The extension does not scrape the page beyond those attributes and the checkout button.

## What this demo does not do

- The store can parse and confirm a rule through the API. Checkout matching uses the confirmed rule, and the extension falls back to the seeded $40 rule when the API is unavailable. Gemini is not called at checkout.
- The extension loads `GET /rules/active` on startup and falls back to the seeded $40 rule when that request fails.
- It does not run a 15-minute countdown.
- It does not load outside `http://localhost:5173/*`.

## Rehearsal

Checked on this VM on 2026-10-03. Default Node was v22.14.0 (`/exec-daemon/node`). `npm run dev:api` was run with nvm Node v22.22.2 because v22.14.0 cannot load the API's `.ts` entry. A gitignored `.env` was copied from `.env.example` with the example's empty values so `node --env-file` could start. That file was not committed and was removed after the API stopped. No iMessage was sent.

```bash
npm install
npm run build:extension
npm run build -w @secondthought/store
```

All three exited 0. The store package has a `build` script and no typecheck script, so the store check was `vite build`.

API, from the repo root, after the empty `.env` existed:

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
npm run dev:api
curl -sS http://localhost:8787/health
curl -sS -H 'content-type: application/json' \
  -d '{"id":"rehearsal-checkout-detected","type":"checkout_detected","ruleId":"seed-over-40"}' \
  http://localhost:8787/events
curl -sS http://localhost:8787/events
```

Then Ctrl-C.

| Check | Result |
| --- | --- |
| `GET /health` | Pass. 200 `{"ok":true}`. |
| `POST /events` with `checkout_detected` | Pass. 200 with that id, type, and `ruleId`. `pause_started` was not posted. |
| `GET /events` | Pass. 200 and the same event is the only row. |
| Server stop | Pass. Port 8787 then refused connections. |

The process logged `api http://localhost:8787` and did not log `spectrum ready`. `/check-in` was not called.

Earlier `dev:api` attempts failed and were not the checks above:

- `npm run dev:api` with no `.env` file: Node exited with `../../.env: not found`.
- The same command on Node v22.14.0 after the empty `.env` existed: `ERR_UNKNOWN_FILE_EXTENSION` for `src/index.ts`.

Store:

```bash
npm run dev:store
curl -sS http://localhost:5173/
timeout 20 google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/chrome-rehearsal --dump-dom http://localhost:5173/
```

Then Ctrl-C. Vite printed `http://localhost:5173/`.

| Check | Result |
| --- | --- |
| `curl` of the store | Pass for HTTP 200. The body is the Vite shell (`div#root` and `/src/main.tsx`). It does not include `#checkout` or `data-total`. |
| Rendered document | Pass. The headless dump includes `button#checkout`, `data-total="64"`, and `data-name="Wool coat"`. Chrome kept running after writing the document, so `timeout` exited 124. |
| Server stop | Pass. Port 5173 then refused connections. |

This VM could not:

- Load the unpacked extension in `chrome://extensions`, or click through Drop, Save for later, Continue, and Ask my friend.
- Receive a live iMessage reply.

No backup video was recorded.
