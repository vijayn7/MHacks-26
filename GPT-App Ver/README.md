# GPT-App Ver · Snuff

A deliberately minimal React Native / Expo app built around a flame mascot and quiet notifications.

## Run

Requires Node.js 22.13 or newer.

    npm ci
    npm start

For the phone-sized browser preview:

    npm run web

## Three screens

- **Home:** pet the flame with a tap, vertical rub, or sideways stroke. A still 2.8-second hold records a pause; moving or releasing early cancels it. The savings sentence and weekly chart stay minimal.
- **Social:** a three-flame podium, an always-visible ranked list of names and savings, and a connection button. The leaderboard label is plain text; longer lists scroll on the page. Connections are local to this demo; no messages or invitations are sent.
- **Profile:** a large pettable flame, a mix of two colors from the six-hue palette, a luminous burn-rate slider, a row of friends’ flame avatars, and gentle notifications. Your name stays editable; **try a nudge** demonstrates a notification after five seconds.

A nudge has two choices: **Snuff this urge** records the sample purchase as estimated savings, or **Tomorrow, maybe** schedules another reminder. A completed nudge is counted once.

The sample account starts with $284 in estimated savings and 11 pauses. Progress, connections, colors, and preferences persist on the device. Existing progress from the previous Ember prototype migrates into the simpler schema.

## A living companion

Every flame is interactive, including podium flames, leaderboard avatars, Profile, and notification sheets. Taps give a small nuzzle; strokes sway and squish the body, close the eyes gradually, and send out soft light; longer contact builds a lingering warm aura. The user’s flame shares its contentment across screens, while friends retain their own moods for the current app session.

Bright, low, and resting levels adjust movement, light, breathing, and haptic frequency. Recording a pause rests the user’s flame for 2.4 seconds, then leaves it glowing softly before its brightness returns. Completed notification flames stay restful. Petting alone never changes financial totals or pause counts.

Native feedback uses soft iOS impacts and gentle Android ticks, throttled during strokes and holds. Desktop preview provides visual feedback; physical haptics still need a device check. Leaving a screen or backgrounding the app cancels active gestures and haptic timers. Reduced-motion preferences stop ambient movement and gesture tilting while preserving a soft glow. Keyboard Enter/Space and screen-reader activation can also pet the flame.

## Notifications

iOS and Android use expo-notifications for local notifications, permission requests, quiet Android channels, and notification actions. Notifications have no sound or vibration. Notification actions can snuff a purchase or remind the user tomorrow.

The browser demonstrates the same interaction inside the app while it is open. It does not send operating-system notifications or deliver reminders while the browser is closed.

Local delivery and haptics still need a physical-device or simulator check. No remote push backend, purchase detection, bank connection, Chrome extension, or companion website is implemented.

## Design sources

