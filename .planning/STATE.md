---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 3 context gathered
last_updated: "2026-03-06T00:28:09.884Z"
last_activity: 2026-03-05 -- Plan 02-04 complete (Rendering engine verification checkpoint)
progress:
  total_phases: 10
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** Shaking the phone must feel satisfying and the ragdolls must land in funny, sharable positions
**Current focus:** Phase 2: Rendering Engine (complete)

## Current Position

Phase: 2 of 10 (Rendering Engine)
Plan: 4 of 4 complete (phase complete)
Status: Executing
Last activity: 2026-03-05 -- Plan 02-04 complete (Rendering engine verification checkpoint)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 4min
- Total execution time: 0.50 hours

**By Phase:**

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01 | P01 | 4min | 3 | 13 |
| 01 | P02 | 6min | 2 | 9 |
| 01 | P03 | 3min | 2 | 5 |
| 01 | P04 | 3min | 3 | 8 |
| 02 | P01 | 5min | 3 | 12 |
| 02 | P02 | 4min | 2 | 6 |
| 02 | P03 | 4min | 2 | 4 |
| 02 | P04 | 1min | 1 | 0 |

**Recent Trend:**
- Last 5 plans: 5min, 4min, 4min, 1min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Physics-first build order -- physics simulation is the foundation, rendering visualizes it, input makes it interactive, capture makes it shareable
- [Roadmap]: Infrastructure + accounts built in parallel with client-side phases (no dependency)
- [Roadmap]: Gallery split into core (submit/browse/view) and social (ratings/sorting) for fine granularity
- [Roadmap]: Start with Matter.js for physics; switch to Rapier only if 5-ragdoll 60fps benchmark fails on mid-range Android
- [Phase 01]: 15 body parts with 14 joints for complete ragdoll tree; added missing ankleR joint
- [Phase 01]: Manual Vite scaffold (create-vite CLI incompatible with automation)
- [Phase 01]: Matter.js static bodies ignore restitution/friction in constructor options; must set after creation
- [Phase 01]: Angle limits enforced via beforeUpdate hook clamping bodyB relative to bodyA; angular velocity zeroed on clamp
- [Phase 01]: Drag constraints use render.visible=false to distinguish from joint constraints in renderer
- [Phase 01]: Z-order via Array.splice/push on engine.world.composites for last-touched-on-top rendering
- [Phase 01]: Velocity calculation uses first-to-last position delta with FLING_VELOCITY_SCALE for fling-on-release
- [Phase 01]: All UI styles inline in JavaScript for self-contained debug UI (easy to replace in Phase 2)
- [Phase 01]: Physics Runner and render loop decoupled: Matter.Runner (fixed timestep) vs requestAnimationFrame (display refresh)
- [Phase 02]: All body part shapes drawn centered at (0,0) for direct Matter.js position sync
- [Phase 02]: characterId added to RagdollInstance with default='slim' for backward compatibility
- [Phase 02]: Face expressions as separate GraphicsContexts for cheap head context swap
- [Phase 02]: Characters defined at module load time; shared GraphicsContexts never destroyed during gameplay
- [Phase 02]: screenToWorld simplified to CSS-pixel offset subtraction for PixiJS autoDensity compatibility
- [Phase 02]: Z-order in ticker via container reordering (drag-manager decoupled from PixiJS)
- [Phase 02]: Impact force from relative velocity (not pair.normalImpulse) per Research Pitfall 6
- [Phase 02]: Face expression timers in main.ts ticker (surprised=800ms, dazed=1500ms)
- [Phase 02]: Speed lines check only 6 of 15 body parts per ragdoll for performance
- [Phase 02]: CHARACTER_IDS in constants.ts keeps physics layer independent of renderer module
- [Phase 02]: Character assignment centralized in world.ts addRagdoll (not main.ts)
- [Phase 02]: Manual character selection enforces no-duplicates via two-doll swap (trading card UX)
- [Phase 02]: Panel receives getScene getter callback for live scene state access
- [Phase 02]: Physics boundaries rebuilt on window resize for responsive layout
- [Phase 02]: Auto-approved verification checkpoint (auto_advance mode) after confirming successful build

### Pending Todos

None yet.

### Blockers/Concerns

- Matter.js performance validated in Phase 1 (60fps with 5 dolls); Rapier migration not needed unless mobile testing reveals issues
- Supabase content policy for explicit cartoons needs verification before Phase 6
- Character art assets resolved in Plan 02-01 (4 programmatic characters with distinct silhouettes)

## Session Continuity

Last session: 2026-03-06T00:28:09.882Z
Stopped at: Phase 3 context gathered
Resume file: .planning/phases/03-device-input/03-CONTEXT.md
