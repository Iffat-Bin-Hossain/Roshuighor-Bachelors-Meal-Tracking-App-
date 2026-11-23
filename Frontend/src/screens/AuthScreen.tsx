import React, { useEffect, useState, type ReactNode } from 'react';
import { Globe, Moon, Sun, ShieldCheck, Mail, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { useApp, type User } from '../context';
import { apiFetch, type ApiError } from '../api';
import { errorMessage } from '../i18n';
import { Field, PasswordInput, CodeInput, ResendRow, Spinner } from '../components/ui';

type AuthMode = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset';

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NAME_REGEX = /^[\p{L}\p{M}\s.'-]+$/u;
const isStrongPassword = (pw: string) => pw.length >= 8 && /\p{L}/u.test(pw) && /\d/.test(pw);
const RESEND_SECONDS = 60;

export function AuthScreen(props: {
  onLoggedIn: (token: string, user: User) => void;
  initialEmail?: string;
  initialMode?: 'signin' | 'signup';
  initialError?: string;
  banner?: ReactNode;
}) {
  const { t, lang, theme, toggleLang, toggleTheme, canInstall, install } = useApp();

  const [mode, setMode] = useState<AuthMode>(props.initialMode || 'signin');
  const [form, setForm] = useState({ name: '', email: props.initialEmail || '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(props.initialError || '');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [reset, setReset] = useState({ code: '', password: '', confirmPassword: '' });
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (props.initialEmail) setForm((f) => ({ ...f, email: props.initialEmail! }));
  }, [props.initialEmail]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setError('');
    setInfo('');
  };

  const goToVerify = (email: string, message: string, codeSent = true) => {
    setPendingEmail(email);
    setOtp('');
    setMode('verify');
    setError('');
    setInfo(message);
    if (codeSent) setResendIn(RESEND_SECONDS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) return setError(t.errors.INVALID_EMAIL);

    if (mode === 'signup') {
      const name = form.name.trim();
      if (!name) return setError(t.nameRequired);
      if (name.length < 2) return setError(t.nameTooShort);
      if (!NAME_REGEX.test(name)) return setError(t.nameInvalidChars);
      if (!isStrongPassword(form.password)) return setError(t.errors.WEAK_PASSWORD);
      if (form.password !== form.confirmPassword) return setError(t.passwordMismatch);
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await apiFetch('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            email,
            phone: form.phone.trim(),
            password: form.password,
            language_pref: lang,
            theme_pref: theme
          })
        });
        setForm((f) => ({ ...f, password: '', confirmPassword: '' }));
        goToVerify(email, t.checkSpam);
        return;
      }
      const res = await apiFetch('/auth/signin', { method: 'POST', body: JSON.stringify({ email, password: form.password }) });
      props.onLoggedIn(res.token, res.user);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'EMAIL_NOT_VERIFIED') {
        goToVerify(apiErr.data?.email || email, t.verifyNeeded, Boolean(apiErr.data?.codeSent));
        return;
      }
      setError(errorMessage(t, err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp)) return setError(t.errors.INVALID_CODE);
    setLoading(true);
    try {
      const res = await apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email: pendingEmail, code: otp }) });
      props.onLoggedIn(res.token, res.user);
    } catch (err) {
      setError(errorMessage(t, err));
      if ((err as ApiError).code === 'ALREADY_VERIFIED') switchMode('signin');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || !pendingEmail) return;
    setError('');
    setInfo('');
    try {
      const endpoint = mode === 'reset' ? '/auth/forgot-password' : '/auth/resend-verification';
      await apiFetch(endpoint, { method: 'POST', body: JSON.stringify({ email: pendingEmail }) });
      setInfo(t.codeResent);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      const retry = (err as ApiError).data?.retryAfter;
      if (retry) setResendIn(retry);
      setError(errorMessage(t, err));
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) return setError(t.errors.INVALID_EMAIL);
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setPendingEmail(email);
      setReset({ code: '', password: '', confirmPassword: '' });
      setMode('reset');
      setInfo(`${t.resetCodeSent} ${t.checkSpam}`);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'RESEND_COOLDOWN') {
        setPendingEmail(email);
        setMode('reset');
        setResendIn(apiErr.data?.retryAfter || RESEND_SECONDS);
        return;
      }
      setError(errorMessage(t, err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(reset.code)) return setError(t.errors.INVALID_CODE);
    if (!isStrongPassword(reset.password)) return setError(t.errors.WEAK_PASSWORD);
    if (reset.password !== reset.confirmPassword) return setError(t.passwordMismatch);
    setLoading(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail, code: reset.code, password: reset.password })
      });
      props.onLoggedIn(res.token, res.user);
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setLoading(false);
    }
  };

  const pwProps = { showLabel: t.showPassword, hideLabel: t.hidePassword };
  const submitLabel = (label: string) => (loading ? <><Spinner /> {t.pleaseWait}</> : label);

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-card animate-slide-up">
        <div className="auth-left-pane">
          <img src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'} alt="রসুইঘর" className="auth-logo-img" />
          <p className="auth-subtitle">{t.appSubtitle}</p>
        </div>

        <div className="auth-right-pane">
          <div className="auth-topbar">
            <button type="button" className="chip-btn" onClick={toggleLang}>
              <Globe size={14} /> {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={t.toggleTheme}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>

          {props.banner}

          {(mode === 'signin' || mode === 'signup') && (
            <div className="auth-pills" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')}>
                {t.signIn}
              </button>
              <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>
                {t.signUp}
              </button>
            </div>
          )}

          {mode === 'verify' && (
            <div className="auth-step-head">
              <div className="auth-step-icon"><ShieldCheck size={22} /></div>
              <h2>{t.verifyTitle}</h2>
              <p>{t.verifySubtitle} <strong>{pendingEmail}</strong></p>
            </div>
          )}
          {mode === 'forgot' && (
            <div className="auth-step-head">
              <div className="auth-step-icon"><Mail size={22} /></div>
              <h2>{t.forgotTitle}</h2>
              <p>{t.forgotSubtitle}</p>
            </div>
          )}
          {mode === 'reset' && (
            <div className="auth-step-head">
              <div className="auth-step-icon"><KeyRound size={22} /></div>
              <h2>{t.resetTitle}</h2>
              <p>{t.resetSubtitle} <strong>{pendingEmail}</strong></p>
            </div>
          )}

          {info && (
            <div className="auth-alert auth-alert-success" role="status">
              <CheckCircle2 size={16} /> <span>{info}</span>
            </div>
          )}
          {error && (
            <div className="auth-alert auth-alert-error" role="alert">
              <AlertCircle size={16} /> <span>{error}</span>
            </div>
          )}

          {(mode === 'signin' || mode === 'signup') && (
            <form onSubmit={handleSubmit} className="form-stack" noValidate>
              {mode === 'signup' && (
                <Field label={t.name} htmlFor="auth-name">
                  <input id="auth-name" className="input" autoComplete="name" placeholder={t.namePlaceholder}
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
              )}
              <Field label={t.email} htmlFor="auth-email">
                <input id="auth-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
                  spellCheck={false} placeholder={t.emailPlaceholder}
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              {mode === 'signup' && (
                <Field label={<>{t.phone} <span className="muted">({t.optional})</span></>} htmlFor="auth-phone">
                  <input id="auth-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder={t.phonePlaceholder}
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
              )}
              <Field
                label={t.password}
                htmlFor="auth-password"
                hint={mode === 'signup' ? t.passwordHint : undefined}
                aside={mode === 'signin' ? (
                  <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>{t.forgotPassword}</button>
                ) : undefined}
              >
                <PasswordInput id="auth-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })}
                  visible={showPw} onToggle={() => setShowPw(!showPw)}
                  placeholder={mode === 'signup' ? t.newPasswordPlaceholder : t.passwordPlaceholder}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} {...pwProps} />
              </Field>
              {mode === 'signup' && (
                <Field label={t.confirmPassword} htmlFor="auth-confirm">
                  <PasswordInput id="auth-confirm" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })}
                    visible={showPw2} onToggle={() => setShowPw2(!showPw2)} placeholder={t.confirmPasswordPlaceholder}
                    autoComplete="new-password" {...pwProps} />
                </Field>
              )}
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {submitLabel(mode === 'signup' ? t.signUpAction : t.signInAction)}
              </button>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={handleVerify} className="form-stack" noValidate>
              <Field label={t.codeLabel} htmlFor="otp-code">
                <CodeInput id="otp-code" value={otp} onChange={setOtp} autoFocus />
              </Field>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || otp.length !== 6}>
                {submitLabel(t.verifyAction)}
              </button>
              <ResendRow resendIn={resendIn} lang={lang} t={t} onResend={handleResend} />
              <button type="button" className="link-btn center" onClick={() => switchMode('signup')}>{t.changeEmail}</button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="form-stack" noValidate>
              <Field label={t.email} htmlFor="forgot-email">
                <input id="forgot-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
                  spellCheck={false} autoFocus placeholder={t.emailPlaceholder}
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>{submitLabel(t.sendCode)}</button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="form-stack" noValidate>
              <Field label={t.codeLabel} htmlFor="reset-code">
                <CodeInput id="reset-code" value={reset.code} onChange={(v) => setReset({ ...reset, code: v })} autoFocus />
              </Field>
              <Field label={t.newPassword} htmlFor="reset-password" hint={t.passwordHint}>
                <PasswordInput id="reset-password" value={reset.password} onChange={(v) => setReset({ ...reset, password: v })}
                  visible={showPw} onToggle={() => setShowPw(!showPw)} placeholder={t.newPasswordPlaceholder}
                  autoComplete="new-password" {...pwProps} />
              </Field>
              <Field label={t.confirmPassword} htmlFor="reset-confirm">
                <PasswordInput id="reset-confirm" value={reset.confirmPassword} onChange={(v) => setReset({ ...reset, confirmPassword: v })}
                  visible={showPw2} onToggle={() => setShowPw2(!showPw2)} placeholder={t.confirmPasswordPlaceholder}
                  autoComplete="new-password" {...pwProps} />
              </Field>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>{submitLabel(t.resetAction)}</button>
              <ResendRow resendIn={resendIn} lang={lang} t={t} onResend={handleResend} />
            </form>
          )}

          <div className="auth-foot">
            {mode === 'signin' || mode === 'signup' ? (
              <button type="button" className="link-btn" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? t.dontHaveAccount : t.alreadyHaveAccount}
              </button>
            ) : (
              <button type="button" className="link-btn" onClick={() => switchMode('signin')}>
                <ArrowLeft size={13} /> {t.backToSignIn.replace(/^←\s*/, '')}
              </button>
            )}
          </div>

          {canInstall && (
            <button type="button" className="install-btn" onClick={install}>
              <Download size={14} /> {t.installApp}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
