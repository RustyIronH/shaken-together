import type { Body, Composite, Constraint } from 'matter-js';

/** Character identity (which character skin is applied) */
export type CharacterId = 'slim' | 'round' | 'buff' | 'tiny';

/** Ragdoll size variants */
export type DollSize = 'small' | 'medium' | 'large';

/** Color scheme for a single ragdoll instance */
export interface DollColorScheme {
  primary: string;    // Main body color
  secondary: string;  // Limb accent color
  head: string;       // Head color
  highlight: string;  // Glow color when grabbed
}

/** Configuration for a ragdoll's body part */
export interface BodyPartConfig {
  label: string;
  shape: 'circle' | 'rectangle';
  width: number;      // Base width (scaled by DollSize)
  height: number;     // Base height (scaled by DollSize), radius for circles
  offsetX: number;    // Position offset from ragdoll center
  offsetY: number;    // Position offset from ragdoll center
  mass?: number;      // Override mass (otherwise computed from area)
}

/** Configuration for a joint between two body parts */
export interface JointConfig {
  label: string;
  bodyALabel: string;
  bodyBLabel: string;
  pointA: { x: number; y: number };  // Anchor on bodyA (relative to body center)
  pointB: { x: number; y: number };  // Anchor on bodyB (relative to body center)
  stiffness: number;
  damping: number;
}

/** Angle constraint for a joint (enforced via beforeUpdate) */
export interface AngleLimit {
  bodyALabel: string;
  bodyBLabel: string;
  minAngle: number;   // Radians - Realistic mode limit
  maxAngle: number;   // Radians - Realistic mode limit
  goofyMultiplier: number;  // Multiply limits by this in Goofy mode (~2.0)
}

/** Physics mode parameters */
export interface PhysicsMode {
  name: 'realistic' | 'goofy';
  gravity: { x: number; y: number; scale: number };
  constraintStiffness: number;
  constraintDamping: number;
  bodyRestitution: number;
  bodyFriction: number;
  angleLimitMultiplier: number;
}

/** Ragdoll instance (created ragdoll with references to its parts) */
export interface RagdollInstance {
  composite: Composite;
  bodies: Map<string, Body>;        // label -> Body
  constraints: Map<string, Constraint>;  // label -> Constraint
  colorScheme: DollColorScheme;
  size: DollSize;
  id: string;  // Unique identifier
  characterId: CharacterId;  // Which character skin is applied
}

/** Active drag state for a pointer */
export interface ActiveDrag {
  pointerId: number;
  body: Body;
  constraint: Constraint;
  ragdollId: string;
  velocityTracker: VelocityTracker;
}

/** Velocity samples for fling calculation */
export interface VelocityTracker {
  positions: Array<{ x: number; y: number; time: number }>;
}

/** Scene state */
export interface SceneState {
  ragdolls: RagdollInstance[];
  dollCount: number;
  currentMode: PhysicsMode;
  activeDrags: Map<number, ActiveDrag>;
}
