# Phase 5: Replay Clips + Sharing - Research

**Researched:** 2026-03-06
**Domain:** GIF encoding from canvas frame buffer, Web Share API, Clipboard API
**Confidence:** HIGH

## Summary

Phase 5 adds animated GIF replay capture (last 3 seconds of shaking) and file-based sharing (native share sheet, clipboard fallback, download) to the existing screenshot capture system. The core technical challenge is an always-recording circular frame buffer that continuously captures PixiJS canvas frames, then encodes them into an animated GIF on-demand using a lightweight encoder library. The existing capture overlay needs expansion with a tab switcher (Photo/Clip), a Share button, and toast notifications.

The GIF encoding pipeline is: (1) continuous frame buffer stores raw RGBA pixel data from `app.renderer.extract.pixels()`, (2) on capture, freeze the buffer and begin encoding via `gifenc` (quantize -> applyPalette -> writeFrame), (3) encoding runs synchronously on the main thread (3 seconds at 10fps = 30 frames at reduced resolution -- fast enough without workers), (4) the result is a Blob/File ready for Web Share API or download. Sharing uses `navigator.share()` with file support where available, falling back to clipboard copy (PNG only -- GIF cannot be clipboard-copied) or download.

**Primary recommendation:** Use `gifenc` (mattdesl) for GIF encoding -- 9KB, zero dependencies, pure JS, ESM-compatible, fast V8-optimized quantizer. Store replay frames as `Uint8ClampedArray` snapshots in a fixed-size circular buffer, capturing at 10fps (not every render frame) to keep memory under control.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Always-recording: continuously buffers the last 3 seconds of PixiJS canvas frames in the background
- When capture button is tapped, the buffer is finalized into an animated GIF alongside the screenshot
- Replay GIF always includes effects (speed lines, impact flashes, squash-stretch) -- no clean variant for clips
- GIF loops forever (standard for short clips shared on social media/chat)
- No explicit record button -- the buffer runs silently from app start
- Single existing capture button triggers both screenshot + GIF capture simultaneously
- Preview overlay gets two tabs above the preview: "Photo" and "Clip"
- Active tab is highlighted; tapping switches the preview content
- Effects toggle (ON/OFF) only appears on the Photo tab (clips always include effects)
- While GIF is encoding (~1-3 seconds), Clip tab shows the last frame of the replay as a static image with a small loading spinner overlay
- User can switch to Photo tab and interact while GIF encodes in the background
- Primary action: "Share" button opens native share sheet via Web Share API
- Secondary action: "Save" button downloads the file to device (existing Phase 4 behavior)
- Controls row: [Effects toggle] [Share] [Save] [Discard X]
- Effects toggle only visible on Photo tab
- File formats: PNG for screenshots, GIF for clips
- On browsers without Web Share API: Share button copies image/GIF to clipboard with a brief toast notification ("Copied to clipboard!" auto-dismiss after ~2 seconds)
- No branding or watermark on shared images/GIFs -- clean, unbranded output
- OG meta previews deferred to Phase 8 (requires server-side infrastructure)
- Phase 5 sharing is file-based only (native share sheet, clipboard, download)
- No "copy link" feature in Phase 5 -- links require gallery infrastructure

### Claude's Discretion
- GIF encoding library choice and configuration (frame rate, color palette, dithering)
- Replay buffer implementation approach (circular buffer of canvas snapshots vs other)
- GIF resolution/quality optimization for file size
- Tab switcher styling and animation details
- Toast notification styling and positioning
- Clipboard API usage details (Clipboard API vs fallback)
- Loading spinner design on clip tab during encoding

