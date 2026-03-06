# Phase 3: Device Input - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Shake detection via DeviceMotion API that applies physics forces to ragdolls, with a fallback for users without motion access. Users shake their phone and ragdolls respond naturally to the direction and intensity of the motion. Users without DeviceMotion get a hold-to-shake button. iOS permission flow is deferred to a later pass.

</domain>

<decisions>
## Implementation Decisions

### Shake-to-force mapping
- Snow globe model: device motion shifts gravity direction — tilt left and everything slides left, shake hard and dolls fly around inside the box
- Proportional intensity: gentle shake = gentle gravity shift, hard shake = violent fling. Linear mapping from accelerometer magnitude to gravity scale
- Goofy mode amplifies shake response (~2x force multiplier) — consistent with Goofy's existing wilder physics personality
- Quick settle on stop: gravity lerps back to normal downward over ~300-500ms when shaking stops. Smooth, not jarring

### Non-motion fallback
- Hold-to-shake button: press and hold to apply continuous random gravity bursts, release to stop
- Fallback only: button only appears when DeviceMotion is unavailable or permission denied. Phone users with motion access see no button (maximum play area)
- Existing touch/drag from Phase 1 remains as the baseline interaction for all users

### Shake feedback
- Ragdoll motion is the feedback — no extra UI elements (intensity meters, screen shake). Clean and immersive
- Existing Phase 2 effects (impact flashes, speed lines, face expressions) trigger on shake-caused collisions the same as drag-caused ones — no special treatment needed, collision events handle this naturally
- Subtle onboarding hint: "Shake your phone!" text appears briefly on first load, fades after a few seconds or after first shake detected

### Claude's Discretion
- Accelerometer smoothing/filtering approach
- Exact gravity scale mapping curve
- Shake button visual design and placement
- Onboarding hint styling and animation
- DeviceMotion availability detection approach
- Gravity lerp easing function

</decisions>

<specifics>
## Specific Ideas

- Snow globe feel carries through from Phase 1 — the enclosed box boundaries + gravity shift = shaking a container with dolls inside
- The proportional intensity rewards vigorous shaking — the harder you shake, the more satisfying the chaos
- Goofy mode + hard shake should produce maximum insanity — dolls bouncing off every wall
- iOS permission flow explicitly deferred — will be handled in a future pass (user requested "worry about iOS later")

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/physics/engine.ts`: Engine gravity (`engine.gravity.x/y/scale`) — direct manipulation point for snow globe shake
- `src/input/drag-manager.ts`: `screenToWorld()`, velocity tracking, fling mechanics — established input patterns
- `src/input/multi-touch.ts`: Pointer event setup on canvas — integration point for coexisting with shake
- `src/constants.ts`: `REALISTIC_MODE`/`GOOFY_MODE` gravity configs — shake force scaling derives from these

### Established Patterns
- Physics-render separation: Matter.Runner (fixed timestep) vs requestAnimationFrame (display refresh) — shake input feeds into physics, not rendering
- Mode parameters in constants.ts with type in types.ts — shake config follows same pattern
- Effects trigger via `Events.on(engine, 'collisionStart')` in main.ts — no changes needed for shake-caused collisions
- UI controls in slide-out panel (`src/ui/panel.ts`) — shake button placement follows same pattern if needed

### Integration Points
- `engine.gravity.x` / `engine.gravity.y` in `src/physics/engine.ts` — primary manipulation point for shake forces
- `src/main.ts` game loop — shake module initialization and gravity lerp updates go here
- `src/ui/panel.ts` or new UI element — shake button for fallback users
- `src/constants.ts` — shake-related constants (thresholds, scale factors, lerp speed)

</code_context>

<deferred>
## Deferred Ideas

- iOS DeviceMotion permission flow with pre-permission explainer — user requested deferral ("worry about iOS later")

</deferred>

---

*Phase: 03-device-input*
*Context gathered: 2026-03-06*
