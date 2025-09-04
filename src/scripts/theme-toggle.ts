const THEME_KEY = 'site-theme';
const root = document.documentElement;
const mountId = 'themeSelectRoot';

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || 'auto';
}

export function applyTheme(theme: string) {
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function createSelect() {
  const container = document.getElementById(mountId);
  if (!container) return;
  const select = document.createElement('select');
  select.setAttribute('aria-label', '表示テーマ');
  ['auto','light','dark','high-contrast'].forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t === 'auto' ? '端末に従う' : (t === 'high-contrast' ? 'ハイコントラスト' : (t === 'light' ? 'ライト' : 'ダーク'));
    select.appendChild(opt);
  });
  select.value = getStoredTheme();
  select.addEventListener('change', () => {
    const v = select.value;
    localStorage.setItem(THEME_KEY, v);
    applyTheme(v);
  });
  container.appendChild(select);
}

// Initialize on DOMContentLoaded
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const stored = getStoredTheme();
    applyTheme(stored);
    createSelect();

    // watch OS theme changes if in auto
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => {
      if (getStoredTheme() === 'auto') applyTheme('auto');
    });
  });
}
