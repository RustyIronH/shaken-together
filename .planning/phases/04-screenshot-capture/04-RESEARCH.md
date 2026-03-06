# Phase 4: Screenshot Capture - Research

**Researched:** 2026-03-06
**Domain:** Canvas screenshot capture, physics freeze/resume, DOM overlay UI
**Confidence:** HIGH

## Summary

Phase 4 requires capturing the PixiJS canvas as a PNG image, freezing physics during preview, and presenting a full-screen overlay with effects toggle, save, and discard controls. The project already uses PixiJS v8 (^8.16.0) which provides a built-in `ExtractSystem` accessible via `app.renderer.extract` -- this handles canvas-to-image conversion natively with methods for canvas, image, base64, and direct download. No additional libraries are needed.

The core technical challenge is the two-render-pass capture: one with `effectsLayer.visible = true` (effects ON) and one with `effectsLayer.visible = false` (effects OFF). Both images must be captured at the moment of freeze and stored so the user can toggle between them in the preview overlay. Physics freeze uses Matter.js `Runner.stop(runner)` and resume uses `Runner.run(runner, engine)`, both of which already exist as `startEngine`/`stopEngine` in `src/physics/engine.ts`. The main.ts currently does NOT store the Runner reference -- it calls `startEngine(engine)` but discards the return value. This must be fixed to enable freeze/resume.

**Primary recommendation:** Use `app.renderer.extract.canvas(app.stage)` for both render passes (toggling `effectsLayer.visible` between them), convert the canvas results to data URLs for the preview `<img>` element, and use `canvas.toBlob()` with an anchor click for PNG download. Implement the preview overlay as a DOM element in `#ui-root` following the established inline-style pattern from panel.ts and onboarding-hint.ts.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Floating action button (camera icon) in the bottom-right corner, always visible
- Button stays on screen at all times, including during active shaking
- Brief white flash overlay (~200ms) on tap as shutter feedback
- Capture button and fallback shake button coexist in different corners (capture bottom-right, shake bottom-left)
- Physics freezes immediately on capture tap -- scene pauses at the captured moment
- No posing/dragging while frozen -- preview is read-only
- Physics resumes from frozen state when preview is dismissed (no reset)
- Capture button hidden/disabled while preview overlay is showing -- must dismiss before re-capturing
- Effects toggle in the preview overlay: ON shows frozen-in-place effects, OFF shows clean ragdolls + background only
- Default: effects OFF (clean pose) -- user opts in for action-shot look
- When effects ON, shows speed lines, impact flashes, and squash-stretch exactly as they were at the moment of capture (frozen in place, not re-rendered)
- Two render passes needed: one with effectsLayer visible, one without
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAPT-01 | User can take a screenshot of the current ragdoll positions (no UI chrome) | PixiJS ExtractSystem captures canvas content only (no DOM UI). Toggle effectsLayer.visible=false for clean capture. Two render passes for effects ON/OFF variants. |
| CAPT-04 | Capture preview shows the result before sharing/uploading | DOM overlay in #ui-root with captured image as `<img>`, effects toggle to swap between two pre-captured images, Save and Discard buttons. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | ^8.16.0 | Canvas rendering + extract API | Already installed. `app.renderer.extract` provides canvas/image/download methods natively |
| matter-js | ^0.20.0 | Physics freeze/resume via Runner | Already installed. `Runner.stop(runner)` / `Runner.run(runner, engine)` already in engine.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | -- | -- | All functionality covered by PixiJS extract + native DOM APIs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PixiJS extract API | html2canvas | Unnecessary -- PixiJS extract captures WebGL canvas directly; html2canvas is for DOM screenshots |
| canvas.toBlob() + anchor download | FileSaver.js | Unnecessary dependency -- native API works fine, iOS Safari supports PNG blob downloads |
| PixiJS extract.download() | Manual canvas.toBlob() | extract.download() is simpler but less control over filename/timing; manual approach gives more control for preview-then-save flow |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  ui/
    capture-button.ts     # Floating camera FAB (bottom-right)
    capture-overlay.ts    # Full-screen preview overlay with controls
  capture/
    screenshot.ts         # Core capture logic: freeze, extract, two-pass render
