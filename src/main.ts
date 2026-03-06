import { Bodies, Composite, Events, Runner } from 'matter-js';
import { createPhysicsEngine, startEngine, stopEngine } from './physics/engine';
import { createScene, setDollCount, applyMode, resetScene } from './physics/world';
import { createPixiRenderer } from './renderer/pixi-renderer';
import type { PixiRenderer } from './renderer/pixi-renderer';
import { createRagdollSprite, destroyRagdollSprite, swapCharacterSkin } from './renderer/ragdoll-sprite';
import type { RagdollSprite } from './renderer/ragdoll-sprite';
import { getCharacter } from './renderer/character-registry';
import type { FaceExpression } from './renderer/character-registry';
import { bringContainerToFront } from './renderer/colors';
import { setupMultiTouch } from './input/multi-touch';
import { initShake, updateGravityLerp, getShakeState, requestMotionPermission } from './input/shake-manager';
import { prepareForCapture, captureScreenshots } from './capture/screenshot';
import { createReplayBuffer, pushFrame, getOrderedFrames } from './capture/replay-buffer';
import { encodeReplayGif } from './capture/gif-encoder';
import { createCaptureButton, disableCaptureButton, enableCaptureButton } from './ui/capture-button';
import { showCaptureOverlay } from './ui/capture-overlay';
import { showOnboardingHint } from './ui/onboarding-hint';
import { createPanel } from './ui/panel';
import { createHamburger } from './ui/hamburger';
import { applySquashStretch } from './renderer/effects/squash-stretch';
import { createSpeedLinePool, updateSpeedLines } from './renderer/effects/speed-lines';
import { createImpactFlashPool, spawnImpactFlash, updateImpactFlashes } from './renderer/effects/impact-flash';
import { BOUNDARY_THICKNESS } from './constants';
import type { SceneState, CharacterId } from './types';

/**
 * Syncs the spriteMap to match the current scene ragdolls.
 * Creates sprites for new ragdolls (using their world-assigned characterId),
 * removes sprites for deleted ones.
 */
function syncSprites(
  scene: SceneState,
  spriteMap: Map<string, RagdollSprite>,
  ragdollLayer: PixiRenderer['ragdollLayer'],
): void {
  // Find ragdoll IDs currently in the scene
  const sceneIds = new Set(scene.ragdolls.map((r) => r.id));

  // Remove sprites for ragdolls no longer in the scene
  for (const [id, sprite] of spriteMap) {
    if (!sceneIds.has(id)) {
      ragdollLayer.removeChild(sprite.container);
      destroyRagdollSprite(sprite);
      spriteMap.delete(id);
    }
  }

  // Create sprites for new ragdolls (characterId assigned by world.ts)
  for (const ragdoll of scene.ragdolls) {
    if (!spriteMap.has(ragdoll.id)) {
      const sprite = createRagdollSprite(ragdoll.characterId, ragdoll.id);
      ragdollLayer.addChild(sprite.container);
      spriteMap.set(ragdoll.id, sprite);
    }
  }
}

/**
 * Recreates the 4 boundary walls to match current screen dimensions.
 * Removes all existing static boundary bodies and adds new ones.
 */
function updateBoundaries(engine: import('matter-js').Engine, width: number, height: number): void {
  // Remove existing boundary bodies
  const allBodies = Composite.allBodies(engine.world);
  for (const body of allBodies) {
    if (body.label === 'boundary') {
      Composite.remove(engine.world, body);
    }
  }

  // Create new boundaries matching new dimensions
  const t = BOUNDARY_THICKNESS;
  const options = {
    isStatic: true,
    render: { visible: false },
    label: 'boundary',
  };

  const walls = [
    Bodies.rectangle(width / 2, -t / 2, width + t * 2, t, options),
    Bodies.rectangle(width / 2, height + t / 2, width + t * 2, t, options),
    Bodies.rectangle(-t / 2, height / 2, t, height, options),
    Bodies.rectangle(width + t / 2, height / 2, t, height, options),
  ];

  for (const wall of walls) {
    wall.restitution = 0.5;
    wall.friction = 0.3;
  }

  Composite.add(engine.world, walls);
}

