import { Composite } from 'matter-js';
import type { Engine, Body } from 'matter-js';
import type { SceneState, RagdollInstance } from '../types';
import { BG_GRADIENT_TOP, BG_GRADIENT_BOTTOM } from '../constants';
import { drawGlow } from './colors';

/**
 * Creates a debug renderer bound to a canvas element.
 * Returns an object with the rendering context and canvas reference.
 */
export function createDebugRenderer(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
} {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context from canvas');
  }
  return { ctx, canvas };
}

/**
 * Renders a single frame of the debug view.
 *
 * Draws: gradient background, all physics bodies as colored shapes,
 * joint constraints as semi-transparent white lines, and glow
 * highlight on currently-dragged bodies.
 *
 * Bodies are drawn in z-order based on their composite's position
 * in engine.world.composites (later = on top).
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  engine: Engine,
  scene: SceneState,
): void {
  const canvas = ctx.canvas;

  // 1. Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, BG_GRADIENT_TOP);
  gradient.addColorStop(1, BG_GRADIENT_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Build a z-order map: compositeIndex -> order for sorting
  const composites = engine.world.composites;
  const compositeOrder = new Map<number, number>();
  for (let i = 0; i < composites.length; i++) {
    const bodies = Composite.allBodies(composites[i]);
    for (const body of bodies) {
      compositeOrder.set(body.id, i);
    }
  }

  // 4. Get all bodies and sort by composite z-order
  const allBodies = Composite.allBodies(engine.world);
  const sortedBodies = [...allBodies].sort((a, b) => {
    const orderA = compositeOrder.get(a.id) ?? -1;
    const orderB = compositeOrder.get(b.id) ?? -1;
    return orderA - orderB;
  });

  // 5. Build a set of currently dragged body IDs for glow lookup
  const draggedBodyIds = new Set<number>();
  const draggedBodyRagdolls = new Map<number, RagdollInstance>();
  for (const drag of scene.activeDrags.values()) {
    draggedBodyIds.add(drag.body.id);
    const ragdoll = scene.ragdolls.find((r) => r.id === drag.ragdollId);
    if (ragdoll) {
      draggedBodyRagdolls.set(drag.body.id, ragdoll);
    }
  }

  // 6. Draw each non-static body
  for (const body of sortedBodies) {
    if (body.isStatic) continue;

    drawBody(ctx, body);

    // Draw glow on dragged bodies
    if (draggedBodyIds.has(body.id)) {
      const ragdoll = draggedBodyRagdolls.get(body.id);
      if (ragdoll) {
        drawGlow(ctx, body, ragdoll.colorScheme.highlight, 15);
      }
    }
  }

  // 7. Draw constraints as semi-transparent white lines
  drawConstraints(ctx, engine);
}

/**
 * Draws a single body as a colored shape (circle or rectangle).
 */
function drawBody(ctx: CanvasRenderingContext2D, body: Body): void {
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  ctx.fillStyle = body.render.fillStyle || '#ffffff';
  ctx.globalAlpha = body.render.opacity ?? 1;

  if (body.circleRadius) {
    // Circle for head, hands, feet
    ctx.beginPath();
    ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rectangle for torso and limbs
    const w = body.bounds.max.x - body.bounds.min.x;
    const h = body.bounds.max.y - body.bounds.min.y;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

/**
 * Draws all non-drag constraints as semi-transparent white lines
 * connecting body parts (joint visualization).
 */
function drawConstraints(ctx: CanvasRenderingContext2D, engine: Engine): void {
  const constraints = Composite.allConstraints(engine.world);

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;

  for (const c of constraints) {
    // Skip constraints without both bodies (world-anchored or drag constraints)
    if (!c.bodyA || !c.bodyB) continue;

    // Skip drag constraints (render.visible === false)
    if (c.render && c.render.visible === false) continue;

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

/**
 * Resizes the canvas pixel dimensions to match the window size.
 * Prevents coordinate mismatch between CSS size and pixel dimensions.
 * Call on init and on window resize.
 */
export function resizeCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
