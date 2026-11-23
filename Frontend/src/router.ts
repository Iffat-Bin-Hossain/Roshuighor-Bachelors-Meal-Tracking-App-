import { useEffect, useState } from 'react';

/**
 * Tiny hash router: #/  →  #/home/3  →  #/home/3/mess/7/bazaar
 * Hash routes work on any static host (Vercel) and inside the installed PWA,
 * and the phone's hardware back button moves between screens.
 */
export type MessTab = 'bazaar' | 'meals' | 'deposits' | 'summary';
export const MESS_TABS: MessTab[] = ['bazaar', 'meals', 'deposits', 'summary'];

export type Route =
  | { name: 'homes' }
  | { name: 'home'; homeId: number }
  | { name: 'mess'; homeId: number; messId: number; tab: MessTab };

export const parseRoute = (hash: string): Route => {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'home' && Number(parts[1])) {
    const homeId = Number(parts[1]);
    if (parts[2] === 'mess' && Number(parts[3])) {
      const tab = MESS_TABS.includes(parts[4] as MessTab) ? (parts[4] as MessTab) : 'bazaar';
      return { name: 'mess', homeId, messId: Number(parts[3]), tab };
    }
    return { name: 'home', homeId };
  }
  return { name: 'homes' };
};

export const routePath = (r: Route): string => {
  if (r.name === 'home') return `/home/${r.homeId}`;
  if (r.name === 'mess') return `/home/${r.homeId}/mess/${r.messId}/${r.tab}`;
  return '/';
};

export const parentPath = (r: Route): string | null => {
  if (r.name === 'mess') return `/home/${r.homeId}`;
  if (r.name === 'home') return '/';
  return null;
};

const currentPath = () => window.location.hash.replace(/^#/, '') || '/';

export const navigate = (path: string, opts: { replace?: boolean } = {}) => {
  const url = `${window.location.pathname}${window.location.search}#${path}`;
  if (opts.replace) window.history.replaceState({ prev: history.state?.prev ?? null }, '', url);
  else window.history.pushState({ prev: currentPath() }, '', url);
  window.dispatchEvent(new Event('rosuighor:route'));
};

/** Goes to the parent screen; uses real history when we came from there so the stack stays clean. */
export const goBack = (route: Route) => {
  const parent = parentPath(route);
  if (!parent) return;
  const prev: string | null = history.state?.prev ?? null;
  if (prev === parent) {
    window.history.back();
  } else {
    navigate(parent, { replace: true });
  }
};

export const useRoute = (): Route => {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    window.addEventListener('rosuighor:route', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
      window.removeEventListener('rosuighor:route', update);
    };
  }, []);
  return route;
};
