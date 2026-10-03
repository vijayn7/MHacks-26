# SecondThought: Project Knowledge Dump

## Project summary

SecondThought is an opt-in shopping pause tool. It helps people slow down at online checkout using rules they set in advance, with an optional supportive check-in from a trusted friend over iMessage.

**One-line pitch:** SecondThought adds a user-chosen cooling-off moment to online checkout and lets the shopper ask a friend for support before deciding.

**Primary theme:** FinTech. The product helps people follow their own spending limits and make intentional purchase decisions.

**Hackathon demo target:** In about 90 seconds, show one written rule, a checkout attempt that matches it, a pause card, the shopper choosing an action, and a real friend response arriving in iMessage.

## Decisions made so far

- The product is about online shopping broadly, not gambling alone.
- The hackathon demo should use a mock store and a browser extension. The product vision may cover more stores, but the demo should promise support only for the checkout flows it actually handles.
- Shoppers set their own rules, such as “pause purchases over $40 for 15 minutes.”
- Gemini converts a shopper-authored rule into structured settings. The shopper reviews and confirms those settings before they are saved.
- Checkout-time matching is deterministic. Do not call Gemini to decide whether the shopper is impulsive or whether a purchase is good for them.
- The intervention offers three outcomes: drop the purchase, save it for later, or continue. An optional friend check-in is a separate action, not a friend approval gate.
- Friend notifications and replies should use iMessage through Photon Spectrum. Photon must be a real two-way iMessage thread with memory of the pause context to support its prize track. The Photon project already exists. See Photon setup.
- Neon is the durable backend for user settings and event history.
- Spacetime is in scope for the demo.
- Cursor will be used for development. Gemini replaces Grok in the product stack.
- Apple Watch biometrics are not part of the core demo. A Watch integration is a later stretch. Do not claim that heart rate diagnoses addiction or determines whether a purchase is impulsive.

## User flow

1. **Set rules:** Shopper enters a plain-language rule in setup, for example: “Pause non-essential purchases over $40 for 15 minutes.”
2. **Parse and review:** Backend sends only the shopper-authored rule text to Gemini. Gemini returns proposed structured fields. The shopper edits or confirms them.
3. **Save rule:** Confirmed rule is stored in Neon and synced to the browser extension.
4. **Detect checkout:** On a supported checkout page, the extension detects the final checkout action and checks the saved rules locally.
5. **Show intervention:** If a rule matches, the extension holds the mock checkout and displays the matching rule and three choices: drop, save for later, or continue.
6. **Optional friend check-in:** Shopper explicitly chooses “Ask my friend.” Photon sends a limited check-in through the existing iMessage thread. Friend can respond supportively. Friend cannot approve or veto the purchase.
7. **Resolve and log:** Shopper chooses what to do after the hold. Record the outcome in Neon. The pause card updates when the friend responds.

## Privacy and product boundaries

- Do not capture or upload full-screen recordings or raw page contents.
- Do not share item name, price, merchant, screenshot, rule text, or biometric information with friends by default. Let the shopper choose what the friend sees.
- Store only event metadata needed by the product, such as event type, timestamps, rule ID, and outcome. Persist item details or URLs only when the shopper chooses “Save for later.”
- No payment, transfer, or bank action is part of the current product. The extension delays a supported checkout flow; it does not control the shopper’s bank account.
- No mental-health diagnosis or treatment claim. The product enforces user-authored preferences and offers social support.
- Browser support is limited to tested checkout flows. The mock store is the reliable demo path.

## Proposed architecture

- **Browser extension:** Chrome Manifest V3, TypeScript, React UI. Content script detects the supported checkout and shows the pause card. A local rules engine applies confirmed settings.
- **Mock store:** Small React storefront under team control with one reliable checkout action and seeded product/cart data.
- **Backend:** TypeScript API for rule setup, confirmation, friend linking, and event writes.
- **Gemini:** Natural-language rule text to proposed structured settings. Validate the schema and require shopper confirmation before saving.
- **Neon:** Durable users, confirmed rules, friend associations, saved-for-later items, and event log.
- **Photon:** `spectrum-ts` connected through Spectrum Cloud with the iMessage provider. Send and receive the friend check-in in a real iMessage thread. Keep credentials server-side.
- **Spacetime:** In scope for the demo. Neon is the durable record. Spacetime is the live pause row the pause card subscribes to.
- **Apple Watch, optional later:** Manual pause/check-in affordance first. Do not make biometric interpretation a dependency.

## State model for the event log

Suggested event states:

- `checkout_detected`
- `pause_started`
- `purchase_dropped`
- `saved_for_later`
- `continue_selected`
- `friend_ping_requested`
- `friend_message_sent`
- `friend_replied`
- `pause_resolved`

Use stable event IDs so retries do not create duplicate events. Do not log full screen contents.

## Sponsor targets

### Target

- **FinTech theme:** This is the primary theme.
- **MLH Gemini API:** Gemini performs a real language task by converting a shopper-authored rule into settings used by the product.
- **Neon:** Actual persistence for app users, rules, and event history.
- **Photon:** Friend support happens in a real iMessage conversation through Spectrum, with context and two-way replies.
- **Spacetime:** In scope for the demo.

### Conditional

