// ============================================================
// BATTLE ECHOES — StatsScreen.tsx
// Statystyki użytkownika — prawdziwe dane ze store, AnimatedCounter
// ============================================================
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Animated, Dimensions, TouchableOpacity, TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, ERA_COLORS, ERA_THEMES } from '../constants/theme';
import { useAppStore, levelFromXP, XP_REWARDS } from '../store';
import { ALL_ARTIFACTS, RARITY_META } from '../artifacts/data';
import { hapticLight } from '../services/HapticsService';
import { BATTLE_SITES } from '../services/GPSService';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Icon, EraIcon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');
const C = Colors;

// ════════════════════════════════════════════════════════════
// TYPY POMOCNICZE
// ════════════════════════════════════════════════════════════
interface DayData {
  day: string;     // etykieta dnia tygodnia: 'Pn', 'Wt' …
  date: string;    // 'YYYY-MM-DD'
  battles: number;
  minutes: number;
  xp: number;
  isToday: boolean;
}

interface EraBarData {
  era: string;
  eraId: string;
  color: string;
  battles: number;
  xp: number;
  pct: number;
}

// ════════════════════════════════════════════════════════════
// FUNKCJE POMOCNICZE — budowanie danych ze store
// ════════════════════════════════════════════════════════════
const WEEK_LABELS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

function buildWeekData(activityLog: Record<string, number>): DayData[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i)); // 6 days ago → today
    const date = d.toISOString().slice(0, 10);
    const battles = activityLog[date] || 0;
    return {
      day: WEEK_LABELS[d.getDay()],
      date,
      battles,
      minutes: battles * 12,
      xp: battles * XP_REWARDS.listen_full,
      isToday: i === 6,
    };
  });
}

function buildHeatmapData(activityLog: Record<string, number>): number[] {
  const today = new Date();
  return Array.from({ length: 70 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (69 - i));
    const date = d.toISOString().slice(0, 10);
    return Math.min(activityLog[date] || 0, 4); // cap 0–4 dla skali kolorów
  });
}

function buildEraData(
  listenedBattles: string[],
  battles: { id: string; era: string }[],
): EraBarData[] {
  const counts: Record<string, number> = {};
  listenedBattles.forEach(id => {
    const b = battles.find(x => x.id === id);
    if (b) counts[b.era] = (counts[b.era] || 0) + 1;
  });
  const total = listenedBattles.length || 1;
  return Object.entries(counts)
    .map(([era, count]) => ({
      era: (ERA_THEMES as Record<string, { name: string }>)[era]?.name ?? era,
      eraId: era,
      color: ERA_COLORS[era] ?? C.gold,
      battles: count,
      xp: count * XP_REWARDS.listen_full,
      pct: count / total,
    }))
    .sort((a, b) => b.battles - a.battles);
}

// ════════════════════════════════════════════════════════════
// OSIĄGNIĘCIA — definicje i warunki
// ════════════════════════════════════════════════════════════
const ACHIEVEMENTS = [
  { id: 'first_listen', iconId: 'microphone' as const, label: 'Pierwsza narracja',    desc: 'Odsłuchaj 1 bitwę' },
  { id: 'streak_7',     iconId: 'fire'       as const, label: '7 dni serii',          desc: '7 dni z rzędu' },
  { id: 'gps_visit',    iconId: 'map_marker' as const, label: 'Pielgrzym',            desc: 'Odwiedź pole bitwy GPS' },
  { id: 'all_persp',    iconId: 'shuffle'    as const, label: 'Wieloperspektywiczny', desc: 'Ukończ bitwę (wszystkie perspektywy)' },
  { id: 'legendary',    iconId: 'crown'      as const, label: 'Legenda',              desc: 'Zdobądź legendarny artefakt' },
  { id: 'collector',    iconId: 'pot'        as const, label: 'Kolekcjoner',          desc: '10 artefaktów' },
  { id: 'explorer',     iconId: 'map'        as const, label: 'Odkrywca',             desc: '5 różnych bitew' },
  { id: 'historian',    iconId: 'bookshelf'  as const, label: 'Historyk',             desc: 'Osiągnij poziom 5' },
];

