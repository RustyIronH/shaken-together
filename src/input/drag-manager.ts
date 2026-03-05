import { Body, Composite, Constraint, Engine, Query } from 'matter-js';
import type { ActiveDrag, SceneState, VelocityTracker } from '../types';
import { FLING_VELOCITY_SCALE, MAX_VELOCITY, VELOCITY_SAMPLE_COUNT } from '../constants';

/**
 * Converts screen (client) coordinates to world coordinates.
 *
 * With PixiJS autoDensity=true, stage coordinates are CSS pixels.
 * Physics world is created with CSS pixel dimensions (app.screen.width/height).
 * So world coords = CSS coords (no scaling needed, just offset subtraction).
 */
export function screenToWorld(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/**
 * Finds which ragdoll owns a given body by searching the scene's ragdoll list.
 */
function findRagdollForBody(
  body: Body,
  scene: SceneState,
): string | null {
  for (const ragdoll of scene.ragdolls) {
    for (const ragdollBody of ragdoll.bodies.values()) {
      if (ragdollBody.id === body.id) {
        return ragdoll.id;
      }
    }
  }
  return null;
}

/**
 * Checks if a body is already being dragged by any pointer.
 */
function isBodyAlreadyDragged(body: Body, scene: SceneState): boolean {
  for (const drag of scene.activeDrags.values()) {
    if (drag.body.id === body.id) {
      return true;
    }
  }
  return false;
}

/**
 * Handles pointer down: hit test, create drag constraint, track in scene.
 */
export function handlePointerDown(
  e: PointerEvent,
  engine: Engine,
  scene: SceneState,
  canvas: HTMLCanvasElement,
): void {
  const worldPoint = screenToWorld(e.clientX, e.clientY, canvas);

  // Get all bodies and hit test
  const bodies = Composite.allBodies(engine.world);
  const hits = Query.point(bodies, worldPoint);

  // Find first non-static hit body
  const hitBody = hits.find((b) => !b.isStatic);
  if (!hitBody) return;

  // Prevent double-grab on same body
  if (isBodyAlreadyDragged(hitBody, scene)) return;

  // Find which ragdoll owns this body
  const ragdollId = findRagdollForBody(hitBody, scene);
  if (!ragdollId) return;

  // Create drag constraint anchoring body to pointer position
  const constraint = Constraint.create({
    pointA: { x: worldPoint.x, y: worldPoint.y },
    bodyB: hitBody,
    pointB: {
      x: worldPoint.x - hitBody.position.x,
      y: worldPoint.y - hitBody.position.y,
    },
    stiffness: 0.8,
    length: 0,
    render: { visible: false },
  });

  Composite.add(engine.world, constraint);

  // Update z-order: move grabbed ragdoll's composite to end (renders on top)
  const ragdoll = scene.ragdolls.find((r) => r.id === ragdollId);
  if (ragdoll) {
    const composites = engine.world.composites;
    const idx = composites.indexOf(ragdoll.composite);
    if (idx >= 0) {
      composites.splice(idx, 1);
      composites.push(ragdoll.composite);
    }
  }

  // Create velocity tracker and store active drag
  const velocityTracker: VelocityTracker = { positions: [] };
  trackPosition(velocityTracker, worldPoint.x, worldPoint.y, performance.now());

  const activeDrag: ActiveDrag = {
    pointerId: e.pointerId,
    body: hitBody,
    constraint,
    ragdollId,
    velocityTracker,
  };

  scene.activeDrags.set(e.pointerId, activeDrag);
}

/**
 * Handles pointer move: update constraint position and track velocity.
 */
export function handlePointerMove(
  e: PointerEvent,
  scene: SceneState,
  canvas: HTMLCanvasElement,
): void {
  const drag = scene.activeDrags.get(e.pointerId);
  if (!drag) return;

  const worldPoint = screenToWorld(e.clientX, e.clientY, canvas);

  // Update constraint anchor to follow pointer
  drag.constraint.pointA.x = worldPoint.x;
  drag.constraint.pointA.y = worldPoint.y;

  // Track position for velocity calculation
  trackPosition(drag.velocityTracker, worldPoint.x, worldPoint.y, performance.now());
}

/**
 * Handles pointer up: remove constraint, apply fling velocity, clean up.
 */
export function handlePointerUp(
  e: PointerEvent,
  engine: Engine,
  scene: SceneState,
  _canvas: HTMLCanvasElement,
): void {
  const drag = scene.activeDrags.get(e.pointerId);
  if (!drag) return;

  // Calculate release velocity before removing constraint
  const vel = calculateReleaseVelocity(drag.velocityTracker);

  // Remove the drag constraint from the world
  Composite.remove(engine.world, drag.constraint);

  // Apply fling velocity to body, capped to MAX_VELOCITY
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  if (speed > MAX_VELOCITY) {
    const scale = MAX_VELOCITY / speed;
    vel.x *= scale;
    vel.y *= scale;
  }
  Body.setVelocity(drag.body, { x: vel.x, y: vel.y });

  // Clean up
  scene.activeDrags.delete(e.pointerId);
}

/**
 * Tracks a position sample for velocity calculation.
 * Keeps only the last VELOCITY_SAMPLE_COUNT samples.
 */
export function trackPosition(
  tracker: VelocityTracker,
  x: number,
  y: number,
  time: number,
): void {
  tracker.positions.push({ x, y, time });
  while (tracker.positions.length > VELOCITY_SAMPLE_COUNT) {
    tracker.positions.shift();
  }
}

/**
 * Calculates release velocity from tracked position samples.
 * Returns { x: 0, y: 0 } when fewer than 2 samples or time delta is negligible.
 */
export function calculateReleaseVelocity(
  tracker: VelocityTracker,
): { x: number; y: number } {
  const positions = tracker.positions;
  if (positions.length < 2) return { x: 0, y: 0 };

  const first = positions[0];
  const last = positions[positions.length - 1];
  const dt = (last.time - first.time) / 1000; // Convert to seconds

  if (dt < 0.001) return { x: 0, y: 0 };

  return {
    x: ((last.x - first.x) / dt) * FLING_VELOCITY_SCALE,
    y: ((last.y - first.y) / dt) * FLING_VELOCITY_SCALE,
  };
}
