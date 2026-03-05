import { GraphicsContext } from 'pixi.js';
import type { CharacterDefinition, CharacterPalette } from '../character-registry';
import { createFaceContexts } from '../faces';

const PALETTE: CharacterPalette = {
  primary: 0x9b59b6,    // Purple
  secondary: 0x8e44ad,  // Darker purple
  outline: 0x6c3483,    // Deep purple outline
  skin: 0xfdebd0,       // Light skin tone
  highlight: 0xc76bff,  // Bright purple accent
  eye: 0x2c3e50,        // Dark eye color
};

const HEAD_RADIUS = 18;

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
 * "Tiny" -- Small character with disproportionately large head.
 * Everything small except the big head.
 */
export function createTinyCharacter(): CharacterDefinition {
  const bodyParts = new Map<string, GraphicsContext>();

  // Head uses the neutral face expression context (disproportionately large)
  const faceExpressions = createFaceContexts(PALETTE, HEAD_RADIUS);
  bodyParts.set('head', faceExpressions.get('neutral')!);

  // Torso -- small
  bodyParts.set('upperTorso', rect(28, 20, PALETTE.primary, PALETTE.outline));
  bodyParts.set('lowerTorso', rect(24, 16, PALETTE.secondary, PALETTE.outline));

  // Arms -- very short and thin
  bodyParts.set('upperArmL', rect(8, 18, PALETTE.primary, PALETTE.outline));
  bodyParts.set('upperArmR', rect(8, 18, PALETTE.primary, PALETTE.outline));
  bodyParts.set('forearmL', rect(8, 16, PALETTE.secondary, PALETTE.outline));
  bodyParts.set('forearmR', rect(8, 16, PALETTE.secondary, PALETTE.outline));

  // Hands -- tiny
  bodyParts.set('handL', circle(4, PALETTE.highlight, PALETTE.outline));
  bodyParts.set('handR', circle(4, PALETTE.highlight, PALETTE.outline));

  // Legs -- very short and thin
  bodyParts.set('upperLegL', rect(8, 20, PALETTE.primary, PALETTE.outline));
  bodyParts.set('upperLegR', rect(8, 20, PALETTE.primary, PALETTE.outline));
  bodyParts.set('lowerLegL', rect(8, 18, PALETTE.secondary, PALETTE.outline));
  bodyParts.set('lowerLegR', rect(8, 18, PALETTE.secondary, PALETTE.outline));

  // Feet -- tiny
  bodyParts.set('footL', circle(4, PALETTE.highlight, PALETTE.outline));
  bodyParts.set('footR', circle(4, PALETTE.highlight, PALETTE.outline));

  return {
    id: 'tiny',
    name: 'Tiny',
    bodyParts,
    faceExpressions,
    palette: PALETTE,
  };
}
