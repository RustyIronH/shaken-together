import { describe, it, expect, beforeEach } from 'vitest';
import { Engine, Composite } from 'matter-js';
import { createPhysicsEngine } from '../engine';
import { createScene, applyMode } from '../world';
import { _resetAngleLimitsState } from '../constraints';
import { REALISTIC_MODE, GOOFY_MODE } from '../../constants';
import type { SceneState } from '../../types';

const TEST_WIDTH = 800;
const TEST_HEIGHT = 600;

describe('Physics Mode Switching', () => {
  let engine: Engine;
  let scene: SceneState;

  beforeEach(() => {
    _resetAngleLimitsState();
    engine = createPhysicsEngine();
    scene = createScene(engine, TEST_WIDTH, TEST_HEIGHT);
  });

  describe('mode switch', () => {
    it('applies realistic mode gravity scale', () => {
      applyMode(engine, scene, REALISTIC_MODE);
      expect(engine.gravity.scale).toBe(REALISTIC_MODE.gravity.scale);
    });

    it('applies goofy mode gravity scale (reduced)', () => {
      applyMode(engine, scene, GOOFY_MODE);
      expect(engine.gravity.scale).toBe(GOOFY_MODE.gravity.scale);
      expect(GOOFY_MODE.gravity.scale).toBeLessThan(REALISTIC_MODE.gravity.scale);
    });

    it('updates constraint stiffness on mode switch', () => {
      applyMode(engine, scene, GOOFY_MODE);

      const allConstraints = Composite.allConstraints(engine.world);
      const jointConstraints = allConstraints.filter(c => c.label?.startsWith('joint_'));
      expect(jointConstraints.length).toBeGreaterThan(0);

      for (const c of jointConstraints) {
        expect(c.stiffness).toBe(GOOFY_MODE.constraintStiffness);
      }
    });

    it('updates constraint damping on mode switch', () => {
      applyMode(engine, scene, GOOFY_MODE);

      const allConstraints = Composite.allConstraints(engine.world);
      const jointConstraints = allConstraints.filter(c => c.label?.startsWith('joint_'));

      for (const c of jointConstraints) {
        expect(c.damping).toBe(GOOFY_MODE.constraintDamping);
      }
    });

    it('updates body restitution on mode switch', () => {
      applyMode(engine, scene, GOOFY_MODE);

      const allBodies = Composite.allBodies(engine.world);
      const dynamicBodies = allBodies.filter(b => !b.isStatic);

      for (const b of dynamicBodies) {
        expect(b.restitution).toBe(GOOFY_MODE.bodyRestitution);
      }
    });

    it('updates body friction on mode switch', () => {
      applyMode(engine, scene, GOOFY_MODE);

      const allBodies = Composite.allBodies(engine.world);
      const dynamicBodies = allBodies.filter(b => !b.isStatic);

      for (const b of dynamicBodies) {
        expect(b.friction).toBe(GOOFY_MODE.bodyFriction);
      }
    });

    it('does not reset scene on mode switch', () => {
      // Run physics to move bodies
      for (let i = 0; i < 10; i++) {
        Engine.update(engine, 16.67);
      }

      // Record positions before mode switch
      const positionsBefore = scene.ragdolls.map(r => ({
        x: r.bodies.get('head')!.position.x,
        y: r.bodies.get('head')!.position.y,
      }));

      applyMode(engine, scene, GOOFY_MODE);

      // Positions should be unchanged
      for (let i = 0; i < scene.ragdolls.length; i++) {
        const head = scene.ragdolls[i].bodies.get('head')!;
        expect(head.position.x).toBe(positionsBefore[i].x);
        expect(head.position.y).toBe(positionsBefore[i].y);
      }
    });

    it('updates scene currentMode', () => {
      applyMode(engine, scene, GOOFY_MODE);
      expect(scene.currentMode.name).toBe('goofy');

      applyMode(engine, scene, REALISTIC_MODE);
      expect(scene.currentMode.name).toBe('realistic');
    });
  });
});
