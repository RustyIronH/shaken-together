# Phase 3: Device Input - Research

**Researched:** 2026-03-06
**Domain:** DeviceMotion API, accelerometer-driven gravity, mobile input fallback
**Confidence:** HIGH

## Summary

Phase 3 connects the phone's physical accelerometer to Matter.js gravity, creating a "snow globe" effect where tilting and shaking the device flings ragdolls around. The core technical challenge is mapping 3-axis accelerometer data from the DeviceMotion API into Matter.js's 2D gravity vector (`engine.gravity.x`, `engine.gravity.y`, `engine.gravity.scale`), smoothing noisy sensor data with a low-pass filter, and providing graceful degradation when motion access is unavailable.

The DeviceMotion API is well-supported across mobile browsers (93%+ global coverage) but has platform-specific quirks: iOS Safari requires `DeviceMotionEvent.requestPermission()` called from a user gesture, while Android Chrome grants access automatically over HTTPS. The CONTEXT.md explicitly defers the iOS permission flow to a later pass, so the implementation should detect and gate on `requestPermission` but the pre-permission explainer UX is out of scope for now.

**Primary recommendation:** Use `accelerationIncludingGravity` (not `acceleration`) as the primary data source because it works on all devices including cheap phones without gyroscopes. Map device X-axis to `engine.gravity.x` and device Y-axis (inverted) to `engine.gravity.y`, apply exponential smoothing (alpha ~0.3), and lerp gravity back to default when motion stops.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Snow globe model: device motion shifts gravity direction -- tilt left and everything slides left, shake hard and dolls fly around inside the box
- Proportional intensity: gentle shake = gentle gravity shift, hard shake = violent fling. Linear mapping from accelerometer magnitude to gravity scale
- Goofy mode amplifies shake response (~2x force multiplier) -- consistent with Goofy's existing wilder physics personality
- Quick settle on stop: gravity lerps back to normal downward over ~300-500ms when shaking stops. Smooth, not jarring
- Hold-to-shake button: press and hold to apply continuous random gravity bursts, release to stop
- Fallback only: button only appears when DeviceMotion is unavailable or permission denied. Phone users with motion access see no button (maximum play area)
- Existing touch/drag from Phase 1 remains as the baseline interaction for all users
- Ragdoll motion is the feedback -- no extra UI elements (intensity meters, screen shake). Clean and immersive
- Existing Phase 2 effects (impact flashes, speed lines, face expressions) trigger on shake-caused collisions the same as drag-caused ones -- no special treatment needed, collision events handle this naturally
- Subtle onboarding hint: "Shake your phone!" text appears briefly on first load, fades after a few seconds or after first shake detected

### Claude's Discretion
- Accelerometer smoothing/filtering approach
- Exact gravity scale mapping curve
- Shake button visual design and placement
- Onboarding hint styling and animation
- DeviceMotion availability detection approach
- Gravity lerp easing function

### Deferred Ideas (OUT OF SCOPE)
- iOS DeviceMotion permission flow with pre-permission explainer -- user requested deferral ("worry about iOS later")

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INPT-01 | User shakes phone and ragdolls respond to the motion naturally (DeviceMotion API) | DeviceMotion API maps accelerometer to gravity; snow globe model; exponential smoothing filter; proportional intensity mapping; Goofy mode 2x multiplier |
| INPT-02 | iOS users see a pre-permission explainer before DeviceMotion permission request | **DEFERRED per CONTEXT.md** -- iOS permission flow explicitly deferred. Implementation should detect `requestPermission` existence and call it from user gesture, but no explainer screen this phase |
| INPT-03 | Users who deny motion permission can still play via touch/drag fallback | Hold-to-shake button as fallback; existing Phase 1 touch/drag always available; feature detection gates button visibility |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DeviceMotion API | Web Standard (Baseline 2023) | Accelerometer data from phone sensors | Native browser API, no library needed, 93%+ coverage |
| Matter.js | ^0.20.0 (already installed) | Physics engine with dynamic gravity | Already in project; `engine.gravity.x/y/scale` is the direct manipulation point |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | No additional libraries needed. All functionality is built on native APIs and existing Matter.js gravity manipulation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw DeviceMotion | shake.js library | Adds dependency for shake detection only; we need continuous gravity mapping, not discrete shake events |
| `accelerationIncludingGravity` | `acceleration` (gravity-removed) | `acceleration` is null on cheap devices without gyroscopes; `accelerationIncludingGravity` works everywhere |
| Custom smoothing | Signal processing library | Exponential moving average is 2 lines of code; a library is overkill |

