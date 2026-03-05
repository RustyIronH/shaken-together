---
phase: 01-physics-simulation
plan: 02
subsystem: physics
tags: [matter-js, ragdoll, physics-engine, constraints, world-management, tdd]

# Dependency graph
requires:
  - phase: 01-physics-simulation/01
    provides: "Vite + TypeScript project scaffold, shared types, constants, test stubs"
provides:
  - "Matter.js Engine with fixed timestep, sleeping, and velocity capping"
  - "Ragdoll factory producing 15-body/14-constraint composites with collision groups"
  - "Angle constraint enforcement via beforeUpdate hook with mode-aware limits"
  - "World management: boundaries, add/remove ragdolls, reset, live mode switching"
  - "Performance-validated physics (75 bodies updating under 8ms)"
affects: [01-03, 01-04, 02-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [ragdoll-as-composite, beforeUpdate-angle-clamping, static-body-property-workaround, tdd-red-green]

key-files:
  created:
    - src/physics/engine.ts
    - src/physics/ragdoll.ts
    - src/physics/ragdoll-config.ts
    - src/physics/constraints.ts
    - src/physics/world.ts
  modified:
    - src/physics/__tests__/ragdoll.test.ts
    - src/physics/__tests__/world.test.ts
    - src/physics/__tests__/mode.test.ts
    - src/physics/__tests__/performance.test.ts

key-decisions:
  - "Reconciled body count to 15 parts / 14 joints per actual constants (plan stated 14/13 but constants enumerated 15/14)"
  - "Static body restitution/friction must be set after Body creation -- Matter.js ignores these in options for isStatic bodies"
  - "Angle limits use bodyB clamping: relativeAngle = bodyB.angle - bodyA.angle, bodyB gets corrected"
  - "Color mapping: head=scheme.head, hands/feet=scheme.highlight, upper*=scheme.primary, lower*/forearms=scheme.secondary"

patterns-established:
  - "Ragdoll as Composite: Each ragdoll is a Matter.Composite with labeled bodies/constraints, added/removed as a unit"
  - "Angle clamping via Events.on(engine, beforeUpdate): Runtime limit records track bodyA/bodyB/min/max per ragdoll"
  - "Module-level state with _reset test helper: constraints.ts maintains runtime state, exports _resetAngleLimitsState() for test isolation"
  - "TDD with separate RED/GREEN commits: failing tests committed first, then implementation"

requirements-completed: [PHYS-01, PHYS-03, PHYS-04, PHYS-05]

# Metrics
duration: 6min
completed: 2026-03-05
---

# Phase 1 Plan 2: Core Physics Engine Summary

**Ragdoll factory with 15-body composites, beforeUpdate angle constraints, world management with boundaries/reset/live mode switching, all validated by 46 passing tests under 8ms per update**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-05T03:14:22Z
- **Completed:** 2026-03-05T03:20:44Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Built ragdoll factory producing anatomically correct 15-body/14-joint composites with negative collision groups preventing self-collision
- Implemented angle constraint enforcement via beforeUpdate hook, with mode-aware limit multipliers for Realistic vs Goofy
- Created world management module with 4 boundary walls, add/remove/reset/mode-switch operations
- All 46 physics tests pass including performance benchmark (75 dynamic bodies update under 8ms)

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1: Physics engine + ragdoll factory + angle constraints**
   - RED: `cfea8de` (test) - 16 failing tests for ragdoll, engine, constraints
   - GREEN: `97d44e0` (feat) - Implementation making all 21 tests pass

2. **Task 2: World management -- boundaries, doll count, reset, mode switching**
   - RED: `45f2fe0` (test) - 25 failing tests for world, mode, performance
   - GREEN: `cf957a4` (feat) - Implementation making all 25 tests pass

## Files Created/Modified
- `src/physics/engine.ts` - Matter.Engine + Runner setup with velocity capping via beforeUpdate
- `src/physics/ragdoll.ts` - createRagdoll() factory with collision groups, color mapping, labeled bodies/constraints
- `src/physics/ragdoll-config.ts` - resolveRagdollConfig() scales part dimensions by SIZE_SCALES[size]
- `src/physics/constraints.ts` - registerAngleLimits/enforceAngleLimits/updateAngleLimitsForMode with module-level state
- `src/physics/world.ts` - createScene, addRagdoll, removeRagdoll, setDollCount, resetScene, applyMode
- `src/physics/__tests__/ragdoll.test.ts` - 21 tests for ragdoll factory, engine config, angle constraints
- `src/physics/__tests__/world.test.ts` - 15 tests for boundaries, gravity, collision, doll count, reset
- `src/physics/__tests__/mode.test.ts` - 8 tests for mode switching (gravity, stiffness, friction, no-reset)
- `src/physics/__tests__/performance.test.ts` - 2 tests for 70+ body update time budget

## Decisions Made
- Reconciled body count: constants.ts defines 15 body parts and 14 joints (not the plan's stated 14/13). The plan enumerated 14+1 parts but listed "14 bodies" in specs. Using the actual constant definitions is correct.
- Matter.js static bodies ignore restitution/friction in constructor options. Must set `wall.restitution = 0.5` after creation.
- Angle limit enforcement clamps bodyB (the child in the joint pair) when relative angle exceeds limits, zeroing angular velocity to prevent jitter.
- Color scheme mapping: head gets `scheme.head`, hands/feet get `scheme.highlight`, upper body parts get `scheme.primary`, lower/forearm parts get `scheme.secondary`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reconciled body count to 15/14 per actual constants**
- **Found during:** Task 1
- **Issue:** Plan stated "14 bodies and 13 constraints" but constants.ts (from Plan 01) defines 15 body parts and 14 joints
- **Fix:** Implemented factory to create all 15 parts and 14 joints as defined in constants; updated test expectations accordingly
- **Files modified:** src/physics/ragdoll.ts, src/physics/__tests__/ragdoll.test.ts
- **Verification:** All body labels match RAGDOLL_PARTS, all constraint labels match RAGDOLL_JOINTS
- **Committed in:** 97d44e0

**2. [Rule 1 - Bug] Fixed Matter.js static body property initialization**
- **Found during:** Task 2
- **Issue:** Boundary walls had restitution=0 despite passing `restitution: 0.5` in options to `Bodies.rectangle()`. Matter.js ignores restitution/friction for static bodies in constructor options.
- **Fix:** Set `wall.restitution = 0.5` and `wall.friction = 0.3` explicitly after body creation
- **Files modified:** src/physics/world.ts
- **Verification:** Boundary wall restitution test passes
- **Committed in:** cf957a4

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. The body count reconciliation aligns implementation with the ground-truth constants. The static body fix is a Matter.js API quirk. No scope creep.

## Issues Encountered
None beyond the auto-fixed items documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Physics engine is fully functional headlessly -- ragdolls exist, joints work with angle limits, gravity pulls, boundaries contain, modes switch live, and reset works
- Ready for Plan 03 (Canvas2D debug renderer) to visualize the physics simulation
- Ready for Plan 04 (multi-touch drag) to add user interaction
- All module exports follow the interfaces specified in plan must_haves

## Self-Check: PASSED

All 9 created/modified files verified present. All 4 task commits (cfea8de, 97d44e0, 45f2fe0, cf957a4) verified in git log.

---
*Phase: 01-physics-simulation*
*Completed: 2026-03-05*
