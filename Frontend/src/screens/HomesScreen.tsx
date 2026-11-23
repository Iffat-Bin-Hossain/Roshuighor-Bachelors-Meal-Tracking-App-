import React, { useCallback, useEffect, useState } from 'react';
import { Home as HomeIcon, Plus, MailOpen, Users, Layers, MapPin, ChevronRight } from 'lucide-react';
import { useApp } from '../context';
import { apiFetch } from '../api';
import { formatNum, membersLabel } from '../i18n';
import { navigate } from '../router';
import { AppHeader } from '../components/AppHeader';
import { Modal, Field, EmptyState, Spinner } from '../components/ui';
import { JoinInviteForm } from './JoinInvite';

interface HomeSummary {
  id: number;
  name: string;
  address?: string | null;
  role: string;
  member_count: number;
  mess_count: number;
}

export function HomesScreen() {
  const { t, lang, toast, showError } = useApp();
  const [homes, setHomes] = useState<HomeSummary[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [form, setForm] = useState({ name: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/homes');
      setHomes(res.homes);
    } catch (err) {
      showError(err);
      setHomes([]);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  const createHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast(t.errors.HOME_NAME_REQUIRED);
    setSaving(true);
    try {
      const res = await apiFetch('/homes', { method: 'POST', body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ name: '', address: '' });
      navigate(`/home/${res.home.id}`);
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
        <Plus size={16} /> {t.newHome}
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => setShowJoin(true)}>
        <MailOpen size={16} /> {t.joinViaInvite}
      </button>
    </>
  );

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="page-head">
          <div>
            <h2 className="page-title">{t.myHomes}</h2>
            <p className="page-sub">{t.myHomesSub}</p>
          </div>
          {homes && homes.length > 0 && <div className="page-actions">{actions}</div>}
        </div>

        {homes === null ? (
          <div className="loading-block"><Spinner size={22} /></div>
        ) : homes.length === 0 ? (
          <EmptyState icon={<HomeIcon size={30} />} title={t.noHomesTitle} text={t.noHomesSub}>{actions}</EmptyState>
        ) : (
          <div className="card-grid">
            {homes.map((h) => (
              <button type="button" key={h.id} className="card card-link home-card" onClick={() => navigate(`/home/${h.id}`)}>
                <div className="home-card-top">
                  <div className="home-card-icon"><HomeIcon size={20} /></div>
                  <span className={`badge ${h.role === 'manager' ? 'badge-accent' : 'badge-soft'}`}>
                    {h.role === 'manager' ? t.managerRole : t.memberRole}
                  </span>
                </div>
                <h3 className="home-card-name">{h.name}</h3>
                {h.address && <p className="home-card-address"><MapPin size={13} /> {h.address}</p>}
                <div className="home-card-meta">
                  <span><Users size={14} /> {membersLabel(h.member_count, t, lang)}</span>
                  <span><Layers size={14} /> {formatNum(h.mess_count, lang, 0)} {t.messes}</span>
                  <ChevronRight size={18} className="home-card-arrow" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <Modal title={t.createHomeTitle} onClose={() => setShowCreate(false)} closeLabel={t.closeAction}>
          <form onSubmit={createHome} className="form-stack">
            <Field label={t.homeNameLabel} htmlFor="home-name">
              <input id="home-name" className="input" autoFocus required maxLength={150}
                placeholder={t.homeNamePlaceholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={<>{t.homeAddressLabel} <span className="muted">({t.optional})</span></>} htmlFor="home-address">
              <input id="home-address" className="input" maxLength={300} autoComplete="street-address"
                placeholder={t.homeAddressPlaceholder} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>{t.cancel}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : t.createAction}</button>
            </div>
          </form>
        </Modal>
      )}

      {showJoin && (
        <Modal title={t.joinInviteTitle} subtitle={t.joinInviteSub} onClose={() => setShowJoin(false)} closeLabel={t.closeAction}>
          <JoinInviteForm
            onJoined={(homeId) => {
              setShowJoin(false);
              toast(t.joinedHome, 'success');
              navigate(`/home/${homeId}`);
            }}
          />
        </Modal>
      )}
    </>
  );
}