The connected [Figma file](https://www.figma.com/design/WHHOz06hrCV1a5g4nKBWt3/Design-System) was re-read through MCP for this revision. It currently exposes the Cover and Flame pages, including the v3 flame rebuild. The supplied node 90:2 is unavailable.

The user's photographed wireframe defines the screen composition. Its flame character is implemented as a reusable SVG mascot, layered over the unchanged Figma flame artwork. The blended mascot retains its rounded outline and minimal eyes while adding feathered gradient plumes, gently swaying trails, drifting embers, and a luminous core. All displayed app text, inputs, accessibility labels, and local notifications use lowercase. The current Neco and Satoshi families replace the earlier fonts; Roboto Mono remains for small metadata. The original six hue palettes, gradients, and breathing motion carry through the app.

All 18 original flame SVGs and their matching Figma PNG renders were refreshed through MCP. Browser rendering uses SVG; native rendering uses PNG to preserve the glows across native decoders. Each remains at 320 × 380 with uniform parent scaling. Node IDs, refresh time, and hashes are in assets/figma-manifest.json. Fontshare font license files are bundled in assets/fonts.

## Validate

    npm run check
    npx playwright install chromium
    npm run test:e2e
    npx expo-doctor
    npx expo export --platform all

State tests cover counting, notification idempotency, snoozing, connections, preferences, and migration. Browser journeys cover the three screens, canceled and completed holds, notification decisions and delivery, persistence, and the six mascot hues.

## Native builds

Configure an Expo account, signing, project association, and your own bundle identifiers before distributing.

    npx eas-cli@latest build --platform android --profile preview
    npx eas-cli@latest build --platform ios --profile preview

Native configuration lives in app.json. No generated ios/ or android/ folders are maintained.

Source routes are in src/app; the three screens are in src/screens. Shared components, design tokens, the typed reducer, persistence, and notification adapters live in their respective src folders. Storage uses snuff.mobile.v2.

## Profile design revision

The profile is pared back to a centered companion, one continuous two-color slider, an unboxed burn-rate control, and two quiet settings rows, while retaining Snuff’s rounded companion, existing three-tab navigation, typography, and lowercase copy. Color mixing applies to the user’s mascot across screens; other companions retain their own colors. Blend, burn rate, and trusted friend are saved on-device. Existing single-color profiles migrate without changing their flame color.

Burn rate currently saves a preference and displays gentle / balanced / mindful; it does not enforce purchase restrictions or change notification timing. Trusted-friend selection is local and does not send messages or require anyone’s approval. These controls are ready for a future backend integration. Web sliders support keyboard input and screen readers; native sliders use the Expo-compatible community module.

The burn-rate handle expands from a small dim light to a broad bright glow as its value increases, using the same response curve on native and web. The color blend has one gradient track with a neutral thumb; its endpoint swatches open the color picker.

## Home rhythm

Home’s goal-setting interface has been removed. Scroll beneath the savings chart for the interactive emotion orb, feeling choices, heart-rate context, and a quiet emotion display. Legacy blocking state remains compatible with saved installations.

Flame crowns continuously interpolate between organic SVG silhouettes, keeping the eyes and rounded base anchored. Motion slows with the flame’s status and continues while resting; it stops when the screen is inactive, the app is backgrounded, or reduced motion is enabled.

## Friend strip

Profile shows connected friends as a single row of small, pettable flame icons. The row measures its width, keeps 44-point touch targets, caps itself at ten slots, and reserves a slot for an ellipsis when needed. The ellipsis opens the full named circle; an empty circle links to Social. This replaces the single-friend picker without deleting existing connections or legacy preferences.

## Face customization

Profile has a compact color / face toggle beneath the companion. The face view offers classic, happy, dreamy, and wink, using the same vector eyes as the live mascot. The selected expression persists locally and follows the user’s companion through Home, Social, Profile, and sheets; friends retain their own classic eyes. Petting still eases the eyes into contentment, and resting status closes them without replacing the saved preference. Existing profiles default to classic.

Reuse `src/design/faces.ts` and `src/components/FlameFace.tsx` for expression choices and vector geometry; `Mascot.tsx` owns the petting transition. Controls support keyboard activation and expose their selected state.

## Notification popup

The notification opens a centered, rounded popup with a large pettable flame, a temporary wistful face, “snuff this urge?”, and side-by-side yes / no buttons. Yes is neutral grey; no uses the saved flame blend. Snuffing eases the companion down into a smaller ash-colored resting state and records the sample savings once. No restores the saved expression and keeps the flame colorful, dismissing the pending nudge without adding savings or pauses. An optional reminder on the no result can explicitly schedule it for tomorrow. Closing the popup records no decision.

“Ask a friend” opens the existing quiet circle and a generic request preview, with no purchase details included. Empty circles link to Social. Messaging is not connected and the preview explicitly states that nothing has been sent; friend approval does not gate the user’s choice. The popup is the in-app notification response screen; operating-system notification banners retain the platform’s native layout.

`src/components/Nudge.tsx` contains the popup, responsive layout, and subdued snuff animation; `FlameFace.tsx` supplies the temporary eyes without changing the saved profile expression. The usual companion petting, haptics, and reduced-motion behavior remain available. Mobile browser checks cover 320px / 390px widths, both decisions, idempotent savings, reminders, request previews, and empty-circle navigation.

## Archive and save for later

The fourth tab is Archive. “Save for later” in the notification popup (and the native notification category) stores the item’s name, amount, and original saved timestamp on-device, clears the reminder, and adds no savings or pauses. The popup links directly to Archive. Opening an archived item shows its details and lets the user revisit the decision or keep it for later. Repeated saves do not create duplicate records or change the original date. Resolved items retain their archive history.

The Archive recreates the composition and scrolling behavior of [Colton Tollett’s refracting-scroll reference on Bencho](https://bencho.dev/finds/colton-lens-scroll): Snuff’s dark canvas, transparent product illustrations, cream text, and flame-colored accents, with a centered column of floating objects that enlarge smoothly on focus, side labels on the focused item, and perspective bending / widening near the viewport edges. This is a React Native approximation of the reference’s optical distortion, not its original shader. Local vector product illustrations replace the reference’s machine photographs. Reduced motion keeps the cards flat; arrow controls and accessible labels support keyboard and screen-reader use. Long lists can be scrolled to either end.

Every reload replenishes six demo archive items by stable ID, retaining existing saved items without duplicating samples. Reuse `src/screens/Archive.tsx`, `src/components/ItemArtwork.tsx`, and `src/state/archive.ts`. The original saved date includes the year and is displayed in the device’s local time zone. Real purchase ingestion, product photos, merchant URLs, and checkout integrations are not connected in this prototype.

## System contacts

Social → connect with a friend now offers “sync contacts” alongside email. On iOS / Android it requests system access only when selected, loads the permitted names / emails / phone numbers in pages, and presents a searchable multi-select list. Limited iOS access is respected; denied access offers retry / Settings / email. Only selected contacts are persisted locally. Phone-only contacts work; repeated selections and matching email / normalized phone entries are deduplicated. No invitations, uploads, account discovery, or background synchronization occur. Refresh performs an on-demand reread.

`expo-contacts` ~57.0.6 uses the SDK 57 class-based `Contact.getAllDetails` API. `src/services/contacts.native.ts` connects to the OS; `contacts-access.ts` handles permissions and pagination. The browser service reports that system contacts require the mobile app and keeps email usable. `ContactSync.tsx` discards the temporary list when closed; `src/state/contacts.ts` validates and deduplicates selected records.

The config plugin supplies the iOS usage description, and Android blocks WRITE_CONTACTS while retaining READ_CONTACTS. A new native development / release build is required for this dependency and permission configuration; refreshing an existing binary is insufficient. Typecheck, lint, permission / pagination / cancellation / duplicate unit tests, browser fallback tests, and cross-platform exports were verified. Actual OS permission dialogs and device address-book access still need iOS / Android device testing.

## Designer handoff

See the [portable Snuff design system](../design-system/snuff/README.md) for assets, tokens, previews, and reusable companion components.

Slider feedback: all GlowSlider controls temporarily give the user’s flame happy eyes, faster crown flickering, and an extra rising spark. Releasing, canceling, leaving the screen, or backgrounding ends the reaction without changing the saved face or flame status. Keyboard/accessibility changes give a brief response. Reduced motion keeps the face and a static spark. Shared implementation: `src/hooks/useSliderCompanion.ts`.

## Minimal onboarding

A flame-only welcome with a small forward arrow leads into three concise screens: demo Google / Apple / email sign-in; purchase categories; and explicit amount/category rules with a separate reminder-tone slider. Open `/onboarding` to preview from the beginning. Profile → your spending preferences opens `/onboarding?edit=1`. Every reload restarts onboarding from the flame welcome while retaining saved preferences, archive items, and check-ins. Completion is session-only; strength uses `burnRate`, adjusting popup wording and flame tempo. Categories are preferences, not diagnoses or connected merchant rules.

Authentication is deliberately fake, as requested. Google and Apple advance locally; email validates syntax, then discards the address without sending or storing it. No account, session, or identity is established. Backend entry point: `src/screens/Onboarding.tsx` provider button callbacks and the email sheet. Replace these with the authentication provider and advance only on success; retain cancellation and guest entry. Google sign-in should not request Gmail inbox access. Preference completion dispatches `COMPLETE_ONBOARDING` in `src/state/model.ts`. Popup tone lives in `src/design/onboarding.ts`. No notification permission is requested during onboarding.

Collection illustrations now include detailed metal, lens glass, stitching, hardware, and dial marks. Transparent objects grow another 24% on hover, keyboard focus, or press via `ArchiveObject.tsx`, easing over 240 ms; reduced motion applies the scale instantly.

Interface cleanup: Social has no leaderboard heading. Archive removes its heading and preview captions. Profile shows the user’s name on the left and a settings gear on the right; the settings sheet contains name editing, spending preferences, and notification controls. Onboarding requires first and last name before demo sign-in or guest entry, then saves the combined name at completion.

## Integrated watch context

Watch context now lives inside the existing Home and purchase popup, with no separate moments screen or watch onboarding. Home replaces goal setup with a spacious interactive emotion orb, feeling choices, a heart-rate scale, and a quiet emotion display. Dragging the orb adjusts intensity. The Home save-check-in action has been removed; purchase BPM averages exclude previously saved daily check-ins. The popup always shows a compact emotion-gradient orb beside current BPM and an estimated emotion label. It has no manual emotion input. The shared watch feed updates both together while the popup is waiting; purchase actions remain in place. The latest reading and estimated feelings are saved locally once when the purchase is resolved. The legacy three-value storage tuple repeats that snapshot; it is not a before/after measurement sequence.

Profile settings → apple watch contains connect/disconnect, insights on/off, refresh reading, baseline, data clearing, and the display-data disclosure. All readings remain simulated and no Apple Health permission or connection exists. Simulator buttons, scenario selectors, trial purchase triggers, and demo captions are removed from the everyday UI. Old `/wearable` and `/moment` links redirect into Profile and Home. Backend handoff should replace the settings sample reading with consented, timestamped native data; the five-minute freshness gate and no-sharing behavior remain.

Flame motion is more expressive across all mascot instances: wider crown deformation, faster high/low/resting cycles, larger plume drift and ember travel, and stronger petting squish and sway. Slider excitement remains faster than idle; reduced-motion and background/focus guards are retained.

Burn rate has an info sheet explaining the manual 0–33 / 34–66 / 67–100 gentle/balanced/firm ranges, popup wording and flame tempo, without changing a spending budget. Social provides an outlined edit-friends control, individual edit buttons, persistent local names, and confirmed removal; removing a trusted friend clears that selection without changing savings.


### Live popup watch feed

`src/services/watch-feed.ts` supplies a scripted sample every two seconds while a connected watch’s purchase popup is open and the app is foregrounded. Closing, resolving, or disconnecting stops the stream. The display expires readings after five minutes and shows a neutral orb for missing emotion data. Daily self-reported feelings are never used as watch estimates.

Backend handoff: replace the sample adapter with consented native sample events that dispatch `WEARABLE` with `reading: { bpm, at, emotions, intensity }`. BPM and emotion data share one timestamp. Emotions are optional estimates from an upstream model, not a capability to infer a known emotion directly from heart rate. No Apple Health or native watch transport is implemented. The simulated-data disclosure remains in settings. This live view is the in-app notification/block popup; OS notification banners retain their native behavior.


### Explicit purchase rules

Onboarding uses a centered 440-point maximum content width, consistent gutters, a responsive mascot, labeled name fields, and a two-column category grid. On narrow phones name fields stack. Each step resets scroll position; all controls remain reachable by scrolling.

The final screen sets a per-item USD threshold (inclusive, up to two decimal places), category matching, and either/both semantics when both conditions are enabled. Each condition can be disabled independently; at least one valid condition is required. The rule summary states what will cause the pause. Reminder tone is separate: it changes popup wording and flame animation, not the amount or category rule. Rules can be edited through Profile settings → spending preferences.

`src/state/purchase-rules.ts` validates/migrates rules and evaluates purchases. `useStore().receivePurchase({id,name,amount,category})` is the ingestion entry point: only matching purchases create/open a popup; repeated resolved IDs do not reopen. The reducer independently applies the same rules. Existing archive revisits and “try a nudge” remain deliberate manual previews. Real merchant checkout interception is not connected; onboarding states that boundary. No timed or irreversible payment block is implied.


## Minimal Home and extension score

Home now contains the pettable flame, savings statement, line chart with soft radial-gradient orb markers, and Snuff score. Holding the Home flame no longer dispatches a pause; ordinary petting reactions remain. The entire “a moment for you” section and its scroll hint are removed. Watch context remains in the purchase popup and settings. Current visual: `previews/snuff-home-score.png` in the design kit.

Score is 10 points per explicit Chrome extension Drop action. The extension posts `impulse_opt_out` with a stable checkout-derived ID; the API exposes only deduplicated IDs at `GET /score`. Legacy `purchase_dropped` events cannot distinguish a shopper choice from a friend-triggered outcome and are deliberately excluded. Save-for-later, continuing, in-app nudges, and flame petting do not award score. No sample score is seeded.

The app polls every 10 seconds while Home is active and the app is foregrounded. Confirmed IDs are cached locally and deduplicated across refresh/reload. On failure the last score remains with an offline caption. Set `EXPO_PUBLIC_EXTENSION_API_URL` to the API base URL (default `http://localhost:8787`; use a reachable host for phones). The API permits the app origin using `SNUFF_APP_ORIGIN` (default `http://localhost:8081`) on the score endpoint; the existing store origin is unchanged. Rebuild/reload the unpacked extension and restart the API for this integration.

This uses the repository’s existing single-user demo event log. Production must authenticate and scope events by user before sharing a deployed API; no cross-account identity linkage is implemented here. The API stores events in Neon when configured, otherwise in memory.


Social’s “my friends” heading sits directly above the ranked list. Adjacent 44-point edit and add icon buttons replace the old top edit pill and bottom connect row. Edit toggles to a highlighted checkmark; add opens the existing email/contact-sync sheet.
