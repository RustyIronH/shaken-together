---
phase: 04-screenshot-capture
verified: 2026-03-06T12:15:00Z
status: passed
score: 8/8 must-haves verified
human_verification:
  - test: "Tap capture button and verify white flash, physics freeze, preview overlay"
    expected: "Brief white flash (~200ms), ragdolls freeze in place, dark overlay fades in with captured image centered, controls visible below image"
    why_human: "Visual timing, animation quality, and freeze behavior require browser observation"
  - test: "Toggle effects ON/OFF in preview overlay"
    expected: "Image swaps instantly between clean and with-effects variants, button text updates"
    why_human: "Visual comparison of clean vs effects images requires human judgment"
  - test: "Tap Save and verify PNG downloads"
    expected: "PNG file downloads with filename like shaken-together-1709...png, overlay dismisses, physics resumes from frozen positions"
    why_human: "File download behavior and physics resume are runtime behaviors"
  - test: "Tap Discard and verify overlay dismisses"
    expected: "Overlay fades out, physics resumes from frozen positions (no scene reset)"
    why_human: "Fade animation quality and physics resume are runtime behaviors"
  - test: "Verify no UI chrome in captured image"
    expected: "Downloaded PNG contains only the PixiJS canvas content (ragdolls, background, effects) with no buttons, overlays, or panel visible"
    why_human: "PixiJS extract API captures canvas only by design, but visual confirmation needed"
---

# Phase 4: Screenshot Capture Verification Report

**Phase Goal:** Users can freeze the current ragdoll positions and capture a clean screenshot for sharing
**Verified:** 2026-03-06T12:15:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Two-pass capture produces clean (no effects) and effects-on PNG data URLs from the PixiJS stage | VERIFIED | `src/capture/screenshot.ts` lines 41-65: `captureScreenshots()` toggles `effectsLayer.visible` false/true, calls `app.renderer.extract.canvas({ target: app.stage })` twice, returns `{ clean, withEffects }` data URLs. 6 unit tests pass. |
| 2 | Effects layer visibility is always restored after capture, even on error | VERIFIED | `src/capture/screenshot.ts` lines 61-63: `finally { effectsLayer.visible = true; }`. Test "restores effectsLayer.visible to true even if extract throws an error" passes. |
| 3 | Active drags are cleared and sprite scales reset before capture | VERIFIED | `src/capture/screenshot.ts` lines 20-31: `prepareForCapture()` calls `scene.activeDrags.clear()` and iterates spriteMap to `scale.set(1.0)`. Tests confirm drag clearing and scale reset. Called in `main.ts` line 202. |
| 4 | Capture button appears as a fixed camera FAB in the bottom-right corner | VERIFIED | `src/ui/capture-button.ts` lines 25-45: `position: 'fixed'`, `bottom: '24px'`, `right: '24px'`, `width: '56px'`, `height: '56px'`, `borderRadius: '50%'` with SVG camera icon. Appended to DOM in `main.ts` line 232. |
| 5 | Shake button moves to bottom-left to coexist with capture button | VERIFIED | `src/input/shake-button.ts` line 23: `left: '24px'`. No `transform: translateX(-50%)` present (previously centered). |
| 6 | User taps capture button and sees a white flash followed by a preview overlay | VERIFIED | `src/ui/capture-overlay.ts` lines 28-55: white flash div with 200ms opacity transition. Lines 57-74: dark overlay with `rgba(0,0,0,0.85)` background fades in after 200ms delay. Wired from `main.ts` line 211 via `showCaptureOverlay()`. |
| 7 | Preview shows the captured image with effects toggle, Save, and Discard controls | VERIFIED | `src/ui/capture-overlay.ts` lines 77-181: preview `<img>` defaults to `images.clean`, effects toggle button swaps `src` between clean/withEffects and updates text, Save button calls `callbacks.onSave(previewImg.src)`, Discard button fades out then calls `callbacks.onDiscard()`. |
| 8 | Physics freezes at capture and resumes on save/discard | VERIFIED | `main.ts` line 199: `stopEngine(runner)` on capture tap. Lines 222 and 227: `Runner.run(runner, engine)` in both onSave and onDiscard callbacks. Runner reference stored at line 176. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/capture/screenshot.ts` | Two-pass screenshot capture logic with freeze/resume | VERIFIED | 65 lines, exports `CaptureResult`, `prepareForCapture`, `captureScreenshots`. Uses PixiJS extract API with try/finally. |
| `src/capture/__tests__/screenshot.test.ts` | Unit tests for capture logic (min 40 lines) | VERIFIED | 174 lines, 6 tests covering data URL output, visibility toggling, error restore, drag cleanup, scale reset. All pass. |
| `src/ui/capture-button.ts` | Camera FAB button for triggering capture | VERIFIED | 71 lines, exports `createCaptureButton`, `disableCaptureButton`, `enableCaptureButton`. SVG camera icon, fixed bottom-right positioning. |
| `src/ui/capture-overlay.ts` | Full-screen preview overlay with effects toggle, Save, Discard | VERIFIED | 188 lines, exports `showCaptureOverlay`, `CaptureOverlayCallbacks`. White flash, dark backdrop, image preview, effects toggle, Save/Discard buttons. |
| `src/main.ts` | Complete capture flow wiring | VERIFIED | Imports all capture modules (lines 14-16), stores Runner reference (line 176), creates capture button with full freeze/capture/preview/resume flow (lines 197-232). |
| `src/input/shake-button.ts` | Updated shake button positioned bottom-left | VERIFIED | `left: '24px'` at line 23, no transform centering. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/capture/screenshot.ts` | `src/renderer/pixi-renderer.ts` | `app.renderer.extract.canvas({ target: app.stage })` | WIRED | Lines 48 and 55 use extract.canvas with target: app.stage |
| `src/main.ts` | `src/capture/screenshot.ts` | `captureScreenshots(app, effectsLayer)` call | WIRED | Import at line 14, called at line 205 |
| `src/main.ts` | `src/physics/engine.ts` | `stopEngine(runner)` on capture | WIRED | Import at line 2, called at line 199 |
| `src/main.ts` | `src/ui/capture-overlay.ts` | `showCaptureOverlay` with images and callbacks | WIRED | Import at line 16, called at line 211 with onSave/onDiscard callbacks |
| `src/main.ts` | `src/ui/capture-button.ts` | `createCaptureButton` + disable/enable | WIRED | Import at line 15, create at line 197, disable at line 208, enable at lines 223 and 228 |
| `src/main.ts` | `matter-js` Runner | `Runner.run(runner, engine)` on resume | WIRED | Import at line 1, called at lines 222 and 227 for resume after save/discard |

