// ============================================================
// BATTLE ECHOES — DeveloperSettingsScreen.tsx
//
// ⚠ INTERNAL ONLY — DO NOT expose in production navigation ⚠
//
// Access: tap the app version text in ProfileScreen 7 times.
// Invisible to regular users — no tab bar entry, no menu link,
// no analytics event is fired when this screen is opened.
//
// Features:
//   • Toggle analytics on/off (to keep dev traffic out of prod)
//   • Toggle verbose console logging
//   • "Force Crash" button for Sentry/Crashlytics verification
//   • Rolling log of the last 10 tracked analytics events
//   • Rolling log of the last 20 error/crash entries
//   • Session info + AsyncStorage quick-clear
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, Alert, Animated, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import {
  getLocalEventLog,  clearLocalEventLog,  type AnalyticsEvent,
  setAnalyticsEnabled, getAnalyticsEnabled,
} from '../services/AnalyticsService';
import {
  getCrashLog, clearCrashLog, forceCrash, type CrashEntry,
} from '../services/CrashReportingService';
import { hapticMedium, hapticSuccess, hapticError } from '../services/HapticsService';

const C = Colors;

// ── Severity colors ───────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  fatal:   '#ef4444',
  error:   '#f97316',
  warning: '#eab308',
  info:    '#60a5fa',
};

