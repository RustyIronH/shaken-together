---
phase: 04-screenshot-capture
plan: 01
subsystem: capture
tags: [pixi.js, extract-api, screenshot, canvas, png, fab-button]

# Dependency graph
requires:
  - phase: 02-pixi-rendering
    provides: PixiRenderer with effectsLayer, RagdollSprite with container.scale
  - phase: 03-device-input
    provides: shake-button.ts pattern for FAB positioning
provides:
  - captureScreenshots function for two-pass PNG capture (clean + effects)
  - prepareForCapture function for drag cleanup and scale reset
  - CaptureResult type with clean and withEffects data URL strings
  - createCaptureButton camera FAB with enable/disable controls
  - Shake button repositioned to bottom-left for button coexistence
affects: [04-02-preview-overlay, 05-sharing]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-pass-capture, try-finally-visibility-restore, fab-button-pair]

key-files:
  created:
    - src/capture/screenshot.ts
    - src/capture/__tests__/screenshot.test.ts
    - src/ui/capture-button.ts
  modified:
    - src/input/shake-button.ts

key-decisions:
  - "Separated prepareForCapture from captureScreenshots for single-responsibility (drag/scale cleanup vs rendering)"
  - "Drag cleanup clears activeDrags map directly (orphaned constraints harmless with Runner stopped)"
  - "Camera SVG icon with outlined body + circle lens + filled center dot for clear visual identity"

patterns-established:
  - "Two-pass capture: toggle effectsLayer.visible in try/finally for clean vs effects images"
  - "FAB button pair: capture bottom-right + shake bottom-left at same z-index level"

requirements-completed: [CAPT-01]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 4 Plan 1: Screenshot Capture Module Summary

**Two-pass PixiJS extract capture with try/finally visibility restore, camera FAB button, and shake button repositioning**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T01:31:58Z
- **Completed:** 2026-03-06T01:34:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Two-pass screenshot capture producing clean (effects OFF) and effects-on PNG data URLs via PixiJS extract API
- Effects layer visibility always restored via try/finally, even on error
- Pre-capture preparation clears active drags and resets sprite scales to 1.0
- Camera FAB button with SVG icon positioned bottom-right, with disable/enable controls
- Shake button repositioned from center to bottom-left for button coexistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Screenshot capture module with tests** - `ad2d0ef` (test: RED), `7e2b618` (feat: GREEN)
2. **Task 2: Capture button FAB and shake button repositioning** - `09b772e` (feat)

_Note: Task 1 followed TDD with RED and GREEN commits._

## Files Created/Modified
- `src/capture/screenshot.ts` - Two-pass capture logic with CaptureResult type, prepareForCapture, captureScreenshots
- `src/capture/__tests__/screenshot.test.ts` - 6 unit tests covering capture, visibility toggle, error restore, drag cleanup, scale reset
- `src/ui/capture-button.ts` - Camera FAB button with SVG icon, disable/enable exports
- `src/input/shake-button.ts` - Repositioned from center (left: 50% + transform) to bottom-left (left: 24px)

## Decisions Made
- Separated prepareForCapture from captureScreenshots for single-responsibility: drag/scale cleanup is a scene concern, rendering is a PixiJS concern
- Drag cleanup simply clears the activeDrags map rather than removing constraints from the world (orphaned constraints are harmless with Runner stopped)
- Camera SVG uses outlined body with circle lens and filled center dot for visual clarity at 24x24

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Screenshot capture module ready for Plan 02 to wire into main.ts with preview overlay
- captureScreenshots and prepareForCapture exported and tested for integration
- Capture button ready to be appended to DOM and connected to capture flow
- Shake button already repositioned for coexistence

---
*Phase: 04-screenshot-capture*
*Completed: 2026-03-06*
