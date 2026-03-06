/**
 * Auto-dismiss toast notification component.
 *
 * Shows a fixed-position pill notification that fades in, auto-dismisses
 * after the specified duration, and removes itself from the DOM after fade.
 * Follows the onboarding-hint pattern (rAF fade-in, setTimeout auto-dismiss,
 * transitionend cleanup).
 */

/**
 * Shows an auto-dismissing toast notification.
 *
 * @param container - DOM element to append toast into (typically ui-root)
 * @param message - Text to display
 * @param durationMs - Time before auto-dismiss in milliseconds (default 2000)
 */
export function showToast(
  container: HTMLElement,
  message: string,
  durationMs: number = 2000,
): void {
  const toast = document.createElement('div');
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    zIndex: '2100',
    opacity: '0',
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  });

  container.appendChild(toast);

  // Fade in on next frame
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  // Auto-dismiss after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.addEventListener(
      'transitionend',
      () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      },
      { once: true },
    );
  }, durationMs);
}
