import { describe, it, expect, beforeEach } from 'vitest';
import { Engine, Composite, Body } from 'matter-js';
import { createRagdoll } from '../ragdoll';
import { createPhysicsEngine } from '../engine';
import { registerAngleLimits, updateAngleLimitsForMode, enforceAngleLimits, _resetAngleLimitsState } from '../constraints';
import { DOLL_COLOR_SCHEMES, GOOFY_MODE, REALISTIC_MODE, RAGDOLL_PARTS, RAGDOLL_JOINTS, SIZE_SCALES } from '../../constants';
import type { RagdollInstance } from '../../types';

describe('Ragdoll Factory', () => {
  let ragdoll: RagdollInstance;

  beforeEach(() => {
    ragdoll = createRagdoll(400, 300, 'medium', DOLL_COLOR_SCHEMES[0]);
  });

  describe('creates ragdoll', () => {
    it('creates a composite with exactly 15 bodies', () => {
      const bodies = Composite.allBodies(ragdoll.composite);
      expect(bodies.length).toBe(15);
    });

    it('creates a composite with exactly 14 constraints', () => {
      const constraints = Composite.allConstraints(ragdoll.composite);
      expect(constraints.length).toBe(14);
    });

    it('sets negative collision group to prevent self-collision', () => {
      const bodies = Composite.allBodies(ragdoll.composite);
      const groups = bodies.map(b => b.collisionFilter.group);
      // All should share the same negative group
      const uniqueGroups = new Set(groups);
      expect(uniqueGroups.size).toBe(1);
      const group = groups[0];
      expect(group).toBeLessThan(0);
    });

    it('applies correct color scheme to body render properties', () => {
      const scheme = DOLL_COLOR_SCHEMES[0];
      const head = ragdoll.bodies.get('head');
      expect(head).toBeDefined();
      expect(head!.render.fillStyle).toBe(scheme.head);

      const upperTorso = ragdoll.bodies.get('upperTorso');
      expect(upperTorso).toBeDefined();
      expect(upperTorso!.render.fillStyle).toBe(scheme.primary);

      const handL = ragdoll.bodies.get('handL');
      expect(handL).toBeDefined();
      expect(handL!.render.fillStyle).toBe(scheme.highlight);
    });

    it('positions body parts in anatomically correct relative positions', () => {
      // Head should be above torso (lower Y)
      const head = ragdoll.bodies.get('head')!;
      const upperTorso = ragdoll.bodies.get('upperTorso')!;
      expect(head.position.y).toBeLessThan(upperTorso.position.y);

      // Upper torso above lower torso
      const lowerTorso = ragdoll.bodies.get('lowerTorso')!;
      expect(upperTorso.position.y).toBeLessThan(lowerTorso.position.y);

      // Upper legs below lower torso
      const upperLegL = ragdoll.bodies.get('upperLegL')!;
      expect(upperLegL.position.y).toBeGreaterThan(lowerTorso.position.y);
    });

    it('uses circle shape for head and hands', () => {
      const head = ragdoll.bodies.get('head')!;
      expect(head.circleRadius).toBeGreaterThan(0);

      const handL = ragdoll.bodies.get('handL')!;
      expect(handL.circleRadius).toBeGreaterThan(0);

      const handR = ragdoll.bodies.get('handR')!;
      expect(handR.circleRadius).toBeGreaterThan(0);
    });

    it('uses rectangle shape for torso and limbs', () => {
      const upperTorso = ragdoll.bodies.get('upperTorso')!;
      // Rectangle bodies don't have circleRadius
      expect(upperTorso.circleRadius).toBeUndefined();

      const upperArmL = ragdoll.bodies.get('upperArmL')!;
      expect(upperArmL.circleRadius).toBeUndefined();
    });

    it('supports small, medium, and large size variants', () => {
      const smallDoll = createRagdoll(400, 300, 'small', DOLL_COLOR_SCHEMES[1]);
      const largeDoll = createRagdoll(400, 300, 'large', DOLL_COLOR_SCHEMES[2]);

      const smallHead = smallDoll.bodies.get('head')!;
      const medHead = ragdoll.bodies.get('head')!;
      const largeHead = largeDoll.bodies.get('head')!;

      // Small should be smaller than medium
      expect(smallHead.circleRadius!).toBeLessThan(medHead.circleRadius!);
      // Large should be larger than medium
      expect(largeHead.circleRadius!).toBeGreaterThan(medHead.circleRadius!);
    });

    it('scales all dimensions by size factor', () => {
      const smallDoll = createRagdoll(400, 300, 'small', DOLL_COLOR_SCHEMES[1]);
      const smallHead = smallDoll.bodies.get('head')!;
      const medHead = ragdoll.bodies.get('head')!;

      const expectedRatio = SIZE_SCALES['small'] / SIZE_SCALES['medium'];
      const actualRatio = smallHead.circleRadius! / medHead.circleRadius!;
      expect(actualRatio).toBeCloseTo(expectedRatio, 1);
    });

    it('has body labels matching expected set', () => {
      const expectedLabels = RAGDOLL_PARTS.map(p => p.label);
      const bodyLabels = Array.from(ragdoll.bodies.keys());
      expect(bodyLabels.sort()).toEqual(expectedLabels.sort());
    });

    it('has constraint labels matching expected set', () => {
      const expectedLabels = RAGDOLL_JOINTS.map(j => j.label);
      const constraintLabels = Array.from(ragdoll.constraints.keys());
      expect(constraintLabels.sort()).toEqual(expectedLabels.sort());
    });

    it('has unique id', () => {
      const ragdoll2 = createRagdoll(200, 200, 'small', DOLL_COLOR_SCHEMES[1]);
      expect(ragdoll.id).toBeTruthy();
      expect(ragdoll2.id).toBeTruthy();
      expect(ragdoll.id).not.toBe(ragdoll2.id);
    });
  });
});

