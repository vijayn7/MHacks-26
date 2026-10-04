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
