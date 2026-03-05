import { describe, it } from 'vitest';

describe('Multi-Touch Drag', () => {
  describe('hit testing', () => {
    it.todo('finds body at given point coordinates');
    it.todo('returns null when no body at point');
    it.todo('prevents same body from being grabbed by two pointers');
  });

  describe('fling', () => {
    it.todo('calculates release velocity from position samples');
    it.todo('returns zero velocity when insufficient samples');
  });
});