```

### Pattern 1: Two-Pass Capture
**What:** Capture two images at the moment of freeze -- one with effects visible, one without -- then store both for toggle in preview.
**When to use:** Every capture action.
**Example:**
```typescript
// Source: PixiJS v8 ExtractSystem API docs
function captureScreenshots(
  app: Application,
  effectsLayer: Container,
): { clean: string; withEffects: string } {
  // Pass 1: Clean capture (effects OFF)
  effectsLayer.visible = false;
  const cleanCanvas = app.renderer.extract.canvas({ target: app.stage });
  const clean = (cleanCanvas as HTMLCanvasElement).toDataURL('image/png');

  // Pass 2: Effects capture (effects ON)
  effectsLayer.visible = true;
  const effectsCanvas = app.renderer.extract.canvas({ target: app.stage });
  const withEffects = (effectsCanvas as HTMLCanvasElement).toDataURL('image/png');

  // Restore visibility
  effectsLayer.visible = true;

  return { clean, withEffects };
}
```

### Pattern 2: Physics Freeze/Resume via Runner
**What:** Stop the Matter.js Runner to freeze physics at the captured moment; restart it to resume.
**When to use:** On capture (freeze) and on discard/after save (resume).
**Example:**
```typescript
// Source: existing src/physics/engine.ts
import { Runner } from 'matter-js';

// Freeze: Runner.stop pauses the fixed-timestep loop
Runner.stop(runner);

// Resume: Runner.run restarts from current state (no position reset)
Runner.run(runner, engine);
```

**Critical:** `main.ts` line 173 calls `startEngine(engine)` but discards the returned Runner. Must store it:
```typescript
const runner = startEngine(engine);
```

### Pattern 3: DOM Overlay in #ui-root
**What:** Preview overlay as a fixed-position DOM element appended to `#ui-root`, following the established pattern of inline styles and pointer-events management.
**When to use:** Showing capture preview.
**Example:**
```typescript
// Source: existing pattern from onboarding-hint.ts, panel.ts
const overlay = document.createElement('div');
Object.assign(overlay.style, {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.85)',
  zIndex: '2000',  // Above everything: hamburger(1000), panel(500), shake-btn(50)
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: '0',
  transition: 'opacity 0.2s ease',
});
```

### Pattern 4: PNG Download via Blob
**What:** Convert canvas to blob, create object URL, trigger download via anchor click.
**When to use:** When user taps Save in the preview overlay.
**Example:**
```typescript
// Source: MDN HTMLCanvasElement.toBlob()
function downloadPng(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

### Anti-Patterns to Avoid
- **Extracting the whole page with html2canvas:** PixiJS extract API captures the WebGL canvas directly and more accurately. html2canvas is for DOM-to-canvas, not canvas-to-image.
- **Using engine.timing.timeScale = 0 instead of Runner.stop:** timeScale=0 still runs the Runner loop (wasting CPU). Runner.stop completely halts the loop.
- **Re-rendering effects at toggle time:** Effects must be captured at the moment of freeze (two pre-rendered images), not re-rendered when user toggles. The frozen effect positions can't be reproduced later.
- **Using PixiJS extract.download() directly:** This skips the preview flow. We need to capture first, show preview, then save on user action.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas-to-image conversion | Custom WebGL readPixels | `app.renderer.extract.canvas()` | Handles WebGL context, resolution, devicePixelRatio automatically |
| Physics pause/resume | Custom body position freezing | `Runner.stop(runner)` / `Runner.run(runner, engine)` | Already exists in engine.ts. Manual freezing would break constraints and sleeping state |
| Image format encoding | Custom PNG encoder | `canvas.toDataURL('image/png')` | Browser-native, lossless, zero dependencies |
| File download trigger | Custom download mechanism | Anchor element with `download` attribute | Universal browser support including mobile Safari for PNG blobs |

**Key insight:** This phase is primarily integration work -- connecting existing PixiJS extract APIs and Matter.js Runner controls with a new DOM overlay. No novel algorithms or libraries are needed.

## Common Pitfalls

### Pitfall 1: Discarded Runner Reference
**What goes wrong:** `main.ts` line 173 calls `startEngine(engine)` but does not store the returned `Runner`. Without the Runner reference, `Runner.stop()` cannot be called.
**Why it happens:** The Runner was not needed until now -- physics just ran continuously.
**How to avoid:** Store the Runner: `const runner = startEngine(engine);` and pass it to the capture system.
**Warning signs:** TypeError or "runner is undefined" when attempting to freeze.

### Pitfall 2: Extract Returns ICanvas, Not HTMLCanvasElement
**What goes wrong:** `app.renderer.extract.canvas()` returns `ICanvas` (PixiJS internal type), which may not have `toDataURL` directly in TypeScript's view.
**Why it happens:** PixiJS abstracts canvas types for WebGL/WebGPU compatibility.
**How to avoid:** Cast to `HTMLCanvasElement`: `const canvas = app.renderer.extract.canvas({ target: app.stage }) as HTMLCanvasElement;`
**Warning signs:** TypeScript compilation errors on `.toDataURL()` call.

### Pitfall 3: Resolution Mismatch in Extracted Image
**What goes wrong:** Extracted image may be at device pixel ratio resolution (e.g., 2x or 3x on Retina) rather than CSS pixel dimensions, resulting in oversized images.
**Why it happens:** PixiJS app was initialized with `resolution: window.devicePixelRatio`.
**How to avoid:** Pass `resolution: 1` in extract options for CSS-pixel-sized output, OR accept the higher resolution (sharper downloads). For preview display, use CSS `max-width: 100%` on the `<img>` element regardless.
**Warning signs:** Preview image appears much larger than the viewport, or downloaded PNG is 3x expected dimensions.

### Pitfall 4: Effects Layer State Not Restored After Capture
**What goes wrong:** If the two-pass capture sets `effectsLayer.visible = false` for the clean pass and then errors out before restoring it, the effects layer stays hidden.
**Why it happens:** No try/finally around the visibility toggle.
**How to avoid:** Wrap the two-pass capture in try/finally that always restores `effectsLayer.visible = true`.
**Warning signs:** Effects permanently disappear after a capture attempt.

### Pitfall 5: iOS Safari Download Attribute Behavior
**What goes wrong:** On older iOS Safari, the `download` attribute on anchor tags may be ignored, opening the image in a new tab instead of downloading.
**Why it happens:** Safari historically had limited support for the download attribute.
**How to avoid:** Use data URLs (which work on iOS Safari for PNG). Modern iOS 13+ supports the download attribute for blob/data URLs. For the target audience (mobile users with modern phones), this is acceptable.
**Warning signs:** Image opens in new tab instead of downloading on iOS.

### Pitfall 6: Capture During Active Drag
**What goes wrong:** If user taps capture while dragging a ragdoll, the drag constraint may persist after freeze, or the grab scale (1.05x) may be captured.
**Why it happens:** Active drags have visual feedback (scale) and physics constraints.
**How to avoid:** Before capturing, clear all active drags from `scene.activeDrags` and reset any grabbed sprite scale to 1.0. The capture should show the "natural" pose.
**Warning signs:** Captured image shows one ragdoll slightly larger than others, or drag constraint line visible.

### Pitfall 7: White Flash Blocks Capture Timing
**What goes wrong:** If white flash is implemented as a CSS overlay that covers the canvas, and capture happens during the flash, the extract API captures the canvas content underneath (correct), but the timing must ensure physics freezes BEFORE the flash starts fading.
**Why it happens:** Flash is cosmetic feedback; the actual capture must happen at the moment of tap, not after the flash animation.
**How to avoid:** Sequence: (1) freeze physics, (2) capture both images, (3) show white flash, (4) fade flash into preview overlay.
**Warning signs:** Captured image shows ragdolls in slightly different positions than what user saw at tap time.

## Code Examples

Verified patterns from official sources and existing codebase:

### Capture Button (FAB Style, Following shake-button.ts Pattern)
```typescript
// Source: existing src/input/shake-button.ts pattern
const btn = document.createElement('button');
btn.id = 'capture-button';
btn.setAttribute('aria-label', 'Capture screenshot');

