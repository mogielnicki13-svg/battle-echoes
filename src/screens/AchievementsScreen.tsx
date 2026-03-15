// ============================================================
// BATTLE ECHOES — AchievementsScreen.tsx
// 16 osiągnięć w 4 kategoriach
// Kategorie: Słuchacz · Podróżnik · Kolekcjoner · Historyk
// ============================================================
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Colors, Radius } from '../constants/theme';
import { useAppStore, levelFromXP } from '../store';
import { hapticLight, hapticSelect } from '../services/HapticsService';
import GoldIcon from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const C = Colors;

// ── Typy ──────────────────────────────────────────────────
type CategoryId = 'listener' | 'traveler' | 'collector' | 'historian';

interface Achievement {
  id:          string;
  category:    CategoryId;
  title:       string;
  description: string;
  iconName:    string;
  // Jak sprawdzić postęp — parametry z AppStore
  check:       (ctx: AchievCtx) => { progress: number; max: number; unlocked: boolean };
  xpReward:    number;
}

interface AchievCtx {
  listenedCount:  number;
  visitedCount:   number;
  artifactCount:  number;
  completedCount: number;
  streak:         number;
  level:          number;
  totalXP:        number;
  quizBattles:    number; // ile bitew ukończono quiz
  battlesTotal:   number; // całkowita liczba bitew w grze (dynamiczne)
}

