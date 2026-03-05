import type { Engine } from 'matter-js';
import type { SceneState } from '../types';
import { handlePointerDown, handlePointerMove, handlePointerUp } from './drag-manager';

/**
 * Sets up multi-touch pointer event listeners on the canvas.
 * Each pointer is tracked independently via pointerId.
 *
 * Returns a cleanup function that removes all listeners.
 */
export function setupMultiTouch(
  canvas: HTMLCanvasElement,
  engine: Engine,
  scene: SceneState,
): () => void {
  // Prevent browser default gestures (scroll, zoom, etc.)
  canvas.style.touchAction = 'none';

  const onPointerDown = (e: PointerEvent) => {
    handlePointerDown(e, engine, scene, canvas);
  };

  const onPointerMove = (e: PointerEvent) => {
    handlePointerMove(e, scene, canvas);
  };

  const onPointerUp = (e: PointerEvent) => {
    handlePointerUp(e, engine, scene, canvas);
  };

  // pointercancel treated as release to prevent orphaned constraints
  const onPointerCancel = (e: PointerEvent) => {
    handlePointerUp(e, engine, scene, canvas);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
  };
}

/**
 * Calls the cleanup function returned by setupMultiTouch.
 */
export function cleanupMultiTouch(cleanup: () => void): void {
  cleanup();
}