(async () => {
  // 1. Create physics engine
  const engine = createPhysicsEngine();

  // 2. Create PixiJS renderer (replaces old canvas in the DOM)
  const renderer = await createPixiRenderer();

  // 2b. Create replay buffer at quarter resolution for performance (~180px wide on most devices)
  const GIF_RESOLUTION = 0.25;
  const gifWidth = Math.round(renderer.app.screen.width * GIF_RESOLUTION);
  const gifHeight = Math.round(renderer.app.screen.height * GIF_RESOLUTION);
  const replayBuffer = createReplayBuffer(gifWidth, gifHeight);

  // 3. Create scene using PixiJS screen dimensions (CSS pixels with autoDensity)
  const scene = createScene(engine, renderer.app.screen.width, renderer.app.screen.height);

  // 4. Create sprite map and initial sprites (characterId already assigned by world.ts)
  const spriteMap = new Map<string, RagdollSprite>();
  for (const ragdoll of scene.ragdolls) {
    const sprite = createRagdollSprite(ragdoll.characterId, ragdoll.id);
    renderer.ragdollLayer.addChild(sprite.container);
    spriteMap.set(ragdoll.id, sprite);
  }

  // 5. Set up multi-touch drag on the new PixiJS canvas
  setupMultiTouch(renderer.app.canvas as HTMLCanvasElement, engine, scene);

  // 6. Ensure touch-action: none on the canvas for mobile
  (renderer.app.canvas as HTMLCanvasElement).style.touchAction = 'none';

  // 7. Get UI root for panel/hamburger
  const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

  // 8. Create UI controls with character change callback
  const panel = createPanel(
    uiRoot,
    {
      onDollCountChange: (count) => {
        setDollCount(engine, scene, count, renderer.app.screen.width, renderer.app.screen.height);
        syncSprites(scene, spriteMap, renderer.ragdollLayer);
        panel.updateCharacterSelectors();
      },
      onModeChange: (mode) => {
        applyMode(engine, scene, mode);
      },
      onReset: () => {
        resetScene(engine, scene, renderer.app.screen.width, renderer.app.screen.height);
        // No sprite sync needed -- positions are updated by the ticker
      },
      onCharacterChange: (dollIndex: number, characterId: CharacterId) => {
        const ragdoll = scene.ragdolls[dollIndex];
        if (!ragdoll) return;

        // Check if another doll already has this character (swap behavior)
        const otherIndex = scene.ragdolls.findIndex(
          (r, i) => i !== dollIndex && r.characterId === characterId,
        );

        if (otherIndex !== -1) {
          // Swap: the other doll gets the current doll's old character
          const otherRagdoll = scene.ragdolls[otherIndex];
          const oldCharacterId = ragdoll.characterId;

          // Update the other doll
          otherRagdoll.characterId = oldCharacterId;
          const otherSprite = spriteMap.get(otherRagdoll.id);
          if (otherSprite) {
            swapCharacterSkin(otherSprite, oldCharacterId);
          }
        }

        // Update the selected doll
        ragdoll.characterId = characterId;
        const sprite = spriteMap.get(ragdoll.id);
        if (sprite) {
          swapCharacterSkin(sprite, characterId);
        }
      },
    },
    () => scene,
  );

  // Initialize character selectors now that scene has ragdolls
  panel.updateCharacterSelectors();

  createHamburger(uiRoot, () => panel.toggle());

  // 9. Start physics engine (fixed timestep via Matter.Runner)
  const runner = startEngine(engine);

  // 9b. Initialize shake detection (DeviceMotion -> gravity mapping)
  // On Android/desktop this adds the listener immediately.
  // On iOS, requestPermission may fail silently without a user gesture -- that's OK,
  // the fallback button handles those users.
  const shakeResult = await initShake(engine, scene);

  // 9c. iOS motion permission: show a one-time button to request access
  if (shakeResult === 'prompt') {
    const permBtn = document.createElement('button');
    permBtn.textContent = 'Tap to Enable Motion';
    permBtn.id = 'motion-permission-button';
    Object.assign(permBtn.style, {
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      padding: '14px 28px', fontSize: '16px', fontWeight: '600',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#fff', background: 'rgba(80, 120, 255, 0.85)',
      border: 'none', borderRadius: '24px', cursor: 'pointer',
      zIndex: '200', touchAction: 'manipulation',
    });
    document.body.appendChild(permBtn);
    permBtn.addEventListener('click', async () => {
      await requestMotionPermission();
      permBtn.remove();
    });
  }

  // 9d. Onboarding hint
  const onboardingHint = showOnboardingHint(uiRoot, false);
  let hintDismissed = false;

  // 9e. Capture button: always visible, triggers freeze -> capture -> preview flow
  const captureBtn = createCaptureButton(() => {
    // 1. Stop replay recording immediately (before physics freeze)
    replayBuffer.recording = false;

    // 2. Freeze physics
    stopEngine(runner);

    // 3. Prepare: clear drags, reset sprite scales
    prepareForCapture(scene, spriteMap);

    // 4. Capture screenshot variants
    const images = captureScreenshots(renderer.app, renderer.effectsLayer);

    // 5. Get last buffer frame as clip placeholder (data URL for static preview)
    const orderedFrames = getOrderedFrames(replayBuffer);
    let clipPlaceholder: string | null = null;
    if (orderedFrames.length > 0) {
      const lastFrame = orderedFrames[orderedFrames.length - 1];
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = replayBuffer.width;
      tempCanvas.height = replayBuffer.height;
      const ctx = tempCanvas.getContext('2d')!;
      const imageData = new ImageData(
        new Uint8ClampedArray(lastFrame.buffer as ArrayBuffer),
        replayBuffer.width,
        replayBuffer.height,
      );
      ctx.putImageData(imageData, 0, 0);
      clipPlaceholder = tempCanvas.toDataURL('image/png');
    }

    // 6. Disable capture button during preview
    disableCaptureButton(captureBtn);

    // 7. Show overlay with new data shape
    const overlayHandle = showCaptureOverlay(
      uiRoot,
      { images, clipPlaceholder },
      {
        onDismiss: () => {
          Runner.run(runner, engine);
          enableCaptureButton(captureBtn);
          replayBuffer.recording = true;
        },
      },
    );

    // 8. Start async GIF encoding (non-blocking)
    if (orderedFrames.length > 0) {
      setTimeout(() => {
        const gifBlob = encodeReplayGif(
          orderedFrames,
          replayBuffer.width,
          replayBuffer.height,
        );
        overlayHandle.setGifBlob(gifBlob);
      }, 0);
    }
  });
  uiRoot.appendChild(captureBtn);

  // 10. Responsive resize: update physics boundaries on window resize
  // PixiJS handles canvas resize via resizeTo: window, but physics boundaries
  // must also update to match the new screen dimensions.
  window.addEventListener('resize', () => {
    const w = renderer.app.screen.width;
    const h = renderer.app.screen.height;
    updateBoundaries(engine, w, h);
  });

  // 11. Create effect pools
  const flashPool = createImpactFlashPool(renderer.effectsLayer, 8);
  const speedLinePool = createSpeedLinePool(renderer.effectsLayer, 20);

  // 12. Face expression state: ragdollId -> { expression, timer }
  const faceStates = new Map<string, { expression: FaceExpression; timer: number }>();

  /**
   * Finds which ragdoll owns a body by checking all ragdoll body maps.
   */
  function findRagdollIdForBody(bodyId: number): string | null {
    for (const ragdoll of scene.ragdolls) {
      for (const b of ragdoll.bodies.values()) {
        if (b.id === bodyId) return ragdoll.id;
      }
    }
    return null;
  }

  /**
   * Sets a ragdoll's face expression with a timer.
   * The ticker will revert to 'neutral' when the timer expires.
   */
  function setFaceExpression(ragdollId: string, expression: FaceExpression, durationMs: number): void {
    const sprite = spriteMap.get(ragdollId);
    if (!sprite) return;

    const ragdoll = scene.ragdolls.find((r) => r.id === ragdollId);
    if (!ragdoll) return;

    const character = getCharacter(ragdoll.characterId);
    const ctx = character.faceExpressions.get(expression);
    if (ctx) {
      sprite.headGraphic.context = ctx;
    }

    faceStates.set(ragdollId, { expression, timer: durationMs });
  }

  // 13. Collision event handler: impact flashes + face expressions
  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      // Calculate impact force from relative velocity (not pair.normalImpulse -- unreliable)
      const relVelX = pair.bodyA.velocity.x - pair.bodyB.velocity.x;
      const relVelY = pair.bodyA.velocity.y - pair.bodyB.velocity.y;
      const force = Math.sqrt(relVelX * relVelX + relVelY * relVelY);

      if (force <= 3) continue;

      // Spawn impact flash at collision midpoint
      const cx = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
      const cy = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;
      spawnImpactFlash(flashPool, cx, cy, force);

      // Face expressions on hard impacts
      if (force > 5) {
        const ragdollIdA = findRagdollIdForBody(pair.bodyA.id);
        const ragdollIdB = findRagdollIdForBody(pair.bodyB.id);

        const expression: FaceExpression = force > 10 ? 'dazed' : 'surprised';
        const duration = force > 10 ? 1500 : 800;

        if (ragdollIdA) setFaceExpression(ragdollIdA, expression, duration);
        if (ragdollIdB) setFaceExpression(ragdollIdB, expression, duration);
      }
    }
  });

  // 14. Track which ragdoll IDs are currently being dragged (for z-order)
  const lastDraggedIds = new Set<string>();

  // 15. Replay frame capture on separate interval (not in ticker — GPU readback blocks render)
  setInterval(() => {
    if (!replayBuffer.recording) return;
    try {
      const canvas = renderer.app.renderer.extract.canvas({
        target: renderer.app.stage,
        resolution: GIF_RESOLUTION,
      });
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        pushFrame(replayBuffer, new Uint8ClampedArray(imgData.data));
      }
    } catch {
      // Silently skip frame if extract fails (e.g., during resize)
    }
  }, 200); // 5fps

  // 16. Ticker callback: physics-to-sprite sync + effects + drag feedback + z-order
  renderer.app.ticker.add((ticker) => {
    const deltaMs = ticker.deltaMS;

    // Build set of currently dragged ragdoll IDs
    const currentDraggedIds = new Set<string>();
    for (const drag of scene.activeDrags.values()) {
      currentDraggedIds.add(drag.ragdollId);
    }

    // Physics-to-sprite position sync + squash-stretch
    for (const ragdoll of scene.ragdolls) {
      const sprite = spriteMap.get(ragdoll.id);
      if (!sprite) continue;

      for (const [label, body] of ragdoll.bodies) {
        const graphic = sprite.parts.get(label);
        if (!graphic) continue;

        graphic.position.set(body.position.x, body.position.y);
        graphic.rotation = body.angle;

        // Apply squash-and-stretch deformation based on velocity
        applySquashStretch(graphic, body);
      }

      // Drag feedback: 5% scale-up on grabbed ragdoll
      if (currentDraggedIds.has(ragdoll.id)) {
        sprite.container.scale.set(1.05);
      } else {
        sprite.container.scale.set(1.0);
      }
    }

    // Z-order: bring newly-dragged ragdolls to front
    for (const draggedId of currentDraggedIds) {
      if (!lastDraggedIds.has(draggedId)) {
        const sprite = spriteMap.get(draggedId);
        if (sprite) {
          bringContainerToFront(renderer.ragdollLayer, sprite.container);
        }
      }
    }

    // Update tracking set
    lastDraggedIds.clear();
    for (const id of currentDraggedIds) {
      lastDraggedIds.add(id);
    }

    // Update speed lines
    updateSpeedLines(speedLinePool, scene.ragdolls, spriteMap);

    // Update impact flash lifetimes and alpha
    updateImpactFlashes(flashPool, deltaMs);

    // Update face expression timers
    for (const [ragdollId, state] of faceStates) {
      state.timer -= deltaMs;
      if (state.timer <= 0) {
        // Revert to neutral
        const sprite = spriteMap.get(ragdollId);
        const ragdoll = scene.ragdolls.find((r) => r.id === ragdollId);
        if (sprite && ragdoll) {
          const character = getCharacter(ragdoll.characterId);
          const neutralCtx = character.faceExpressions.get('neutral');
          if (neutralCtx) {
            sprite.headGraphic.context = neutralCtx;
          }
        }
        faceStates.delete(ragdollId);
      }
    }

    // Replay frame capture moved to setInterval outside ticker to avoid blocking render

    // Gravity lerp: return to default when shake stops
    // Uses scene.currentMode (not a captured reference) so it follows mode switches
    updateGravityLerp(engine, scene.currentMode, deltaMs);

    // Dismiss onboarding hint on first shake detection
    if (!hintDismissed && getShakeState().active) {
      onboardingHint.dismiss();
      hintDismissed = true;
    }
  });
})();
