# Phase 2: Rendering Engine - Research

**Researched:** 2026-03-05
**Domain:** PixiJS v8 WebGL rendering, programmatic character art, Matter.js sprite synchronization
**Confidence:** HIGH

## Summary

This phase replaces the Canvas2D debug renderer with a PixiJS v8 WebGL sprite renderer. Each ragdoll's 15 physics body parts gets a corresponding PixiJS Graphics object drawn programmatically (no image assets), synced to the physics body's position and angle every frame via the PixiJS Ticker. Four distinct cartoon characters with varied silhouettes are drawn using the PixiJS Graphics API's shape primitives (rect, circle, ellipse, roundRect, poly) with fill and stroke calls. Character selection integrates into the existing slide-out panel.

PixiJS v8 (latest stable: v8.16.0) uses an async Application.init() pattern, supports WebGL and WebGPU backends, and provides GraphicsContext sharing for efficient reuse of shape geometry across multiple instances. The v8 Graphics API uses a "shape-first, style-after" chaining pattern (e.g., `.rect(0,0,w,h).fill(color)`) which is a breaking change from v7. Containers in v8 are the only nodes that can have children -- leaf nodes like Graphics cannot. The Ticker replaces the manual requestAnimationFrame loop.

**Primary recommendation:** Use PixiJS v8 Application with `resizeTo: window`, `autoDensity: true`, `resolution: window.devicePixelRatio`. Replace the manual rAF loop with `app.ticker.add()`. Each ragdoll gets a Container with 15 Graphics children, one per body part, synced to physics positions every tick. Use GraphicsContext for character body part definitions so the same geometry can be shared across ragdolls using the same character.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Character art style:** Simple & bold (thick outlines, flat vibrant colors, exaggerated proportions). 4 starter characters with varied body shapes (tall/thin, short/round, buff, small). Reactive faces with 2-3 expression states. Art assets created programmatically using PixiJS Graphics API -- no external image files.
- **Sprite articulation:** Per-part sprites (15 Graphics objects per ragdoll). 1:1 mapping to physics bodies. Full physics rotation (no visual clamping). Overlapping pieces at joints for seamless look. Joint constraint lines removed.
- **Character selection UX:** Lives in existing slide-out panel. Each doll slot shows assigned character with dropdown. Random assignment for new dolls (no duplicates until all 4 used). Changing character swaps skin in-place (preserves position/velocity).
- **Visual effects:** Subtle impact flashes scaled to collision force. Subtle squash-and-stretch (10-20% deformation). Subtle speed lines behind fast-moving parts. Drag feedback: outline glow + ~5% scale-up on grabbed doll.

### Claude's Discretion
- PixiJS container hierarchy and render pipeline architecture
- Exact character designs (proportions, colors, face details) within the "simple & bold" style
- Squash-and-stretch implementation approach (scale transform vs vertex manipulation)
- Speed line rendering technique
- Impact flash particle system details
- Canvas resize and device pixel ratio handling for crisp rendering

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RNDR-01 | Ragdolls render as cartoon character sprites (3-4 pre-made characters) | PixiJS Graphics API for programmatic drawing; GraphicsContext for character definitions; Container hierarchy for per-ragdoll sprite groups |
| RNDR-02 | User can choose which cartoon characters to use before shaking | Panel integration via existing PanelCallbacks; character assignment logic in world.ts; in-place skin swap by replacing GraphicsContext references |
| RNDR-03 | Canvas renders at 60fps with WebGL acceleration on mobile browsers | PixiJS v8 WebGL renderer with autoDensity; Ticker-based render loop; GraphicsContext sharing for GPU geometry reuse |
| PLAT-03 | Mobile-first responsive layout (portrait primary) | PixiJS `resizeTo: window` with `autoDensity: true`; devicePixelRatio handling; existing viewport meta tag supports portrait-first |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | ^8.16.0 | WebGL 2D rendering, programmatic graphics, scene graph | Industry standard for high-performance 2D WebGL. v8 is latest stable with async init, WebGPU fallback, improved tree-shaking |
| matter-js | ^0.20.0 | Physics simulation (already installed) | Already in project from Phase 1. Provides body positions/angles that sprites sync to |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | PixiJS alone handles all rendering needs. No particle library needed for simple impact flashes (use pooled Graphics objects) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PixiJS Graphics API | Pre-rendered sprite sheets | Sprite sheets need external assets, don't scale perfectly to all DPIs; Graphics API matches the "programmatic art" decision |
| pixi-particle-emitter | Manual Graphics pool | Emitter is overkill for 2-3 simple flash effects; manual pool gives exact control with zero bundle size cost |