### Deferred Ideas (OUT OF SCOPE)
- OG meta previews for shared gallery links -- Phase 8 (requires server-side infrastructure)
- "Copy link" sharing -- Phase 8 (requires gallery with public URLs)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAPT-02 | User can capture a replay clip (last 3-5 seconds) as an animated GIF | Circular frame buffer + gifenc encoding pipeline; buffer stores RGBA pixel data at 10fps, gifenc encodes to GIF on capture |
| CAPT-03 | User chooses screenshot or clip when sharing | Tab switcher UI (Photo/Clip) in existing capture overlay; active tab selects which data goes to Share/Save |
| SHAR-01 | User can share creation via native share sheet (Web Share API) or copy link | Web Share API with `navigator.share({ files })` for PNG/GIF; clipboard copy fallback (PNG only via ClipboardItem); download as tertiary fallback. No "copy link" in Phase 5 per user decision |
| SHAR-02 | Shared gallery links show OG meta preview images when pasted in chat/social | Deferred to Phase 8 per user decision -- Phase 5 is file-based sharing only |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gifenc | 1.0.3 | GIF encoding (quantize + palette + LZW) | 9KB, zero deps, pure JS, V8-optimized, ESM/CJS, MIT license. 2x+ faster than gif.js. Designed for canvas pixel data |
| PixiJS extract | 8.16.0 (bundled) | Frame pixel extraction | Already in project; `app.renderer.extract.pixels()` returns `Uint8ClampedArray` RGBA data directly usable by gifenc |
| Web Share API | Browser native | Native share sheet | `navigator.share({ files })` supports PNG and GIF files. Available on iOS Safari, Chrome Android, Edge. Requires HTTPS + user gesture |
| Clipboard API | Browser native | Fallback: copy to clipboard | `navigator.clipboard.write()` with ClipboardItem supports image/png. GIF NOT supported -- must convert to PNG for clipboard fallback |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none -- no new supporting libraries needed) | | | |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gifenc | gif.js | gif.js is unmaintained (last release 9 years ago), requires separate worker script files, 2x slower. gifenc is smaller, faster, and works with modern ESM |
| gifenc | gifshot | Larger bundle, oriented toward webcam/video capture, more complexity than needed for canvas frames |
| Web Worker encoding | Main thread encoding | For 30 frames at reduced resolution (~360px wide), main thread encoding takes <500ms. Workers add complexity (message passing, blob URLs) without meaningful benefit at this scale |

**Installation:**
```bash
npm install gifenc
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  capture/
    screenshot.ts          # Existing -- PNG capture (no changes)
    replay-buffer.ts       # NEW -- circular frame buffer (always-recording)
    gif-encoder.ts         # NEW -- gifenc wrapper (buffer -> animated GIF blob)
  ui/
    capture-overlay.ts     # MODIFY -- add tabs, Share button, toast, GIF preview
    capture-button.ts      # Existing -- no changes needed
    toast.ts               # NEW -- auto-dismiss toast notification component
  main.ts                  # MODIFY -- hook replay buffer into ticker, update capture flow
```

### Pattern 1: Circular Frame Buffer
**What:** A fixed-size ring buffer that stores the N most recent canvas frame snapshots as raw RGBA pixel data, automatically overwriting the oldest frame when full.
**When to use:** Always-recording replay capture where you need the last T seconds of frames without unbounded memory growth.
**Example:**
```typescript
// Source: Custom implementation based on standard circular buffer pattern
interface FrameBuffer {
  frames: Uint8ClampedArray[];  // Pre-allocated array of fixed size
  width: number;
  height: number;
  writeIndex: number;           // Next position to write
  frameCount: number;           // How many frames have been written (capped at capacity)
}

const CAPTURE_FPS = 10;
const BUFFER_SECONDS = 3;
const BUFFER_CAPACITY = CAPTURE_FPS * BUFFER_SECONDS; // 30 frames

function createReplayBuffer(width: number, height: number): FrameBuffer {
  return {
    frames: new Array(BUFFER_CAPACITY).fill(null),
    width,
    height,
    writeIndex: 0,
    frameCount: 0,
  };
}

function pushFrame(buffer: FrameBuffer, rgba: Uint8ClampedArray): void {
  // Reuse slot (overwrite oldest)
  buffer.frames[buffer.writeIndex] = rgba;
  buffer.writeIndex = (buffer.writeIndex + 1) % BUFFER_CAPACITY;
  if (buffer.frameCount < BUFFER_CAPACITY) buffer.frameCount++;
}

function getOrderedFrames(buffer: FrameBuffer): Uint8ClampedArray[] {
  if (buffer.frameCount < BUFFER_CAPACITY) {
    return buffer.frames.slice(0, buffer.frameCount);
  }
  // Ring buffer: oldest frame is at writeIndex
  return [
    ...buffer.frames.slice(buffer.writeIndex),
    ...buffer.frames.slice(0, buffer.writeIndex),
  ];
}
```

