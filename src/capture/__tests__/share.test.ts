import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareFile, dataUrlToBlob } from '../share';

describe('Share utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('shareFile', () => {
    const testBlob = new Blob(['test'], { type: 'image/png' });

    it('returns "shared" when Web Share API is available and canShare returns true', async () => {
      const shareFn = vi.fn().mockResolvedValue(undefined);
      const canShareFn = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', {
        share: shareFn,
        canShare: canShareFn,
        clipboard: undefined,
      });

      const result = await shareFile(testBlob, 'test.png', 'image/png');

      expect(result).toBe('shared');
      expect(shareFn).toHaveBeenCalledOnce();
      // Verify it was called with a files array containing a File
      const callArg = shareFn.mock.calls[0][0];
      expect(callArg.files).toHaveLength(1);
      expect(callArg.files[0]).toBeInstanceOf(File);
      expect(callArg.title).toBe('Shaken Together');
    });

    it('returns "shared" when navigator.share throws AbortError (user cancelled)', async () => {
      const abortError = new DOMException('User cancelled', 'AbortError');
      const shareFn = vi.fn().mockRejectedValue(abortError);
      const canShareFn = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', {
        share: shareFn,
        canShare: canShareFn,
        clipboard: undefined,
      });

      const result = await shareFile(testBlob, 'test.png', 'image/png');

      expect(result).toBe('shared');
    });

    it('falls back to clipboard when Web Share API is unavailable and mimeType is image/png', async () => {
      const writeFn = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        share: undefined,
        canShare: undefined,
        clipboard: { write: writeFn },
      });

      const result = await shareFile(testBlob, 'test.png', 'image/png');

      expect(result).toBe('copied');
      expect(writeFn).toHaveBeenCalledOnce();
    });

    it('falls back to download when Web Share API is unavailable and mimeType is image/gif', async () => {
      vi.stubGlobal('navigator', {
        share: undefined,
        canShare: undefined,
        clipboard: { write: vi.fn() },
      });

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const createObjUrl = vi.fn().mockReturnValue('blob:test-url');
      const revokeObjUrl = vi.fn();
      vi.stubGlobal('URL', {
        createObjectURL: createObjUrl,
        revokeObjectURL: revokeObjUrl,
      });

      // Mock anchor element click
      const clickFn = vi.fn();
      const mockAnchor = { href: '', download: '', click: clickFn, style: {} } as unknown as HTMLAnchorElement;
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);

      const gifBlob = new Blob(['test'], { type: 'image/gif' });
      const result = await shareFile(gifBlob, 'test.gif', 'image/gif');

      expect(result).toBe('downloaded');
      expect(clickFn).toHaveBeenCalledOnce();
      expect(mockAnchor.download).toBe('test.gif');
      expect(createObjUrl).toHaveBeenCalledWith(gifBlob);
      expect(revokeObjUrl).toHaveBeenCalledWith('blob:test-url');
    });

    it('falls back to download when Web Share API throws non-abort error and clipboard is unavailable', async () => {
      const shareFn = vi.fn().mockRejectedValue(new Error('Not supported'));
      const canShareFn = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', {
        share: shareFn,
        canShare: canShareFn,
        clipboard: undefined,
      });

      // Mock URL and anchor for download fallback
      const createObjUrl = vi.fn().mockReturnValue('blob:test-url');
      const revokeObjUrl = vi.fn();
      vi.stubGlobal('URL', {
        createObjectURL: createObjUrl,
        revokeObjectURL: revokeObjUrl,
      });

      const clickFn = vi.fn();
      const mockAnchor = { href: '', download: '', click: clickFn, style: {} } as unknown as HTMLAnchorElement;
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);

      const result = await shareFile(testBlob, 'test.png', 'image/png');

      expect(result).toBe('downloaded');
    });

    it('returns "failed" when all methods fail', async () => {
      vi.stubGlobal('navigator', {
        share: undefined,
        canShare: undefined,
        clipboard: undefined,
      });

      // Mock URL.createObjectURL to throw
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockImplementation(() => {
          throw new Error('Cannot create URL');
        }),
        revokeObjectURL: vi.fn(),
      });

      const result = await shareFile(testBlob, 'test.png', 'image/png');

      expect(result).toBe('failed');
    });

    it('clipboard fallback only works for image/png, not image/gif', async () => {
      vi.stubGlobal('navigator', {
        share: undefined,
        canShare: undefined,
        clipboard: { write: vi.fn().mockResolvedValue(undefined) },
      });

      // Mock URL and anchor for download fallback
      const createObjUrl = vi.fn().mockReturnValue('blob:test-url');
      const revokeObjUrl = vi.fn();
      vi.stubGlobal('URL', {
        createObjectURL: createObjUrl,
        revokeObjectURL: revokeObjUrl,
      });

      const clickFn = vi.fn();
      const mockAnchor = { href: '', download: '', click: clickFn, style: {} } as unknown as HTMLAnchorElement;
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);

      const gifBlob = new Blob(['test'], { type: 'image/gif' });
      const result = await shareFile(gifBlob, 'test.gif', 'image/gif');

      // Should download, not copy (clipboard doesn't support GIF)
      expect(result).toBe('downloaded');
    });
  });

  describe('dataUrlToBlob', () => {
    it('converts a data URL string to a Blob', async () => {
      // Create a simple 1x1 pixel PNG data URL
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blob = await dataUrlToBlob(dataUrl);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});
