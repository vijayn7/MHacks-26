# snuff design system · GPT-App Ver

A portable handoff for designers and developers. Download this folder or clone the repository; open **index.html** in any browser for an offline visual reference. No npm installation is required for the kit.

## Files

- `tokens.json`: framework-neutral colors, six flame palettes, font aliases, spacing, and radii. Numeric spacing/radius values use px (logical points in React Native).
- `tokens.css`: matching CSS custom properties and local font faces. Import it into other web work.
- `assets/fonts/`: Neco, Satoshi, and Roboto Mono, with their original font licenses.
- `assets/flames/`: 18 original Figma SVG exports, plus native PNG renders in `native/`. Preserve their 320 × 380 aspect ratio.
- `assets/figma-manifest.json`: Figma source nodes and export provenance. Paths resolve from this kit directory.
- `previews/`: app screenshots; `snuff-companion.jpg` shows the latest contented interaction. Other screenshots document screen composition.

## Source and reuse

[Figma design system](https://www.figma.com/design/WHHOz06hrCV1a5g4nKBWt3/Design-System). These are the assets already captured for the app revision, not a new live Figma sync. The original exports remain unchanged. The rounded Snuff companion is a code composition that blends those atmospheric flames with the user's mascot direction; it is not itself an original Figma export.

The canonical app tokens are in `../../GPT-App Ver/src/design/tokens.ts`. Update the JSON and CSS handoff when those tokens change. Font aliases in JSON are React Native registration names; the CSS maps them to usable font families. Neco Regular is the bundled display weight; do not assume a Light font is included.

For the living companion implementation, use these files together from `../../GPT-App Ver/`:

- `src/components/Mascot.tsx` and `Flame.tsx`: rounded body, minimal eyes, plumes, embers, aura, and level rendering.
- `src/state/Companion.tsx`: shared warmth and mood across screens.
- `src/hooks/usePetting.ts`: taps, strokes, holds, haptics, gesture cancellation, and accessibility.
- `src/design/`: tokens and platform-specific asset maps.

The app README documents providers, runtime setup, native limitations, and validation. The kit grants no additional rights to Figma artwork; use the team's existing design permissions. Font licenses are included separately. The app's Expo scaffold retains its upstream MIT notice.

## Visual principles

All app copy is lowercase. Use a black canvas, generous empty space, Neco display text, Satoshi body text, and Roboto Mono metadata. Keep the flame dominant; avoid extra cards, borders, or explanatory UI. Home centers the companion over one savings sentence and a weekly graph. Social uses a three-flame podium. Profile stays compact.

## Interaction specification

Taps produce a small nuzzle. Gentle vertical or sideways strokes sway and squish the flame, gradually close its eyes, and expand a warm aura. Longer contact increases contentment; warmth lingers 5.5 seconds after release and fades over 14 seconds. The same companion identity retains its mood across screens; friends have separate moods during the app session.

Bright, low, and resting states scale light, movement, and feedback. A completed home pause rests the flame for 2.4 seconds, then keeps it low until 11 seconds. A still home hold of 2.8 seconds records one pause; moving more than 7 points cancels that action while retaining petting. Petting alone never changes totals.

Native haptics are gently throttled; browser previews show visual feedback only. Reduced motion removes ambient movement and gesture tilting while retaining soft light. Enter/Space and screen-reader activation also pet the companion. Cancel active gestures and haptic timers on blur, backgrounding, or unmount.

## Profile settings composition

The latest profile reference is `previews/snuff-profile-minimal.png`. Keep the companion centered and unboxed. Use a single gradient color track between two small endpoint swatches, a burn-rate control without a card, and quiet friend / notification rows. Keep the existing three-tab navigation and lowercase copy.

The burn-rate glow grows from 28 to 96 logical pixels and increases from 30% to full opacity as the slider moves right. Both platform implementations share `src/design/slider.ts`. Color blending uses `src/design/blend.ts`; native and web controls live in `src/components/GlowSlider.tsx` and `.web.tsx`. The user’s color mix remains shared across screens.

Profile preferences persist locally. Burn rate and trusted-friend selection are prototype preferences; backend restriction enforcement and messaging are not connected.

## Continuous burning and goal setup

The companion’s crown now morphs continuously between organic outlines while its base and eyes stay anchored. `src/design/flame-motion.ts` defines matching SVG keyframes, and `src/components/Mascot.tsx` adjusts their speed to bright / low / resting states. Reduced-motion settings, backgrounding, and inactive screens stop the loops. Existing petting behavior is preserved.

Home scrolls below the weekly graph into a quiet goal component (`previews/snuff-home-goal.png`). `src/components/GoalFlow.tsx` presents five steps in bottom sheets: goal, websites and purchase limits, schedule, response, review. A setup reference is in `previews/snuff-goal-block-setup.png`. Keep typography, chips, fields, and actions aligned with the existing tokens. Saved plans and rules are handled by `src/state/blocking.ts` and `src/state/model.ts`.

Rules are testable in an in-app checkout preview, including actual local countdowns and optional early-continuation reasons. External blocking is not connected. Preview activity never creates real purchases, savings, or messages.

## Friend avatar row

The current profile reference is `previews/snuff-friend-strip.png`. Replace the single-friend setting with one unwrapped row of 44-point pettable flame avatars separated by 6 points. Measure the available width, cap at ten slots, and reserve the final slot for an ellipsis when the list exceeds capacity. The ellipsis opens the full named circle. Reuse `src/components/FriendStrip.tsx`; empty circles link to Social.

## Face customization

The latest profile reference is `previews/snuff-faces.png`. A compact color / face toggle switches between the existing gradient control and four expression buttons: classic, happy, dreamy, wink. Keep the control region the same height to avoid layout jumps. Selected buttons have a faint ivory outline and fill.

Reuse `../../GPT-App Ver/src/design/faces.ts` and `../../GPT-App Ver/src/components/FlameFace.tsx`. Vector eyes stay anchored to the mascot’s original face coordinates; the same component renders the selector previews and live eyes. `Mascot.tsx` eases every expression into contented eyes when petted or resting. The locally saved face applies to the user’s companion across screens; friend expressions are unchanged. Older profiles safely default to classic.

## Notification popup

See `previews/snuff-notification.png` and `previews/snuff-notification-friend.png`. The in-app notification is a centered 390-point maximum-width popup with 36-point corners, a dark translucent backdrop, a large pettable companion, and a temporary wistful face. Yes / no sit side by side: neutral grey for yes, the saved flame blend for no. A separate outlined friend action opens the quiet circle. Keep all copy lowercase.

Yes shrinks and dims the flame over 1.1 seconds, easing it through low into ash/resting, and records the sample savings once. No restores the saved face, keeps the flame colorful, and dismisses the nudge without adding savings or pauses. A reminder remains available after no. Reduced motion removes the settling movement. Reuse `../../GPT-App Ver/src/components/Nudge.tsx` and the expression override in `Mascot.tsx` / `FlameFace.tsx`.

The friend path previews a generic supportive check-in without purchase details. Messaging is not connected and no request is sent; friends do not gate the shopper’s choice. Operating-system notification banners use their native layouts; this reference is the app popup opened by a notification.

## Archive and save for later

Archive is the fourth navigation destination (home / social / archive / profile). See `previews/snuff-archive-objects.png` for the labeled sample collection and `previews/snuff-save-for-later.png` for the popup action.

Reference: [Colton Tollett’s refracting scroll, via Bencho](https://bencho.dev/finds/colton-lens-scroll). The app uses Snuff’s dark design tokens with the reference’s centered transparent-object column, focused side labels, and edge bending using perspective/scale interpolation rather than the original optical shader. The local product illustrations are new vector placeholders, not the reference’s machine photographs. Shared tokens: `colors.bg`, `colors.surface`, `colors.text`, and `colors.secondary`, with the selected flame palette for price; artwork 112 points, row 140 points; focused objects scale to 145% with gentler edge distortion. Reduced motion keeps cards flat.

Reusable files: `../../GPT-App Ver/src/screens/Archive.tsx`, `../../GPT-App Ver/src/components/ItemArtwork.tsx`, and `../../GPT-App Ver/src/state/archive.ts`. Save-for-later preserves name, amount, and original saved timestamp locally without incrementing savings or pauses. Duplicate saves retain the original date; archived items reopen their decision. Every reload replenishes six demo archive items by stable ID, retaining existing items without duplicating samples. No merchant URL or real product-image ingestion is connected. Native notification categories also expose the save action; native device delivery still requires device testing.

## System contacts

`previews/snuff-contacts.png` shows the new sync-contacts row above the existing email field. Native builds request OS contact access on demand and show a searchable selection list. Keep name / email / phone only; persist selected contacts, deduplicate existing friends, and never imply that invitations were sent. Limited access, denied access with Settings, empty results, load errors, cancellation, and the browser fallback have distinct states. No background synchronization or account discovery is connected.

Reuse `../../GPT-App Ver/src/components/ContactSync.tsx`, the `src/services/contacts*` adapters, and `src/state/contacts.ts`. The Expo Contacts config plugin and iOS purpose string are configured in app.json; Android contact writes are blocked. Rebuild the native app for the new module and permissions. OS dialogs and real address books require device validation; the browser preview does not access contacts.

Social now shows the ranked leaderboard inline beneath the podium, with a plain text label. See `previews/snuff-leaderboard.png`.

Slider feedback: all GlowSlider controls temporarily give the user’s flame happy eyes, faster crown flickering, and an extra rising spark. Releasing, canceling, leaving the screen, or backgrounding ends the reaction without changing the saved face or flame status. Keyboard/accessibility changes give a brief response. Reduced motion keeps the face and a static spark. Shared implementation: `../../GPT-App Ver/src/hooks/useSliderCompanion.ts`.

## Minimal onboarding

A flame-only welcome with a small forward arrow leads into three concise screens: demo Google / Apple / email sign-in; purchase categories; and explicit amount/category rules with a separate reminder-tone slider. Open `/onboarding` to preview from the beginning. Profile → your spending preferences opens `/onboarding?edit=1`. Every reload restarts onboarding from the flame welcome while retaining saved preferences, archive items, and check-ins. Completion is session-only; strength uses `burnRate`, adjusting popup wording and flame tempo. Categories are preferences, not diagnoses or connected merchant rules.

Authentication is deliberately fake, as requested. Google and Apple advance locally; email validates syntax, then discards the address without sending or storing it. No account, session, or identity is established. Backend entry point: `src/screens/Onboarding.tsx` provider button callbacks and the email sheet. Replace these with the authentication provider and advance only on success; retain cancellation and guest entry. Google sign-in should not request Gmail inbox access. Preference completion dispatches `COMPLETE_ONBOARDING` in `src/state/model.ts`. Popup tone lives in `src/design/onboarding.ts`. No notification permission is requested during onboarding.

Collection illustrations now include detailed metal, lens glass, stitching, hardware, and dial marks. Transparent objects grow another 24% on hover, keyboard focus, or press via `ArchiveObject.tsx`, easing over 240 ms; reduced motion applies the scale instantly.

Interface cleanup: Social has no leaderboard heading. Archive removes its heading and preview captions. Profile shows the user’s name on the left and a settings gear on the right; the settings sheet contains name editing, spending preferences, and notification controls. Onboarding requires first and last name before demo sign-in or guest entry, then saves the combined name at completion.

Flame motion is more expressive across all mascot instances: wider crown deformation, faster high/low/resting cycles, larger plume drift and ember travel, and stronger petting squish and sway. Slider excitement remains faster than idle; reduced-motion and background/focus guards are retained.

Burn rate has an info sheet explaining the manual 0–33 / 34–66 / 67–100 gentle/balanced/firm ranges, popup wording and flame tempo, without changing a spending budget. Social provides an outlined edit-friends control, individual edit buttons, persistent local names, and confirmed removal; removing a trusted friend clears that selection without changing savings.


### Explicit purchase rules

Onboarding uses a centered 440-point maximum content width, consistent gutters, a responsive mascot, labeled name fields, and a two-column category grid. On narrow phones name fields stack. Each step resets scroll position; all controls remain reachable by scrolling.

The final screen sets a per-item USD threshold (inclusive, up to two decimal places), category matching, and either/both semantics when both conditions are enabled. Each condition can be disabled independently; at least one valid condition is required. The rule summary states what will cause the pause. Reminder tone is separate: it changes popup wording and flame animation, not the amount or category rule. Rules can be edited through Profile settings → spending preferences.

`src/state/purchase-rules.ts` validates/migrates rules and evaluates purchases. `useStore().receivePurchase({id,name,amount,category})` is the ingestion entry point: only matching purchases create/open a popup; repeated resolved IDs do not reopen. The reducer independently applies the same rules. Existing archive revisits and “try a nudge” remain deliberate manual previews. Real merchant checkout interception is not connected; onboarding states that boundary. No timed or irreversible payment block is implied.


## Minimal Home and extension score

Score is 10 points per explicit Chrome extension Drop action. The extension posts `impulse_opt_out` with a stable checkout-derived ID; the API exposes only deduplicated IDs at `GET /score`. Legacy `purchase_dropped` events cannot distinguish a shopper choice from a friend-triggered outcome and are deliberately excluded. Save-for-later, continuing, in-app nudges, and flame petting do not award score. No sample score is seeded.

The app polls every 10 seconds while Home is active and the app is foregrounded. Confirmed IDs are cached locally and deduplicated across refresh/reload. On failure the last score remains with an offline caption. Set `EXPO_PUBLIC_EXTENSION_API_URL` to the API base URL (default `http://localhost:8787`; use a reachable host for phones). The API permits the app origin using `SNUFF_APP_ORIGIN` (default `http://localhost:8081`) on the score endpoint; the existing store origin is unchanged. Rebuild/reload the unpacked extension and restart the API for this integration.

This uses the repository’s existing single-user demo event log. Production must authenticate and scope events by user before sharing a deployed API; no cross-account identity linkage is implemented here. The API stores events in Neon when configured, otherwise in memory.


Social’s “my friends” heading sits directly above the ranked list. Adjacent 44-point edit and add icon buttons replace the old top edit pill and bottom connect row. Edit toggles to a highlighted checkmark; add opens the existing email/contact-sync sheet.


Archive uses a bookmark navigation icon. A muted source label appears below the saved date and in item details. Save source is persisted and retained across revisits; incoming purchases accept an optional `source` (merchant or channel label). Existing Snuff saves fall back to “snuff”; seeded items use “demo collection.” Source text is normalized to lowercase and capped at 80 characters.


Profile removes the “try a nudge” action and its scheduling handler. “Gentle reminders” now has the description “weekly recaps of your score and the money you saved.” This is the settings copy; a weekly recap delivery job is not implemented by this interface change.


Onboarding’s welcome now reads “snuffed” and “snuff your impulse spending.” Sign-in places an inline email field with a validated arrow action above an “or” divider, followed by Google, Apple, and guest buttons with aligned icons. First and last name remain required. The demo caption and separate email sheet are removed; authentication remains the intentionally local placeholder flow.


## Conversational onboarding and suggested levels

After welcome and sign-in, the third page is a chat-style conversation asking what brought the user to Snuffed. Four quick replies cover shopping, sports betting, impulse purchases, and saving more. Users can also type a reply. The current local adapter provides supportive scripted responses and suggests categories without uploading or persisting the free-text conversation; it is not a connected AI service or diagnostic model. Replace the adapter only with an explicitly configured backend.

The fourth page offers light ($150, gentle), balanced ($75, balanced), and strong ($25, firm) starting points. Each has an expandable adjustment panel containing an amount input, tone dropdown, category choices, and an either/both dropdown. Each card retains its own edits while comparing levels. Only the selected level’s rules and tone are persisted on Start. Light defaults to both conditions; balanced and strong default to either. Without categories, only amount applies. Amount validation, local persistence, and the existing purchase matcher remain in use.


## Preference refinement and purchase demo

Settings → refine preferences opens the conversation with the current threshold. Local parsing recognizes a dollar threshold and gentler/firmer reminder requests, while the existing category suggestions carry forward. Changes remain drafts until reviewed in the restriction cards and saved. Cancel returns to Profile without saving; saving preferences returns there too. Personal free-text replies remain local and ephemeral; live AI is not connected.


Onboarding transitions fade out over 120 ms and ease the next screen in over 300 ms. `SoftPressable` adds a palette-colored glow on press, fading away over 320 ms; onboarding choices and shared QuietButtons use it. Reduced motion makes both immediate. Animations stop on unmount, and duplicate step actions are guarded during fade-out.


## Chat-only preference confirmation

The separate three-level restriction screen is removed from onboarding and preference editing. The conversation collects a reason, a per-purchase amount, and reminder tone, then shows a confirmation message with the exact amount, categories, either/both semantics, and what the overlay does. Inline reply controls let users revise amount/tone/categories and matching logic without leaving chat. Preferences save only on “confirm & continue” or “confirm & try purchase demo.” Skip leads to review, never silently saves.

Replies use a 750 ms simulated typing state with three softly pulsing dots; inputs are unavailable while a reply is pending. Pending callbacks are cleared on unmount, chat follows new messages, and reduced motion leaves dots static. This is scripted local response pacing, not remote AI processing. Free-text chat remains ephemeral and is not uploaded.

## Sample storefront and full-screen pause

Settings → sample purchase opens a distinct light storefront with studio headphones, a price, and a buy-now action. The web storefront is a separate local HTML document hosted in an iframe; native builds use a matching storefront screen. Amount and category are evaluated against confirmed purchase rules. Matching purchases show an edge-to-edge Snuff takeover, with the companion and skip, continue, save-for-later, and friend-preview actions. Nonmatching purchases continue in the sample store. No payment occurs and no operating-system control is claimed. Returning to the store displays the decision. Saves use “sample store” as their source; local sample decisions do not award Chrome score.

The product centers on user-confirmed spending rules and checkout decisions. It collects no biometric or inferred-emotion data. Old locally stored sensor data is discarded during migration.