**Installation:**
```bash
npm install pixi.js@^8.16.0
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  renderer/
    pixi-renderer.ts      # PixiJS Application setup, resize, main render loop
    character-registry.ts  # Character definitions (4 characters, body part GraphicsContexts)
    ragdoll-sprite.ts      # RagdollSprite class: Container with 15 Graphics children
    characters/
      slim.ts              # Tall & thin character definition
      round.ts             # Short & round character definition
      buff.ts              # Buff character definition
      tiny.ts              # Small character definition
    effects/
      impact-flash.ts      # Collision flash effect (pooled Graphics)
      speed-lines.ts       # Velocity-based trailing lines
      squash-stretch.ts    # Scale deformation based on velocity/collision
    faces.ts               # Face expression rendering (neutral, surprised, dazed)
  renderer/
    colors.ts              # Keep bringToFront (adapt for PixiJS z-order)
    debug-renderer.ts      # DELETE or keep behind a flag for debugging
```

### Pattern 1: PixiJS Application Initialization (Async)
**What:** PixiJS v8 requires async initialization. The Application creates the WebGL renderer, canvas, ticker, and stage.
**When to use:** Once at app startup, replacing the current canvas/ctx setup.
**Example:**
```typescript
// Source: https://pixijs.com/8.x/guides/components/application
import { Application } from 'pixi.js';

const app = new Application();

async function initRenderer(): Promise<Application> {
  await app.init({
    resizeTo: window,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    preference: 'webgl',  // Explicit WebGL preference for mobile compatibility
  });

  // Replace the existing canvas in the DOM
  const oldCanvas = document.getElementById('game-canvas');
  if (oldCanvas) {
    oldCanvas.replaceWith(app.canvas);
  }
  app.canvas.id = 'game-canvas';
  app.canvas.style.touchAction = 'none';

  return app;
}
```

### Pattern 2: Character Definition with GraphicsContext
**What:** Define each character's body parts as reusable GraphicsContext objects. Multiple ragdolls using the same character share the same GPU geometry.
**When to use:** For all 4 character definitions.
**Example:**
```typescript
// Source: https://pixijs.com/8.x/guides/components/scene-objects/graphics
import { GraphicsContext } from 'pixi.js';

interface CharacterDefinition {
  name: string;
  bodyParts: Map<string, GraphicsContext>;  // label -> shared context
  faceExpressions: Map<string, GraphicsContext>;  // 'neutral'|'surprised'|'dazed'
  palette: { primary: string; secondary: string; outline: string; skin: string };
}

// Example: "Round" character head
function createRoundHead(palette: CharacterPalette): GraphicsContext {
  return new GraphicsContext()
    // Big round head
    .circle(0, 0, 22)
    .fill(palette.skin)
    .circle(0, 0, 22)
    .stroke({ width: 3, color: palette.outline });
}
```

### Pattern 3: Physics-to-Sprite Sync via Ticker
**What:** Each frame, update every Graphics object's position and rotation from its corresponding Matter.js Body.
**When to use:** In the app.ticker.add() callback, replacing the manual rAF + renderFrame pattern.
**Example:**
```typescript
// Source: verified integration pattern from Matter.js + PixiJS projects
app.ticker.add((ticker) => {
  for (const ragdoll of scene.ragdolls) {
    const spriteGroup = spriteMap.get(ragdoll.id);
    if (!spriteGroup) continue;

    for (const [label, body] of ragdoll.bodies) {
      const graphic = spriteGroup.parts.get(label);
      if (!graphic) continue;

      graphic.position.set(body.position.x, body.position.y);
      graphic.rotation = body.angle;
    }
  }
});
```

