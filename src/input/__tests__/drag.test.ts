import { describe, it, expect, beforeEach } from 'vitest';
import { Engine, Bodies, Body, Composite, Query } from 'matter-js';
import {
  calculateReleaseVelocity,
  trackPosition,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  screenToWorld,
} from '../drag-manager';
import type { SceneState, VelocityTracker } from '../../types';
import { REALISTIC_MODE, FLING_VELOCITY_SCALE } from '../../constants';
import { createRagdoll } from '../../physics/ragdoll';

describe('Multi-Touch Drag', () => {
  describe('screenToWorld', () => {
    it('converts screen coordinates to canvas world coordinates', () => {
      // Mock canvas with getBoundingClientRect
      const canvas = {
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 400, height: 300 }),
        width: 800,
        height: 600,
      } as unknown as HTMLCanvasElement;

      const result = screenToWorld(210, 170, canvas);
      // clientX=210 -> (210-10) * 800/400 = 200*2 = 400
      // clientY=170 -> (170-20) * 600/300 = 150*2 = 300
      expect(result.x).toBeCloseTo(400);
      expect(result.y).toBeCloseTo(300);
    });
  });

  describe('calculateReleaseVelocity', () => {
    it('calculates velocity from position samples', () => {
      const tracker: VelocityTracker = {
        positions: [
          { x: 0, y: 0, time: 0 },
          { x: 100, y: 0, time: 50 },
          { x: 200, y: 0, time: 100 },
          { x: 300, y: 0, time: 150 },
          { x: 400, y: 0, time: 200 },
        ],
      };

      const velocity = calculateReleaseVelocity(tracker);
      // dx = 400 - 0 = 400, dt = (200 - 0) / 1000 = 0.2 seconds
      // vx = 400 / 0.2 * FLING_VELOCITY_SCALE = 2000 * 0.002 = 4.0
      expect(velocity.x).toBeCloseTo(4.0);
      expect(velocity.y).toBeCloseTo(0);
    });

    it('returns zero velocity when fewer than 2 samples', () => {
      const emptyTracker: VelocityTracker = { positions: [] };
      expect(calculateReleaseVelocity(emptyTracker)).toEqual({ x: 0, y: 0 });

      const singleTracker: VelocityTracker = {
        positions: [{ x: 10, y: 20, time: 100 }],
      };
      expect(calculateReleaseVelocity(singleTracker)).toEqual({ x: 0, y: 0 });
    });

    it('returns zero velocity when time delta is too small', () => {
      const tracker: VelocityTracker = {
        positions: [
          { x: 0, y: 0, time: 100 },
          { x: 100, y: 100, time: 100 }, // Same timestamp
        ],
      };
      expect(calculateReleaseVelocity(tracker)).toEqual({ x: 0, y: 0 });
    });
  });

  describe('trackPosition', () => {
    it('adds position samples to tracker', () => {
      const tracker: VelocityTracker = { positions: [] };
      trackPosition(tracker, 10, 20, 100);
      trackPosition(tracker, 30, 40, 200);
      expect(tracker.positions).toHaveLength(2);
      expect(tracker.positions[0]).toEqual({ x: 10, y: 20, time: 100 });
      expect(tracker.positions[1]).toEqual({ x: 30, y: 40, time: 200 });
    });

    it('keeps only last VELOCITY_SAMPLE_COUNT samples', () => {
      const tracker: VelocityTracker = { positions: [] };
      for (let i = 0; i < 8; i++) {
        trackPosition(tracker, i * 10, i * 10, i * 100);
      }
      // VELOCITY_SAMPLE_COUNT = 5
      expect(tracker.positions).toHaveLength(5);
      // Should keep samples 3,4,5,6,7
      expect(tracker.positions[0].x).toBe(30);
      expect(tracker.positions[4].x).toBe(70);
    });
  });

  describe('hit testing', () => {
    let engine: Engine;

    beforeEach(() => {
      engine = Engine.create();
    });

    it('finds body at given point coordinates', () => {
      const body = Bodies.circle(100, 100, 30, { isStatic: false });
      Composite.add(engine.world, body);

      const bodies = Composite.allBodies(engine.world);
      const hits = Query.point(bodies, { x: 100, y: 100 });
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].id).toBe(body.id);
    });

    it('returns empty when no body at point', () => {
      const body = Bodies.circle(100, 100, 30, { isStatic: false });
      Composite.add(engine.world, body);

      const bodies = Composite.allBodies(engine.world);
      const hits = Query.point(bodies, { x: 500, y: 500 });
      expect(hits).toHaveLength(0);
    });

    it('does not hit static bodies during drag', () => {
      const staticBody = Bodies.rectangle(100, 100, 50, 50, { isStatic: true, label: 'boundary' });
      Composite.add(engine.world, staticBody);

      // handlePointerDown filters out static bodies
      const scene: SceneState = {
        ragdolls: [],
        dollCount: 0,
        currentMode: REALISTIC_MODE,
        activeDrags: new Map(),
      };

      const canvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
        width: 400,
        height: 400,
      } as unknown as HTMLCanvasElement;

      const e = { clientX: 100, clientY: 100, pointerId: 1 } as PointerEvent;
      handlePointerDown(e, engine, scene, canvas);

      // Should NOT create a drag because the body is static
      expect(scene.activeDrags.size).toBe(0);
    });
  });

  describe('drag lifecycle', () => {
    let engine: Engine;
    let scene: SceneState;
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
      engine = Engine.create();

      const colorScheme = { primary: '#e74c3c', secondary: '#c0392b', head: '#f1948a', highlight: '#ff6b6b' };
      const ragdoll = createRagdoll(200, 200, 'medium', colorScheme);
      Composite.add(engine.world, ragdoll.composite);

      scene = {
        ragdolls: [ragdoll],
        dollCount: 1,
        currentMode: REALISTIC_MODE,
        activeDrags: new Map(),
      };

      canvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
        width: 400,
        height: 400,
      } as unknown as HTMLCanvasElement;
    });

    it('creates a constraint when pointer hits a ragdoll body', () => {
      // Head is at (200, 140) for medium ragdoll (offsetY=-60)
      const headBody = scene.ragdolls[0].bodies.get('head')!;
      const e = {
        clientX: headBody.position.x,
        clientY: headBody.position.y,
        pointerId: 1,
      } as PointerEvent;

      handlePointerDown(e, engine, scene, canvas);
      expect(scene.activeDrags.size).toBe(1);
      expect(scene.activeDrags.get(1)).toBeDefined();
      expect(scene.activeDrags.get(1)!.ragdollId).toBe(scene.ragdolls[0].id);
    });

    it('prevents same body from being grabbed by two pointers', () => {
      const headBody = scene.ragdolls[0].bodies.get('head')!;

      const e1 = {
        clientX: headBody.position.x,
        clientY: headBody.position.y,
        pointerId: 1,
      } as PointerEvent;

      const e2 = {
        clientX: headBody.position.x,
        clientY: headBody.position.y,
        pointerId: 2,
      } as PointerEvent;

      handlePointerDown(e1, engine, scene, canvas);
      handlePointerDown(e2, engine, scene, canvas);

      // Only one drag should exist for this body
      expect(scene.activeDrags.size).toBe(1);
    });

    it('updates constraint pointA on pointer move', () => {
      const headBody = scene.ragdolls[0].bodies.get('head')!;
      const e = {
        clientX: headBody.position.x,
        clientY: headBody.position.y,
        pointerId: 1,
      } as PointerEvent;

      handlePointerDown(e, engine, scene, canvas);

      const moveEvent = {
        clientX: 300,
        clientY: 300,
        pointerId: 1,
      } as PointerEvent;

      handlePointerMove(moveEvent, scene, canvas);

      const drag = scene.activeDrags.get(1)!;
      expect(drag.constraint.pointA.x).toBeCloseTo(300);
      expect(drag.constraint.pointA.y).toBeCloseTo(300);
    });

    it('removes constraint and cleans up on pointer up', () => {
      const headBody = scene.ragdolls[0].bodies.get('head')!;
      const e = {
        clientX: headBody.position.x,
        clientY: headBody.position.y,
        pointerId: 1,
      } as PointerEvent;

      handlePointerDown(e, engine, scene, canvas);
      expect(scene.activeDrags.size).toBe(1);

      const upEvent = {
        clientX: headBody.position.x + 50,
        clientY: headBody.position.y,
        pointerId: 1,
      } as PointerEvent;

      handlePointerUp(upEvent, engine, scene, canvas);
      expect(scene.activeDrags.size).toBe(0);
    });

    it('does nothing on pointer up for unknown pointerId', () => {
      const upEvent = {
        clientX: 200,
        clientY: 200,
        pointerId: 999,
      } as PointerEvent;

      // Should not throw
      handlePointerUp(upEvent, engine, scene, canvas);
      expect(scene.activeDrags.size).toBe(0);
    });
  });
});
