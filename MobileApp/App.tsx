import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Share,
  StatusBar,
  Modal,
  Alert
} from 'react-native';
import { translations, Language } from './src/i18n';
import { colors } from './src/theme';

const API_BASE = 'http://10.0.2.2:5000/api'; // Android emulator localhost / or machine IP

export default function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<Language>('bn');
  const t = translations[lang];
  const theme = colors[themeMode];

  // Auth
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle mobile auth submit
  const handleMobileAuth = () => {
    const emailTrimmed = authForm.email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailTrimmed)) {
      Alert.alert('ভুল হয়েছে', lang === 'bn' ? 'সঠিক ইমেইল ফরম্যাট দিন (যেমন: iffat@example.com)' : 'Please enter a valid email address (e.g. iffat@example.com)');
      return;
    }

    if (authMode === 'signup') {
      const nameTrimmed = authForm.name.trim();
      if (!nameTrimmed) {
        Alert.alert('ভুল হয়েছে', lang === 'bn' ? 'আপনার নাম লিখুন' : 'Please enter your name');
        return;
      }
      if (nameTrimmed.length < 2) {
        Alert.alert('ভুল হয়েছে', lang === 'bn' ? 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' : 'Name must be at least 2 characters');
        return;
      }
      const nameRegex = /^[\p{L}\p{M}\s.'-]+$/u;
      if (!nameRegex.test(nameTrimmed)) {
        Alert.alert('ভুল হয়েছে', lang === 'bn' ? 'নামে শুধু বাংলা বা ইংরেজি অক্ষর ব্যবহার করুন' : 'Please enter a valid name in English or Bangla');
        return;
      }
      if (authForm.password !== authForm.confirmPassword) {
        Alert.alert('ভুল হয়েছে', t.passwordMismatch);
        return;
      }
      if (authForm.password.length < 6) {
        Alert.alert('পাসওয়ার্ড', lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        return;
      }
    }
    setUser({ id: 1, name: authForm.name || 'ইফফাত', email: authForm.email || 'user@test.com' });
  };

  // Home & Mess
  const [homeName, setHomeName] = useState('ব্যাচেলর পয়েন্ট');
  const [inviteCode, setInviteCode] = useState('HOME-8F3K29');
  const [activeTab, setActiveTab] = useState<'meals' | 'bazaar' | 'deposits' | 'summary' | 'members'>('meals');
  
  // Mess Duration (10 days default!)
  const [messName, setMessName] = useState('১০ দিনের মেস');
  const [durationDays, setDurationDays] = useState(10);
  const [showMessModal, setShowMessModal] = useState(false);

  // Quick Today Meal
  const [todayMeals, setTodayMeals] = useState({ b: 0, l: 1, d: 1 });

  // Sample data
  const [members] = useState([
    { id: 1, name: 'ইফফাত', role: 'ম্যানেজার', meals: 18, deposit: 2500 },
    { id: 2, name: 'রাকিব', role: 'সদস্য', meals: 20, deposit: 2000 },
    { id: 3, name: 'তানভীর', role: 'সদস্য', meals: 15, deposit: 1800 }
  ]);

  const [bazaars, setBazaars] = useState([
    { id: 1, buyer: 'ইফফাত', items: 'চাল, ডাল, তেল, আলু', amount: 1250, date: '১০/১১' },
    { id: 2, buyer: 'রাকিব', items: 'মাছ, মুরগি, পেঁয়াজ', amount: 1650, date: '১১/১১' }
  ]);

  // Calculations
  const totalMeals = members.reduce((sum, m) => sum + m.meals, 0);
  const totalBazaar = bazaars.reduce((sum, b) => sum + b.amount, 0);
  const mealRate = totalMeals > 0 ? (totalBazaar / totalMeals).toFixed(2) : '0';

  // Telegram-style Invite Share
  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `রসুইঘর - আমাদের ঘরে যুক্ত হতে এই ইনভাইট লিংকে ক্লিক করুন: https://rosuighor.app/join?code=${inviteCode}`,
        title: `${homeName} - মেস ইনভাইট লিংক`
      });
    } catch (err: any) {
      Alert.alert('Share Error', err.message);
    }
  };

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleLang = () => {
    setLang(prev => prev === 'bn' ? 'en' : 'bn');
  };

  // Auth Screen
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} />
        <View style={styles.authWrapper}>
          <View style={styles.topControls}>
            <TouchableOpacity onPress={toggleLang} style={[styles.pillBtn, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textMain, fontSize: 12 }}>{lang === 'bn' ? 'English' : 'বাংলা'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={[styles.pillBtn, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textMain, fontSize: 12 }}>{themeMode === 'light' ? '🌙 Dark' : '☀️ Light'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logoBlock}>
            <View style={styles.logoWrapper}>
              <Image
                source={themeMode === 'dark' ? require('./assets/logo-dark.png') : require('./assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.subtitle, { color: colors.brandTerracotta, fontWeight: '600' }]}>{t.appSubtitle}</Text>
          </View>

          <View style={[styles.authCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {authMode === 'signup' && (
              <TextInput
                placeholder="e.g. Iffat Bin Hossain"
                placeholderTextColor={theme.textMuted}
                value={authForm.name}
                onChangeText={(v) => setAuthForm({ ...authForm, name: v })}
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.inputBorder }]}
              />
            )}
            <TextInput
              placeholder="e.g. iffat@example.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={authForm.email}
              onChangeText={(v) => setAuthForm({ ...authForm, email: v })}
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.inputBorder }]}
            />
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPassword}
                value={authForm.password}
                onChangeText={(v) => setAuthForm({ ...authForm, password: v })}
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.inputBorder, paddingRight: 40 }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: 9, padding: 4 }}>
                <Text style={{ fontSize: 16 }}>{showPassword ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
            {authMode === 'signup' && (
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  placeholder="Re-enter your password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  value={authForm.confirmPassword}
                  onChangeText={(v) => setAuthForm({ ...authForm, confirmPassword: v })}
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.inputBorder, paddingRight: 40 }]}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 12, top: 9, padding: 4 }}>
                  <Text style={{ fontSize: 16 }}>{showConfirmPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={handleMobileAuth}
              style={[styles.primaryBtn, { backgroundColor: colors.brandGreen }]}>
              <Text style={styles.primaryBtnText}>
                {authMode === 'signup' ? t.signUpAction : t.signInAction}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: colors.brandTerracotta, fontSize: 13, fontWeight: '600' }}>
                {authMode === 'signin' ? t.needAccount : t.haveAccount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Dashboard Screen
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={require('./assets/logo.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brandGreen }}>{homeName}</Text>
            <Text style={{ fontSize: 11, color: theme.textMuted }}>{t.instShareLink}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={handleShareInvite} style={[styles.shareBtn, { backgroundColor: colors.brandTerracotta }]}>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>ইনভাইট লিংক</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { borderColor: theme.border }]}>
            <Text style={{ fontSize: 12 }}>{themeMode === 'light' ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Mess Cycle Bar (10 Days Default) */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brandGreen }}>{messName}</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted }}>{durationDays} দিনের মেস • {t.instTenDayDefault}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowMessModal(true)}
              style={[styles.smallBtn, { backgroundColor: colors.brandGreen }]}>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>+ নতুন মেস</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1-Tap Quick Meal Toggle Today */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brandGreen, marginBottom: 8 }}>
            {t.todayQuickAction}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setTodayMeals(p => ({ ...p, b: p.b > 0 ? 0 : 1 }))}
              style={[styles.toggleBtn, { backgroundColor: todayMeals.b > 0 ? colors.brandGreen : theme.cardSubtle }]}>
              <Text style={{ color: todayMeals.b > 0 ? '#FFF' : theme.textMuted, fontSize: 12, fontWeight: '600' }}>
                {t.breakfast}: {todayMeals.b > 0 ? t.on : t.off}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTodayMeals(p => ({ ...p, l: p.l > 0 ? 0 : 1 }))}
              style={[styles.toggleBtn, { backgroundColor: todayMeals.l > 0 ? colors.brandGreen : theme.cardSubtle }]}>
              <Text style={{ color: todayMeals.l > 0 ? '#FFF' : theme.textMuted, fontSize: 12, fontWeight: '600' }}>
                {t.lunch}: {todayMeals.l > 0 ? t.on : t.off}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTodayMeals(p => ({ ...p, d: p.d > 0 ? 0 : 1 }))}
              style={[styles.toggleBtn, { backgroundColor: todayMeals.d > 0 ? colors.brandGreen : theme.cardSubtle }]}>
              <Text style={{ color: todayMeals.d > 0 ? '#FFF' : theme.textMuted, fontSize: 12, fontWeight: '600' }}>
                {t.dinner}: {todayMeals.d > 0 ? t.on : t.off}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Summary Banner */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>{t.totalMeals}</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.brandGreen }}>{totalMeals}</Text>
            </View>
            <View style={{ height: 30, width: 1, backgroundColor: theme.border }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>{t.totalBazaar}</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.brandTerracotta }}>৳{totalBazaar}</Text>
            </View>
            <View style={{ height: 30, width: 1, backgroundColor: theme.border }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>{t.mealRate}</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.brandGreen }}>৳{mealRate}</Text>
            </View>
          </View>
        </View>

        {/* Member Settlement List */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.brandGreen, marginBottom: 12 }}>
            {t.instViewSummary}
          </Text>
          {members.map(m => {
            const cost = (m.meals * parseFloat(mealRate)).toFixed(1);
            const balance = (m.deposit - parseFloat(cost)).toFixed(1);
            const isSurplus = parseFloat(balance) >= 0;

            return (
              <View key={m.id} style={[styles.memberItem, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textMain }}>{m.name}</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>
                    মিল: {m.meals} • জমা: ৳{m.deposit} • খরচ: ৳{cost}
                  </Text>
                </View>
                <Text style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: isSurplus ? theme.successText : theme.dueText
                }}>
                  {isSurplus ? `+৳${balance}` : `-৳${Math.abs(parseFloat(balance))}`}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 10-Day Mess Cycle Creation Modal */}
      <Modal visible={showMessModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brandGreen, marginBottom: 4 }}>
              {t.instCreateMess}
            </Text>
            <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14 }}>
              {t.instTenDayDefault}
            </Text>

            <TextInput
              placeholder="e.g. 10-Day Mess"
              placeholderTextColor={theme.textMuted}
              value={messName}
              onChangeText={setMessName}
              style={[styles.input, { backgroundColor: theme.cardSubtle, color: theme.textMain, borderColor: theme.border }]}
            />

            {/* Quick 10, 15, 30 days pills */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[10, 15, 30].map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDurationDays(d)}
                  style={[
                    styles.pillBtn,
                    {
                      backgroundColor: durationDays === d ? colors.brandGreen : theme.cardSubtle,
                      borderColor: theme.border,
                      flex: 1
                    }
                  ]}>
                  <Text style={{
                    color: durationDays === d ? '#FFF' : theme.textMain,
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    {d} দিন {d === 10 ? '(ডিফল্ট)' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowMessModal(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowMessModal(false)}
                style={[styles.modalBtn, { backgroundColor: colors.brandGreen }]}>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>চালু করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  authWrapper: {
    flex: 1,
    padding: 24,
    justifyContent: 'center'
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 20
  },
  pillBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  logoImage: {
    width: 115,
    height: 84
  },
  title: {
    fontSize: 24,
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2
  },
  authCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 12
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  shareBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center'
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14
  },
  smallBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center'
  }
});