// ════════════════════════════════════════════════════════════════
// EKRAN
// ════════════════════════════════════════════════════════════════
export default function DeveloperSettingsScreen() {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const { user }   = useAppStore();

  const [analyticsOn,  setAnalyticsOn]  = useState(true);
  const [verboseLog,   setVerboseLog]   = useState(false);
  const [eventLog,     setEventLog]     = useState<AnalyticsEvent[]>([]);
  const [crashLog,     setCrashLog]     = useState<CrashEntry[]>([]);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeTab,    setActiveTab]    = useState<'analytics' | 'crashes' | 'info'>('analytics');

  // Warning banner pulse
  const warnAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(warnAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
        Animated.timing(warnAnim, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Load data ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const [enabled, evts, crashes] = await Promise.all([
      getAnalyticsEnabled(),
      getLocalEventLog(),
      getCrashLog(),
    ]);
    setAnalyticsOn(enabled);
    setEventLog([...evts].reverse());      // newest first
    setCrashLog([...crashes].reverse());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── Analytics toggle ──────────────────────────────────────────
  const handleToggleAnalytics = useCallback(async (value: boolean) => {
    hapticMedium();
    setAnalyticsOn(value);
    await setAnalyticsEnabled(value);
  }, []);

  // ── Verbose log toggle ────────────────────────────────────────
  // Sets a global flag read by __DEV__ console calls
  const handleToggleVerbose = useCallback((value: boolean) => {
    hapticMedium();
    setVerboseLog(value);
    (global as any).__BE_VERBOSE_LOG__ = value;
  }, []);

  // ── Force crash ───────────────────────────────────────────────
  const handleForceCrash = useCallback(() => {
    Alert.alert(
      '💀 Force Crash',
      'This will trigger a fatal JS error to test your crash reporting pipeline. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CRASH IT',
          style: 'destructive',
          onPress: () => {
            hapticError();
            // Small delay so Alert dismisses cleanly first
            setTimeout(() => forceCrash('Developer Force Crash — intentional test'), 200);
          },
        },
      ]
    );
  }, []);

  // ── Clear logs ────────────────────────────────────────────────
  const handleClearLogs = useCallback(async () => {
    await Promise.all([clearLocalEventLog(), clearCrashLog()]);
    hapticSuccess();
    setEventLog([]);
    setCrashLog([]);
  }, []);

  // ── Nuclear: clear ALL AsyncStorage (careful!) ────────────────
  const handleNuclearClear = useCallback(() => {
    Alert.alert(
      '☢ Clear All Storage',
      'This will wipe ALL AsyncStorage data including user session, unlocked eras, and preferences. The app will behave as if freshly installed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'WIPE EVERYTHING',
          style: 'destructive',
          onPress: async () => {
            hapticError();
            await AsyncStorage.clear();
            Alert.alert('Done', 'All storage cleared. Restart the app.');
          },
        },
      ]
    );
  }, []);

  // ── App info ──────────────────────────────────────────────────
  const appVersion  = Constants.expoConfig?.version ?? '?.?.?';
  const sessionId   = user?.id ?? 'no-session';
  const storageKeys = useRef<string[]>([]);

  useEffect(() => {
    AsyncStorage.getAllKeys().then(keys => { storageKeys.current = [...keys]; });
  }, []);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ─── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>⚙ Developer Settings</Text>
          <Text style={s.headerSub}>v{appVersion} · Internal build</Text>
        </View>
      </View>

      {/* ─── Warning banner ──────────────────────────────── */}
      <Animated.View style={[s.warningBanner, { opacity: warnAnim }]}>
        <Text style={s.warningText}>
          ⚠ INTERNAL TOOL — NOT FOR PRODUCTION USE ⚠
        </Text>
      </Animated.View>

      {/* ─── Tab bar ─────────────────────────────────────── */}
      <View style={s.tabBar}>
        {(['analytics', 'crashes', 'info'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => { hapticMedium(); setActiveTab(tab); }}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'analytics' ? '📊 Events' : tab === 'crashes' ? '💥 Errors' : 'ℹ Info'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.gold}
          />
        }
      >

        {/* ════════════════ TAB: ANALYTICS ══════════════ */}
        {activeTab === 'analytics' && (
          <>
            {/* Toggles */}
            <SectionHeader title="Controls" />

            <ToggleRow
              label="Analytics Enabled"
              sub={analyticsOn
                ? 'Events are being sent to Firebase'
                : '⚠ Events suppressed — only local log written'}
              value={analyticsOn}
              onChange={handleToggleAnalytics}
              activeColor="#4ade80"
            />

            <ToggleRow
              label="Verbose Console Logging"
              sub="Log all analytics events to Metro console"
              value={verboseLog}
              onChange={handleToggleVerbose}
              activeColor="#60a5fa"
            />

            {/* Force crash */}
            <SectionHeader title="Crash Testing" />
            <TouchableOpacity style={s.dangerBtn} onPress={handleForceCrash} activeOpacity={0.85}>
              <Text style={s.dangerBtnText}>💀 Force Fatal Crash</Text>
              <Text style={s.dangerBtnSub}>
                Triggers global error handler — check Sentry after ~30s
              </Text>
            </TouchableOpacity>

            {/* Event log */}
            <View style={s.sectionRow}>
              <SectionHeader title={`Last ${eventLog.length} Events`} />
              <TouchableOpacity onPress={handleClearLogs}>
                <Text style={s.clearBtn}>Clear</Text>
              </TouchableOpacity>
            </View>

            {eventLog.length === 0 ? (
              <EmptyState text="No events recorded yet.\nTrigger some app actions and pull to refresh." />
            ) : (
              eventLog.map((evt, i) => <EventRow key={i} event={evt} />)
            )}
          </>
        )}

        {/* ════════════════ TAB: CRASHES ════════════════ */}
        {activeTab === 'crashes' && (
          <>
            <View style={s.sectionRow}>
              <SectionHeader title={`Crash Log (${crashLog.length})`} />
              <TouchableOpacity onPress={handleClearLogs}>
                <Text style={s.clearBtn}>Clear</Text>
              </TouchableOpacity>
            </View>

            {crashLog.length === 0 ? (
              <EmptyState text="No errors recorded.\nUse 'Force Fatal Crash' to test." />
            ) : (
              crashLog.map((entry, i) => <CrashRow key={i} entry={entry} />)
            )}
          </>
        )}

        {/* ════════════════ TAB: INFO ═══════════════════ */}
        {activeTab === 'info' && (
          <>
            <SectionHeader title="Session" />
            <InfoGrid rows={[
              { label: 'App Version', value: appVersion },
              { label: 'User ID',     value: sessionId.slice(0, 16) + '…' },
              { label: 'Provider',    value: user?.provider ?? '—' },
              { label: 'Level',       value: String(user?.totalXP ?? 0) + ' XP' },
              { label: 'Coins',       value: String(user?.coins ?? 0) },
              { label: 'Educator',    value: user?.isEducator ? 'Yes' : 'No' },
              { label: 'AsyncStorage keys', value: String(storageKeys.current.length) },
              { label: 'IS_DEV',      value: String(__DEV__) },
            ]} />

            <SectionHeader title="Danger Zone" />

            <TouchableOpacity
              style={[s.dangerBtn, { borderColor: 'rgba(239,68,68,0.6)', backgroundColor: 'rgba(239,68,68,0.07)' }]}
              onPress={handleNuclearClear}
              activeOpacity={0.85}
            >
              <Text style={s.dangerBtnText}>☢ Clear All AsyncStorage</Text>
              <Text style={s.dangerBtnSub}>
                Wipes all local data. Use to simulate a fresh install.
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title.toUpperCase()}</Text>;
}

function ToggleRow({
  label, sub, value, onChange, activeColor = C.gold,
}: {
  label: string; sub: string; value: boolean;
  onChange: (v: boolean) => void; activeColor?: string;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.borderDefault, true: `${activeColor}60` }}
        thumbColor={value ? activeColor : C.textMuted}
      />
    </View>
  );
}

