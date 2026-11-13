import { useSyncExternalStore } from 'react';

/** Phones: below Bootstrap's md breakpoint (docs/plan.md → Phone layout) */
export const PHONE_QUERY = '(max-width: 767.98px)';

/** Whether the media query matches; follows changes (rotation, window resize). `false` where unsupported. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  );
}