describe('Physics Engine', () => {
  it('creates engine with correct constraint iterations', () => {
    const engine = createPhysicsEngine();
    expect(engine.constraintIterations).toBe(4);
  });

  it('creates engine with sleeping enabled', () => {
    const engine = createPhysicsEngine();
    expect(engine.enableSleeping).toBe(true);
  });

  it('creates engine with realistic mode gravity by default', () => {
    const engine = createPhysicsEngine();
    expect(engine.gravity.scale).toBe(REALISTIC_MODE.gravity.scale);
    expect(engine.gravity.y).toBe(REALISTIC_MODE.gravity.y);
  });

  it('creates engine with correct position iterations', () => {
    const engine = createPhysicsEngine();
    expect(engine.positionIterations).toBe(6);
  });

  it('creates engine with correct velocity iterations', () => {
    const engine = createPhysicsEngine();
    expect(engine.velocityIterations).toBe(4);
  });
});

describe('Angle Constraints', () => {
  let engine: ReturnType<typeof Engine.create>;

  beforeEach(() => {
    _resetAngleLimitsState();
    engine = createPhysicsEngine();
  });

  it('registers angle limits for a ragdoll', () => {
    const ragdoll = createRagdoll(400, 300, 'medium', DOLL_COLOR_SCHEMES[0]);
    // Should not throw
    expect(() => registerAngleLimits(engine, ragdoll)).not.toThrow();
  });

  it('enforces angle limits by clamping body angle', () => {
    const ragdoll = createRagdoll(400, 300, 'medium', DOLL_COLOR_SCHEMES[0]);
    Composite.add(engine.world, ragdoll.composite);
    registerAngleLimits(engine, ragdoll);

    // Force the head to an extreme angle
    const head = ragdoll.bodies.get('head')!;
    const upperTorso = ragdoll.bodies.get('upperTorso')!;

    // Set head angle way past the limit (limit is -0.5 to 0.5 from upperTorso)
    Body.setAngle(upperTorso, 0);
    Body.setAngle(head, 3.0);

    // Run enforce
    enforceAngleLimits();

    // Head angle should be clamped
    const relativeAngle = head.angle - upperTorso.angle;
    expect(relativeAngle).toBeLessThanOrEqual(0.5 + 0.01);
  });

  it('zeroes angular velocity when clamping', () => {
    const ragdoll = createRagdoll(400, 300, 'medium', DOLL_COLOR_SCHEMES[0]);
    Composite.add(engine.world, ragdoll.composite);
    registerAngleLimits(engine, ragdoll);

    const head = ragdoll.bodies.get('head')!;
    const upperTorso = ragdoll.bodies.get('upperTorso')!;

    Body.setAngle(upperTorso, 0);
    Body.setAngle(head, 3.0);
    Body.setAngularVelocity(head, 5.0);

    enforceAngleLimits();

    expect(head.angularVelocity).toBe(0);
  });

  it('updates angle limits for goofy mode', () => {
    const ragdoll = createRagdoll(400, 300, 'medium', DOLL_COLOR_SCHEMES[0]);
    Composite.add(engine.world, ragdoll.composite);
    registerAngleLimits(engine, ragdoll);

    // Switch to goofy mode (wider limits)
    updateAngleLimitsForMode(GOOFY_MODE);

    // Now extreme angle should NOT be clamped because goofy limits are wider
    const head = ragdoll.bodies.get('head')!;
    const upperTorso = ragdoll.bodies.get('upperTorso')!;

    Body.setAngle(upperTorso, 0);
    Body.setAngle(head, 0.8); // Beyond realistic 0.5 but within goofy 1.0

    enforceAngleLimits();

    // Should NOT have been clamped
    const relativeAngle = head.angle - upperTorso.angle;
    expect(relativeAngle).toBeCloseTo(0.8, 1);
  });
});
