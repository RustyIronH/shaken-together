import { GraphicsContext } from 'pixi.js';
import type { CharacterDefinition, CharacterPalette } from '../character-registry';
import { createFaceContexts } from '../faces';

const PALETTE: CharacterPalette = {
  primary: 0xe74c3c,    // Bold red
  secondary: 0xc0392b,  // Darker red
  outline: 0x922b21,    // Deep red outline
  skin: 0xfdebd0,       // Light skin tone
  highlight: 0xff6b6b,  // Bright red accent
  eye: 0x2c3e50,        // Dark eye color
};

const HEAD_RADIUS = 16;

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
 * "Buff" -- Muscular character.
 * Broad shoulders, narrow waist, thick arms.
 */
export function createBuffCharacter(): CharacterDefinition {
  const bodyParts = new Map<string, GraphicsContext>();

  // Head uses the neutral face expression context
  const faceExpressions = createFaceContexts(PALETTE, HEAD_RADIUS);
  bodyParts.set('head', faceExpressions.get('neutral')!);

  // Torso -- very wide shoulders, narrower waist
  bodyParts.set('upperTorso', rect(52, 30, PALETTE.primary, PALETTE.outline));
  bodyParts.set('lowerTorso', rect(36, 24, PALETTE.secondary, PALETTE.outline));

  // Arms -- thick upper arms, thick forearms
  bodyParts.set('upperArmL', rect(18, 24, PALETTE.primary, PALETTE.outline));
  bodyParts.set('upperArmR', rect(18, 24, PALETTE.primary, PALETTE.outline));
  bodyParts.set('forearmL', rect(14, 22, PALETTE.secondary, PALETTE.outline));
  bodyParts.set('forearmR', rect(14, 22, PALETTE.secondary, PALETTE.outline));

  // Hands -- big
  bodyParts.set('handL', circle(8, PALETTE.highlight, PALETTE.outline));
  bodyParts.set('handR', circle(8, PALETTE.highlight, PALETTE.outline));

  // Legs -- normal width
  bodyParts.set('upperLegL', rect(14, 28, PALETTE.primary, PALETTE.outline));
  bodyParts.set('upperLegR', rect(14, 28, PALETTE.primary, PALETTE.outline));
  bodyParts.set('lowerLegL', rect(13, 26, PALETTE.secondary, PALETTE.outline));
  bodyParts.set('lowerLegR', rect(13, 26, PALETTE.secondary, PALETTE.outline));

  // Feet -- normal
  bodyParts.set('footL', circle(7, PALETTE.highlight, PALETTE.outline));
  bodyParts.set('footR', circle(7, PALETTE.highlight, PALETTE.outline));

  return {
    id: 'buff',
    name: 'Buff',
    bodyParts,
    faceExpressions,
    palette: PALETTE,
  };
}
