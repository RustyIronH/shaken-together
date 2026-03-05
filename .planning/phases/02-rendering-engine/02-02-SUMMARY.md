---
phase: 02-rendering-engine
plan: 02
subsystem: rendering
tags: [pixijs, webgl, visual-effects, physics-sync, impact-flash, squash-stretch, speed-lines]

# Dependency graph
requires:
  - phase: 02-rendering-engine
    plan: 01
    provides: "PixiJS Application, character definitions, RagdollSprite, face expressions"
  - phase: 01-physics-engine
    provides: "Matter.js engine, ragdoll bodies, drag system, scene state"
provides:
  - "PixiJS-driven main.ts with physics-to-sprite sync at 60fps"
  - "3 pooled visual effect systems (impact flashes, speed lines, squash-stretch)"
  - "Collision-reactive face expressions (surprised/dazed with timers)"
  - "Drag feedback (5% scale-up) and z-order via PixiJS container reordering"
  - "screenToWorld updated for PixiJS autoDensity CSS-pixel coordinates"
affects: [03-input-controls, 06-capture]

# Tech tracking
tech-stack:
  added: []
  patterns: [object-pooling for effects, collision-to-visual event pipeline, ticker-based sync loop]

key-files:
  created:
    - src/renderer/effects/squash-stretch.ts
    - src/renderer/effects/speed-lines.ts
    - src/renderer/effects/impact-flash.ts
  modified:
    - src/main.ts
    - src/renderer/colors.ts
    - src/input/drag-manager.ts

key-decisions:
  - "screenToWorld simplified to CSS-pixel offset subtraction (no scaling) for PixiJS autoDensity compatibility"
  - "Z-order handled in ticker via container reordering (avoids coupling drag-manager to PixiJS)"
  - "Impact force from relative velocity (not pair.normalImpulse) per Research Pitfall 6"
  - "Face expression timers managed in main.ts ticker (surprised=800ms, dazed=1500ms)"
  - "Speed lines check only 6 body parts per ragdoll (head, torso, hands, feet) for performance"

patterns-established:
  - "Object pooling: pre-allocate Graphics objects, toggle visible/invisible per frame"
  - "Collision-to-visual pipeline: Events.on(engine, collisionStart) -> spawn effect + set face"
  - "Ticker-based sync: single app.ticker.add() handles position, scale, effects, face timers"

requirements-completed: [RNDR-01, RNDR-03, PLAT-03]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 2 Plan 2: PixiJS Integration and Visual Effects Summary

**Main.ts rewired to PixiJS with physics-to-sprite sync, 3 pooled visual effects (impact flashes, squash-stretch, speed lines), collision-reactive face expressions, and drag feedback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T04:28:03Z
- **Completed:** 2026-03-05T04:31:38Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Replaced Canvas2D debug renderer with PixiJS WebGL pipeline; ragdolls appear as cartoon character sprites synced to physics bodies every frame
- Created 3 visual effect systems: impact flashes (star bursts at collision points), squash-stretch (velocity-based deformation), and speed lines (trails behind fast parts)
- Collision events trigger face expression changes (surprised on force>5, dazed on force>10) with automatic revert to neutral
- Drag feedback scales grabbed ragdolls 1.05x and brings them to front via PixiJS container reordering

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire main.ts to PixiJS renderer with physics-to-sprite sync and drag feedback** - `d9eb00a` (feat)
2. **Task 2: Visual effects -- impact flashes, squash-stretch, speed lines, face expressions** - `4571cfa` (feat)

## Files Created/Modified
- `src/main.ts` - Complete rewrite: async IIFE with PixiJS renderer, ticker sync, effects, collision events, face state management
- `src/renderer/effects/squash-stretch.ts` - Velocity-based scale deformation (up to 20%) with rest threshold
- `src/renderer/effects/speed-lines.ts` - Pooled trailing lines behind 6 tracked body parts per ragdoll
- `src/renderer/effects/impact-flash.ts` - Pooled star burst flashes at collision midpoints with 150ms linear fade
- `src/renderer/colors.ts` - Added bringContainerToFront for PixiJS z-order management
- `src/input/drag-manager.ts` - Simplified screenToWorld for PixiJS autoDensity (CSS coords = world coords)

## Decisions Made
- screenToWorld simplified to pure CSS-pixel offset subtraction (no DPR scaling) because PixiJS autoDensity means stage coordinates equal CSS coordinates equal physics coordinates
- Z-order handled entirely in the ticker via container reordering based on activeDrags, keeping the drag-manager decoupled from PixiJS
- Impact force calculated from relative velocity of colliding bodies (not pair.normalImpulse which is unreliable per Research Pitfall 6)
- Face expression state managed per-ragdoll in main.ts with timers: surprised=800ms, dazed=1500ms before reverting to neutral
- Speed lines only check 6 of 15 body parts per ragdoll (head, upperTorso, handL, handR, footL, footR) for performance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PixiJS rendering pipeline is fully operational with all 4 visual effects active
- Character selection UI integration (assigning characters to ragdoll slots in the panel) is planned for a later plan
- Debug renderer remains in codebase but is no longer imported by main.ts
- Input system works on the new PixiJS canvas; ready for Phase 3 enhancements

---
*Phase: 02-rendering-engine*
*Completed: 2026-03-05*
