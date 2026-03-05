import type { DollSize, BodyPartConfig, JointConfig } from '../types';
import { RAGDOLL_PARTS, RAGDOLL_JOINTS, SIZE_SCALES } from '../constants';

/**
 * Scaled body part and joint configs for a given ragdoll size.
 */
export interface ScaledRagdollConfig {
  parts: BodyPartConfig[];
  joints: JointConfig[];
  scale: number;
}

/**
 * Resolves ragdoll configuration scaled to the given size.
 * Applies SIZE_SCALES[size] to all dimension and offset values.
 */
export function resolveRagdollConfig(size: DollSize): ScaledRagdollConfig {
  const scale = SIZE_SCALES[size];

  const parts: BodyPartConfig[] = RAGDOLL_PARTS.map(part => ({
    ...part,
    width: part.width * scale,
    height: part.height * scale,
    offsetX: part.offsetX * scale,
    offsetY: part.offsetY * scale,
  }));

  const joints: JointConfig[] = RAGDOLL_JOINTS.map(joint => ({
    ...joint,
    pointA: { x: joint.pointA.x * scale, y: joint.pointA.y * scale },
    pointB: { x: joint.pointB.x * scale, y: joint.pointB.y * scale },
  }));

  return { parts, joints, scale };
}