### Pattern 2: Throttled Frame Capture in Ticker
**What:** Capture frames at a fixed rate (10fps) inside the existing PixiJS ticker, not every render frame (60fps), to limit memory and CPU usage.
**When to use:** Always -- capturing at 60fps would use 6x memory and produce unnecessarily large GIFs.
**Example:**
```typescript
// Source: Standard throttle pattern for animation frame capture
const CAPTURE_INTERVAL_MS = 1000 / 10; // 10fps = 100ms between captures
let lastCaptureTime = 0;

// Inside existing ticker callback in main.ts
renderer.app.ticker.add((ticker) => {
  // ... existing sync/effects code ...

  // Throttled replay frame capture
  const now = performance.now();
  if (now - lastCaptureTime >= CAPTURE_INTERVAL_MS) {
    lastCaptureTime = now;
    // Extract pixels from the full stage (includes effects layer)
    const { pixels, width, height } = renderer.app.renderer.extract.pixels(renderer.app.stage);
    pushFrame(replayBuffer, pixels);
  }
});
```

### Pattern 3: Async GIF Encoding with Preview Placeholder
**What:** When the user taps capture, immediately show the last buffer frame as a static preview image on the Clip tab, then encode the GIF asynchronously. Replace the static image with the animated GIF once encoding completes.
**When to use:** Always -- GIF encoding takes ~200-1000ms; showing a placeholder prevents a blank/loading state.
**Example:**
```typescript
// Source: gifenc README + PixiJS extract API
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

function encodeGif(
  frames: Uint8ClampedArray[],
  width: number,
  height: number,
): Uint8Array {
  const gif = GIFEncoder();

  for (const rgba of frames) {
    const palette = quantize(rgba, 256, { format: 'rgb444' });
    const index = applyPalette(rgba, palette, 'rgb444');
    gif.writeFrame(index, width, height, {
      palette,
      delay: 100, // 100ms = 10fps
      repeat: 0,  // loop forever
    });
  }

  gif.finish();
  return gif.bytes();
}
```

### Pattern 4: Web Share API with Fallback Chain
**What:** Try native share sheet first, fall back to clipboard copy (PNG only), then download.
**When to use:** Share button handler -- different browsers have different support levels.
**Example:**
```typescript
// Source: MDN Web Share API docs
async function shareFile(blob: Blob, filename: string, mimeType: string): Promise<'shared' | 'copied' | 'failed'> {
  const file = new File([blob], filename, { type: mimeType });

  // Try Web Share API first
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'shared'; // user cancelled
      // Fall through to clipboard
    }
  }

  // Fallback: copy to clipboard (PNG only -- GIF not supported)
  if (mimeType === 'image/png' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
```

### Pattern 5: Data URL to Blob Conversion
**What:** Convert existing PNG data URLs (from screenshot capture) to Blob/File objects for Web Share API.
**When to use:** The existing `captureScreenshots()` returns data URLs; Web Share API requires File objects.
**Example:**
```typescript
// Source: Standard fetch-based data URL to Blob conversion
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
```

### Anti-Patterns to Avoid
- **Capturing every render frame (60fps):** 6x memory usage, 6x encoding time, no visual benefit for a 3-second replay GIF. Always throttle to 10fps.
- **Storing frames as data URLs or HTMLCanvasElement:** Data URLs are string-encoded (base64 = 33% bloat). Canvas elements hold GPU resources. Use raw `Uint8ClampedArray` for minimal memory and direct gifenc compatibility.
- **Encoding GIF synchronously in the capture button handler before showing the overlay:** Blocks the main thread for up to 1 second with no visual feedback. Always show the overlay immediately with a placeholder, then encode.
- **Trying to copy GIF to clipboard:** The Clipboard API only supports `image/png` and `text/plain` reliably across browsers. GIF clipboard write will fail silently or throw. For GIF clipboard fallback, either convert the first frame to PNG for clipboard, or skip clipboard and go straight to download.
- **Using `toDataURL()` for frame capture:** Encodes to base64 string on every frame, which is expensive and wastes memory. `extract.pixels()` returns raw RGBA bytes directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GIF encoding | Custom LZW encoder | gifenc | LZW compression, color quantization, and GIF frame disposal are deceptively complex. gifenc handles palette quantization (PnnQuant algorithm), indexed bitmap mapping, and GIF stream construction in 9KB |
| Color quantization | Median-cut or octree quantizer | gifenc `quantize()` | PnnQuant (Pairwise Nearest Neighbor Clustering) produces better palettes than naive approaches. Already bundled in gifenc |
| Native sharing | Custom share dialog | Web Share API (`navigator.share`) | Browser-native share sheet integrates with all installed apps. No way to replicate this from JavaScript |
| Toast notifications | Alert/confirm dialogs | Custom DOM toast (simple enough to hand-build) | A simple opacity-animated div is ~20 lines; no library needed. Follows the onboarding-hint pattern already in the codebase |

