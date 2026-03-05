import type { PhysicsMode, BodyPartConfig, JointConfig, AngleLimit, DollColorScheme, DollSize } from './types';

// --- Physics Modes ---
export const REALISTIC_MODE: PhysicsMode = {
  name: 'realistic',
  gravity: { x: 0, y: 1, scale: 0.001 },
  constraintStiffness: 0.6,
  constraintDamping: 0.05,
  bodyRestitution: 0.2,
  bodyFriction: 0.8,
  angleLimitMultiplier: 1.0,
};

export const GOOFY_MODE: PhysicsMode = {
  name: 'goofy',
  gravity: { x: 0, y: 1, scale: 0.0004 },
  constraintStiffness: 0.15,
  constraintDamping: 0.005,
  bodyRestitution: 0.9,
  bodyFriction: 0.4,
  angleLimitMultiplier: 2.0,
};

// --- Doll Size Scales ---
export const SIZE_SCALES: Record<DollSize, number> = {
  small: 0.75,
  medium: 1.0,
  large: 1.25,
};

// --- Ragdoll Body Part Definitions (base scale = medium) ---
// 15 parts: head, upperTorso, lowerTorso, upperArmL, upperArmR,
//           forearmL, forearmR, handL, handR, upperLegL, upperLegR,
//           lowerLegL, lowerLegR, footL, footR
export const RAGDOLL_PARTS: BodyPartConfig[] = [
  { label: 'head',       shape: 'circle',    width: 17, height: 17, offsetX: 0, offsetY: -60 },
  { label: 'upperTorso', shape: 'rectangle', width: 40, height: 30, offsetX: 0, offsetY: -25 },
  { label: 'lowerTorso', shape: 'rectangle', width: 35, height: 25, offsetX: 0, offsetY: 5 },
  { label: 'upperArmL',  shape: 'rectangle', width: 12, height: 26, offsetX: -30, offsetY: -30 },
  { label: 'upperArmR',  shape: 'rectangle', width: 12, height: 26, offsetX: 30, offsetY: -30 },
  { label: 'forearmL',   shape: 'rectangle', width: 10, height: 24, offsetX: -30, offsetY: -2 },
  { label: 'forearmR',   shape: 'rectangle', width: 10, height: 24, offsetX: 30, offsetY: -2 },
  { label: 'handL',      shape: 'circle',    width: 6, height: 6, offsetX: -30, offsetY: 20 },
  { label: 'handR',      shape: 'circle',    width: 6, height: 6, offsetX: 30, offsetY: 20 },
  { label: 'upperLegL',  shape: 'rectangle', width: 14, height: 30, offsetX: -12, offsetY: 35 },
  { label: 'upperLegR',  shape: 'rectangle', width: 14, height: 30, offsetX: 12, offsetY: 35 },
  { label: 'lowerLegL',  shape: 'rectangle', width: 12, height: 28, offsetX: -12, offsetY: 67 },
  { label: 'lowerLegR',  shape: 'rectangle', width: 12, height: 28, offsetX: 12, offsetY: 67 },
  { label: 'footL',      shape: 'circle',    width: 7, height: 7, offsetX: -12, offsetY: 90 },
  { label: 'footR',      shape: 'circle',    width: 7, height: 7, offsetX: 12, offsetY: 90 },
];

