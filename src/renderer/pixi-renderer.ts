import { Application, Container, Graphics } from 'pixi.js';

/** Layer hierarchy exposed by the PixiJS renderer */
export interface PixiRenderer {
  app: Application;
  backgroundLayer: Container;
  ragdollLayer: Container;
  effectsLayer: Container;
}

// Gradient color endpoints (matching existing constants)
const TOP_COLOR = { r: 0x1a, g: 0x1a, b: 0x2e };
const BOTTOM_COLOR = { r: 0x16, g: 0x21, b: 0x3e };
const GRADIENT_STEPS = 32;

/**
 * Creates the gradient background Graphics using horizontal strips
 * with interpolated colors from top to bottom.
 */
function createGradientBackground(width: number, height: number): Graphics {
  const bg = new Graphics();
  bg.label = 'gradient-bg';

  for (let i = 0; i < GRADIENT_STEPS; i++) {
    const t = i / (GRADIENT_STEPS - 1);
    const r = Math.round(TOP_COLOR.r + (BOTTOM_COLOR.r - TOP_COLOR.r) * t);
    const g = Math.round(TOP_COLOR.g + (BOTTOM_COLOR.g - TOP_COLOR.g) * t);
    const b = Math.round(TOP_COLOR.b + (BOTTOM_COLOR.b - TOP_COLOR.b) * t);
    const color = (r << 16) | (g << 8) | b;
    const y = (height / GRADIENT_STEPS) * i;
    const h = height / GRADIENT_STEPS + 1; // +1 to prevent subpixel gaps
    bg.rect(0, y, width, h).fill(color);
  }

  return bg;
}

/**
 * Rebuilds the gradient background at new dimensions.
 * Call on window resize.
 */
export function rebuildBackground(renderer: PixiRenderer): void {
  const { backgroundLayer, app } = renderer;

  // Remove old gradient
  backgroundLayer.removeChildren();

  // Create new gradient at current dimensions
  const width = app.screen.width;
  const height = app.screen.height;
  const bg = createGradientBackground(width, height);
  backgroundLayer.addChild(bg);
}

/**
 * Creates the PixiJS Application with WebGL rendering, proper resolution,
 * and a 3-layer container hierarchy (background, ragdolls, effects).
 */
export async function createPixiRenderer(): Promise<PixiRenderer> {
  const app = new Application();

  await app.init({
    resizeTo: window,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    preference: 'webgl',
  });

  // Replace the existing canvas element
  const oldCanvas = document.getElementById('game-canvas');
  if (oldCanvas) {
    oldCanvas.replaceWith(app.canvas);
  }
  app.canvas.id = 'game-canvas';
  app.canvas.style.touchAction = 'none';

  // Create 3-layer hierarchy
  const backgroundLayer = new Container({ label: 'background' });
  const ragdollLayer = new Container({ label: 'ragdolls' });
  const effectsLayer = new Container({ label: 'effects' });

  app.stage.addChild(backgroundLayer, ragdollLayer, effectsLayer);

  const renderer: PixiRenderer = {
    app,
    backgroundLayer,
    ragdollLayer,
    effectsLayer,
  };

  // Create initial gradient background
  rebuildBackground(renderer);

  // Rebuild gradient on window resize
  window.addEventListener('resize', () => {
    rebuildBackground(renderer);
  });

  return renderer;
}
