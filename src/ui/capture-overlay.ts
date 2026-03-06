/**
 * Capture preview overlay: full-screen dark backdrop with image preview,
 * effects toggle (default OFF), Save, and Discard controls.
 * Includes a white flash shutter effect before the overlay appears.
 */

export interface CaptureOverlayCallbacks {
  onSave: (dataUrl: string) => void;
  onDiscard: () => void;
}

/**
 * Shows the capture preview overlay with a white flash shutter effect.
 *
 * Flow: white flash fades out -> dark overlay fades in -> user interacts
 * with effects toggle, Save, or Discard.
 *
 * @param container - DOM element to append overlay into (typically ui-root)
 * @param images - Clean and with-effects PNG data URLs
 * @param callbacks - onSave and onDiscard handlers
 */
export function showCaptureOverlay(
  container: HTMLElement,
  images: { clean: string; withEffects: string },
  callbacks: CaptureOverlayCallbacks,
): void {
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

  // --- Preview image ---
  const previewImg = document.createElement('img');
  previewImg.src = images.clean; // Default: effects OFF
  Object.assign(previewImg.style, {
    maxWidth: '90%',
    maxHeight: '65vh',
    borderRadius: '8px',
    objectFit: 'contain',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  });

  // --- Controls row ---
  const controls = document.createElement('div');
  Object.assign(controls.style, {
    display: 'flex',
    gap: '16px',
    marginTop: '20px',
    alignItems: 'center',
    justifyContent: 'center',
  });

  // --- Effects toggle button ---
  let effectsOn = false;
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
    previewImg.src = effectsOn ? images.withEffects : images.clean;
    effectsBtn.textContent = effectsOn ? 'Effects: ON' : 'Effects: OFF';
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
    // Fade out overlay then call save
    overlay.style.opacity = '0';
    overlay.addEventListener(
      'transitionend',
      () => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        callbacks.onSave(previewImg.src);
      },
      { once: true },
    );
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
    overlay.style.opacity = '0';
    overlay.addEventListener(
      'transitionend',
      () => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        callbacks.onDiscard();
      },
      { once: true },
    );
  });

  // Assemble
  controls.appendChild(effectsBtn);
  controls.appendChild(saveBtn);
  controls.appendChild(discardBtn);
  overlay.appendChild(previewImg);
  overlay.appendChild(controls);
  container.appendChild(overlay);

  // Fade in overlay after flash starts fading (~200ms delay)
  setTimeout(() => {
    overlay.style.opacity = '1';
  }, 200);
}
