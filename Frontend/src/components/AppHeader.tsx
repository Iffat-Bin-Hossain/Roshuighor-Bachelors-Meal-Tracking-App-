import { ArrowLeft, Globe, Moon, Sun, LogOut, Download } from 'lucide-react';
import { useApp } from '../context';
import { navigate } from '../router';

/**
 * Clean top bar: [back] [logo] [title] ........ [install] [language] [theme] [avatar] [logout]
 * No dropdowns — navigation happens through screens and the back button.
 */
export function AppHeader(props: { title?: string; subtitle?: string; onBack?: () => void }) {
  const { t, lang, theme, user, toggleLang, toggleTheme, logout, canInstall, install } = useApp();

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="header-left">
          {props.onBack && (
            <button type="button" className="icon-btn back-btn" onClick={props.onBack} aria-label={t.back} title={t.back}>
              <ArrowLeft size={20} />
              <span className="back-label">{t.back}</span>
            </button>
          )}
          <button type="button" className="header-logo" onClick={() => navigate('/')} aria-label={t.myHomes}>
            <img src={theme === 'dark' ? '/logo-dark-transparent.png' : '/logo-transparent.png'} alt="রসুইঘর" />
          </button>
          {props.title && (
            <div className="header-title">
              <h1>{props.title}</h1>
              {props.subtitle && <p>{props.subtitle}</p>}
            </div>
          )}
        </div>

        <div className="header-actions">
          {canInstall && (
            <button type="button" className="chip-btn hide-sm" onClick={install} title={t.installApp}>
              <Download size={15} /> <span>{t.installApp}</span>
            </button>
          )}
          <button type="button" className="chip-btn" onClick={toggleLang} title={t.changeLanguage} aria-label={t.changeLanguage}>
            <Globe size={15} /> <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>
          <button type="button" className="icon-btn" onClick={toggleTheme} title={t.toggleTheme} aria-label={t.toggleTheme}>
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          {user && (
            <span className="avatar-chip hide-sm" title={user.email}>
              <span className="avatar">{user.name.trim().charAt(0)}</span>
              <span className="avatar-name">{user.name.split(' ')[0]}</span>
            </span>
          )}
          <button type="button" className="icon-btn logout-btn" onClick={logout} title={t.logout} aria-label={t.logout}>
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
