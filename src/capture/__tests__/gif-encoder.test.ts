import { describe, it, expect } from 'vitest';
import { encodeReplayGif } from '../gif-encoder';

/**
 * Create a small synthetic RGBA frame (2x2 pixels = 16 bytes).
 * Each pixel is [r, g, b, a] where r=fillValue for identification.
 */
function syntheticFrame(fillValue: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(2 * 2 * 4); // 2x2, RGBA
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = fillValue;     // R
    rgba[i + 1] = 100;       // G
    rgba[i + 2] = 200;       // B
    rgba[i + 3] = 255;       // A
  }
  return rgba;
}

describe('GIF Encoder', () => {
  describe('encodeReplayGif', () => {
    it('returns a Blob with type image/gif', () => {
      const frames = [syntheticFrame(50), syntheticFrame(100)];
      const blob = encodeReplayGif(frames, 2, 2);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/gif');
    });

    it('returns a Blob with size > 0 (non-empty)', () => {
      const frames = [syntheticFrame(50)];
      const blob = encodeReplayGif(frames, 2, 2);

      expect(blob.size).toBeGreaterThan(0);
    });

    it('produces GIF89a header bytes', async () => {
      const frames = [syntheticFrame(50), syntheticFrame(100)];
      const blob = encodeReplayGif(frames, 2, 2);

      const arrayBuffer = await blob.arrayBuffer();
      const header = new Uint8Array(arrayBuffer, 0, 6);
      const headerString = String.fromCharCode(...header);

      expect(headerString).toBe('GIF89a');
    });

    it('handles empty frames array and returns a valid GIF blob', () => {
      const blob = encodeReplayGif([], 2, 2);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/gif');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('encodes multiple frames into a single blob', async () => {
      const singleFrame = encodeReplayGif([syntheticFrame(50)], 2, 2);
      const multiFrame = encodeReplayGif(
        [syntheticFrame(50), syntheticFrame(100), syntheticFrame(150)],
        2,
        2,
      );

      // Multi-frame GIF should be larger than single-frame
      expect(multiFrame.size).toBeGreaterThan(singleFrame.size);
    });
  });
});
