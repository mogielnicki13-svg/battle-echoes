// ============================================================
// BATTLE ECHOES — DailyRewardModal.tsx
// 7-dniowy kalendarz nagród za serię logowań
// Pokazuje aktualne miejsce w serii + animację odbioru
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import { hapticSuccess, hapticMedium, hapticLight } from '../services/HapticsService';

const { height: SH } = Dimensions.get('window');
const C = Colors;

// ── Nagrody za każdy dzień serii ─────────────────────────
interface DayReward {
  day:    number;
  icon:   string;
  label:  string;
  xp:     number;
  coins:  number;
  isSpecial: boolean;
}

const DAY_REWARDS: DayReward[] = [
  { day: 1, icon: '🪙',  label: '20 Dukatów',   xp: 50,  coins: 20,  isSpecial: false },
  { day: 2, icon: '⭐',  label: '+75 XP',         xp: 75,  coins: 0,   isSpecial: false },
  { day: 3, icon: '🪙',  label: '50 Dukatów',   xp: 75,  coins: 50,  isSpecial: false },
  { day: 4, icon: '🔥',  label: '+150 XP',        xp: 150, coins: 20,  isSpecial: false },
  { day: 5, icon: '🪙',  label: '100 Dukatów',  xp: 100, coins: 100, isSpecial: false },
  { day: 6, icon: '💎',  label: '+250 XP',        xp: 250, coins: 50,  isSpecial: false },
  { day: 7, icon: '🏆',  label: '300 Dukatów\n+ 500 XP', xp: 500, coins: 300, isSpecial: true },
];

// ── Typy ──────────────────────────────────────────────────
interface Props {
  visible:     boolean;
  onClose:     () => void;
  /** Aktualny dzień serii (1–7+). 0 = nowa seria. */
  streakDay:   number;
  /** Czy nagroda za dziś była już odebrana */
  alreadyClaimed: boolean;
}

