---
phase: 03-device-input
plan: 02
subsystem: input
tags: [shake-button, onboarding-hint, fallback, pointer-events, devicemotion]

# Dependency graph
requires:
  - phase: 03-device-input
    provides: Shake manager with DeviceMotion listener, gravity mapping, lerp, getShakeState
  - phase: 01-physics-core
    provides: Matter.js engine with gravity, sleeping bodies
  - phase: 02-rendering-engine
    provides: PixiJS renderer with ticker loop, scene state, UI root
provides:
  - Hold-to-shake fallback button for non-motion browsers (denied/unsupported)
  - Onboarding hint overlay with auto-fade and dismiss-on-shake
  - Complete Phase 3 device input system fully wired in main.ts
affects: [capture-phase, sharing, mobile-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: [pointer-event hold interaction, CSS opacity transition auto-dismiss, conditional UI based on permission state]

key-files:
  created:
    - src/input/shake-button.ts
    - src/ui/onboarding-hint.ts
  modified:
    - src/main.ts

key-decisions:
  - "Shake button uses Pointer Events (not mouse events) with setPointerCapture for reliable hold detection on touch devices"
  - "Gravity bursts use random angle + random magnitude (3-10 range) at 100ms interval for varied chaotic feel"
  - "Onboarding hint auto-fades via CSS opacity transition + transitionend DOM removal for clean lifecycle"
  - "Fallback mode detection via initShake return value, not separate DeviceMotion check"

patterns-established:
  - "Hold-to-action pattern: pointerdown starts interval, pointerup/cancel/leave stops it, no manual gravity reset (lerp handles return)"
  - "Conditional UI: show/hide based on capability detection result from init function return value"

requirements-completed: [INPT-03]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 3 Plan 02: Shake Fallback & Onboarding Summary

**Hold-to-shake fallback button with random gravity bursts and onboarding hint that auto-fades or dismisses on first shake**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T00:52:26Z
- **Completed:** 2026-03-06T00:54:52Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Hold-to-shake button appears only when DeviceMotion is unavailable (denied/unsupported), applies random gravity bursts at 100ms while held
- Onboarding hint displays adaptive text ("Shake your phone!" or "Hold the button to shake!"), auto-fades after 4 seconds or on first shake
- Full Phase 3 device input system complete: shake-manager, shake-button, and onboarding-hint all wired into main.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Hold-to-shake fallback button** - `e390e6f` (feat)
2. **Task 2: Onboarding hint and final integration** - `673e4bb` (feat)
3. **Task 3: Verify Phase 3 device input system** - auto-approved checkpoint (no code changes)

## Files Created/Modified
- `src/input/shake-button.ts` - Hold-to-shake button with pointerdown gravity burst interval, Goofy mode multiplier, sleeping body wake-up
- `src/ui/onboarding-hint.ts` - Onboarding hint overlay with auto-fade after 4s, dismiss() handle for first-shake dismissal
- `src/main.ts` - Wired shake button (conditional on initShake result), onboarding hint (with ticker dismiss), merged getShakeState import

## Decisions Made
- Used Pointer Events (pointerdown/pointerup/pointercancel/pointerleave) with setPointerCapture for reliable hold detection across mouse and touch
- Random gravity bursts use angle + magnitude randomization (3-10 range) at 100ms interval for varied chaotic motion
- Onboarding hint positioned at top 25% of screen to not overlap with shake button at bottom
- Hint removal uses transitionend event listener to clean DOM after opacity fade completes
- Fallback mode determined by initShake() return value rather than a separate capability check

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failure in `src/input/__tests__/drag.test.ts` (screenToWorld coordinate scaling) -- not caused by our changes, already documented in Plan 01 summary as out of scope

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 device input system complete: shake detection, fallback button, onboarding hint all functional
- Ready for Phase 4 and beyond
- iOS DeviceMotion permission flow deferred to a later pass per user request

## Self-Check: PASSED

All 3 files verified present. Both task commits verified in git log.

---
*Phase: 03-device-input*
*Completed: 2026-03-06*
