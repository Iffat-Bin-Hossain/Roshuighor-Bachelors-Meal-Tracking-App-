import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { translations, errorMessage, type Language } from './i18n';
import { apiFetch, getAuthToken, setAuthToken, SESSION_EXPIRED_EVENT } from './api';
import { AppContext, type AppCtx, type User } from './context';
import { useRoute, navigate } from './router';
import { AuthScreen } from './screens/AuthScreen';
import { HomesScreen } from './screens/HomesScreen';
import { HomeScreen } from './screens/HomeScreen';
import { MessScreen } from './screens/MessScreen';
import { JoinInviteForm, InviteBanner, useInvitePreview } from './screens/JoinInvite';
import { AppHeader } from './components/AppHeader';
import { Spinner } from './components/ui';

// PWA install prompt event (not in the TS DOM lib)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const readInviteToken = () => new URLSearchParams(window.location.search).get('invite');

const clearInviteFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
};

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('rosuighor_theme') as 'light' | 'dark') || 'light');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('rosuighor_lang') as Language) || 'bn');
  const t = translations[lang];
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authNotice, setAuthNotice] = useState('');

  const [toastState, setToastState] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  const [inviteToken, setInviteToken] = useState<string | null>(readInviteToken);
  const { preview: invitePreview, notFound: inviteNotFound } = useInvitePreview(inviteToken);

  const route = useRoute();

  /* ── Theme / language persistence ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rosuighor_theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B1117' : '#0E3D2F');
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('rosuighor_lang', lang);
  }, [lang]);

  /* ── Toasts ── */
  const toast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    setToastState({ msg, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastState(null), 4000);
  }, []);
  const showError = useCallback((err: unknown) => toast(errorMessage(translations[langRef.current], err)), [toast]);

  /* ── Session ── */
  const applyUser = useCallback((u: User) => {
    setUser(u);
    if (u.theme_pref) setTheme(u.theme_pref);
    if (u.language_pref) setLang(u.language_pref);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    navigate('/', { replace: true });
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setChecking(false);
      return;
    }
    apiFetch('/auth/me')
      .then((res) => applyUser(res.user))
      .catch(() => setAuthToken(null))
      .finally(() => setChecking(false));
  }, [applyUser]);

  useEffect(() => {
    const onExpired = () => {
      logout();
      setAuthNotice(translations[langRef.current].sessionExpired);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const onLoggedIn = (token: string, u: User) => {
    setAuthToken(token);
    setAuthNotice('');
    applyUser(u);
  };

  /* ── PWA install + connectivity ── */
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const ctx: AppCtx = useMemo(() => ({
    t,
    lang,
    theme,
    user,
    toggleLang: () => {
      const next = lang === 'bn' ? 'en' : 'bn';
      setLang(next);
      if (user) apiFetch('/auth/preferences', { method: 'PATCH', body: JSON.stringify({ language_pref: next }) }).catch(() => {});
    },
    toggleTheme: () => {
      const next = theme === 'light' ? 'dark' : 'light';
      setTheme(next);
      if (user) apiFetch('/auth/preferences', { method: 'PATCH', body: JSON.stringify({ theme_pref: next }) }).catch(() => {});
    },
    logout,
    toast,
    showError,
    canInstall: Boolean(installPrompt),
    install: async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    }
  }), [t, lang, theme, user, logout, toast, showError, installPrompt]);

  const dismissInvite = () => {
    setInviteToken(null);
    clearInviteFromUrl();
  };

  /* ── Screen selection ── */
  let screen;
  if (checking) {
    screen = (
      <div className="splash">
        <img src={theme === 'dark' ? '/logo-dark-transparent.png' : '/logo-transparent.png'} alt="রসুইঘর" />
      </div>
    );
  } else if (!user) {
    screen = (
      <AuthScreen
        onLoggedIn={onLoggedIn}
        initialEmail={invitePreview?.email}
        initialError={authNotice}
        banner={invitePreview ? <InviteBanner preview={invitePreview} /> : undefined}
      />
    );
  } else if (inviteToken && !inviteNotFound) {
    // Signed in and opened an invitation link: confirm with the invited email + code from the email
    screen = (
      <>
        <AppHeader title={t.joinInviteTitle} onBack={dismissInvite} />
        <main className="page page-narrow">
          {!invitePreview ? (
            <div className="loading-block"><Spinner size={22} /></div>
          ) : (
            <div className="card stack-16">
              <InviteBanner preview={invitePreview} />
              {invitePreview.status === 'pending' ? (
                <JoinInviteForm
                  token={inviteToken}
                  initialEmail={invitePreview.email}
                  onJoined={(homeId) => {
                    dismissInvite();
                    toast(t.joinedHome, 'success');
                    navigate(`/home/${homeId}`);
                  }}
                />
              ) : (
                <button type="button" className="btn btn-primary btn-block" onClick={dismissInvite}>{t.goHome}</button>
              )}
            </div>
          )}
        </main>
      </>
    );
  } else if (route.name === 'mess') {
    screen = <MessScreen key={route.messId} route={route} />;
  } else if (route.name === 'home') {
    screen = <HomeScreen key={route.homeId} route={route} />;
  } else {
    screen = <HomesScreen />;
  }

  return (
    <AppContext.Provider value={ctx}>
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={14} /> {t.offlineNotice}
        </div>
      )}
      {screen}
      {toastState && (
        <div className={`toast toast-${toastState.type}`} role="alert" onClick={() => setToastState(null)}>
          {toastState.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastState.msg}</span>
        </div>
      )}
    </AppContext.Provider>
  );
}

export default App;
