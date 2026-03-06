/**
 * Share utility with Web Share API -> clipboard -> download fallback chain.
 *
 * Tries the most native sharing method available, falling back gracefully
 * to clipboard copy (PNG only) or direct file download.
 */

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'failed';

/**
 * Shares a Blob using the best available method:
 * 1. Web Share API (if available and supports file sharing)
 * 2. Clipboard copy (PNG only -- ClipboardItem supports image/png)
 * 3. Download via anchor element
 *
 * @param blob - The file content to share
 * @param filename - Suggested filename for downloads/shares
 * @param mimeType - MIME type (e.g. 'image/png', 'image/gif')
 * @returns The method used to share
 */
export async function shareFile(
  blob: Blob,
  filename: string,
  mimeType: string,
): Promise<ShareResult> {
  // 1. Try Web Share API
  try {
    if (navigator.share) {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Shaken Together' });
        return 'shared';
      }
    }
  } catch (err: unknown) {
    // AbortError = user cancelled the share sheet -- not a failure
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'shared';
    }
    // Other errors: fall through to next method
  }

  // 2. Clipboard fallback (PNG only -- ClipboardItem widely supports image/png)
  if (mimeType === 'image/png') {
    try {
      if (navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ [mimeType]: blob }),
        ]);
        return 'copied';
      }
    } catch {
      // Fall through to download
    }
  }

  // 3. Download fallback via anchor element
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    anchor.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  } catch {
    // All methods exhausted
  }

  return 'failed';
}

/**
 * Converts a data URL string to a Blob.
 *
 * @param dataUrl - A data URL (e.g. from canvas.toDataURL)
 * @returns The decoded Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
