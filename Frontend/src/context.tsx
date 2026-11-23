import { createContext, useContext, useEffect, useState } from 'react';
import type { Dict, Language } from './i18n';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  language_pref: Language;
  theme_pref: 'light' | 'dark';
}

export interface AppCtx {
  t: Dict;
  lang: Language;
  theme: 'light' | 'dark';
  user: User | null;
  toggleLang: () => void;
  toggleTheme: () => void;
  logout: () => void;
  toast: (msg: string, type?: 'error' | 'success') => void;
  showError: (err: unknown) => void;
  canInstall: boolean;
  install: () => void;
}

export const AppContext = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(AppContext);

/** true when the viewport matches the media query (re-renders on resize/rotation). */
export const useMediaQuery = (q: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [q]);
  return matches;
};