**Installation:**
```bash
# No new packages needed -- uses native DeviceMotion API + existing Matter.js
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  input/
    shake-manager.ts        # NEW: DeviceMotion listener, smoothing, gravity mapping
    shake-button.ts         # NEW: Hold-to-shake fallback button UI
    drag-manager.ts         # EXISTING: unchanged
    multi-touch.ts          # EXISTING: unchanged
    __tests__/
      drag.test.ts          # EXISTING
      shake.test.ts         # NEW: shake manager unit tests
  constants.ts              # ADD: shake-related constants
  types.ts                  # ADD: shake-related types
  main.ts                   # MODIFY: initialize shake, add gravity lerp to ticker
  ui/
    onboarding-hint.ts      # NEW: "Shake your phone!" hint overlay
```

### Pattern 1: Shake Manager Module
**What:** A self-contained module that listens to DeviceMotion events, applies smoothing, and updates engine gravity.
**When to use:** This is the core pattern for the entire phase -- one module owns the accelerometer-to-gravity pipeline.
**Example:**
```typescript
// Source: DeviceMotion API MDN docs + Matter.js gravity API
interface ShakeState {
  supported: boolean;
  permissionGranted: boolean;
  active: boolean;
  smoothedX: number;  // Exponentially smoothed accelerometer X
  smoothedY: number;  // Exponentially smoothed accelerometer Y
  lastMagnitude: number;
  lastEventTime: number;
}

// Exponential smoothing (low-pass filter)
const SMOOTHING_ALPHA = 0.3; // 0 = no smoothing, 1 = no filtering
function smooth(prev: number, raw: number): number {
  return prev + SMOOTHING_ALPHA * (raw - prev);
}

// Map smoothed accelerometer to Matter.js gravity
function handleMotion(event: DeviceMotionEvent, engine: Engine, mode: PhysicsMode): void {
  const accel = event.accelerationIncludingGravity;
  if (!accel || accel.x === null || accel.y === null) return;

  // Smooth raw sensor data
  state.smoothedX = smooth(state.smoothedX, accel.x);
  state.smoothedY = smooth(state.smoothedY, accel.y);

  // Map to gravity: device X -> gravity X, device Y inverted -> gravity Y
  // Phone in portrait: +X is right, +Y is up
  // Matter.js: +X is right, +Y is down
  const modeMultiplier = mode.name === 'goofy' ? 2.0 : 1.0;
  const baseScale = mode.gravity.scale;

  engine.gravity.x = state.smoothedX * modeMultiplier;
  engine.gravity.y = -state.smoothedY * modeMultiplier;  // Invert Y
  engine.gravity.scale = baseScale;
}
```

### Pattern 2: Gravity Lerp on Stop
**What:** When shaking stops (no significant motion detected), lerp gravity back to default downward over 300-500ms.
**When to use:** In the main ticker loop, every frame check if shake is inactive and interpolate gravity back.
**Example:**
```typescript
// In the ticker callback (main.ts), after physics-to-sprite sync
const GRAVITY_LERP_SPEED = 0.05; // per frame at 60fps, reaches ~95% in ~60 frames (~1s)

function lerpGravityToDefault(engine: Engine, mode: PhysicsMode, deltaMs: number): void {
  // Lerp factor adjusted for frame time (frame-rate independent)
  const t = 1 - Math.pow(1 - GRAVITY_LERP_SPEED, deltaMs / 16.67);

  engine.gravity.x += (mode.gravity.x - engine.gravity.x) * t;
  engine.gravity.y += (mode.gravity.y - engine.gravity.y) * t;
  engine.gravity.scale += (mode.gravity.scale - engine.gravity.scale) * t;
}
```