### Pattern 4: Container Hierarchy for Z-Order
**What:** Each ragdoll is a Container. The stage's child order determines z-order (last child renders on top). bringToFront moves a ragdoll's Container to the end.
**When to use:** For drag z-ordering and general rendering order.
**Example:**
```typescript
import { Container } from 'pixi.js';

// Stage
//   -> backgroundLayer (Container)
//   -> ragdollLayer (Container, sortableChildren = true)
//       -> ragdollContainer_0 (Container with 15 Graphics children)
//       -> ragdollContainer_1
//       -> ...
//   -> effectsLayer (Container for flashes, speed lines)

function bringToFront(ragdollLayer: Container, ragdollContainer: Container): void {
  ragdollLayer.removeChild(ragdollContainer);
  ragdollLayer.addChild(ragdollContainer);  // Re-adds at end = renders on top
}
```

### Pattern 5: Squash-and-Stretch via Scale Transform
**What:** Apply non-uniform scale to body part Graphics based on velocity (stretch in direction of motion) and collision impact (squash perpendicular to collision normal).
**When to use:** Every frame for velocity-based stretch; on collision events for impact squash.
**Example:**
```typescript
// Recommendation: use scale.x / scale.y transforms (not vertex manipulation)
// This is cheaper and works with any Graphics shape

function applySquashStretch(graphic: Graphics, body: Body): void {
  const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
  const maxDeform = 0.2;  // 20% max deformation
  const deformFactor = Math.min(speed / 15, maxDeform);

  // Stretch along velocity direction, compress perpendicular
  // Since Graphics are rotated to match body.angle, stretch on local Y axis
  graphic.scale.set(1 - deformFactor * 0.5, 1 + deformFactor);
}
```

### Pattern 6: Face Expression Swapping via GraphicsContext
**What:** Each character has 3 face expression GraphicsContexts. Swap the head Graphics object's context to change expression.
**When to use:** On collision events (surprised face), after settling (dazed face), default (neutral).
**Example:**
```typescript
// Swapping a Graphics object's context is very cheap
// Source: https://pixijs.com/8.x/guides/components/scene-objects/graphics
function setExpression(headGraphic: Graphics, expression: 'neutral' | 'surprised' | 'dazed', character: CharacterDefinition): void {
  const ctx = character.faceExpressions.get(expression);
  if (ctx) {
    headGraphic.context = ctx;
  }
}
```

### Anti-Patterns to Avoid
- **Clearing and rebuilding Graphics every frame:** Never call `.clear()` and redraw shapes each tick. Instead, set position/rotation/scale on pre-built Graphics objects. Context swapping is the pattern for visual state changes.
- **Using leaf nodes as parents:** In PixiJS v8, only Containers can have children. Never try to addChild to a Graphics or Sprite.
- **Creating Graphics objects in the render loop:** Create all Graphics objects once at ragdoll creation time. The ticker should only update transforms, never instantiate display objects.
- **Using synchronous Application constructor:** v8 requires `await app.init()`. The constructor alone does NOT set up the renderer.
- **Ignoring resolution/autoDensity:** Without `autoDensity: true` and proper `resolution`, the canvas will be blurry on high-DPI mobile screens.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebGL canvas rendering | Custom WebGL shaders/buffers | PixiJS Application + Graphics | WebGL state management, batching, and GPU memory are extremely complex |
| Device pixel ratio handling | Manual canvas size * dpr math | PixiJS `autoDensity: true` + `resolution: dpr` | PixiJS handles the CSS size vs pixel size mismatch internally |
| Window resize handling | Manual resize event + renderer.resize | PixiJS `resizeTo: window` | Handles debouncing, resolution recalculation, and canvas CSS size automatically |
| Shape geometry batching | Manual geometry buffer management | PixiJS GraphicsContext sharing | PixiJS optimizes GPU uploads when multiple Graphics share a context |
| Game loop timing | Manual rAF + deltaTime calculation | PixiJS Ticker | Handles frame timing, maxFPS capping, minFPS clamping, and pause/resume |

**Key insight:** PixiJS v8 abstracts WebGL completely. The Graphics API generates GPU-ready geometry from shape commands. Attempting to optimize below this level (manual buffers, custom shaders) would be premature and counterproductive for this use case.

