import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Utensils, Users, Send, X, CalendarDays, ChevronRight, Mail } from 'lucide-react';
import { useApp } from '../context';
import { apiFetch } from '../api';
import { formatDate, formatMoney, formatNum, membersLabel, todayLocal, type Language } from '../i18n';
import { navigate, goBack, type Route } from '../router';
import { AppHeader } from '../components/AppHeader';
import { Modal, Field, EmptyState, Spinner } from '../components/ui';

interface MessCycle {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  manager_name?: string;
  total_meals: number;
  total_bazaar: number;
  total_deposits: number;
}

interface Member {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface Invite {
  id: number;
  email: string;
  expires_at: string;
  invited_by_name?: string;
}

const defaultMessName = (start: string, days: number, lang: Language): string => {
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + Math.max(1, days) - 1);
  return `${formatDate(start, lang)} – ${formatDate(end.toISOString().slice(0, 10), lang)}`;
};

export function HomeScreen({ route }: { route: Extract<Route, { name: 'home' }> }) {
  const { t, lang, user, toast, showError } = useApp();
  const homeId = route.homeId;

  const [home, setHome] = useState<{ name: string; address?: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [messes, setMesses] = useState<MessCycle[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [messForm, setMessForm] = useState({ name: '', duration_days: 10, start_date: todayLocal() });
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([apiFetch(`/homes/${homeId}`), apiFetch(`/mess/home/${homeId}`)]);
      setHome(h.home);
      setMembers(h.members);
      setInvites(h.invites);
      setMesses(m.messCycles);
    } catch (err) {
      setNotFound(true);
      showError(err);
    }
  }, [homeId, showError]);

  useEffect(() => { load(); }, [load]);

  const createMess = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch(`/mess/home/${homeId}`, {
        method: 'POST',
        body: JSON.stringify({
          name: messForm.name.trim() || defaultMessName(messForm.start_date, messForm.duration_days, lang),
          duration_days: messForm.duration_days,
          start_date: messForm.start_date
        })
      });
      setShowCreate(false);
      setMessForm({ name: '', duration_days: 10, start_date: todayLocal() });
      navigate(`/home/${homeId}/mess/${res.messCycle.id}/bazaar`);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast(t.errors.INVALID_EMAIL);
    setBusy(true);
    try {
      const res = await apiFetch(`/homes/${homeId}/invites`, { method: 'POST', body: JSON.stringify({ email }) });
      setInvites((list) => [res.invite, ...list.filter((i) => i.email !== email)]);
      setInviteEmail('');
      toast(t.inviteSent, 'success');
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const cancelInvite = async (id: number) => {
    try {
      await apiFetch(`/homes/${homeId}/invites/${id}`, { method: 'DELETE' });
      setInvites((list) => list.filter((i) => i.id !== id));
    } catch (err) {
      showError(err);
    }
  };

  const today = todayLocal();
  const statusOf = (m: MessCycle) =>
    today < m.start_date ? 'upcoming' : today > m.end_date ? 'finished' : 'running';

  return (
    <>
      <AppHeader title={home?.name} subtitle={home?.address} onBack={() => goBack(route)} />
      <main className="page">
        {notFound ? (
          <EmptyState icon={<Utensils size={28} />} title={t.errors.HOME_NOT_FOUND}>
            <button className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>{t.goHome}</button>
          </EmptyState>
        ) : messes === null ? (
          <div className="loading-block"><Spinner size={22} /></div>
        ) : (
          <div className="home-layout">
            {/* ── Messes ── */}
            <section className="home-main">
              <div className="section-head">
                <h2 className="section-title">{t.messes}</h2>
                {messes.length > 0 && (
                  <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    <Plus size={16} /> {t.newMess}
                  </button>
                )}
              </div>

              {messes.length === 0 ? (
                <EmptyState icon={<Utensils size={28} />} title={t.noMessTitle} text={t.noMessSub}>
                  <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    <Plus size={16} /> {t.newMess}
                  </button>
                </EmptyState>
              ) : (
                <div className="mess-list">
                  {messes.map((m) => {
                    const status = statusOf(m);
                    const rate = m.total_meals > 0 ? m.total_bazaar / m.total_meals : 0;
                    return (
                      <button type="button" key={m.id} className="card card-link mess-card"
                        onClick={() => navigate(`/home/${homeId}/mess/${m.id}/bazaar`)}>
                        <div className="mess-card-head">
                          <div className="min-w-0">
                            <h3 className="truncate">{m.name}</h3>
                            <p className="muted small">
                              <CalendarDays size={12} /> {formatDate(m.start_date, lang)} – {formatDate(m.end_date, lang, true)}
                              {' • '}{formatNum(m.duration_days, lang, 0)} {t.days}
                            </p>
                          </div>
                          <span className={`badge badge-${status}`}>{t[status]}</span>
                        </div>
                        <div className="mess-card-stats">
                          <div><span>{t.totalBazaarLabel}</span><strong>{formatMoney(m.total_bazaar, lang)}</strong></div>
                          <div><span>{t.totalMeals}</span><strong>{formatNum(m.total_meals, lang, 1)}</strong></div>
                          <div><span>{t.mealRate}</span><strong>{formatMoney(rate, lang)}</strong></div>
                        </div>
                        <ChevronRight size={18} className="mess-card-arrow" />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Members & invitations ── */}
            <aside className="home-side">
              <div className="card">
                <div className="section-head compact">
                  <h3 className="card-title"><Users size={16} /> {t.tabMembers}</h3>
                  <span className="badge badge-soft">{membersLabel(members.length, t, lang)}</span>
                </div>
                <ul className="member-list">
                  {members.map((m) => (
                    <li key={m.user_id}>
                      <span className="avatar avatar-md">{m.name.trim().charAt(0)}</span>
                      <div className="min-w-0">
                        <p className="member-name truncate">
                          {m.name}{m.user_id === user?.id && <span className="muted"> ({t.you})</span>}
                        </p>
                        <p className="muted small truncate">{m.email}</p>
                      </div>
                      {m.role === 'manager' && <span className="badge badge-accent">{t.managerRole}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <h3 className="card-title"><Mail size={16} /> {t.inviteMembers}</h3>
                <p className="muted small mb-12">{t.inviteMembersSub}</p>
                <form onSubmit={sendInvite} className="inline-form">
                  <input className="input" type="email" inputMode="email" autoCapitalize="none" spellCheck={false}
                    placeholder={t.emailPlaceholder} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                    aria-label={t.email} />
                  <button type="submit" className="btn btn-accent" disabled={busy || !inviteEmail.trim()}>
                    {busy ? <Spinner /> : <Send size={15} />} <span>{t.sendInvite}</span>
                  </button>
                </form>

                {invites.length > 0 && (
                  <>
                    <p className="list-label">{t.pendingInvites}</p>
                    <ul className="invite-list">
                      {invites.map((i) => (
                        <li key={i.id}>
                          <div className="min-w-0">
                            <p className="truncate">{i.email}</p>
                            <p className="muted small">{t.validUntil}: {formatDate(i.expires_at, lang, true)}</p>
                          </div>
                          <button type="button" className="icon-btn danger" onClick={() => cancelInvite(i.id)}
                            aria-label={t.cancelInvite} title={t.cancelInvite}>
                            <X size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      {showCreate && (
        <Modal title={t.instCreateMess} subtitle={`${t.allCanCreate} • ${t.instTenDayDefault}`} onClose={() => setShowCreate(false)} closeLabel={t.closeAction}>
          <form onSubmit={createMess} className="form-stack">
            <Field label={<>{t.cycleName} <span className="muted">({t.optional})</span></>} htmlFor="mess-name">
              <input id="mess-name" className="input" maxLength={150}
                placeholder={defaultMessName(messForm.start_date, messForm.duration_days, lang)}
                value={messForm.name} onChange={(e) => setMessForm({ ...messForm, name: e.target.value })} />
            </Field>
            <Field label={`${t.cycleDuration}: ${formatNum(messForm.duration_days, lang, 0)} ${t.days}`} htmlFor="mess-days">
              <div className="pill-row">
                {[7, 10, 15, 30].map((d) => (
                  <button type="button" key={d} className={`pill ${messForm.duration_days === d ? 'active' : ''}`}
                    onClick={() => setMessForm({ ...messForm, duration_days: d })}>
                    {formatNum(d, lang, 0)} {t.days}
                  </button>
                ))}
              </div>
              <input id="mess-days" className="input" type="number" min={1} max={60} inputMode="numeric"
                value={messForm.duration_days}
                onChange={(e) => setMessForm({ ...messForm, duration_days: Math.min(60, Math.max(1, parseInt(e.target.value, 10) || 1)) })} />
            </Field>
            <Field label={t.startDate} htmlFor="mess-start">
              <input id="mess-start" className="input" type="date" required value={messForm.start_date}
                onChange={(e) => setMessForm({ ...messForm, start_date: e.target.value })} />
            </Field>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>{t.cancel}</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <Spinner /> : t.startAction}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
