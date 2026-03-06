import { Composite, Sleeping } from 'matter-js';
import type { Engine } from 'matter-js';
import type { SceneState } from '../types';
import { SHAKE_CONFIG } from '../constants';

/** Interval ID for the gravity burst loop while button is held */
let burstInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Creates the hold-to-shake fallback button.
 * Only shown when DeviceMotion is unavailable or permission denied.
 * Pressing and holding applies continuous random gravity bursts;
 * releasing lets the existing gravity lerp return to normal.
 */
export function createShakeButton(engine: Engine, scene: SceneState): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = 'Hold to Shake';
  btn.id = 'shake-button';

  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    minWidth: '140px',
    minHeight: '48px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(8px)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '24px',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    zIndex: '50',         // Above canvas, below panel (panel z-index is 100+)
    outline: 'none',
    transition: 'background 0.15s ease',
  });

  // --- Pointer down: start gravity burst interval ---
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);

    // Visual feedback
    btn.style.background = 'rgba(255, 255, 255, 0.3)';

    // Stop any previous interval (safety)
    if (burstInterval !== null) {
      clearInterval(burstInterval);
    }

    burstInterval = setInterval(() => {
      // Random angle each tick
      const angle = Math.random() * Math.PI * 2;
      // Random magnitude: moderate to strong (3-10 range)
      const mag = 3 + Math.random() * 7;

      // Mode multiplier: Goofy mode gets ~2x force
      const modeMultiplier = scene.currentMode.name === 'goofy'
        ? SHAKE_CONFIG.goofyMultiplier
        : 1.0;

      // Scale factor normalized for Matter.js gravity
      const scaleFactor = SHAKE_CONFIG.gravityScaleFactor * 9.8;

      engine.gravity.x = Math.cos(angle) * mag * scaleFactor * modeMultiplier;
      engine.gravity.y = Math.sin(angle) * mag * scaleFactor * modeMultiplier;

      // Wake sleeping bodies (same logic as shake-manager)
      const bodies = Composite.allBodies(engine.world);
      for (const body of bodies) {
        if (!body.isStatic && body.isSleeping) {
          Sleeping.set(body, false);
        }
      }
    }, 100);
  });

  // --- Pointer up / cancel / leave: stop bursts ---
  const stopBursts = () => {
    btn.style.background = 'rgba(255, 255, 255, 0.15)';

    if (burstInterval !== null) {
      clearInterval(burstInterval);
      burstInterval = null;
    }
    // Do NOT snap gravity back -- let updateGravityLerp handle smooth return
  };

  btn.addEventListener('pointerup', stopBursts);
  btn.addEventListener('pointercancel', stopBursts);
  btn.addEventListener('pointerleave', stopBursts);

  return btn;
}

/**
 * Show the shake button.
 */
export function showShakeButton(button: HTMLButtonElement): void {
  button.style.display = 'block';
}

/**
 * Hide the shake button.
 */
export function hideShakeButton(button: HTMLButtonElement): void {
  button.style.display = 'none';
}
