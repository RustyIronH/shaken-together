---
phase: 03-device-input
plan: 01
subsystem: input
tags: [devicemotion, accelerometer, gravity, shake, matter-js, tdd]

# Dependency graph
requires:
  - phase: 01-physics-core
    provides: Matter.js engine with gravity, sleeping bodies, boundaries
  - phase: 02-rendering-engine
    provides: PixiJS renderer with ticker loop, scene state, physics modes
provides:
  - shake-manager module with DeviceMotion listener, exponential smoothing, gravity mapping
  - ShakeState and ShakeConfig types
  - Shake-related constants (SHAKE_CONFIG, GRAVITY_RESTING_MAGNITUDE)
  - Gravity lerp for smooth return to default on shake stop
  - Sleeping body wake-up on shake detection
  - iOS permission detection and Android auto-grant
affects: [03-device-input, fallback-button, onboarding-hint]

# Tech tracking
tech-stack:
  added: [DeviceMotion API (native)]
  patterns: [snow-globe gravity mapping, exponential smoothing, frame-rate independent lerp]

key-files:
  created:
    - src/input/shake-manager.ts
    - src/input/__tests__/shake.test.ts
  modified:
    - src/types.ts
    - src/constants.ts
    - src/main.ts

key-decisions:
  - "Used accelerationIncludingGravity (not acceleration) for maximum device compatibility including phones without gyroscopes"
  - "Safe window reference via globalThis for Node test compatibility in initShake"
  - "Lerp runs every frame after face expression timers using live scene.currentMode reference"

patterns-established:
  - "Shake module pattern: self-contained module with internal state, pure functions exported for testing, _resetShakeState test helper"
  - "Frame-rate independent exponential decay: 1 - Math.pow(1 - speed, deltaMs / 16.67)"

requirements-completed: [INPT-01, INPT-02]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 3 Plan 01: Shake Detection Summary

**DeviceMotion-to-gravity pipeline with exponential smoothing, Goofy 2x multiplier, frame-rate independent lerp, and sleeping body wake-up**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T00:44:31Z
- **Completed:** 2026-03-06T00:49:19Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Shake manager module maps accelerometer data to Matter.js gravity using snow globe model
- 11 unit tests covering gravity mapping, smoothing, goofy multiplier, lerp, wake, and permission detection
- Gravity smoothly lerps back to default when shaking stops (frame-rate independent)
- iOS permission detection and Android auto-grant handled with safe Node test compatibility
- Wired into main.ts ticker for continuous gravity lerp every frame

## Task Commits

Each task was committed atomically:

1. **Task 1: Shake types, constants, and test scaffold** - `5ff3946` (test)
2. **Task 2: Implement shake-manager.ts (GREEN phase)** - `cf8d810` (feat)
3. **Task 3: Wire shake manager into main.ts** - `7c4ab9e` (feat)

_TDD flow: Task 1 (RED) created 11 failing tests, Task 2 (GREEN) made them all pass._

## Files Created/Modified
- `src/input/shake-manager.ts` - DeviceMotion listener, exponential smoothing, gravity mapping, lerp, body wake-up, permission handling
- `src/input/__tests__/shake.test.ts` - 11 unit tests covering all shake behaviors
- `src/types.ts` - Added ShakeState and ShakeConfig interfaces
- `src/constants.ts` - Added SHAKE_CONFIG and GRAVITY_RESTING_MAGNITUDE constants
- `src/main.ts` - Imported and initialized shake manager, added gravity lerp to ticker

## Decisions Made
- Used `accelerationIncludingGravity` instead of `acceleration` per research -- works on devices without gyroscopes
- Safe window reference via `typeof window !== 'undefined' ? window : globalThis.window` for Node test environment compatibility
- Gravity lerp placed after face expression timers in ticker, using `scene.currentMode` (not captured reference) to follow live mode switches
- Tests use `globalThis.window` mock and `globalThis.DeviceMotionEvent` mock for permission detection tests in Node environment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing afterEach import in test file**
- **Found during:** Task 2 (GREEN phase test run)
- **Issue:** Test file used `afterEach` but only imported `beforeEach` from vitest
- **Fix:** Added `afterEach` to the vitest import
- **Files modified:** src/input/__tests__/shake.test.ts
- **Verification:** All 11 tests pass
- **Committed in:** cf8d810 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed window not defined in Node test environment**
- **Found during:** Task 2 (GREEN phase test run)
- **Issue:** Permission detection tests used `window.addEventListener` which doesn't exist in Vitest's Node environment
- **Fix:** Added `globalThis.window` mock in test beforeEach; used safe window reference in shake-manager.ts
- **Files modified:** src/input/__tests__/shake.test.ts, src/input/shake-manager.ts
- **Verification:** All 11 tests pass including permission detection tests
- **Committed in:** cf8d810 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed lerp test expecting too much convergence in 60 frames**
- **Found during:** Task 2 (GREEN phase test run)
- **Issue:** Test expected gravity to converge within 0.05 of target after 60 frames, but lerpSpeed=0.05 only reaches ~95% in 60 frames (residual = 0.23)
- **Fix:** Changed test to run 120 frames (2 seconds) where residual drops to ~0.01
- **Files modified:** src/input/__tests__/shake.test.ts
- **Verification:** Lerp test passes with correct mathematical convergence
- **Committed in:** cf8d810 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for test correctness. No scope creep.

## Issues Encountered
- Pre-existing test failure in `src/input/__tests__/drag.test.ts` (screenToWorld coordinate scaling) -- not caused by our changes, out of scope per deviation rules

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shake-to-gravity pipeline complete, ready for Plan 02 (fallback button for non-motion users)
- initShake returns permission state for UI decisions (show/hide fallback button)
- getShakeState() exported for onboarding hint logic

## Self-Check: PASSED

All 5 files verified present. All 3 task commits verified in git log.

---
*Phase: 03-device-input*
*Completed: 2026-03-06*
