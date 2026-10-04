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
- **Social:** a three-flame podium, a small leaderboard control, and a connection button. Connections are local to this demo; no messages or invitations are sent.
- **Profile:** your name, notification preference, and one of six flame colors. **Try a nudge** demonstrates a notification after five seconds.

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

## Designer handoff

The portable [Snuff design system](../design-system/snuff/README.md) includes an offline visual reference, JSON/CSS tokens, original flame assets, fonts, licenses, and interaction notes.