**Key insight:** The entire GIF pipeline (quantize + palette + encode + stream) is the complex part of this phase. gifenc packages all of it into three function calls. Everything else (buffer, UI, sharing) is straightforward DOM/API work.

## Common Pitfalls

### Pitfall 1: Memory Explosion from Unthrottled Frame Capture
**What goes wrong:** Capturing frames at 60fps for 3 seconds = 180 frames of RGBA data. At 360x640 resolution, each frame is ~920KB. 180 frames = ~165MB of raw pixel data in memory.
**Why it happens:** Developers hook frame capture directly into the render loop without throttling.
**How to avoid:** Capture at 10fps (30 frames = ~27MB at 360x640, or ~7MB at 180x320 half-resolution). Use a time-delta accumulator to skip frames.
**Warning signs:** Page becomes unresponsive, garbage collection pauses, mobile browser crashes.

### Pitfall 2: PixiJS extract.pixels() Returns Resolution-Scaled Data
**What goes wrong:** On a 2x DPR device, `extract.pixels(stage)` returns pixels at the physical resolution (e.g., 720x1280 instead of 360x640), doubling memory per frame and quadrupling GIF encoding time.
**Why it happens:** PixiJS renderer resolution is set to `window.devicePixelRatio` in the project setup.
**How to avoid:** Use the `resolution` option in `extract.pixels({ target: stage, resolution: 1 })` to force 1x extraction, OR capture to a smaller RenderTexture at a fixed GIF-friendly size (e.g., 360px wide). Alternatively, use `extract.canvas()` and then `getImageData()` at a specific size.
**Warning signs:** GIF files are unexpectedly large (>5MB for 3 seconds), encoding takes >2 seconds.

### Pitfall 3: GIF Palette Quality with Per-Frame vs Global Palette
**What goes wrong:** Using a global palette (quantize once, apply to all frames) causes color banding when frames have significantly different color distributions. Using per-frame palettes increases file size because each frame carries its own 768-byte color table.
**Why it happens:** The scene in this app has a consistent color scheme (dark gradient background, cartoon characters), so the tradeoff is minimal, but it's worth understanding.
**How to avoid:** For this app, use per-frame palettes. The scene has limited colors (dark blue gradient + 4-5 character colors + white effects), so palettes will be similar across frames and the 768 bytes/frame overhead is negligible on a 30-frame GIF. Per-frame palettes handle the occasional bright impact flash or speed line correctly.
**Warning signs:** Color artifacts on effect-heavy frames with global palette.

### Pitfall 4: Web Share API Requires User Gesture
**What goes wrong:** Calling `navigator.share()` outside a direct user gesture (e.g., from a setTimeout, Promise callback, or async operation) throws `NotAllowedError`.
**Why it happens:** Transient activation requirement -- the browser verifies the share call originates from a user-initiated event.
**How to avoid:** Call `navigator.share()` directly in the pointerdown/click handler of the Share button. Do NOT await any async operation before the share call if possible. Convert data URL to Blob beforehand (during GIF encoding completion), so the File object is ready when the user taps Share.
**Warning signs:** "NotAllowedError: Failed to execute 'share'" in console.

### Pitfall 5: Clipboard API GIF Limitation
**What goes wrong:** Attempting `navigator.clipboard.write([new ClipboardItem({ 'image/gif': gifBlob })])` fails because browsers only support `image/png`, `text/plain`, and `text/html` for clipboard writes.
**Why it happens:** The Async Clipboard API intentionally restricts MIME types for security.
**How to avoid:** For the clipboard fallback: if the user is on the Photo tab, copy the PNG. If on the Clip tab, show a toast "GIF saved to device" and trigger a download instead, since GIF cannot be clipboard-copied. Alternatively, render the first frame of the GIF as a PNG and copy that with a toast "Preview copied -- save GIF to share the animation".
**Warning signs:** Clipboard write throws TypeError or silently fails.

