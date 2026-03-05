import { createPhysicsEngine, startEngine } from './physics/engine';
import { createScene, setDollCount, applyMode, resetScene } from './physics/world';
import { createDebugRenderer, renderFrame, resizeCanvas } from './renderer/debug-renderer';
import { setupMultiTouch } from './input/multi-touch';
import { createPanel } from './ui/panel';
import { createHamburger } from './ui/hamburger';

// 1. Get DOM elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

// 2. Size canvas to viewport
resizeCanvas(canvas);
window.addEventListener('resize', () => {
  resizeCanvas(canvas);
});

// 3. Create physics engine
const engine = createPhysicsEngine();

// 4. Create scene (boundaries + default ragdolls)
const scene = createScene(engine, canvas.width, canvas.height);

// 5. Set up debug renderer
const { ctx } = createDebugRenderer(canvas);

// 6. Set up multi-touch drag
setupMultiTouch(canvas, engine, scene);

// 7. Create UI controls
const panel = createPanel(uiRoot, {
  onDollCountChange: (count) => {
    setDollCount(engine, scene, count, canvas.width, canvas.height);
  },
  onModeChange: (mode) => {
    applyMode(engine, scene, mode);
  },
  onReset: () => {
    resetScene(engine, scene, canvas.width, canvas.height);
  },
});

createHamburger(uiRoot, () => panel.toggle());

// 8. Start physics engine (fixed timestep via Matter.Runner)
startEngine(engine);

// 9. Render loop (separate from physics -- physics runs via Runner)
function gameLoop(): void {
  renderFrame(ctx, engine, scene);
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
