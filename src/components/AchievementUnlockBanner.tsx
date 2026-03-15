// ============================================================
// BATTLE ECHOES — AchievementUnlockBanner.tsx
// Globalny banner wyświetlany po odblokowaniu osiągnięcia.
// Wysuwa się od dołu ekranu, auto-znika po 4s, można zamknąć tapem.
// ============================================================
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import { Colors, Radius } from '../constants/theme';
import { hapticSelect } from '../services/HapticsService';

const C = Colors;
const AUTO_DISMISS_MS = 4000;
const TAB_BAR_HEIGHT  = 60; // musi być zgodny z navigation/index.tsx

// ── Metadane osiągnięć do wyświetlenia w bannerze ──────────
const ACHIEVEMENT_META: Record<string, {
  icon: string; title: string; xp: number; color: string;
}> = {
  first_listen:     { icon: '🎙', title: 'Pierwsza Narracja',      xp: 50,  color: '#60a5fa' },
  five_listens:     { icon: '🎧', title: 'Gorliwy Słuchacz',       xp: 150, color: '#60a5fa' },
  all_listens:      { icon: '📻', title: 'Archiwista Dźwięku',     xp: 400, color: '#60a5fa' },
  streak_7:         { icon: '🔥', title: 'Tygodniowa Seria',       xp: 200, color: '#60a5fa' },
  first_gps:        { icon: '📍', title: 'Pierwsza Wizyta',        xp: 100, color: '#4ade80' },
  three_gps:        { icon: '🚶', title: 'Pielgrzym Historii',     xp: 300, color: '#4ade80' },
  five_gps:         { icon: '🗺', title: 'Żołnierz Terenowy',      xp: 500, color: '#4ade80' },
  all_eras:         { icon: '⏳', title: 'Podróżnik Czasu',        xp: 600, color: '#4ade80' },
  first_artifact:   { icon: '🏺', title: 'Odkrywca Artefaktów',    xp: 75,  color: '#f59e0b' },
  five_artifacts:   { icon: '🖼', title: 'Muzealnik',              xp: 250, color: '#f59e0b' },
  ten_artifacts:    { icon: '🏛', title: 'Kustosz Muzeum',         xp: 500, color: '#f59e0b' },
  all_perspectives: { icon: '👁', title: 'Wszystkie Perspektywy',  xp: 200, color: '#f59e0b' },
  first_quiz:       { icon: '📚', title: 'Student Historii',       xp: 100, color: C.gold },
  three_quizzes:    { icon: '🧠', title: 'Erudyta',                xp: 300, color: C.gold },
  level_10:         { icon: '🎖', title: 'Generał',                xp: 0,   color: C.gold },
  xp_5000:          { icon: '🏆', title: 'Weteran Bitew',          xp: 0,   color: C.gold },
};

// ════════════════════════════════════════════════════════════
export default function AchievementUnlockBanner() {
  const { pendingUnlocks, dismissAchievementUnlock } = useAppStore();
  const insets    = useSafeAreaInsets();
  const currentId = pendingUnlocks[0];
  const meta      = currentId ? ACHIEVEMENT_META[currentId] : null;

  const slideY   = useRef(new Animated.Value(160)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!meta) return;

    // Reset position before sliding in
    slideY.setValue(160);
    opacity.setValue(0);

    // Slide in + fade in
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 5 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    timerRef.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 160, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0,   duration: 220, useNativeDriver: true }),
    ]).start(() => dismissAchievementUnlock());
  };

  if (!meta) return null;

  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom + 12;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { bottom: bottomOffset, opacity, transform: [{ translateY: slideY }] },
      ]}
    >
      <TouchableOpacity
        style={[styles.banner, { borderColor: `${meta.color}45` }]}
        onPress={() => { hapticSelect(); dismiss(); }}
        activeOpacity={0.88}
      >
        {/* Lewa złota kreska */}
        <View style={[styles.accent, { backgroundColor: meta.color }]} />

        {/* Ikona */}
        <View style={[styles.iconBox, {
          backgroundColor: `${meta.color}22`,
          borderColor: `${meta.color}55`,
        }]}>
          <Text style={styles.icon}>{meta.icon}</Text>
        </View>

        {/* Tekst */}
        <View style={styles.textArea}>
          <Text style={styles.label}>🏅 Osiągnięcie odblokowane!</Text>
          <Text style={styles.title} numberOfLines={1}>{meta.title}</Text>
        </View>

        {/* Nagroda XP */}
        {meta.xp > 0 && (
          <View style={[styles.xpBadge, { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}45` }]}>
            <Text style={[styles.xpText, { color: meta.color }]}>+{meta.xp} XP</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16, right: 16,
    zIndex: 9999,
    // shadow
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111118',
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 10,
    paddingRight: 12,
    paddingVertical: 10,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  iconBox: {
    width: 44, height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 22 },
  textArea: { flex: 1, gap: 2 },
  label: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  title: { fontSize: 15, color: C.textPrimary, fontWeight: '700' },
  xpBadge: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0,
  },
  xpText: { fontSize: 12, fontWeight: '800' },
});
