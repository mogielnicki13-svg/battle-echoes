// ============================================================
// BATTLE ECHOES — RecruitPackCard.tsx
//
// Time-limited "Recruit Pack" promotional card for the
// Quartermaster (Shop) screen.
//
// Shown for 48 hours from the user's first app launch.
// Displays a live HH:MM:SS countdown and lists what's included.
//
// Usage (in ShopScreen):
//   import RecruitPackCard from '../components/RecruitPackCard';
//
//   const { active } = useRecruitPackTimer();
//   {active && (
//     <RecruitPackCard
//       onClaim={() => { /* e.g. navigation to IAP or sign-up */ }}
//     />
//   )}
// ============================================================

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';
import { useRecruitPackTimer } from '../hooks/useRecruitPackTimer';

// ── Pack contents ──────────────────────────────────────────
const PACK_ITEMS = [
  { icon: '🗺️', text: 'Dostęp do epoki: Starożytność (bezpłatna)' },
  { icon: '⚔️', text: '3 bitwy odblokowane na 7 dni' },
  { icon: '🪙', text: '+200 Dukatów startowych' },
  { icon: '📜', text: '2 ekskluzywne Artefakty Rekruta' },
];

// ── Props ──────────────────────────────────────────────────
interface Props {
  onClaim: () => void;
}

// ════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════
export default function RecruitPackCard({ onClaim }: Props) {
  const { active, label, hoursLeft } = useRecruitPackTimer();

  // Pulse animation on the countdown timer when < 2 hours left
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const urgent = hoursLeft < 2;

  useEffect(() => {
    if (!urgent) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.00, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [urgent]);

  if (!active) return null;

  return (
    <View style={s.card}>
      {/* Header row */}
      <View style={s.header}>
        <View style={s.badgeRow}>
          <View style={s.badge}>
            <Text style={s.badgeText}>OGRANICZONA OFERTA</Text>
          </View>
          <Text style={s.headerTitle}>Pakiet Rekruta</Text>
        </View>

        {/* Countdown */}
        <View style={s.countdownBox}>
          <Text style={s.countdownLabel}>Pozostało</Text>
          <Animated.Text
            style={[
              s.countdownText,
              urgent && { color: '#ef4444' },
              urgent && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {label}
          </Animated.Text>
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Items */}
      <View style={s.itemList}>
        {PACK_ITEMS.map((item, i) => (
          <View key={i} style={s.itemRow}>
            <Text style={s.itemIcon}>{item.icon}</Text>
            <Text style={s.itemText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={s.claimBtn} onPress={onClaim} activeOpacity={0.85}>
        <Text style={s.claimBtnText}>Odbierz Pakiet Rekruta →</Text>
      </TouchableOpacity>

      {/* Fine print */}
      <Text style={s.finePrint}>
        Oferta dostępna przez 48h od pierwszego uruchomienia. Nie wymaga zakupu.
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────
const ACCENT = '#F0A030';  // Recruit pack amber — distinct from normal gold

const s = StyleSheet.create({
  card: {
    backgroundColor: '#130C00',
    borderRadius: Radius.xl ?? 20,
    borderWidth: 1,
    borderColor: 'rgba(240,160,48,0.45)',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    // Glow effect via shadow
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badgeRow: {
    flex: 1,
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 0.5,
  },
  countdownBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(240,160,48,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(240,160,48,0.25)',
    minWidth: 96,
  },
  countdownLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  countdownText: {
    fontSize: 20,
    fontWeight: '800',
    color: ACCENT,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(240,160,48,0.15)',
    marginBottom: 14,
  },
  itemList: {
    gap: 10,
    marginBottom: 18,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  claimBtn: {
    backgroundColor: ACCENT,
    borderRadius: Radius.md ?? 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  claimBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.3,
  },
  finePrint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
