import { Graphics, Container } from 'pixi.js';

/** Individual flash state */
interface FlashState {
  graphic: Graphics;
  active: boolean;
  remainingMs: number;
  totalMs: number;
}

/** Pool of reusable impact flash Graphics objects */
export interface ImpactFlashPool {
  flashes: FlashState[];
  effectsLayer: Container;
}

/** Flash duration in milliseconds */
const FLASH_DURATION_MS = 150;

/**
 * Creates a star burst shape for an impact flash.
 * 4-pointed star drawn as a polygon centered at (0,0).
 */
function drawStarBurst(graphic: Graphics): void {
  graphic.clear();

  const outerRadius = 12;
  const innerRadius = 4;
  const points = 4;
  const vertices: number[] = [];

  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  graphic.poly(vertices).fill({ color: 0xffffff });
}

/**
 * Creates a pool of reusable impact flash Graphics objects.
 * All flashes are pre-created with star burst shapes and initially invisible.
 */
export function createImpactFlashPool(
  effectsLayer: Container,
  poolSize: number,
): ImpactFlashPool {
  const flashes: FlashState[] = [];

  for (let i = 0; i < poolSize; i++) {
    const graphic = new Graphics();
    graphic.label = 'impact-flash';
    graphic.visible = false;
    drawStarBurst(graphic);
    effectsLayer.addChild(graphic);

    flashes.push({
      graphic,
      active: false,
      remainingMs: 0,
      totalMs: FLASH_DURATION_MS,
    });
  }

  return { flashes, effectsLayer };
}

/**
 * Spawns an impact flash at the given position.
 *
 * Finds an inactive flash from the pool, positions it, and activates it.
 * Scale is proportional to impact force (clamped 0.5 to 2.0).
 * If no inactive flash is available, the spawn is silently dropped.
 *
 * Only call for impacts where force > 3 (relative velocity threshold).
 */
export function spawnImpactFlash(
  pool: ImpactFlashPool,
  x: number,
  y: number,
  force: number,
): void {
  // Find an inactive flash
  const flash = pool.flashes.find((f) => !f.active);
  if (!flash) return; // Pool exhausted, silently drop

  // Scale proportional to force (clamped)
  const scale = Math.min(Math.max(force / 10, 0.5), 2.0);

  flash.graphic.position.set(x, y);
  flash.graphic.scale.set(scale);
  flash.graphic.alpha = 1;
  flash.graphic.visible = true;
  flash.active = true;
  flash.remainingMs = FLASH_DURATION_MS;
  flash.totalMs = FLASH_DURATION_MS;
}

/**
 * Updates all active impact flashes each frame.
 *
 * Decrements lifetime, reduces alpha linearly, and deactivates
 * flashes whose lifetime has expired. Called from the ticker.
 */
export function updateImpactFlashes(
  pool: ImpactFlashPool,
  deltaMs: number,
): void {
  for (const flash of pool.flashes) {
    if (!flash.active) continue;

    flash.remainingMs -= deltaMs;

    if (flash.remainingMs <= 0) {
      flash.graphic.visible = false;
      flash.active = false;
      continue;
    }

    // Linear alpha fade
    flash.graphic.alpha = flash.remainingMs / flash.totalMs;
  }
}