### Pattern 3: Feature Detection and Permission Flow
**What:** Detect DeviceMotion support, request permission on iOS if needed, show fallback button if unavailable.
**When to use:** At app initialization, before setting up the motion listener.
**Example:**
```typescript
// Source: MDN DeviceMotionEvent docs
async function initDeviceMotion(): Promise<'granted' | 'denied' | 'unsupported'> {
  // 1. Check if DeviceMotionEvent exists at all
  if (typeof DeviceMotionEvent === 'undefined') {
    return 'unsupported';
  }

  // 2. Check if permission request is needed (iOS Safari)
  if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
    try {
      const permission = await (DeviceMotionEvent as any).requestPermission();
      return permission; // 'granted' or 'denied'
    } catch {
      return 'denied';
    }
  }

  // 3. Android/other browsers: available by default over HTTPS
  return 'granted';
}
```

### Pattern 4: Hold-to-Shake Fallback Button
**What:** A button that applies random gravity bursts while held, simulating shake for non-motion users.
**When to use:** Only when DeviceMotion is unavailable or permission denied.
**Example:**
```typescript
// Press-and-hold applies continuous random gravity bursts
// Release stops and gravity lerps back to normal
function createShakeButton(): HTMLButtonElement {
  // Button uses pointerdown/pointerup for hold detection
  // During hold: every ~100ms, set random gravity direction with moderate scale
  // On release: set shake inactive, let gravity lerp handle return to normal
}
```

### Anti-Patterns to Avoid
- **Setting gravity directly without smoothing:** Raw accelerometer data is noisy. Without a low-pass filter, gravity will jitter wildly and ragdolls will vibrate instead of flowing.
- **Using `acceleration` instead of `accelerationIncludingGravity`:** The `acceleration` property (gravity-removed) returns null on devices without a gyroscope. Always use `accelerationIncludingGravity` for maximum compatibility.
- **Calling requestPermission on page load:** iOS requires this to be called from a user gesture (click/tap). Calling it outside a gesture handler silently fails or throws.
- **Forgetting to handle null axis values:** Even when `accelerationIncludingGravity` exists, individual `.x`, `.y`, `.z` values can be null on some devices. Always null-check each axis.
- **Hard-switching gravity instead of lerping on stop:** Snapping gravity from a wild shake back to (0, 1, 0.001) feels jarring. The lerp creates a smooth "settling" that matches the snow globe metaphor.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shake detection threshold | Custom shake event system with timers | Continuous gravity mapping from raw accelerometer | The "snow globe" model doesn't need discrete shake detection -- just map accelerometer to gravity continuously |
| Signal smoothing | FIR/IIR filter library | 2-line exponential moving average | EMA is the standard approach for real-time accelerometer smoothing; more complex filters add latency |
| Frame-rate independent lerp | Custom timer-based interpolation | `1 - Math.pow(1 - speed, dt / 16.67)` | Standard formula for frame-rate independent exponential decay; mathematically correct regardless of frame drops |

**Key insight:** The snow globe model eliminates the need for discrete "shake detection." Instead of detecting "is the user shaking?" and applying a force impulse, you continuously map the accelerometer to gravity direction. Shaking naturally produces rapid gravity changes that fling ragdolls around. This is simpler, more responsive, and more satisfying than threshold-based shake detection.

## Common Pitfalls

### Pitfall 1: Coordinate System Mismatch
**What goes wrong:** Ragdolls move opposite to the expected direction when tilting the phone.
**Why it happens:** DeviceMotion Y-axis points UP (positive = toward top of screen), but Matter.js Y-axis points DOWN (positive = downward). If you map device Y directly to gravity Y without inverting, tilting forward makes dolls fall upward.
**How to avoid:** Negate the device Y value: `engine.gravity.y = -accel.y`. Device X maps directly (both positive = right).
**Warning signs:** "Everything feels backwards" during testing.

