/**
 * Capture preview overlay with Photo/Clip tab switcher, effects toggle,
 * Share, Save, and Discard controls.
 *
 * Photo tab: shows clean/effects screenshot PNG.
 * Clip tab: shows GIF placeholder while encoding, animated GIF when ready.
 * Share button: uses shareFile fallback chain (Web Share -> clipboard -> download).
 * Save button: downloads file, then dismisses overlay.
 * Discard button: dismisses overlay without saving.
 */

import { shareFile, dataUrlToBlob } from '../capture/share';
import { showToast } from './toast';

/** Data passed to the overlay at creation time. */
export interface CaptureOverlayData {
  /** Screenshot data URLs (clean + withEffects) */
  images: { clean: string; withEffects: string };
  /** Last frame of replay buffer as a data URL (static placeholder for Clip tab while encoding) */
  clipPlaceholder: string | null;
}

/** Callbacks for overlay lifecycle events. */
export interface CaptureOverlayCallbacks {
  /** Called after overlay is removed -- resume physics + re-enable capture button */
  onDismiss: () => void;
}

/**
 * Shows the capture preview overlay with Photo/Clip tabs and a white flash shutter effect.
 *
 * Flow: white flash fades out -> dark overlay fades in -> user interacts
 * with tab switcher, effects toggle, Share, Save, or Discard.
 *
 * @param container - DOM element to append overlay into (typically ui-root)
 * @param data - Screenshot images and optional clip placeholder
 * @param callbacks - onDismiss handler for overlay removal
 * @returns Handle with setGifBlob() to provide the encoded GIF for the Clip tab
 */
