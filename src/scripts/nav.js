
/**
 * Header-aware anchor scrolling + active nav highlighting
 * Keeps behavior previously embedded inline in Layout.astro
 * @module
 */
(function () {
	if (typeof window === 'undefined') return;
	const nav = document.getElementById('mainNav');
	if (!nav) return;
	const DEFAULT_HEADER_HEIGHT = 88;

	function headerHeight() {
		const header = document.querySelector('.site-header');
		return header ? header.offsetHeight : DEFAULT_HEADER_HEIGHT;
	}

	// スクロール先のハッシュが無効な場合（例: 存在しないIDや不正な文字列）、document.querySelector(hash)は例外を投げることがあります。
	function scrollToTargetHash(hash, opts) {
		if (opts === void 0) { opts = {}; }
		const SCROLL_OFFSET = 12; // Offset for anchor scroll, adjust as needed
		if (!hash) return;
		try {
			const target = document.querySelector(hash);
			if (!target) return;
			const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight() - SCROLL_OFFSET);
			window.scrollTo({ top: top, behavior: opts.behavior || 'auto' });
		} catch (_) {
			// Invalid selector or missing element — ignore.
		}
	}

	function handleInitialHash() {
		if (location.hash) {
			// Delay of 60ms ensures DOM and layout are ready before scrolling to anchor
			setTimeout(function () { scrollToTargetHash(location.hash, { behavior: 'auto' }); }, 60);
		}
	}

	Array.from(nav.getElementsByTagName('a')).forEach(function (a) {
		a.addEventListener('click', function (e) {
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
        const sections = Array.from(document.querySelectorAll('main [id]'));
        const current = sections.reduce(function (acc, s) {
            return s.offsetTop <= top ? '#' + s.id : acc;
        }, null);

        Array.from(nav.getElementsByTagName('a')).forEach(function (a) {
            if (a.getAttribute('href') === current) {
                a.classList.add('active');
                a.setAttribute('aria-current', 'true');
            } else {
                a.classList.remove('active');
                a.removeAttribute('aria-current');
            }
        });
    }

	// 50ms delay helps ensure layout changes after resize are applied before recalculating nav highlight
	window.addEventListener('resize', function () { setTimeout(onScroll, 50); });
	window.addEventListener('hashchange', function () { scrollToTargetHash(location.hash, { behavior: 'smooth' }); });
	window.addEventListener('DOMContentLoaded', function () { handleInitialHash(); setTimeout(onScroll, 120); });

	// initial call in case script runs after DOMContentLoaded
	setTimeout(onScroll, 120);
})();
