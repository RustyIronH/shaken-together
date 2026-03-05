---
phase: 02-rendering-engine
plan: 01
subsystem: rendering
tags: [pixijs, webgl, graphics-context, character-art, ragdoll-sprite]

# Dependency graph
requires:
  - phase: 01-physics-engine
    provides: "Matter.js ragdoll with 15 body parts, RagdollInstance type, constants"
provides:
  - "PixiJS Application with WebGL, 3-layer container hierarchy"
  - "4 character definitions with 15 body part GraphicsContexts each"
  - "3 face expressions per character (neutral, surprised, dazed)"
  - "RagdollSprite creation with Container and 15 Graphics children"
  - "In-place character skin swap via GraphicsContext replacement"
  - "CharacterId type integrated into RagdollInstance"
affects: [02-rendering-engine, 03-input-controls, 06-capture]

# Tech tracking
tech-stack:
  added: [pixi.js@^8.16.0]
  patterns: [GraphicsContext sharing, async Application init, shape-first-style-after API]

key-files:
  created:
    - src/renderer/pixi-renderer.ts
    - src/renderer/character-registry.ts
    - src/renderer/ragdoll-sprite.ts
    - src/renderer/faces.ts
    - src/renderer/characters/slim.ts
    - src/renderer/characters/round.ts
    - src/renderer/characters/buff.ts
    - src/renderer/characters/tiny.ts
  modified:
    - package.json
    - src/types.ts
    - src/physics/ragdoll.ts

key-decisions:
  - "All body part shapes drawn centered at (0,0) for direct Matter.js position sync"
  - "characterId added to RagdollInstance with default='slim' to preserve backward compatibility"
  - "Face expressions as separate GraphicsContexts for cheap context swap on head Graphics"
  - "Characters defined at module load time; shared GraphicsContexts never destroyed during gameplay"

patterns-established:
  - "GraphicsContext sharing: define shapes once per character, instantiate with new Graphics(context)"
  - "Draw order convention: legs behind, torso middle, arms front, head on top"
  - "3-layer stage hierarchy: backgroundLayer, ragdollLayer, effectsLayer"
  - "Gradient background via 32 horizontal strips with interpolated colors"

requirements-completed: [RNDR-01, RNDR-03, PLAT-03]

# Metrics
duration: 5min
completed: 2026-03-05
---

# Phase 2 Plan 1: PixiJS Rendering Foundation Summary

**PixiJS v8 WebGL renderer with 4 programmatic character definitions (15 body parts each), face expressions, and RagdollSprite container hierarchy**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T04:19:28Z
- **Completed:** 2026-03-05T04:24:44Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- PixiJS v8 installed and configured with WebGL, autoDensity, resize support, and 3-layer container hierarchy
- 4 distinct characters created (Slim/green, Round/orange, Buff/red, Tiny/purple) with unique silhouettes and color palettes
- Each character has 15 body part GraphicsContexts and 3 face expressions (neutral, surprised, dazed)
- RagdollSprite class builds Container with 15 Graphics children in correct draw order, supports in-place character skin swapping

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PixiJS, create renderer types, and PixiJS Application setup** - `721112b` (feat)
2. **Task 2: Create 4 character definitions with body parts and face expressions** - `a784874` (feat)
3. **Task 3: Create RagdollSprite class with Container and 15 Graphics children** - `8cb86e0` (feat)

## Files Created/Modified
- `src/renderer/pixi-renderer.ts` - PixiJS Application setup with 3-layer hierarchy and gradient background
- `src/renderer/character-registry.ts` - CharacterDefinition type, CHARACTERS registry, getCharacter lookup
- `src/renderer/ragdoll-sprite.ts` - RagdollSprite creation, skin swap, and destroy functions
- `src/renderer/faces.ts` - Face expression GraphicsContexts (neutral, surprised, dazed)
- `src/renderer/characters/slim.ts` - Tall/thin character with green palette
- `src/renderer/characters/round.ts` - Short/wide character with orange palette
- `src/renderer/characters/buff.ts` - Muscular character with red palette
- `src/renderer/characters/tiny.ts` - Small character with purple palette and large head
- `src/types.ts` - Added CharacterId type and characterId field to RagdollInstance
- `src/physics/ragdoll.ts` - Updated createRagdoll to accept and return characterId
- `package.json` - Added pixi.js@^8.16.0 dependency

## Decisions Made
- All body part shapes drawn centered at (0,0) to ensure direct 1:1 mapping with Matter.js body.position (no offset needed)
- Added `characterId` to `RagdollInstance` with a default value of `'slim'` so existing code and tests continue working without changes
- Face expressions stored as separate GraphicsContexts; swapping the head Graphics context is cheap and avoids recreating the display object
- Characters are instantiated at module load time; the shared GraphicsContexts persist for the lifetime of the app since multiple ragdolls may reference them

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added characterId to createRagdoll and RagdollInstance construction**
- **Found during:** Task 1 (types.ts modification)
- **Issue:** Adding required `characterId` to `RagdollInstance` interface broke existing `createRagdoll` which didn't provide the field
- **Fix:** Added `characterId` parameter with default `'slim'` to `createRagdoll()` and included it in the return object
- **Files modified:** `src/physics/ragdoll.ts`
- **Verification:** `npx tsc --noEmit` passes, existing tests unaffected due to default parameter
- **Committed in:** `721112b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to maintain TypeScript strict mode compliance. Default parameter preserves backward compatibility.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PixiJS Application, character registry, and RagdollSprite are ready for Plan 02 integration into the game loop
- Physics-to-sprite sync (Ticker-based position/rotation updates) is the next step
- Old debug renderer remains untouched and functional until replaced
- Character selection UI integration planned for a later plan

## Self-Check: PASSED

All 8 created files verified on disk. All 3 task commits (721112b, a784874, 8cb86e0) verified in git log.

---
*Phase: 02-rendering-engine*
*Completed: 2026-03-05*
