# Phase 5: Replay Clips + Sharing - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Animated GIF replay recording from a continuous frame buffer, screenshot-or-clip chooser in the existing capture preview overlay, Web Share API sharing with clipboard fallback, and save-to-device. OG meta previews are deferred to Phase 8 (requires server-side gallery infrastructure). No gallery upload (Phase 8), no accounts (Phase 7), no backend (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Replay recording
- Always-recording: continuously buffers the last 3 seconds of PixiJS canvas frames in the background
- When capture button is tapped, the buffer is finalized into an animated GIF alongside the screenshot
- Replay GIF always includes effects (speed lines, impact flashes, squash-stretch) — no clean variant for clips
- GIF loops forever (standard for short clips shared on social media/chat)
- No explicit record button — the buffer runs silently from app start

### Capture chooser UX
- Single existing capture button triggers both screenshot + GIF capture simultaneously
- Preview overlay gets two tabs above the preview: "Photo" and "Clip"
- Active tab is highlighted; tapping switches the preview content
- Effects toggle (ON/OFF) only appears on the Photo tab (clips always include effects)
- While GIF is encoding (~1-3 seconds), Clip tab shows the last frame of the replay as a static image with a small loading spinner overlay
- User can switch to Photo tab and interact while GIF encodes in the background

### Share experience
- Primary action: "Share" button opens native share sheet via Web Share API
- Secondary action: "Save" button downloads the file to device (existing Phase 4 behavior)
- Controls row: [Effects toggle] [Share] [Save] [Discard X]
- Effects toggle only visible on Photo tab
- File formats: PNG for screenshots, GIF for clips
- On browsers without Web Share API: Share button copies image/GIF to clipboard with a brief toast notification ("Copied to clipboard!" auto-dismiss after ~2 seconds)
- No branding or watermark on shared images/GIFs — clean, unbranded output

### OG meta previews
- Deferred to Phase 8 (Gallery Core) — requires server-side HTML rendering with og:image meta tags
- Phase 5 sharing is file-based only (native share sheet, clipboard, download)
- No "copy link" feature in Phase 5 — links require gallery infrastructure

### Claude's Discretion
- GIF encoding library choice and configuration (frame rate, color palette, dithering)
- Replay buffer implementation approach (circular buffer of canvas snapshots vs other)
- GIF resolution/quality optimization for file size
- Tab switcher styling and animation details
- Toast notification styling and positioning
- Clipboard API usage details (Clipboard API vs fallback)
- Loading spinner design on clip tab during encoding

</decisions>

<specifics>
## Specific Ideas

- The always-recording buffer means zero friction — user never has to "plan" a clip, they just capture whenever something funny happens
- Tab-based chooser keeps the familiar preview overlay pattern from Phase 4 while cleanly adding clip selection
- File-based sharing (not link-based) is the right scope for Phase 5 — sharing a GIF file via iMessage/WhatsApp/etc. is more direct than sharing a link anyway
- The 3-second window captures the burst of shake action without producing oversized GIFs

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/capture/screenshot.ts`: `captureScreenshots()` with PixiJS extract API — same pattern extends for frame capture; `prepareForCapture()` for drag cleanup
- `src/ui/capture-overlay.ts`: `showCaptureOverlay()` with dark backdrop, fade transitions, effects toggle, Save/Discard buttons — needs expansion for tabs and Share button
- `src/ui/capture-button.ts`: FAB with enable/disable — no changes needed for trigger
- `src/renderer/pixi-renderer.ts`: PixiRenderer with `app`, `backgroundLayer`, `ragdollLayer`, `effectsLayer` — frame buffer captures from `app.renderer.extract`
- `src/ui/onboarding-hint.ts`: CSS transition-based fade animations — reusable pattern for toast notifications

### Established Patterns
- Capture flow: freeze physics (Runner.stop) -> prepare (clear drags, reset scales) -> capture -> preview overlay -> resume (Runner.run)
- UI elements in `#ui-root` div, separate from PixiJS canvas
- Pointer Events with setPointerCapture for reliable touch
- Z-index layering: canvas < shake button (z:50) < panel (z:100+) < overlay (z:2000)
- Inline CSS styling for all UI components

### Integration Points
- `src/main.ts:197-231`: Capture button click handler — needs replay buffer finalization added alongside screenshot capture
- `src/ui/capture-overlay.ts`: Overlay function signature needs expansion for GIF data + tab UI + Share button
- `src/main.ts` game loop ticker — replay buffer frame capture hooks into the existing requestAnimationFrame loop
- `src/capture/` directory — new replay-buffer module alongside existing screenshot module

</code_context>

<deferred>
## Deferred Ideas

- OG meta previews for shared gallery links — Phase 8 (requires server-side infrastructure)
- "Copy link" sharing — Phase 8 (requires gallery with public URLs)

</deferred>

---

*Phase: 05-replay-clips-sharing*
*Context gathered: 2026-03-06*
