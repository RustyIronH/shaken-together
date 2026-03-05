# Phase 1: Physics Simulation - Research

**Researched:** 2026-03-05
**Domain:** 2D ragdoll physics simulation (browser-based, mobile-first)
**Confidence:** MEDIUM-HIGH

## Summary

This phase builds the foundation: a 2D physics sandbox with 2-5 ragdoll characters that have realistic joint constraints, gravity, collision, touch/drag interaction, and two physics personalities (Realistic/Goofy). The primary engine is Matter.js 0.20.0, a well-documented JavaScript 2D physics engine with an established ragdoll example. The project is greenfield -- Vite + vanilla TypeScript, no framework.

The critical technical challenge is that **Matter.js lacks native angle constraints on joints**. The library has pin joints (constraints with `length: 0`) but no min/max rotation limits. For ragdoll joint limits, a `beforeUpdate` event hook must clamp relative angles between connected bodies manually. This workaround is well-established in the community but adds complexity. If Matter.js proves too slow for 5 ragdolls at 60fps on mobile, Rapier 2D (`@dimforge/rapier2d` v0.19.3, WASM-based) is the fallback -- it natively supports revolute joint limits and is 2-5x faster, but adds WASM async loading complexity.

**Primary recommendation:** Start with Matter.js, implement angle constraints via `beforeUpdate` clamping, use Canvas2D for the debug renderer, and build a custom multi-touch drag system using Pointer Events + `Query.point()` instead of the built-in `MouseConstraint` (which doesn't support multi-touch). Benchmark early with 5 ragdolls (70 bodies) on a real mobile device.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 14-part detailed ragdolls: head, upper torso, lower torso, upper arms (2), forearms (2), hands (2), upper legs (2), lower legs (2), feet (2)
- 13 joints per doll, 70 total bodies at max 5 dolls
- Realistic joint rotation limits in Realistic mode (elbows/knees only bend the natural way)
- 2-3 size variations across dolls (small, medium, large) -- different mass and scale
- Phase 1 debug view uses colored shapes: circles for head/hands, rectangles for torso/limbs, lines for joints
- Each doll instance gets a unique color scheme regardless of size
- Maximum absurdity in Goofy mode: rubber bounce (high restitution) + floppy joints (low damping) + reduced gravity combined
- Joint rotation limits widened in Goofy mode (further than natural, but not fully removed)
- No actual limb stretching/elongation -- "stretchy" means loose joints
- Mode switch applies live without resetting the scene
- Enclosed box on all four sides (snow globe containment) with soft cushion walls
- Touch any body part to grab it; rest of body dangles
- Fling on release -- release velocity applied as force
- Full collision while dragging (battering ram effect)
- Multi-touch supported -- each finger grabs a different doll simultaneously
- Highlight glow on grabbed doll; dynamic z-order (last-touched renders on top)
- Controls in left-side slide-out panel with hamburger menu; physics keeps running while open
- High friction between body parts (tangling encouraged)
- Reset is instant teleport to new random positions
- Changing doll count adds/removes without resetting existing positions

### Claude's Discretion
- Physics engine configuration and timestep tuning
- Exact joint constraint parameters for each mode
- Gradient color scheme for background
- Glow/highlight implementation details
- Slide-out panel styling and animation
- Performance optimization approach (Matter.js vs Rapier decision based on benchmarking)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PHYS-01 | User sees 2-5 cartoon ragdoll characters on screen with realistic joint constraints, gravity, and collision | Matter.js Bodies, Constraints, Composite, collisionFilter with negative groups for self-collision avoidance; custom angle clamping for joint limits |
| PHYS-02 | User can select how many dolls (2-5) appear on screen | Composite.add/remove on engine.world; spawn at random positions; live add/remove without scene reset |
| PHYS-03 | User can switch between Realistic mode and Goofy mode | Live parameter mutation: constraint.stiffness, constraint.damping, body.restitution, body.friction, engine.gravity.scale; no scene reset needed |
| PHYS-04 | Physics simulation runs at consistent 60fps on mid-range mobile devices | Matter.Runner with fixed delta 1000/60, enableSleeping, constraintIterations tuning; Canvas2D debug renderer; benchmark 70 bodies on mobile |
| PHYS-05 | User can reset the scene to start fresh with new doll positions | Body.setPosition + Body.setAngle + Body.setVelocity to teleport; randomized positions with slight overlap |
| PHYS-06 | User can touch/drag individual ragdolls to manually position them | Custom multi-touch via Pointer Events + Query.point(); per-pointer constraint tracking; fling via release velocity |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| matter-js | 0.20.0 | 2D rigid body physics engine | Well-documented, established ragdoll examples, good API surface, pure JS (no WASM complexity), project decision to start here |
| TypeScript | 5.x | Type safety | Project will be TypeScript throughout |
| Vite | 5.x/6.x | Build tool + dev server | Fast HMR, vanilla-ts template, zero-config for canvas games |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dimforge/rapier2d | 0.19.3 | WASM 2D physics (fallback) | Only if Matter.js fails 60fps benchmark with 5 ragdolls on mid-range Android |
| @dimforge/rapier2d-compat | 0.19.3 | Rapier with embedded WASM (base64) | If using Rapier -- simpler bundling, no separate .wasm file to serve |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Matter.js | Rapier 2D | 2-5x faster (WASM), native joint limits, but async loading, less examples, heavier bundle, more complex API |
| Matter.js | Planck.js (Box2D port) | Native joint limits, but less maintained, smaller community |
| Canvas2D debug renderer | PixiJS | Overkill for debug view; PixiJS comes in Phase 2 for sprite rendering |
| Custom game loop | Matter.Runner | Runner handles fixed timestep with accumulator pattern; use Runner unless custom interpolation needed |

**Installation:**
```bash
npm create vite@latest shaken-together -- --template vanilla-ts
cd shaken-together
npm install matter-js
npm install -D @types/matter-js
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  main.ts              # Entry point: init engine, renderer, game loop
  physics/
    engine.ts          # Matter.Engine + Runner setup, timestep config
    ragdoll.ts         # Ragdoll factory: createRagdoll(x, y, scale, colorScheme)
    ragdoll-config.ts  # Body part dimensions, joint offsets, constraint params per mode
    constraints.ts     # Custom angle constraint enforcement (beforeUpdate hook)
    world.ts           # Scene management: boundaries, add/remove dolls, reset
  input/
    multi-touch.ts     # Pointer Events -> per-pointer constraint tracking
    drag-manager.ts    # Query.point() hit testing, constraint creation/removal, fling
  renderer/
    debug-renderer.ts  # Canvas2D: draw bodies as colored shapes, joints as lines
    colors.ts          # Color scheme definitions for dolls
  ui/
    panel.ts           # Slide-out control panel (doll count, mode toggle, reset)
    hamburger.ts       # Menu icon + panel toggle
  types.ts             # Shared type definitions
  constants.ts         # Physics constants, sizes, colors
index.html             # Canvas element + UI container
```

### Pattern 1: Ragdoll as Composite
**What:** Each ragdoll is a `Matter.Composite` containing 14 bodies + 13 constraints. The composite is added/removed from `engine.world` as a unit.
**When to use:** Always -- this is how Matter.js organizes compound objects.
**Example:**
```typescript
// Source: Matter.js official ragdoll example + custom extension
import { Bodies, Body, Composite, Constraint } from 'matter-js';

function createRagdoll(x: number, y: number, scale: number): Matter.Composite {
  const group = Body.nextGroup(true); // Negative group = no self-collision

  const head = Bodies.circle(x, y - 60 * scale, 17 * scale, {
    collisionFilter: { group },
    label: 'head',
    friction: 0.8,       // High friction for tangling
    restitution: 0.2,    // Low bounce in Realistic mode
  });

  const upperTorso = Bodies.rectangle(x, y - 25 * scale, 40 * scale, 30 * scale, {
    collisionFilter: { group },
    label: 'upperTorso',
    friction: 0.8,
  });

  // ... 12 more body parts ...

  const neckJoint = Constraint.create({
    bodyA: head,
    bodyB: upperTorso,
    pointA: { x: 0, y: 17 * scale },
    pointB: { x: 0, y: -15 * scale },
    stiffness: 0.6,
    length: 0,  // Pin joint (revolute)
  });

  // ... 12 more constraints ...

  return Composite.create({
    bodies: [head, upperTorso, /* ... */],
    constraints: [neckJoint, /* ... */],
    label: 'ragdoll',
  });
}
```

### Pattern 2: Custom Angle Constraints via beforeUpdate
**What:** Since Matter.js has no native angle limits, use `Events.on(engine, 'beforeUpdate')` to clamp relative angles between connected bodies.
**When to use:** Always for ragdoll joint limits.
**Example:**
```typescript
// Source: Community workaround from Matter.js issue #71
import { Events, Body } from 'matter-js';

interface AngleLimit {
  bodyA: Matter.Body;
  bodyB: Matter.Body;
  minAngle: number; // radians
  maxAngle: number; // radians
}

const angleLimits: AngleLimit[] = [];

Events.on(engine, 'beforeUpdate', () => {
  for (const limit of angleLimits) {
    const relativeAngle = limit.bodyB.angle - limit.bodyA.angle;

    if (relativeAngle < limit.minAngle) {
      Body.setAngle(limit.bodyB, limit.bodyA.angle + limit.minAngle);
      Body.setAngularVelocity(limit.bodyB, 0);
    } else if (relativeAngle > limit.maxAngle) {
      Body.setAngle(limit.bodyB, limit.bodyA.angle + limit.maxAngle);
      Body.setAngularVelocity(limit.bodyB, 0);
    }
  }
});
```

### Pattern 3: Custom Multi-Touch Drag via Pointer Events
**What:** Matter.js `MouseConstraint` only handles single-touch. For multi-touch, track `pointerId` manually, use `Query.point()` for hit testing, and create/destroy per-pointer constraints.
**When to use:** Always for this project (multi-touch is a locked requirement).
**Example:**
```typescript
// Source: MDN Pointer Events + Matter.js Query API
import { Query, Constraint, Composite } from 'matter-js';

interface ActiveDrag {
  pointerId: number;
  body: Matter.Body;
  constraint: Matter.Constraint;
  offset: { x: number; y: number };
}

const activeDrags = new Map<number, ActiveDrag>();

canvas.addEventListener('pointerdown', (e) => {
  const point = screenToWorld(e.clientX, e.clientY);
  const bodies = Composite.allBodies(engine.world);
  const hits = Query.point(bodies, point);

  if (hits.length > 0) {
    const body = hits[0];
    // Prevent same body being grabbed by two fingers
    if ([...activeDrags.values()].some(d => d.body === body)) return;

    const constraint = Constraint.create({
      pointA: point,
      bodyB: body,
      pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
      stiffness: 0.8,
      length: 0,
    });

    Composite.add(engine.world, constraint);
    activeDrags.set(e.pointerId, { pointerId: e.pointerId, body, constraint, offset: point });
  }
});

canvas.addEventListener('pointermove', (e) => {
  const drag = activeDrags.get(e.pointerId);
  if (drag) {
    drag.constraint.pointA = screenToWorld(e.clientX, e.clientY);
  }
});

canvas.addEventListener('pointerup', (e) => {
  const drag = activeDrags.get(e.pointerId);
  if (drag) {
    // Fling: apply release velocity
    Composite.remove(engine.world, drag.constraint);
    activeDrags.delete(e.pointerId);
  }
});
```

### Pattern 4: Live Mode Switching
**What:** Switch between Realistic and Goofy mode by mutating physics parameters in place -- no scene reset.
**When to use:** When user toggles mode.
**Example:**
```typescript
// Source: Matter.js Body/Constraint property mutation
interface PhysicsMode {
  gravity: { x: number; y: number; scale: number };
  constraintStiffness: number;
  constraintDamping: number;
  bodyRestitution: number;
  bodyFriction: number;
  angleLimitMultiplier: number; // 1.0 for Realistic, ~2.0 for Goofy (wider limits)
}

const REALISTIC: PhysicsMode = {
  gravity: { x: 0, y: 1, scale: 0.001 },
  constraintStiffness: 0.6,
  constraintDamping: 0.05,
  bodyRestitution: 0.2,
  bodyFriction: 0.8,
  angleLimitMultiplier: 1.0,
};

const GOOFY: PhysicsMode = {
  gravity: { x: 0, y: 1, scale: 0.0004 }, // Reduced gravity
  constraintStiffness: 0.15,               // Floppy joints
  constraintDamping: 0.005,                // Low damping = more wobble
  bodyRestitution: 0.9,                    // Rubber bounce
  bodyFriction: 0.4,                       // Less friction (still tangles)
  angleLimitMultiplier: 2.0,               // Wider joint limits
};

function applyMode(mode: PhysicsMode) {
  engine.gravity.x = mode.gravity.x;
  engine.gravity.y = mode.gravity.y;
  engine.gravity.scale = mode.gravity.scale;

  const allConstraints = Composite.allConstraints(engine.world);
  for (const c of allConstraints) {
    if (c.label?.startsWith('joint_')) {
      c.stiffness = mode.constraintStiffness;
      c.damping = mode.constraintDamping;
    }
  }

  const allBodies = Composite.allBodies(engine.world);
  for (const b of allBodies) {
    if (!b.isStatic) {
      b.restitution = mode.bodyRestitution;
      b.friction = mode.bodyFriction;
    }
  }
}
```

### Anti-Patterns to Avoid
- **Using Matter.Render for production:** The built-in renderer is for quick demos only. It doesn't support z-ordering, glow effects, or custom shapes. Build a Canvas2D debug renderer from scratch.
- **Using MouseConstraint for touch:** It only supports single-touch. Multi-touch requires custom Pointer Events handling.
- **Recreating the scene on mode switch:** Mutate parameters in place. Destroying and recreating composites loses all current positions and velocities.
- **Ignoring collision groups:** Without `Body.nextGroup(true)`, ragdoll limbs will collide with themselves and explode on creation.
- **Using Matter.js without fixed timestep:** Variable timestep causes non-deterministic physics. Use `Runner` or implement fixed-step accumulator manually.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Physics simulation | Custom Verlet/Euler integrator | Matter.js Engine | Collision detection, broadphase, solver -- thousands of edge cases |
| Broadphase collision | Spatial hash or quad tree | Matter.js built-in grid broadphase | Already optimized for 2D |
| Fixed timestep loop | Raw rAF + manual accumulator | Matter.Runner | Handles delta smoothing, frame budget, accumulator correctly |
| Ragdoll joint connections | Manual spring math | Matter.Constraint with length:0 | Pin joints with stiffness/damping tuning |
| Hit testing (body under point) | Manual AABB checks | Matter.Query.point() | Handles concave shapes, vertices, bounds |
| Collision filtering | Manual collision pair checks | collisionFilter.group (negative value) | Built-in, efficient, standard pattern |

**Key insight:** Matter.js provides a complete physics pipeline. The only thing you must hand-roll is angle constraints (because they don't exist in the library) and multi-touch drag (because MouseConstraint is single-touch only).

## Common Pitfalls

### Pitfall 1: Ragdoll Explosion on Spawn
**What goes wrong:** Bodies spawned overlapping with constraints already attached get pushed apart violently, causing joints to stretch and bodies to fly off screen.
**Why it happens:** The constraint solver can't resolve extreme overlaps in one step, producing huge correction forces.
**How to avoid:** Spawn bodies at their correct relative positions (anatomically correct ragdoll pose). Use slight randomness in *ragdoll position*, not in *body part positions within a ragdoll*. The initial "slight overlap between dolls" mentioned in CONTEXT.md should be overlap *between different dolls*, not within one doll's parts.
**Warning signs:** Bodies shooting off screen in the first few frames.

### Pitfall 2: Bodies Passing Through Walls at High Velocity
**What goes wrong:** Fast-moving bodies tunnel through thin static boundaries.
**Why it happens:** Discrete collision detection misses collisions between timesteps.
**How to avoid:** Make boundary walls thick (50+ pixels). Use `Body.setVelocity()` to cap maximum velocity in the `beforeUpdate` event. Keep fixed timestep small (16.67ms or less).
**Warning signs:** Ragdolls escaping the snow globe after being flung.

### Pitfall 3: Constraint Instability (Shaking/Vibrating Bodies)
**What goes wrong:** Connected bodies vibrate or oscillate endlessly.
**Why it happens:** Constraint stiffness too high relative to `constraintIterations`, or conflicting constraints pulling in opposite directions.
**How to avoid:** Start with `constraintIterations: 4` (default is 2). Use stiffness 0.4-0.7 for joints. Add small damping (0.01-0.05). If instability persists, lower stiffness before raising iterations (iterations are expensive).
**Warning signs:** Ragdoll limbs vibrating when at rest.

### Pitfall 4: Custom Angle Clamping Causing Jitter
**What goes wrong:** The `beforeUpdate` angle clamping fights with the constraint solver, producing oscillation at joint limits.
**Why it happens:** Setting angle directly in `beforeUpdate` conflicts with the solver's velocity-based corrections in the same frame.
**How to avoid:** When clamping, also zero out `angularVelocity` on the clamped body. Consider applying a soft torque instead of a hard clamp for smoother behavior. Test with `constraintIterations: 4` or higher.
**Warning signs:** Limbs jittering when held at angle limits (e.g., fully extended elbow).

### Pitfall 5: Poor Mobile Performance
**What goes wrong:** Physics drops below 60fps on mobile devices.
**Why it happens:** 70 bodies + 65 constraints + collision detection + angle clamping per frame is non-trivial for mobile JS.
**How to avoid:** Enable body sleeping (`engine.enableSleeping = true`). Use chamfered rectangles (fewer vertices) instead of complex polygons. Minimize `Composite.allBodies()` calls per frame. Profile with Chrome DevTools remote debugging on a real device. Consider reducing `positionIterations` to 4 (from default 6).
**Warning signs:** Janky animation, `lastElapsed` in `engine.timing` consistently above 8ms.

### Pitfall 6: Touch Coordinates Not Matching Physics World
**What goes wrong:** Tapping a visible body doesn't grab it; grabbing offset from actual body.
**Why it happens:** Canvas CSS size differs from canvas pixel dimensions, or canvas has CSS transform/offset not accounted for.
**How to avoid:** Always convert screen coordinates to canvas coordinates using `canvas.getBoundingClientRect()` and the canvas width/height ratio. Store this mapping and update on resize.
**Warning signs:** Dragging feels "off" or grabs empty space.

## Code Examples

### Canvas2D Debug Renderer
```typescript
// Source: Matter.js wiki on custom rendering
import { Composite, Constraint } from 'matter-js';

function renderDebug(ctx: CanvasRenderingContext2D, engine: Matter.Engine) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(1, '#16213e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const bodies = Composite.allBodies(engine.world);

  for (const body of bodies) {
    if (body.isStatic) continue; // Don't draw walls

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    ctx.fillStyle = body.render.fillStyle || '#ffffff';
    ctx.globalAlpha = body.render.opacity ?? 1;

    if (body.label === 'head' || body.label === 'hand') {
      // Circle for head and hands
      ctx.beginPath();
      ctx.arc(0, 0, body.circleRadius!, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Rectangle for torso and limbs
      const w = body.bounds.max.x - body.bounds.min.x;
      const h = body.bounds.max.y - body.bounds.min.y;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    ctx.restore();
  }

  // Draw constraints as lines
  const constraints = Composite.allConstraints(engine.world);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;

  for (const c of constraints) {
    if (!c.bodyA || !c.bodyB) continue;
    const startX = c.bodyA.position.x + (c.pointA?.x || 0);
    const startY = c.bodyA.position.y + (c.pointA?.y || 0);
    const endX = c.bodyB.position.x + (c.pointB?.x || 0);
    const endY = c.bodyB.position.y + (c.pointB?.y || 0);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}
```

### Boundary Walls (Snow Globe)
```typescript
// Source: Matter.js Bodies.rectangle for static walls
import { Bodies, Composite } from 'matter-js';

function createBoundaries(width: number, height: number, thickness = 50): Matter.Body[] {
  const options = {
    isStatic: true,
    restitution: 0.5,  // Soft cushion bounce
    friction: 0.3,
    render: { visible: false },
  };

  return [
    Bodies.rectangle(width / 2, -thickness / 2, width + thickness * 2, thickness, options),         // Top
    Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, options),  // Bottom
    Bodies.rectangle(-thickness / 2, height / 2, thickness, height, options),                         // Left
    Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, options),                  // Right
  ];
}
```

### Fling on Release
```typescript
// Source: Pointer Events velocity tracking pattern
interface VelocityTracker {
  positions: Array<{ x: number; y: number; time: number }>;
}

function trackPosition(tracker: VelocityTracker, x: number, y: number) {
  const now = performance.now();
  tracker.positions.push({ x, y, time: now });
  // Keep only last 5 samples (last ~80ms at 60fps)
  if (tracker.positions.length > 5) tracker.positions.shift();
}

function calculateReleaseVelocity(tracker: VelocityTracker): { x: number; y: number } {
  const positions = tracker.positions;
  if (positions.length < 2) return { x: 0, y: 0 };

  const first = positions[0];
  const last = positions[positions.length - 1];
  const dt = (last.time - first.time) / 1000; // seconds

  if (dt < 0.001) return { x: 0, y: 0 };

  return {
    x: (last.x - first.x) / dt * 0.002, // Scale to physics units
    y: (last.y - first.y) / dt * 0.002,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Box2D (C++ port) | Matter.js (JS native) or Rapier (WASM) | 2016-2020 | Pure JS is simpler; WASM is faster |
| Touch Events API | Pointer Events API | 2019+ | Unified mouse/touch/pen, pointerId for multi-touch |
| Variable timestep | Fixed timestep with accumulator | Always best practice | Deterministic physics, no explosion on tab switch |
| Matter.Render (built-in) | Custom Canvas2D / PixiJS / custom WebGL | Always for production | Built-in renderer is demo-quality only |
| MouseConstraint | Custom Pointer Events + Query.point | For multi-touch | MouseConstraint is single-pointer only |

**Deprecated/outdated:**
- `Matter.World` (deprecated in 0.20.0): Use `engine.world` (a `Composite`) directly with `Composite.add()` / `Composite.remove()` instead of `World.add()` / `World.remove()`
- `Matter.Mouse` alone: Prefer Pointer Events for cross-platform touch support
- `engine.world.gravity`: Still works but `engine.gravity` is the current canonical path

## Open Questions

1. **Exact joint constraint parameters**
   - What we know: Stiffness 0.4-0.7, damping 0.01-0.05 range for pin joints; official ragdoll uses 0.6 stiffness, no damping
   - What's unclear: Optimal parameters for 14-part ragdoll (official example has 10 parts); how angle clamping interacts with different stiffness values
   - Recommendation: Start with official example parameters, tune iteratively. Create a debug slider UI during development.

2. **70 bodies on mobile performance**
   - What we know: Matter.js handles hundreds of simple bodies on desktop; mobile is documented as slower; 50K bodies is extreme but 70 should be feasible
   - What's unclear: Whether the custom angle clamping (13 limits per doll x 5 dolls = 65 checks per frame) adds meaningful overhead
   - Recommendation: Benchmark with 5 ragdolls on a real mid-range Android device (e.g., Pixel 6a or equivalent) within the first implementation wave. If `engine.timing.lastElapsed` exceeds 8ms consistently, evaluate Rapier.

3. **Angle clamping softness**
   - What we know: Hard clamping (setAngle + zero angularVelocity) works but can cause jitter
   - What's unclear: Whether a soft torque approach (applying corrective force toward limit instead of snapping) produces better visual results
   - Recommendation: Implement hard clamp first, add soft correction as refinement if jitter is noticeable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (fast, Vite-native, TypeScript) |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHYS-01 | Ragdoll created with 14 bodies + 13 constraints, collision groups set | unit | `npx vitest run src/physics/__tests__/ragdoll.test.ts -t "creates ragdoll"` | No -- Wave 0 |
| PHYS-01 | Bodies have gravity, collide with boundaries | integration | `npx vitest run src/physics/__tests__/world.test.ts -t "gravity and collision"` | No -- Wave 0 |
| PHYS-02 | Add/remove dolls updates world body count correctly | unit | `npx vitest run src/physics/__tests__/world.test.ts -t "doll count"` | No -- Wave 0 |
| PHYS-03 | Mode switch changes constraint stiffness, body restitution, gravity | unit | `npx vitest run src/physics/__tests__/mode.test.ts -t "mode switch"` | No -- Wave 0 |
| PHYS-04 | Engine update completes within time budget (< 8ms for 70 bodies) | unit | `npx vitest run src/physics/__tests__/performance.test.ts -t "time budget"` | No -- Wave 0 |
| PHYS-05 | Reset repositions all bodies to random positions with zero velocity | unit | `npx vitest run src/physics/__tests__/world.test.ts -t "reset"` | No -- Wave 0 |
| PHYS-06 | Query.point finds correct body at given coordinates | unit | `npx vitest run src/input/__tests__/drag.test.ts -t "hit testing"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration for the project
- [ ] `src/physics/__tests__/ragdoll.test.ts` -- covers PHYS-01
- [ ] `src/physics/__tests__/world.test.ts` -- covers PHYS-01, PHYS-02, PHYS-05
- [ ] `src/physics/__tests__/mode.test.ts` -- covers PHYS-03
- [ ] `src/physics/__tests__/performance.test.ts` -- covers PHYS-04
- [ ] `src/input/__tests__/drag.test.ts` -- covers PHYS-06
- [ ] Framework install: `npm install -D vitest`

## Sources

### Primary (HIGH confidence)
- [Matter.js official docs](https://brm.io/matter-js/docs/) -- Engine, Body, Constraint, Composite, Runner, MouseConstraint, Query modules
- [Matter.js GitHub examples](https://github.com/liabru/matter-js/tree/master/examples) -- Official ragdoll.js example (10 body parts, constraints at stiffness 0.6)
- [Matter.js GitHub wiki - Rendering](https://github.com/liabru/matter-js/wiki/Rendering) -- Custom renderer approach
- [MDN Pointer Events - Multi-touch](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Multi-touch_interaction) -- pointerId tracking pattern

### Secondary (MEDIUM confidence)
- [Rapier.rs docs - Joints](https://rapier.rs/docs/user_guides/javascript/joints/) -- Revolute joint with angle limits (setLimits post-creation)
- [Dimforge 2025 review](https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge/) -- 2-5x WASM speedup, SIMD support
- [Matter.js issue #71](https://github.com/liabru/matter-js/issues/71) -- Angle constraints not implemented, workaround via distance constraints or beforeUpdate clamping
- [Matter.js issue #420](https://github.com/liabru/matter-js/issues/420) -- Performance with many bodies; vertex count matters more than body count
- [Matter.js issue #127](https://github.com/liabru/matter-js/issues/127) -- Mobile performance slower than desktop (known)

### Tertiary (LOW confidence)
- [matterjs-ragdoll npm](https://www.npmjs.com/package/matterjs-ragdoll) -- Utility package; `createRagdoll(scale)` returns Composite. Limited docs, unclear if maintained. Not recommended over custom implementation given the 14-part requirement.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Matter.js 0.20.0 is stable, well-documented, project decision confirmed
- Architecture: MEDIUM-HIGH -- Patterns from official examples + community; custom angle constraints are the uncertain part
- Pitfalls: MEDIUM -- Based on GitHub issues and community reports; mobile performance needs real-device validation
- Validation: MEDIUM -- Vitest is standard for Vite projects; physics unit tests are feasible but integration timing tests need care

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (Matter.js is stable/slow-moving; Rapier is active but API stable)
