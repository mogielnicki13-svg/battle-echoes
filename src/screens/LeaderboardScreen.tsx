// ============================================================
// BATTLE ECHOES — LeaderboardScreen.tsx
// Ranking graczy Tygodniowy / Wszech Czasów
// Dane z Firestore (kolekcja 'leaderboard') z fallbackiem na mock
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import { levelFromXP } from '../store';
import { getLeaderboard, type LeaderboardEntry } from '../services/FirebaseService';
import { hapticLight, hapticSelect } from '../services/HapticsService';
import { useTranslation } from 'react-i18next';

const C = Colors;

// ── Dane mockowe (fallback offline) ─────────────────────────
interface LeaderEntry {
  rank:   number;
  name:   string;
  avatar: string;
  xp:     number;
  level:  number;
  streak: number;
  isMe?:  boolean;
}

const WEEKLY_DATA: LeaderEntry[] = [
  { rank: 1, name: 'Historyk_PL',    avatar: '🎖', xp: 4200, level: 9,  streak: 12 },
  { rank: 2, name: 'Rycerz_Krzyżowy', avatar: '⚔', xp: 3850, level: 8,  streak: 8  },
  { rank: 3, name: 'CzarnyHusarz',    avatar: '🐎', xp: 3500, level: 8,  streak: 11 },
  { rank: 4, name: 'NapoleonFan',     avatar: '🎩', xp: 2950, level: 7,  streak: 5  },
  { rank: 5, name: 'SpartaKing',      avatar: '🛡', xp: 2600, level: 6,  streak: 7  },
  { rank: 6, name: 'WW1_Veteran',     avatar: '🪖', xp: 2300, level: 6,  streak: 4  },
  { rank: 7, name: 'Taktyk_Polowy',   avatar: '🗺', xp: 1950, level: 5,  streak: 6  },
  { rank: 8, name: '',                avatar: '🏆', xp: 0,    level: 1,  streak: 0, isMe: true },
  { rank: 9, name: 'LeonPod',         avatar: '📜', xp: 1500, level: 4,  streak: 3  },
  { rank: 10,name: 'BattleNewbie',    avatar: '🎯', xp: 1200, level: 3,  streak: 2  },
];

const ALL_TIME_DATA: LeaderEntry[] = [
  { rank: 1, name: 'Historyk_PL',     avatar: '🎖', xp: 48500, level: 22, streak: 45 },
  { rank: 2, name: 'CzarnyHusarz',    avatar: '🐎', xp: 42300, level: 20, streak: 38 },
  { rank: 3, name: 'Magnus_Rex',      avatar: '👑', xp: 39800, level: 19, streak: 52 },
  { rank: 4, name: 'Rycerz_Krzyżowy', avatar: '⚔', xp: 35000, level: 17, streak: 29 },
  { rank: 5, name: 'SpartaKing',      avatar: '🛡', xp: 31200, level: 16, streak: 33 },
  { rank: 6, name: 'NapoleonFan',     avatar: '🎩', xp: 27500, level: 14, streak: 21 },
  { rank: 7, name: 'WW1_Veteran',     avatar: '🪖', xp: 24000, level: 13, streak: 18 },
  { rank: 8, name: '',                avatar: '🏆', xp: 0,     level: 1,  streak: 0, isMe: true },
  { rank: 9, name: 'Taktyk_Polowy',   avatar: '🗺', xp: 19000, level: 11, streak: 14 },
  { rank: 10,name: 'BattleNewbie',    avatar: '🎯', xp: 15000, level: 9,  streak: 8  },
];

// ── Awatary rankingowe ───────────────────────────────────────
const RANK_AVATARS = ['🎖', '⚔', '🐎', '🎩', '🛡', '🪖', '🗺', '📜', '🎯', '🏅'];
function avatarForRank(rank: number): string {
  return RANK_AVATARS[(rank - 1) % RANK_AVATARS.length];
}

// ── Kolory podium ───────────────────────────────────────────
const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const PODIUM_GLOW   = ['rgba(255,215,0,0.25)', 'rgba(192,192,192,0.20)', 'rgba(205,127,50,0.20)'];

