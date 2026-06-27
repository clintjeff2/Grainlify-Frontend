import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 *
 * Mounted once inside `<BrowserRouter>`. On every pathname change it:
 * 1. Scrolls the window to the top (smooth when the user hasn't requested
 *    reduced motion, instant otherwise).
 * 2. Moves keyboard / screen-reader focus to `<main id="main">`, falling back
 *    to the skip-link target `<a id="skip-target">` and then `document.body`.
 *
 * Hash links (`/path#section`) are intentionally left alone so the browser
 * can scroll to the named anchor as normal.
 *
 * Same-pathname navigations (only search/hash changed) do not trigger a
 * scroll or focus shift.
 * @returns null — renders no DOM nodes; side-effects only.
 */

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    // Don't act on the very first render (initial page load) or when only
    // the hash / search changed without the pathname changing.
    if (prevPathname.current === null) {
      prevPathname.current = pathname;
      return;
    }
    if (prevPathname.current === pathname) {
      prevPathname.current = pathname;
      return;
    }
    prevPathname.current = pathname;

    // If the link targets an in-page anchor, let the browser handle it.
    if (hash) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' });

    // Move focus to the main landmark so keyboard / AT users land in the new
    // page content.  The element must be focusable (tabIndex="-1").
    const target =
      (document.getElementById('main') as HTMLElement | null) ??
      (document.getElementById('skip-target') as HTMLElement | null) ??
      document.body;

    target.focus({ preventScroll: true });
  }, [pathname, hash]);

  return null;
}
