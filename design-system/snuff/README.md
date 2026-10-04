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

Archive is the fourth navigation destination (home / social / archive / profile). See `previews/snuff-archive.png` for the labeled sample collection and `previews/snuff-save-for-later.png` for the popup action.

Reference: [Colton Tollett’s refracting scroll, via Bencho](https://bencho.dev/finds/colton-lens-scroll). The app reproduces the cream canvas, centered square-card column, focused side labels, and edge bending using perspective/scale interpolation rather than the original optical shader. The local product illustrations are new vector placeholders, not the reference’s machine photographs. Archive-specific colors: paper `#F2EEE6`, ink `#383A32`, muted `#96958A`; tile 104 points, row 128 points. Reduced motion keeps cards flat.

Reusable files: `../../GPT-App Ver/src/screens/Archive.tsx`, `../../GPT-App Ver/src/components/ItemArtwork.tsx`, and `../../GPT-App Ver/src/state/archive.ts`. Save-for-later preserves name, amount, and original saved timestamp locally without incrementing savings or pauses. Duplicate saves retain the original date; archived items reopen their decision. Empty archives offer a labeled sample collection that never writes fictional saved history. No merchant URL or real product-image ingestion is connected. Native notification categories also expose the save action; native device delivery still requires device testing.