### Pitfall 6: Physics Frozen During Capture but Buffer Must Stop
**What goes wrong:** The replay buffer continues capturing frames after physics is frozen (during the preview overlay), recording static frames that dilute the replay.
**Why it happens:** The ticker keeps running even when Matter.js Runner is stopped (PixiJS ticker is independent of physics).
**How to avoid:** Add a `recording: boolean` flag to the replay buffer. Set it to `false` when the capture button is pressed (same time as `stopEngine`). Resume recording when the overlay is dismissed. Alternatively, just stop recording when capture triggers and don't restart until overlay closes.
**Warning signs:** Last frames of GIF show frozen/identical poses.

## Code Examples

Verified patterns from official sources:

### Extracting Pixels from PixiJS 8 Stage
```typescript
// Source: PixiJS 8 ExtractSystem API docs
// Returns { pixels: Uint8ClampedArray, width: number, height: number }
const { pixels, width, height } = renderer.app.renderer.extract.pixels({
  target: renderer.app.stage,
  resolution: 0.5, // Half resolution for smaller GIF frames
});
```

### Encoding Frames to Animated GIF with gifenc
```typescript
// Source: gifenc README (https://github.com/mattdesl/gifenc)
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

function encodeReplayGif(
  frames: Uint8ClampedArray[],
  width: number,
  height: number,
): Blob {
  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const rgba = frames[i];
    // rgb444 format is faster than default rgb565, acceptable for cartoon graphics
    const palette = quantize(rgba, 256, { format: 'rgb444' });
    const index = applyPalette(rgba, palette, 'rgb444');
    gif.writeFrame(index, width, height, {
      palette,
      delay: 100, // 10fps
      repeat: 0,  // infinite loop
    });
  }

  gif.finish();
  return new Blob([gif.bytesView()], { type: 'image/gif' });
}
```

### Web Share API File Sharing
```typescript
// Source: MDN Navigator.share() docs
async function shareImage(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'Shaken Together',
    });
  }
}
```

### Clipboard Write (PNG Only)
```typescript
// Source: MDN Clipboard.write() docs
async function copyImageToClipboard(pngBlob: Blob): Promise<boolean> {
  if (!navigator.clipboard?.write) return false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);
    return true;
  } catch {
    return false;
  }
}
```

### Data URL to Blob (for existing screenshot data URLs)
```typescript
// Source: Standard pattern (MDN fetch + Blob)
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
```

