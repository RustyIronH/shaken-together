/**
 * Creates a hamburger menu icon button that toggles the control panel.
 * Positioned fixed in the top-left corner, above the canvas and panel.
 */
export function createHamburger(
  container: HTMLElement,
  onToggle: () => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.setAttribute('aria-label', 'Toggle menu');
  button.type = 'button';

  // Apply inline styles for self-contained debug UI
  Object.assign(button.style, {
    position: 'fixed',
    top: '12px',
    left: '12px',
    zIndex: '1000',
    width: '44px',
    height: '44px',
    padding: '0',
    border: 'none',
    borderRadius: '8px',
    background: 'rgba(15, 15, 30, 0.7)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    touchAction: 'manipulation',
  } as Partial<CSSStyleDeclaration>);

  // Create 3 horizontal lines
  for (let i = 0; i < 3; i++) {
    const line = document.createElement('span');
    Object.assign(line.style, {
      display: 'block',
      width: '22px',
      height: '2px',
      background: '#ffffff',
      borderRadius: '1px',
      pointerEvents: 'none',
    } as Partial<CSSStyleDeclaration>);
    button.appendChild(line);
  }

  // Hover/active feedback
  button.addEventListener('pointerenter', () => {
    button.style.background = 'rgba(15, 15, 30, 0.9)';
  });
  button.addEventListener('pointerleave', () => {
    button.style.background = 'rgba(15, 15, 30, 0.7)';
  });
  button.addEventListener('pointerdown', () => {
    button.style.transform = 'scale(0.92)';
  });
  button.addEventListener('pointerup', () => {
    button.style.transform = 'scale(1)';
  });

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    onToggle();
  });

  container.appendChild(button);
  return button;
}
