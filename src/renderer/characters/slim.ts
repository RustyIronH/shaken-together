import { GraphicsContext } from 'pixi.js';
import type { CharacterDefinition, CharacterPalette } from '../character-registry';
import { createFaceContexts } from '../faces';

const PALETTE: CharacterPalette = {
  primary: 0x2ecc71,    // Bright green
  secondary: 0x27ae60,  // Darker green
  outline: 0x1a7a42,    // Deep green outline
  skin: 0xfdebd0,       // Light skin tone
  highlight: 0x6bffaa,  // Bright green accent
  eye: 0x2c3e50,        // Dark eye color
};

const HEAD_RADIUS = 15;

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
 * "Slim" -- Tall & thin character.
 * Elongated proportions with narrow torso and long limbs.
 */
export function createSlimCharacter(): CharacterDefinition {
  const bodyParts = new Map<string, GraphicsContext>();

  // Head uses the neutral face expression context
  const faceExpressions = createFaceContexts(PALETTE, HEAD_RADIUS);
  bodyParts.set('head', faceExpressions.get('neutral')!);

  // Torso -- narrow and tall
  bodyParts.set('upperTorso', rect(32, 28, PALETTE.primary, PALETTE.outline));
  bodyParts.set('lowerTorso', rect(28, 22, PALETTE.secondary, PALETTE.outline));

  // Arms -- long and thin
  bodyParts.set('upperArmL', rect(9, 26, PALETTE.primary, PALETTE.outline));
  bodyParts.set('upperArmR', rect(9, 26, PALETTE.primary, PALETTE.outline));
  bodyParts.set('forearmL', rect(8, 24, PALETTE.secondary, PALETTE.outline));
  bodyParts.set('forearmR', rect(8, 24, PALETTE.secondary, PALETTE.outline));

  // Hands -- small circles
  bodyParts.set('handL', circle(5, PALETTE.highlight, PALETTE.outline));
  bodyParts.set('handR', circle(5, PALETTE.highlight, PALETTE.outline));

  // Legs -- long and thin
  bodyParts.set('upperLegL', rect(10, 30, PALETTE.primary, PALETTE.outline));
  bodyParts.set('upperLegR', rect(10, 30, PALETTE.primary, PALETTE.outline));
  bodyParts.set('lowerLegL', rect(9, 28, PALETTE.secondary, PALETTE.outline));
  bodyParts.set('lowerLegR', rect(9, 28, PALETTE.secondary, PALETTE.outline));

  // Feet -- small circles
  bodyParts.set('footL', circle(5, PALETTE.highlight, PALETTE.outline));
  bodyParts.set('footR', circle(5, PALETTE.highlight, PALETTE.outline));

  return {
    id: 'slim',
    name: 'Slim',
    bodyParts,
    faceExpressions,
    palette: PALETTE,
  };
}
