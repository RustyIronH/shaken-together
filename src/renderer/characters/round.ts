import { GraphicsContext } from 'pixi.js';
import type { CharacterDefinition, CharacterPalette } from '../character-registry';
import { createFaceContexts } from '../faces';

const PALETTE: CharacterPalette = {
  primary: 0xf39c12,    // Warm orange
  secondary: 0xe67e22,  // Darker orange
  outline: 0xb35c00,    // Deep orange outline
  skin: 0xfdebd0,       // Light skin tone
  highlight: 0xffc56b,  // Bright yellow accent
  eye: 0x2c3e50,        // Dark eye color
};

const HEAD_RADIUS = 20;

/**
 * Creates a rectangle GraphicsContext centered at (0,0).
 */
function rect(w: number, h: number, fill: number, outline: number): GraphicsContext {
  return new GraphicsContext()
    .rect(-w / 2, -h / 2, w, h)
    .fill(fill)
    .rect(-w / 2, -h / 2, w, h)
    .stroke({ width: 2.5, color: outline });
}

/**
 * Creates a circle GraphicsContext centered at (0,0).
 */
function circle(r: number, fill: number, outline: number): GraphicsContext {
  return new GraphicsContext()
    .circle(0, 0, r)
    .fill(fill)
    .circle(0, 0, r)
    .stroke({ width: 2.5, color: outline });
}

/**
 * "Round" -- Short & round character.
 * Wide proportions with big head and stubby limbs.
 */
export function createRoundCharacter(): CharacterDefinition {
  const bodyParts = new Map<string, GraphicsContext>();

  // Head uses the neutral face expression context (big head)
  const faceExpressions = createFaceContexts(PALETTE, HEAD_RADIUS);
  bodyParts.set('head', faceExpressions.get('neutral')!);

  // Torso -- wide and short
  bodyParts.set('upperTorso', rect(48, 24, PALETTE.primary, PALETTE.outline));
  bodyParts.set('lowerTorso', rect(44, 20, PALETTE.secondary, PALETTE.outline));

  // Arms -- short and stubby
  bodyParts.set('upperArmL', rect(14, 20, PALETTE.primary, PALETTE.outline));
  bodyParts.set('upperArmR', rect(14, 20, PALETTE.primary, PALETTE.outline));
  bodyParts.set('forearmL', rect(14, 18, PALETTE.secondary, PALETTE.outline));
  bodyParts.set('forearmR', rect(14, 18, PALETTE.secondary, PALETTE.outline));

  // Hands -- round
  bodyParts.set('handL', circle(7, PALETTE.highlight, PALETTE.outline));
  bodyParts.set('handR', circle(7, PALETTE.highlight, PALETTE.outline));

  // Legs -- short and stubby
  bodyParts.set('upperLegL', rect(16, 22, PALETTE.primary, PALETTE.outline));
  bodyParts.set('upperLegR', rect(16, 22, PALETTE.primary, PALETTE.outline));
  bodyParts.set('lowerLegL', rect(15, 20, PALETTE.secondary, PALETTE.outline));
  bodyParts.set('lowerLegR', rect(15, 20, PALETTE.secondary, PALETTE.outline));

  // Feet -- round
  bodyParts.set('footL', circle(7, PALETTE.highlight, PALETTE.outline));
  bodyParts.set('footR', circle(7, PALETTE.highlight, PALETTE.outline));

  return {
    id: 'round',
    name: 'Round',
    bodyParts,
    faceExpressions,
    palette: PALETTE,
  };
}