Object.assign(btn.style, {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
  touchAction: 'none',
  userSelect: 'none',
  zIndex: '50',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s ease',
});
```

### PixiJS Extract for Stage Capture
```typescript
// Source: PixiJS v8 ExtractSystem docs
// https://pixijs.download/dev/docs/rendering.ExtractSystem.html
const canvas = app.renderer.extract.canvas({
  target: app.stage,
}) as HTMLCanvasElement;
const dataUrl = canvas.toDataURL('image/png');
```

### White Flash (CSS Overlay)
```typescript
// Source: existing onboarding-hint.ts transition pattern
const flash = document.createElement('div');
Object.assign(flash.style, {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '100vw',
  height: '100vh',
  background: '#ffffff',
  opacity: '1',
  zIndex: '1999',  // Just below preview overlay
  pointerEvents: 'none',
  transition: 'opacity 0.2s ease',
});
container.appendChild(flash);

// Trigger fade-out on next frame
requestAnimationFrame(() => {
  flash.style.opacity = '0';
  flash.addEventListener('transitionend', () => {
    flash.remove();
  }, { once: true });
});
```

### Effects Toggle in Preview
```typescript
// Two pre-captured data URLs; toggle which <img> shows
const previewImg = document.createElement('img');
previewImg.src = cleanDataUrl;  // Default: effects OFF