## Common Pitfalls

### Pitfall 1: Async Initialization Forgotten
**What goes wrong:** App silently fails or shows a blank canvas because `await app.init()` was not called before using `app.stage` or `app.renderer`.
**Why it happens:** PixiJS v7 allowed synchronous construction. v8 changed this for WebGPU support.
**How to avoid:** Always `await app.init({...})` before any rendering code. Wrap in an async IIFE or async main function.
**Warning signs:** Blank canvas, "Cannot read properties of undefined" errors on app.renderer.

### Pitfall 2: Coordinate System Mismatch Between Matter.js and PixiJS
**What goes wrong:** Sprites appear offset from their physics bodies.
**Why it happens:** Matter.js body.position is the center of the body. PixiJS Graphics position is also the center by default, but only if shapes are drawn centered at (0,0). If shapes are drawn with top-left origin, they'll be offset.
**How to avoid:** Always draw Graphics shapes centered at (0,0). For rectangles: `.rect(-w/2, -h/2, w, h)`. For circles: `.circle(0, 0, r)`. Then set `graphic.position` to `body.position`.
**Warning signs:** Sprites "orbiting" their physics bodies or consistently offset.

### Pitfall 3: Forgetting Vite Top-Level Await Issue
**What goes wrong:** Build works in dev but fails in production with cryptic errors.
**Why it happens:** Vite (through v6.x, possibly v7.x) has issues with top-level await and PixiJS.
**How to avoid:** Wrap all async PixiJS initialization in an async IIFE: `(async () => { await app.init(...); ... })();`
**Warning signs:** Dev server works, `vite build` fails or produces broken output.

### Pitfall 4: Graphics Memory Leak
**What goes wrong:** GPU memory grows over time, eventually causing jank or crash.
**Why it happens:** Graphics objects and GraphicsContexts not explicitly destroyed when ragdolls are removed.
**How to avoid:** Call `graphic.destroy()` when removing ragdolls. Be careful with shared GraphicsContexts -- don't destroy them when individual ragdolls using them are removed; only destroy contexts when no ragdolls reference them.
**Warning signs:** Increasing GPU memory in browser dev tools Performance tab.

### Pitfall 5: Mobile Touch Events Competing with PixiJS Canvas
**What goes wrong:** Dragging ragdolls causes page scroll or browser gestures.
**Why it happens:** PixiJS creates its own canvas element; existing `touch-action: none` on the old canvas doesn't carry over.
**How to avoid:** Set `app.canvas.style.touchAction = 'none'` after initialization. Keep the CSS `touch-action: none` rule in the HTML. Ensure pointer events are attached to the new PixiJS canvas.
**Warning signs:** Page scrolls when trying to drag ragdolls on mobile.

### Pitfall 6: Matter.js collisionStart Impulse Data is Unreliable
**What goes wrong:** Impact flash effects don't scale correctly to collision force.
**Why it happens:** `pair.contacts[n].normalImpulse` is an internal solver value and reads 0 during high-velocity collisions.
**How to avoid:** Approximate collision force using relative velocity of the two colliding bodies: `|body1.velocity - body2.velocity|`. This gives a reliable proxy for impact strength.
**Warning signs:** Flashes always the same size, or no flash on big impacts.

### Pitfall 7: Overlapping Semi-Transparent Body Parts
**What goes wrong:** Where body parts overlap at joints, transparency stacks and creates visible dark bands.
**Why it happens:** Drawing overlapping shapes with any alpha less than 1.0 causes additive blending artifacts.
**How to avoid:** Draw all body parts at `alpha: 1.0` (fully opaque). Use overlapping opaque shapes. If transparency is needed for an effect, use `cacheAsTexture()` on the ragdoll Container to flatten it first.
**Warning signs:** Dark lines or bands visible at joint overlaps.

## Code Examples

