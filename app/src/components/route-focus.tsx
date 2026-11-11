'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const MAIN_ID = 'contenu';

/**
 * After a client-side navigation, moves keyboard and screen-reader focus to the new page:
 * its first visible heading, or the main content while that heading is still streaming.
 * The first load is left to the browser (focus starts at the document, skip link first).
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const main = document.getElementById(MAIN_ID);
    if (!main) return;

    const focusTitle = () => {
      const title = main.querySelector('h1');
      if (!title || title.getClientRects().length === 0) return false;
      if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
      // Next.js already restores the scroll position of the new page; focus must not move it.
      title.focus({ preventScroll: true });
      return true;
    };
    if (focusTitle()) return;

    // The page is still streaming (loading skeleton): hold focus on the main content, then
    // hand it to the heading when it arrives, unless the reader has already moved on.
    main.focus({ preventScroll: true });
    const observer = new MutationObserver(() => {
      const active = document.activeElement;
      if (active !== main && active !== document.body) stop();
      else if (focusTitle()) stop();
    });
    const timer = window.setTimeout(() => stop(), 10000);
    function stop() {
      observer.disconnect();
      window.clearTimeout(timer);
    }
    observer.observe(main, { childList: true, subtree: true });
    return stop;
  }, [pathname]);

  return null;
}
