import { Container, Graphics } from 'pixi.js';
import type { CharacterId } from '../types';
import { getCharacter } from './character-registry';

/** A renderable ragdoll: Container with 15 Graphics children */
export interface RagdollSprite {
  container: Container;
  parts: Map<string, Graphics>;
  headGraphic: Graphics;
  characterId: CharacterId;
  ragdollId: string;
}

/**
 * Draw order for body parts (back to front).
 * Left legs behind torso, torso in middle, arms in front, head on top.
 */
const DRAW_ORDER = [
  'footL', 'lowerLegL', 'upperLegL',
  'footR', 'lowerLegR', 'upperLegR',
  'lowerTorso', 'upperTorso',
  'handL', 'forearmL', 'upperArmL',
  'handR', 'forearmR', 'upperArmR',
  'head',
] as const;

/**
 * Creates a RagdollSprite from a character definition.
 *
 * Builds a Container with exactly 15 Graphics children in correct draw order.
 * Each Graphics uses a shared GraphicsContext from the character definition,
 * so multiple ragdolls of the same character share GPU geometry.
 */
export function createRagdollSprite(
  characterId: CharacterId,
  ragdollId: string,
): RagdollSprite {
  const character = getCharacter(characterId);

  const container = new Container({ label: 'ragdoll-' + ragdollId });
  const parts = new Map<string, Graphics>();

  // Create Graphics for each body part in draw order
  for (const label of DRAW_ORDER) {
    const context = character.bodyParts.get(label);
    if (!context) {
      throw new Error(`Character "${characterId}" missing body part: ${label}`);
    }
    const graphic = new Graphics(context);
    graphic.label = label;
    container.addChild(graphic);
    parts.set(label, graphic);
  }

  // Head uses the neutral face expression
  const headGraphic = parts.get('head')!;
  headGraphic.context = character.faceExpressions.get('neutral')!;

  return {
    container,
    parts,
    headGraphic,
    characterId,
    ragdollId,
  };
}

/**
 * Swaps the visual appearance of a ragdoll sprite to a different character.
 *
 * Replaces all Graphics contexts in-place. The Container structure, positions,
 * and rotations are preserved -- only the visual shapes change. This enables
 * hot-swapping character skins without removing/re-adding to the scene.
 */
export function swapCharacterSkin(
  sprite: RagdollSprite,
  newCharacterId: CharacterId,
): void {
  const character = getCharacter(newCharacterId);

  // Swap body part contexts
  for (const [label, graphic] of sprite.parts) {
    const newContext = character.bodyParts.get(label);
    if (newContext) {
      graphic.context = newContext;
    }
  }

  // Swap head to neutral face of new character
  sprite.headGraphic.context = character.faceExpressions.get('neutral')!;

  // Update the character reference
  sprite.characterId = newCharacterId;
}

/**
 * Destroys a ragdoll sprite, cleaning up Graphics objects.
 *
 * Destroys the individual Graphics objects and the container.
 * Does NOT destroy shared GraphicsContexts (they belong to the character registry
 * and may be used by other ragdoll sprites).
 */
export function destroyRagdollSprite(sprite: RagdollSprite): void {
  // Destroy each Graphics (but not its shared context)
  for (const graphic of sprite.parts.values()) {
    graphic.destroy();
  }

  // Destroy the container and any remaining children
  sprite.container.destroy({ children: true });
}
