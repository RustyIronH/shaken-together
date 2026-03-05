import { Graphics, Container } from 'pixi.js';
import type { RagdollInstance } from '../../types';
import type { RagdollSprite } from '../ragdoll-sprite';

/** Pool of reusable speed line Graphics objects */
export interface SpeedLinePool {
  lines: Graphics[];
  effectsLayer: Container;
}

/** Body parts to check for speed lines (subset for performance) */
const TRACKED_PARTS = ['head', 'upperTorso', 'handL', 'handR', 'footL', 'footR'];

/** Minimum speed threshold to show speed lines */
const SPEED_THRESHOLD = 8;

/**
 * Creates a pool of reusable speed line Graphics objects.
 * All lines are pre-created and initially invisible.
 */
export function createSpeedLinePool(
  effectsLayer: Container,
  maxLines: number,
): SpeedLinePool {
  const lines: Graphics[] = [];

  for (let i = 0; i < maxLines; i++) {
    const line = new Graphics();
    line.label = 'speed-line';
    line.visible = false;
    effectsLayer.addChild(line);
    lines.push(line);
  }

  return { lines, effectsLayer };
}

/**
 * Updates speed lines each frame.
 *
 * Checks a subset of body parts (6 per ragdoll) for high velocity.
 * Activates pooled Graphics lines behind fast-moving parts,
 * oriented opposite to the velocity direction.
 *
 * Lines not needed are hidden. No allocations during gameplay.
 */
export function updateSpeedLines(
  pool: SpeedLinePool,
  ragdolls: RagdollInstance[],
  spriteMap: Map<string, RagdollSprite>,
): void {
  // Deactivate all lines first
  for (const line of pool.lines) {
    line.visible = false;
  }

  let lineIndex = 0;

  for (const ragdoll of ragdolls) {
    const sprite = spriteMap.get(ragdoll.id);
    if (!sprite) continue;

    for (const partLabel of TRACKED_PARTS) {
      const body = ragdoll.bodies.get(partLabel);
      if (!body) continue;

      const vx = body.velocity.x;
      const vy = body.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (speed < SPEED_THRESHOLD) continue;
      if (lineIndex >= pool.lines.length) return; // Pool exhausted

      const line = pool.lines[lineIndex++];

      // Position behind the body part (opposite velocity direction)
      const angle = Math.atan2(vy, vx);
      const lineLength = Math.min(speed * 1.5, 20); // 10-20px

      // Clear and redraw the line
      line.clear();
      line.rect(0, -1, lineLength, 2).fill({ color: 0xffffff, alpha: 0.4 });

      // Position at body center, rotated to point opposite velocity
      line.position.set(body.position.x, body.position.y);
      line.rotation = angle + Math.PI; // Opposite direction
      line.alpha = Math.min(speed / 20, 0.5); // 0.3-0.5 alpha
      line.visible = true;
    }
  }
}
