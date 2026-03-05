import { createPhysicsEngine, startEngine } from './physics/engine';
import { createScene, setDollCount, applyMode, resetScene } from './physics/world';
import { createPixiRenderer } from './renderer/pixi-renderer';
import type { PixiRenderer } from './renderer/pixi-renderer';
import { createRagdollSprite, destroyRagdollSprite } from './renderer/ragdoll-sprite';
import type { RagdollSprite } from './renderer/ragdoll-sprite';
import { ALL_CHARACTER_IDS } from './renderer/character-registry';
import { bringContainerToFront } from './renderer/colors';
import { setupMultiTouch } from './input/multi-touch';
import { createPanel } from './ui/panel';
import { createHamburger } from './ui/hamburger';
import type { SceneState, CharacterId } from './types';

/** Tracks character assignment index for no-duplicate cycling */
let characterCycleIndex = 0;

/**
 * Assigns a character ID cycling through ALL_CHARACTER_IDS
 * to avoid duplicates until all 4 are used.
 */
function nextCharacterId(): CharacterId {
  const id = ALL_CHARACTER_IDS[characterCycleIndex % ALL_CHARACTER_IDS.length];
  characterCycleIndex++;
  return id;
}

/**
 * Syncs the spriteMap to match the current scene ragdolls.
 * Creates sprites for new ragdolls, removes sprites for deleted ones.
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

  // Create sprites for new ragdolls
  for (const ragdoll of scene.ragdolls) {
    if (!spriteMap.has(ragdoll.id)) {
      const characterId = nextCharacterId();
      ragdoll.characterId = characterId;
      const sprite = createRagdollSprite(characterId, ragdoll.id);
      ragdollLayer.addChild(sprite.container);
      spriteMap.set(ragdoll.id, sprite);
    }
  }
}

(async () => {
  // 1. Create physics engine
  const engine = createPhysicsEngine();

  // 2. Create PixiJS renderer (replaces old canvas in the DOM)
  const renderer = await createPixiRenderer();

  // 3. Create scene using PixiJS screen dimensions (CSS pixels with autoDensity)
  const scene = createScene(engine, renderer.app.screen.width, renderer.app.screen.height);

  // 4. Create sprite map and initial sprites
  const spriteMap = new Map<string, RagdollSprite>();
  for (const ragdoll of scene.ragdolls) {
    const characterId = nextCharacterId();
    ragdoll.characterId = characterId;
    const sprite = createRagdollSprite(characterId, ragdoll.id);
    renderer.ragdollLayer.addChild(sprite.container);
    spriteMap.set(ragdoll.id, sprite);
  }

  // 5. Set up multi-touch drag on the new PixiJS canvas
  setupMultiTouch(renderer.app.canvas as HTMLCanvasElement, engine, scene);

  // 6. Get UI root for panel/hamburger
  const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

  // 7. Create UI controls
  const panel = createPanel(uiRoot, {
    onDollCountChange: (count) => {
      setDollCount(engine, scene, count, renderer.app.screen.width, renderer.app.screen.height);
      syncSprites(scene, spriteMap, renderer.ragdollLayer);
    },
    onModeChange: (mode) => {
      applyMode(engine, scene, mode);
    },
    onReset: () => {
      resetScene(engine, scene, renderer.app.screen.width, renderer.app.screen.height);
      // No sprite sync needed -- positions are updated by the ticker
    },
  });

  createHamburger(uiRoot, () => panel.toggle());

  // 8. Start physics engine (fixed timestep via Matter.Runner)
  startEngine(engine);

  // 9. Track which ragdoll IDs are currently being dragged (for z-order)
  const lastDraggedIds = new Set<string>();

  // 10. Ticker callback: physics-to-sprite sync + drag feedback + z-order
  renderer.app.ticker.add(() => {
    // Build set of currently dragged ragdoll IDs
    const currentDraggedIds = new Set<string>();
    for (const drag of scene.activeDrags.values()) {
      currentDraggedIds.add(drag.ragdollId);
    }

    // Physics-to-sprite position sync
    for (const ragdoll of scene.ragdolls) {
      const sprite = spriteMap.get(ragdoll.id);
      if (!sprite) continue;

      for (const [label, body] of ragdoll.bodies) {
        const graphic = sprite.parts.get(label);
        if (!graphic) continue;

        graphic.position.set(body.position.x, body.position.y);
        graphic.rotation = body.angle;
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
  });
})();