// --- Joint Definitions (14 joints connecting 15 body parts in a tree) ---
// Each joint connects two body parts at specific anchor points
export const RAGDOLL_JOINTS: JointConfig[] = [
  { label: 'joint_neck',        bodyALabel: 'head',       bodyBLabel: 'upperTorso', pointA: { x: 0, y: 17 },  pointB: { x: 0, y: -15 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_spine',       bodyALabel: 'upperTorso', bodyBLabel: 'lowerTorso', pointA: { x: 0, y: 15 },  pointB: { x: 0, y: -12 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_shoulderL',   bodyALabel: 'upperTorso', bodyBLabel: 'upperArmL',  pointA: { x: -20, y: -10 }, pointB: { x: 0, y: -13 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_shoulderR',   bodyALabel: 'upperTorso', bodyBLabel: 'upperArmR',  pointA: { x: 20, y: -10 },  pointB: { x: 0, y: -13 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_elbowL',      bodyALabel: 'upperArmL',  bodyBLabel: 'forearmL',   pointA: { x: 0, y: 13 },  pointB: { x: 0, y: -12 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_elbowR',      bodyALabel: 'upperArmR',  bodyBLabel: 'forearmR',   pointA: { x: 0, y: 13 },  pointB: { x: 0, y: -12 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_wristL',      bodyALabel: 'forearmL',   bodyBLabel: 'handL',      pointA: { x: 0, y: 12 },  pointB: { x: 0, y: -6 },  stiffness: 0.6, damping: 0.05 },
  { label: 'joint_wristR',      bodyALabel: 'forearmR',   bodyBLabel: 'handR',      pointA: { x: 0, y: 12 },  pointB: { x: 0, y: -6 },  stiffness: 0.6, damping: 0.05 },
  { label: 'joint_hipL',        bodyALabel: 'lowerTorso', bodyBLabel: 'upperLegL',  pointA: { x: -10, y: 12 }, pointB: { x: 0, y: -15 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_hipR',        bodyALabel: 'lowerTorso', bodyBLabel: 'upperLegR',  pointA: { x: 10, y: 12 },  pointB: { x: 0, y: -15 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_kneeL',       bodyALabel: 'upperLegL',  bodyBLabel: 'lowerLegL',  pointA: { x: 0, y: 15 },  pointB: { x: 0, y: -14 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_kneeR',       bodyALabel: 'upperLegR',  bodyBLabel: 'lowerLegR',  pointA: { x: 0, y: 15 },  pointB: { x: 0, y: -14 }, stiffness: 0.6, damping: 0.05 },
  { label: 'joint_ankleL',      bodyALabel: 'lowerLegL',  bodyBLabel: 'footL',      pointA: { x: 0, y: 14 },  pointB: { x: 0, y: -7 },  stiffness: 0.6, damping: 0.05 },
  { label: 'joint_ankleR',      bodyALabel: 'lowerLegR',  bodyBLabel: 'footR',      pointA: { x: 0, y: 14 },  pointB: { x: 0, y: -7 },  stiffness: 0.6, damping: 0.05 },
];

// --- Angle Limits (Realistic mode base values, in radians) ---
export const ANGLE_LIMITS: AngleLimit[] = [
  { bodyALabel: 'head',       bodyBLabel: 'upperTorso', minAngle: -0.5,  maxAngle: 0.5,  goofyMultiplier: 2.0 },
  { bodyALabel: 'upperTorso', bodyBLabel: 'lowerTorso', minAngle: -0.3,  maxAngle: 0.3,  goofyMultiplier: 2.0 },
  { bodyALabel: 'upperTorso', bodyBLabel: 'upperArmL',  minAngle: -1.5,  maxAngle: 1.5,  goofyMultiplier: 1.5 },
  { bodyALabel: 'upperTorso', bodyBLabel: 'upperArmR',  minAngle: -1.5,  maxAngle: 1.5,  goofyMultiplier: 1.5 },
  { bodyALabel: 'upperArmL',  bodyBLabel: 'forearmL',   minAngle: -2.5,  maxAngle: 0.1,  goofyMultiplier: 1.8 },  // Elbow bends one way
  { bodyALabel: 'upperArmR',  bodyBLabel: 'forearmR',   minAngle: -0.1,  maxAngle: 2.5,  goofyMultiplier: 1.8 },  // Mirrored
  { bodyALabel: 'lowerTorso', bodyBLabel: 'upperLegL',  minAngle: -1.2,  maxAngle: 0.5,  goofyMultiplier: 1.8 },
  { bodyALabel: 'lowerTorso', bodyBLabel: 'upperLegR',  minAngle: -0.5,  maxAngle: 1.2,  goofyMultiplier: 1.8 },
  { bodyALabel: 'upperLegL',  bodyBLabel: 'lowerLegL',  minAngle: -0.1,  maxAngle: 2.5,  goofyMultiplier: 1.8 },  // Knee bends one way
  { bodyALabel: 'upperLegR',  bodyBLabel: 'lowerLegR',  minAngle: -2.5,  maxAngle: 0.1,  goofyMultiplier: 1.8 },  // Mirrored
];

// --- Color Schemes (unique per doll instance) ---
export const DOLL_COLOR_SCHEMES: DollColorScheme[] = [
  { primary: '#e74c3c', secondary: '#c0392b', head: '#f1948a', highlight: '#ff6b6b' },
  { primary: '#3498db', secondary: '#2980b9', head: '#85c1e9', highlight: '#6bb5ff' },
  { primary: '#2ecc71', secondary: '#27ae60', head: '#82e0aa', highlight: '#6bffaa' },
  { primary: '#f39c12', secondary: '#e67e22', head: '#f9e79f', highlight: '#ffc56b' },
  { primary: '#9b59b6', secondary: '#8e44ad', head: '#c39bd3', highlight: '#c76bff' },
];

// --- Scene Constants ---
export const BOUNDARY_THICKNESS = 50;
export const DEFAULT_DOLL_COUNT = 3;
export const MIN_DOLL_COUNT = 2;
export const MAX_DOLL_COUNT = 5;
export const FIXED_TIMESTEP = 1000 / 60;  // 16.67ms
export const MAX_VELOCITY = 25;  // Cap to prevent tunneling through walls
export const CONSTRAINT_ITERATIONS = 4;
export const POSITION_ITERATIONS = 6;
export const VELOCITY_ITERATIONS = 4;
export const FLING_VELOCITY_SCALE = 0.002;
export const VELOCITY_SAMPLE_COUNT = 5;

// --- Background Gradient ---
export const BG_GRADIENT_TOP = '#1a1a2e';
export const BG_GRADIENT_BOTTOM = '#16213e';