### Toast Notification (follows onboarding-hint pattern)
```typescript
// Source: Project pattern from src/ui/onboarding-hint.ts
function showToast(container: HTMLElement, message: string, durationMs = 2000): void {
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    zIndex: '2100',
    opacity: '0',
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
  });
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => { toast.style.opacity = '1'; });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, { once: true });
  }, durationMs);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gif.js (Web Workers via separate script files) | gifenc (inline ESM, optional workers) | 2021+ | gifenc is 2x faster, 9KB, no separate worker files needed. gif.js unmaintained since 2016 |
| Canvas toDataURL for frame capture | renderer.extract.pixels() raw RGBA | PixiJS v7+ | Avoids base64 encoding overhead; raw bytes directly usable by GIF encoder |
| Clipboard API: only text | Clipboard API: ClipboardItem with image/png | 2023 Baseline | Can copy PNG screenshots to clipboard natively. GIF still not supported |
| Custom share dialogs | Web Share API Level 2 (file sharing) | 2021+ | Native share sheet with file support on iOS Safari, Chrome Android. Desktop Chrome also supports it |

**Deprecated/outdated:**
- gif.js: Last release 2016, relies on Worker script URLs, no ESM support
- jsgif: Port of AS3 encoder, very old, no web worker support
- CCapture.js: Designed for video capture, overkill for GIF-only needs

## Open Questions

1. **Optimal GIF resolution for mobile sharing**
   - What we know: Full PixiJS canvas on a 2x device could be 720x1280+ pixels. At 10fps and 30 frames, raw RGBA is ~80MB before encoding. Encoded GIF would be several MB.
   - What's unclear: What resolution gives the best size/quality tradeoff for messaging apps (iMessage, WhatsApp, Telegram)?
   - Recommendation: Start with 0.5x resolution factor (effectively device-independent ~360px wide). This produces GIFs under 1MB. Can adjust in testing. The `extract.pixels({ resolution })` option makes this trivial to tune.

2. **Clipboard fallback for GIF on Clip tab**
   - What we know: Clipboard API only supports image/png. When the user is on the Clip tab and the browser lacks Web Share API, we cannot copy the GIF.
   - What's unclear: Should we copy the first frame as PNG + toast "Preview copied", or skip clipboard and auto-download + toast "GIF saved"?
   - Recommendation: Auto-download the GIF file + toast "GIF saved to device". This is more useful than a static PNG preview and matches the Save button behavior.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/capture/__tests__/ src/ui/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAPT-02 | Replay buffer stores frames in circular buffer and overwrites oldest | unit | `npx vitest run src/capture/__tests__/replay-buffer.test.ts -x` | Wave 0 |
| CAPT-02 | GIF encoder produces valid GIF blob from frame array | unit | `npx vitest run src/capture/__tests__/gif-encoder.test.ts -x` | Wave 0 |
| CAPT-03 | Capture overlay tab switcher toggles between Photo and Clip content | unit | `npx vitest run src/ui/__tests__/capture-overlay.test.ts -x` | Wave 0 |
| SHAR-01 | Share function tries Web Share API, falls back to clipboard/download | unit | `npx vitest run src/capture/__tests__/share.test.ts -x` | Wave 0 |
| SHAR-02 | (Deferred to Phase 8) | N/A | N/A | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run src/capture/__tests__/ src/ui/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/capture/__tests__/replay-buffer.test.ts` -- covers CAPT-02 (circular buffer push/get/capacity)
- [ ] `src/capture/__tests__/gif-encoder.test.ts` -- covers CAPT-02 (GIF encoding produces Blob with correct MIME type)
- [ ] `src/capture/__tests__/share.test.ts` -- covers SHAR-01 (share fallback chain: Web Share -> clipboard -> download)
- [ ] `src/ui/__tests__/capture-overlay.test.ts` -- covers CAPT-03 (tab switching, effects toggle visibility per tab)

## Sources

### Primary (HIGH confidence)
- [gifenc GitHub](https://github.com/mattdesl/gifenc) - Full API documentation, performance benchmarks, encoding workflow, web worker architecture
- [PixiJS 8 ExtractSystem](https://pixijs.download/dev/docs/rendering.ExtractSystem.html) - pixels(), canvas(), image() methods with options
- [MDN Navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) - Web Share API full reference, file sharing, browser support, exception handling
- [MDN Clipboard.write()](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write) - ClipboardItem, supported MIME types (image/png only)
- [MDN ClipboardItem.supports()](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem/supports_static) - Runtime MIME type checking

### Secondary (MEDIUM confidence)
- [web.dev - Share files pattern](https://web.dev/patterns/files/share-files) - Verified file sharing implementation patterns
- [web.dev - Copy images pattern](https://web.dev/patterns/clipboard/copy-images) - Clipboard image copy patterns, confirmed PNG-only limitation
- [npm-compare GIF libraries](https://npm-compare.com/gif.js,gifencoder,gifsicle,gifuct-js,omggif) - Library comparison data

### Tertiary (LOW confidence)
- GIF file size optimization recommendations (10-15fps, 256 color limit) -- from general web optimization articles, not library-specific benchmarks for this use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - gifenc is well-documented with clear API, PixiJS extract API verified in project code, Web Share API well-documented on MDN
- Architecture: HIGH - Circular buffer is a standard pattern; frame capture throttle is straightforward; all integration points identified in existing codebase
- Pitfalls: HIGH - Memory management, DPR scaling, clipboard GIF limitation, and user gesture requirements all verified with official documentation
- GIF encoding performance: MEDIUM - Performance claims from gifenc README (150 frames at 1024x1024 in ~2s); our case is 30 frames at ~360x640 which should be well under 1s, but not benchmarked in this exact scenario

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable libraries, browser APIs well-established)
