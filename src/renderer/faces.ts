import { GraphicsContext } from 'pixi.js';
import type { CharacterPalette, FaceExpression } from './character-registry';

/**
 * Creates face expression GraphicsContexts for a character.
 * Each expression is drawn centered at (0,0) so position sync
 * works directly with Matter.js body.position.
 *
 * Returns a Map of 3 expressions: neutral, surprised, dazed.
 */
export function createFaceContexts(
  palette: CharacterPalette,
  headRadius: number,
): Map<FaceExpression, GraphicsContext> {
  const expressions = new Map<FaceExpression, GraphicsContext>();

  // Eye positioning relative to head center
  const eyeSpacing = headRadius * 0.35;
  const eyeY = -headRadius * 0.1;
  const eyeRadius = headRadius * 0.12;

  // --- NEUTRAL ---
  const neutral = new GraphicsContext()
    // Head circle
    .circle(0, 0, headRadius)
    .fill(palette.skin)
    .circle(0, 0, headRadius)
    .stroke({ width: 3, color: palette.outline })
    // Left eye
    .circle(-eyeSpacing, eyeY, eyeRadius)
    .fill(palette.eye)
    // Right eye
    .circle(eyeSpacing, eyeY, eyeRadius)
    .fill(palette.eye);

  // Small smile (arc approximation using a short line with moveTo/lineTo)
  // Draw a subtle curved-up mouth
  const mouthY = headRadius * 0.3;
  const mouthWidth = headRadius * 0.3;
  neutral
    .moveTo(-mouthWidth, mouthY)
    .quadraticCurveTo(0, mouthY + headRadius * 0.15, mouthWidth, mouthY)
    .stroke({ width: 2, color: palette.outline });

  expressions.set('neutral', neutral);

  // --- SURPRISED ---
  const surprised = new GraphicsContext()
    // Head circle
    .circle(0, 0, headRadius)
    .fill(palette.skin)
    .circle(0, 0, headRadius)
    .stroke({ width: 3, color: palette.outline })
    // Larger eyes (1.5x)
    .circle(-eyeSpacing, eyeY, eyeRadius * 1.5)
    .fill(palette.eye)
    .circle(eyeSpacing, eyeY, eyeRadius * 1.5)
    .fill(palette.eye)
    // Open mouth (O shape)
    .circle(0, mouthY, headRadius * 0.15)
    .stroke({ width: 2, color: palette.outline });

  expressions.set('surprised', surprised);

  // --- DAZED ---
  const dazed = new GraphicsContext()
    // Head circle
    .circle(0, 0, headRadius)
    .fill(palette.skin)
    .circle(0, 0, headRadius)
    .stroke({ width: 3, color: palette.outline });

  // X eyes (two crossed lines each)
  const xSize = eyeRadius * 1.2;
  // Left X
  dazed
    .moveTo(-eyeSpacing - xSize, eyeY - xSize)
    .lineTo(-eyeSpacing + xSize, eyeY + xSize)
    .stroke({ width: 2, color: palette.eye })
    .moveTo(-eyeSpacing + xSize, eyeY - xSize)
    .lineTo(-eyeSpacing - xSize, eyeY + xSize)
    .stroke({ width: 2, color: palette.eye });
  // Right X
  dazed
    .moveTo(eyeSpacing - xSize, eyeY - xSize)
    .lineTo(eyeSpacing + xSize, eyeY + xSize)
    .stroke({ width: 2, color: palette.eye })
    .moveTo(eyeSpacing + xSize, eyeY - xSize)
    .lineTo(eyeSpacing - xSize, eyeY + xSize)
    .stroke({ width: 2, color: palette.eye });

  // Wavy/zigzag mouth
  const zigzagWidth = headRadius * 0.35;
  const zigzagAmp = headRadius * 0.08;
  const segments = 4;
  const segWidth = (zigzagWidth * 2) / segments;
  dazed.moveTo(-zigzagWidth, mouthY);
  for (let i = 0; i < segments; i++) {
    const xPos = -zigzagWidth + segWidth * (i + 1);
    const yPos = mouthY + (i % 2 === 0 ? -zigzagAmp : zigzagAmp);
    dazed.lineTo(xPos, yPos);
  }
  dazed.stroke({ width: 2, color: palette.outline });

  expressions.set('dazed', dazed);

  return expressions;
}