### PixiJS v8 Application Setup (replacing debug renderer)
```typescript
// Source: https://pixijs.com/8.x/guides/components/application
import { Application, Container } from 'pixi.js';

export async function createPixiRenderer(existingCanvas: HTMLCanvasElement) {
  const app = new Application();

  await app.init({
    resizeTo: window,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    preference: 'webgl',
  });

  // Replace old canvas
  existingCanvas.replaceWith(app.canvas);
  app.canvas.id = 'game-canvas';
  app.canvas.style.touchAction = 'none';

  // Set up layer hierarchy
  const backgroundLayer = new Container({ label: 'background' });
  const ragdollLayer = new Container({ label: 'ragdolls' });
  const effectsLayer = new Container({ label: 'effects' });

  app.stage.addChild(backgroundLayer, ragdollLayer, effectsLayer);

  return { app, backgroundLayer, ragdollLayer, effectsLayer };
}
```

### Gradient Background (replacing Canvas2D gradient)
```typescript
// PixiJS doesn't have a built-in linear gradient fill, so use a Graphics with
// a simple solid color or a mesh. For the dark background, a solid color is fine.
// The gradient is subtle enough that a single solid color (0x1a1a2e) works.
// If gradient is wanted, use a vertically-stacked series of thin rects:
import { Graphics } from 'pixi.js';

function createGradientBackground(width: number, height: number): Graphics {
  const bg = new Graphics();
  const steps = 32;  // 32 color stops is enough for a smooth gradient
  const topColor = { r: 0x1a, g: 0x1a, b: 0x2e };
  const bottomColor = { r: 0x16, g: 0x21, b: 0x3e };

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(topColor.r + (bottomColor.r - topColor.r) * t);
    const g = Math.round(topColor.g + (bottomColor.g - topColor.g) * t);
    const b = Math.round(topColor.b + (bottomColor.b - topColor.b) * t);
    const color = (r << 16) | (g << 8) | b;
    const y = (height / steps) * i;
    const h = height / steps + 1;  // +1 to prevent subpixel gaps
    bg.rect(0, y, width, h).fill(color);
  }
  return bg;
}
```

### Per-Body-Part Graphics Creation
```typescript
// Source: https://pixijs.com/8.x/guides/components/scene-objects/graphics
import { Graphics, GraphicsContext, Container } from 'pixi.js';

interface RagdollSprite {
  container: Container;
  parts: Map<string, Graphics>;  // body label -> Graphics
  headGraphic: Graphics;  // Quick reference for face swaps
}

function createRagdollSprite(
  character: CharacterDefinition,
): RagdollSprite {
  const container = new Container({ label: 'ragdoll' });
  const parts = new Map<string, Graphics>();

  // Body part draw order (back to front):
  // legs behind torso, arms in front, head on top
  const drawOrder = [
    'footL', 'lowerLegL', 'upperLegL',
    'footR', 'lowerLegR', 'upperLegR',
    'lowerTorso', 'upperTorso',
    'handL', 'forearmL', 'upperArmL',
    'handR', 'forearmR', 'upperArmR',
    'head',
  ];

  for (const label of drawOrder) {
    const context = character.bodyParts.get(label);
    if (!context) continue;
    const graphic = new Graphics(context);
    graphic.label = label;
    container.addChild(graphic);  // addChild order = render order
    parts.set(label, graphic);
  }

  return {
    container,
    parts,
    headGraphic: parts.get('head')!,
  };
}
```

### Collision Event Handling for Reactive Faces
```typescript
// Source: https://brm.io/matter-js/docs/classes/Engine.html (Events)
import { Events } from 'matter-js';
import type { Engine } from 'matter-js';

function setupCollisionEffects(engine: Engine, spriteMap: Map<string, RagdollSprite>) {
  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      // Calculate collision force from relative velocity
      const relVelX = pair.bodyA.velocity.x - pair.bodyB.velocity.x;
      const relVelY = pair.bodyA.velocity.y - pair.bodyB.velocity.y;
      const impactForce = Math.sqrt(relVelX * relVelX + relVelY * relVelY);

      if (impactForce > 3) {
        // Trigger surprised face on the ragdolls involved
        // Trigger impact flash at collision point
        // The collision point is approximately the midpoint
        const cx = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
        const cy = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;
        spawnImpactFlash(cx, cy, impactForce);
      }
    }
  });
}
```

