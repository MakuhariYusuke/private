// @ts-nocheck
"use strict";

/**
 * Navigation script to handle:
 * - Scroll to section with offset for fixed header
 * - Highlight current section in nav based on scroll position
 * - Accessibility improvements for skip links
 * - Keyboard navigation support
 */
(function () {
    if (typeof window === 'undefined') return;
    const nav = document.getElementById('mainNav');
    if (!nav) return; // no navigation present on this page

    const DEFAULT_HEADER_HEIGHT = 88;
    const SCROLL_OFFSET = 12;

    // Cache the header element for performance
    const cachedHeader = document.querySelector('.site-header');
    function headerHeight() {
        return cachedHeader ? cachedHeader.offsetHeight : DEFAULT_HEADER_HEIGHT;
    }

    function scrollToTargetHash(hash, opts = {}) {
        if (!hash) return;
        // Validate hash: must start with "#" and contain a valid ID (letters, numbers, underscores, hyphens)
        if (typeof hash !== 'string' || !/^#[A-Za-z0-9\-_]+$/.test(hash)) return;
        const target = document.querySelector(hash);
        if (!target) return;
        const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight() - SCROLL_OFFSET);
        const behavior = opts.behavior || 'auto';
        // Use window.scrollTo with behavior if available
        try {
            window.scrollTo({ top, behavior });
        }
        catch (_) {
            // Fallback for environments not supporting options
            window.scrollTo(0, top);
        }

        // For accessibility: move keyboard focus to the target after scrolling so
        // screen readers announce the section. If the element is not normally focusable,
        // give it a temporary tabindex=-1 and remove it on blur.
        try {
            let addedTempTabindex = false;
            const focusable = (typeof target.tabIndex === 'number' && target.tabIndex >= 0) || /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test((target.tagName || ''));
            if (!focusable) {
                target.setAttribute('tabindex', '-1');
                target.dataset.__tmpTabindex = '1';
                addedTempTabindex = true;
            }
            // ensure focus is moved after scrolling completes for smooth behavior
            const focusNow = () => {
                try {
                    target.focus({ preventScroll: true });
                }
                catch (_) { /* ignore */ }
                if (addedTempTabindex) {
                    target.addEventListener('blur', () => {
                        target.removeAttribute('tabindex');
                        delete target.dataset.__tmpTabindex;
                    }, { once: true });
                }
            };

            if (behavior === 'smooth') {
                // try to respect CSS duration if available, otherwise use 420ms
                let duration = 420;
                try {
                    const root = document.documentElement;
                    const cssDuration = getComputedStyle(root).getPropertyValue('--scroll-duration');
                    if (cssDuration) {
                        const v = cssDuration.trim();
                        if (v.endsWith('ms')) {
                            duration = parseInt(v, 10) || duration;
                        }
                        else if (v.endsWith('s')) {
                            duration = Math.round(parseFloat(v) * 1000) || duration;
                        }
                    }
                }
                catch (_) { /* ignore */ }
                // Focus after expected duration
                setTimeout(focusNow, duration + 20);
            }
            else {
                focusNow();
            }
        }
        catch (_) { /* ignore focus failures */ }
    }

    function handleInitialHash() {
        if (location.hash) {
            // Use a small delay so layout settles
            setTimeout(() => scrollToTargetHash(location.hash, { behavior: 'auto' }), 60);
        }
    }

    function onScroll() {
        const top = window.scrollY + headerHeight() + SCROLL_OFFSET;
        const sections = Array.from(document.querySelectorAll('main [id]'));
        let current = null;
        for (const s of sections) {
            if (s.offsetTop <= top)
                current = '#' + s.id;
        }
        Array.from(nav.getElementsByTagName('a')).forEach((a) => {
            const href = a.getAttribute('href');
            if (href === current) {
                a.classList.add('active');
                a.setAttribute('aria-current', 'true');
            }
            else {
                a.classList.remove('active');
                a.removeAttribute('aria-current');
            }
        });
    }

    // Attach click handlers for nav links to perform offset scrolling
    Array.from(nav.getElementsByTagName('a')).forEach((a) => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href') || '';
            if (href.startsWith('#')) {
                e.preventDefault();
                // scroll and do not change URL hash
                scrollToTargetHash(href, { behavior: 'smooth' });
            }
        });
    });

    // Enhance the skip-link so it uses the same scroll+focus behavior (prevent instant jump)
    const skip = document.querySelector('.skip-link');
    if (skip) {
        skip.addEventListener('click', (e) => {
            const href = skip.getAttribute('href') || '';
            if (href.startsWith('#')) {
                e.preventDefault();
                scrollToTargetHash(href, { behavior: 'smooth' });
            }
        });
    }

    const RESIZE_SCROLL_DELAY = 50;
    const ON_SCROLL_TIMEOUT = 120;

    // Wire up events
    window.addEventListener('resize', () => setTimeout(onScroll, RESIZE_SCROLL_DELAY));
    window.addEventListener('hashchange', () => scrollToTargetHash(location.hash, { behavior: 'smooth' }));
    document.addEventListener('DOMContentLoaded', () => {
        handleInitialHash();
        setTimeout(onScroll, ON_SCROLL_TIMEOUT);
    });

    // initial calls in case script loads after DOMContentLoaded
    handleInitialHash();
    setTimeout(onScroll, ON_SCROLL_TIMEOUT);
})();