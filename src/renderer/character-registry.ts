import type { GraphicsContext } from 'pixi.js';
import type { CharacterId } from '../types';

/** Face expression states */
export type FaceExpression = 'neutral' | 'surprised' | 'dazed';

/** Color palette for a character (hex color numbers) */
export interface CharacterPalette {
  primary: number;
  secondary: number;
  outline: number;
  skin: number;
  highlight: number;
  eye: number;
}

/** Full character definition with body parts and face expressions */
export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  bodyParts: Map<string, GraphicsContext>;
  faceExpressions: Map<FaceExpression, GraphicsContext>;
  palette: CharacterPalette;
}

/** All available character IDs */
export const ALL_CHARACTER_IDS: CharacterId[] = ['slim', 'round', 'buff', 'tiny'];

/** Registry of all character definitions, populated at module load */
export const CHARACTERS: Map<CharacterId, CharacterDefinition> = new Map();

/**
 * Retrieves a character definition by ID.
 * Throws if the character is not registered.
 */
export function getCharacter(id: CharacterId): CharacterDefinition {
  const char = CHARACTERS.get(id);
  if (!char) {
    throw new Error(`Character "${id}" not found in registry`);
  }
  return char;
}
