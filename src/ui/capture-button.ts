/**
 * Camera FAB button for triggering screenshot capture.
 * Positioned fixed in the bottom-right corner, coexisting with
 * the shake button in the bottom-left.
 */

/**
 * Creates the capture button (camera FAB) and appends it to the document.
 *
 * @param onCapture - Callback invoked when the button is tapped
 * @returns The button element for later enable/disable control
 */
export function createCaptureButton(onCapture: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'capture-button';
  btn.setAttribute('aria-label', 'Capture screenshot');

  // Camera SVG icon: rounded rect body + circle lens + trapezoid viewfinder
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 3L7.17 5H4C2.9 5 2 5.9 2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7C22 5.9 21.1 5 20 5H16.83L15 3H9Z" stroke="white" stroke-width="1.5" fill="none"/>
    <circle cx="12" cy="13" r="4" stroke="white" stroke-width="1.5" fill="none"/>
    <circle cx="12" cy="13" r="1.5" fill="white"/>
  </svg>`;

  Object.assign(btn.style, {
    position: 'fixed',
    top: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    zIndex: '50',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s ease, opacity 0.15s ease',
    padding: '0',
    outline: 'none',
  });

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onCapture();
  });

  return btn;
}

/**
 * Disables the capture button (visual + interaction).
 * Used while the preview overlay is showing.
 */
export function disableCaptureButton(btn: HTMLButtonElement): void {
  btn.style.opacity = '0.4';
  btn.style.pointerEvents = 'none';
}

/**
 * Enables the capture button (restores interaction).
 * Used after the preview overlay is dismissed.
 */
export function enableCaptureButton(btn: HTMLButtonElement): void {
  btn.style.opacity = '1';
  btn.style.pointerEvents = 'auto';
}