type UserSnapshot = {
  listenedBattles:  string[];
  visitedBattles:   string[];
  completedBattles: string[];
  unlockedArtifacts: string[];
  streak: number;
  totalXP: number;
};

function isUnlocked(id: string, u: UserSnapshot): boolean {
  switch (id) {
    case 'first_listen': return u.listenedBattles.length >= 1;
    case 'streak_7':     return u.streak >= 7;
    case 'gps_visit':    return u.visitedBattles.length >= 1;
    case 'all_persp':    return u.completedBattles.length >= 1;
    case 'legendary':    return u.unlockedArtifacts.some(aid => {
      const a = ALL_ARTIFACTS.find(x => x.id === aid);
      return a?.rarity === 'legendary';
    });
    case 'collector':    return u.unlockedArtifacts.length >= 10;
    case 'explorer':     return u.listenedBattles.length >= 5;
    case 'historian':    return levelFromXP(u.totalXP).level >= 5;
    default:             return false;
  }
}

// ════════════════════════════════════════════════════════════
// ANIMATED COUNTER — odlicza od 0 do target przy mount/zmianie
// ════════════════════════════════════════════════════════════
function AnimatedCounter({ target, style }: { target: number; style?: TextStyle }) {
  const [count, setCount] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value }) => setCount(Math.round(value)));
    Animated.timing(anim, {
      toValue: target, duration: 900, delay: 100, useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [target]);

  return <Text style={style}>{count.toLocaleString()}</Text>;
}

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function StatsScreen() {
  const { t } = useTranslation();
  const { user, battles, getLevelInfo } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('Stats'); }, []));
  const insets = useSafeAreaInsets();
  const [activeMetric, setActiveMetric] = useState<'battles' | 'xp' | 'minutes'>('battles');

  const lvl             = getLevelInfo();
  const activityLog     = user?.activityLog     ?? {};
  const listenedBattles  = user?.listenedBattles  ?? [];
  const visitedBattles   = user?.visitedBattles   ?? [];
  const completedBattles = user?.completedBattles ?? [];
  const unlockedArtifacts = user?.unlockedArtifacts ?? [];

  // Oblicz dane ze store (memoizowane)
  const weekData = useMemo(() => buildWeekData(activityLog),     [activityLog]);
  const heatData = useMemo(() => buildHeatmapData(activityLog),  [activityLog]);
  const eraData  = useMemo(() => buildEraData(listenedBattles, battles), [listenedBattles, battles]);

  // Liczby sumaryczne
  const totalBattles   = listenedBattles.length;
  const totalMinutes   = totalBattles * 12;
  const totalVisits    = visitedBattles.length;
  const totalArtifacts = unlockedArtifacts.length;

  // Animacja wejścia całego ekranu
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Snapshot dla osiągnięć
  const userSnap: UserSnapshot = {
    listenedBattles, visitedBattles, completedBattles,
    unlockedArtifacts, streak: user?.streak ?? 0, totalXP: user?.totalXP ?? 0,
  };

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeIn }]}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Nagłówek ─────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTitleRow}>
          <Icon id="chart" size={20} color={C.textPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>{t('stats.title')}</Text>
        </View>
        <Text style={styles.headerSub}>{t('stats.subtitle')}</Text>
      </View>

      {/* ── Karty sumaryczne (AnimatedCounter) ───────── */}
      <View style={styles.summaryGrid}>
        <SummaryCard iconId="microphone" value={totalBattles}   label={t('stats.narrations')}   color="#60a5fa" delay={0}   />
        <SummaryCard iconId="timer"      value={totalMinutes}   label={t('stats.minutes_label')} color={C.gold}  delay={80}  />
        <SummaryCard iconId="map_marker" value={totalVisits}    label={t('stats.gps_visits')}    color="#4ade80" delay={160} />
        <SummaryCard iconId="pot"        value={totalArtifacts} label={t('artifacts.title')}     color="#c084fc" delay={240} />
      </View>

      {/* ── Poziom i XP ──────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('stats.xp_progress')}</Text>
        <View style={styles.card}>
          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNum}>{lvl.level}</Text>
              <Text style={styles.levelLabel}>{t('stats.level_label')}</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.xpRow}>
                <Text style={styles.xpCurrent}>{lvl.currentXP.toLocaleString()} XP</Text>
                <Text style={styles.xpNext}>/ {lvl.xpToNext.toLocaleString()} XP</Text>
              </View>
              <XPProgressBar current={lvl.currentXP} total={lvl.xpToNext} />
              <Text style={styles.xpHint}>
                {t('stats.total_xp', { xp: (user?.totalXP ?? 0).toLocaleString() })}
              </Text>
            </View>
          </View>

          {/* Mini milestones */}
          <View style={styles.milestonesRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <View key={n} style={[
                styles.milestone,
                n <= lvl.level && styles.milestoneActive,
              ]}>
                <Text style={styles.milestoneText}>{n}</Text>
              </View>
            ))}
            <Text style={styles.milestonesLabel}>···</Text>
          </View>
        </View>
      </View>

      {/* ── Wykres słupkowy — ostatnie 7 dni ─────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('stats.activity_7days')}</Text>
          <View style={styles.metricTabs}>
            {(['battles', 'xp', 'minutes'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.metricTab, activeMetric === m && styles.metricTabActive]}
                onPress={() => { hapticLight(); setActiveMetric(m); }}
              >
                <Text style={[styles.metricTabText, activeMetric === m && styles.metricTabTextActive]}>
                  {m === 'xp' ? 'XP' : m === 'battles' ? t('stats.battles_metric') : t('stats.minutes_metric')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <WeekBarChart data={weekData} metric={activeMetric} />
      </View>

      {/* ── Heatmapa aktywności dziennej ─────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('stats.daily_activity')}</Text>
        <View style={styles.card}>
          <ActivityHeatmap data={heatData} />
          <View style={styles.heatmapLegend}>
            <Text style={styles.heatmapLegendLabel}>{t('stats.less')}</Text>
            {[0, 1, 2, 3, 4].map(v => (
              <View key={v} style={[styles.heatDot, { backgroundColor: heatColor(v) }]} />
            ))}
            <Text style={styles.heatmapLegendLabel}>{t('stats.more')}</Text>
          </View>
        </View>
      </View>

      {/* ── Epoki ────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('stats.eras')}</Text>
        {eraData.length > 0 ? (
          <View style={styles.card}>
            {eraData.map((era, i) => (
              <EraBar key={era.era} era={era} delay={i * 100} />
            ))}
          </View>
        ) : (
          <View style={[styles.card, styles.emptyCard]}>
            <Icon id="sword" size={32} color={C.textMuted} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyText}>
              {t('stats.eras_empty')}
            </Text>
          </View>
        )}
      </View>

      {/* ── Aktywność sumaryczna ─────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('stats.summary_activity')}</Text>
        <View style={styles.card}>
          <ActivityBar
            label={t('stats.listened_battles')}
            iconId="microphone"
            color="#60a5fa"
            have={listenedBattles.length}
            total={battles.length}
            delay={0}
          />
          <ActivityBar
            label={t('stats.visited_gps')}
            iconId="map_marker"
            color="#4ade80"
            have={visitedBattles.length}
            total={BATTLE_SITES.length}
            delay={100}
          />
          <ActivityBar
            label={t('stats.completed_all')}
            iconId="check_solid"
            color={C.gold}
            have={completedBattles.length}
            total={battles.length}
            delay={200}
          />
        </View>
      </View>

      {/* ── Kolekcja artefaktów według rzadkości ──────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('stats.artifact_collection')}</Text>
        <View style={styles.card}>
          {(['common', 'uncommon', 'rare', 'legendary'] as const).map((r, i) => {
            const meta  = RARITY_META[r];
            const total = ALL_ARTIFACTS.filter(a => a.rarity === r).length;
            const have  = unlockedArtifacts.filter(id =>
              ALL_ARTIFACTS.find(a => a.id === id && a.rarity === r)
            ).length;
            return (
              <RarityBar
                key={r}
                label={meta.label}
                color={meta.color}
                have={have}
                total={total}
                delay={i * 100}
              />
            );
          })}
        </View>
      </View>

      {/* ── Osiągnięcia — prawdziwe warunki ──────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('stats.achievements')}</Text>
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.map((a, i) => (
            <AchievementBadge
              key={a.id}
              achievement={a}
              unlocked={isUnlocked(a.id, userSnap)}
              delay={i * 60}
            />
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </Animated.ScrollView>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA SUMARYCZNA — spring in + AnimatedCounter
// ════════════════════════════════════════════════════════════
function SummaryCard({ iconId, value, label, color, delay }: {
  iconId: keyof typeof import('../components/GoldIcon').UI_ICONS;
  value: number; label: string; color: string; delay: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, delay, useNativeDriver: true, tension: 80 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.summaryCard,
      { borderColor: `${color}40`, transform: [{ scale: scaleAnim }], opacity: fadeAnim },
    ]}>
      <Icon id={iconId} size={26} color={color} />
      <AnimatedCounter target={value} style={[styles.summaryValue, { color }] as unknown as TextStyle} />
      <Text style={styles.summaryLabel}>{label}</Text>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// PASEK XP
// ════════════════════════════════════════════════════════════
function XPProgressBar({ current, total }: { current: number; total: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const pct = Math.min(current / Math.max(total, 1), 1);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 900, delay: 200, useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={styles.xpTrack}>
      <Animated.View style={[
        styles.xpFill,
        { width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
      ]} />
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// WYKRES SŁUPKOWY — 7 dni, 3 metryki
// ════════════════════════════════════════════════════════════
function WeekBarChart({ data, metric }: {
  data: DayData[];
  metric: 'battles' | 'xp' | 'minutes';
}) {
  const { t } = useTranslation();
  const maxVal = Math.max(...data.map(d => d[metric]), 1);
  const BAR_W  = (SW - 80) / 7 - 4;

  const animsRef = useRef(data.map(() => new Animated.Value(0)));

  useEffect(() => {
    animsRef.current.forEach(a => a.setValue(0));
    Animated.stagger(60, data.map((d, i) =>
      Animated.spring(animsRef.current[i], {
        toValue: d[metric] / maxVal,
        useNativeDriver: false, tension: 80,
      })
    )).start();
  }, [metric, data]);

  const barColor = metric === 'xp'      ? C.gold
                 : metric === 'battles' ? '#60a5fa' : '#4ade80';

  return (
    <View style={styles.card}>
      <View style={styles.chartArea}>
        {data.map((d, i) => (
          <View key={d.date} style={[styles.barWrap, { width: BAR_W }]}>
            <Animated.View style={[
              styles.bar,
              {
                backgroundColor: d.isToday ? C.goldBright : barColor,
                height: animsRef.current[i].interpolate({
                  inputRange: [0, 1], outputRange: [2, 100],
                }),
                opacity: d[metric] === 0 ? 0.18 : 1,
              },
            ]} />
            <Text style={[styles.barLabel, d.isToday && { color: C.gold }]}>
              {d.day}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.chartLegendIconRow}>
          <Icon
            id={metric === 'xp' ? 'star' : metric === 'battles' ? 'microphone' : 'timer'}
            size={13}
            color={C.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.chartLegendText}>
            {metric === 'xp'      ? t('stats.xp_earned')
            : metric === 'battles' ? t('stats.battles_listened')
            : t('stats.narration_minutes')}
          </Text>
        </View>
        <Text style={[styles.chartTotal, { color: barColor }]}>
          {t('stats.week_total', { total: data.reduce((s, d) => s + d[metric], 0).toLocaleString() })}
        </Text>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// HEATMAPA
// ════════════════════════════════════════════════════════════
function heatColor(value: number): string {
  if (value === 0) return 'rgba(255,255,255,0.06)';
  if (value === 1) return 'rgba(212,160,23,0.25)';
  if (value === 2) return 'rgba(212,160,23,0.50)';
  if (value === 3) return 'rgba(212,160,23,0.75)';
  return '#D4A017';
}

function ActivityHeatmap({ data }: { data: number[] }) {
  const CELL = (SW - 64) / 10 - 3;
  const weeks: number[][] = [];
  for (let i = 0; i < 10; i++) weeks.push(data.slice(i * 7, i * 7 + 7));

  return (
    <View style={styles.heatmap}>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.heatWeek}>
          {week.map((val, di) => (
            <View key={di} style={[
              styles.heatCell,
              { width: CELL, height: CELL, backgroundColor: heatColor(val) },
            ]} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// PASEK EPOKI
// ════════════════════════════════════════════════════════════
function EraBar({ era, delay }: { era: EraBarData; delay: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: era.pct, duration: 700, delay, useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={styles.eraBarWrap}>
      <View style={styles.eraBarHeader}>
        <EraIcon eraId={era.eraId} size={18} color={era.color} />
        <Text style={styles.eraName}>{era.era}</Text>
        <Text style={[styles.eraPct, { color: era.color }]}>{Math.round(era.pct * 100)}%</Text>
      </View>
      <View style={styles.eraTrack}>
        <Animated.View style={[
          styles.eraFill,
          {
            backgroundColor: era.color,
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]} />
      </View>
      <Text style={styles.eraMeta}>{era.battles} bitew · {era.xp} XP</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// PASEK AKTYWNOŚCI (listened / visited / completed)
// ════════════════════════════════════════════════════════════
function ActivityBar({ label, iconId, color, have, total, delay }: {
  label: string;
  iconId: keyof typeof import('../components/GoldIcon').UI_ICONS;
  color: string; have: number; total: number; delay: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? Math.min(have / total, 1) : 0;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 700, delay, useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={styles.rarityBarWrap}>
      <View style={styles.rarityBarHeader}>
        <View style={styles.activityBarLabelRow}>
          <Icon id={iconId} size={13} color={color} style={{ marginRight: 4 }} />
          <Text style={[styles.activityBarLabel, { color: C.textSecondary }]}>{label}</Text>
        </View>
        <Text style={styles.rarityCount}>{have}/{total}</Text>
      </View>
      <View style={styles.rarityTrack}>
        <Animated.View style={[
          styles.rarityFill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]} />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// PASEK RZADKOŚCI ARTEFAKTÓW
// ════════════════════════════════════════════════════════════
function RarityBar({ label, color, have, total, delay }: {
  label: string; color: string; have: number; total: number; delay: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? have / total : 0;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 700, delay, useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={styles.rarityBarWrap}>
      <View style={styles.rarityBarHeader}>
        <Text style={[styles.rarityLabel, { color }]}>{label}</Text>
        <Text style={styles.rarityCount}>{have}/{total}</Text>
      </View>
      <View style={styles.rarityTrack}>
        <Animated.View style={[
          styles.rarityFill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]} />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// OSIĄGNIĘCIA
// ════════════════════════════════════════════════════════════
function AchievementBadge({ achievement, unlocked, delay }: {
  achievement: typeof ACHIEVEMENTS[0]; unlocked: boolean; delay: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, delay, useNativeDriver: true, tension: 80,
    }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.achievementBadge,
      unlocked ? styles.achievementUnlocked : styles.achievementLocked,
      { transform: [{ scale: scaleAnim }] },
    ]}>
      <View style={[styles.achievementIconWrap, !unlocked && { opacity: 0.3 }]}>
        <Icon
          id={achievement.iconId}
          size={26}
          color={unlocked ? C.gold : C.textMuted}
        />
      </View>
      <Text
        style={[styles.achievementLabel, !unlocked && styles.achievementLabelLocked]}
        numberOfLines={2}
      >
        {achievement.label}
      </Text>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  scroll:    { padding: 16, gap: 16 },

  header:         { paddingBottom: 4 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle:    { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  headerSub:      { fontSize: 13, color: C.textMuted, marginTop: 2 },

  // Summary
  summaryGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  summaryCard: {
    width: (SW - 42) / 2, backgroundColor: C.backgroundCard,
    borderRadius: Radius.md, padding: 14, alignItems: 'center', gap: 4,
    borderWidth: 1,
  },
  summaryValue: { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: C.textMuted },

  // Section
  section:       { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel:  { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '700' },

  card: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, gap: 12,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  emptyCard: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  // Level / XP
  levelRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelBadge: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: C.goldLight, borderWidth: 2, borderColor: C.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  levelNum:   { fontSize: 26, color: C.gold, fontWeight: '800' },
  levelLabel: { fontSize: 8, color: C.gold, fontWeight: '700', letterSpacing: 1 },
  xpRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  xpCurrent:  { fontSize: 16, color: C.textPrimary, fontWeight: '700' },
  xpNext:     { fontSize: 12, color: C.textMuted },
  xpTrack:    { height: 6, backgroundColor: C.backgroundElevated, borderRadius: 3, overflow: 'hidden' },
  xpFill:     { height: 6, backgroundColor: C.gold, borderRadius: 3 },
  xpHint:     { fontSize: 11, color: C.textMuted },

  milestonesRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  milestone:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.backgroundElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderDefault },
  milestoneActive: { backgroundColor: C.goldLight, borderColor: C.gold },
  milestoneText:   { fontSize: 11, color: C.textMuted, fontWeight: '700' },
  milestonesLabel: { fontSize: 14, color: C.textMuted, marginLeft: 4 },

  // Metric tabs
  metricTabs:         { flexDirection: 'row', gap: 4 },
  metricTab:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.backgroundElevated },
  metricTabActive:    { backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.gold },
  metricTabText:      { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  metricTabTextActive:{ color: C.gold },

  // Bar chart
  chartArea:           { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 3 },
  barWrap:             { alignItems: 'center', gap: 4 },
  bar:                 { borderRadius: 3, minHeight: 2 },
  barLabel:            { fontSize: 9, color: C.textMuted },
  chartLegend:         { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLegendIconRow:  { flexDirection: 'row', alignItems: 'center' },
  chartLegendText:     { fontSize: 11, color: C.textMuted },
  chartTotal:          { fontSize: 12, fontWeight: '700' },

  // Heatmap
  heatmap:            { flexDirection: 'row', gap: 3 },
  heatWeek:           { gap: 3 },
  heatCell:           { borderRadius: 2 },
  heatmapLegend:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  heatDot:            { width: 12, height: 12, borderRadius: 2 },
  heatmapLegendLabel: { fontSize: 10, color: C.textMuted },

  // Era bar
  eraBarWrap:   { gap: 4 },
  eraBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eraName:      { flex: 1, fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  eraPct:       { fontSize: 13, fontWeight: '700' },
  eraTrack:     { height: 6, backgroundColor: C.backgroundElevated, borderRadius: 3, overflow: 'hidden' },
  eraFill:      { height: 6, borderRadius: 3 },
  eraMeta:      { fontSize: 11, color: C.textMuted },

  // Activity / Rarity bar (shared layout)
  rarityBarWrap:      { gap: 5 },
  rarityBarHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rarityLabel:        { fontSize: 13, fontWeight: '600' },
  activityBarLabelRow:{ flexDirection: 'row', alignItems: 'center' },
  activityBarLabel:   { fontSize: 12, fontWeight: '600' },
  rarityCount:        { fontSize: 12, color: C.textMuted },
  rarityTrack:        { height: 5, backgroundColor: C.backgroundElevated, borderRadius: 3, overflow: 'hidden' },
  rarityFill:         { height: 5, borderRadius: 3 },

  // Achievements
  achievementsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementBadge:    {
    width: (SW - 52) / 4,
    borderRadius: 14, padding: 10,
    alignItems: 'center', gap: 6,
    borderWidth: 1,
  },
  achievementUnlocked:  { backgroundColor: C.goldLight,       borderColor: C.goldBorder },
  achievementLocked:    { backgroundColor: C.backgroundCard,  borderColor: C.borderDefault },
  achievementIconWrap:  { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  achievementLabel:     { fontSize: 9, color: C.gold, fontWeight: '700', textAlign: 'center' },
  achievementLabelLocked: { color: C.textMuted },
});
