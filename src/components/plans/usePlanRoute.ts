import { useCallback, useEffect, useState } from 'react';

/**
 * Where the app is (US5), kept in the URL so that reloading keeps the plan and links can be shared:
 * `?plan=<id>` – a saved plan; `?new` – a new, unsaved plan (can't be restored after a reload); nothing – start screen.
 * Query parameters work on static hosting (GitHub Pages) without server rewrites.
 */
export interface PlanRoute {
  plan: string | null;
  isNew: boolean;
}

export const START_ROUTE: PlanRoute = { plan: null, isNew: false };

export function readRoute(search: string = window.location.search): PlanRoute {
  const params = new URLSearchParams(search);
  return { plan: params.get('plan') || null, isNew: params.has('new') };
}

export function routeUrl(route: PlanRoute): string {
  const query = route.plan ? `?plan=${encodeURIComponent(route.plan)}` : route.isNew ? '?new' : '';
  return `${window.location.pathname}${query}`;
}

export const sameRoute = (a: PlanRoute, b: PlanRoute) => a.plan === b.plan && a.isNew === b.isNew;

/**
 * The current route and a function to change it (browser history). `onPop` decides about back/forward navigation:
 * return `false` to stay (e.g. to ask about unsaved changes first) – the URL is then restored.
 */
export function usePlanRoute(onPop: (next: PlanRoute) => boolean) {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const listener = () => {
      const next = readRoute();
      if (onPop(next)) setRoute(next);
      else window.history.pushState(null, '', routeUrl(route));
    };
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }, [onPop, route]);

  const navigate = useCallback((next: PlanRoute, { replace = false } = {}) => {
    if (replace) window.history.replaceState(null, '', routeUrl(next));
    else window.history.pushState(null, '', routeUrl(next));
    setRoute(next);
  }, []);

  return { route, navigate };
}
