# Urge overlay interface (backend handoff)

Contract for the checkout **urge overlay** shown by the Chrome extension / landing demo.
Landing currently renders a static visual mock; wire the extension overlay to these actions and payloads.

Friend check-in is **support only** — never an approve / veto gate.

## Preview

- **Dedicated overlay preview:** [http://localhost:5174/overlay.html](http://localhost:5174/overlay.html)
- **In-context on landing:** [http://localhost:5174/](http://localhost:5174/) — hover any bright front window

Repo path for the preview entry: `apps/landing/overlay.html`

---

## 1. Overlay content (what the UI shows)

| Slot | Required | Notes |
|------|----------|--------|
| `title` | yes | Fixed copy today: `snuff this urge?` |
| `productLabel` | yes | Short product / cart line (e.g. `Nike Dunk Low · $120`). Do **not** send to the friend by default. |
| `body` | yes | Fixed copy today: `let this purchase go. keep the money for what matters.` |
| `site` | optional | Merchant / host label for a11y (`aria-label`). Metadata only. |
| `flame` | optional | Per-site accent palette for the sleeping-flame art + primary button. |
| `friendReply` | optional | Soft status line after “ask a friend”. Empty until sent / replied. |
| `sessionId` | yes (live) | Stable pause id for events, check-in, and live status. |

### Flame palette (visual only)

```ts
type FlamePalette = {
  tip: string;    // hex
  mid: string;
  base: string;
  core: string;
  button: string; // primary “yes” button fill
  glow: string;   // CSS rgb triplet without `rgb()`, e.g. "245 165 36"
};
```

---

## 2. User actions (buttons)

| UI control | Action id | Closes overlay? | Meaning |
|------------|-----------|-----------------|---------|
| **yes** | `snuff` | yes | Drop / snuff the purchase. |
| **ask a friend** | `ask_friend` | no | Opt-in iMessage check-in. Friend cannot approve/deny. |
| **save for later** | `save_for_later` | yes | Persist item for later (item details allowed only for this path). |
| **no, continue purchase** | `continue` | yes | Resume checkout. Demoted visually; still a real outcome. |
| **× close** | `dismiss` | yes | Treat like cancel of the dialog only if not decided; prefer mapping to `continue` or no-op once decided. |

Action priority for wiring: `snuff` → `ask_friend` → `save_for_later` → `continue`.

---

## 3. Session + event log

Use a stable `sessionId` (extension today: `chrome-${uuid}`).

Event `id`s must be idempotent (retries must not duplicate), e.g. `${sessionId}:${type}`.

### Event types

| Type | When |
|------|------|
| `checkout_detected` | Overlay about to open / checkout matched a rule |
| `pause_started` | Overlay visible |
| `impulse_opt_out` | Shopper chose **yes** (snuff) — scoring opt-out |
| `purchase_dropped` | Snuff confirmed / overlay closed as dropped |
| `saved_for_later` | Shopper chose save for later |
| `continue_selected` | Shopper chose continue |
| `friend_ping_requested` | Shopper tapped ask a friend |
| `friend_message_sent` | Outbound iMessage actually sent |
| `friend_replied` | Inbound supportive text received |
| `pause_resolved` | Overlay closed after a deciding action |

Do **not** log full page contents, screenshots, or raw HTML.

### Event payload

```ts
type PauseEvent = {
  id: string;                 // stable, e.g. `${sessionId}:pause_started`
  type: PauseEventType;
  ruleId: string | null;
  at: string;                 // ISO-8601
};

type PauseEventType =
  | "checkout_detected"
  | "pause_started"
  | "impulse_opt_out"
  | "purchase_dropped"
  | "saved_for_later"
  | "continue_selected"
  | "friend_ping_requested"
  | "friend_message_sent"
  | "friend_replied"
  | "pause_resolved";
```

`POST /events` body: `{ id, type, ruleId }` (server stamps `at`).

---

## 4. HTTP endpoints the overlay talks to

Base URL today: `http://localhost:8787` (API). Keep credentials server-side.

### Pause session

| Method | Path | Body / query | Overlay use |
|--------|------|--------------|-------------|
| `POST` | `/pauses` | `{ id, name, amount, source: "chrome" }` | Create session when overlay opens |
| `GET` | `/pauses?id=` | — | Poll remote status: `snuffed` \| `kept` \| `saved` |
| `POST` | `/pauses/clear` | — | Demo reset only |

Remote status → UI close mapping:

| Status | Overlay outcome |
|--------|-----------------|
| `snuffed` | close as dropped |
| `saved` | close as saved |
| `kept` | close as continue |

### App money-loop actions (Snuff slice)

`POST /app/actions` with `{ id, action }`:

| Overlay action | `action.type` | Notes |
|----------------|---------------|--------|
| yes / snuff | `SNUFF_NUDGE` | include `id: sessionId`, `at` |
| save for later | `SAVE_FOR_LATER` | include `id`, `at`; may include item fields shopper opted to keep |
| continue | `KEEP_NUDGE` | include `id` |

Action envelope id: `${sessionId}:${action.type}` (idempotent).

### Friend check-in (Photon / iMessage)

| Method | Path | Body / query | Overlay use |
|--------|------|--------------|-------------|
| `POST` | `/check-in` | `{ id: sessionId, ruleId }` | After **ask a friend** |
| `GET` | `/check-in?id=` | — | Poll `{ status, reply }` |

UI states for friend line:

1. Idle — hidden  
2. Sending — button disabled (`Asking…`)  
3. Waiting — `Text sent. Waiting for a supportive reply.` (or already-waiting copy)  
4. Replied — `Friend: {reply}`  

Friend reply **must not** unlock / block purchase buttons.

### Optional live status (Spacetime)

| Method | Path | Use |
|--------|------|-----|
| `GET` | `/spacetime` | `{ uri, database }` for client subscription |

Live row shape:

```ts
type PauseStatusRow = {
  sessionId: string;
  state: "open" | "snuffed" | "kept" | "saved" | "replied" | string;
  friendReply?: string | null;
};
```

If `state` is a deciding status, close overlay the same as `GET /pauses`.  
If `state === "replied"` and `friendReply` is set, show the friend line only.

---

## 5. Suggested client state machine

```ts
type OverlayPhase =
  | "hidden"
  | "open"           // pause_started
  | "asking_friend"  // check-in in flight
  | "waiting_friend" // message sent / waiting
  | "friend_replied" // reply shown; still open
  | "resolved";      // deciding action taken; closing

type OverlayDecision = "snuff" | "save_for_later" | "continue" | null;
```

Rules:

1. Only one deciding action per `sessionId` (`decided` latch).  
2. `ask_friend` never sets `decided`.  
3. On decide → write events + app action → `pause_resolved` → hide.  
4. Phone / Spacetime remote decide can resolve an open overlay.

---

## 6. Privacy boundaries (must keep)

Default friend message: generic pause support request only.

Do **not** share by default:

- item name / price / merchant  
- rule text  
- screenshots / page HTML  
- biometrics  

Persist item details / URLs only when the shopper chooses **save for later**.

---

## 7. Landing mock vs extension

| Surface | Role |
|---------|------|
| `apps/landing` `UrgeOverlay` | Visual / marketing mock (hover demo). Buttons not wired. |
| `apps/extension` content script | Real overlay to integrate against this contract. |

When implementing, prefer matching **landing copy + layout slots** while keeping the **extension’s** event / `/pauses` / `/check-in` / `/app/actions` wiring.

### Landing action labels (exact)

- `yes`
- `ask a friend`
- `save for later`
- `no, continue purchase`

---

## 8. Minimal integration checklist

- [ ] Open overlay → `POST /pauses` + `checkout_detected` + `pause_started`  
- [ ] **yes** → `impulse_opt_out` + `SNUFF_NUDGE` + `purchase_dropped` + `pause_resolved`  
- [ ] **save for later** → `SAVE_FOR_LATER` + `saved_for_later` + `pause_resolved`  
- [ ] **continue** → `KEEP_NUDGE` + `continue_selected` + `pause_resolved`  
- [ ] **ask a friend** → `POST /check-in` + poll / Spacetime for reply (no gate)  
- [ ] Remote phone status can close an open overlay  
- [ ] Idempotent event and action ids  
- [ ] No page capture; friend sees generic check-in by default  
