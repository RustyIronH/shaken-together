import { Bodies, Body, Composite, Engine } from 'matter-js';
import type { PhysicsMode, SceneState, RagdollInstance, DollSize, CharacterId } from '../types';
import {
  REALISTIC_MODE,
  BOUNDARY_THICKNESS,
  DEFAULT_DOLL_COUNT,
  MIN_DOLL_COUNT,
  MAX_DOLL_COUNT,
  DOLL_COLOR_SCHEMES,
  CHARACTER_IDS,
} from '../constants';
import { createRagdoll } from './ragdoll';
import { registerAngleLimits, unregisterAngleLimits, updateAngleLimitsForMode } from './constraints';

/** Cycle index for color schemes */
let colorIndex = 0;

/** Cycle of size variants for variety */
const SIZE_CYCLE: DollSize[] = ['medium', 'small', 'large'];
let sizeIndex = 0;

/** Cycle index for character assignment (no-duplicates-until-all-used) */
let characterIndex = 0;

/**
 * Creates 4 static boundary walls (snow globe containment).
 */
function createBoundaries(width: number, height: number): Body[] {
  const t = BOUNDARY_THICKNESS;
  const options = {
    isStatic: true,
    render: { visible: false },
    label: 'boundary',
  };

  const walls = [
    // Top wall
    Bodies.rectangle(width / 2, -t / 2, width + t * 2, t, options),
    // Bottom wall
    Bodies.rectangle(width / 2, height + t / 2, width + t * 2, t, options),
    // Left wall
    Bodies.rectangle(-t / 2, height / 2, t, height, options),
    // Right wall
    Bodies.rectangle(width + t / 2, height / 2, t, height, options),
  ];

  // Matter.js ignores restitution/friction in options for static bodies,
  // so set them explicitly after creation
  for (const wall of walls) {
    wall.restitution = 0.5;  // Soft cushion bounce
    wall.friction = 0.3;
  }

  return walls;
}

/**
 * Generates a random position within boundaries, leaving margin for ragdoll size.
 */
function randomPosition(width: number, height: number): { x: number; y: number } {
  const margin = 80; // Leave room for ragdoll body parts
  const x = margin + Math.random() * (width - margin * 2);
  const y = margin + Math.random() * (height - margin * 2);
  return { x, y };
}

/**
 * Creates a new scene with boundaries and DEFAULT_DOLL_COUNT ragdolls.
 */
export function createScene(engine: Engine, width: number, height: number): SceneState {
  // Create boundaries
  const walls = createBoundaries(width, height);
  Composite.add(engine.world, walls);

  // Initialize scene state
  const scene: SceneState = {
    ragdolls: [],
    dollCount: 0,
    currentMode: REALISTIC_MODE,
    activeDrags: new Map(),
  };

  // Reset color/size/character cycling
  colorIndex = 0;
  sizeIndex = 0;
  characterIndex = 0;

  // Add default number of ragdolls
  setDollCount(engine, scene, DEFAULT_DOLL_COUNT, width, height);

  return scene;
}

/**
 * Adds a ragdoll to the scene at a random position.
 */
export function addRagdoll(
  engine: Engine,
  scene: SceneState,
  width: number,
  height: number,
): RagdollInstance {
  // Pick next color scheme and size
  const colorScheme = DOLL_COLOR_SCHEMES[colorIndex % DOLL_COLOR_SCHEMES.length];
  colorIndex++;
  const size = SIZE_CYCLE[sizeIndex % SIZE_CYCLE.length];
  sizeIndex++;

  // Pick next character (no-duplicates-until-all-used)
  const usedCharacters = new Set(scene.ragdolls.map(r => r.characterId));
  let chosenCharacterId: CharacterId;

  if (usedCharacters.size < CHARACTER_IDS.length) {
    // Find next available character by cycling, skipping already-used IDs
    let attempts = 0;
    let idx = characterIndex % CHARACTER_IDS.length;
    while (usedCharacters.has(CHARACTER_IDS[idx]) && attempts < CHARACTER_IDS.length) {
      idx = (idx + 1) % CHARACTER_IDS.length;
      attempts++;
    }
    chosenCharacterId = CHARACTER_IDS[idx];
  } else {
    // All 4 used (5th doll) -- allow repeat by cycling
    chosenCharacterId = CHARACTER_IDS[characterIndex % CHARACTER_IDS.length];
  }
  characterIndex++;

  // Random position within boundaries
  const pos = randomPosition(width, height);

  // Create and add ragdoll
  const ragdoll = createRagdoll(pos.x, pos.y, size, colorScheme);
  ragdoll.characterId = chosenCharacterId;
  Composite.add(engine.world, ragdoll.composite);
  registerAngleLimits(engine, ragdoll);
  scene.ragdolls.push(ragdoll);

  return ragdoll;
}