function EventRow({ event }: { event: AnalyticsEvent }) {
  const time = new Date(event.timestamp).toLocaleTimeString('pl-PL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const params = Object.entries(event.params)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('  •  ');

  return (
    <View style={s.logRow}>
      <View style={s.logRowHeader}>
        <Text style={[s.logEventName, !event.sent && s.logEventDisabled]}>
          {event.sent ? '●' : '○'} {event.name}
        </Text>
        <Text style={s.logTime}>{time}</Text>
      </View>
      {params ? (
        <Text style={s.logParams} numberOfLines={2}>{params}</Text>
      ) : null}
    </View>
  );
}

function CrashRow({ entry }: { entry: CrashEntry }) {
  const [expanded, setExpanded] = React.useState(false);
  const time = new Date(entry.timestamp).toLocaleTimeString('pl-PL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const color = SEV_COLOR[entry.severity] ?? '#9ca3af';

  return (
    <TouchableOpacity style={s.crashRow} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={s.logRowHeader}>
        <View style={s.crashSevBadge}>
          <View style={[s.crashSevDot, { backgroundColor: color }]} />
          <Text style={[s.crashSevText, { color }]}>{entry.severity.toUpperCase()}</Text>
          {entry.isFatal && <Text style={s.fatalTag}>FATAL</Text>}
        </View>
        <Text style={s.logTime}>{time}</Text>
      </View>
      <Text style={s.crashMessage} numberOfLines={expanded ? undefined : 2}>
        {entry.message}
      </Text>
      {expanded && entry.stack && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={s.crashStack}>{entry.stack.slice(0, 800)}</Text>
        </ScrollView>
      )}
      {expanded && entry.context && (
        <Text style={s.crashContext}>
          {JSON.stringify(entry.context, null, 2)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function InfoGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={s.infoGrid}>
      {rows.map(({ label, value }) => (
        <View key={label} style={s.infoRow}>
          <Text style={s.infoLabel}>{label}</Text>
          <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={s.emptyState}>
      <Text style={s.emptyIcon}>📭</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },  // darker than app — signals "restricted"

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10, gap: 10,
  },
  backBtn:     { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontSize: 16, color: C.gold, fontWeight: '600' },
  headerTitle: { fontSize: 18, color: '#a78bfa', fontWeight: '800' },  // purple — distinct from normal screens
  headerSub:   { fontSize: 11, color: C.textMuted },

  warningBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(239,68,68,0.40)',
    paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center',
  },
  warningText: { fontSize: 11, color: '#ef4444', fontWeight: '800', letterSpacing: 1 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
    backgroundColor: '#111',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2, borderBottomColor: '#a78bfa',
  },
  tabText:       { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#a78bfa' },

  scroll: { padding: 14, gap: 10 },

  sectionHeader: {
    fontSize: 10, color: '#6b7280', fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginTop: 8, marginBottom: 2,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearBtn:   { fontSize: 13, color: '#f97316', fontWeight: '700', paddingVertical: 4 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#161616', borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault, padding: 14,
  },
  toggleLabel: { fontSize: 14, color: C.textPrimary, fontWeight: '600' },
  toggleSub:   { fontSize: 11, color: C.textMuted, marginTop: 2 },

  dangerBtn: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: Radius.md, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.40)',
    padding: 14, gap: 4,
  },
  dangerBtnText: { fontSize: 14, color: '#ef4444', fontWeight: '800' },
  dangerBtnSub:  { fontSize: 11, color: C.textMuted },

  // Event log rows
  logRow: {
    backgroundColor: '#161616', borderRadius: Radius.sm,
    borderWidth: 1, borderColor: '#1f2937',
    padding: 10, gap: 4,
  },
  logRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logEventName: { fontSize: 13, color: '#4ade80', fontWeight: '700', fontFamily: 'monospace' },
  logEventDisabled: { color: '#6b7280' },
  logParams:    { fontSize: 10, color: C.textMuted, fontFamily: 'monospace', lineHeight: 14 },
  logTime:      { fontSize: 10, color: '#4b5563' },

  // Crash log rows
  crashRow: {
    backgroundColor: '#161616', borderRadius: Radius.sm,
    borderWidth: 1, borderColor: '#1f2937', padding: 10, gap: 6,
  },
  crashSevBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  crashSevDot:   { width: 7, height: 7, borderRadius: 4 },
  crashSevText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  fatalTag: {
    fontSize: 9, color: '#ef4444', fontWeight: '800', letterSpacing: 1,
    borderWidth: 1, borderColor: '#ef4444', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  crashMessage: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  crashStack: {
    fontSize: 9, color: '#4b5563', fontFamily: 'monospace',
    lineHeight: 13, marginTop: 4,
  },
  crashContext: {
    fontSize: 9, color: '#6b7280', fontFamily: 'monospace',
    marginTop: 4, lineHeight: 13,
  },

  // Info grid
  infoGrid: {
    backgroundColor: '#161616', borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1f2937',
  },
  infoLabel: { flex: 1, fontSize: 12, color: C.textMuted },
  infoValue: { flex: 1, fontSize: 12, color: '#a78bfa', fontWeight: '600', textAlign: 'right', fontFamily: 'monospace' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyIcon:  { fontSize: 36 },
  emptyText:  { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
});