// ── Definicje osiągnięć ────────────────────────────────────
const ACHIEVEMENTS: Achievement[] = [
  // ── Słuchacz ─────────────────────────────────────────────
  {
    id: 'first_listen', category: 'listener',
    title: 'Pierwsza Narracja', iconName: 'microphone',
    description: 'Posłuchaj pierwszej bitwy do końca.',
    xpReward: 50,
    check: ({ listenedCount }) => ({ progress: listenedCount, max: 1, unlocked: listenedCount >= 1 }),
  },
  {
    id: 'five_listens', category: 'listener',
    title: 'Gorliwy Słuchacz', iconName: 'headphones',
    description: 'Posłuchaj 5 bitew do końca.',
    xpReward: 150,
    check: ({ listenedCount }) => ({ progress: listenedCount, max: 5, unlocked: listenedCount >= 5 }),
  },
  {
    id: 'all_listens', category: 'listener',
    title: 'Archiwista Dźwięku', iconName: 'radio',
    description: 'Posłuchaj wszystkich dostępnych bitew.',
    xpReward: 400,
    check: ({ listenedCount, battlesTotal }) => ({ progress: listenedCount, max: battlesTotal, unlocked: listenedCount >= battlesTotal }),
  },
  {
    id: 'streak_7', category: 'listener',
    title: 'Tygodniowa Seria', iconName: 'fire',
    description: 'Utrzymaj serię 7 dni z rzędu.',
    xpReward: 200,
    check: ({ streak }) => ({ progress: streak, max: 7, unlocked: streak >= 7 }),
  },

  // ── Podróżnik ─────────────────────────────────────────────
  {
    id: 'first_gps', category: 'traveler',
    title: 'Pierwsza Wizyta', iconName: 'map-marker',
    description: 'Odwiedź pole bitwy przy użyciu GPS.',
    xpReward: 100,
    check: ({ visitedCount }) => ({ progress: visitedCount, max: 1, unlocked: visitedCount >= 1 }),
  },
  {
    id: 'three_gps', category: 'traveler',
    title: 'Pielgrzym Historii', iconName: 'walk',
    description: 'Odwiedź 3 pola bitew przez GPS.',
    xpReward: 300,
    check: ({ visitedCount }) => ({ progress: visitedCount, max: 3, unlocked: visitedCount >= 3 }),
  },
  {
    id: 'five_gps', category: 'traveler',
    title: 'Żołnierz Terenowy', iconName: 'map',
    description: 'Odwiedź 5 pól bitew przez GPS.',
    xpReward: 500,
    check: ({ visitedCount }) => ({ progress: visitedCount, max: 5, unlocked: visitedCount >= 5 }),
  },
  {
    id: 'all_eras', category: 'traveler',
    title: 'Podróżnik Czasu', iconName: 'timer-sand',
    description: 'Odwiedź bitwę z każdej epoki historycznej.',
    xpReward: 600,
    check: ({ visitedCount }) => ({ progress: Math.min(visitedCount, 6), max: 6, unlocked: visitedCount >= 6 }),
  },

  // ── Kolekcjoner ───────────────────────────────────────────
  {
    id: 'first_artifact', category: 'collector',
    title: 'Odkrywca Artefaktów', iconName: 'pot',
    description: 'Zdobądź swój pierwszy artefakt.',
    xpReward: 75,
    check: ({ artifactCount }) => ({ progress: artifactCount, max: 1, unlocked: artifactCount >= 1 }),
  },
  {
    id: 'five_artifacts', category: 'collector',
    title: 'Muzealnik', iconName: 'image-frame',
    description: 'Zgromadź kolekcję 5 artefaktów.',
    xpReward: 250,
    check: ({ artifactCount }) => ({ progress: artifactCount, max: 5, unlocked: artifactCount >= 5 }),
  },
  {
    id: 'ten_artifacts', category: 'collector',
    title: 'Kustosz Muzeum', iconName: 'bank',
    description: 'Zgromadź imponującą kolekcję 10 artefaktów.',
    xpReward: 500,
    check: ({ artifactCount }) => ({ progress: artifactCount, max: 10, unlocked: artifactCount >= 10 }),
  },
  {
    id: 'all_perspectives', category: 'collector',
    title: 'Wszystkie Perspektywy', iconName: 'eye',
    description: 'Ukończ bitwę słuchając wszystkich 4 perspektyw.',
    xpReward: 200,
    check: ({ completedCount }) => ({ progress: completedCount, max: 1, unlocked: completedCount >= 1 }),
  },

  // ── Historyk ──────────────────────────────────────────────
  {
    id: 'first_quiz', category: 'historian',
    title: 'Student Historii', iconName: 'bookshelf',
    description: 'Ukończ swój pierwszy quiz historyczny.',
    xpReward: 100,
    check: ({ quizBattles }) => ({ progress: quizBattles, max: 1, unlocked: quizBattles >= 1 }),
  },
  {
    id: 'three_quizzes', category: 'historian',
    title: 'Erudyta', iconName: 'head-question-outline',
    description: 'Ukończ quizy dla 3 różnych bitew.',
    xpReward: 300,
    check: ({ quizBattles }) => ({ progress: quizBattles, max: 3, unlocked: quizBattles >= 3 }),
  },
  {
    id: 'level_10', category: 'historian',
    title: 'Generał', iconName: 'medal',
    description: 'Osiągnij poziom 10.',
    xpReward: 0,
    check: ({ level }) => ({ progress: level, max: 10, unlocked: level >= 10 }),
  },
  {
    id: 'xp_5000', category: 'historian',
    title: 'Weteran Bitew', iconName: 'trophy',
    description: 'Zdobądź łącznie 5000 XP.',
    xpReward: 0,
    check: ({ totalXP }) => ({ progress: totalXP, max: 5000, unlocked: totalXP >= 5000 }),
  },
];