let effectsOn = false;
toggleBtn.addEventListener('click', () => {
  effectsOn = !effectsOn;
  previewImg.src = effectsOn ? effectsDataUrl : cleanDataUrl;
  toggleBtn.textContent = effectsOn ? 'Effects: ON' : 'Effects: OFF';
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `renderer.plugins.extract` (PixiJS v7) | `renderer.extract` (PixiJS v8) | PixiJS v8 (2024) | Direct property access, no plugin lookup needed |
| `extract.canvas(displayObject)` (positional arg) | `extract.canvas({ target })` (options object) | PixiJS v8 | Options object supports frame, resolution, clearColor |
| FileSaver.js for downloads | Native anchor `download` attribute | 2020+ | No dependency needed for PNG downloads on modern browsers |

**Deprecated/outdated:**
- `renderer.plugins.extract`: Removed in PixiJS v8. Use `renderer.extract` directly.
- `extract.canvas(container)` with positional arg: PixiJS v8 uses options object `{ target: container }`. However, passing a Container directly (without wrapping in options) may still work as a shorthand.

## Open Questions

1. **Extract API return type for canvas()**
   - What we know: Returns `ICanvas` type in PixiJS v8 typings. In WebGL mode on browsers, this is actually an `HTMLCanvasElement`.
   - What's unclear: Whether the cast to `HTMLCanvasElement` is always safe, or if WebGPU backends might return something different.
   - Recommendation: Cast with `as HTMLCanvasElement` -- the project explicitly uses `preference: 'webgl'` in renderer init, so this is safe.

2. **Shake button repositioning**
   - What we know: Context says "capture bottom-right, shake bottom-left". Currently shake button is `bottom: 24px; left: 50%; transform: translateX(-50%)` (centered).
   - What's unclear: Whether to move the shake button to bottom-left, or if "different corners" is flexible.
   - Recommendation: Move shake button to `left: 24px` (bottom-left) when capture button is added to `right: 24px` (bottom-right). This is a locked decision.

3. **Memory impact of storing two data URL strings**
   - What we know: Two PNG data URLs for a mobile viewport (~390x844) at 1x resolution are roughly 200-400KB each as base64 strings.
   - What's unclear: Whether this causes memory pressure on low-end devices.
   - Recommendation: Acceptable for single capture. Data URLs are released when preview is dismissed. If concerned, could use Blob URLs instead (smaller memory footprint), but data URLs are simpler and sufficient.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAPT-01 | Screenshot capture produces PNG data URL without UI chrome | unit | `npx vitest run src/capture/__tests__/screenshot.test.ts -x` | No -- Wave 0 |
| CAPT-01 | Two-pass capture toggles effectsLayer visibility correctly | unit | `npx vitest run src/capture/__tests__/screenshot.test.ts -x` | No -- Wave 0 |
| CAPT-01 | effectsLayer visibility restored after capture (even on error) | unit | `npx vitest run src/capture/__tests__/screenshot.test.ts -x` | No -- Wave 0 |
| CAPT-04 | Preview overlay shows captured image | manual-only | Manual: tap capture, verify overlay appears | N/A -- DOM visual |
| CAPT-04 | Effects toggle swaps between clean and effects images | manual-only | Manual: toggle effects in preview, verify swap | N/A -- DOM visual |
| CAPT-04 | Save triggers PNG download | manual-only | Manual: tap Save, verify file downloads | N/A -- browser download |
| CAPT-04 | Discard dismisses overlay and resumes physics | unit | `npx vitest run src/capture/__tests__/screenshot.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/capture/__tests__/screenshot.test.ts` -- covers CAPT-01 (capture logic, two-pass, restore)
- [ ] Mock strategy for PixiJS extract API (renderer.extract.canvas returns mock canvas)
- [ ] Mock strategy for Matter.js Runner (stop/run calls verified)

## Sources

### Primary (HIGH confidence)
- [PixiJS v8 ExtractSystem docs](https://pixijs.download/dev/docs/rendering.ExtractSystem.html) - extract.canvas(), extract.image(), extract.download() method signatures and options
- [PixiJS v8 ExtractDownloadOptions](https://pixijs.download/dev/docs/rendering.ExtractDownloadOptions.html) - filename, format, resolution, clearColor options
- [Matter.js Runner docs](https://brm.io/matter-js/docs/classes/Runner.html) - Runner.stop(), Runner.run(), runner.enabled
- [MDN HTMLCanvasElement.toBlob()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) - canvas to blob conversion for download
- Existing codebase: `src/physics/engine.ts` (startEngine/stopEngine already exist), `src/renderer/pixi-renderer.ts` (layer hierarchy), `src/input/shake-button.ts` (FAB pattern), `src/ui/onboarding-hint.ts` (CSS transition pattern)

### Secondary (MEDIUM confidence)
- [iOS Safari download attribute support](https://www.simon-neutert.de/2025/js-safari-media-download/) - Blob/data URL downloads work on iOS 13+
- [PixiJS stage visible issue #11122](https://github.com/pixijs/pixijs/issues/11122) - Stage.visible=false has no effect, but child containers work fine

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PixiJS extract API is well-documented and the project already uses PixiJS v8; Matter.js Runner stop/start already implemented
- Architecture: HIGH - Two-pass capture is straightforward layer visibility toggle; DOM overlay follows established patterns in the codebase
- Pitfalls: HIGH - Runner reference gap verified by reading main.ts line 173; extract type casting confirmed via PixiJS docs; resolution behavior documented

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- PixiJS v8 and Matter.js 0.20 are mature)
