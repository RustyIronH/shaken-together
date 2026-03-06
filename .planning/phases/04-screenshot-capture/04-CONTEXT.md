# Phase 4: Screenshot Capture - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can freeze the current ragdoll positions and capture a clean screenshot for sharing. Includes a capture button, physics freeze, effects toggle, preview overlay, and save-to-device. No replay clips (Phase 5), no Web Share API sharing (Phase 5), no gallery upload (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Capture trigger
- Floating action button (camera icon) in the bottom-right corner, always visible
- Button stays on screen at all times, including during active shaking
- Brief white flash overlay (~200ms) on tap as shutter feedback
- Capture button and fallback shake button coexist in different corners (capture bottom-right, shake bottom-left) for non-motion users

### Freeze behavior
- Physics freezes immediately on capture tap — scene pauses at the captured moment
- No posing/dragging while frozen — preview is read-only
- Physics resumes from frozen state when preview is dismissed (no reset)
- Capture button hidden/disabled while preview overlay is showing — must dismiss before re-capturing

### What gets captured
- Effects toggle in the preview overlay: ON shows frozen-in-place effects, OFF shows clean ragdolls + background only
- Default: effects OFF (clean pose) — user opts in for action-shot look
- When effects ON, shows speed lines, impact flashes, and squash-stretch exactly as they were at the moment of capture (frozen in place, not re-rendered)
- Two render passes needed: one with effectsLayer visible, one without

### Preview experience
- Full-screen dark semi-transparent overlay with captured image centered and slightly inset
- Fade-in transition after white flash (~200ms flash out, ~200ms overlay fade in, ~400ms total)
- Controls below the image: effects toggle (ON/OFF), Save button, Discard button
- Save triggers PNG file download to user's device
- Discard dismisses the overlay and resumes physics
- PNG format (lossless, crisp, PixiJS extract API native output)

### Claude's Discretion
- Capture button icon design and sizing
- Exact overlay styling (backdrop opacity, image inset amount, button styles)
- Effects toggle visual design (switch, checkbox, icon toggle)
- PNG filename convention
- White flash implementation (CSS overlay vs canvas)
- PixiJS extract API usage details

</decisions>

<specifics>
## Specific Ideas

- The freeze-then-preview flow makes capture feel intentional — "I captured THIS moment"
- Effects toggle gives users creative control: clean posed shots vs dynamic action shots from the same capture
- White flash is a universal camera convention — instant recognition of "something was captured"
- Save-to-device bridges the gap until Phase 5 adds proper sharing

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/renderer/pixi-renderer.ts`: PixiRenderer with `app`, `backgroundLayer`, `ragdollLayer`, `effectsLayer` — layer visibility toggling for clean vs effects capture
- `src/renderer/pixi-renderer.ts`: PixiJS Application with `app.renderer.extract` API for canvas-to-image conversion
- `src/input/shake-button.ts`: Floating button pattern with z-index management — same pattern for capture button
- `src/ui/onboarding-hint.ts`: CSS transition-based fade animations — reusable for overlay transitions

### Established Patterns
- UI elements in `#ui-root` div, separate from PixiJS canvas — preview overlay follows same pattern
- Pointer Events with setPointerCapture for reliable touch (shake-button) — capture button follows same approach
- Z-index layering: canvas < shake button (z:50) < panel (z:100+) — preview overlay needs highest z-index
- Physics engine start/stop via Matter.Runner — freeze/resume uses `Runner.stop(runner)` / `Runner.start(runner, engine)`

### Integration Points
- `src/main.ts`: Game loop ticker — needs capture trigger integration, physics freeze/resume
- `src/renderer/pixi-renderer.ts`: PixiRenderer.effectsLayer — toggle visibility for clean captures
- `src/main.ts:173`: `startEngine(engine)` — Runner reference needed for freeze/resume
- `src/ui/panel.ts` or new `src/ui/` module — preview overlay UI

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-screenshot-capture*
*Context gathered: 2026-03-06*
