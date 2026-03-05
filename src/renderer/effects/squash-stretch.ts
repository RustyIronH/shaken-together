import type { Graphics } from 'pixi.js';
import type { Body } from 'matter-js';

/**
 * Applies squash-and-stretch deformation to a body part graphic
 * based on its physics body's velocity.
 *
 * Stretches along the local Y axis (direction of movement after rotation),
 * compresses perpendicular. Max deformation is 20% per user constraints.
 *
 * When speed < 0.5, resets to (1,1) to prevent jitter at rest.
 * This is a pure scale transform -- zero allocation cost.
 */
export function applySquashStretch(graphic: Graphics, body: Body): void {
  const vx = body.velocity.x;
  const vy = body.velocity.y;
  const speed = Math.sqrt(vx * vx + vy * vy);

  // No deformation at rest (prevents visual jitter)
  if (speed < 0.5) {
    graphic.scale.set(1, 1);
    return;
  }

  const maxDeform = 0.2; // 20% max deformation
  const deformFactor = Math.min(speed / 15, maxDeform);

  // Stretch along movement direction, compress perpendicular
  // Since Graphics are rotated to match body.angle, stretch on local Y axis
  graphic.scale.set(1 - deformFactor * 0.5, 1 + deformFactor);
}
