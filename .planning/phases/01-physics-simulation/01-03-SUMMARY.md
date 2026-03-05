---
phase: 01-physics-simulation
plan: 03
subsystem: input, renderer
tags: [matter-js, canvas2d, multi-touch, pointer-events, drag-fling, debug-renderer, z-order, glow]

# Dependency graph
requires:
  - phase: 01-physics-simulation/02
    provides: "Matter.js Engine, ragdoll factory, world management, angle constraints"
provides:
  - "Canvas2D debug renderer drawing bodies as colored shapes with gradient background"
  - "Joint constraint visualization as semi-transparent white lines"
  - "Glow highlight on grabbed bodies via shadowBlur"
  - "Z-order management: last-touched ragdoll renders on top"
  - "Multi-touch drag system with per-pointer constraint tracking via Pointer Events"
  - "Fling-on-release with velocity proportional to swipe speed"
  - "Screen-to-world coordinate conversion with getBoundingClientRect scaling"
affects: [01-04, 02-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [custom-multi-touch-drag, canvas2d-debug-renderer, screen-to-world-coordinates, velocity-tracking-ring-buffer]

key-files:
  created:
    - src/input/drag-manager.ts
    - src/input/multi-touch.ts
    - src/renderer/debug-renderer.ts
    - src/renderer/colors.ts
  modified:
    - src/input/__tests__/drag.test.ts

key-decisions:
  - "Drag constraints use render.visible=false to distinguish from joint constraints in renderer"
  - "Z-order implemented via Array.splice/push on engine.world.composites (both in drag-manager and colors.ts)"
  - "Velocity calculation uses first-to-last position delta (not average of pairwise deltas) for simplicity and correctness"
  - "screenToWorld uses getBoundingClientRect ratio to handle CSS/pixel size mismatch"

patterns-established:
  - "Pointer Events multi-touch: pointerdown/pointermove/pointerup/pointercancel on canvas with touchAction='none'"
  - "Velocity ring buffer: trackPosition keeps last N samples, calculateReleaseVelocity uses first-to-last delta"
  - "Drag constraint lifecycle: Constraint.create on down, pointA update on move, Composite.remove + Body.setVelocity on up"
  - "Debug renderer loop: clear -> gradient -> sort bodies by composite z-order -> draw shapes -> draw glow -> draw constraints"

requirements-completed: [PHYS-01, PHYS-06]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 1 Plan 3: Debug Renderer and Multi-Touch Drag Summary

**Canvas2D debug renderer with z-ordered colored shapes and glow highlights, plus multi-touch drag/fling system with per-pointer constraint tracking and velocity-based release, validated by 14 drag tests (60 total passing)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T03:24:35Z
- **Completed:** 2026-03-05T03:27:58Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Built multi-touch drag system using Pointer Events with per-pointer constraint tracking, hit testing via Query.point, and double-grab prevention
- Implemented fling-on-release using a rolling position buffer with configurable sample count and velocity scaling
- Created Canvas2D debug renderer drawing bodies as circles (head/hands/feet) or rectangles (torso/limbs) with gradient background
- Added glow highlight effect (shadowBlur) on grabbed bodies and z-order management for last-touched-on-top rendering
- Joint constraints rendered as semi-transparent white lines, drag constraints excluded

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1: Multi-touch drag system with fling-on-release**
   - RED: `74eb0fb` (test) - 14 failing tests for drag manager
   - GREEN: `9d99060` (feat) - Implementation making all 14 tests pass

2. **Task 2: Canvas2D debug renderer with glow and z-order**
   - `3ab7c90` (feat) - Renderer and colors utilities, verified via TypeScript compilation

## Files Created/Modified
- `src/input/drag-manager.ts` - screenToWorld, handlePointerDown/Move/Up, trackPosition, calculateReleaseVelocity
- `src/input/multi-touch.ts` - setupMultiTouch (event registration + touchAction), cleanupMultiTouch
- `src/renderer/debug-renderer.ts` - createDebugRenderer, renderFrame (gradient, bodies, glow, constraints), resizeCanvas
- `src/renderer/colors.ts` - bringToFront (z-order reorder), drawGlow (shadowBlur highlight)
- `src/input/__tests__/drag.test.ts` - 14 tests covering velocity, hit testing, drag lifecycle, coordinate conversion

## Decisions Made
- Drag constraints created with `render: { visible: false }` so the debug renderer can skip them when drawing joint lines
- Z-order reordering via direct array manipulation (splice + push on `engine.world.composites`) -- used in both `drag-manager.ts` (on pointer down) and `colors.ts` (utility function)
- Velocity calculation uses first-to-last delta rather than averaging pairwise deltas -- simpler, handles edge cases cleanly
- screenToWorld conversion uses `getBoundingClientRect()` with width/height ratio scaling per research pitfall #6

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Debug renderer is ready to be called from requestAnimationFrame in the main game loop (Plan 04)
- Multi-touch drag system is ready for integration via setupMultiTouch(canvas, engine, scene)
- All module exports match the interfaces specified in plan must_haves
- 60 total tests passing across 5 test files

## Self-Check: PASSED

All 5 created/modified files verified present. All 3 task commits (74eb0fb, 9d99060, 3ab7c90) verified in git log.

---
*Phase: 01-physics-simulation*
*Completed: 2026-03-05*