**Note:** Plan 01 specified a key link `screenshot.ts -> engine.ts` via stopEngine/Runner.run. The implementation correctly placed physics freeze/resume responsibility in `main.ts` instead (separation of concerns). The link is functionally present in the orchestration layer rather than the capture module. This is a sound architectural choice.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAPT-01 | 04-01, 04-02 | User can take a screenshot of the current ragdoll positions (no UI chrome) | SATISFIED | `captureScreenshots()` uses PixiJS `extract.canvas({ target: app.stage })` which captures only the canvas content. HTML UI elements (buttons, panel, overlay) are in the DOM, not the PixiJS stage, so they are excluded by design. |
| CAPT-04 | 04-02 | Capture preview shows the result before sharing/uploading | SATISFIED | `showCaptureOverlay()` displays the captured image in a full-screen preview with effects toggle, Save, and Discard controls before any sharing/downloading action occurs. |

No orphaned requirements. ROADMAP.md assigns CAPT-01 and CAPT-04 to Phase 4, and both plans claim these same requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected in any phase 4 files |

No TODO/FIXME/placeholder comments, no empty implementations, no console.log-only handlers found in any of the 6 files created/modified in this phase.

### Human Verification Required

### 1. Complete Capture Flow

**Test:** Run `npm run dev`, shake or fling ragdolls, tap the camera button in the bottom-right
**Expected:** Brief white flash (~200ms), ragdolls freeze in place, dark overlay fades in with captured image centered, controls below image (Effects: OFF, Save, Discard)
**Why human:** Visual timing, animation quality, and physics freeze behavior require browser observation

### 2. Effects Toggle

**Test:** In the preview overlay, tap "Effects: OFF" toggle
**Expected:** Text changes to "Effects: ON", image swaps to show speed lines/impact flashes if active at capture time. Tap again to toggle back.
**Why human:** Visual comparison of clean vs effects images requires human judgment

### 3. Save Downloads PNG

**Test:** In the preview overlay, tap "Save"
**Expected:** PNG file downloads (filename like "shaken-together-1709...png"), overlay dismisses, physics resumes from frozen positions (no scene reset)
**Why human:** File download behavior and physics resume are runtime behaviors

### 4. Discard Resumes Physics

**Test:** Capture again, tap "Discard"
**Expected:** Overlay fades out, physics resumes from frozen positions (dolls continue from where they froze)
**Why human:** Fade animation and physics continuity are runtime behaviors

### 5. No UI Chrome in Captured Image

**Test:** Save a PNG and open it in an image viewer
**Expected:** Image contains only ragdolls, background, and effects (if toggled on). No buttons, panel, or overlay visible.
**Why human:** PixiJS extract captures canvas only by design, but visual confirmation provides certainty

### 6. Button Coexistence

**Test:** With DeviceMotion denied (or on desktop), verify both buttons are visible
**Expected:** Shake button at bottom-left, capture button at bottom-right, no overlap
**Why human:** Layout positioning on different screen sizes requires visual check

### Gaps Summary

No automated gaps found. All 8 observable truths verified through code analysis. All artifacts exist, are substantive (not stubs), and are fully wired. Both requirements (CAPT-01, CAPT-04) are satisfied. All 6 unit tests pass, TypeScript compiles (no new errors), and production build succeeds.

The phase is functionally complete pending human verification of the visual capture flow in a browser.

---

_Verified: 2026-03-06T12:15:00Z_
_Verifier: Claude (gsd-verifier)_
