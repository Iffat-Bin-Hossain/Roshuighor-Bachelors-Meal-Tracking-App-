import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Utensils, Wallet, TrendingUp, Plus, Trash2, Pencil, Sun, Moon, CalendarDays } from 'lucide-react';
import { useApp, useMediaQuery } from '../context';
import { apiFetch } from '../api';
import { formatDate, formatMoney, formatNum, fill, todayLocal, type Dict } from '../i18n';
import { navigate, goBack, type Route, type MessTab } from '../router';
import { AppHeader } from '../components/AppHeader';
import { Modal, Field, EmptyState, Spinner } from '../components/ui';
import { MultiSelect, type MenuItem } from '../components/MultiSelect';

/* ───────── Types ───────── */

interface Member { user_id: number; name: string; role: string }
interface MessCycle { id: number; name: string; start_date: string; end_date: string; duration_days: number; home_name?: string }
interface MealRecord { user_id: number; date: string; lunch: string; dinner: string; guest_meals: string }
interface DailyMenu { date: string; meal_type: 'lunch' | 'dinner'; items: MenuItem[] }
interface BazaarItem { id: number; items_description: string; amount: string; date: string; category: Category; buyer_id: number; buyer_name: string }
interface Deposit { id: number; user_name: string; amount: string; date: string }
interface Summary {
  totalMeals: number; totalBazaar: number; totalDeposits: number; mealRate: number;
  memberCalculations: { userId: number; name: string; meals: { total: number }; deposit: number; mealCost: number; balance: number; status: 'surplus' | 'due' }[];
}

type Category = 'staple' | 'main' | 'side' | 'misc';
const CATEGORIES: Category[] = ['staple', 'main', 'side', 'misc'];

const catLabel = (t: Dict, c: Category) => ({ staple: t.catStaple, main: t.catMain, side: t.catSide, misc: t.catMisc })[c];
const catHint = (t: Dict, c: Category) => ({ staple: t.catStapleHint, main: t.catMainHint, side: t.catSideHint, misc: t.catMiscHint })[c];

/* ───────── Screen ───────── */

