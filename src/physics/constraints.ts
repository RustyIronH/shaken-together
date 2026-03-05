import { Events, Body, Engine } from 'matter-js';
import { ANGLE_LIMITS } from '../constants';
import type { PhysicsMode, RagdollInstance } from '../types';

/**
 * Runtime angle limit record tracking actual Body references and current limits.
 */
interface RuntimeAngleLimit {
  ragdollId: string;
  bodyA: Body;
  bodyB: Body;
  minAngle: number;
  maxAngle: number;
  baseMin: number;
  baseMax: number;
  goofyMultiplier: number;
}

// Module-level state
let runtimeLimits: RuntimeAngleLimit[] = [];
let eventRegistered = false;
let registeredEngine: Engine | null = null;

/**
 * Resets all internal state. For testing only.
 */
export function _resetAngleLimitsState(): void {
  if (registeredEngine && eventRegistered) {
    Events.off(registeredEngine, 'beforeUpdate', enforceAngleLimits);
  }
  runtimeLimits = [];
  eventRegistered = false;
  registeredEngine = null;
}

/**
 * Registers angle limits for a ragdoll's joints.
 * On first call, also hooks the beforeUpdate event on the engine.
 */
export function registerAngleLimits(engine: Engine, ragdoll: RagdollInstance): void {
  for (const limit of ANGLE_LIMITS) {
    const bodyA = ragdoll.bodies.get(limit.bodyALabel);
    const bodyB = ragdoll.bodies.get(limit.bodyBLabel);

    if (!bodyA || !bodyB) continue;

    runtimeLimits.push({
      ragdollId: ragdoll.id,
      bodyA,
      bodyB,
      minAngle: limit.minAngle,
      maxAngle: limit.maxAngle,
      baseMin: limit.minAngle,
      baseMax: limit.maxAngle,
      goofyMultiplier: limit.goofyMultiplier,
    });
  }

  // Register the beforeUpdate hook once
  if (!eventRegistered) {
    Events.on(engine, 'beforeUpdate', enforceAngleLimits);
    eventRegistered = true;
    registeredEngine = engine;
  }
}

/**
 * Removes all angle limits for a specific ragdoll.
 */
export function unregisterAngleLimits(ragdollId: string): void {
  runtimeLimits = runtimeLimits.filter(l => l.ragdollId !== ragdollId);
}

/**
 * Enforces all registered angle limits.
 * Called every frame via beforeUpdate event.
 * For each limit, computes the relative angle between bodyB and bodyA.
 * If outside [minAngle, maxAngle], clamps the angle and zeroes angular velocity.
 */
export function enforceAngleLimits(): void {
  for (const limit of runtimeLimits) {
    const relativeAngle = limit.bodyB.angle - limit.bodyA.angle;

    if (relativeAngle < limit.minAngle) {
      Body.setAngle(limit.bodyB, limit.bodyA.angle + limit.minAngle);
      Body.setAngularVelocity(limit.bodyB, 0);
    } else if (relativeAngle > limit.maxAngle) {
      Body.setAngle(limit.bodyB, limit.bodyA.angle + limit.maxAngle);
      Body.setAngularVelocity(limit.bodyB, 0);
    }
  }
}

/**
 * Updates angle limits for a physics mode.
 * Multiplies base limits by the mode's angleLimitMultiplier.
 */
export function updateAngleLimitsForMode(mode: PhysicsMode): void {
  for (const limit of runtimeLimits) {
    const multiplier = mode.angleLimitMultiplier * limit.goofyMultiplier;
    // For modes other than realistic, use the individual goofyMultiplier
    if (mode.name === 'realistic') {
      limit.minAngle = limit.baseMin;
      limit.maxAngle = limit.baseMax;
    } else {
      limit.minAngle = limit.baseMin * limit.goofyMultiplier;
      limit.maxAngle = limit.baseMax * limit.goofyMultiplier;
    }
  }
}
