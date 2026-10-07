import { useEffect, useRef } from 'react';

/**
 * Calls `onReachEnd` when the returned sentinel element comes within `rootMargin`
 * of the viewport, so the next page is already loading before the customer
 * reaches the end of the list.
 */
export function useInfiniteScroll<T extends HTMLElement>(
  onReachEnd: () => void,
  enabled: boolean,
  rootMargin = '800px 0px'
) {
  const sentinelRef = useRef<T | null>(null);
  const callbackRef = useRef(onReachEnd);
  callbackRef.current = onReachEnd;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) callbackRef.current();
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
