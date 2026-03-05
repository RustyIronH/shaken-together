# Phase 1: Physics Simulation - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Ragdoll bodies with joints, gravity, collision, fixed-timestep game loop, and two physics modes (Realistic and Goofy). Users can select doll count (2-5), switch modes, reset the scene, and touch/drag individual ragdolls. No sprite rendering (Phase 2), no shake detection (Phase 3) — this phase delivers the physics sandbox with a debug view.

</domain>

<decisions>
## Implementation Decisions

### Ragdoll anatomy
- 14-part detailed ragdolls: head, upper torso, lower torso, upper arms (2), forearms (2), hands (2), upper legs (2), lower legs (2), feet (2)
- 13 joints per doll, 70 total bodies at max 5 dolls
- Realistic joint rotation limits in Realistic mode (elbows/knees only bend the natural way)
- 2-3 size variations across dolls (small, medium, large) — different mass and scale
- Phase 1 debug view uses colored shapes: circles for head/hands, rectangles for torso/limbs, lines for joints
- Each doll instance gets a unique color scheme regardless of size

### Goofy mode personality
- Maximum absurdity: rubber bounce (high restitution) + floppy joints (low damping) + reduced gravity combined
- Joint rotation limits widened in Goofy mode (further than natural, but not fully removed — no complete backwards bending)
- No actual limb stretching/elongation — "stretchy" means loose joints, not elastic bodies
- Mode switch applies live without resetting the scene — instant parameter change mid-action

### Scene boundaries
- Enclosed box on all four sides (snow globe containment)
- Soft cushion walls (moderate bounce, slight energy loss on impact)
- Simple gradient background
- Dolls start at random scattered positions with very slight overlap — initial physics separation creates a satisfying burst of movement

### Touch/drag interaction
- Grab any body part (head, limb, hand, foot, torso) — whatever you tap, that part follows your finger, rest of body dangles
- Fling on release — release velocity applied as force (fast swipe = launch, slow drag = gentle placement)
- Full collision while dragging — dragged doll pushes and collides with others (battering ram effect)
- Multi-touch supported — each finger can grab a different doll simultaneously
- Highlight glow on grabbed doll for visibility in tangles
- Dynamic z-order — last-touched doll renders on top

### Controls
- All controls (doll count selector, Realistic/Goofy mode toggle, reset button) inside a left-side slide-out panel
- Hamburger menu icon to open the panel
- Physics keeps running while panel is open (dolls continue falling behind the overlay)
- No always-visible controls — maximum play area

### Doll-on-doll interaction
- High friction between body parts — tangling encouraged
- Limbs catch on each other, dolls get stuck in interlocked positions
- Core to the "funny sharable positions" goal

### Reset behavior
- Instant teleport to new random positions (no animation)
- No undo — reset is one-way
- Changing doll count adds/removes dolls without resetting existing positions
- New dolls spawn at random positions with very slight overlap

### Claude's Discretion
- Physics engine configuration and timestep tuning
- Exact joint constraint parameters for each mode
- Gradient color scheme for background
- Glow/highlight implementation details
- Slide-out panel styling and animation
- Performance optimization approach (Matter.js vs Rapier decision based on benchmarking)

</decisions>

<specifics>
## Specific Ideas

- Snow globe feel — dolls are contained and bounce around inside the box
- The initial spawn overlap creates an immediate physics interaction — dolls push apart as the first thing users see
- Tangling is the whole point — high friction so limbs catch and create funny positions
- Battering ram mechanic — drag one doll into others to knock them around
- Live mode switching for instant gratification — toggle Goofy mid-chaos

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing code — greenfield project

### Established Patterns
- No existing patterns — this phase establishes the foundation

### Integration Points
- Phase 2 (Rendering) will replace the colored-shape debug view with PixiJS sprite rendering synced to physics body positions
- Phase 3 (Device Input) will apply DeviceMotion forces to the physics bodies
- Physics engine must expose a force/impulse API for shake integration

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-physics-simulation*
*Context gathered: 2026-03-05*