export function MessScreen({ route }: { route: Extract<Route, { name: 'mess' }> }) {
  const { t, lang, showError } = useApp();
  const { homeId, messId, tab } = route;

  const [mess, setMess] = useState<MessCycle | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [bazaar, setBazaar] = useState<BazaarItem[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [notFound, setNotFound] = useState(false);

  const reload = useMemo(() => ({
    records: () => apiFetch(`/meals/${messId}`).then((r) => setRecords(r.mealRecords)),
    menus: () => apiFetch(`/meals/${messId}/menu`).then((r) => setMenus(r.menus)),
    bazaar: () => apiFetch(`/bazaar/${messId}`).then((r) => setBazaar(r.expenses)),
    deposits: () => apiFetch(`/deposits/${messId}`).then((r) => setDeposits(r.deposits)),
    summary: () => apiFetch(`/summary/${messId}`).then((r) => setSummary(r.summary))
  }), [messId]);

  const loadAll = useCallback(async () => {
    try {
      const detail = await apiFetch(`/mess/${messId}`);
      setMess(detail.messCycle);
      setDates(detail.dates);
      setMembers(detail.members);
      await Promise.all(Object.values(reload).map((fn) => fn()));
    } catch (err) {
      setNotFound(true);
      showError(err);
    }
  }, [messId, reload, showError]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const setTab = (next: MessTab) => {
    navigate(`/home/${homeId}/mess/${messId}/${next}`, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const tabs: { key: MessTab; label: string; icon: React.ReactNode }[] = [
    { key: 'bazaar', label: t.tabBazaar, icon: <ShoppingBag size={18} /> },
    { key: 'meals', label: t.tabMeals, icon: <Utensils size={18} /> },
    { key: 'deposits', label: t.tabDeposits, icon: <Wallet size={18} /> },
    { key: 'summary', label: t.tabSummary, icon: <TrendingUp size={18} /> }
  ];

  const subtitle = mess
    ? `${formatDate(mess.start_date, lang)} – ${formatDate(mess.end_date, lang, true)} • ${formatNum(mess.duration_days, lang, 0)} ${t.days}`
    : undefined;

  return (
    <>
      <AppHeader title={mess?.name} subtitle={subtitle} onBack={() => goBack(route)} />

      <nav className="tab-bar" aria-label={mess?.name}>
        <div className="tab-bar-inner">
          {tabs.map((x) => (
            <button key={x.key} type="button" className={`tab ${tab === x.key ? 'active' : ''}`}
              aria-current={tab === x.key ? 'page' : undefined} onClick={() => setTab(x.key)}>
              {x.icon}<span>{x.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="page page-with-tabs">
        {notFound ? (
          <EmptyState icon={<Utensils size={28} />} title={t.errors.MESS_NOT_FOUND}>
            <button className="btn btn-primary" onClick={() => navigate(`/home/${homeId}`, { replace: true })}>{t.back}</button>
          </EmptyState>
        ) : !mess ? (
          <div className="loading-block"><Spinner size={22} /></div>
        ) : (
          <>
            {tab === 'bazaar' && (
              <BazaarTab messId={messId} members={members} items={bazaar}
                onChange={() => { reload.bazaar(); reload.summary(); }} />
            )}
            {tab === 'meals' && (
              <MealsTab messId={messId} dates={dates} members={members} records={records} menus={menus} bazaar={bazaar}
                onRecordsChange={() => { reload.records(); reload.summary(); }}
                onMenusChange={reload.menus}
                goToBazaar={() => setTab('bazaar')} />
            )}
            {tab === 'deposits' && (
              <DepositsTab messId={messId} members={members} deposits={deposits} total={summary?.totalDeposits ?? 0}
                onChange={() => { reload.deposits(); reload.summary(); }} />
            )}
            {tab === 'summary' && <SummaryTab summary={summary} />}
          </>
        )}
      </main>
    </>
  );
}

/* ───────── Bazaar: four categories, add item + price ───────── */

function BazaarTab(props: { messId: number; members: Member[]; items: BazaarItem[]; onChange: () => void }) {
  const { t, lang, user, showError } = useApp();
  const [entryDate, setEntryDate] = useState(todayLocal());
  const [buyerId, setBuyerId] = useState<string>(String(user?.id ?? ''));
  const total = props.items.reduce((s, i) => s + parseFloat(i.amount), 0);

  const addItem = async (category: Category, name: string, price: string) => {
    try {
      await apiFetch(`/bazaar/${props.messId}`, {
        method: 'POST',
        body: JSON.stringify({ category, items_description: name, amount: price, date: entryDate, buyer_id: buyerId })
      });
      props.onChange();
      return true;
    } catch (err) {
      showError(err);
      return false;
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await apiFetch(`/bazaar/${id}`, { method: 'DELETE' });
      props.onChange();
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div className="stack-16">
      <div className="card bazaar-top">
        <div className="bazaar-total">
          <span>{t.bazaarTotal}</span>
          <strong>{formatMoney(total, lang)}</strong>
        </div>
        <div className="bazaar-defaults">
          <p className="muted small">{t.entryDefaults}</p>
          <div className="bazaar-defaults-row">
            <input className="input" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} aria-label={t.date} />
            <select className="input" value={buyerId} onChange={(e) => setBuyerId(e.target.value)} aria-label={t.buyer}>
              {props.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === user?.id ? ` (${t.you})` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <CategoryCard key={c} category={c} items={props.items.filter((i) => i.category === c)}
            onAdd={(name, price) => addItem(c, name, price)} onDelete={deleteItem} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard(props: {
  category: Category;
  items: BazaarItem[];
  onAdd: (name: string, price: string) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const { t, lang } = useApp();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const total = props.items.reduce((s, i) => s + parseFloat(i.amount), 0);
  const c = props.category;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !(parseFloat(price) > 0)) return;
    setSaving(true);
    const ok = await props.onAdd(name.trim(), price);
    setSaving(false);
    if (ok) {
      setName('');
      setPrice('');
    }
  };

  return (
    <section className={`card category-card cat-${c}`}>
      <header className="category-head">
        <div className="min-w-0">
          <h3>{catLabel(t, c)}</h3>
          <p className="muted small truncate">{catHint(t, c)}</p>
        </div>
        <strong className="category-total">{formatMoney(total, lang)}</strong>
      </header>

      {props.items.length === 0 ? (
        <p className="category-empty">{t.noItemsYet}</p>
      ) : (
        <ul className="item-list">
          {props.items.map((i) => (
            <li key={i.id}>
              <div className="min-w-0">
                <p className="item-name truncate">{i.items_description}</p>
                <p className="muted small truncate">{formatDate(i.date, lang)} • {i.buyer_name}</p>
              </div>
              <span className="item-price">{formatMoney(i.amount, lang)}</span>
              {confirmId === i.id ? (
                <button type="button" className="btn btn-danger btn-xs" onClick={() => { props.onDelete(i.id); setConfirmId(null); }}
                  onBlur={() => setConfirmId(null)} autoFocus>
                  {t.deleteAction}
                </button>
              ) : (
                <button type="button" className="icon-btn danger" onClick={() => setConfirmId(i.id)} aria-label={t.deleteAction} title={t.deleteItemConfirm}>
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="item-add" onSubmit={submit}>
        <input className="input" placeholder={t.itemName} value={name} onChange={(e) => setName(e.target.value)}
          maxLength={100} aria-label={`${catLabel(t, c)} — ${t.itemName}`} />
        <input className="input price-input" type="number" inputMode="decimal" min="0.01" step="any" placeholder={t.price}
          value={price} onChange={(e) => setPrice(e.target.value)} aria-label={t.price} />
        <button type="submit" className="btn btn-primary" disabled={saving || !name.trim() || !(parseFloat(price) > 0)}
          aria-label={t.addItem}>
          {saving ? <Spinner /> : <Plus size={16} />}<span className="hide-xs">{t.addItem}</span>
        </button>
      </form>
    </section>
  );
}

/* ───────── Meal sheet with per-date menu column ───────── */

function MealsTab(props: {
  messId: number;
  dates: string[];
  members: Member[];
  records: MealRecord[];
  menus: DailyMenu[];
  bazaar: BazaarItem[];
  onRecordsChange: () => void;
  onMenusChange: () => void;
  goToBazaar: () => void;
}) {
  const { t, lang, user, showError } = useApp();
  const isWide = useMediaQuery('(min-width: 900px)');
  const [editDate, setEditDate] = useState<string | null>(null);
  const today = todayLocal();

  const recordOf = (uid: number, d: string) => props.records.find((r) => r.user_id === uid && r.date.slice(0, 10) === d);
  const menuOf = (d: string, slot: 'lunch' | 'dinner') =>
    props.menus.find((m) => m.date.slice(0, 10) === d && m.meal_type === slot)?.items ?? [];

  // Put the signed-in user first so their own toggles are easiest to reach
  const members = useMemo(
    () => [...props.members].sort((a, b) => (a.user_id === user?.id ? -1 : b.user_id === user?.id ? 1 : 0)),
    [props.members, user?.id]
  );

  const toggle = async (uid: number, d: string, slot: 'lunch' | 'dinner') => {
    const rec = recordOf(uid, d);
    const l = rec ? parseFloat(rec.lunch) : 0;
    const dn = rec ? parseFloat(rec.dinner) : 0;
    const g = rec ? parseFloat(rec.guest_meals) : 0;
    try {
      await apiFetch(`/meals/${props.messId}/record`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: uid, date: d,
          lunch: slot === 'lunch' ? (l > 0 ? 0 : 1) : l,
          dinner: slot === 'dinner' ? (dn > 0 ? 0 : 1) : dn,
          guest_meals: g
        })
      });
      props.onRecordsChange();
    } catch (err) {
      showError(err);
    }
  };

  const mealToggles = (uid: number, d: string) => {
    const rec = recordOf(uid, d);
    const l = rec ? parseFloat(rec.lunch) : 0;
    const dn = rec ? parseFloat(rec.dinner) : 0;
    return (
      <div className="meal-toggles">
        <button type="button" className={`meal-toggle ${l > 0 ? 'on' : ''}`} onClick={() => toggle(uid, d, 'lunch')}
          aria-pressed={l > 0} title={`${t.lunch}: ${l > 0 ? t.on : t.off}`}>
          <Sun size={12} /> {t.lunchShort}
        </button>
        <button type="button" className={`meal-toggle ${dn > 0 ? 'on' : ''}`} onClick={() => toggle(uid, d, 'dinner')}
          aria-pressed={dn > 0} title={`${t.dinner}: ${dn > 0 ? t.on : t.off}`}>
          <Moon size={12} /> {t.dinnerShort}
        </button>
      </div>
    );
  };

  const menuCell = (d: string) => {
    const lunch = menuOf(d, 'lunch');
    const dinner = menuOf(d, 'dinner');
    return (
      <div className="menu-cell">
        <div className="menu-lines">
          {lunch.length === 0 && dinner.length === 0 ? (
            <span className="muted small italic">{t.noMenuYet}</span>
          ) : (
            <>
              {lunch.length > 0 && <MenuLine icon={<Sun size={12} />} items={lunch} />}
              {dinner.length > 0 && <MenuLine icon={<Moon size={12} />} items={dinner} />}
            </>
          )}
        </div>
        <button type="button" className="icon-btn pen-btn" onClick={() => setEditDate(d)} aria-label={`${t.editMenu} — ${formatDate(d, lang)}`} title={t.editMenu}>
          <Pencil size={15} />
        </button>
      </div>
    );
  };

  const dayTotal = (d: string) =>
    props.records.filter((r) => r.date.slice(0, 10) === d).reduce((s, r) => s + parseFloat(r.lunch) + parseFloat(r.dinner) + parseFloat(r.guest_meals), 0);

  return (
    <div className="stack-16">
      <p className="hint-bar"><Sun size={13} /> {t.lunchShort} = {t.lunch} &nbsp;•&nbsp; <Moon size={13} /> {t.dinnerShort} = {t.dinner} &nbsp;—&nbsp; {t.mealSheetHint}</p>

      {isWide ? (
        <div className="card table-card">
          <div className="table-scroll">
            <table className="meal-table">
              <thead>
                <tr>
                  <th className="sticky-col">{t.date}</th>
                  <th className="menu-col">{t.menu}</th>
                  {members.map((m) => (
                    <th key={m.user_id} className="member-col">
                      <span className="truncate">{m.user_id === user?.id ? t.you : m.name.split(' ')[0]}</span>
                    </th>
                  ))}
                  <th>{t.totalMeals}</th>
                </tr>
              </thead>
              <tbody>
                {props.dates.map((d) => (
                  <tr key={d} className={d === today ? 'is-today' : ''}>
                    <td className="sticky-col date-col">{formatDate(d, lang)}</td>
                    <td className="menu-col">{menuCell(d)}</td>
                    {members.map((m) => (
                      <td key={m.user_id}>{mealToggles(m.user_id, d)}</td>
                    ))}
                    <td className="total-col">{formatNum(dayTotal(d), lang, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="day-cards">
          {props.dates.map((d) => (
            <article key={d} className={`card day-card ${d === today ? 'is-today' : ''}`}>
              <header className="day-card-head">
                <h3><CalendarDays size={15} /> {formatDate(d, lang, true)}</h3>
                <span className="badge badge-soft">{t.totalMeals}: {formatNum(dayTotal(d), lang, 1)}</span>
              </header>
              <div className="day-card-menu">
                <span className="day-card-label">{t.menu}</span>
                {menuCell(d)}
              </div>
              <ul className="day-card-members">
                {members.map((m) => (
                  <li key={m.user_id}>
                    <span className="truncate">{m.user_id === user?.id ? <strong>{t.you}</strong> : m.name}</span>
                    {mealToggles(m.user_id, d)}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {editDate && (
        <MenuEditor messId={props.messId} date={editDate} bazaar={props.bazaar}
          initial={{ lunch: menuOf(editDate, 'lunch'), dinner: menuOf(editDate, 'dinner') }}
          onClose={() => setEditDate(null)}
          onSaved={() => { setEditDate(null); props.onMenusChange(); }}
          goToBazaar={() => { setEditDate(null); props.goToBazaar(); }} />
      )}
    </div>
  );
}

function MenuLine({ icon, items }: { icon: React.ReactNode; items: MenuItem[] }) {
  return (
    <div className="menu-line">
      <span className="menu-line-icon">{icon}</span>
      <span className="menu-chips">
        {items.map((i) => <span key={`${i.category}:${i.name}`} className={`chip chip-sm chip-${i.category}`}>{i.name}</span>)}
      </span>
    </div>
  );
}

function MenuEditor(props: {
  messId: number;
  date: string;
  bazaar: BazaarItem[];
  initial: { lunch: MenuItem[]; dinner: MenuItem[] };
  onClose: () => void;
  onSaved: () => void;
  goToBazaar: () => void;
}) {
  const { t, lang, showError } = useApp();
  const [lunch, setLunch] = useState<MenuItem[]>(props.initial.lunch);
  const [dinner, setDinner] = useState<MenuItem[]>(props.initial.dinner);
  const [saving, setSaving] = useState(false);

  // Distinct bazaar item names per category (the same item bought twice appears once)
  const options = useMemo(() => {
    const seen = new Map<string, MenuItem>();
    for (const b of props.bazaar) {
      const k = `${b.category}:${b.items_description.trim().toLowerCase()}`;
      if (!seen.has(k)) seen.set(k, { category: b.category, name: b.items_description.trim() });
    }
    // Keep previously chosen items selectable even if their bazaar entry was deleted
    for (const i of [...props.initial.lunch, ...props.initial.dinner]) {
      const k = `${i.category}:${i.name.toLowerCase()}`;
      if (!seen.has(k)) seen.set(k, i);
    }
    return [...seen.values()];
  }, [props.bazaar, props.initial]);

  const categories = CATEGORIES.map((c) => ({ key: c, label: catLabel(t, c) }));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(
        (['lunch', 'dinner'] as const).map((slot) =>
          apiFetch(`/meals/${props.messId}/menu`, {
            method: 'POST',
            body: JSON.stringify({ date: props.date, meal_type: slot, items: slot === 'lunch' ? lunch : dinner })
          })
        )
      );
      props.onSaved();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const msProps = {
    options,
    categories,
    placeholder: t.selectItems,
    searchPlaceholder: t.searchItems,
    noMatchesLabel: t.noMatches,
    clearLabel: t.clearAll,
    selectedLabel: (n: number) => fill(t.selectedN, { n: formatNum(n, lang, 0) })
  };

  return (
    <Modal title={t.editMenuTitle} subtitle={formatDate(props.date, lang, true)} onClose={props.onClose} closeLabel={t.closeAction}>
      {options.length === 0 ? (
        <EmptyState icon={<ShoppingBag size={26} />} title={t.noBazaarItemsForMenu}>
          <button type="button" className="btn btn-primary" onClick={props.goToBazaar}>{t.goToBazaar}</button>
        </EmptyState>
      ) : (
        <div className="form-stack">
          <Field label={<span className="label-icon"><Sun size={14} /> {t.lunchSlot}</span>} htmlFor="menu-lunch">
            <MultiSelect id="menu-lunch" value={lunch} onChange={setLunch} {...msProps} />
          </Field>
          <Field label={<span className="label-icon"><Moon size={14} /> {t.dinnerSlot}</span>} htmlFor="menu-dinner">
            <MultiSelect id="menu-dinner" value={dinner} onChange={setDinner} {...msProps} />
          </Field>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={props.onClose}>{t.cancel}</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : t.saveMenu}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ───────── Deposits ───────── */

function DepositsTab(props: { messId: number; members: Member[]; deposits: Deposit[]; total: number; onChange: () => void }) {
  const { t, lang, user, showError } = useApp();
  const [form, setForm] = useState({ user_id: String(user?.id ?? ''), amount: '', date: todayLocal() });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(parseFloat(form.amount) > 0)) return;
    setSaving(true);
    try {
      await apiFetch(`/deposits/${props.messId}`, { method: 'POST', body: JSON.stringify(form) });
      setForm((f) => ({ ...f, amount: '' }));
      props.onChange();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="two-col">
      <section className="card">
        <h3 className="card-title"><Wallet size={16} /> {t.instAddDeposit}</h3>
        <form onSubmit={submit} className="form-stack">
          <Field label={t.member} htmlFor="dep-member">
            <select id="dep-member" className="input" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
              {props.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === user?.id ? ` (${t.you})` : ''}</option>
              ))}
            </select>
          </Field>
          <div className="field-row">
            <Field label={t.amount} htmlFor="dep-amount">
              <input id="dep-amount" className="input" type="number" inputMode="decimal" min="0.01" step="any"
                placeholder={t.amountPlaceholder} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={t.date} htmlFor="dep-date">
              <input id="dep-date" className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving || !(parseFloat(form.amount) > 0)}>
            {saving ? <Spinner /> : <Plus size={16} />} {t.addDepositTitle}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="section-head compact">
          <h3 className="card-title">{t.totalDepositLabel}</h3>
          <strong className="amount-lg">{formatMoney(props.total, lang)}</strong>
        </div>
        {props.deposits.length === 0 ? (
          <p className="category-empty">{t.noDepositsYet}</p>
        ) : (
          <ul className="item-list">
            {props.deposits.map((d) => (
              <li key={d.id}>
                <div className="min-w-0">
                  <p className="item-name truncate">{d.user_name}</p>
                  <p className="muted small">{formatDate(d.date, lang, true)}</p>
                </div>
                <span className="item-price text-success">{formatMoney(d.amount, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ───────── Summary ───────── */

function SummaryTab({ summary }: { summary: Summary | null }) {
  const { t, lang } = useApp();
  if (!summary) return <div className="loading-block"><Spinner size={22} /></div>;

  const kpis = [
    { label: t.totalMeals, value: formatNum(summary.totalMeals, lang, 1) },
    { label: t.totalBazaarCost, value: formatMoney(summary.totalBazaar, lang), accent: true },
    { label: t.mealRate, value: formatMoney(summary.mealRate, lang), note: t.perMealFormula },
    { label: t.totalCashDeposit, value: formatMoney(summary.totalDeposits, lang) }
  ];

  return (
    <div className="stack-16">
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="card kpi">
            <span>{k.label}</span>
            <strong className={k.accent ? 'text-accent' : ''}>{k.value}</strong>
            {k.note && <small>{k.note}</small>}
          </div>
        ))}
      </div>

      <section>
        <h3 className="section-title mb-12">{t.instViewSummary}</h3>
        <div className="card-grid">
          {summary.memberCalculations.map((m) => (
            <div key={m.userId} className="card settle-card">
              <div className="settle-head">
                <h4 className="truncate">{m.name}</h4>
                <span className={`badge ${m.status === 'surplus' ? 'badge-success' : 'badge-danger'}`}>
                  {m.status === 'surplus' ? t.refundDue : t.paymentDue}
                </span>
              </div>
              <dl className="settle-rows">
                <div><dt>{t.totalMeals}</dt><dd>{formatNum(m.meals.total, lang, 1)}</dd></div>
                <div><dt>{t.costFormula}</dt><dd>{formatMoney(m.mealCost, lang)}</dd></div>
                <div><dt>{t.depositGiven}</dt><dd>{formatMoney(m.deposit, lang)}</dd></div>
                <div className={`settle-total ${m.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  <dt>{t.netBalance}</dt>
                  <dd>{m.balance >= 0 ? '+' : '−'}{formatMoney(Math.abs(m.balance), lang)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
