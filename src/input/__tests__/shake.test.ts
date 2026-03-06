import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Composite, Sleeping } from 'matter-js';
import type { Engine } from 'matter-js';
import { SHAKE_CONFIG, GRAVITY_RESTING_MAGNITUDE, REALISTIC_MODE, GOOFY_MODE } from '../../constants';
import type { SceneState } from '../../types';

// The module under test -- does not exist yet (RED phase)
import {
  handleMotion,
  updateGravityLerp,
  wakeAllBodies,
  smooth,
  initShake,
  getShakeState,
  _resetShakeState,
} from '../shake-manager';

/** Helper: create a mock Matter.js engine with gravity */
function mockEngine(gx = 0, gy = 1, scale = 0.001): Engine {
  return {
    gravity: { x: gx, y: gy, scale },
    world: {
      composites: [],
      bodies: [],
      constraints: [],
      id: 1,
      type: 'composite',
      label: 'World',
      isModified: false,
      parent: null,
      plugin: {},
    },
  } as unknown as Engine;
}

/** Helper: create a mock scene */
function mockScene(modeName: 'realistic' | 'goofy' = 'realistic'): SceneState {
  return {
    ragdolls: [],
    dollCount: 0,
    currentMode: modeName === 'realistic' ? { ...REALISTIC_MODE } : { ...GOOFY_MODE },
    activeDrags: new Map(),
  };
}

/** Helper: create a mock DeviceMotionEvent */
function mockMotionEvent(x: number | null, y: number | null, z: number | null = 0): DeviceMotionEvent {
  return {
    accelerationIncludingGravity: { x, y, z },
    acceleration: null,
    rotationRate: null,
    interval: 16,
  } as unknown as DeviceMotionEvent;
}

