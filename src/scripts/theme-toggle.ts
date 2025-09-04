// TypeScript refactor of public/scripts/theme-toggle.js
// This file is designed to replace the runtime JS after the project's build step.

type Theme = 'auto' | 'light' | 'dark' | 'high-contrast';

const THEME_KEY = 'site-theme';
const FONT_KEY = 'site-font-size';
const root = document.documentElement;
const mountId = 'themeSelectRoot';

function getStoredTheme(): Theme { return (localStorage.getItem(THEME_KEY) as Theme) || 'auto'; }
function getStoredFont(): string { return localStorage.getItem(FONT_KEY) || 'normal'; }

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 80) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}

function setAttributeTheme(theme: Theme) {
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

function toggleLogos(theme: Theme) {
  const bl = Array.from(document.querySelectorAll<HTMLElement>('.brand-light'));
  const bd = Array.from(document.querySelectorAll<HTMLElement>('.brand-dark'));
  const hll = Array.from(document.querySelectorAll<HTMLElement>('.hero-logo-light'));
  const hdl = Array.from(document.querySelectorAll<HTMLElement>('.hero-logo-dark'));
  let useDark = false;
  if (theme === 'auto') {
    useDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } else {
    useDark = (theme === 'dark');
  }
  bl.forEach(el => el.style.display = useDark ? 'none' : 'inline-block');
  bd.forEach(el => el.style.display = useDark ? 'inline-block' : 'none');
  hll.forEach(el => el.style.display = useDark ? 'none' : 'inline-block');
  hdl.forEach(el => el.style.display = useDark ? 'inline-block' : 'none');
}

const headerEl = () => document.querySelector('.site-header') as HTMLElement | null;
function setHeaderHeight() {
  const hEl = headerEl();
  const h = hEl ? Math.round(hEl.getBoundingClientRect().height) : 64;
  root.style.setProperty('--header-height', h + 'px');
}

let roObserver: ResizeObserver | null = null;
function observeHeader() {
  const hEl = headerEl();
  if (!hEl) return;
  if ('ResizeObserver' in window) {
    const deb = debounce(() => setHeaderHeight(), 80);
    roObserver = new ResizeObserver(deb);
    roObserver.observe(hEl);
    (window as any).__siteHeaderResizeObserver = roObserver;
  } else {
    (window as any).addEventListener('resize', setHeaderHeight);
  }
}

function applyTheme(theme: Theme) {
  setAttributeTheme(theme);
  toggleLogos(theme);
  // prefer baseline when switching to dark
  window.requestAnimationFrame(() => {
    if (theme === 'dark' && (window as any).__headerBaseline) {
      root.style.setProperty('--header-height', (window as any).__headerBaseline + 'px');
      // force reflow
      void document.body.offsetHeight;
      setHeaderHeight();
    } else {
      setHeaderHeight();
    }
    // schedule delayed recalculations
    setTimeout(() => {
      if (theme === 'dark' && (window as any).__headerBaseline) root.style.setProperty('--header-height', (window as any).__headerBaseline + 'px');
      else setHeaderHeight();
    }, 120);
    setTimeout(() => {
      if (theme === 'dark' && (window as any).__headerBaseline) root.style.setProperty('--header-height', (window as any).__headerBaseline + 'px');
      else setHeaderHeight();
    }, 360);
  });
}

function applyFontSize(size: string) {
  root.setAttribute('data-font-size', size);
  requestAnimationFrame(setHeaderHeight);
}

function createSelect() {
  const container = document.getElementById(mountId);
  if (!container) return;

  let themeSelect = container.querySelector<HTMLSelectElement>('select[aria-label="表示テーマ"]');
  if (!themeSelect) {
    themeSelect = document.createElement('select');
    themeSelect.setAttribute('aria-label', '表示テーマ');
    const items: [Theme, string][] = [['auto','自動'],['light','ライト'],['dark','ダーク'],['high-contrast','ﾊｲｺﾝﾄﾗｽﾄ']];
    items.forEach(([v,label]) => {
      const opt = document.createElement('option'); opt.value = v; opt.textContent = label; themeSelect!.appendChild(opt);
    });
    themeSelect.value = getStoredTheme();
    themeSelect.addEventListener('change', () => {
      const v = themeSelect!.value as Theme;
      try { localStorage.setItem(THEME_KEY, v); } catch(e) {}
      applyTheme(v);
    });
    container.appendChild(themeSelect);
  }

  const fontRoot = document.getElementById('fontSizeRoot') || container;
  let fontSelect = fontRoot.querySelector<HTMLSelectElement>('select.font-size-control');
  if (!fontSelect) {
    fontSelect = document.createElement('select');
    fontSelect.setAttribute('aria-label', '文字サイズ');
    ([['small','小'],['normal','標準'],['large','大'],['xlarge','特大']] as [string,string][]).forEach(([v,label])=>{
      const o = document.createElement('option'); o.value = v; o.textContent = label; fontSelect!.appendChild(o);
    });
    fontSelect.className = 'font-size-control';
    fontSelect.value = getStoredFont();
    fontSelect.addEventListener('change', () => { try{ localStorage.setItem(FONT_KEY, fontSelect!.value) }catch(e){}; applyFontSize(fontSelect!.value); });
    fontRoot.appendChild(fontSelect);
  }
}

// Observe attribute changes to root to capture programmatic theme changes (tests etc.)
function observeThemeAttr() {
  try {
    const mo = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m as any).attributeName === 'data-theme') {
          const currentTheme = root.getAttribute('data-theme') as Theme || 'auto';
          if (currentTheme !== 'dark') {
            setTimeout(()=>{ setHeaderHeight(); const hEl = headerEl(); const h = hEl ? Math.round(hEl.getBoundingClientRect().height) : 64; (window as any).__headerBaseline = h; }, 120);
            setTimeout(()=>{ setHeaderHeight(); const hEl = headerEl(); const h = hEl ? Math.round(hEl.getBoundingClientRect().height) : 64; (window as any).__headerBaseline = h; }, 360);
          } else {
            if ((window as any).__headerBaseline) {
              root.style.setProperty('--header-height', (window as any).__headerBaseline + 'px');
              void document.body.offsetHeight; setHeaderHeight();
            } else setHeaderHeight();
          }
        }
      }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    (window as any).__siteThemeAttrObserver = mo;
  } catch(e) { /* ignore */ }
}

export function initThemeToggle() {
  const current = getStoredTheme();
  applyTheme(current);
  applyFontSize(getStoredFont());
  createSelect();
  setHeaderHeight();
  setTimeout(()=>{
    setHeaderHeight();
    if (current !== 'dark') {
      const hEl = headerEl(); const h = hEl ? Math.round(hEl.getBoundingClientRect().height) : 64; (window as any).__headerBaseline = h;
    }
  }, 120);
  setTimeout(()=>{
    setHeaderHeight();
    if (current !== 'dark') {
      const hEl = headerEl(); const h = hEl ? Math.round(hEl.getBoundingClientRect().height) : 64; (window as any).__headerBaseline = h;
    }
  }, 360);
  observeHeader();
  observeThemeAttr();

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq) {
    const mqHandler = () => { if (getStoredTheme() === 'auto') applyTheme('auto'); };
    if ((mq as any).addEventListener) (mq as any).addEventListener('change', mqHandler);
    else if ((mq as any).addListener) (mq as any).addListener(mqHandler);
  }
}

// Auto-init on DOMContentLoaded if this script is bundled/loaded
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => initThemeToggle());
}