/** Konwertuj LeaderboardEntry z Firestore → LeaderEntry do renderowania */
function toLeaderEntry(
  entry: LeaderboardEntry,
  rank: number,
  mode: 'weekly' | 'alltime',
  currentUserId?: string,
): LeaderEntry {
  return {
    rank,
    name:   entry.name,
    avatar: avatarForRank(rank),
    xp:     mode === 'weekly' ? entry.weeklyXP : entry.totalXP,
    level:  entry.level,
    streak: entry.streak,
    isMe:   entry.userId === currentUserId,
  };
}

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function LeaderboardScreen() {
  const navigation  = useNavigation<any>();
  const insets      = useSafeAreaInsets();
  useFocusEffect(useCallback(() => { logScreenView('Leaderboard'); }, []));
  const { user }    = useAppStore();
  const { t }       = useTranslation();
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<LeaderEntry[]>([]);

  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(tabAnim, {
      toValue: tab === 'weekly' ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [tab]);

  // Dane użytkownika
  const myXP     = user?.totalXP ?? 0;
  const myLevel  = levelFromXP(myXP).level;
  const myName   = user?.name ?? 'Ty';
  const myStreak = user?.streak ?? 0;

  /** Pobierz ranking z Firestore lub fallback na mock */
  const fetchLeaderboard = useCallback(async (mode: 'weekly' | 'alltime') => {
    try {
      const raw = await getLeaderboard(mode, 50);

      if (raw.length === 0) {
        // Brak danych z Firestore — użyj mockowanych danych
        const mock = (mode === 'weekly' ? WEEKLY_DATA : ALL_TIME_DATA).map(e =>
          e.isMe ? { ...e, name: myName, xp: myXP, level: myLevel, streak: myStreak } : e,
        );
        setEntries(mock);
        return;
      }

      // Konwertuj dane z Firestore
      const mapped = raw.map((e, i) => toLeaderEntry(e, i + 1, mode, user?.id));

      // Jeśli aktualny użytkownik nie jest w wynikach — dopisz go
      const meFound = mapped.some(e => e.isMe);
      if (!meFound && user) {
        const myXPForMode = mode === 'weekly'
          ? computeLocalWeeklyXP(user.activityLog ?? {})
          : myXP;
        // Znajdź estymowaną pozycję
        let estimatedRank = mapped.length + 1;
        for (let i = 0; i < mapped.length; i++) {
          if (myXPForMode >= mapped[i].xp) {
            estimatedRank = mapped[i].rank;
            break;
          }
        }
        mapped.push({
          rank:   estimatedRank,
          name:   myName,
          avatar: '🏆',
          xp:     myXPForMode,
          level:  myLevel,
          streak: myStreak,
          isMe:   true,
        });
        // Posortuj ponownie
        mapped.sort((a, b) => b.xp - a.xp);
        // Przenumeruj rankingi
        mapped.forEach((e, i) => { e.rank = i + 1; });
      }

      setEntries(mapped);
    } catch {
      // Fallback na mock
      const mock = (mode === 'weekly' ? WEEKLY_DATA : ALL_TIME_DATA).map(e =>
        e.isMe ? { ...e, name: myName, xp: myXP, level: myLevel, streak: myStreak } : e,
      );
      setEntries(mock);
    }
  }, [user?.id, myXP, myLevel, myName, myStreak]);

  // Ładuj dane przy focusie ekranu
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchLeaderboard(tab).finally(() => setLoading(false));
    }, [tab, fetchLeaderboard]),
  );

  // Odśwież przy zmianie zakładki
  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(tab).finally(() => setLoading(false));
  }, [tab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard(tab).finally(() => setRefreshing(false));
  }, [tab, fetchLeaderboard]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Nagłówek ────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { hapticLight(); navigation.goBack(); }}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('leaderboard.title')}</Text>
          <Text style={styles.headerSub}>{t('leaderboard.best_historians')}</Text>
        </View>
      </View>

      {/* ── Zakładki ─────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {(['weekly', 'alltime'] as const).map(tabItem => (
          <TouchableOpacity
            key={tabItem}
            style={[styles.tab, tab === tabItem && styles.tabActive]}
            onPress={() => { hapticLight(); setTab(tabItem); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === tabItem && styles.tabTextActive]}>
              {tabItem === 'weekly' ? t('leaderboard.weekly') : t('leaderboard.all_time')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loaderText}>{t('leaderboard.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.gold}
              colors={[C.gold]}
            />
          }
        >

          {/* ── Podium TOP 3 ─────────────────────────────── */}
          {entries.length >= 3 && <PodiumRow entries={entries.slice(0, 3)} />}

          {/* ── Reszta listy ─────────────────────────────── */}
          {entries.slice(3).map(entry => (
            <RankRow key={entry.rank} entry={entry} />
          ))}

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