// ════════════════════════════════════════════════════════════
// KOMPONENT
// ════════════════════════════════════════════════════════════
export default function DailyRewardModal({ visible, onClose, streakDay, alreadyClaimed }: Props) {
  const { awardXP, awardCoins, checkDailyStreak } = useAppStore();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY          = useRef(new Animated.Value(SH)).current;

  // Particle animacje (gwiazdki wylatujące po odebraniu nagrody)
  const particles = useRef(
    Array.from({ length: 8 }, () => ({
      x:     new Animated.Value(0),
      y:     new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [claiming, setClaiming] = useState(false);

  // Sync gdy props się zmieni
  useEffect(() => { setClaimed(alreadyClaimed); }, [alreadyClaimed]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: SH, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Oblicz dzisiejszy dzień nagrody (1–7, wrap around)
  const todayIndex = ((streakDay - 1) % 7);
  const todayReward = DAY_REWARDS[todayIndex] ?? DAY_REWARDS[0];

  const burstParticles = () => {
    const anims = particles.map((p, i) => {
      const angle = (i / particles.length) * 2 * Math.PI;
      const dist  = 80 + Math.random() * 40;
      p.x.setValue(0);
      p.y.setValue(0);
      p.scale.setValue(0);
      p.opacity.setValue(1);
      return Animated.parallel([
        Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: 500, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: Math.sin(angle) * dist - 30, duration: 500, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(p.scale, { toValue: 1.2, tension: 200, friction: 8, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: 250, delay: 200, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 450, delay: 200, useNativeDriver: true }),
      ]);
    });
    Animated.stagger(30, anims).start();
  };

  const handleClaim = async () => {
    if (claimed || claiming) return;
    setClaiming(true);
    hapticSuccess();

    // Uruchom checkDailyStreak (które też przyznaje XP za serię)
    checkDailyStreak();
    // Przyznaj dodatkowe nagrody z harmonogramu
    if (todayReward.xp   > 0) awardXP(todayReward.xp,     `Dzienna nagroda — Dzień ${todayReward.day}`);
    if (todayReward.coins > 0) awardCoins(todayReward.coins, `Dzienna nagroda — Dzień ${todayReward.day}`);

    burstParticles();
    setClaimed(true);
    setClaiming(false);
  };

  const PARTICLE_ICONS = ['🪙', '⭐', '✨', '🔥', '💛', '⚡', '🏅', '💎'];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>

        <View style={styles.handle} />

        {/* Tytuł */}
        <Text style={styles.title}>🔥 Dzienna Nagroda</Text>
        <Text style={styles.subtitle}>
          Seria: <Text style={styles.streakNum}>{Math.max(1, streakDay)} {streakDay === 1 ? 'dzień' : 'dni'}</Text>
        </Text>

        {/* Kalendarz 7 dni */}
        <View style={styles.calendar}>
          {DAY_REWARDS.map((reward, i) => {
            const dayNum     = i + 1;
            const isPast     = streakDay > dayNum;
            const isToday    = todayIndex === i;
            const isFuture   = !isPast && !isToday;

            return (
              <View
                key={dayNum}
                style={[
                  styles.dayCell,
                  isPast   && styles.dayCellPast,
                  isToday  && [styles.dayCellToday, claimed && styles.dayCellClaimed],
                  isFuture && styles.dayCellFuture,
                  reward.isSpecial && styles.dayCellSpecial,
                ]}
              >
                {isPast && (
                  <Text style={styles.dayCellCheck}>✓</Text>
                )}
                <Text style={[styles.dayCellIcon, isFuture && { opacity: 0.35 }]}>
                  {reward.icon}
                </Text>
                <Text style={[styles.dayCellNum, isFuture && { color: C.textMuted }]}>
                  {dayNum === 7 ? '7🔥' : `${dayNum}`}
                </Text>
                {isToday && (
                  <View style={styles.todayDot} />
                )}
              </View>
            );
          })}
        </View>

        {/* Dzisiejsza nagroda — duży kafelek */}
        <View style={[styles.todayBox, claimed && styles.todayBoxClaimed]}>
          {/* Particle emitters */}
          <View style={styles.particleContainer} pointerEvents="none">
            {particles.map((p, i) => (
              <Animated.Text
                key={i}
                style={[styles.particle, {
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                    { scale: p.scale },
                  ],
                  opacity: p.opacity,
                }]}
              >
                {PARTICLE_ICONS[i % PARTICLE_ICONS.length]}
              </Animated.Text>
            ))}
          </View>

          <Text style={styles.todayBoxDay}>DZIŚ — DZIEŃ {todayIndex + 1}</Text>
          <Text style={styles.todayBoxIcon}>{todayReward.icon}</Text>
          <Text style={styles.todayBoxLabel}>{todayReward.label}</Text>
          {(todayReward.xp > 0 || todayReward.coins > 0) && (
            <Text style={styles.todayBoxDetail}>
              {[
                todayReward.xp    > 0 && `+${todayReward.xp} XP`,
                todayReward.coins > 0 && `+${todayReward.coins} 🪙`,
              ].filter(Boolean).join('  ·  ')}
            </Text>
          )}
          {todayReward.isSpecial && (
            <View style={styles.specialBadge}>
              <Text style={styles.specialBadgeText}>🏆 NAGRODA TYGODNIOWA</Text>
            </View>
          )}
        </View>

        {/* CTA */}
        {claimed ? (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedBadgeText}>✅ Nagroda odebrana — wróć jutro!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.claimBtn, claiming && { opacity: 0.7 }]}
            onPress={handleClaim}
            activeOpacity={0.85}
            disabled={claiming}
          >
            <Text style={styles.claimBtnText}>
              🎁 Odbierz dzisiejszą nagrodę
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Zamknij</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </Animated.View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.80)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.backgroundCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: C.borderDefault,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },

  handle: {
    width: 40, height: 4,
    backgroundColor: C.backgroundElevated,
    borderRadius: 2,
    marginBottom: 16,
  },

  title:    { fontSize: 24, color: C.textPrimary, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.textMuted, marginBottom: 20 },
  streakNum: { color: '#f97316', fontWeight: '800' },

  // Kalendarz
  calendar: {
    flexDirection: 'row', gap: 6,
    marginBottom: 20,
    flexWrap: 'nowrap',
  },
  dayCell: {
    width: 42, height: 58,
    borderRadius: 10,
    backgroundColor: C.backgroundElevated,
    borderWidth: 1, borderColor: C.borderDefault,
    alignItems: 'center', justifyContent: 'center',
    gap: 2,
    position: 'relative',
    overflow: 'visible',
  },
  dayCellPast: {
    backgroundColor: 'rgba(74,222,128,0.10)',
    borderColor: 'rgba(74,222,128,0.35)',
  },
  dayCellToday: {
    backgroundColor: `${C.gold}18`,
    borderColor: `${C.gold}60`,
    borderWidth: 2,
  },
  dayCellClaimed: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderColor: 'rgba(74,222,128,0.50)',
  },
  dayCellFuture: { opacity: 0.5 },
  dayCellSpecial: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251,191,36,0.10)',
  },
  dayCellCheck: {
    position: 'absolute', top: 3, right: 5,
    fontSize: 9, color: '#4ade80', fontWeight: '900',
  },
  dayCellIcon:  { fontSize: 18 },
  dayCellNum:   { fontSize: 10, color: C.textSecondary, fontWeight: '700' },
  todayDot: {
    position: 'absolute', bottom: 4,
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: C.gold,
  },

  // Duży kafelek dzisiejszy
  todayBox: {
    width: '100%',
    backgroundColor: `${C.gold}10`,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: `${C.gold}45`,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  todayBoxClaimed: {
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderColor: 'rgba(74,222,128,0.40)',
  },

  particleContainer: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: 0, height: 0,
    zIndex: 10,
  },
  particle: { position: 'absolute', fontSize: 18 },

  todayBoxDay:   { fontSize: 10, color: C.textMuted, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  todayBoxIcon:  { fontSize: 48, lineHeight: 56 },
  todayBoxLabel: { fontSize: 18, color: C.textPrimary, fontWeight: '800', textAlign: 'center' },
  todayBoxDetail: { fontSize: 13, color: C.textMuted, marginTop: 2 },

  specialBadge: {
    backgroundColor: 'rgba(251,191,36,0.25)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.50)',
    marginTop: 4,
  },
  specialBadgeText: { fontSize: 11, color: '#fbbf24', fontWeight: '800' },

  // CTA
  claimBtn: {
    width: '100%',
    backgroundColor: C.gold,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  claimBtnText: { fontSize: 16, color: '#000', fontWeight: '800' },

  claimedBadge: {
    width: '100%',
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.40)',
  },
  claimedBadgeText: { fontSize: 14, color: '#4ade80', fontWeight: '700' },

  closeBtn: { paddingVertical: 8, paddingHorizontal: 24 },
  closeBtnText: { fontSize: 14, color: C.textMuted },
});
