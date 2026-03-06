/**
 * GIF encoding wrapper around gifenc.
 *
 * Converts an array of raw RGBA frames into an animated GIF blob.
 * Each frame is quantized to a 256-color per-frame palette using
 * the PnnQuant algorithm, then LZW-encoded into the GIF stream.
 */

// @ts-expect-error gifenc has no type declarations
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/** Frame delay in milliseconds (5fps = 200ms per frame) */
const FRAME_DELAY_MS = 200;

/**
 * Encodes an array of raw RGBA frames into an animated GIF blob.
 *
 * @param frames - Array of Uint8ClampedArray RGBA pixel data
 * @param width  - Frame width in pixels
 * @param height - Frame height in pixels
 * @returns Blob with type 'image/gif'
 */
export function encodeReplayGif(
  frames: Uint8ClampedArray[],
  width: number,
  height: number,
): Blob {
  const gif = GIFEncoder();

  for (const rgba of frames) {
    const palette = quantize(rgba, 256, { format: 'rgb444' });
    const index = applyPalette(rgba, palette, 'rgb444');
    gif.writeFrame(index, width, height, {
      palette,
      delay: FRAME_DELAY_MS,
      repeat: 0, // loop forever
    });
  }

  gif.finish();
  return new Blob([gif.bytesView()], { type: 'image/gif' });
}
