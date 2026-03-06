import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SceneState, ActiveDrag } from '../../types';
import type { RagdollSprite } from '../../renderer/ragdoll-sprite';

// Module under test
import { captureScreenshots, prepareForCapture } from '../screenshot';

/** Mock canvas returned by extract.canvas */
function mockCanvas(dataUrl: string) {
  return {
    toDataURL: vi.fn().mockReturnValue(dataUrl),
  };
}

/** Mock PixiJS Application with extract API */
function mockApp(cleanUrl: string, effectsUrl: string) {
  let callCount = 0;
  return {
    renderer: {
      extract: {
        canvas: vi.fn().mockImplementation(() => {
          callCount++;
          // First call = clean (effects OFF), second call = effects ON
          return callCount === 1
            ? mockCanvas(cleanUrl)
            : mockCanvas(effectsUrl);
        }),
      },
    },
    stage: { label: 'stage' },
  } as any;
}

/** Mock effects layer */
function mockEffectsLayer() {
  return { visible: true } as any;
}

/** Mock scene with active drags */
function mockScene(dragCount = 0): SceneState {
  const activeDrags = new Map<number, ActiveDrag>();
  for (let i = 0; i < dragCount; i++) {
    activeDrags.set(i, {
      pointerId: i,
      body: {} as any,
      constraint: {} as any,
      ragdollId: `doll-${i}`,
      velocityTracker: { positions: [] },
    });
  }
  return {
    ragdolls: [],
    dollCount: 0,
    currentMode: { name: 'realistic' } as any,
    activeDrags,
  };
}

/** Mock sprite map with containers that have scale */
function mockSpriteMap(count: number, initialScale = 1.05): Map<string, RagdollSprite> {
  const map = new Map<string, RagdollSprite>();
  for (let i = 0; i < count; i++) {
    const id = `doll-${i}`;
    map.set(id, {
      container: {
        scale: {
          x: initialScale,
          y: initialScale,
          set: vi.fn(function (this: any, val: number) {
            this.x = val;
            this.y = val;
          }),
        },
      },
      parts: new Map(),
      headGraphic: {} as any,
      characterId: 'slim',
      ragdollId: id,
    } as any);
  }
  return map;
}

describe('Screenshot Capture', () => {
  describe('captureScreenshots', () => {
    it('returns an object with clean and withEffects string properties (data URLs)', () => {
      const app = mockApp('data:image/png;base64,CLEAN', 'data:image/png;base64,EFFECTS');
      const effectsLayer = mockEffectsLayer();

      const result = captureScreenshots(app, effectsLayer);

      expect(typeof result.clean).toBe('string');
      expect(typeof result.withEffects).toBe('string');
      expect(result.clean).toBe('data:image/png;base64,CLEAN');
      expect(result.withEffects).toBe('data:image/png;base64,EFFECTS');
    });

    it('sets effectsLayer.visible to false before first extract, then true before second extract', () => {
      const visibilityLog: boolean[] = [];
      const app = {
        renderer: {
          extract: {
            canvas: vi.fn().mockImplementation(() => {
              // Record visibility at the time of each extract call
              visibilityLog.push(effectsLayer.visible);
              return mockCanvas('data:image/png;base64,TEST');
            }),
          },
        },
        stage: { label: 'stage' },
      } as any;

      const effectsLayer = mockEffectsLayer();

      captureScreenshots(app, effectsLayer);

      // First extract call: effects OFF (visible = false)
      expect(visibilityLog[0]).toBe(false);
      // Second extract call: effects ON (visible = true)
      expect(visibilityLog[1]).toBe(true);
    });

    it('restores effectsLayer.visible to true after capture completes', () => {
      const app = mockApp('data:image/png;base64,CLEAN', 'data:image/png;base64,EFFECTS');
      const effectsLayer = mockEffectsLayer();

      captureScreenshots(app, effectsLayer);

      expect(effectsLayer.visible).toBe(true);
    });

    it('restores effectsLayer.visible to true even if extract throws an error', () => {
      const app = {
        renderer: {
          extract: {
            canvas: vi.fn().mockImplementation(() => {
              throw new Error('Extract failed');
            }),
          },
        },
        stage: { label: 'stage' },
      } as any;

      const effectsLayer = mockEffectsLayer();

      expect(() => captureScreenshots(app, effectsLayer)).toThrow('Extract failed');
      expect(effectsLayer.visible).toBe(true);
    });
  });

  describe('prepareForCapture', () => {
    it('clears active drags (empties scene.activeDrags map)', () => {
      const scene = mockScene(3); // 3 active drags
      const spriteMap = mockSpriteMap(3);

      expect(scene.activeDrags.size).toBe(3);

      prepareForCapture(scene, spriteMap);

      expect(scene.activeDrags.size).toBe(0);
    });

    it('resets sprite container scales to 1.0 for all ragdolls', () => {
      const spriteMap = mockSpriteMap(3, 1.05);
      const scene = mockScene(0);

      prepareForCapture(scene, spriteMap);

      for (const sprite of spriteMap.values()) {
        expect(sprite.container.scale.set).toHaveBeenCalledWith(1.0);
      }
    });
  });
});
