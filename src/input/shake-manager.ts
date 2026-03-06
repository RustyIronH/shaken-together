import { Composite, Sleeping } from 'matter-js';
import type { Engine } from 'matter-js';
import type { ShakeState, PhysicsMode, SceneState } from '../types';
import { SHAKE_CONFIG, GRAVITY_RESTING_MAGNITUDE } from '../constants';

// --- Module State ---

let shakeState: ShakeState = createDefaultState();

/** Reference to engine for event handler */
let _engine: Engine | null = null;

/** Reference to scene for mode access in event handler */
let _scene: SceneState | null = null;

function createDefaultState(): ShakeState {
  return {
    supported: false,
    permissionState: 'pending',
    active: false,
    smoothedX: 0,
    smoothedY: 0,
    lastMagnitude: 0,
    lastEventTime: 0,
  };
}

// --- Pure Functions (exported for testing) ---

/**
 * Exponential moving average smoothing.
 * Reduces jitter from raw accelerometer data.
 */
export function smooth(prev: number, raw: number): number {
  return prev + SHAKE_CONFIG.smoothingAlpha * (raw - prev);
}

/**
 * Wake all sleeping non-static bodies when shake magnitude exceeds threshold.
 * Only wakes when magnitude delta from baseline is above wakeThreshold.
 */
export function wakeAllBodies(engine: Engine, magnitudeDelta: number): void {
  if (magnitudeDelta < SHAKE_CONFIG.wakeThreshold) return;

  const bodies = Composite.allBodies(engine.world);
  for (const body of bodies) {
    if (!body.isStatic && body.isSleeping) {
      Sleeping.set(body, false);
    }
  }
}

// --- Core Functions ---

/**
 * Handle a DeviceMotion event: smooth accelerometer data and map to engine gravity.
 * Uses accelerationIncludingGravity for maximum device compatibility.
 *
 * Snow globe model: device X -> gravity X, device -Y -> gravity Y.
 */
export function handleMotion(event: DeviceMotionEvent, engine: Engine, scene: SceneState): void {
  const accel = event.accelerationIncludingGravity;
  if (!accel || accel.x === null || accel.y === null) return;

  // Smooth raw sensor data with exponential moving average
  shakeState.smoothedX = smooth(shakeState.smoothedX, accel.x);
  shakeState.smoothedY = smooth(shakeState.smoothedY, accel.y);

  // Calculate magnitude for activity detection and wake threshold
  const magnitude = Math.sqrt(
    shakeState.smoothedX * shakeState.smoothedX +
    shakeState.smoothedY * shakeState.smoothedY,
  );
  shakeState.lastMagnitude = magnitude;

  // Determine if actively shaking: magnitude delta from resting
  const magnitudeDelta = Math.abs(magnitude - GRAVITY_RESTING_MAGNITUDE);
  shakeState.active = magnitudeDelta > SHAKE_CONFIG.activeThreshold;

  // Mode multiplier: Goofy mode gets ~2x force
  const modeMultiplier = scene.currentMode.name === 'goofy'
    ? SHAKE_CONFIG.goofyMultiplier
    : 1.0;

  // Map accelerometer to gravity:
  // Device tilt left (accel.x < 0) -> gravity pulls left (gravity.x < 0)
  // Device upright (accel.y < 0) -> gravity pulls down (gravity.y > 0)
  engine.gravity.x = -shakeState.smoothedX * SHAKE_CONFIG.gravityScaleFactor * modeMultiplier;
  engine.gravity.y = shakeState.smoothedY * SHAKE_CONFIG.gravityScaleFactor * modeMultiplier;

  // Wake sleeping bodies if shake is significant
  wakeAllBodies(engine, magnitudeDelta);

  // Update last event time
  shakeState.lastEventTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Lerp gravity back to mode defaults when shaking stops.
 * Uses frame-rate independent exponential decay.
 * Called every frame from the ticker.
 */
export function updateGravityLerp(engine: Engine, mode: PhysicsMode, deltaMs: number): void {
  // If shake is active (recent event within 200ms), let handleMotion control gravity
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (shakeState.active && (now - shakeState.lastEventTime) < 200) {
    return;
  }

  // Mark as inactive
  shakeState.active = false;

  // Frame-rate independent lerp: t = 1 - (1 - speed)^(dt / 16.67)
  const t = 1 - Math.pow(1 - SHAKE_CONFIG.lerpSpeed, deltaMs / 16.67);

  engine.gravity.x += (mode.gravity.x - engine.gravity.x) * t;
  engine.gravity.y += (mode.gravity.y - engine.gravity.y) * t;
  engine.gravity.scale += (mode.gravity.scale - engine.gravity.scale) * t;
}

/**
 * Initialize shake detection.
 * Detects DeviceMotion support, handles iOS permission, sets up event listener.
 *
 * @returns Permission state: 'granted', 'denied', or 'unsupported'
 */
export async function initShake(
  engine: Engine,
  scene: SceneState,
): Promise<'granted' | 'denied' | 'unsupported' | 'prompt'> {
  _engine = engine;
  _scene = scene;

  // 1. Check if DeviceMotionEvent exists at all
  if (typeof DeviceMotionEvent === 'undefined') {
    shakeState.permissionState = 'unsupported';
    shakeState.supported = false;
    return 'unsupported';
  }

  // Safe reference to window (works in both browser and Node test environments)
  const win = typeof window !== 'undefined' ? window : (globalThis as any).window;

  // 2. iOS Safari requires requestPermission() from a user gesture.
  // Don't call it here — return 'prompt' so the caller can show a button.
  if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
    shakeState.permissionState = 'prompt';
    return 'prompt';
  }

  // 3. Android/other browsers: available by default over HTTPS
  shakeState.supported = true;
  shakeState.permissionState = 'granted';
  if (win) win.addEventListener('devicemotion', onDeviceMotion);
  return 'granted';
}

/**
 * Whether at least one real devicemotion event has been received.
 */
export function hasReceivedMotionEvent(): boolean {
  return shakeState.lastEventTime > 0;
}

/**
 * Request iOS DeviceMotion permission. MUST be called from a user gesture (tap).
 * Returns true if granted.
 */
export async function requestMotionPermission(): Promise<boolean> {
  const win = typeof window !== 'undefined' ? window : (globalThis as any).window;
  try {
    const permission = await (DeviceMotionEvent as any).requestPermission();
    shakeState.permissionState = permission;
    if (permission === 'granted') {
      shakeState.supported = true;
      if (win) win.addEventListener('devicemotion', onDeviceMotion);
      return true;
    }
    return false;
  } catch {
    shakeState.permissionState = 'denied';
    return false;
  }
}

/**
 * Internal event handler for devicemotion events.
 * Forwards to handleMotion with stored engine/scene references.
 */
function onDeviceMotion(event: DeviceMotionEvent): void {
  if (_engine && _scene) {
    handleMotion(event, _engine, _scene);
  }
}

/**
 * Get the current shake state (for UI decisions like showing fallback button).
 */
export function getShakeState(): ShakeState {
  return { ...shakeState };
}

/**
 * Reset shake state to defaults (test helper).
 */
export function _resetShakeState(): void {
  shakeState = createDefaultState();
  _engine = null;
  _scene = null;
}