### Pitfall 2: accelerationIncludingGravity Baseline Is Not Zero
**What goes wrong:** Ragdolls slowly slide to one side even when the phone is stationary.
**Why it happens:** When the phone is held upright in portrait, `accelerationIncludingGravity.y` is approximately -9.8 (gravity pulling down), not 0. If you map this directly, you get double gravity downward.
**How to avoid:** The baseline gravity from the accelerometer IS the desired effect for the snow globe model. A phone held upright gives (0, -9.8, 0) which maps to gravity pointing down -- correct! The key is calibrating the SCALE so that 9.8 m/s^2 maps to the default Matter.js gravity scale, and deviations from baseline create proportional gravity shifts.
**Warning signs:** Ragdolls are pinned to the floor with double gravity.

### Pitfall 3: Null Sensor Values on Cheap Devices
**What goes wrong:** App crashes or silently stops working on budget Android phones.
**Why it happens:** Some devices dispatch `devicemotion` events but with null values for acceleration axes, particularly devices without gyroscopes. The event fires but the data is useless.
**How to avoid:** Always null-check: `if (!accel || accel.x === null || accel.y === null) return;`. If values are consistently null after a few events, switch to fallback mode (show shake button).
**Warning signs:** Motion events fire but gravity never changes.

### Pitfall 4: HTTPS Required for DeviceMotion
**What goes wrong:** DeviceMotion events never fire during local development on a physical phone.
**Why it happens:** DeviceMotion API requires a secure context (HTTPS). Accessing `http://192.168.x.x:5173` from a phone won't trigger motion events.
**How to avoid:** Enable HTTPS in Vite dev server with `server: { https: true }` or use a tunneling tool. Note: `localhost` is treated as secure, but LAN IP addresses are not.
**Warning signs:** Works in desktop DevTools device emulation but not on real phones.

### Pitfall 5: Matter.js Sleep System Conflicts with Gravity Changes
**What goes wrong:** Ragdolls don't respond to gravity changes from shaking because they've fallen asleep.
**Why it happens:** Matter.js `enableSleeping: true` (set in engine.ts) puts bodies to sleep when they're stationary. Changing gravity doesn't wake them up -- only collisions, constraints, or `Body.setStatic(false)` wake sleeping bodies.
**How to avoid:** When shake is active (accelerometer magnitude exceeds threshold), wake all dynamic bodies: `for (const body of allBodies) { if (!body.isStatic) Sleeping.set(body, false); }`. Only wake bodies when shake input is significant, not every frame.
**Warning signs:** Ragdolls are frozen on the ground even though gravity is changing.

### Pitfall 6: requestPermission Must Be in User Gesture Handler
**What goes wrong:** iOS permission prompt never appears.
**Why it happens:** Safari requires `DeviceMotionEvent.requestPermission()` to be called directly from a user-initiated event handler (click, tap). Calling it from a timer, promise chain, or async function disconnected from the gesture fails silently.
**How to avoid:** Even though iOS permission UX is deferred, the initial permission request should still be triggered from a button click. The onboarding hint or a simple "Enable motion" tap can serve as this gesture. Keep the `requestPermission` call in the direct click handler, not in a nested async function.
**Warning signs:** Works on Android, never prompts on iOS.

## Code Examples

Verified patterns from official sources:

### DeviceMotion Event Listener Setup
```typescript
// Source: MDN DeviceMotionEvent docs
// https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event
window.addEventListener('devicemotion', (event: DeviceMotionEvent) => {
  const accel = event.accelerationIncludingGravity;
  if (!accel || accel.x === null || accel.y === null) return;

  // accel.x: left(-) to right(+) in m/s^2
  // accel.y: down(-) to up(+) in m/s^2
  // accel.z: back(-) to front(+) in m/s^2
  console.log(`x: ${accel.x}, y: ${accel.y}, z: ${accel.z}`);
});
```

