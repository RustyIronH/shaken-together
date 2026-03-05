import { describe, it, expect, beforeEach } from 'vitest';
import { Engine, Composite } from 'matter-js';
import { createPhysicsEngine } from '../engine';
import { createScene, addRagdoll, removeRagdoll, setDollCount, resetScene } from '../world';
import { _resetAngleLimitsState } from '../constraints';
import {
  DEFAULT_DOLL_COUNT,
  MIN_DOLL_COUNT,
  MAX_DOLL_COUNT,
} from '../../constants';
import type { SceneState } from '../../types';

const TEST_WIDTH = 800;
const TEST_HEIGHT = 600;

describe('World Management', () => {
  let engine: Engine;
  let scene: SceneState;

  beforeEach(() => {
    _resetAngleLimitsState();
    engine = createPhysicsEngine();
    scene = createScene(engine, TEST_WIDTH, TEST_HEIGHT);
  });

  describe('boundaries', () => {
    it('creates 4 static boundary walls', () => {
      const allBodies = Composite.allBodies(engine.world);
      const staticBodies = allBodies.filter(b => b.isStatic);
      expect(staticBodies.length).toBe(4);
    });

    it('boundary walls have soft cushion restitution', () => {
      const allBodies = Composite.allBodies(engine.world);
      const staticBodies = allBodies.filter(b => b.isStatic);
      for (const wall of staticBodies) {
        expect(wall.restitution).toBe(0.5);
      }
    });
  });

  describe('gravity and collision', () => {
    it('applies gravity to non-static bodies', () => {
      const allBodies = Composite.allBodies(engine.world);
      const dynamicBodies = allBodies.filter(b => !b.isStatic);
      expect(dynamicBodies.length).toBeGreaterThan(0);

      // Record initial positions
      const initialY = dynamicBodies[0].position.y;

      // Run a few physics steps
      for (let i = 0; i < 10; i++) {
        Engine.update(engine, 16.67);
      }

      // Body should have moved down due to gravity
      expect(dynamicBodies[0].position.y).toBeGreaterThan(initialY);
    });

    it('bodies from different ragdolls collide with each other', () => {
      // Different ragdolls should have different collision groups
      expect(scene.ragdolls.length).toBeGreaterThanOrEqual(2);
      const group1 = scene.ragdolls[0].bodies.get('head')!.collisionFilter.group;
      const group2 = scene.ragdolls[1].bodies.get('head')!.collisionFilter.group;
      // Different negative groups => they DO collide with each other
      expect(group1).not.toBe(group2);
      // Both should be negative (self-collision disabled)
      expect(group1).toBeLessThan(0);
      expect(group2).toBeLessThan(0);
    });

    it('bodies within same ragdoll do NOT collide (collision group)', () => {
      const ragdoll = scene.ragdolls[0];
      const groups = Array.from(ragdoll.bodies.values()).map(b => b.collisionFilter.group);
      const uniqueGroups = new Set(groups);
      // All bodies in same ragdoll share same negative group
      expect(uniqueGroups.size).toBe(1);
      expect(groups[0]).toBeLessThan(0);
    });
  });

  describe('doll count', () => {
    it('creates DEFAULT_DOLL_COUNT ragdolls initially', () => {
      expect(scene.ragdolls.length).toBe(DEFAULT_DOLL_COUNT);
    });

    it('adds ragdolls up to specified count', () => {
      setDollCount(engine, scene, 5, TEST_WIDTH, TEST_HEIGHT);
      expect(scene.ragdolls.length).toBe(5);
    });

    it('removes ragdolls when count decreases', () => {
      setDollCount(engine, scene, 2, TEST_WIDTH, TEST_HEIGHT);
      expect(scene.ragdolls.length).toBe(2);
    });

    it('preserves existing ragdoll positions when adding new ones', () => {
      const firstDollHeadPos = {
        x: scene.ragdolls[0].bodies.get('head')!.position.x,
        y: scene.ragdolls[0].bodies.get('head')!.position.y,
      };

      setDollCount(engine, scene, 5, TEST_WIDTH, TEST_HEIGHT);

      // First doll's position should be unchanged
      const afterHead = scene.ragdolls[0].bodies.get('head')!;
      expect(afterHead.position.x).toBe(firstDollHeadPos.x);
      expect(afterHead.position.y).toBe(firstDollHeadPos.y);
    });

    it('respects min count of 2 and max count of 5', () => {
      setDollCount(engine, scene, 0, TEST_WIDTH, TEST_HEIGHT);
      expect(scene.ragdolls.length).toBe(MIN_DOLL_COUNT);

      setDollCount(engine, scene, 100, TEST_WIDTH, TEST_HEIGHT);
      expect(scene.ragdolls.length).toBe(MAX_DOLL_COUNT);
    });
  });

  describe('add/remove ragdoll', () => {
    it('addRagdoll increases body count by 15', () => {
      const beforeCount = Composite.allBodies(engine.world).filter(b => !b.isStatic).length;
      addRagdoll(engine, scene, TEST_WIDTH, TEST_HEIGHT);
      const afterCount = Composite.allBodies(engine.world).filter(b => !b.isStatic).length;
      expect(afterCount - beforeCount).toBe(15);
    });

    it('removeRagdoll decreases body count by 15', () => {
      const beforeCount = Composite.allBodies(engine.world).filter(b => !b.isStatic).length;
      removeRagdoll(engine, scene);
      const afterCount = Composite.allBodies(engine.world).filter(b => !b.isStatic).length;
      expect(beforeCount - afterCount).toBe(15);
    });
  });

  describe('reset', () => {
    it('repositions all ragdolls to random positions', () => {
      // Run some physics to move dolls
      for (let i = 0; i < 20; i++) {
        Engine.update(engine, 16.67);
      }

      // Record positions before reset
      const positionsBefore = scene.ragdolls.map(r => ({
        x: r.bodies.get('head')!.position.x,
        y: r.bodies.get('head')!.position.y,
      }));

      resetScene(engine, scene, TEST_WIDTH, TEST_HEIGHT);

      // At least one ragdoll should have moved (random repositioning)
      const positionsAfter = scene.ragdolls.map(r => ({
        x: r.bodies.get('head')!.position.x,
        y: r.bodies.get('head')!.position.y,
      }));

      // Check that positions have changed (probabilistic, but with multiple dolls very likely)
      let anyMoved = false;
      for (let i = 0; i < positionsBefore.length; i++) {
        if (
          Math.abs(positionsAfter[i].x - positionsBefore[i].x) > 1 ||
          Math.abs(positionsAfter[i].y - positionsBefore[i].y) > 1
        ) {
          anyMoved = true;
          break;
        }
      }
      expect(anyMoved).toBe(true);
    });

    it('sets all body velocities to zero after reset', () => {
      // Run physics to give bodies velocity
      for (let i = 0; i < 20; i++) {
        Engine.update(engine, 16.67);
      }

      resetScene(engine, scene, TEST_WIDTH, TEST_HEIGHT);

      for (const ragdoll of scene.ragdolls) {
        for (const body of ragdoll.bodies.values()) {
          expect(body.velocity.x).toBeCloseTo(0, 5);
          expect(body.velocity.y).toBeCloseTo(0, 5);
        }
      }
    });

    it('sets all angular velocities to zero after reset', () => {
      // Run physics to give bodies angular velocity
      for (let i = 0; i < 20; i++) {
        Engine.update(engine, 16.67);
      }

      resetScene(engine, scene, TEST_WIDTH, TEST_HEIGHT);

      for (const ragdoll of scene.ragdolls) {
        for (const body of ragdoll.bodies.values()) {
          expect(body.angularVelocity).toBeCloseTo(0, 5);
        }
      }
    });
  });
});
