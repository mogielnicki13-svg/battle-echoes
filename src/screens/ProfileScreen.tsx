// ============================================================
// BATTLE ECHOES — ProfileScreen.tsx (z przyciskiem Statystyki)
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Switch,
} from 'react-native';
import Constants from 'expo-constants';
import { Colors, Radius } from '../constants/theme';
import { useAppStore, levelFromXP } from '../store';
import { useTapCounter } from '../hooks/useTapCounter';
import { XPBar, CoinCounter, LevelUpModal, FloatingReward, RewardToast } from '../components/XPSystem';
import DailyRewardModal from '../components/DailyRewardModal';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Icon } from '../components/GoldIcon';
import AvatarDisplay from '../components/AvatarDisplay';
import LanguageSelector from '../components/LanguageSelector';
import AccessibilitySettingsCard from '../components/AccessibilitySettings';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen({ navigation }: any) {
  const { t } = useTranslation();
  useFocusEffect(useCallback(() => { logScreenView('Profile'); }, []));
  const { user, signOut, awardXP, awardCoins, checkDailyStreak, getLevelInfo, setEducatorMode } = useAppStore();

  const [showLevelUp,      setShowLevelUp]      = useState(false);
  const [levelUpData,      setLevelUpData]      = useState({ level: 2, coins: 100, unlocks: [] as string[] });
  const [toastVisible,     setToastVisible]     = useState(false);
  const [toastData,        setToastData]        = useState<{ icon: string; title: string; subtitle: string; color: string }>({ icon: '⭐', title: '', subtitle: '', color: Colors.gold });
  const [floaters,         setFloaters]         = useState<{ id: string; value: string; color: string }[]>([]);
  const [showDailyReward,  setShowDailyReward]  = useState(false);

  const { level, currentXP, xpToNext } = getLevelInfo();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // ── Secret dev-menu trigger: tap version text 7 times ──────
  const { tap: tapVersion, count: tapCount } = useTapCounter({
    targetCount:  7,
    resetAfterMs: 4000,
    onUnlocked:   useCallback(() => { navigation.navigate('DeveloperSettings'); }, [navigation]),
  });

  const showFloating = (value: string, color: string) => {
    const id = Math.random().toString(36).substring(2, 8);
    setFloaters(prev => [...prev, { id, value, color }]);
  };

  const showToast = (icon: string, title: string, subtitle: string, color: string = Colors.gold) => {
    setToastData({ icon, title, subtitle, color });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  };

  const handleEarnXP = () => {
    const prevLevel = levelFromXP(user?.totalXP ?? 0).level;
    awardXP(100, 'Demo XP');
    const newLevel = levelFromXP((user?.totalXP ?? 0) + 100).level;
    showFloating('+100 XP', '#fbbf24');
    if (newLevel > prevLevel) {
      setLevelUpData({ level: newLevel, coins: 100, unlocks: ['Nowa epoka dostępna'] });
      setShowLevelUp(true);
    } else {
      showToast('⭐', '+100 XP', 'Odsłuchana narracja', '#fbbf24');
    }
  };

  const handleEarnCoins = () => {
    awardCoins(50, 'Demo');
    showFloating('+50', Colors.gold);
    showToast('coin', '+50', 'Demo reward', Colors.gold);
  };

  const handleStreak = () => {
    const rewards = checkDailyStreak();
    if (rewards.length > 0) {
      showFloating(`🔥 Seria!`, '#f97316');
      showToast('🔥', `Seria ${user?.streak || 1} dni!`, '+75 XP, +20 Dukatów', '#f97316');
    } else {
      Alert.alert(t('profile.daily_streak_title'), t('profile.daily_streak_already'));
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('profile.sign_out'), t('profile.sign_out_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.sign_out'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {floaters.map(f => (
        <FloatingReward key={f.id} value={f.value} color={f.color} y={300}
          onDone={() => setFloaters(prev => prev.filter(x => x.id !== f.id))} />
      ))}
      <RewardToast visible={toastVisible} icon={toastData.icon}
        title={toastData.title} subtitle={toastData.subtitle} color={toastData.color} />
      <LevelUpModal visible={showLevelUp} newLevel={levelUpData.level}
        rewards={{ coins: levelUpData.coins, unlocks: levelUpData.unlocks }}
        onClose={() => setShowLevelUp(false)} />
      <DailyRewardModal
        visible={showDailyReward}
        streakDay={Math.max(1, user?.streak ?? 1)}
        alreadyClaimed={
          user?.lastActive
            ? new Date(user.lastActive).toDateString() === new Date().toDateString()
            : false
        }
        onClose={() => setShowDailyReward(false)}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.profileTop}>
          <TouchableOpacity onPress={() => navigation.navigate('Shop' as any)}>
            <AvatarDisplay avatarId={user?.avatarId ?? 'default_soldier'} size={80} />
          </TouchableOpacity>
          <Text style={styles.profileName}>{user?.name || t('profile.guest')}</Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
            {t('avatars.change_avatar')}
          </Text>
          <View style={styles.providerTag}>
            <View style={styles.providerTagInner}>
              {user?.provider === 'google' ? (
                <Icon id="google" size={14} color={Colors.textMuted} />
              ) : user?.provider === 'apple' ? (
                <Icon id="apple" size={14} color={Colors.textMuted} />
              ) : (
                <Icon id="account" size={14} color={Colors.textMuted} />
              )}
              <Text style={styles.providerText}> {user?.provider || 'guest'}</Text>
            </View>
          </View>
        </View>

        {/* XP */}
        <View style={styles.card}>
          <XPBar currentXP={currentXP} xpToNext={xpToNext} level={level} animated />
        </View>

        {/* Dukaty */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('profile.coins_label').toUpperCase()}</Text>
          <CoinCounter coins={user?.coins || 0} size="large" />
        </View>

        {/* Statystyki */}
        <View style={styles.statsRow}>
          <StatBox iconId="sword"      value={user?.listenedBattles.length || 0}  label={t('profile.listened')} />
          <StatBox iconId="map_marker" value={user?.visitedBattles.length  || 0}  label={t('profile.visited')} />
          <StatBox iconId="fire"       value={user?.streak || 0}                   label={t('profile.streak_label')} />
        </View>

        {/* Nawigacja do ekranów */}
        <View style={styles.linksSection}>
          <NavLink iconId="chart"  title={t('profile.stats')} subtitle={t('profile.stats_subtitle')} color="#60a5fa"
            onPress={() => navigation.navigate('Stats')} />
          <NavLink iconId="trophy" title={t('profile.leaderboard')} subtitle={t('profile.leaderboard_subtitle')} color="#fbbf24"
            onPress={() => navigation.navigate('Leaderboard')} />
          <NavLink iconId="users" title={t('profile.community')} subtitle={t('profile.community_subtitle')} color="#c084fc"
            onPress={() => navigation.navigate('Social')} />
          <NavLink iconId="medal"  title={t('profile.achievements')} subtitle={t('profile.achievements_subtitle', { count: user?.seenAchievementIds?.length ?? 0, total: 16 })} color="#4ade80"
            onPress={() => navigation.navigate('Achievements')} />
          <NavLink iconId="fire"   title={t('profile.daily_reward')} subtitle={t('profile.daily_reward_subtitle', { count: user?.streak || 0 })} color="#f97316"
            onPress={() => setShowDailyReward(true)} />
        </View>

        {/* Tryb nauczyciela */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('profile.educator_mode').toUpperCase()}</Text>
          <View style={styles.educatorRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.educatorTitleRow}>
                <Icon id="school" size={16} color={Colors.textPrimary} />
                <Text style={styles.educatorTitle}> {t('profile.educator_title')}</Text>
              </View>
              <Text style={styles.educatorSub}>
                {user?.isEducator
                  ? t('profile.educator_active_desc')
                  : t('profile.educator_inactive_desc')}
              </Text>
            </View>
            <Switch
              value={!!user?.isEducator}
              onValueChange={(v) => {
                setEducatorMode(v);
                if (v) Alert.alert(
                  t('profile.educator_alert_title'),
                  t('profile.educator_alert_desc'),
                );
              }}
              trackColor={{ false: Colors.borderDefault, true: `${Colors.gold}60` }}
              thumbColor={user?.isEducator ? Colors.gold : Colors.textMuted}
            />
          </View>
        </View>

        {/* Dostępność */}
        <AccessibilitySettingsCard />

        {/* Język */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('profile.language')}</Text>
          <LanguageSelector />
        </View>

        {/* Demo */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('profile.demo_title')}</Text>
          <View style={styles.demoRow}>
            <TouchableOpacity style={styles.demoBtn} onPress={handleEarnXP}>
              <Icon id="star" size={18} color={Colors.textSecondary} />
              <Text style={styles.demoBtnText}>+100 XP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.demoBtn, styles.demoBtnGold]} onPress={handleEarnCoins}>
              <Icon id="coin" size={18} color={Colors.gold} />
              <Text style={[styles.demoBtnText, { color: Colors.gold }]}>+50 Dukatów</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wyloguj */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{t('profile.sign_out_text')}</Text>
        </TouchableOpacity>

        {/* Hidden dev trigger — tap 7× to open Developer Settings */}
        <TouchableOpacity onPress={tapVersion} activeOpacity={1}>
          <Text style={styles.versionText}>
            Battle Echoes v{appVersion}
            {tapCount > 0 ? ` (${7 - tapCount} more…)` : ''}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ iconId, value, label }: { iconId: string; value: number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Icon id={iconId as any} size={20} color={Colors.textMuted} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NavLink({ iconId, title, subtitle, color, onPress }: {
  iconId: string; title: string; subtitle: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.navLink} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.navLinkIcon, { backgroundColor: `${color}20` }]}>
        <Icon id={iconId as any} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navLinkTitle}>{title}</Text>
        <Text style={styles.navLinkSub}>{subtitle}</Text>
      </View>
      <Icon id="chevron_right" size={20} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll:       { padding: 16, gap: 12 },
  profileTop:   { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.goldLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold },
  avatarText:   { fontSize: 32, color: Colors.gold, fontWeight: '700' },
  profileName:  { fontSize: 22, color: Colors.textPrimary, fontWeight: '700' },
  providerTag:  { backgroundColor: Colors.backgroundCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: Colors.borderDefault },
  providerTagInner: { flexDirection: 'row', alignItems: 'center' },
  providerText: { fontSize: 12, color: Colors.textMuted },
  card:         { backgroundColor: Colors.backgroundCard, borderRadius: Radius.md, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.borderDefault },
  cardLabel:    { fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  statsRow:     { flexDirection: 'row', gap: 10 },
  statBox:      { flex: 1, backgroundColor: Colors.backgroundCard, borderRadius: Radius.md, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.borderDefault },
  statValue:    { fontSize: 22, color: Colors.gold, fontWeight: '700' },
  statLabel:    { fontSize: 10, color: Colors.textMuted },
  linksSection: { gap: 8 },
  navLink:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.backgroundCard, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.borderDefault },
  navLinkIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navLinkTitle: { fontSize: 15, color: Colors.textPrimary, fontWeight: '700' },
  navLinkSub:   { fontSize: 12, color: Colors.textMuted },
  demoRow:      { flexDirection: 'row', gap: 10 },
  demoBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.backgroundElevated, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.borderDefault },
  demoBtnGold:  { borderColor: Colors.borderGold },
  demoBtnText:  { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  signOutBtn:   { borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: Radius.md, padding: 14, alignItems: 'center' },
  signOutText:  { fontSize: 14, color: '#f87171', fontWeight: '600' },
  // Educator
  educatorRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  educatorTitleRow: { flexDirection: 'row', alignItems: 'center' },
  educatorTitle:    { fontSize: 15, color: Colors.textPrimary, fontWeight: '700' },
  educatorSub:      { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  // Hidden dev trigger
  versionText:  { fontSize: 11, color: Colors.textMuted, textAlign: 'center', paddingVertical: 8, opacity: 0.5 },
});
