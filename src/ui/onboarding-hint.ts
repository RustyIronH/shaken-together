/**
 * Onboarding hint overlay: "Shake your phone!" or "Hold the button to shake!"
 * Auto-fades after 4 seconds or immediately on first shake detection.
 */

export interface OnboardingHintHandle {
  dismiss: () => void;
}

/**
 * Shows an onboarding hint overlay.
 *
 * @param container - DOM element to append hint into (typically ui-root)
 * @param fallbackMode - If true, shows "Hold the button to shake!" instead of "Shake your phone!"
 * @returns Handle with dismiss() to immediately fade the hint
 */
export function showOnboardingHint(
  container: HTMLElement,
  fallbackMode: boolean,
): OnboardingHintHandle {
  const hint = document.createElement('div');
  hint.id = 'onboarding-hint';
  hint.textContent = fallbackMode
    ? 'Hold the button to shake!'
    : 'Shake your phone!';

  Object.assign(hint.style, {
    position: 'fixed',
    top: '25%',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 28px',
    fontSize: '20px',
    fontWeight: '600',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(6px)',
    borderRadius: '16px',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: '60',
    opacity: '1',
    transition: 'opacity 0.6s ease',
    whiteSpace: 'nowrap',
  });

  container.appendChild(hint);

  let dismissed = false;

  function fadeOut(): void {
    if (dismissed) return;
    dismissed = true;
    hint.style.opacity = '0';
    hint.addEventListener('transitionend', () => {
      if (hint.parentNode) {
        hint.parentNode.removeChild(hint);
      }
    }, { once: true });
  }

  // Auto-dismiss after 4 seconds
  const timer = setTimeout(fadeOut, 4000);

  return {
    dismiss: () => {
      clearTimeout(timer);
      fadeOut();
    },
  };
}