describe('Shake Manager', () => {
  beforeEach(() => {
    _resetShakeState();
  });

  describe('gravity mapping', () => {
    it('maps accel.x to engine.gravity.x and inverted accel.y to engine.gravity.y', () => {
      const engine = mockEngine();
      const scene = mockScene('realistic');

      // Feed a motion event with known accelerometer values
      handleMotion(mockMotionEvent(5.0, -9.8), engine, scene);

      // X should map proportionally to accel.x
      // Y should be inverted (positive accel.y -> negative gravity.y shift)
      // Exact values depend on smoothing from 0, but X should be positive
      expect(engine.gravity.x).not.toBe(0);
      // With accel.x = 5.0, smoothed from 0: smoothedX = 0 + 0.3*(5-0) = 1.5
      // engine.gravity.x = 1.5 * scaleFactor * modeMultiplier
      const expectedSmoothedX = 5.0 * SHAKE_CONFIG.smoothingAlpha;
      const expectedGravityX = expectedSmoothedX * SHAKE_CONFIG.gravityScaleFactor * 1.0;
      expect(engine.gravity.x).toBeCloseTo(expectedGravityX, 5);

      // Y is inverted: accel.y = -9.8, smoothed from 0: -9.8*0.3 = -2.94
      // gravity.y = -(-2.94) * scaleFactor = 2.94 * scaleFactor
      const expectedSmoothedY = -9.8 * SHAKE_CONFIG.smoothingAlpha;
      const expectedGravityY = -expectedSmoothedY * SHAKE_CONFIG.gravityScaleFactor * 1.0;
      expect(engine.gravity.y).toBeCloseTo(expectedGravityY, 5);
    });

    it('with null accel values is a no-op (does not crash or change gravity)', () => {
      const engine = mockEngine(0, 1, 0.001);
      const scene = mockScene();

      // Null x
      handleMotion(mockMotionEvent(null, -9.8), engine, scene);
      expect(engine.gravity.x).toBe(0);
      expect(engine.gravity.y).toBe(1);

      // Null y
      handleMotion(mockMotionEvent(5.0, null), engine, scene);
      expect(engine.gravity.x).toBe(0);
      expect(engine.gravity.y).toBe(1);

      // Null accel object
      const nullEvent = {
        accelerationIncludingGravity: null,
        acceleration: null,
        rotationRate: null,
        interval: 16,
      } as unknown as DeviceMotionEvent;
      handleMotion(nullEvent, engine, scene);
      expect(engine.gravity.x).toBe(0);
      expect(engine.gravity.y).toBe(1);
    });
  });

  describe('smoothing', () => {
    it('reduces jitter (feeding alternating values converges toward average)', () => {
      // Alternate between 10 and 0 -- EMA should converge toward 5
      let smoothed = 0;
      for (let i = 0; i < 20; i++) {
        const raw = i % 2 === 0 ? 10 : 0;
        smoothed = smooth(smoothed, raw);
      }
      // After many alternations, should be close to the average (5)
      expect(smoothed).toBeGreaterThan(3);
      expect(smoothed).toBeLessThan(7);
    });
  });

  describe('goofy mode', () => {
    it('applies ~2x multiplier to gravity values vs Realistic mode', () => {
      const engineRealistic = mockEngine();
      const sceneRealistic = mockScene('realistic');

      const engineGoofy = mockEngine();
      const sceneGoofy = mockScene('goofy');

      // Feed the same motion event to both
      handleMotion(mockMotionEvent(5.0, -9.8), engineRealistic, sceneRealistic);

      _resetShakeState(); // Reset so smoothing starts from 0 again

      handleMotion(mockMotionEvent(5.0, -9.8), engineGoofy, sceneGoofy);

      // Goofy gravity.x should be ~2x the realistic gravity.x
      expect(Math.abs(engineGoofy.gravity.x)).toBeCloseTo(
        Math.abs(engineRealistic.gravity.x) * SHAKE_CONFIG.goofyMultiplier,
        5,
      );
    });
  });

  describe('gravity lerp', () => {
    it('interpolates gravity toward default over time', () => {
      const engine = mockEngine(5, -3, 0.002);
      const mode = { ...REALISTIC_MODE }; // default: x=0, y=1, scale=0.001

      // Run 120 frames (~2 seconds at 60fps) of lerp
      // With lerpSpeed=0.05: residual = initial * 0.95^120 ~ 0.2% of initial
      for (let i = 0; i < 120; i++) {
        updateGravityLerp(engine, mode, 16.67);
      }

      // After ~2 seconds of lerping, gravity should be very close to defaults
      expect(engine.gravity.x).toBeCloseTo(mode.gravity.x, 1);
      expect(engine.gravity.y).toBeCloseTo(mode.gravity.y, 1);
      expect(engine.gravity.scale).toBeCloseTo(mode.gravity.scale, 4);
    });

    it('is frame-rate independent (same result at 30fps vs 60fps over same duration)', () => {
      // 60fps for 1 second: 60 frames of 16.67ms
      const engine60 = mockEngine(5, -3, 0.002);
      const mode = { ...REALISTIC_MODE };
      for (let i = 0; i < 60; i++) {
        updateGravityLerp(engine60, mode, 16.67);
      }

      // 30fps for 1 second: 30 frames of 33.33ms
      const engine30 = mockEngine(5, -3, 0.002);
      for (let i = 0; i < 30; i++) {
        updateGravityLerp(engine30, mode, 33.33);
      }

      // Results should be very close (within 1% tolerance)
      expect(engine30.gravity.x).toBeCloseTo(engine60.gravity.x, 1);
      expect(engine30.gravity.y).toBeCloseTo(engine60.gravity.y, 1);
      expect(engine30.gravity.scale).toBeCloseTo(engine60.gravity.scale, 5);
    });
  });

  describe('wake bodies', () => {
    it('wakes sleeping non-static bodies when shake magnitude exceeds threshold', () => {
      const engine = mockEngine();

      // Create mock sleeping body
      const sleepingBody = {
        isSleeping: true,
        isStatic: false,
        id: 1,
      };

      // Mock Composite.allBodies to return our body
      const allBodiesSpy = vi.spyOn(Composite, 'allBodies').mockReturnValue([sleepingBody as any]);
      const sleepingSpy = vi.spyOn(Sleeping, 'set').mockImplementation(() => {});

      wakeAllBodies(engine, 5.0); // magnitude = 5.0, well above threshold of 2.0

      expect(sleepingSpy).toHaveBeenCalledWith(sleepingBody, false);

      allBodiesSpy.mockRestore();
      sleepingSpy.mockRestore();
    });

    it('does NOT wake bodies when magnitude is below threshold', () => {
      const engine = mockEngine();

      const sleepingBody = {
        isSleeping: true,
        isStatic: false,
        id: 1,
      };

      const allBodiesSpy = vi.spyOn(Composite, 'allBodies').mockReturnValue([sleepingBody as any]);
      const sleepingSpy = vi.spyOn(Sleeping, 'set').mockImplementation(() => {});

      wakeAllBodies(engine, 0.5); // magnitude = 0.5, below threshold of 2.0

      expect(sleepingSpy).not.toHaveBeenCalled();

      allBodiesSpy.mockRestore();
      sleepingSpy.mockRestore();
    });
  });

  describe('permission detection', () => {
    // Save original globals
    const originalDeviceMotionEvent = (globalThis as any).DeviceMotionEvent;
    const originalWindow = (globalThis as any).window;

    beforeEach(() => {
      // Ensure window exists in Node environment for addEventListener mocking
      if (typeof globalThis.window === 'undefined') {
        (globalThis as any).window = {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
      }
    });

    afterEach(() => {
      // Restore DeviceMotionEvent
      if (originalDeviceMotionEvent) {
        (globalThis as any).DeviceMotionEvent = originalDeviceMotionEvent;
      } else {
        delete (globalThis as any).DeviceMotionEvent;
      }
      // Restore window
      if (originalWindow) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    });

    it('initShake returns unsupported when DeviceMotionEvent is undefined', async () => {
      delete (globalThis as any).DeviceMotionEvent;

      const engine = mockEngine();
      const scene = mockScene();
      const result = await initShake(engine, scene);

      expect(result).toBe('unsupported');
      expect(getShakeState().permissionState).toBe('unsupported');
    });

    it('initShake returns granted when requestPermission is not a function (Android)', async () => {
      // Mock DeviceMotionEvent without requestPermission (Android)
      (globalThis as any).DeviceMotionEvent = class MockDeviceMotionEvent {};

      const engine = mockEngine();
      const scene = mockScene();
      const result = await initShake(engine, scene);

      expect(result).toBe('granted');
      expect(getShakeState().permissionState).toBe('granted');
    });

    it('initShake calls requestPermission when available and returns its result (iOS)', async () => {
      // Mock DeviceMotionEvent with requestPermission (iOS)
      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      (globalThis as any).DeviceMotionEvent = class MockDeviceMotionEvent {
        static requestPermission = mockRequestPermission;
      };

      const engine = mockEngine();
      const scene = mockScene();
      const result = await initShake(engine, scene);

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe('granted');
    });
  });
});