- **Notability:** Qualifier if used during the hackathon for ideation and screenshots are included.
- **.tech domain:** Qualifier if a project domain is registered.
- **Figma:** Optional polish after the end-to-end interaction works.

### Not in current plan

- **SpaceXAI:** No Grok Imagine or Voice integration in this version. Cursor use alone does not make Grok a product integration.
- **Capital One Nessie:** No bank purchase or transfer is needed for the current action.
- **Fetch.ai:** The primary workflow is a browser extension, not an ASI:One conversation.
- **Presage / Apple Watch biometrics:** Not part of the core build.
- **Relay, ElevenLabs, FREE-WILi, Solana, Tiger Data:** No load-bearing role in the current demo.

## Build order

1. Build the mock store and extension pause card.
2. Implement one local rule and verify all three checkout outcomes.
3. Add the event log and persist rule/event data in Neon.
4. Add Gemini setup parsing, confirmation, and validation.
5. Set up Photon and prove a real two-way iMessage check-in. Done. See Photon setup. The friend check-in is not wired to a pause session yet.
6. Subscribe the pause card to the Spacetime live pause row.
7. Rehearse the 90-second demo, seed all accounts, and record a backup video.

## Photon setup

The Photon account, Pro plan, iMessage line, and demo thread are already live. Do not create a second project.

- Dashboard: https://app.photon.codes/ . CLI package: `@photon-ai/cli` (`npx @photon-ai/cli`). Login is a browser device code.
- Project name **Mhacks-26**, slug `mhack-4b4s`. Plan is Pro and active. Promo `HACKWITHPHOTON` is already applied.
- Credentials live in the repo-root `.env` as `SPECTRUM_PROJECT_ID` and `SPECTRUM_PROJECT_SECRET`. The API loads that file. Never commit those values.
- SDK is `spectrum-ts` on `@secondthought/api`, provider `imessage` from `spectrum-ts/providers/imessage`, Spectrum Cloud only. Do not install `@spectrum-ts/imessage-local`.
- iMessage platform is on. Spectrum profile first name is SecondThought.
- Pro uses the shared phone pool. `photon spectrum lines add` is Business-only and returns 403 on this project.
- Demo friend is `FRIEND_HANDLE` in `.env`, already a Spectrum user and opted in. The assigned line is in the Photon dashboard. A new number cannot be messaged until it is added as a Spectrum user and texts that line first. Otherwise send fails with `Target not allowed for this project`.
- `photon spectrum users add` requires `--first-name`, `--last-name`, `--email`, and `--phone` in E.164. Skip `--invite` unless that person should get a new onboarding text.
- Inbound events include read receipts. The message loop must act only when `message.content.type === "text"`. Replying to a receipt makes the reply generate another receipt and spams the thread.
- Two-way delivery on the demo thread is proven. The API logs inbound text only. It does not yet send the friend check-in or attach a reply to a pause session.

## Setup checklist

### Product and demo scope

- [ ] Confirm product name, currently **SecondThought**.
- [ ] Choose the exact browser and supported checkout flow for the demo.
- [ ] Create the mock store, demo product, cart, and checkout button.
- [ ] Choose one seeded rule, such as a $40 threshold and 15-minute pause.
- [ ] Decide what the friend is allowed to see. Default to a generic pause request.
- [ ] Define the event fields and the outcomes shown in the history.

### Developer environment

- [ ] Create the project repository and use Cursor.
- [ ] Set up Node.js and TypeScript for the extension, UI, and API.
- [ ] Scaffold and load the Chrome extension locally with permissions limited to the mock store during development.
- [ ] Create local `.env` handling and keep secrets out of source control.

### Gemini

- [ ] Create an API project and key.
- [ ] Implement natural-language rule parsing into a strict schema.
- [ ] Add schema validation and a review/confirm UI before a rule is saved.
- [ ] Seed a deterministic rule for the live demo in case the model call is slow.

### Neon

- [ ] Create a Neon project and database.
- [ ] Configure the connection string as a server-side secret.
- [ ] Create tables for users, rules, friend links, saved items, and pause events.
- [ ] Add a seed user, rule, and event history for the demo.

### Photon and iMessage

- [x] Create a Photon Spectrum project and obtain its project ID and secret.
- [x] Configure Spectrum Cloud with the iMessage provider.
- [x] Set up the `spectrum-ts` integration in the backend.
- [x] Pair a test friend and verify the real iMessage thread works in both directions.
- [ ] Implement explicit opt-in before sending each friend check-in.
- [ ] Ensure replies update the correct pause session and do not require friend approval.

### Spacetime

- [ ] Publish the `pause_status` module. Set `SPACETIMEDB_URI`, `SPACETIMEDB_DATABASE`, and `SPACETIMEDB_TOKEN` in the repo-root `.env`. The token stays on the API.
- [ ] Subscribe the shopper’s pause card to the active pause row.
- [ ] Demo the card changing when the friend replies.

### Submission and rehearsal

- [ ] Use Notability for process notes and capture the screenshots required for its qualifier, if pursuing it.
- [ ] Register a `.tech` domain if pursuing that qualifier.
- [ ] Prepare one clean end-to-end 90-second demo with seeded accounts and a ready iMessage thread.
- [ ] Record a backup demo video.
- [ ] Prepare sponsor explanations that point to each integration on the live path.
