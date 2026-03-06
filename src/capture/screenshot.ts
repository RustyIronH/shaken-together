import type { Application, Container } from 'pixi.js';
import type { SceneState } from '../types';
import type { RagdollSprite } from '../renderer/ragdoll-sprite';

/** Result of a two-pass screenshot capture */
export interface CaptureResult {
  /** Data URL of the clean capture (effects OFF) */
  clean: string;
  /** Data URL of the capture with effects visible */
  withEffects: string;
}

/**
 * Prepares the scene for a clean capture.
 *
 * Clears all active drags (constraints become orphaned but harmless with
 * Runner stopped) and resets all sprite container scales to 1.0 so the
 * captured image shows the natural ragdoll pose.
 */
export function prepareForCapture(
  scene: SceneState,
  spriteMap: Map<string, RagdollSprite>,
): void {
  // Clear all active drags -- pointerup events will no-op on empty map
  scene.activeDrags.clear();

  // Reset sprite scales to neutral (removes grab feedback scaling)
  for (const sprite of spriteMap.values()) {
    sprite.container.scale.set(1.0);
  }
}

/**
 * Captures two PNG screenshots of the PixiJS stage:
 * 1. Clean capture with effects layer hidden
 * 2. Effects capture with effects layer visible
 *
 * The effectsLayer visibility is always restored to true after capture,
 * even if an error occurs during the extract process.
 */
export function captureScreenshots(
  app: Application,
  effectsLayer: Container,
): CaptureResult {
  try {
    // Pass 1: Clean capture (effects OFF)
    effectsLayer.visible = false;
    const cleanCanvas = app.renderer.extract.canvas({
      target: app.stage,
    }) as HTMLCanvasElement;
    const clean = cleanCanvas.toDataURL('image/png');

    // Pass 2: Effects capture (effects ON)
    effectsLayer.visible = true;
    const effectsCanvas = app.renderer.extract.canvas({
      target: app.stage,
    }) as HTMLCanvasElement;
    const withEffects = effectsCanvas.toDataURL('image/png');

    return { clean, withEffects };
  } finally {
    // Always restore effects layer visibility
    effectsLayer.visible = true;
  }
}
