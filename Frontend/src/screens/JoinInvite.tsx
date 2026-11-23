import React, { useEffect, useState } from 'react';
import { MailOpen, AlertCircle, Users } from 'lucide-react';
import { useApp } from '../context';
import { apiFetch } from '../api';
import { errorMessage, fill, membersLabel } from '../i18n';
import { Field, CodeInput, Spinner } from '../components/ui';

export interface InvitePreview {
  email: string;
  homeName: string;
  inviterName: string | null;
  memberCount: number;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

/** Email + 6-digit code from the invitation email. `token` (from the email link) narrows it to one invitation. */
export function JoinInviteForm(props: { token?: string; initialEmail?: string; onJoined: (homeId: number) => void }) {
  const { t, user } = useApp();
  const [email, setEmail] = useState(props.initialEmail || user?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t.errors.INVALID_EMAIL);
    if (!/^\d{6}$/.test(code)) return setError(t.errors.INVALID_CODE);
    setLoading(true);
    try {
      const res = await apiFetch('/homes/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, token: props.token })
      });
      props.onJoined(res.homeId);
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-stack" noValidate>
      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}
      <Field label={t.email} htmlFor="invite-email">
        <input id="invite-email" className="input" type="email" inputMode="email" autoCapitalize="none" spellCheck={false}
          autoComplete="email" placeholder={t.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label={t.inviteCodeLabel} htmlFor="invite-code">
        <CodeInput id="invite-code" value={code} onChange={setCode} autoFocus={Boolean(props.initialEmail)} />
      </Field>
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || code.length !== 6}>
        {loading ? <><Spinner /> {t.pleaseWait}</> : t.acceptInvite}
      </button>
    </form>
  );
}

export const useInvitePreview = (token: string | null) => {
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (!token) return;
    apiFetch(`/homes/invites/${encodeURIComponent(token)}`)
      .then((res) => setPreview(res.invite))
      .catch(() => setNotFound(true));
  }, [token]);
  return { preview, notFound };
};

/** Card describing the invitation (shown above the auth form and on the join screen). */
export function InviteBanner({ preview }: { preview: InvitePreview }) {
  const { t, lang } = useApp();
  const statusMsg =
    preview.status === 'expired' ? t.inviteExpired : preview.status === 'accepted' ? t.inviteUsed : preview.status === 'revoked' ? t.inviteRevoked : '';
  return (
    <div className="invite-banner">
      <div className="invite-banner-icon"><MailOpen size={20} /></div>
      <div>
        <p className="invite-banner-kicker">{preview.inviterName ? fill(t.invitedYou, { name: preview.inviterName }) : t.homeInvite}</p>
        <h3>{preview.homeName}</h3>
        <p className="muted small"><Users size={12} /> {membersLabel(preview.memberCount, t, lang)}</p>
        <p className="small">{fill(t.inviteOnlyFor, { email: preview.email })}</p>
        {statusMsg ? <p className="small text-danger">{statusMsg}</p> : <p className="small muted">{t.inviteSignInHint}</p>}
      </div>
    </div>
  );
}
