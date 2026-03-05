import { Bodies, Body, Composite, Constraint } from 'matter-js';
import type { DollSize, DollColorScheme, RagdollInstance } from '../types';
import { REALISTIC_MODE } from '../constants';
import { resolveRagdollConfig } from './ragdoll-config';

let ragdollIdCounter = 0;

/**
 * Determines the fill color for a body part based on its label and the color scheme.
 */
function getBodyColor(label: string, colorScheme: DollColorScheme): string {
  if (label === 'head') return colorScheme.head;
  if (label.startsWith('hand') || label.startsWith('foot')) return colorScheme.highlight;
  if (label.startsWith('upper')) return colorScheme.primary;
  // forearms, lowerTorso, lowerLegs
  return colorScheme.secondary;
}

/**
 * Creates a ragdoll at the given position with the specified size and color scheme.
 *
 * Returns a RagdollInstance with:
 * - A composite containing all bodies and constraints
 * - Maps for looking up bodies/constraints by label
 * - The assigned color scheme and size
 * - A unique id
 */
export function createRagdoll(
  x: number,
  y: number,
  size: DollSize,
  colorScheme: DollColorScheme,
): RagdollInstance {
  const config = resolveRagdollConfig(size);

  // Negative collision group means bodies within this group do NOT collide with each other
  const group = Body.nextGroup(true);

  const bodiesMap = new Map<string, Body>();
  const constraintsMap = new Map<string, Constraint>();

  // Create all body parts
  for (const part of config.parts) {
    const posX = x + part.offsetX;
    const posY = y + part.offsetY;

    let body: Body;
    if (part.shape === 'circle') {
      body = Bodies.circle(posX, posY, part.width, {
        collisionFilter: { group },
        label: part.label,
        friction: REALISTIC_MODE.bodyFriction,
        restitution: REALISTIC_MODE.bodyRestitution,
        render: { fillStyle: getBodyColor(part.label, colorScheme) },
      });
    } else {
      body = Bodies.rectangle(posX, posY, part.width, part.height, {
        collisionFilter: { group },
        label: part.label,
        friction: REALISTIC_MODE.bodyFriction,
        restitution: REALISTIC_MODE.bodyRestitution,
        render: { fillStyle: getBodyColor(part.label, colorScheme) },
      });
    }

    // Apply mass override if specified
    if (part.mass !== undefined) {
      Body.setMass(body, part.mass);
    }

    bodiesMap.set(part.label, body);
  }

  // Create all constraints (pin joints with length 0)
  for (const joint of config.joints) {
    const bodyA = bodiesMap.get(joint.bodyALabel);
    const bodyB = bodiesMap.get(joint.bodyBLabel);

    if (!bodyA || !bodyB) {
      throw new Error(
        `Joint "${joint.label}" references unknown bodies: "${joint.bodyALabel}" or "${joint.bodyBLabel}"`,
      );
    }

    const constraint = Constraint.create({
      bodyA,
      bodyB,
      pointA: { x: joint.pointA.x, y: joint.pointA.y },
      pointB: { x: joint.pointB.x, y: joint.pointB.y },
      stiffness: joint.stiffness,
      damping: joint.damping,
      length: 0, // Pin joint (revolute)
      label: joint.label,
      render: {
        visible: true,
        lineWidth: 1,
        strokeStyle: 'rgba(255,255,255,0.3)',
      },
    });

    constraintsMap.set(joint.label, constraint);
  }

  // Build the composite
  const composite = Composite.create({ label: 'ragdoll' });
  Composite.add(composite, Array.from(bodiesMap.values()));
  Composite.add(composite, Array.from(constraintsMap.values()));

  const id = `ragdoll_${++ragdollIdCounter}`;

  return {
    composite,
    bodies: bodiesMap,
    constraints: constraintsMap,
    colorScheme,
    size,
    id,
  };
}