### iOS Permission Request (Minimal)
```typescript
// Source: MDN DeviceMotionEvent.requestPermission()
// Even though iOS explainer is deferred, permission still needs requesting from gesture
async function requestMotionPermission(): Promise<boolean> {
  if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
    return true; // Not required (Android, desktop)
  }
  try {
    const result = await (DeviceMotionEvent as any).requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}
```

### Matter.js Gravity Manipulation
```typescript
// Source: Matter.js Engine docs (engine.gravity)
// https://brm.io/matter-js/docs/classes/Engine.html
// Gravity has x, y (direction) and scale (magnitude)
engine.gravity.x = 0;     // No horizontal gravity
engine.gravity.y = 1;     // Downward
engine.gravity.scale = 0.001; // Default realistic scale

// Snow globe: map accelerometer directly to gravity direction
// Accelerometer values are in m/s^2 (~9.8 at rest)
// Scale factor converts m/s^2 to Matter.js gravity units
const ACCEL_TO_GRAVITY = 0.001 / 9.8; // Normalize so rest = default scale
```

### Waking Sleeping Bodies
```typescript
// Source: Matter.js Sleeping module
import { Sleeping, Composite } from 'matter-js';

function wakeAllBodies(engine: Engine): void {
  const bodies = Composite.allBodies(engine.world);
  for (const body of bodies) {
    if (!body.isStatic && body.isSleeping) {
      Sleeping.set(body, false);
    }
  }
}
```

### Exponential Smoothing
```typescript
// Standard exponential moving average (EMA) for accelerometer data
// Alpha controls responsiveness: 0.2-0.4 is good for shake detection
// Lower = smoother but more lag, Higher = more responsive but more noise
const ALPHA = 0.3;

let smoothX = 0;
let smoothY = 0;

function updateSmoothed(rawX: number, rawY: number): void {
  smoothX = smoothX + ALPHA * (rawX - smoothX);
  smoothY = smoothY + ALPHA * (rawY - smoothY);
}
```

### Frame-Rate Independent Lerp
```typescript
// Standard exponential decay lerp that works regardless of frame rate
// At 60fps: reaches ~95% of target in about 50 frames (~830ms)
function expLerp(current: number, target: number, speed: number, deltaMs: number): number {
  const t = 1 - Math.pow(1 - speed, deltaMs / 16.67);
  return current + (target - current) * t;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DeviceMotion on HTTP | HTTPS only (secure context required) | Chrome 50+ (2016), baseline 2023 | Must serve over HTTPS for real device testing |
| No permission needed | iOS requires `requestPermission()` from gesture | iOS 13 (2019) | Must handle permission flow on iOS Safari |
| `acceleration` preferred | `accelerationIncludingGravity` as universal fallback | Always true, but more relevant as budget devices proliferate | `acceleration` returns null without gyroscope; use `accelerationIncludingGravity` |
| Chrome flag for requestPermission | Chrome shipping requestPermission behind flag (M105+) | 2023+ | Android Chrome may start requiring permission in future; feature-detect now |

**Deprecated/outdated:**
- `window.ondevicemotion` property syntax: Use `addEventListener` instead
- Non-secure context access: Deprecated in all major browsers

## Open Questions

1. **Gravity scale calibration**
   - What we know: accelerometer gives ~9.8 m/s^2 at rest; Matter.js default gravity scale is 0.001
   - What's unclear: The exact mapping factor that makes "gentle tilt = subtle shift" and "hard shake = chaos" feel right
   - Recommendation: Start with `ACCEL_TO_GRAVITY = mode.gravity.scale / 9.8` as baseline, tune through playtesting. The Goofy 2x multiplier applies on top.

2. **Shake detection threshold for body wake-up**
   - What we know: Need to wake sleeping bodies when shake is detected, but not every frame
   - What's unclear: What magnitude threshold differentiates "phone is being held still" from "phone is being shaken"
   - Recommendation: Use magnitude delta from baseline (~9.8): if `|magnitude - 9.8| > 2.0` (about 20% above resting), wake bodies. Tune through testing.

3. **Vite HTTPS for mobile testing**
   - What we know: DeviceMotion requires HTTPS; current Vite config has `server: { host: true }` but no HTTPS
   - What's unclear: Whether the dev will test on real devices or just use desktop DevTools emulation
   - Recommendation: Add `server: { https: true }` to vite.config.ts or document the requirement. Vite auto-generates self-signed certs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/input/__tests__/shake.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INPT-01 | Accelerometer data maps to gravity changes | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "gravity mapping"` | No -- Wave 0 |
