---
phase: 02-rendering-engine
plan: 03
subsystem: ui
tags: [character-selection, dropdown, swap-logic, responsive-layout, mobile-first, panel-ui]

# Dependency graph
requires:
  - phase: 02-rendering-engine
    plan: 02
    provides: "PixiJS main.ts with physics-to-sprite sync, swapCharacterSkin, face expressions"
  - phase: 02-rendering-engine
    plan: 01
    provides: "Character registry, RagdollSprite, 4 character definitions"
  - phase: 01-physics-engine
    provides: "Matter.js engine, ragdoll creation, scene state, panel UI"
provides:
  - "Character selection dropdowns in slide-out panel (per doll slot)"
  - "No-duplicates-until-all-used character assignment in world.ts"
  - "Two-doll character swap on duplicate manual selection"
  - "getAvailableCharacters helper for querying unused characters"
  - "CHARACTER_IDS constant in constants.ts (physics-layer character list)"
  - "Responsive physics boundary updates on window resize"
affects: [03-input-controls, 06-capture]

# Tech tracking
tech-stack:
  added: []
  patterns: [swap-on-duplicate character selection, getter-callback pattern for panel scene access]

key-files:
  created: []
  modified:
    - src/ui/panel.ts
    - src/main.ts
    - src/physics/world.ts
    - src/constants.ts

key-decisions:
  - "CHARACTER_IDS defined in constants.ts to keep physics layer independent of renderer module"
  - "Character assignment via cycling with skip-used logic in world.ts (not main.ts)"
  - "Manual character selection enforces no-duplicates via two-doll swap (trading card UX)"
  - "Panel receives getScene getter callback to read current ragdoll state for dropdown values"
  - "Physics boundaries rebuilt on window resize to match new screen dimensions"

patterns-established:
  - "Getter callback pattern: panel receives () => SceneState to read live scene data"
  - "Swap-on-duplicate: selecting a character already in use swaps the two dolls' characters"
  - "Boundary rebuild on resize: remove all boundary-labeled bodies, recreate with new dimensions"

requirements-completed: [RNDR-02, PLAT-03]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 2 Plan 3: Character Selection UI and Responsive Layout Summary

**Character selection dropdowns in slide-out panel with no-duplicates auto-assignment, two-doll swap on manual selection, and responsive physics boundaries on window resize**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T04:34:41Z
- **Completed:** 2026-03-05T04:38:47Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Character assignment logic moved to world.ts with no-duplicates-until-all-used cycling; each new ragdoll gets a unique character until all 4 are used
- Panel shows "Characters" section with per-doll dropdown selectors styled to match existing dark panel aesthetic
- Selecting a character already used by another doll swaps the two dolls' characters (trading card UX), preserving positions and velocities
- Physics boundaries now update on window resize, ensuring ragdolls stay contained on mobile rotation or desktop resize

## Task Commits

Each task was committed atomically:

1. **Task 1: Character assignment logic and world.ts updates** - `5a552a1` (feat)
2. **Task 2: Character selection UI in panel + swap wiring + responsive layout** - `0e2750d` (feat)

## Files Created/Modified
- `src/constants.ts` - Added CHARACTER_IDS constant with all 4 character IDs (physics-layer, avoids renderer import)
- `src/physics/world.ts` - Character assignment in addRagdoll with no-duplicates cycling, getAvailableCharacters helper, characterIndex reset in createScene
- `src/ui/panel.ts` - Extended PanelCallbacks with onCharacterChange, PanelHandle with updateCharacterSelectors, added Characters section with dropdown per doll, getScene getter pattern
- `src/main.ts` - Removed main.ts character cycling (now in world.ts), wired onCharacterChange with two-doll swap logic, added resize handler for physics boundaries, set touch-action on canvas

## Decisions Made
- CHARACTER_IDS defined in constants.ts rather than importing from character-registry.ts to keep physics layer independent of the rendering module
- Character assignment logic centralized in world.ts (addRagdoll) rather than main.ts, since characterId is a property of RagdollInstance and should be set at creation
- Manual character selection enforces no-duplicates via swap behavior: if Doll 2 selects "Buff" which Doll 3 already has, they trade characters. This is the cleanest UX (no error messages, no disabled options)
- Panel receives a `getScene: () => SceneState` getter callback rather than a direct reference, allowing it to always read the current scene state when rebuilding selectors
- Physics boundaries rebuilt on window resize by removing all boundary-labeled static bodies and recreating them with new dimensions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused Body import in main.ts**
- **Found during:** Task 2
- **Issue:** TypeScript strict mode flagged unused `Body` import after refactoring main.ts
- **Fix:** Removed `Body` from the matter-js import statement
- **Files modified:** src/main.ts
- **Verification:** npm run build succeeds
- **Committed in:** 0e2750d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Character selection feature is complete (RNDR-02): users can see and change character assignments via panel dropdowns
- Responsive layout confirmed (PLAT-03): canvas fills viewport, physics boundaries update on resize, touch-action set for mobile
- Ready for Plan 02-04 (remaining rendering engine work) or Phase 3 (input controls)

## Self-Check: PASSED

All 4 modified files verified on disk. Both task commits (5a552a1, 0e2750d) verified in git log.

---
*Phase: 02-rendering-engine*
*Completed: 2026-03-05*
