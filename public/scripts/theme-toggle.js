// @ts-nocheck
"use strict";
(function () {
  const DEFAULT_HEADER_HEIGHT = 64;
  const THEME_KEY = 'site-theme';
  const FONT_KEY = 'site-font-size';
  const root = document.documentElement;
  const mountId = 'themeSelectRoot';

  let cachedTheme = null;
  const getStoredTheme = () => cachedTheme !== null ? cachedTheme : (cachedTheme = localStorage.getItem(THEME_KEY) || 'auto');
  const getStoredFont = () => localStorage.getItem(FONT_KEY) || 'normal';

  function logos() {
    return {
      bl: Array.from(document.querySelectorAll('.brand-light')),
      bd: Array.from(document.querySelectorAll('.brand-dark')),
      hll: Array.from(document.querySelectorAll('.hero-logo-light')),
      hdl: Array.from(document.querySelectorAll('.hero-logo-dark')),
    };
  }

  function toggleLogos(theme) {
    const useDark = theme === 'dark' || (theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const L = logos();
    L.bl.forEach(el => { if (el && el.style) el.style.display = useDark ? 'none' : 'inline-block'; });
    L.bd.forEach(el => { if (el && el.style) el.style.display = useDark ? 'inline-block' : 'none'; });
    L.hll.forEach(el => { if (el && el.style) el.style.display = useDark ? 'none' : 'inline-block'; });
    L.hdl.forEach(el => { if (el && el.style) el.style.display = useDark ? 'inline-block' : 'none'; });
  }

  function applyTheme(theme) {
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    toggleLogos(theme);
    requestAnimationFrame(() => {
      if (theme === 'dark' && window.__headerBaseline) root.style.setProperty('--header-height', window.__headerBaseline + 'px');
      setHeaderHeight();
      setTimeout(setHeaderHeight, 360);
    });
  }

  function applyFontSize(size) {
    root.setAttribute('data-font-size', size);
    requestAnimationFrame(setHeaderHeight);
  }

  function getHeaderElement() { return document.querySelector('.site-header'); }

  function updateHeaderHeight() {
    const hEl = getHeaderElement();
    const h = hEl ? Math.round(hEl.getBoundingClientRect().height) : DEFAULT_HEADER_HEIGHT;
    root.style.setProperty('--header-height', h + 'px');
    return h;
  }

  function setupHeaderResizeObserver() {
    const hEl = getHeaderElement();
    if (!hEl) return;
    if (window.__siteHeaderResizeObserver) return;
    const ro = new ResizeObserver(() => updateHeaderHeight());
    ro.observe(hEl);
    window.__siteHeaderResizeObserver = ro;
    window.addEventListener('unload', () => { try { ro.disconnect(); } catch (_) { } });
  }

  function setHeaderHeight() {
    const h = updateHeaderHeight();
    const current = getStoredTheme();
    if (current !== 'dark') window.__headerBaseline = h;
    setupHeaderResizeObserver();
  }

  function createSelects() {
    const container = document.getElementById(mountId);
    if (!container) return;
    // Theme select
    let themeSelect = container.querySelector('select[aria-label="表示テーマ"]');
    if (!themeSelect) {
      themeSelect = document.createElement('select');
      themeSelect.setAttribute('aria-label', '表示テーマ');
      [['auto', '自動'], ['light', 'ライト'], ['dark', 'ダーク'], ['high-contrast', 'ﾊｲｺﾝﾄﾗｽﾄ']].forEach(([v, label]) => {
        const opt = document.createElement('option'); opt.value = v; opt.textContent = label; themeSelect.appendChild(opt);
      });
      themeSelect.id = 'themeSelect';
      themeSelect.value = getStoredTheme();
      themeSelect.addEventListener('change', () => {
        const v = themeSelect.value;
        localStorage.setItem(THEME_KEY, v);
        cachedTheme = v;
        applyTheme(v);
      });
      container.appendChild(themeSelect);
    }

    // Font size select
    const fontRoot = document.getElementById('fontSizeRoot') || container;
    let fontSelect = fontRoot.querySelector('select.font-size-control');
    if (!fontSelect) {
      fontSelect = document.createElement('select');
      fontSelect.setAttribute('aria-label', '文字サイズ');
      [['small', '小'], ['normal', '標準'], ['large', '大'], ['xlarge', '特大']].forEach(([v, label]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = label; fontSelect.appendChild(o);
      });
      fontSelect.id = 'fontSizeSelect';
      fontSelect.value = getStoredFont();
      fontSelect.addEventListener('change', () => { localStorage.setItem(FONT_KEY, fontSelect.value); applyFontSize(fontSelect.value); });
      fontRoot.appendChild(fontSelect);
    }
  }

  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      createSelects();
      const t = getStoredTheme();
      applyTheme(t);
      applyFontSize(getStoredFont());

      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const mqHandler = () => { if (getStoredTheme() === 'auto') applyTheme('auto'); };
      addMediaQueryListener(mq, mqHandler);

      try {
        const mo = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'data-theme') applyTheme(getStoredTheme());
          }
        });
        mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        window.__siteThemeAttrObserver = mo;
      } catch (_) { /* ignore */ }

      setHeaderHeight();
    });
  }

  function addMediaQueryListener(mq, handler) {
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }
})();


/**
 * Utility function for matchMedia event registration.
 * @param {MediaQueryList} mq - The media query list object (from window.matchMedia).
 * @param {Function} handler - The callback function to execute on media query change.
 * Example:
 *   const mq = window.matchMedia('(prefers-color-scheme: dark)');
 *   addMediaQueryListener(mq, () => { /* handle theme change * / });
 */
function addMediaQueryListener(mq, handler) {
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else if (mq.addListener) mq.addListener(handler);
}
