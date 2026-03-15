// ============================================================
// BATTLE ECHOES — PromoteToCommanderModal.tsx
//
// Shown to guests after they complete their first battle.
// Encourages conversion to a real account by teasing:
//   • Progress sync across devices
//   • Full era unlocks
//   • Quiz results & classroom participation
//
// Trigger logic (in HomeScreen / NarrationScreen):
//   const { user } = useAppStore();
//   const shouldShow =
//     user?.isGuest &&
//     user?.hasCompletedFirstBattle &&
//     !user?.promoteDismissed;
//
// Usage:
//   <PromoteToCommanderModal
//     visible={shouldShow}
//     onDismiss={() => dismissCommanderPromotion()}
//     onSignIn={() => navigation.navigate('Login')}
//   />
// ============================================================

import React, { useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Pressable,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';

// ── Types ──────────────────────────────────────────────────
interface Props {
  visible:   boolean;
  onDismiss: () => void;
  onSignIn:  () => void;
}

// ── Feature bullet data ────────────────────────────────────
const PERKS = [
  { icon: '☁️', title: 'Synchronizacja postępów', sub: 'Twoja historia na każdym urządzeniu' },
  { icon: '🗺️', title: 'Odblokuj wszystkie epoki', sub: 'Od Starożytności po II Wojnę Światową' },
  { icon: '🏆', title: 'Rankingi i klasa', sub: 'Rywalizuj z innymi w trybie klasowym' },
  { icon: '📜', title: 'Kolekcja Artefaktów', sub: 'Zbieraj eksponaty i odznaki' },
];

// ════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════
export default function PromoteToCommanderModal({
  visible, onDismiss, onSignIn,
}: Props) {
  // ── Slide-up animation ────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const shieldAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, tension: 65, friction: 10, useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(300),
          Animated.spring(shieldAnim, {
            toValue: 1, tension: 50, friction: 6, useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      shieldAnim.setValue(0);
    }
  }, [visible]);

  const shieldScale = shieldAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.4, 1],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={{ flex: 1 }} onPress={onDismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Pull handle */}
        <View style={s.handle} />

        {/* Shield emblem */}
        <Animated.Text style={[s.shieldIcon, { transform: [{ scale: shieldScale }] }]}>
          🛡️
        </Animated.Text>

        {/* Title */}
        <Text style={s.title}>Zostań Dowódcą</Text>
        <Text style={s.subtitle}>
          Doskonały wynik w pierwszej misji! Zarejestruj się, żeby nie stracić postępów i odblokować pełen potencjał Batlle Echoes.
        </Text>

        {/* Perks list */}
        <View style={s.perksBox}>
          {PERKS.map((p, i) => (
            <View key={i} style={s.perkRow}>
              <Text style={s.perkIcon}>{p.icon}</Text>
              <View style={s.perkText}>
                <Text style={s.perkTitle}>{p.title}</Text>
                <Text style={s.perkSub}>{p.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.ctaBtn} onPress={onSignIn} activeOpacity={0.85}>
          <Text style={s.ctaBtnText}>Zarejestruj się bezpłatnie</Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity style={s.skipBtn} onPress={onDismiss} activeOpacity={0.7}>
          <Text style={s.skipText}>Może później</Text>
        </TouchableOpacity>

        {/* Bottom spacer for home indicator */}
        <View style={{ height: 12 }} />
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.goldBorder,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 20,
  },
  shieldIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.gold,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  perksBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radius.lg ?? 14,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perkIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  perkText:  { flex: 1 },
  perkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  perkSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  ctaBtn: {
    width: '100%',
    backgroundColor: Colors.gold,
    borderRadius: Radius.md ?? 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
