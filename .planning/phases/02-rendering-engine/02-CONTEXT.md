# Phase 2: Rendering Engine - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Canvas2D debug renderer with a PixiJS WebGL sprite renderer. Ragdolls become recognizable cartoon characters with articulated limbs synced to physics body positions. Users choose which characters appear in the scene. Mobile-first responsive canvas at 60fps. No new physics features, no shake detection, no capture — this phase makes the existing physics sandbox visually polished.

</domain>

<decisions>
## Implementation Decisions

### Character art style
- Simple & bold: thick outlines, flat vibrant colors, exaggerated proportions (big heads, stubby limbs, bean-shaped bodies)
- Think "Dumb Ways to Die" / "Fall Guys" aesthetic — funny inherently, reads well on small phone screens
- 4 starter characters with varied body shapes (one tall & thin, one short & round, one buff, one small)
- Different silhouettes create funnier physics interactions (heavy vs light, big vs small)
- Reactive faces: 2-3 expression states per character (neutral, surprised on collision/fling, dazed after big impact)
- Art assets created programmatically using PixiJS Graphics API — no external image files, always crisp at any resolution

### Sprite articulation
- Per-part sprites: each of the 15 physics body parts gets its own drawn PixiJS graphic
- 1:1 mapping to physics bodies — each sprite follows its Body position and angle exactly
- Full physics rotation — sprites rotate freely with their physics body, no visual clamping (extreme poses ARE the comedy)
- Overlapping pieces at joints — body parts slightly overlap at connection points for seamless look (no visible gaps or pins)
- Joint constraint lines from debug view are removed

### Character selection UX
- Character selection lives in the existing slide-out panel (consistent with doll count and mode controls)
- Each doll slot shows which character is assigned with a dropdown to change
- New dolls get randomly assigned characters (no duplicates until all 4 are used)
- No duplicate characters allowed in the same scene (with 4 characters and max 5 dolls, 5th slot allows one repeat)
- Changing a character replaces the skin in-place — position, velocity, and entanglements preserved (instant visual swap)

### Visual effects
- Subtle impact flashes: brief white flash/star burst at collision point, scaled to collision force (gentle bumps get nothing, big slams get a flash)
- Subtle squash-and-stretch: body parts slightly compress on impact and stretch when moving fast (10-20% deformation max)
- Subtle speed lines: short trailing lines behind fast-moving body parts above a velocity threshold
- Drag feedback: outline glow (ported from debug view) + ~5% scale-up on grabbed doll to feel "lifted", returns to normal on drop

### Claude's Discretion
- PixiJS container hierarchy and render pipeline architecture
- Exact character designs (proportions, colors, face details) within the "simple & bold" style
- Squash-and-stretch implementation approach (scale transform vs vertex manipulation)
- Speed line rendering technique
- Impact flash particle system details
- Canvas resize and device pixel ratio handling for crisp rendering

</decisions>

<specifics>
## Specific Ideas

- Characters should be funny just standing still — the body shapes and faces do comedy work before physics even starts
- The programmatic art approach means characters can be tweaked and iterated quickly during development
- Varied body shapes (tall/thin vs short/round) create natural comedy when tangled — mismatched proportions in intimate poses
- Reactive faces add personality to screenshots — a dazed expression on a character in a weird pose is funnier than a static face

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/renderer/debug-renderer.ts`: Current Canvas2D renderer — same integration pattern (renderFrame called per rAF). Will be replaced entirely.
- `src/renderer/colors.ts`: drawGlow function, bringToFront z-ordering — glow concept carries over to PixiJS, z-order via container ordering
- `src/types.ts`: RagdollInstance with `bodies: Map<string, Body>` and DollColorScheme — sprite renderer reads body positions from same structure
- `src/constants.ts`: BODY_PARTS (15 labels), COLOR_SCHEMES — character-specific palettes will replace color schemes

### Established Patterns
- Physics-render separation: Matter.Runner handles physics (fixed timestep), requestAnimationFrame handles rendering (display refresh) — same pattern continues with PixiJS
- Scene state (SceneState type) tracks ragdolls, dollCount, currentMode, activeDrags — renderer reads this
- Z-order via composite ordering in engine.world.composites — PixiJS can mirror this with container z-index

### Integration Points
- `src/main.ts:49-53`: renderFrame(ctx, engine, scene) in the game loop — replace with PixiJS render call
- `src/main.ts:25`: createDebugRenderer(canvas) — replace with PixiJS Application/Stage setup
- `src/ui/panel.ts`: Panel callbacks — add character selection controls alongside existing doll count and mode controls
- `src/physics/world.ts`: setDollCount, resetScene — character assignment logic connects here

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-rendering-engine*
*Context gathered: 2026-03-05*
