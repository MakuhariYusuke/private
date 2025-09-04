// TypeScript refactor of src/scripts/nav.js

(() => {
  if (typeof window === 'undefined') return;
  const nav = document.getElementById('mainNav');
  if (!nav) return; // no navigation present on this page
  const navEl = nav as HTMLElement;

  const DEFAULT_HEADER_HEIGHT = 88;

  function headerHeight(): number {
    const header = document.querySelector('.site-header') as HTMLElement | null;
    return header ? header.offsetHeight : DEFAULT_HEADER_HEIGHT;
  }

  function scrollToTargetHash(hash: string, opts: { behavior?: ScrollBehavior } = {}) {
    const SCROLL_OFFSET = 12;
    if (!hash) return;
    try {
      const target = document.querySelector(hash) as HTMLElement | null;
      if (!target) return;
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight() - SCROLL_OFFSET);
      window.scrollTo({ top, behavior: opts.behavior || 'auto' });
    } catch (_) {
      // ignore invalid selectors
    }
  }

  function handleInitialHash() {
    if (location.hash) {
      setTimeout(() => scrollToTargetHash(location.hash, { behavior: 'auto' }), 60);
    }
  }

  Array.from(navEl.getElementsByTagName('a')).forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#')) {
        e.preventDefault();
        history.pushState(null, '', href);
        scrollToTargetHash(href, { behavior: 'smooth' });
      }
    });
  });

  const SCROLL_OFFSET = 8;
  function onScroll() {
    const top = window.scrollY + headerHeight() + SCROLL_OFFSET;
    const sections = Array.from(document.querySelectorAll('main [id]')) as HTMLElement[];
    let current: string | null = null;
    for (const s of sections) {
      if (s.offsetTop <= top) current = '#' + s.id;
    }

  Array.from(navEl.getElementsByTagName('a')).forEach((a) => {
      if (a.getAttribute('href') === current) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'true');
      } else {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    });
  }

  (window as any).addEventListener('resize', () => setTimeout(onScroll, 50));
  (window as any).addEventListener('hashchange', () => scrollToTargetHash(location.hash, { behavior: 'smooth' }));
  (window as any).addEventListener('DOMContentLoaded', () => { handleInitialHash(); setTimeout(onScroll, 120); });

  // initial call
  setTimeout(onScroll, 120);
})();
