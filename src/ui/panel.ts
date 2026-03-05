import type { PhysicsMode } from '../types';
import {
  REALISTIC_MODE,
  GOOFY_MODE,
  DEFAULT_DOLL_COUNT,
  MIN_DOLL_COUNT,
  MAX_DOLL_COUNT,
} from '../constants';

/** Callbacks for panel control interactions */
export interface PanelCallbacks {
  onDollCountChange: (count: number) => void;
  onModeChange: (mode: PhysicsMode) => void;
  onReset: () => void;
}

/** Return type for createPanel */
export interface PanelHandle {
  element: HTMLDivElement;
  toggle: () => void;
}

/**
 * Creates a slide-out control panel with:
 * - Doll count selector (2-5)
 * - Physics mode toggle (Realistic / Goofy)
 * - Reset scene button
 *
 * All styles are inline for a self-contained debug UI.
 */
export function createPanel(
  container: HTMLElement,
  callbacks: PanelCallbacks,
): PanelHandle {
  let isOpen = false;
  let activeDollCount = DEFAULT_DOLL_COUNT;
  let activeModeName: 'realistic' | 'goofy' = 'realistic';

  // --- Panel root ---
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '260px',
    height: '100vh',
    background: 'rgba(15, 15, 30, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    zIndex: '500',
    padding: '70px 20px 20px 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#ffffff',
    overflowY: 'auto',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>);

  // --- Section builder ---
  function createSectionLabel(text: string): HTMLDivElement {
    const label = document.createElement('div');
    label.textContent = text;
    Object.assign(label.style, {
      fontSize: '12px',
      fontWeight: '600',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      color: 'rgba(255, 255, 255, 0.5)',
      marginBottom: '12px',
    } as Partial<CSSStyleDeclaration>);
    return label;
  }

  function createSection(): HTMLDivElement {
    const section = document.createElement('div');
    Object.assign(section.style, {
      marginBottom: '28px',
    } as Partial<CSSStyleDeclaration>);
    return section;
  }

  // --- Common button styles ---
  const BASE_BUTTON_STYLES: Partial<CSSStyleDeclaration> = {
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    touchAction: 'manipulation',
    transition: 'background 0.15s ease, color 0.15s ease, transform 0.1s ease',
  };

  // --- Doll Count Section ---
  const dollSection = createSection();
  dollSection.appendChild(createSectionLabel('Dolls'));

  const dollRow = document.createElement('div');
  Object.assign(dollRow.style, {
    display: 'flex',
    gap: '8px',
  } as Partial<CSSStyleDeclaration>);

  const dollButtons: HTMLButtonElement[] = [];

  for (let count = MIN_DOLL_COUNT; count <= MAX_DOLL_COUNT; count++) {
    const btn = document.createElement('button');
    btn.textContent = String(count);
    btn.type = 'button';
    const isActive = count === activeDollCount;
    Object.assign(btn.style, {
      ...BASE_BUTTON_STYLES,
      flex: '1',
      height: '44px',
      background: isActive ? '#3498db' : 'rgba(255, 255, 255, 0.1)',
      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
    } as Partial<CSSStyleDeclaration>);

    btn.addEventListener('pointerdown', () => {
      btn.style.transform = 'scale(0.93)';
    });
    btn.addEventListener('pointerup', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeDollCount = count;
      updateDollButtons();
      callbacks.onDollCountChange(count);
    });

    dollButtons.push(btn);
    dollRow.appendChild(btn);
  }

  function updateDollButtons(): void {
    for (let i = 0; i < dollButtons.length; i++) {
      const count = MIN_DOLL_COUNT + i;
      const isActive = count === activeDollCount;
      dollButtons[i].style.background = isActive
        ? '#3498db'
        : 'rgba(255, 255, 255, 0.1)';
      dollButtons[i].style.color = isActive
        ? '#ffffff'
        : 'rgba(255, 255, 255, 0.7)';
    }
  }

  dollSection.appendChild(dollRow);
  panel.appendChild(dollSection);

  // --- Mode Toggle Section ---
  const modeSection = createSection();
  modeSection.appendChild(createSectionLabel('Mode'));

  const modeRow = document.createElement('div');
  Object.assign(modeRow.style, {
    display: 'flex',
    gap: '0',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  } as Partial<CSSStyleDeclaration>);

  const modes: Array<{ label: string; mode: PhysicsMode; name: 'realistic' | 'goofy' }> = [
    { label: 'Realistic', mode: REALISTIC_MODE, name: 'realistic' },
    { label: 'Goofy', mode: GOOFY_MODE, name: 'goofy' },
  ];

  const modeButtons: HTMLButtonElement[] = [];

  for (const modeOption of modes) {
    const btn = document.createElement('button');
    btn.textContent = modeOption.label;
    btn.type = 'button';
    const isActive = modeOption.name === activeModeName;
    Object.assign(btn.style, {
      ...BASE_BUTTON_STYLES,
      flex: '1',
      height: '44px',
      borderRadius: '0',
      background: isActive ? '#3498db' : 'transparent',
      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
    } as Partial<CSSStyleDeclaration>);

    btn.addEventListener('pointerdown', () => {
      btn.style.transform = 'scale(0.97)';
    });
    btn.addEventListener('pointerup', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeModeName = modeOption.name;
      updateModeButtons();
      callbacks.onModeChange(modeOption.mode);
    });

    modeButtons.push(btn);
    modeRow.appendChild(btn);
  }

  function updateModeButtons(): void {
    for (let i = 0; i < modeButtons.length; i++) {
      const isActive = modes[i].name === activeModeName;
      modeButtons[i].style.background = isActive
        ? '#3498db'
        : 'transparent';
      modeButtons[i].style.color = isActive
        ? '#ffffff'
        : 'rgba(255, 255, 255, 0.7)';
    }
  }

  modeSection.appendChild(modeRow);
  panel.appendChild(modeSection);

  // --- Reset Section ---
  const resetSection = createSection();
  resetSection.appendChild(createSectionLabel('Actions'));

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset Scene';
  resetBtn.type = 'button';
  Object.assign(resetBtn.style, {
    ...BASE_BUTTON_STYLES,
    width: '100%',
    height: '44px',
    background: 'transparent',
    color: '#e74c3c',
    border: '1px solid rgba(231, 76, 60, 0.5)',
  } as Partial<CSSStyleDeclaration>);

  resetBtn.addEventListener('pointerenter', () => {
    resetBtn.style.background = 'rgba(231, 76, 60, 0.15)';
  });
  resetBtn.addEventListener('pointerleave', () => {
    resetBtn.style.background = 'transparent';
    resetBtn.style.transform = 'scale(1)';
  });
  resetBtn.addEventListener('pointerdown', () => {
    resetBtn.style.transform = 'scale(0.97)';
  });
  resetBtn.addEventListener('pointerup', () => {
    resetBtn.style.transform = 'scale(1)';
  });
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onReset();
  });

  resetSection.appendChild(resetBtn);
  panel.appendChild(resetSection);

  // --- Toggle function ---
  function togglePanel(): void {
    isOpen = !isOpen;
    panel.style.transform = isOpen ? 'translateX(0)' : 'translateX(-100%)';
  }

  container.appendChild(panel);

  return {
    element: panel,
    toggle: togglePanel,
  };
}
