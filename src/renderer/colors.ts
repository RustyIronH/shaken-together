import type { Engine } from 'matter-js';
import type { Body } from 'matter-js';
import type { RagdollInstance } from '../types';

/**
 * Moves a ragdoll composite to the end of engine.world.composites
 * so it renders last (on top of all others).
 */
export function bringToFront(engine: Engine, ragdoll: RagdollInstance): void {
  const composites = engine.world.composites;
  const idx = composites.indexOf(ragdoll.composite);
  if (idx >= 0) {
    composites.splice(idx, 1);
    composites.push(ragdoll.composite);
  }
}

/**
 * Draws a soft glow effect around a body.
 * Used to highlight grabbed bodies for visibility in tangles.
 */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  body: Body,
  color: string,
  radius: number = 15,
): void {
  ctx.save();

  ctx.shadowBlur = radius;
  ctx.shadowColor = color;

  // Set semi-transparent fill for the glow
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = color;

  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (body.circleRadius) {
    // Circle body (head, hands, feet)
    ctx.beginPath();
    ctx.arc(0, 0, body.circleRadius + 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rectangle body (torso, limbs)
    const w = body.bounds.max.x - body.bounds.min.x;
    const h = body.bounds.max.y - body.bounds.min.y;
    ctx.fillRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
  }

  ctx.restore();
}