export function showCaptureOverlay(
  container: HTMLElement,
  data: CaptureOverlayData,
  callbacks: CaptureOverlayCallbacks,
): { setGifBlob: (blob: Blob) => void } {
  // --- State ---
  let activeTab: 'photo' | 'clip' = 'photo';
  let effectsOn = false;
  let gifBlob: Blob | null = null;
  let gifBlobUrl: string | null = null;

  // --- White flash (shutter feedback) ---
  const flash = document.createElement('div');
  Object.assign(flash.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: '#ffffff',
    opacity: '1',
    zIndex: '1999',
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease',
  });
  container.appendChild(flash);

  // Fade out on next frame
  requestAnimationFrame(() => {
    flash.style.opacity = '0';
    flash.addEventListener(
      'transitionend',
      () => {
        if (flash.parentNode) {
          flash.parentNode.removeChild(flash);
        }
      },
      { once: true },
    );
  });

  // --- Overlay backdrop ---
  const overlay = document.createElement('div');
  overlay.id = 'capture-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.85)',
    zIndex: '2000',
    opacity: '0',
    transition: 'opacity 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  });

  // --- Tab switcher bar ---
  const tabBar = document.createElement('div');
  Object.assign(tabBar.style, {
    display: 'flex',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '4px',
    marginBottom: '12px',
  });

  const photoTab = createTabButton('Photo', true);
  const clipTab = createTabButton('Clip', false);

  tabBar.appendChild(photoTab);
  tabBar.appendChild(clipTab);

  // --- Preview area ---
  const previewContainer = document.createElement('div');
  Object.assign(previewContainer.style, {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  // Photo tab: screenshot image
  const photoImg = document.createElement('img');
  photoImg.src = data.images.clean; // Default: effects OFF
  applyPreviewImageStyle(photoImg);

  // Clip tab: placeholder + spinner, or animated GIF
  const clipWrapper = document.createElement('div');
  Object.assign(clipWrapper.style, {
    position: 'relative',
    display: 'none', // Hidden by default (Photo tab is active)
    alignItems: 'center',
    justifyContent: 'center',
  });

  const clipImg = document.createElement('img');
  if (data.clipPlaceholder) {
    clipImg.src = data.clipPlaceholder;
  }
  applyPreviewImageStyle(clipImg);

  // Loading spinner overlay for clip tab
  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'capture-spin 0.8s linear infinite',
  });

  // Inject spinner keyframes if not already present
  if (!document.getElementById('capture-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'capture-spinner-style';
    style.textContent = '@keyframes capture-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }';
    document.head.appendChild(style);
  }

  clipWrapper.appendChild(clipImg);
  clipWrapper.appendChild(spinner);

  previewContainer.appendChild(photoImg);
  previewContainer.appendChild(clipWrapper);

  // --- Controls row ---
  const controls = document.createElement('div');
  Object.assign(controls.style, {
    display: 'flex',
    gap: '16px',
    marginTop: '20px',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  });

  // --- Effects toggle button (Photo tab only) ---
  const effectsBtn = document.createElement('button');
  effectsBtn.textContent = 'Effects: OFF';
  Object.assign(effectsBtn.style, {
    padding: '10px 20px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
  });
  effectsBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    effectsOn = !effectsOn;
    photoImg.src = effectsOn ? data.images.withEffects : data.images.clean;
    effectsBtn.textContent = effectsOn ? 'Effects: ON' : 'Effects: OFF';
  });

  // --- Share button ---
  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Share';
  Object.assign(shareBtn.style, {
    padding: '10px 24px',
    borderRadius: '20px',
    border: 'none',
    background: '#2196F3',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
  });
  shareBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleShare();
  });

  // --- Save button ---
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  Object.assign(saveBtn.style, {
    padding: '10px 24px',
    borderRadius: '20px',
    border: 'none',
    background: '#4CAF50',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
  });
  saveBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleSave();
  });

  // --- Discard button ---
  const discardBtn = document.createElement('button');
  discardBtn.textContent = 'Discard';
  Object.assign(discardBtn.style, {
    padding: '10px 24px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
  });
  discardBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    fadeOutAndDismiss();
  });

  // --- Assemble ---
  // Controls row order: [Effects toggle] [Share] [Save] [Discard]
  controls.appendChild(effectsBtn);
  controls.appendChild(shareBtn);
  controls.appendChild(saveBtn);
  controls.appendChild(discardBtn);

  overlay.appendChild(tabBar);
  overlay.appendChild(previewContainer);
  overlay.appendChild(controls);
  container.appendChild(overlay);

  // Fade in overlay after flash starts fading (~200ms delay)
  setTimeout(() => {
    overlay.style.opacity = '1';
  }, 200);

  // --- Tab switching logic ---
  photoTab.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (activeTab === 'photo') return;
    activeTab = 'photo';
    updateTabUI();
  });

  clipTab.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (activeTab === 'clip') return;
    activeTab = 'clip';
    updateTabUI();
  });

  function updateTabUI(): void {
    // Tab visual state
    applyTabActiveStyle(photoTab, activeTab === 'photo');
    applyTabActiveStyle(clipTab, activeTab === 'clip');

    // Preview visibility
    photoImg.style.display = activeTab === 'photo' ? 'block' : 'none';
    clipWrapper.style.display = activeTab === 'clip' ? 'flex' : 'none';

    // Effects toggle only visible on Photo tab
    effectsBtn.style.display = activeTab === 'photo' ? 'inline-flex' : 'none';
  }

  // --- Share handler ---
  async function handleShare(): Promise<void> {
    const timestamp = Date.now();

    if (activeTab === 'photo') {
      const currentSrc = photoImg.src;
      const blob = await dataUrlToBlob(currentSrc);
      const filename = `shaken-together-${timestamp}.png`;
      const result = await shareFile(blob, filename, 'image/png');
      showShareFeedback(result);
    } else {
      // Clip tab
      if (!gifBlob) {
        showToast(container, 'GIF encoding...');
        return;
      }
      const filename = `shaken-together-${timestamp}.gif`;
      const result = await shareFile(gifBlob, filename, 'image/gif');
      showShareFeedback(result);
    }
  }

  function showShareFeedback(result: string): void {
    if (result === 'copied') {
      showToast(container, 'Copied to clipboard!');
    } else if (result === 'downloaded') {
      showToast(container, 'Saved to device!');
    } else if (result === 'failed') {
      showToast(container, 'Could not share');
    }
    // 'shared' = native share sheet handled it -- no toast needed
  }

  // --- Save handler ---
  async function handleSave(): Promise<void> {
    const timestamp = Date.now();
    let blob: Blob;
    let filename: string;

    if (activeTab === 'photo') {
      blob = await dataUrlToBlob(photoImg.src);
      filename = `shaken-together-${timestamp}.png`;
    } else {
      // Clip tab
      if (!gifBlob) {
        showToast(container, 'GIF encoding...');
        return;
      }
      blob = gifBlob;
      filename = `shaken-together-${timestamp}.gif`;
    }

    // Download via anchor
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    anchor.click();
    URL.revokeObjectURL(url);

    // Fade out then dismiss
    fadeOutAndDismiss();
  }

  // --- Dismiss (fade out + cleanup + callback) ---
  function fadeOutAndDismiss(): void {
    overlay.style.opacity = '0';
    overlay.addEventListener(
      'transitionend',
      () => {
        // Revoke GIF blob URL if created
        if (gifBlobUrl) {
          URL.revokeObjectURL(gifBlobUrl);
        }
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        callbacks.onDismiss();
      },
      { once: true },
    );
  }

  // --- Return handle for async GIF delivery ---
  return {
    setGifBlob(blob: Blob): void {
      gifBlob = blob;
      gifBlobUrl = URL.createObjectURL(blob);
      clipImg.src = gifBlobUrl;
      // Remove spinner
      if (spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
      }
    },
  };
}

// --- Helper functions ---

function createTabButton(label: string, active: boolean): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    padding: '8px 20px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 0.15s ease, color 0.15s ease',
  });
  applyTabActiveStyle(btn, active);
  return btn;
}

function applyTabActiveStyle(btn: HTMLButtonElement, active: boolean): void {
  if (active) {
    btn.style.background = '#ffffff';
    btn.style.color = '#1a1a1a';
  } else {
    btn.style.background = 'transparent';
    btn.style.color = '#ffffff';
  }
}

function applyPreviewImageStyle(img: HTMLImageElement): void {
  Object.assign(img.style, {
    maxWidth: '90%',
    maxHeight: '65vh',
    borderRadius: '8px',
    objectFit: 'contain',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  });
}
