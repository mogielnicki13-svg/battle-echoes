// ============================================================
// BATTLE ECHOES — NotificationsScreen.tsx
// Zarządzanie lokalnymi powiadomieniami (działa w Expo Go!)
//
// Funkcje:
//   • Toggle dla każdego typu powiadomienia
//   • Picker godziny codziennego przypomnienia (7:00–22:00)
//   • Ustawienia persystowane w AsyncStorage
//   • Testowe powiadomienia (pojawią się za 2s)
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, Alert, Animated,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import notificationService, {
  NotifType,
  NotifSettings,
  DEFAULT_NOTIF_SETTINGS,
  loadNotifSettings,
  saveNotifSettings,
  NOTIF_TEMPLATES,
} from '../services/NotificationService';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelect } from '../services/HapticsService';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import GoldIcon, { Icon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

// Godziny dostępne w pickerze
const PICK_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function NotificationsScreen() {
  const { user, getLevelInfo } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('Notifications'); }, []));
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [settings, setSettings]     = useState<NotifSettings>(DEFAULT_NOTIF_SETTINGS);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [scheduled, setScheduled]   = useState<number>(0);
  const [lastTest, setLastTest]     = useState<string>('');
  const [testAnim]                  = useState(new Animated.Value(1));

  // ── Inicjalizacja ─────────────────────────────────────────
  useEffect(() => {
    checkPermission();
    refreshScheduled();
    initSettings();
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermission(status as any);
    } catch {}
  };

  const refreshScheduled = async () => {
    const list = await notificationService.getScheduled();
    setScheduled(list.length);
  };

  // Wczytaj zapisane ustawienia z AsyncStorage
  const initSettings = async () => {
    const saved = await loadNotifSettings();
    setSettings(saved);
  };

  // ── Prośba o uprawnienia ──────────────────────────────────
  const requestPermission = async () => {
    const granted = await notificationService.initialize();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      await applySettings({ ...settings, enabled: true });
    } else {
      Alert.alert(
        t('notifications.permission_denied_title'),
        t('notifications.permission_denied_msg'),
      );
    }
  };

  // ── Przełącz flagę ustawień ───────────────────────────────
  const toggle = async (key: keyof NotifSettings, value: boolean) => {
    hapticSelect();
    const next = { ...settings, [key]: value };
    setSettings(next);
    await saveNotifSettings(next);             // ← persystencja w AsyncStorage

    if (key === 'enabled' && !value) {
      await notificationService.cancelAll();
      setScheduled(0);
    } else {
      await applySettings(next);
      await refreshScheduled();
    }
  };

  // ── Zmień godzinę codziennego przypomnienia ───────────────
  const changeHour = async (hour: number) => {
    hapticLight();
    const next = { ...settings, dailyHour: hour };
    setSettings(next);
    await saveNotifSettings(next);

    // Natychmiast przestaw zaplanowane powiadomienie
    if (next.enabled && next.dailyStreak) {
      await notificationService.scheduleDailyStreak(user?.streak ?? 0, hour);
      await refreshScheduled();
    }
  };

  // ── Zastosuj bieżące ustawienia → zaplanuj powiadomienia ──
  const applySettings = async (s: NotifSettings) => {
    if (!s.enabled) return;
    await notificationService.cancelAll();

    const lvl = getLevelInfo();

    if (s.dailyStreak)
      await notificationService.scheduleDailyStreak(user?.streak ?? 0, s.dailyHour);

    if (s.streakAtRisk)
      await notificationService.scheduleStreakAtRisk(user?.streak ?? 0);

    if (s.weeklyRecap)
      await notificationService.scheduleWeeklyRecap(
        user?.listenedBattles.length ?? 0,
        user?.totalXP ?? 0,
        user?.streak ?? 0,
      );

    if (s.levelReminder)
      await notificationService.scheduleLevelUpReminder(
        lvl.level + 1,
        lvl.xpToNext - lvl.currentXP,
        (lvl.currentXP / lvl.xpToNext) * 100,
      );
  };

  // ── Wyślij testowe powiadomienie ──────────────────────────
  const sendTest = async (type: NotifType) => {
    hapticMedium();
    if (permission !== 'granted') {
      Alert.alert(t('notifications.no_permission'), t('notifications.no_permission_msg'));
      return;
    }
    await notificationService.sendTestNotification(type);
    setLastTest(type);

    Animated.sequence([
      Animated.timing(testAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(testAnim, { toValue: 1, useNativeDriver: true, tension: 220, friction: 5 }),
    ]).start();

    hapticSuccess();
    Alert.alert(
      t('notifications.sent_title'),
      t('notifications.sent_msg'),
    );
  };

  const levelInfo = getLevelInfo();
  const isGranted = permission === 'granted';
  const isEnabled = settings.enabled && isGranted;

  return (
    <View style={styles.container}>

      {/* ── Nagłówek ─────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTitleRow}>
          <Icon id="bell" size={22} color={C.textPrimary} />
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        </View>
        <Text style={styles.headerSub}>{t('notifications.manage_sub')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Status uprawnień ──────────────────────────── */}
        {!isGranted ? (
          <View style={styles.permissionCard}>
            <Icon id="bell_off" size={48} color={C.textMuted} />
            <Text style={styles.permissionTitle}>{t('notifications.disabled')}</Text>
            <Text style={styles.permissionDesc}>
              {t('notifications.enable_hint')}
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>{t('notifications.enable')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusCard}>
            <Icon id="check_solid" size={24} color="#4ade80" />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>{t('notifications.active')}</Text>
              <Text style={styles.statusSub}>{t('notifications.scheduled_count', { count: scheduled })}</Text>
            </View>
          </View>
        )}

        {/* ── Główny przełącznik ────────────────────────── */}
        <SettingRow
          iconId="bell"
          title={t('notifications.all_notifications')}
          subtitle={t('notifications.all_notifications_sub')}
          value={isEnabled}
          onToggle={v => toggle('enabled', v)}
          color={Colors.gold}
          disabled={!isGranted}
        />

        {/* ════════════════════════════════════════════════
            CODZIENNA AKTYWNOŚĆ
        ════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('notifications.section_daily')}</Text>

          <SettingRow
            iconId="fire"
            title={t('notifications.streak_reminder')}
            subtitle={t('notifications.streak_reminder_sub', { hour: String(settings.dailyHour).padStart(2, '0') })}
            value={settings.dailyStreak && isEnabled}
            onToggle={v => toggle('dailyStreak', v)}
            color="#f97316"
            disabled={!isEnabled}
            badge={user?.streak ? t('notifications.days', { count: user.streak }) : undefined}
          />

          {/* Picker godziny — widoczny gdy toggle serii jest włączony */}
          {settings.dailyStreak && isEnabled && (
            <HourPicker value={settings.dailyHour} onChange={changeHour} />
          )}

          <SettingRow
            iconId="alarm"
            title={t('notifications.streak_at_risk')}
            subtitle={t('notifications.streak_at_risk_sub')}
            value={settings.streakAtRisk && isEnabled}
            onToggle={v => toggle('streakAtRisk', v)}
            color="#ef4444"
            disabled={!isEnabled}
          />
        </View>

        {/* ════════════════════════════════════════════════
            ODKRYCIA
        ════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('notifications.section_discoveries')}</Text>

          <SettingRow
            iconId="sword"
            title={t('notifications.new_battles')}
            subtitle={t('notifications.new_battles_sub')}
            value={settings.newBattles && isEnabled}
            onToggle={v => toggle('newBattles', v)}
            color={Colors.gold}
            disabled={!isEnabled}
          />

          <SettingRow
            iconId="map_marker"
            title={t('notifications.nearby_battlefield')}
            subtitle={t('notifications.nearby_sub')}
            value={settings.gpsNearby && isEnabled}
            onToggle={v => toggle('gpsNearby', v)}
            color="#4ade80"
            disabled={!isEnabled}
          />
        </View>

        {/* ════════════════════════════════════════════════
            TWÓJ POSTĘP
        ════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('notifications.section_progress')}</Text>

          <SettingRow
            iconId="chart"
            title={t('notifications.weekly_recap')}
            subtitle={t('notifications.weekly_recap_sub')}
            value={settings.weeklyRecap && isEnabled}
            onToggle={v => toggle('weeklyRecap', v)}
            color="#a78bfa"
            disabled={!isEnabled}
          />

          <SettingRow
            iconId="star"
            title={t('notifications.near_level')}
            subtitle={t('notifications.near_level_sub')}
            value={settings.levelReminder && isEnabled}
            onToggle={v => toggle('levelReminder', v)}
            color="#fbbf24"
            disabled={!isEnabled}
            badge={t('notifications.level_short', { level: levelInfo.level })}
          />
        </View>

        {/* ════════════════════════════════════════════════
            TESTUJ POWIADOMIENIA
        ════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('notifications.section_test')}</Text>
          <Text style={styles.testHint}>
            {t('notifications.test_hint')}
          </Text>
          <View style={styles.testGrid}>
            {([
              { type: 'daily_streak',      iconId: 'fire',       label: t('notifications.test_streak'),   color: '#f97316' },
              { type: 'streak_at_risk',    iconId: 'alarm',      label: t('notifications.test_at_risk'), color: '#ef4444' },
              { type: 'new_battle',        iconId: 'sword',      label: t('notifications.test_battle'),  color: Colors.gold },
              { type: 'gps_nearby',        iconId: 'map_marker', label: t('notifications.test_gps'),     color: '#4ade80' },
              { type: 'weekly_recap',      iconId: 'chart',      label: t('notifications.test_recap'),   color: '#a78bfa' },
              { type: 'level_up_reminder', iconId: 'star',       label: t('notifications.test_level_up'),color: '#fbbf24' },
            ] as const).map(item => (
              <Animated.View
                key={item.type}
                style={lastTest === item.type ? { transform: [{ scale: testAnim }] } : undefined}
              >
                <TouchableOpacity
                  style={[styles.testBtn, {
                    borderColor:     isGranted ? `${item.color}55` : Colors.borderDefault,
                    backgroundColor: isGranted ? `${item.color}12` : 'transparent',
                  }]}
                  onPress={() => sendTest(item.type as NotifType)}
                  disabled={!isGranted}
                  activeOpacity={0.75}
                >
                  <View style={styles.testBtnInner}>
                    <Icon
                      id={item.iconId}
                      size={14}
                      color={isGranted ? item.color : Colors.textMuted}
                    />
                    <Text style={[styles.testBtnText, {
                      color: isGranted ? item.color : Colors.textMuted,
                    }]}>
                      {item.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* ── Info ─────────────────────────────────────── */}
        <View style={styles.infoBox}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <GoldIcon name="lightbulb-outline" lib="mci" size={14} color={C.textMuted} />
            <Text style={[styles.infoText, { flex: 1 }]}>
              {t('notifications.info_text')}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// PICKER GODZINY
// Poziomy ScrollView z guzikami 07:00 – 22:00
// ════════════════════════════════════════════════════════════
function HourPicker({
  value,
  onChange,
}: {
  value:    number;
  onChange: (h: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.hourWrap}>
      <View style={styles.hourLabelRow}>
        <Icon id="clock" size={12} color={C.gold} />
        <Text style={styles.hourLabel}>{t('notifications.hour_label')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hourScroll}
      >
        {PICK_HOURS.map(h => {
          const active = h === value;
          return (
            <TouchableOpacity
              key={h}
              style={[styles.hourBtn, active && styles.hourBtnActive]}
              onPress={() => onChange(h)}
              activeOpacity={0.7}
            >
              <Text style={[styles.hourBtnText, active && styles.hourBtnTextActive]}>
                {String(h).padStart(2, '0')}:00
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// WIERSZ USTAWIEŃ Z PRZEŁĄCZNIKIEM
// ════════════════════════════════════════════════════════════
function SettingRow({
  iconId, title, subtitle, value, onToggle, color, disabled, badge,
}: {
  iconId:    string;
  title:     string;
  subtitle:  string;
  value:     boolean;
  onToggle:  (v: boolean) => void;
  color:     string;
  disabled?: boolean;
  badge?:    string;
}) {
  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={[styles.settingIcon, { backgroundColor: `${color}20` }]}>
        <Icon id={iconId as any} size={18} color={color} />
      </View>
      <View style={styles.settingInfo}>
        <View style={styles.settingTitleRow}>
          <Text style={[styles.settingTitle, disabled && { color: Colors.textMuted }]}>
            {title}
          </Text>
          {badge && (
            <View style={[styles.settingBadge, { backgroundColor: `${color}25` }]}>
              <Text style={[styles.settingBadgeText, { color }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: Colors.backgroundElevated, true: `${color}60` }}
        thumbColor={value ? color : Colors.textMuted}
      />
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = Colors;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:    { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  headerSub:      { fontSize: 13, color: C.textMuted, marginTop: 2 },

  scroll: { padding: 16, gap: 12 },

  // ── Permission card ──────────────────────────────────────
  permissionCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.lg,
    padding: 24, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  permissionTitle:   { fontSize: 18, color: C.textPrimary, fontWeight: '700' },
  permissionDesc:    { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  permissionBtn:     {
    backgroundColor: C.gold, borderRadius: Radius.md,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 4,
  },
  permissionBtnText: { fontSize: 15, color: C.ink, fontWeight: '700' },

  // ── Status card (uprawnione) ─────────────────────────────
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(74,222,128,0.08)', borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
  },
  statusTitle: { fontSize: 15, color: '#4ade80', fontWeight: '700' },
  statusSub:   { fontSize: 12, color: C.textMuted },

  // ── Setting row ──────────────────────────────────────────
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: C.borderDefault,
  },
  settingRowDisabled: { opacity: 0.45 },
  settingIcon:        { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingInfo:        { flex: 1 },
  settingTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  settingTitle:       { fontSize: 14, color: C.textPrimary, fontWeight: '600' },
  settingSubtitle:    { fontSize: 12, color: C.textMuted, marginTop: 2 },
  settingBadge:       { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  settingBadgeText:   { fontSize: 10, fontWeight: '700' },

  section:      { gap: 8 },
  sectionLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: 2 },

  // ── Hour picker ──────────────────────────────────────────
  hourWrap: {
    backgroundColor: `${C.gold}09`,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${C.gold}35`,
    padding: 12,
    gap: 10,
    // Lekkie wcięcie — wizualnie "pod" togglem serii
    marginLeft: 6,
    marginTop: -4,
  },
  hourLabelRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hourLabel:        { fontSize: 11, color: C.gold, fontWeight: '700', letterSpacing: 0.4 },
  hourScroll:       { gap: 8, paddingRight: 4 },
  hourBtn: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    backgroundColor: C.backgroundElevated,
  },
  hourBtnActive:     { borderColor: C.gold, backgroundColor: `${C.gold}22` },
  hourBtnText:       { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  hourBtnTextActive: { color: C.gold },

  // ── Test grid ────────────────────────────────────────────
  testHint:     { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  testGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  testBtn: {
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  testBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  testBtnText:  { fontSize: 13, fontWeight: '600' },

  // ── Info box ─────────────────────────────────────────────
  infoBox: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: C.borderDefault,
  },
  infoText: { fontSize: 12, color: C.textMuted, lineHeight: 20 },
});
