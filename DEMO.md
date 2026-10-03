# Demo site and Chrome extension

Knowledge dump for the hackathon checkout path. The iOS app lives in `pact-ios` and is a separate surface. This file covers the mock store and the extension that pauses it.

## What the demo shows

One product is already in the cart. Checkout matches a local rule, so the extension holds the click and shows a pause card. The shopper can drop the purchase, save it for later, continue, or ask a friend. A friend reply of YES places the order. NO drops it.

The store does not charge a card.

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

The page is one seeded cart, not a catalog.

- Product: Wool coat, $64.
- Cart aside: `data-name="Wool coat"` and `data-total="64"`. The extension reads those attributes. Do not remove them.
- Checkout button: `id="checkout"`. Its click sets local React state and replaces the cart with “Order placed.”
- There is no payment, no other product, and no add-to-cart step.

The price is over $40 on purpose so the seeded rule matches.

## Chrome extension

Package: `@secondthought/extension`. Manifest V3. One content script, `apps/extension/src/content.ts`, compiled with `tsc` to `dist/content.js`. No React in the extension. The pause card is a shadow DOM overlay so store CSS cannot restyle it.

The script does not use `chrome.*`. It can be injected into the store page for a check, but the real demo is the unpacked extension.

### Rule match

Hardcoded in the content script. Not loaded from the API and not decided by Gemini.

```ts
{ id: "seed-over-40", minAmount: 40, pauseMinutes: 15 }
```

On a click of `#checkout`, in the capture phase:

- Read `[data-total]`. If it is missing or below 40, let the click through.
- Otherwise `preventDefault` and `stopPropagation`, then open the pause card.
- A one-shot `bypass` flag lets the next checkout click through. Continue, and a friend YES, set that flag and click `#checkout` again so the store shows “Order placed.”

The card text says the pause is 15 minutes. Nothing in the extension starts a timer.

### Pause card actions

| Action | What the shopper sees | What happens |
| --- | --- | --- |
| Drop | “Purchase dropped” | Cart stays. Event `purchase_dropped`. |
| Save for later | “Saved for later” | Cart stays. Event `saved_for_later`. Also `POST /saved` with the product name and amount. |
| Continue | Store shows “Order placed.” | Event `continue_selected`. Checkout click is allowed through. |
| Ask my friend | “Text sent. Waiting for YES or NO.” | `POST /check-in`. The card stays open and polls. |

Opening the card posts `pause_started`. Event posts go to `POST http://localhost:8787/events` and ignore network failure, so the pause still works if the API is down. Save and the friend check-in do need the API.

### Friend decision

Ask my friend is an explicit click. The extension sends the product name and the cart total. The API writes the iMessage. The text names the item and price and asks for YES or NO.

The card polls `GET /check-in?id=` every 2 seconds.

- `approved`: the card says the friend approved, then after 1.5 seconds it continues checkout.
- `rejected`: the card says the friend rejected, then it drops the purchase.
- `waiting: true`: Photon refused another outbound text because one is already on the friend’s phone. The card says to reply YES or NO on that thread and keeps polling. This is not a failed pause.

Any other friend text does not decide the purchase. The API asks them again to reply YES or NO.

Drop, Save for later, and Continue stay available while the card waits. A friend decision that arrives first is what the extension applies.

## Store contract the extension depends on

Keep these stable or the pause will miss checkout:

- `button#checkout` is the only checkout control.
- `[data-total]` is the cart total in dollars, a number the extension can parse.
- `[data-name]` is the product name sent to the friend and stored on save.

The extension does not scrape the page beyond those attributes and the checkout button.

## What this demo does not do

- It does not parse a new rule in the store or the extension. Gemini parsing lives on the API, and checkout matching stays the seeded $40 rule.
- It does not sync a confirmed rule from Neon into the extension yet.
- It does not run a 15-minute countdown.
- It does not load outside `http://localhost:5173/*`.
