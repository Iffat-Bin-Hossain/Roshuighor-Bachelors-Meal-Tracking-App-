import React, { useState, useEffect } from 'react';
import {
  Sun, Moon, Globe, LogOut, Home as HomeIcon, Users, Plus,
  Share2, Check, DollarSign, Utensils, ShoppingBag,
  TrendingUp, Copy, CheckCircle2, AlertCircle, ArrowRight,
  Eye, EyeOff, Coffee, Edit3
} from 'lucide-react';
import { translations, type Language } from './i18n';
import { apiFetch, getAuthToken, setAuthToken } from './api';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  language_pref: Language;
  theme_pref: 'light' | 'dark';
}

interface Home {
  id: number;
  name: string;
  address?: string;
  description?: string;
  invite_code: string;
  member_count: number;
  role: string;
}

interface MessCycle {
  id: number;
  home_id: number;
  name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  manager_name?: string;
  total_meals: number;
  total_bazaar: number;
  total_deposits: number;
}

interface MemberCalculation {
  userId: number;
  name: string;
  email: string;
  meals: { breakfast: number; lunch: number; dinner: number; guest: number; total: number };
  deposit: number;
  mealCost: number;
  balance: number;
  status: 'surplus' | 'due';
}

interface DailyMenu {
  id?: number;
  mess_cycle_id: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  staple: string;
  main_dish: string;
  side_dish: string;
  notes?: string;
}