// ── Kategorie ──────────────────────────────────────────────
const CATEGORIES: { id: CategoryId; labelKey: string; iconName: string; color: string }[] = [
  { id: 'listener',  labelKey: 'achievements.category_listener',  iconName: 'microphone', color: '#60a5fa' },
  { id: 'traveler',  labelKey: 'achievements.category_traveler',  iconName: 'map',        color: '#4ade80' },
  { id: 'collector', labelKey: 'achievements.category_collector', iconName: 'pot',        color: '#f59e0b' },
  { id: 'historian', labelKey: 'achievements.category_historian', iconName: 'bookshelf',  color: C.gold },
];

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function AchievementsScreen() {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  useFocusEffect(useCallback(() => { logScreenView('Achievements'); }, []));
  const { user, battles } = useAppStore();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');

  // Zbuduj kontekst do sprawdzania osiągnięć
  const ctx = useMemo((): AchievCtx => ({
    listenedCount:  user?.listenedBattles?.length ?? 0,
    visitedCount:   user?.visitedBattles?.length  ?? 0,
    artifactCount:  user?.unlockedArtifacts?.length ?? 0,
    completedCount: user?.completedBattles?.length ?? 0,
    streak:         user?.streak ?? 0,
    level:          user ? levelFromXP(user.totalXP).level : 1,
    totalXP:        user?.totalXP ?? 0,
    quizBattles:    user?.completedQuizzes?.length ?? 0,
    battlesTotal:   battles.length || 10, // fallback gdy bitwy jeszcze się ładują
  }), [user, battles]);

  const evaluated = useMemo(() =>
    ACHIEVEMENTS.map(a => ({
      ...a,
      result: a.check(ctx),
    })),
    [ctx]
  );

  const filtered = filter === 'all'
    ? evaluated
    : evaluated.filter(a => a.category === filter);

  const unlockedTotal = evaluated.filter(a => a.result.unlocked).length;
  const total         = ACHIEVEMENTS.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Nagłówek ────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { hapticLight(); navigation.goBack(); }}>
          <GoldIcon name="arrow-left" lib="mci" size={18} color={C.textMuted} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GoldIcon name="medal" lib="mci" size={22} color={C.textPrimary} />
            <Text style={styles.headerTitle}>{t('achievements.title')}</Text>
          </View>
          <Text style={styles.headerSub}>{t('achievements.unlocked_count', { unlocked: unlockedTotal, total })}</Text>
        </View>
        <View style={styles.progressChip}>
          <Text style={styles.progressChipText}>
            {Math.round((unlockedTotal / total) * 100)}%
          </Text>
        </View>
      </View>

      {/* ── Globalny pasek postępu ───────────────────────── */}
      <View style={styles.globalProgress}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(unlockedTotal / total) * 100}%` }]} />
        </View>
      </View>

      {/* ── Filtry kategorii ─────────────────────────────── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => { hapticLight(); setFilter('all'); }}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            {t('achievements.all')}
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterChip,
              filter === cat.id && { borderColor: `${cat.color}80`, backgroundColor: `${cat.color}15` },
            ]}
            onPress={() => { hapticLight(); setFilter(cat.id); }}
          >
            <GoldIcon name={cat.iconName} lib="mci" size={14} color={filter === cat.id ? cat.color : C.textMuted} />
            <Text style={[
              styles.filterChipText,
              filter === cat.id && { color: cat.color },
            ]}>
              {t(cat.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Lista osiągnięć ──────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES
          .filter(cat => filter === 'all' || filter === cat.id)
          .map(cat => {
            const items = evaluated.filter(a => a.category === cat.id);
            if (filter !== 'all' && items.length === 0) return null;
            return (
              <View key={cat.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <GoldIcon name={cat.iconName} lib="mci" size={18} color={cat.color} />
                  <Text style={[styles.sectionTitle, { color: cat.color }]}>{t(cat.labelKey)}</Text>
                  <Text style={styles.sectionCount}>
                    {items.filter(a => a.result.unlocked).length}/{items.length}
                  </Text>
                </View>
                {items.map(ach => (
                  <AchievementCard key={ach.id} ach={ach} catColor={cat.color} />
                ))}
              </View>
            );
          })
        }

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

// ── Karta osiągnięcia ────────────────────────────────────────
function AchievementCard({
  ach, catColor,
}: {
  ach: Achievement & { result: { progress: number; max: number; unlocked: boolean } };
  catColor: string;
}) {
  const { unlocked, progress, max } = ach.result;
  const pct = Math.min(100, Math.round((progress / max) * 100));

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!unlocked) {
      hapticLight();
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]).start();
    } else {
      hapticSelect();
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
      <Animated.View style={[
        cardStyles.card,
        unlocked && { borderColor: `${catColor}50`, backgroundColor: `${catColor}08` },
        !unlocked && cardStyles.cardLocked,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        {/* Ikona + tekst */}
        <View style={[
          cardStyles.iconBox,
          unlocked
            ? { backgroundColor: `${catColor}20`, borderColor: `${catColor}50` }
            : { backgroundColor: C.backgroundElevated, borderColor: C.borderDefault },
        ]}>
          <GoldIcon
            name={unlocked ? ach.iconName : 'lock'}
            lib="mci"
            size={24}
            color={unlocked ? catColor : C.textMuted}
            style={!unlocked ? { opacity: 0.4 } : undefined}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={cardStyles.titleRow}>
            <Text style={[cardStyles.title, unlocked && { color: C.textPrimary }]}>
              {ach.title}
            </Text>
            {unlocked && (
              <View style={[cardStyles.unlockedBadge, { backgroundColor: `${catColor}25` }]}>
                <GoldIcon name="check" lib="mci" size={11} color={catColor} />
              </View>
            )}
          </View>
          <Text style={cardStyles.desc} numberOfLines={2}>{ach.description}</Text>

          {/* Pasek postępu */}
          {!unlocked && (
            <View style={cardStyles.progressRow}>
              <View style={cardStyles.progressTrack}>
                <View style={[
                  cardStyles.progressFill,
                  { width: `${pct}%`, backgroundColor: catColor },
                ]} />
              </View>
              <Text style={cardStyles.progressText}>{progress}/{max}</Text>
            </View>
          )}
        </View>

        {/* Nagroda XP */}
        {ach.xpReward > 0 && (
          <Text style={[
            cardStyles.xpReward,
            unlocked ? { color: catColor } : { color: C.textMuted },
          ]}>
            +{ach.xpReward} XP
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: C.textMuted },
  headerTitle: { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  headerSub:   { fontSize: 13, color: C.textMuted, marginTop: 2 },
  progressChip: {
    backgroundColor: `${C.gold}15`, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: `${C.gold}35`,
  },
  progressChipText: { fontSize: 13, color: C.gold, fontWeight: '700' },

  globalProgress: { paddingHorizontal: 16, marginBottom: 12 },
  progressTrack: {
    height: 4, backgroundColor: C.backgroundElevated,
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: C.gold, borderRadius: 2 },

  filterScroll: { flexGrow: 0, marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: C.borderDefault, backgroundColor: C.backgroundElevated,
  },
  filterChipActive: { borderColor: `${C.gold}60`, backgroundColor: `${C.gold}15` },
  filterChipText:     { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: C.gold },

  scroll:        { padding: 16, gap: 20 },
  section:       { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionTitle:  { flex: 1, fontSize: 16, fontWeight: '700' },
  sectionCount:  { fontSize: 12, color: C.textMuted },
});

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    padding: 12, gap: 12,
  },
  cardLocked: { opacity: 0.65 },

  iconBox: {
    width: 48, height: 48, borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  icon:       {},
  iconLocked: {},

  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title:          { fontSize: 14, color: C.textSecondary, fontWeight: '700' },
  unlockedBadge:  { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  unlockedBadgeText: { fontSize: 11, fontWeight: '800' },

  desc: { fontSize: 12, color: C.textMuted, lineHeight: 16 },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  progressTrack: {
    flex: 1, height: 3, backgroundColor: C.backgroundShimmer,
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2, minWidth: 2 },
  progressText: { fontSize: 10, color: C.textMuted, fontFamily: 'monospace', width: 36, textAlign: 'right' },

  xpReward: { fontSize: 12, fontWeight: '700', flexShrink: 0 },
});