/**
 * Removes the last-added ragdoll from the scene.
 */
export function removeRagdoll(engine: Engine, scene: SceneState): void {
  if (scene.ragdolls.length === 0) return;

  const ragdoll = scene.ragdolls.pop()!;
  Composite.remove(engine.world, ragdoll.composite);
  unregisterAngleLimits(ragdoll.id);
}

/**
 * Sets the doll count, adding or removing ragdolls as needed.
 * Clamps to [MIN_DOLL_COUNT, MAX_DOLL_COUNT].
 * Existing ragdoll positions are preserved.
 */
export function setDollCount(
  engine: Engine,
  scene: SceneState,
  count: number,
  width: number,
  height: number,
): void {
  // Clamp
  const targetCount = Math.max(MIN_DOLL_COUNT, Math.min(MAX_DOLL_COUNT, count));

  // Add ragdolls if needed
  while (scene.ragdolls.length < targetCount) {
    addRagdoll(engine, scene, width, height);
  }

  // Remove ragdolls if needed
  while (scene.ragdolls.length > targetCount) {
    removeRagdoll(engine, scene);
  }

  scene.dollCount = targetCount;
}

/**
 * Resets the scene by teleporting all ragdolls to new random positions
 * with zero velocity and angular velocity.
 */
export function resetScene(
  _engine: Engine,
  scene: SceneState,
  width: number,
  height: number,
): void {
  for (const ragdoll of scene.ragdolls) {
    const newPos = randomPosition(width, height);

    // Calculate offset from the first body's position (use head as reference)
    const headBody = ragdoll.bodies.get('head');
    if (!headBody) continue;

    const offsetX = newPos.x - headBody.position.x;
    const offsetY = newPos.y - headBody.position.y;

    // Teleport all bodies maintaining their relative positions
    for (const body of ragdoll.bodies.values()) {
      Body.setPosition(body, {
        x: body.position.x + offsetX,
        y: body.position.y + offsetY,
      });
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
      Body.setAngle(body, 0);
    }
  }
}

/**
 * Applies a physics mode to the engine and all bodies/constraints.
 * Does NOT reset positions or velocities (live switch).
 */
export function applyMode(engine: Engine, scene: SceneState, mode: PhysicsMode): void {
  // Update gravity
  engine.gravity.x = mode.gravity.x;
  engine.gravity.y = mode.gravity.y;
  engine.gravity.scale = mode.gravity.scale;

  // Update all joint constraints
  const allConstraints = Composite.allConstraints(engine.world);
  for (const c of allConstraints) {
    if (c.label?.startsWith('joint_')) {
      c.stiffness = mode.constraintStiffness;
      c.damping = mode.constraintDamping;
    }
  }

  // Update all dynamic body properties
  const allBodies = Composite.allBodies(engine.world);
  for (const b of allBodies) {
    if (!b.isStatic) {
      b.restitution = mode.bodyRestitution;
      b.friction = mode.bodyFriction;
    }
  }

  // Update angle limits
  updateAngleLimitsForMode(mode);

  // Update scene state
  scene.currentMode = mode;
}

/**
 * Returns character IDs not currently in use by any ragdoll in the scene.
 * If all are used (e.g. 4+ dolls with 4 characters), returns the full list
 * to allow repeats for the 5th doll.
 */
export function getAvailableCharacters(scene: SceneState): CharacterId[] {
  const usedCharacters = new Set(scene.ragdolls.map(r => r.characterId));
  const available = CHARACTER_IDS.filter(id => !usedCharacters.has(id));
  return available.length > 0 ? available : [...CHARACTER_IDS];
}