export function App() {
  // Theme & Language
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<Language>('bn');
  const t = translations[lang];

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Homes State
  const [homes, setHomes] = useState<Home[]>([]);
  const [currentHome, setCurrentHome] = useState<Home | null>(null);
  const [homeMembers, setHomeMembers] = useState<any[]>([]);
  const [showCreateHomeModal, setShowCreateHomeModal] = useState(false);
  const [newHomeForm, setNewHomeForm] = useState({ name: '', address: '' });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Invite Link Preview / Joining
  const [incomingInviteCode, setIncomingInviteCode] = useState<string | null>(null);
  const [invitePreviewHome, setInvitePreviewHome] = useState<any | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Mess Cycles
  const [messCycles, setMessCycles] = useState<MessCycle[]>([]);
  const [currentMess, setCurrentMess] = useState<MessCycle | null>(null);
  const [showCreateMessModal, setShowCreateMessModal] = useState(false);
  const [newMessForm, setNewMessForm] = useState({
    name: '',
    duration_days: 10,
    start_date: new Date().toISOString().split('T')[0]
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<'meals' | 'bazaar' | 'deposits' | 'summary' | 'members'>('meals');

  // Meal Sheet
  const [mealRecords, setMealRecords] = useState<any[]>([]);
  const [cycleDates, setCycleDates] = useState<string[]>([]);
  const [quickDate, setQuickDate] = useState(new Date().toISOString().split('T')[0]);

  // Daily Menus (Staple, Main Dish, Side Dish for Breakfast, Lunch, Dinner)
  const [dailyMenus, setDailyMenus] = useState<DailyMenu[]>([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuModalDate, setMenuModalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [menuForm, setMenuForm] = useState({
    breakfast: { staple: '', main_dish: '', side_dish: '' },
    lunch: { staple: '', main_dish: '', side_dish: '' },
    dinner: { staple: '', main_dish: '', side_dish: '' }
  });

  // Bazaar
  const [bazaarList, setBazaarList] = useState<any[]>([]);
  const [bazaarForm, setBazaarForm] = useState({
    amount: '',
    items_description: '',
    date: new Date().toISOString().split('T')[0],
    buyer_id: ''
  });

  // Deposits
  const [depositList, setDepositList] = useState<any[]>([]);
  const [depositForm, setDepositForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    user_id: '',
    notes: ''
  });

  // Summary
  const [summaryData, setSummaryData] = useState<{
    totalMeals: number;
    totalBazaar: number;
    totalDeposits: number;
    mealRate: number;
    memberCalculations: MemberCalculation[];
  } | null>(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Check URL query param for telegram-style invite (?join=HOME-XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join') || params.get('code');
    if (joinCode) {
      setIncomingInviteCode(joinCode.toUpperCase());
      fetchInvitePreview(joinCode.toUpperCase());
    }
  }, []);

  const fetchInvitePreview = async (code: string) => {
    try {
      const res = await apiFetch(`/homes/invite/${code}`);
      if (res.success) {
        setInvitePreviewHome(res.home);
      }
    } catch {
      // invalid code preview
    }
  };

  // Initial Auth verification
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsAuthChecking(false);
      return;
    }
    apiFetch('/auth/me')
      .then((res) => {
        if (res.success && res.user) {
          setUser(res.user);
          if (res.user.theme_pref) setTheme(res.user.theme_pref);
          if (res.user.language_pref) setLang(res.user.language_pref);
          loadHomes();
        }
      })
      .catch(() => {
        setAuthToken(null);
      })
      .finally(() => setIsAuthChecking(false));
  }, []);

  // Load user's homes
  const loadHomes = async () => {
    try {
      const res = await apiFetch('/homes');
      if (res.success) {
        setHomes(res.homes);
        if (res.homes.length > 0 && !currentHome) {
          selectHome(res.homes[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectHome = async (home: Home) => {
    setCurrentHome(home);
    try {
      const res = await apiFetch(`/homes/${home.id}`);
      if (res.success) {
        setHomeMembers(res.members);
      }
      loadMessCycles(home.id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessCycles = async (homeId: number) => {
    try {
      const res = await apiFetch(`/mess/home/${homeId}`);
      if (res.success) {
        setMessCycles(res.messCycles);
        if (res.messCycles.length > 0) {
          selectMess(res.messCycles[0]);
        } else {
          setCurrentMess(null);
          setMealRecords([]);
          setSummaryData(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectMess = async (mess: MessCycle) => {
    setCurrentMess(mess);
    try {
      const detailRes = await apiFetch(`/mess/${mess.id}`);
      if (detailRes.success) {
        setCycleDates(detailRes.dates);
      }
      loadMealRecords(mess.id);
      loadDailyMenus(mess.id);
      loadBazaar(mess.id);
      loadDeposits(mess.id);
      loadSummary(mess.id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDailyMenus = async (messId: number) => {
    try {
      const res = await apiFetch(`/meals/${messId}/menu`);
      if (res.success) {
        setDailyMenus(res.menus);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openMenuModal = (dateStr: string) => {
    setMenuModalDate(dateStr);
    const b = dailyMenus.find(m => m.date.split('T')[0] === dateStr && m.meal_type === 'breakfast');
    const l = dailyMenus.find(m => m.date.split('T')[0] === dateStr && m.meal_type === 'lunch');
    const d = dailyMenus.find(m => m.date.split('T')[0] === dateStr && m.meal_type === 'dinner');
    setMenuForm({
      breakfast: { staple: b?.staple || '', main_dish: b?.main_dish || '', side_dish: b?.side_dish || '' },
      lunch: { staple: l?.staple || '', main_dish: l?.main_dish || '', side_dish: l?.side_dish || '' },
      dinner: { staple: d?.staple || '', main_dish: d?.main_dish || '', side_dish: d?.side_dish || '' }
    });
    setShowMenuModal(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess || !menuModalDate) return;
    try {
      await Promise.all([
        apiFetch(`/meals/${currentMess.id}/menu`, {
          method: 'POST',
          body: JSON.stringify({
            date: menuModalDate,
            meal_type: 'breakfast',
            ...menuForm.breakfast
          })
        }),
        apiFetch(`/meals/${currentMess.id}/menu`, {
          method: 'POST',
          body: JSON.stringify({
            date: menuModalDate,
            meal_type: 'lunch',
            ...menuForm.lunch
          })
        }),
        apiFetch(`/meals/${currentMess.id}/menu`, {
          method: 'POST',
          body: JSON.stringify({
            date: menuModalDate,
            meal_type: 'dinner',
            ...menuForm.dinner
          })
        })
      ]);
      await loadDailyMenus(currentMess.id);
      setShowMenuModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save menu');
    }
  };

  const loadMealRecords = async (messId: number) => {
    try {
      const res = await apiFetch(`/meals/${messId}`);
      if (res.success) {
        setMealRecords(res.mealRecords);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBazaar = async (messId: number) => {
    try {
      const res = await apiFetch(`/bazaar/${messId}`);
      if (res.success) {
        setBazaarList(res.expenses);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadDeposits = async (messId: number) => {
    try {
      const res = await apiFetch(`/deposits/${messId}`);
      if (res.success) {
        setDepositList(res.deposits);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSummary = async (messId: number) => {
    try {
      const res = await apiFetch(`/summary/${messId}`);
      if (res.success) {
        setSummaryData(res.summary);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authMode === 'signin') {
      setAuthSuccess('');
    }

    const emailTrimmed = authForm.email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailTrimmed)) {
      setAuthError(lang === 'bn' ? 'সঠিক ইমেইল ফরম্যাট দিন (যেমন: iffat@example.com)' : 'Please enter a valid email address (e.g. iffat@example.com)');
      return;
    }

    if (authMode === 'signup') {
      const nameTrimmed = authForm.name.trim();
      if (!nameTrimmed) {
        setAuthError(lang === 'bn' ? 'আপনার নাম লিখুন' : 'Please enter your name');
        return;
      }
      if (nameTrimmed.length < 2) {
        setAuthError(lang === 'bn' ? 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' : 'Name must be at least 2 characters');
        return;
      }
      // Flexible name supporting Bangla or English, spaces, dots, dashes (e.g. Iffat Bin Hossain, ইফফাত বিন হোসেন)
      const nameRegex = /^[\p{L}\p{M}\s.'-]+$/u;
      if (!nameRegex.test(nameTrimmed)) {
        setAuthError(lang === 'bn' ? 'নামে শুধু বাংলা বা ইংরেজি অক্ষর ব্যবহার করুন (যেমন: Iffat Bin Hossain)' : 'Please enter a valid name in English or Bangla (e.g. Iffat Bin Hossain)');
        return;
      }
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError(t.passwordMismatch);
        return;
      }
      if (authForm.password.length < 6) {
        setAuthError(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        return;
      }
    }

    try {
      const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/signin';
      const payload = authMode === 'signup'
        ? {
            name: authForm.name,
            email: authForm.email,
            phone: authForm.phone,
            password: authForm.password,
            language_pref: lang,
            theme_pref: theme
          }
        : {
            email: authForm.email,
            password: authForm.password
          };
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.success) {
        if (authMode === 'signup') {
          // Account created successfully: notify user and redirect to sign in page
          setAuthSuccess(t.accountCreatedSuccess);
          setAuthMode('signin');
          setAuthError('');
          setAuthForm(prev => ({
            ...prev,
            password: '',
            confirmPassword: ''
          }));
          return;
        }

        setAuthToken(res.token);
        setUser(res.user);
        loadHomes();
        // If an invite code was pending in URL, join right away!
        if (incomingInviteCode) {
          joinHomeWithCode(incomingInviteCode);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error');
    }
  };

  // Create Home
  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeForm.name.trim()) return;
    try {
      const res = await apiFetch('/homes', {
        method: 'POST',
        body: JSON.stringify(newHomeForm)
      });
      if (res.success) {
        setShowCreateHomeModal(false);
        setNewHomeForm({ name: '', address: '' });
        await loadHomes();
        selectHome(res.home);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Join Home with Code (Telegram-style)
  const joinHomeWithCode = async (code: string) => {
    try {
      const res = await apiFetch('/homes/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: code })
      });
      if (res.success) {
        setIncomingInviteCode(null);
        setInvitePreviewHome(null);
        setShowJoinModal(false);
        setJoinCodeInput('');
        await loadHomes();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create Mess Cycle (customizable, default 10 days!)
  const handleCreateMess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHome) return;
    try {
      const res = await apiFetch(`/mess/home/${currentHome.id}`, {
        method: 'POST',
        body: JSON.stringify({
          name: newMessForm.name,
          duration_days: newMessForm.duration_days,
          start_date: newMessForm.start_date
        })
      });
      if (res.success) {
        setShowCreateMessModal(false);
        setNewMessForm({
          name: '',
          duration_days: 10,
          start_date: new Date().toISOString().split('T')[0]
        });
        await loadMessCycles(currentHome.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 1-Tap Quick Toggle Today's Meal
  const handleQuickMealToggle = async (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!currentMess || !user) return;
    try {
      await apiFetch(`/meals/${currentMess.id}/quick-toggle`, {
        method: 'POST',
        body: JSON.stringify({
          date: quickDate,
          meal_type: mealType
        })
      });
      loadMealRecords(currentMess.id);
      loadSummary(currentMess.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Update Individual Meal Record
  const handleUpdateMeal = async (userId: number, date: string, type: 'b' | 'l' | 'd' | 'g', val: number) => {
    if (!currentMess) return;
    const existing = mealRecords.find(r => r.user_id === userId && r.date.split('T')[0] === date);
    const b = type === 'b' ? val : (existing ? parseFloat(existing.breakfast) : 0);
    const l = type === 'l' ? val : (existing ? parseFloat(existing.lunch) : 1);
    const d = type === 'd' ? val : (existing ? parseFloat(existing.dinner) : 1);
    const g = type === 'g' ? val : (existing ? parseFloat(existing.guest_meals) : 0);

    try {
      await apiFetch(`/meals/${currentMess.id}/record`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          date,
          breakfast: b,
          lunch: l,
          dinner: d,
          guest_meals: g
        })
      });
      loadMealRecords(currentMess.id);
      loadSummary(currentMess.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Bazaar
  const handleAddBazaar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess || !bazaarForm.amount || !bazaarForm.items_description) return;
    try {
      const res = await apiFetch(`/bazaar/${currentMess.id}`, {
        method: 'POST',
        body: JSON.stringify(bazaarForm)
      });
      if (res.success) {
        setBazaarForm({
          amount: '',
          items_description: '',
          date: new Date().toISOString().split('T')[0],
          buyer_id: ''
        });
        loadBazaar(currentMess.id);
        loadSummary(currentMess.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Deposit
  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess || !depositForm.amount) return;
    try {
      const res = await apiFetch(`/deposits/${currentMess.id}`, {
        method: 'POST',
        body: JSON.stringify(depositForm)
      });
      if (res.success) {
        setDepositForm({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          user_id: '',
          notes: ''
        });
        loadDeposits(currentMess.id);
        loadSummary(currentMess.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Copy Telegram-Style Invite Link
  const copyInviteLink = () => {
    if (!currentHome) return;
    const url = `${window.location.origin}/?join=${currentHome.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  // Toggle Theme
  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (user) {
      apiFetch('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ theme_pref: nextTheme })
      }).catch(() => {});
    }
  };

  // Toggle Language
  const toggleLanguage = async () => {
    const nextLang = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    if (user) {
      apiFetch('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ language_pref: nextLang })
      }).catch(() => {});
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setHomes([]);
    setCurrentHome(null);
    setCurrentMess(null);
  };

  // Quick meal state for today's user
  const userTodayRecord = mealRecords.find(
    r => r.user_id === user?.id && r.date.split('T')[0] === quickDate
  );

  if (isAuthChecking) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <img src={theme === 'dark' ? '/logo-dark-transparent.png' : '/logo-transparent.png'} alt="Logo" style={{ height: 72, width: 'auto', animation: 'pulseSubtle 1.5s infinite' }} />
      </div>
    );
  }

  // Telegram-style Invite Join Banner / Screen if opened via link
  if (incomingInviteCode && !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{
          maxWidth: 400,
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: 28,
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)'
        }} className="animate-slide-up">
          <img src={theme === 'dark' ? '/logo-dark-transparent.png' : '/logo-transparent.png'} alt="রসুইঘর" style={{ height: 72, width: 'auto', marginBottom: 12 }} />
          <h2 style={{ fontSize: 20, color: 'var(--brand-green)', marginBottom: 4 }}>
            {invitePreviewHome ? invitePreviewHome.name : 'ঘর আমন্ত্রণ'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
            {t.instJoinHome}
          </p>

          <div style={{
            background: 'var(--bg-card-subtle)',
            padding: 14,
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            fontSize: 13
          }}>
            <p style={{ fontWeight: 600, color: 'var(--brand-terracotta)' }}>{incomingInviteCode}</p>
            {invitePreviewHome && (
              <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                {invitePreviewHome.member_count} {t.membersCount}
              </p>
            )}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            {t.authTagline}
          </p>

          <button
            onClick={() => {
              setAuthMode('signup');
              setIncomingInviteCode(incomingInviteCode);
            }}
            style={{
              width: '100%',
              background: 'var(--brand-green)',
              color: '#FFF',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
            {t.signUpAction} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Not logged in -> Split Layout: Logo on Left, Sign In/Up on Right
  if (!user) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-split-card animate-slide-up">
          
          {/* LEFT SIDE: LOGO & BRANDING */}
          <div className="auth-left-pane">
            <div className="auth-logo-wrapper">
              <img
                src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'}
                alt="রসুইঘর"
                className="auth-logo-img"
              />
            </div>

            <p className="auth-subtitle">
              {t.appSubtitle}
            </p>
          </div>

          {/* RIGHT SIDE: SIGN IN / SIGN UP FORM */}
          <div className="auth-right-pane">
            {/* Top Bar: Language & Theme switch */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
              <button
                onClick={toggleLanguage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card-subtle)'
                }}>
                  <Globe size={13} /> {lang === 'bn' ? 'English' : 'বাংলা'}
              </button>
              <button
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 9px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  background: 'var(--bg-card-subtle)'
                }}>
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
            </div>

            {/* Mode Switch Pills */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-card-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 4,
              marginBottom: 20,
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 700,
                  background: authMode === 'signin' ? 'var(--bg-card)' : 'transparent',
                  color: authMode === 'signin' ? 'var(--brand-green)' : 'var(--text-muted)',
                  boxShadow: authMode === 'signin' ? 'var(--shadow-sm)' : 'none'
                }}>
                {t.signIn}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 700,
                  background: authMode === 'signup' ? 'var(--bg-card)' : 'transparent',
                  color: authMode === 'signup' ? 'var(--brand-green)' : 'var(--text-muted)',
                  boxShadow: authMode === 'signup' ? 'var(--shadow-sm)' : 'none'
                }}>
                {t.signUp}
              </button>
            </div>

            {authSuccess && (
              <div style={{
                background: 'var(--badge-success-bg)',
                color: 'var(--badge-success-text)',
                padding: '11px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <CheckCircle2 size={16} /> {authSuccess}
              </div>
            )}

            {authError && (
              <div style={{
                background: 'var(--badge-due-bg)',
                color: 'var(--badge-due-text)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <AlertCircle size={16} /> {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {authMode === 'signup' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 5 }}>
                    {t.name}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iffat Bin Hossain"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 14
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 5 }}>
                  {t.email}
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. iffat@example.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 14
                  }}
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 5 }}>
                    {t.phone} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({lang === 'bn' ? 'ঐচ্ছিক' : 'Optional'})</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +880 1712 345678"
                    value={authForm.phone}
                    onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 14
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 5 }}>
                  {t.password}
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 14
                    }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {authMode === 'signup' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 5 }}>
                    {t.confirmPassword}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your password"
                      value={authForm.confirmPassword}
                      onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 14
                      }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                style={{
                  marginTop: 6,
                  background: 'var(--brand-green)',
                  color: '#FFFFFF',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 15,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                {authMode === 'signup' ? t.signUpAction : t.signInAction}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => {
                  const nextMode = authMode === 'signin' ? 'signup' : 'signin';
                  setAuthMode(nextMode);
                  setAuthError('');
                  if (nextMode === 'signup') setAuthSuccess('');
                }}
                style={{ fontSize: 13, color: 'var(--brand-terracotta)', fontWeight: 600 }}>
                {authMode === 'signin' ? t.dontHaveAccount : t.alreadyHaveAccount}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged In Application Dashboard
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navigation Bar */}
      <header style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 32px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          {/* Brand Logo & Subtitle */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}>
            <img
              src={theme === 'dark' ? '/logo-dark-transparent.png' : '/logo-transparent.png'}
              alt="রসুইঘর"
              style={{
                height: 52,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))'
              }}
            />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--brand-terracotta)',
              margin: '3px 0 0',
              lineHeight: 1.1,
              letterSpacing: '0.4px',
              textAlign: 'center'
            }}>
              {t.appSubtitle}
            </span>
          </div>

          {/* Home Switcher Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {homes.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HomeIcon size={16} color="var(--brand-green)" />
                <select
                  value={currentHome?.id || ''}
                  onChange={(e) => {
                    if (e.target.value === '__new_home__') {
                      setShowCreateHomeModal(true);
                    } else if (e.target.value === '__join_home__') {
                      setShowJoinModal(true);
                    } else {
                      const selected = homes.find(h => h.id === parseInt(e.target.value, 10));
                      if (selected) selectHome(selected);
                    }
                  }}
                  style={{
                    background: 'var(--bg-card-subtle)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '7px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}>
                  {homes.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                  <option disabled>──────────</option>
                  <option value="__new_home__">+ {t.createHomeBtn.replace(/^\+\s*/, '')}</option>
                  <option value="__join_home__">🔗 {t.joinHomeBtn}</option>
                </select>
              </div>
            ) : null}
          </div>

          {/* Right Controls: Theme, Language, Profile, UI-Compatible Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={toggleLanguage}
              title="Change Language"
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: 12,
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                background: 'var(--bg-card)'
              }}>
              <Globe size={13} /> {lang === 'bn' ? 'EN' : 'বাং'}
            </button>

            <button
              onClick={toggleTheme}
              title="Toggle Theme"
              style={{
                padding: 7,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                background: 'var(--bg-card)'
              }}>
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* User Profile Badge (Separate from Logout) */}
            <div
              title={user.email}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 12px',
                background: 'var(--bg-card-subtle)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-main)'
              }}>
              <span style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'var(--brand-green)',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'uppercase'
              }}>
                {user.name ? user.name.trim().charAt(0) : 'U'}
              </span>
              <span>{user.name.split(' ')[0]}</span>
            </div>

            {/* UI-Compatible Logout Button */}
            <button
              onClick={handleLogout}
              title={t.logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.4)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              <LogOut size={14} />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1440, width: '100%', margin: '0 auto', padding: '20px 32px', flex: 1 }}>
        
        {/* If no home created yet */}
        {homes.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            padding: 40,
            textAlign: 'center',
            maxWidth: 500,
            margin: '40px auto'
          }}>
            <HomeIcon size={44} color="var(--brand-green)" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: 20, color: 'var(--brand-green)', marginBottom: 8 }}>
              {t.instCreateHome}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {t.instShareLink}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowCreateHomeModal(true)}
                style={{
                  background: 'var(--brand-green)',
                  color: '#FFF',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: 14
                }}>
                {t.createHomeBtn}
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                style={{
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-main)',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: 14
                }}>
                {t.joinHomeBtn}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Home Info & Telegram Invite Link Header */}
            {currentHome && (
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                padding: '16px 20px',
                marginBottom: 16,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-green)' }}>
                      {currentHome.name}
                    </h2>
                    <span style={{
                      fontSize: 11,
                      background: 'var(--brand-green-soft)',
                      color: 'var(--brand-green)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600
                    }}>
                      {homeMembers.length} {t.membersCount}
                    </span>
                  </div>
                  {currentHome.address && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {currentHome.address}
                    </p>
                  )}
                </div>

                {/* Telegram-style Invite Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={copyInviteLink}
                    style={{
                      background: copiedInvite ? 'var(--brand-leaf)' : 'var(--brand-terracotta)',
                      color: '#FFF',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'var(--transition)'
                    }}>
                    {copiedInvite ? <Check size={15} /> : <Share2 size={15} />}
                    {copiedInvite ? t.linkCopied : t.instShareLink}
                  </button>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 12
                    }}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Mess Cycle Bar (10-Day Default) */}
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              padding: '12px 18px',
              marginBottom: 16,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {t.activeMess}:
                </span>
                {messCycles.length > 0 ? (
                  <select
                    value={currentMess?.id || ''}
                    onChange={(e) => {
                      const sel = messCycles.find(m => m.id === parseInt(e.target.value, 10));
                      if (sel) selectMess(sel);
                    }}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 12px',
                      fontSize: 13,
                      fontWeight: 600
                    }}>
                    {messCycles.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.duration_days} দিন)
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--brand-terracotta)' }}>
                    {t.instCreateMess}
                  </span>
                )}
              </div>

              {/* Everyone can create mess button */}
              <button
                onClick={() => setShowCreateMessModal(true)}
                style={{
                  background: 'var(--brand-green)',
                  color: '#FFF',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                <Plus size={14} /> {t.startNewMess}
              </button>
            </div>

            {/* If no mess cycle created yet in this home */}
            {!currentMess ? (
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                padding: 36,
                textAlign: 'center',
                maxWidth: 480,
                margin: '30px auto'
              }}>
                <Utensils size={40} color="var(--brand-terracotta)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 18, color: 'var(--brand-green)', marginBottom: 6 }}>
                  {t.instCreateMess}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
                  {t.instTenDayDefault}
                </p>
                <button
                  onClick={() => setShowCreateMessModal(true)}
                  style={{
                    background: 'var(--brand-green)',
                    color: '#FFF',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: 14
                  }}>
                  {t.startNewMess}
                </button>
              </div>
            ) : (
              <>
                {/* 1-Tap Quick Action Bar for Today */}
                <div style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}>
                  {/* Card Header: Title, Date Picker, Edit Menu Button */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--brand-green-soft)',
                        color: 'var(--brand-green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Utensils size={18} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand-green)', margin: 0 }}>
                          {t.mealMenu}
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                          {t.todayQuickAction}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="date"
                        value={quickDate}
                        onChange={(e) => setQuickDate(e.target.value)}
                        style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      />
                      <button
                        onClick={() => openMenuModal(quickDate)}
                        title={t.editMenu}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--brand-green)',
                          color: '#FFFFFF',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}>
                        <Edit3 size={14} />
                        <span>{t.editMenu}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Meal Slots Grid */}
                  {(() => {
                    const selRecords = mealRecords.filter(r => r.date.split('T')[0] === quickDate);
                    const bActive = userTodayRecord && parseFloat(userTodayRecord.breakfast) > 0;
                    const lActive = userTodayRecord && parseFloat(userTodayRecord.lunch) > 0;
                    const dActive = userTodayRecord && parseFloat(userTodayRecord.dinner) > 0;

                    const bCount = selRecords.filter(r => parseFloat(r.breakfast) > 0).length;
                    const lCount = selRecords.filter(r => parseFloat(r.lunch) > 0).length;
                    const dCount = selRecords.filter(r => parseFloat(r.dinner) > 0).length;

                    const bMenu = dailyMenus.find(m => m.date.split('T')[0] === quickDate && m.meal_type === 'breakfast');
                    const lMenu = dailyMenus.find(m => m.date.split('T')[0] === quickDate && m.meal_type === 'lunch');
                    const dMenu = dailyMenus.find(m => m.date.split('T')[0] === quickDate && m.meal_type === 'dinner');

                    return (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 16
                      }}>
                        {/* SLOT 1: BREAKFAST (সকালের নাস্তা) */}
                        <div style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 14
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Coffee size={18} color="var(--brand-terracotta)" />
                                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                                  {t.breakfastSlot}
                                </span>
                              </div>
                              <span style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-muted)',
                                fontWeight: 600
                              }}>
                                {bCount} {t.membersCount}
                              </span>
                            </div>

                            {/* Dishes: Staple, Main Dish, Side Dish */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.staple}:</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                  {bMenu?.staple || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.mainDish}:</span>
                                <span style={{ color: 'var(--brand-terracotta)', fontWeight: 700 }}>
                                  {bMenu?.main_dish || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.sideDish}:</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                  {bMenu?.side_dish || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Toggle */}
                          <button
                            onClick={() => handleQuickMealToggle('breakfast')}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: bActive ? 'var(--brand-green)' : 'var(--bg-card)',
                              color: bActive ? '#FFFFFF' : 'var(--text-muted)',
                              border: bActive ? '1px solid var(--brand-green)' : '1px solid var(--border-color)',
                              transition: 'var(--transition)'
                            }}>
                            <span>{t.breakfast}:</span>
                            <span>{bActive ? t.on : t.off}</span>
                          </button>
                        </div>

                        {/* SLOT 2: LUNCH (দুপুরের খাবার) */}
                        <div style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 14
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sun size={18} color="var(--brand-green)" />
                                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                                  {t.lunchSlot}
                                </span>
                              </div>
                              <span style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-muted)',
                                fontWeight: 600
                              }}>
                                {lCount} {t.membersCount}
                              </span>
                            </div>

                            {/* Dishes: Staple, Main Dish, Side Dish */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.staple}:</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                  {lMenu?.staple || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.mainDish}:</span>
                                <span style={{ color: 'var(--brand-terracotta)', fontWeight: 700 }}>
                                  {lMenu?.main_dish || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.sideDish}:</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                  {lMenu?.side_dish || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Toggle */}
                          <button
                            onClick={() => handleQuickMealToggle('lunch')}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: lActive ? 'var(--brand-green)' : 'var(--bg-card)',
                              color: lActive ? '#FFFFFF' : 'var(--text-muted)',
                              border: lActive ? '1px solid var(--brand-green)' : '1px solid var(--border-color)',
                              transition: 'var(--transition)'
                            }}>
                            <span>{t.lunch}:</span>
                            <span>{lActive ? t.on : t.off}</span>
                          </button>
                        </div>

                        {/* SLOT 3: DINNER (রাতের খাবার) */}
                        <div style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 14
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Moon size={18} color="var(--brand-terracotta)" />
                                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                                  {t.dinnerSlot}
                                </span>
                              </div>
                              <span style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-muted)',
                                fontWeight: 600
                              }}>
                                {dCount} {t.membersCount}
                              </span>
                            </div>

                            {/* Dishes: Staple, Main Dish, Side Dish */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.staple}:</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                  {dMenu?.staple || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.mainDish}:</span>
                                <span style={{ color: 'var(--brand-terracotta)', fontWeight: 700 }}>
                                  {dMenu?.main_dish || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 70, fontWeight: 600 }}>{t.sideDish}:</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                  {dMenu?.side_dish || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>—</span>}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Toggle */}
                          <button
                            onClick={() => handleQuickMealToggle('dinner')}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: dActive ? 'var(--brand-green)' : 'var(--bg-card)',
                              color: dActive ? '#FFFFFF' : 'var(--text-muted)',
                              border: dActive ? '1px solid var(--brand-green)' : '1px solid var(--border-color)',
                              transition: 'var(--transition)'
                            }}>
                            <span>{t.dinner}:</span>
                            <span>{dActive ? t.on : t.off}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Navigation Tabs */}
                <div style={{
                  display: 'flex',
                  gap: 8,
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: 16,
                  overflowX: 'auto',
                  paddingBottom: 4
                }}>
                  {[
                    { key: 'meals', label: t.tabMeals, icon: Utensils },
                    { key: 'bazaar', label: t.tabBazaar, icon: ShoppingBag },
                    { key: 'deposits', label: t.tabDeposits, icon: DollarSign },
                    { key: 'summary', label: t.tabSummary, icon: TrendingUp },
                    { key: 'members', label: t.tabMembers, icon: Users }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? 'var(--brand-green)' : 'var(--text-muted)',
                          background: isActive ? 'var(--bg-card)' : 'transparent',
                          borderBottom: isActive ? '2px solid var(--brand-green)' : '2px solid transparent',
                          whiteSpace: 'nowrap'
                        }}>
                        <Icon size={15} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* TAB CONTENT: MEALS */}
                {activeTab === 'meals' && (
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    padding: 18,
                    overflowX: 'auto'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-green)', margin: 0 }}>
                          {t.instUpdateMeal}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                          🌅 {t.breakfast} ({lang === 'bn' ? 'সকাল' : 'B'}) • ☀️ {t.lunch} ({lang === 'bn' ? 'দুপুর' : 'L'}) • 🌙 {t.dinner} ({lang === 'bn' ? 'রাত' : 'D'})
                        </p>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {currentMess.name} ({currentMess.duration_days} {t.days})
                      </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'center' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-main)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 90 }}>{t.date}</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 180 }}>{t.mealMenu}</th>
                          {homeMembers.map(m => (
                            <th key={m.user_id} style={{ padding: '10px 8px', minWidth: 100 }}>
                              {m.name.split(' ')[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cycleDates.map(d => {
                          const dateMenus = dailyMenus.filter(m => m.date.split('T')[0] === d);
                          const bM = dateMenus.find(m => m.meal_type === 'breakfast');
                          const lM = dateMenus.find(m => m.meal_type === 'lunch');
                          const dM = dateMenus.find(m => m.meal_type === 'dinner');

                          return (
                            <tr key={d} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--brand-green)', whiteSpace: 'nowrap' }}>
                                {d.slice(5)}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                    {bM?.main_dish || lM?.main_dish || dM?.main_dish ? (
                                      <span>
                                        {bM?.main_dish ? `🌅 ${bM.main_dish} ` : ''}
                                        {lM?.main_dish ? `☀️ ${lM.main_dish} ` : ''}
                                        {dM?.main_dish ? `🌙 ${dM.main_dish}` : ''}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>{t.noMenuYet}</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => openMenuModal(d)}
                                    title={t.editMenu}
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      border: '1px solid var(--border-color)',
                                      background: 'var(--bg-card-subtle)',
                                      color: 'var(--brand-green)',
                                      cursor: 'pointer',
                                      fontSize: 10
                                    }}>
                                    <Edit3 size={11} />
                                  </button>
                                </div>
                              </td>
                              {homeMembers.map(m => {
                                const record = mealRecords.find(r => r.user_id === m.user_id && r.date.split('T')[0] === d);
                                const b = record ? parseFloat(record.breakfast) : 0;
                                const l = record ? parseFloat(record.lunch) : 1;
                                const din = record ? parseFloat(record.dinner) : 1;
                                const tot = (b + l + din).toFixed(1);

                                return (
                                  <td key={m.user_id} style={{ padding: '6px 8px' }}>
                                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                                      {/* Breakfast Slot */}
                                      <button
                                        onClick={() => handleUpdateMeal(m.user_id, d, 'b', b > 0 ? 0 : 1)}
                                        title={`${t.breakfastSlot}: ${b > 0 ? t.on : t.off}`}
                                        style={{
                                          padding: '3px 6px',
                                          borderRadius: 4,
                                          fontSize: 10,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          background: b > 0 ? 'var(--brand-green)' : 'var(--bg-card-subtle)',
                                          color: b > 0 ? '#FFF' : 'var(--text-muted)',
                                          border: b > 0 ? 'none' : '1px solid var(--border-color)'
                                        }}>
                                        {lang === 'bn' ? 'স' : 'B'}
                                      </button>
                                      {/* Lunch Slot */}
                                      <button
                                        onClick={() => handleUpdateMeal(m.user_id, d, 'l', l > 0 ? 0 : 1)}
                                        title={`${t.lunchSlot}: ${l > 0 ? t.on : t.off}`}
                                        style={{
                                          padding: '3px 6px',
                                          borderRadius: 4,
                                          fontSize: 10,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          background: l > 0 ? 'var(--brand-green)' : 'var(--bg-card-subtle)',
                                          color: l > 0 ? '#FFF' : 'var(--text-muted)',
                                          border: l > 0 ? 'none' : '1px solid var(--border-color)'
                                        }}>
                                        {lang === 'bn' ? 'দ' : 'L'}
                                      </button>
                                      {/* Dinner Slot */}
                                      <button
                                        onClick={() => handleUpdateMeal(m.user_id, d, 'd', din > 0 ? 0 : 1)}
                                        title={`${t.dinnerSlot}: ${din > 0 ? t.on : t.off}`}
                                        style={{
                                          padding: '3px 6px',
                                          borderRadius: 4,
                                          fontSize: 10,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          background: din > 0 ? 'var(--brand-green)' : 'var(--bg-card-subtle)',
                                          color: din > 0 ? '#FFF' : 'var(--text-muted)',
                                          border: din > 0 ? 'none' : '1px solid var(--border-color)'
                                        }}>
                                        {lang === 'bn' ? 'র' : 'D'}
                                      </button>
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 2, fontWeight: 600 }}>
                                      {tot}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB CONTENT: BAZAAR */}
                {activeTab === 'bazaar' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                    {/* Add Bazaar Form */}
                    <div style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      padding: 18
                    }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand-green)', marginBottom: 12 }}>
                        {t.instAddBazaar}
                      </h3>
                      <form onSubmit={handleAddBazaar} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <input
                          type="number"
                          placeholder="Amount in BDT (৳)"
                          required
                          value={bazaarForm.amount}
                          onChange={(e) => setBazaarForm({ ...bazaarForm, amount: e.target.value })}
                          style={{
                            flex: '1 1 120px',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: 13
                          }}
                        />
                        <input
                          type="text"
                          placeholder="e.g. Rice, Lentils, Oil, Fish"
                          required
                          value={bazaarForm.items_description}
                          onChange={(e) => setBazaarForm({ ...bazaarForm, items_description: e.target.value })}
                          style={{
                            flex: '2 1 200px',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: 13
                          }}
                        />
                        <input
                          type="date"
                          value={bazaarForm.date}
                          onChange={(e) => setBazaarForm({ ...bazaarForm, date: e.target.value })}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: 13
                          }}
                        />
                        <select
                          value={bazaarForm.buyer_id}
                          onChange={(e) => setBazaarForm({ ...bazaarForm, buyer_id: e.target.value })}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: 13
                          }}>
                          <option value="">{user.name} ({t.buyer})</option>
                          {homeMembers.map(m => (
                            <option key={m.user_id} value={m.user_id}>{m.name}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          style={{
                            background: 'var(--brand-green)',
                            color: '#FFF',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            fontSize: 13
                          }}>
                          + {t.addBazaarTitle}
                        </button>
                      </form>
                    </div>

                    {/* Bazaar List */}
                    <div style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      padding: 16
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                          {t.totalBazaarLabel}: ৳{summaryData?.totalBazaar || 0}
                        </span>
                      </div>
                      {bazaarList.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                          {t.noBazaarYet}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {bazaarList.map(b => (
                            <div key={b.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-card-subtle)',
                              border: '1px solid var(--border-color)'
                            }}>
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                                  {b.items_description}
                                </p>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {b.buyer_name} • {b.date.slice(0, 10)}
                                </span>
                              </div>
                              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-terracotta)' }}>
                                ৳{b.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: DEPOSITS */}
                {activeTab === 'deposits' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                    {/* Add Deposit Form */}
                    <div style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      padding: 18
                    }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand-green)', marginBottom: 12 }}>
                        {t.instAddDeposit}
                      </h3>
                      <form onSubmit={handleAddDeposit} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <select
                          value={depositForm.user_id}
                          onChange={(e) => setDepositForm({ ...depositForm, user_id: e.target.value })}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: 13
                          }}>
                          <option value="">{user.name} ({t.member})</option>
                          {homeMembers.map(m => (
                            <option key={m.user_id} value={m.user_id}>{m.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder={t.amountPlaceholder}
                          required
                          value={depositForm.amount}
                          onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                          style={{
                            flex: '1 1 120px',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: 13
                          }}
                        />
                        <input
                          type="date"
                          value={depositForm.date}
                          onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            color: 'var(--text-main)',
                            fontSize: 13
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            background: 'var(--brand-green)',
                            color: '#FFF',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            fontSize: 13
                          }}>
                          + {t.addDepositTitle}
                        </button>
                      </form>
                    </div>

                    {/* Deposit List */}
                    <div style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      padding: 16
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                          {t.totalDepositLabel}: ৳{summaryData?.totalDeposits || 0}
                        </span>
                      </div>
                      {depositList.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                          {t.noDepositsYet}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {depositList.map(d => (
                            <div key={d.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-card-subtle)',
                              border: '1px solid var(--border-color)'
                            }}>
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                                  {d.user_name}
                                </p>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {d.date.slice(0, 10)}
                                </span>
                              </div>
                              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-green)' }}>
                                ৳{d.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: SUMMARY & CALCULATIONS */}
                {activeTab === 'summary' && summaryData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Top KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 16,
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.totalMeals}</span>
                        <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand-green)', marginTop: 4 }}>
                          {summaryData.totalMeals}
                        </h3>
                      </div>

                      <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 16,
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.totalBazaarCost}</span>
                        <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand-terracotta)', marginTop: 4 }}>
                          ৳{summaryData.totalBazaar}
                        </h3>
                      </div>

                      <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 16,
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.mealRate}</span>
                        <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand-green)', marginTop: 4 }}>
                          ৳{summaryData.mealRate}
                        </h3>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.perMealFormula}</p>
                      </div>

                      <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 16,
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.totalCashDeposit}</span>
                        <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand-green)', marginTop: 4 }}>
                          ৳{summaryData.totalDeposits}
                        </h3>
                      </div>
                    </div>

                    {/* Member Settlement Cards */}
                    <div style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      padding: 18
                    }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--brand-green)', marginBottom: 14 }}>
                        {t.instViewSummary}
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                        {summaryData.memberCalculations.map(m => (
                          <div key={m.userId} style={{
                            background: 'var(--bg-card-subtle)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: 14
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                                {m.name}
                              </h4>
                              <span style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                fontWeight: 600,
                                background: m.status === 'surplus' ? 'var(--badge-success-bg)' : 'var(--badge-due-bg)',
                                color: m.status === 'surplus' ? 'var(--badge-success-text)' : 'var(--badge-due-text)'
                              }}>
                                {m.status === 'surplus' ? t.refundDue : t.paymentDue}
                              </span>
                            </div>

                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t.totalMeals}:</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.meals.total}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t.costFormula}:</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>৳{m.mealCost}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t.depositGiven}:</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>৳{m.deposit}</span>
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderTop: '1px solid var(--border-color)',
                                paddingTop: 6,
                                marginTop: 4,
                                fontSize: 13,
                                fontWeight: 700,
                                color: m.balance >= 0 ? 'var(--badge-success-text)' : 'var(--badge-due-text)'
                              }}>
                                <span>{t.netBalance}:</span>
                                <span>{m.balance >= 0 ? `+৳${m.balance}` : `-৳${Math.abs(m.balance)}`}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: MEMBERS */}
                {activeTab === 'members' && (
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    padding: 18
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--brand-green)' }}>
                        {t.tabMembers} ({homeMembers.length})
                      </h3>
                      <button
                        onClick={copyInviteLink}
                        style={{
                          background: 'var(--brand-green)',
                          color: '#FFF',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                        <Share2 size={13} /> {t.copyLink}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {homeMembers.map(m => (
                        <div key={m.user_id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-color)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34,
                              height: 34,
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--brand-green)',
                              color: '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 14
                            }}>
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                                {m.name}
                              </p>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {m.email} {m.phone ? `• ${m.phone}` : ''}
                              </span>
                            </div>
                          </div>
                          <span style={{
                            fontSize: 11,
                            background: m.role === 'manager' ? 'var(--brand-terracotta-soft)' : 'var(--brand-green-soft)',
                            color: m.role === 'manager' ? 'var(--brand-terracotta)' : 'var(--brand-green)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: 600
                          }}>
                            {m.role === 'manager' ? t.managerRole : t.memberRole}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* CREATE HOME MODAL */}
      {showCreateHomeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 100
        }}>
          <div style={{
            maxWidth: 400,
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)'
          }} className="animate-slide-up">
            <h3 style={{ fontSize: 18, color: 'var(--brand-green)', marginBottom: 6 }}>
              {t.instCreateHome}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {t.instShareLink}
            </p>

            <form onSubmit={handleCreateHome} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder={t.homeNamePlaceholder}
                required
                value={newHomeForm.name}
                onChange={(e) => setNewHomeForm({ ...newHomeForm, name: e.target.value })}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-main)',
                  fontSize: 14
                }}
              />
              <input
                type="text"
                placeholder={t.homeAddressPlaceholder}
                value={newHomeForm.address}
                onChange={(e) => setNewHomeForm({ ...newHomeForm, address: e.target.value })}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-main)',
                  fontSize: 14
                }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateHomeModal(false)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: 13,
                    color: 'var(--text-muted)'
                  }}>
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-green)',
                    color: '#FFF',
                    fontWeight: 600,
                    fontSize: 13
                  }}>
                  {t.createAction}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN HOME MODAL */}
      {showJoinModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 100
        }}>
          <div style={{
            maxWidth: 380,
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)'
          }} className="animate-slide-up">
            <h3 style={{ fontSize: 18, color: 'var(--brand-green)', marginBottom: 6 }}>
              {t.instJoinHome}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {t.inviteCodePrompt}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder="e.g. HOME-XXXXXX"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-main)',
                  fontSize: 15,
                  textAlign: 'center',
                  fontWeight: 600,
                  letterSpacing: 1
                }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: 13,
                    color: 'var(--text-muted)'
                  }}>
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => joinHomeWithCode(joinCodeInput)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-green)',
                    color: '#FFF',
                    fontWeight: 600,
                    fontSize: 13
                  }}>
                  {t.joinAction}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TELEGRAM-STYLE INVITE MODAL */}
      {showInviteModal && currentHome && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 100
        }}>
          <div style={{
            maxWidth: 420,
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: 28,
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }} className="animate-slide-up">
            <Share2 size={36} color="var(--brand-terracotta)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: 18, color: 'var(--brand-green)', marginBottom: 4 }}>
              {currentHome.name}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
              {t.telegramStyleInvite}
            </p>

            <div style={{
              background: 'var(--bg-card-subtle)',
              border: '1px dashed var(--brand-green)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: 13,
              wordBreak: 'break-all',
              marginBottom: 16,
              color: 'var(--text-main)',
              fontFamily: 'monospace'
            }}>
              {window.location.origin}/?join={currentHome.invite_code}
            </div>

            <button
              onClick={copyInviteLink}
              style={{
                width: '100%',
                background: copiedInvite ? 'var(--brand-leaf)' : 'var(--brand-green)',
                color: '#FFF',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10
              }}>
              {copiedInvite ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copiedInvite ? t.linkCopied : t.copyLink}
            </button>

            <button
              onClick={() => setShowInviteModal(false)}
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                padding: '6px'
              }}>
              {t.closeAction}
            </button>
          </div>
        </div>
      )}

      {/* CREATE MESS MODAL (CUSTOMIZABLE, DEFAULT 10 DAYS, EVERYONE CAN CREATE) */}
      {showCreateMessModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 100
        }}>
          <div style={{
            maxWidth: 420,
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: 26,
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)'
          }} className="animate-slide-up">
            <h3 style={{ fontSize: 18, color: 'var(--brand-green)', marginBottom: 4 }}>
              {t.instCreateMess}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {t.allCanCreate} • {t.instTenDayDefault}
            </p>

            <form onSubmit={handleCreateMess} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  {t.cycleName}
                </label>
                <input
                  type="text"
                  placeholder="e.g. October 1-10 Mess"
                  value={newMessForm.name}
                  onChange={(e) => setNewMessForm({ ...newMessForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-subtle)',
                    color: 'var(--text-main)',
                    fontSize: 13
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  {t.cycleDuration}: {newMessForm.duration_days} {t.days}
                </label>
                {/* Duration Pills */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[10, 15, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setNewMessForm({ ...newMessForm, duration_days: days })}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 12,
                        fontWeight: 600,
                        background: newMessForm.duration_days === days ? 'var(--brand-green)' : 'var(--bg-card-subtle)',
                        color: newMessForm.duration_days === days ? '#FFF' : 'var(--text-main)',
                        border: '1px solid var(--border-color)'
                      }}>
                      {days} {t.days} {days === 10 ? t.defaultTag : ''}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newMessForm.duration_days}
                  onChange={(e) => setNewMessForm({ ...newMessForm, duration_days: parseInt(e.target.value, 10) || 10 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-subtle)',
                    color: 'var(--text-main)',
                    fontSize: 13
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  {t.startDate}
                </label>
                <input
                  type="date"
                  required
                  value={newMessForm.start_date}
                  onChange={(e) => setNewMessForm({ ...newMessForm, start_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-subtle)',
                    color: 'var(--text-main)',
                    fontSize: 13
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateMessModal(false)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: 13,
                    color: 'var(--text-muted)'
                  }}>
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-green)',
                    color: '#FFF',
                    fontWeight: 600,
                    fontSize: 13
                  }}>
                  {t.startAction}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAILY MENU PLANNER MODAL (STAPLE, MAIN DISH, SIDE DISH) */}
      {showMenuModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 100
        }}>
          <div style={{
            maxWidth: 580,
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: 26,
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} className="animate-slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, color: 'var(--brand-green)', margin: 0, fontWeight: 700 }}>
                  {t.mealMenu}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t.date}: {menuModalDate}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMenuModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenu} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* BREAKFAST SECTION */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-terracotta)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Coffee size={15} /> {t.breakfastSlot}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.staple}</label>
                    <input
                      type="text"
                      placeholder={t.staplePlaceholder}
                      value={menuForm.breakfast.staple}
                      onChange={(e) => setMenuForm({ ...menuForm, breakfast: { ...menuForm.breakfast, staple: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.mainDish}</label>
                    <input
                      type="text"
                      placeholder={t.mainDishPlaceholder}
                      value={menuForm.breakfast.main_dish}
                      onChange={(e) => setMenuForm({ ...menuForm, breakfast: { ...menuForm.breakfast, main_dish: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.sideDish}</label>
                    <input
                      type="text"
                      placeholder={t.sideDishPlaceholder}
                      value={menuForm.breakfast.side_dish}
                      onChange={(e) => setMenuForm({ ...menuForm, breakfast: { ...menuForm.breakfast, side_dish: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* LUNCH SECTION */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sun size={15} /> {t.lunchSlot}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.staple}</label>
                    <input
                      type="text"
                      placeholder={t.staplePlaceholder}
                      value={menuForm.lunch.staple}
                      onChange={(e) => setMenuForm({ ...menuForm, lunch: { ...menuForm.lunch, staple: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.mainDish}</label>
                    <input
                      type="text"
                      placeholder={t.mainDishPlaceholder}
                      value={menuForm.lunch.main_dish}
                      onChange={(e) => setMenuForm({ ...menuForm, lunch: { ...menuForm.lunch, main_dish: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.sideDish}</label>
                    <input
                      type="text"
                      placeholder={t.sideDishPlaceholder}
                      value={menuForm.lunch.side_dish}
                      onChange={(e) => setMenuForm({ ...menuForm, lunch: { ...menuForm.lunch, side_dish: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* DINNER SECTION */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-terracotta)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Moon size={15} /> {t.dinnerSlot}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.staple}</label>
                    <input
                      type="text"
                      placeholder={t.staplePlaceholder}
                      value={menuForm.dinner.staple}
                      onChange={(e) => setMenuForm({ ...menuForm, dinner: { ...menuForm.dinner, staple: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.mainDish}</label>
                    <input
                      type="text"
                      placeholder={t.mainDishPlaceholder}
                      value={menuForm.dinner.main_dish}
                      onChange={(e) => setMenuForm({ ...menuForm, dinner: { ...menuForm.dinner, main_dish: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{t.sideDish}</label>
                    <input
                      type="text"
                      placeholder={t.sideDishPlaceholder}
                      value={menuForm.dinner.side_dish}
                      onChange={(e) => setMenuForm({ ...menuForm, dinner: { ...menuForm.dinner, side_dish: e.target.value } })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowMenuModal(false)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}>
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-green)',
                    color: '#FFF',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}>
                  {t.saveMenu}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