| INPT-01 | Exponential smoothing filters noise | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "smoothing"` | No -- Wave 0 |
| INPT-01 | Goofy mode applies 2x force multiplier | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "goofy"` | No -- Wave 0 |
| INPT-01 | Gravity lerps back to default on stop | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "lerp"` | No -- Wave 0 |
| INPT-01 | Sleeping bodies wake on shake | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "wake"` | No -- Wave 0 |
| INPT-02 | iOS permission detected and requested from gesture | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "permission"` | No -- Wave 0 |
| INPT-03 | Shake button appears when motion unavailable | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "fallback"` | No -- Wave 0 |
| INPT-03 | Hold-to-shake applies random gravity bursts | unit | `npx vitest run src/input/__tests__/shake.test.ts -t "button"` | No -- Wave 0 |
| INPT-01 | End-to-end shake causes ragdoll movement | manual-only | Shake physical phone and observe | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run src/input/__tests__/shake.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/input/__tests__/shake.test.ts` -- covers INPT-01, INPT-02, INPT-03 unit tests
- [ ] Mock for DeviceMotionEvent in Vitest node environment (no real accelerometer in CI)

## Sources

### Primary (HIGH confidence)
- [MDN DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent) -- API properties, constructor, requestPermission, security requirements
- [MDN devicemotion event](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event) -- Event listener setup, frequency, code examples
- [MDN Detecting device orientation](https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Detecting_device_orientation) -- Coordinate system, axis orientation, accelerometer values
- [MDN accelerationIncludingGravity](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/accelerationIncludingGravity) -- Gravity inclusion, null values on devices without gyroscope
- [Matter.js Engine docs](https://brm.io/matter-js/docs/classes/Engine.html) -- engine.gravity.x/y/scale API
- [Can I Use: DeviceOrientation & DeviceMotion](https://caniuse.com/deviceorientation) -- 93%+ global browser support

### Secondary (MEDIUM confidence)
- [Chrome Platform Status: requestPermission](https://chromestatus.com/feature/5915984063889408) -- Chrome implementation behind flag since M105
- [DEV.to iOS requestPermission guide](https://dev.to/li/how-to-requestpermission-for-devicemotion-and-deviceorientation-events-in-ios-13-46g2) -- User gesture requirement, code pattern
- [Apple Developer Forums: requestPermission](https://developer.apple.com/forums/thread/734869) -- MobileSafari only, not WKWebView

### Tertiary (LOW confidence)
- [Medium: shake detection implementation](https://medium.com/@louistrinh/implementing-shake-detection-for-interactive-mobile-web-apps-javascript-4eb8c2393055) -- General shake detection approach (not directly applicable to snow globe model)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- DeviceMotion API is well-documented baseline web standard; Matter.js gravity API is simple and already used in project
- Architecture: HIGH -- Snow globe model maps cleanly to existing engine.gravity manipulation; module boundaries clear from existing codebase patterns
- Pitfalls: HIGH -- Coordinate inversion, null values, sleep system, HTTPS requirement, and iOS permission are all well-documented gotchas with clear solutions
- Smoothing/filtering: MEDIUM -- Alpha value (0.3) and lerp speed are recommendations that need playtesting tuning

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- DeviceMotion API is a finalized web standard)
