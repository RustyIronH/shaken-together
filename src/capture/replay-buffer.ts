/**
 * Circular frame buffer for replay clip capture.
 *
 * Stores the last 3 seconds of canvas frames as raw RGBA pixel data at 5fps.
 * Oldest frames are overwritten when the buffer is full (ring buffer behavior).
 */

/** 5fps * 3 seconds = 15 frames max */
export const BUFFER_CAPACITY = 15;

/**
 * Replay buffer state. Frames are stored as raw RGBA Uint8ClampedArrays
 * from PixiJS extract.pixels(). Null slots indicate unfilled positions.
 */
export interface ReplayBuffer {
  frames: (Uint8ClampedArray | null)[];
  width: number;
  height: number;
  writeIndex: number;
  frameCount: number;
  /** When false, pushFrame is a no-op (e.g., during capture preview). */
  recording: boolean;
}

/**
 * Creates a new replay buffer sized for the given canvas dimensions.
 */
export function createReplayBuffer(width: number, height: number): ReplayBuffer {
  return {
    frames: new Array<Uint8ClampedArray | null>(BUFFER_CAPACITY).fill(null),
    width,
    height,
    writeIndex: 0,
    frameCount: 0,
    recording: true,
  };
}

/**
 * Pushes a raw RGBA frame into the circular buffer.
 * No-op when buffer.recording is false.
 */
export function pushFrame(buffer: ReplayBuffer, rgba: Uint8ClampedArray): void {
  if (!buffer.recording) return;

  buffer.frames[buffer.writeIndex] = rgba;
  buffer.writeIndex = (buffer.writeIndex + 1) % BUFFER_CAPACITY;
  if (buffer.frameCount < BUFFER_CAPACITY) {
    buffer.frameCount++;
  }
}

/**
 * Returns frames in chronological order (oldest first).
 * Handles both partially-filled and wrapped (overwritten) buffers.
 */
export function getOrderedFrames(buffer: ReplayBuffer): Uint8ClampedArray[] {
  if (buffer.frameCount === 0) return [];

  if (buffer.frameCount < BUFFER_CAPACITY) {
    // Not yet wrapped -- frames are sequential from index 0
    return buffer.frames.slice(0, buffer.frameCount) as Uint8ClampedArray[];
  }

  // Wrapped: oldest frame is at writeIndex, newest is at writeIndex - 1
  return [
    ...buffer.frames.slice(buffer.writeIndex),
    ...buffer.frames.slice(0, buffer.writeIndex),
  ] as Uint8ClampedArray[];
}

/**
 * Resets the buffer to empty state. Does not change width/height/recording.
 */
export function resetBuffer(buffer: ReplayBuffer): void {
  buffer.writeIndex = 0;
  buffer.frameCount = 0;
}
