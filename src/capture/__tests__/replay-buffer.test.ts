import { describe, it, expect } from 'vitest';
import {
  createReplayBuffer,
  pushFrame,
  getOrderedFrames,
  resetBuffer,
  BUFFER_CAPACITY,
} from '../replay-buffer';

/** Create a fake RGBA frame filled with a single byte value */
function fakeFrame(fillValue: number, size = 16): Uint8ClampedArray {
  return new Uint8ClampedArray(size).fill(fillValue);
}

describe('Replay Buffer', () => {
  describe('createReplayBuffer', () => {
    it('returns a buffer with capacity 30 (10fps * 3s)', () => {
      expect(BUFFER_CAPACITY).toBe(30);
    });

    it('initializes with recording=true and frameCount=0', () => {
      const buf = createReplayBuffer(100, 100);
      expect(buf.recording).toBe(true);
      expect(buf.frameCount).toBe(0);
    });

    it('stores the given width and height', () => {
      const buf = createReplayBuffer(360, 640);
      expect(buf.width).toBe(360);
      expect(buf.height).toBe(640);
    });

    it('initializes writeIndex at 0', () => {
      const buf = createReplayBuffer(100, 100);
      expect(buf.writeIndex).toBe(0);
    });

    it('initializes frames array with capacity null slots', () => {
      const buf = createReplayBuffer(100, 100);
      expect(buf.frames.length).toBe(BUFFER_CAPACITY);
      expect(buf.frames.every((f) => f === null)).toBe(true);
    });
  });

  describe('pushFrame', () => {
    it('stores a frame at writeIndex and advances writeIndex', () => {
      const buf = createReplayBuffer(2, 2);
      const frame = fakeFrame(42);

      pushFrame(buf, frame);

      expect(buf.frames[0]).toBe(frame);
      expect(buf.writeIndex).toBe(1);
    });

    it('increments frameCount up to capacity', () => {
      const buf = createReplayBuffer(2, 2);

      for (let i = 0; i < 10; i++) {
        pushFrame(buf, fakeFrame(i));
      }
      expect(buf.frameCount).toBe(10);
    });

    it('caps frameCount at capacity after overflow', () => {
      const buf = createReplayBuffer(2, 2);

      for (let i = 0; i < 35; i++) {
        pushFrame(buf, fakeFrame(i));
      }
      expect(buf.frameCount).toBe(BUFFER_CAPACITY);
    });

    it('wraps writeIndex at capacity (circular overwrite)', () => {
      const buf = createReplayBuffer(2, 2);

      for (let i = 0; i < BUFFER_CAPACITY + 5; i++) {
        pushFrame(buf, fakeFrame(i));
      }
      // writeIndex should have wrapped: (30 + 5) % 30 = 5
      expect(buf.writeIndex).toBe(5);
    });

    it('is a no-op when recording=false (frameCount unchanged)', () => {
      const buf = createReplayBuffer(2, 2);
      buf.recording = false;

      pushFrame(buf, fakeFrame(1));

      expect(buf.frameCount).toBe(0);
      expect(buf.writeIndex).toBe(0);
      expect(buf.frames[0]).toBe(null);
    });

    it('resumes accumulation when recording is set back to true', () => {
      const buf = createReplayBuffer(2, 2);

      pushFrame(buf, fakeFrame(1));
      expect(buf.frameCount).toBe(1);

      buf.recording = false;
      pushFrame(buf, fakeFrame(2));
      expect(buf.frameCount).toBe(1);

      buf.recording = true;
      pushFrame(buf, fakeFrame(3));
      expect(buf.frameCount).toBe(2);
    });
  });

  describe('getOrderedFrames', () => {
    it('returns frames in chronological order for a partially-filled buffer', () => {
      const buf = createReplayBuffer(2, 2);

      pushFrame(buf, fakeFrame(10));
      pushFrame(buf, fakeFrame(20));
      pushFrame(buf, fakeFrame(30));

      const ordered = getOrderedFrames(buf);
      expect(ordered.length).toBe(3);
      expect(ordered[0][0]).toBe(10);
      expect(ordered[1][0]).toBe(20);
      expect(ordered[2][0]).toBe(30);
    });

    it('returns exactly frameCount frames when partially filled', () => {
      const buf = createReplayBuffer(2, 2);

      for (let i = 0; i < 10; i++) {
        pushFrame(buf, fakeFrame(i));
      }

      const ordered = getOrderedFrames(buf);
      expect(ordered.length).toBe(10);
    });

    it('returns frames in correct order after wrapping', () => {
      const buf = createReplayBuffer(2, 2);

      // Push 35 frames into a 30-capacity buffer
      for (let i = 0; i < 35; i++) {
        pushFrame(buf, fakeFrame(i));
      }

      const ordered = getOrderedFrames(buf);
      expect(ordered.length).toBe(BUFFER_CAPACITY);
      // After 35 pushes, oldest surviving frame is #5, newest is #34
      expect(ordered[0][0]).toBe(5);
      expect(ordered[ordered.length - 1][0]).toBe(34);
    });

    it('returns empty array for a buffer with no frames', () => {
      const buf = createReplayBuffer(2, 2);
      const ordered = getOrderedFrames(buf);
      expect(ordered.length).toBe(0);
    });

    it('returns all frames in correct order when buffer is exactly full', () => {
      const buf = createReplayBuffer(2, 2);

      for (let i = 0; i < BUFFER_CAPACITY; i++) {
        pushFrame(buf, fakeFrame(i));
      }

      const ordered = getOrderedFrames(buf);
      expect(ordered.length).toBe(BUFFER_CAPACITY);
      // writeIndex wrapped to 0, but since frameCount == capacity and writeIndex == 0,
      // ordered should be [0..29] in order
      expect(ordered[0][0]).toBe(0);
      expect(ordered[29][0]).toBe(29);
    });
  });

  describe('resetBuffer', () => {
    it('sets frameCount=0 and writeIndex=0', () => {
      const buf = createReplayBuffer(2, 2);

      for (let i = 0; i < 10; i++) {
        pushFrame(buf, fakeFrame(i));
      }
      expect(buf.frameCount).toBe(10);
      expect(buf.writeIndex).toBe(10);

      resetBuffer(buf);

      expect(buf.frameCount).toBe(0);
      expect(buf.writeIndex).toBe(0);
    });
  });
});