### Drag Glow Effect (Ported from Canvas2D)
```typescript
// In PixiJS, glow is achieved via a filter or a second Graphics with alpha
// For simplicity and performance, use a slightly larger duplicate outline
function applyDragHighlight(ragdollSprite: RagdollSprite, isGrabbed: boolean): void {
  const scale = isGrabbed ? 1.05 : 1.0;  // 5% scale-up
  ragdollSprite.container.scale.set(scale);

  // Optionally add a glow filter (PixiJS has no built-in glow, but
  // we can draw a slightly larger outline on the grabbed parts)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas2D for 2D rendering | WebGL via PixiJS | Phase 2 transition | 10-50x faster rendering, GPU acceleration, better mobile perf |
| Synchronous PixiJS Application | Async `app.init()` | PixiJS v8.0.0 (Mar 2024) | Must use await; supports WebGPU fallback |
| `beginFill`/`drawRect`/`endFill` | `.rect().fill()` chaining | PixiJS v8.0.0 | Simpler API, shape-first then style |
| Separate `@pixi/*` packages | Single `pixi.js` import | PixiJS v8.0.0 | Better tree-shaking, simpler imports |
| `container.name` | `container.label` | PixiJS v8.0.0 | Property renamed |
| `updateTransform()` override | `onRender` callback | PixiJS v8.0.0 | Per-object render hook for custom logic |
| Manual rAF + deltaTime | PixiJS Ticker | PixiJS v8.0.0 | Built-in FPS capping, priority system, pause/resume |

**Deprecated/outdated:**
- `DisplayObject`: Removed in v8. Use `Container` as base class.
- `beginFill`/`endFill`: Replaced by `.fill()` after shape definition.
- `drawRect`/`drawCircle`: Replaced by `.rect()`/`.circle()`.
- `cacheAsBitmap`: Replaced by `cacheAsTexture()`.
- Passing delta to Ticker callbacks: v8 passes Ticker instance instead; use `ticker.deltaTime`.

## Open Questions

1. **Gradient background rendering**
   - What we know: PixiJS Graphics has no built-in linear gradient fill. Can approximate with stacked rects or use a Mesh with custom shader.
   - What's unclear: Whether the stacked-rect approach is visually smooth enough, or if a simple solid color is better.
   - Recommendation: Start with stacked rects (32 steps). If visual quality is insufficient, fall back to solid dark color. The gradient is very subtle (0x1a1a2e to 0x16213e) and may not even be noticeable.

2. **Pointer event migration**
   - What we know: Current touch/drag uses the old canvas element. PixiJS creates a new canvas.
   - What's unclear: Whether to use PixiJS's built-in event system or keep the raw pointer events on the new canvas.
   - Recommendation: Keep raw pointer events (setupMultiTouch) but re-bind them to `app.canvas`. The existing drag-manager works with pointer coordinates and Matter.js bodies directly -- no need to go through PixiJS's event system. Account for devicePixelRatio when converting pointer coordinates: multiply by `app.renderer.resolution`.

3. **Character design iteration**
   - What we know: 4 characters needed with distinct silhouettes. All drawn programmatically.
   - What's unclear: Exact proportions and visual details need creative iteration.
   - Recommendation: Build the character rendering pipeline first with one simple character, then create the remaining 3 once the pipeline is proven. Character definitions are isolated modules that can be swapped/tweaked easily.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RNDR-01 | Character definitions produce valid GraphicsContexts for all 15 body parts | unit | `npx vitest run src/renderer/__tests__/character-registry.test.ts -x` | Wave 0 |
| RNDR-01 | RagdollSprite container has exactly 15 Graphics children after creation | unit | `npx vitest run src/renderer/__tests__/ragdoll-sprite.test.ts -x` | Wave 0 |
| RNDR-02 | Character assignment logic respects no-duplicates rule | unit | `npx vitest run src/renderer/__tests__/character-assignment.test.ts -x` | Wave 0 |
| RNDR-02 | Swapping character preserves ragdoll position/velocity | unit | `npx vitest run src/renderer/__tests__/character-swap.test.ts -x` | Wave 0 |
| RNDR-03 | PixiJS Application initializes with WebGL preference | unit | `npx vitest run src/renderer/__tests__/pixi-renderer.test.ts -x` | Wave 0 |
| RNDR-03 | Physics-to-sprite sync updates all 15 parts positions per tick | unit | `npx vitest run src/renderer/__tests__/sprite-sync.test.ts -x` | Wave 0 |
| PLAT-03 | Renderer resolution matches devicePixelRatio | unit | `npx vitest run src/renderer/__tests__/pixi-renderer.test.ts -x` | Wave 0 |
| RNDR-01 | Face expression swapping changes head GraphicsContext | unit | `npx vitest run src/renderer/__tests__/faces.test.ts -x` | Wave 0 |
| RNDR-01 | Impact flash spawns at collision midpoint | unit | `npx vitest run src/renderer/__tests__/effects.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/renderer/__tests__/character-registry.test.ts` -- covers RNDR-01 (character definitions)
- [ ] `src/renderer/__tests__/ragdoll-sprite.test.ts` -- covers RNDR-01 (sprite creation)
- [ ] `src/renderer/__tests__/character-assignment.test.ts` -- covers RNDR-02 (assignment logic)
- [ ] `src/renderer/__tests__/character-swap.test.ts` -- covers RNDR-02 (in-place swap)
- [ ] `src/renderer/__tests__/pixi-renderer.test.ts` -- covers RNDR-03, PLAT-03 (init and DPR)
- [ ] `src/renderer/__tests__/sprite-sync.test.ts` -- covers RNDR-03 (physics sync)
- [ ] `src/renderer/__tests__/faces.test.ts` -- covers RNDR-01 (expressions)
- [ ] `src/renderer/__tests__/effects.test.ts` -- covers RNDR-01 (visual effects)
- [ ] Note: PixiJS tests need a mock/stub for the Application and Graphics classes since vitest runs in Node (no WebGL). Use `vi.mock('pixi.js')` to mock PixiJS classes. Test logic/data flow, not actual rendering.

## Sources

### Primary (HIGH confidence)
- [PixiJS v8 Application Guide](https://pixijs.com/8.x/guides/components/application) -- init options, canvas setup, resize
- [PixiJS v8 Graphics Guide](https://pixijs.com/8.x/guides/components/scene-objects/graphics) -- shape drawing API, GraphicsContext sharing, performance
- [PixiJS v8 Container Guide](https://pixijs.com/8.x/guides/components/scene-objects/container) -- hierarchy, zIndex, sortableChildren, transforms
- [PixiJS v8 Migration Guide](https://pixijs.com/8.x/guides/migrations/v8) -- breaking changes, new API patterns
- [PixiJS v8 Render Loop Guide](https://pixijs.com/8.x/guides/concepts/render-loop) -- Ticker, onRender, frame lifecycle
- [PixiJS v8 Render Layers Guide](https://pixijs.com/8.x/guides/concepts/render-layers) -- RenderLayer for z-order control
- [PixiJS v8 Ticker Guide](https://pixijs.com/8.x/guides/components/ticker) -- add/remove callbacks, priority, FPS config
- [PixiJS Releases](https://github.com/pixijs/pixijs/releases) -- v8.16.0 latest stable (Feb 2026)
- [Matter.js Engine Docs](https://brm.io/matter-js/docs/classes/Engine.html) -- collision events API

### Secondary (MEDIUM confidence)
- [PixiJS v8 Quick Start](https://pixijs.com/8.x/guides/getting-started/quick-start) -- Vite integration notes, Node v20+ requirement
- [CodeREVUE Scale-to-Fit Guide](https://coderevue.net/posts/scale-to-fit-screen-pixijs/) -- responsive canvas patterns
- [Matter.js collision impulse workaround](https://github.com/liabru/matter-js/issues/219) -- relative velocity as force proxy

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- PixiJS v8 is the only reasonable choice given the locked decision for programmatic Graphics API art. Version verified at v8.16.0.
- Architecture: HIGH -- Container hierarchy, GraphicsContext sharing, and Ticker patterns are all from official PixiJS v8 documentation. Matter.js sync pattern is well-established.
- Pitfalls: HIGH -- All pitfalls verified against official docs and migration guide. The Matter.js impulse issue is documented in their GitHub issues.

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (PixiJS v8 API is stable; minor releases only)
