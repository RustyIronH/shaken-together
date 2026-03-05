import { Engine, Runner, Events, Body, Composite } from 'matter-js';
import {
  REALISTIC_MODE,
  CONSTRAINT_ITERATIONS,
  POSITION_ITERATIONS,
  VELOCITY_ITERATIONS,
  FIXED_TIMESTEP,
  MAX_VELOCITY,
} from '../constants';

/**
 * Creates a Matter.js physics engine with project-specific settings.
 * Gravity defaults to REALISTIC_MODE.
 */
export function createPhysicsEngine(): Engine {
  const engine = Engine.create({
    constraintIterations: CONSTRAINT_ITERATIONS,
    enableSleeping: true,
    positionIterations: POSITION_ITERATIONS,
    velocityIterations: VELOCITY_ITERATIONS,
  });

  engine.gravity.x = REALISTIC_MODE.gravity.x;
  engine.gravity.y = REALISTIC_MODE.gravity.y;
  engine.gravity.scale = REALISTIC_MODE.gravity.scale;

  // Cap body velocities to prevent tunneling through walls (pitfall #2)
  Events.on(engine, 'beforeUpdate', () => {
    const bodies = Composite.allBodies(engine.world);
    for (const body of bodies) {
      if (body.isStatic) continue;
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > MAX_VELOCITY) {
        const scale = MAX_VELOCITY / speed;
        Body.setVelocity(body, {
          x: vx * scale,
          y: vy * scale,
        });
      }
    }
  });

  return engine;
}

/**
 * Starts the physics engine with a fixed timestep runner.
 */
export function startEngine(engine: Engine): Runner {
  const runner = Runner.create({
    delta: FIXED_TIMESTEP,
    isFixed: true,
  });
  Runner.run(runner, engine);
  return runner;
}

/**
 * Stops the physics runner.
 */
export function stopEngine(runner: Runner): void {
  Runner.stop(runner);
}