/** Oblicz weeklyXP lokalnie (lustrzana kopia logiki z FirebaseService) */
function computeLocalWeeklyXP(activityLog: Record<string, number>): number {
  const now   = new Date();
  let total   = 0;
  for (let i = 0; i < 7; i++) {
    const d   = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    total += activityLog[key] ?? 0;
  }
  return total * 100;
}

// ── Podium TOP 3 ────────────────────────────────────────────
function PodiumRow({ entries }: { entries: LeaderEntry[] }) {
  const { t } = useTranslation();
  // Kolejność na podium: 2. miejsce (L), 1. miejsce (S), 3. miejsce (P)
  const order = [entries[1], entries[0], entries[2]];
  const heights = [80, 110, 60]; // wysokości podium

  return (
    <View style={podStyles.container}>
      {order.map((e, i) => {
        const realRank = i === 1 ? 1 : i === 0 ? 2 : 3;
        const col      = PODIUM_COLORS[realRank - 1];
        const glow     = PODIUM_GLOW[realRank - 1];

        return (
          <View key={e.rank} style={podStyles.column}>
            {/* Awatar + info */}
            <View style={[podStyles.avatar, { borderColor: col, backgroundColor: glow }]}>
              <Text style={{ fontSize: 26 }}>{e.avatar}</Text>
            </View>
            <Text style={[podStyles.name, e.isMe && { color: C.gold }]} numberOfLines={1}>
              {e.isMe ? t('leaderboard.you') : e.name}
            </Text>
            <Text style={podStyles.xp}>{e.xp.toLocaleString()} XP</Text>
            {/* Słupek podium */}
            <View style={[podStyles.bar, { height: heights[i], backgroundColor: glow, borderColor: col }]}>
              <Text style={[podStyles.rankNum, { color: col }]}>{realRank}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Wiersz rankingowy ────────────────────────────────────────
function RankRow({ entry }: { entry: LeaderEntry }) {
  const { t } = useTranslation();
  return (
    <View style={[rowStyles.row, entry.isMe && rowStyles.rowMe]}>
      <Text style={[rowStyles.rank, entry.isMe && { color: C.gold }]}>{entry.rank}</Text>
      <View style={rowStyles.avatar}>
        <Text style={{ fontSize: 20 }}>{entry.avatar}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.name, entry.isMe && { color: C.gold }]} numberOfLines={1}>
          {entry.isMe ? t('leaderboard.you') : entry.name}
        </Text>
        <Text style={rowStyles.meta}>{t('leaderboard.level_label', { level: entry.level })} · {t('leaderboard.streak_label', { count: entry.streak })}</Text>
      </View>
      <Text style={[rowStyles.xp, entry.isMe && { color: C.gold }]}>
        {entry.xp.toLocaleString()} XP
      </Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText:   { fontSize: 18, color: C.textMuted },
  headerTitle:   { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  headerSub:     { fontSize: 13, color: C.textMuted, marginTop: 2 },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.lg,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1, borderRadius: Radius.md,
    paddingVertical: 8, alignItems: 'center',
  },
  tabActive: { backgroundColor: C.backgroundCard, borderWidth: 1, borderColor: C.borderDefault },
  tabText:   { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  tabTextActive: { color: C.textPrimary },

  scroll: { padding: 16, gap: 8 },

  loaderWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loaderText: {
    fontSize: 13, color: C.textMuted,
  },
});

const podStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  name: {
    fontSize: 11, color: C.textSecondary, fontWeight: '700',
    maxWidth: 90, textAlign: 'center',
  },
  xp: {
    fontSize: 10, color: C.textMuted, textAlign: 'center',
  },
  bar: {
    width: '90%',
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  rankNum: {
    fontSize: 20, fontWeight: '800',
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.borderDefault,
    padding: 12,
  },
  rowMe: {
    borderColor: `${C.gold}50`,
    backgroundColor: `${C.gold}08`,
  },
  rank: {
    fontSize: 15, color: C.textMuted, fontWeight: '700',
    width: 24, textAlign: 'center',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  name: {
    fontSize: 14, color: C.textPrimary, fontWeight: '600',
  },
  meta: {
    fontSize: 11, color: C.textMuted, marginTop: 2,
  },
  xp: {
    fontSize: 12, color: C.textSecondary, fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
