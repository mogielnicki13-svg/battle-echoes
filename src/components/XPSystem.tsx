// ============================================================
// BATTLE ECHOES — XPSystem.tsx
// Animowane komponenty XP i Dukatów
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  Modal, TouchableOpacity,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';
import { hapticSuccess } from '../services/HapticsService';

const { width: SW, height: SH } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════
// 1. FLOATING REWARD — latający "+100 XP" lub "+50 🪙"
// ════════════════════════════════════════════════════════════
interface FloatingRewardProps {
  value: string;       // np. "+100 XP" lub "+50 🪙"
  color?: string;
  x?: number;          // pozycja X (domyślnie środek)
  y?: number;          // pozycja Y (domyślnie środek)
  onDone?: () => void;
}

export function FloatingReward({ value, color = Colors.gold, x, y, onDone }: FloatingRewardProps) {
  const posY    = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale   = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, tension: 200 }),
        Animated.timing(scale,  { toValue: 1,  useNativeDriver: true, duration: 100 }),
      ]),
      Animated.timing(posY, {
        toValue: -120, duration: 1800,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(opacity, {
          toValue: 0, duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onDone?.());
  }, []);

  return (
    <Animated.View style={[
      styles.floatingReward,
      {
        left: (x || SW / 2) - 60,
        top:  (y || SH / 2) - 20,
        opacity,
        transform: [{ translateY: posY }, { scale }],
        borderColor: `${color}50`,
      },
    ]}>
      <Text style={[styles.floatingText, { color }]}>{value}</Text>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// 2. XP PROGRESS BAR — animowany pasek XP
// ════════════════════════════════════════════════════════════
interface XPBarProps {
  currentXP:  number;
  xpToNext:   number;
  level:      number;
  animated?:  boolean;
}

export function XPBar({ currentXP, xpToNext, level, animated = true }: XPBarProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const pct      = Math.min(currentXP / xpToNext, 1);

  useEffect(() => {
    if (animated) {
      Animated.timing(progress, {
        toValue: pct, duration: 1000,
        useNativeDriver: false,
      }).start();
    } else {
      progress.setValue(pct);
    }
  }, [currentXP, xpToNext]);

  return (
    <View style={styles.xpBarContainer}>
      <View style={styles.xpBarHeader}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>Poz. {level}</Text>
        </View>
        <Text style={styles.xpText}>{currentXP} / {xpToNext} XP</Text>
      </View>
      <View style={styles.xpTrack}>
        <Animated.View style={[
          styles.xpFill,
          {
            width: progress.interpolate({
              inputRange:  [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}>
          {/* Shimmer effect */}
          <View style={styles.xpShimmer} />
        </Animated.View>
      </View>
      <Text style={styles.xpNextLabel}>
        Do poziomu {level + 1}: {xpToNext - currentXP} XP
      </Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// 3. COIN COUNTER — licznik dukatów z animacją
// ════════════════════════════════════════════════════════════
interface CoinCounterProps {
  coins:    number;
  prevCoins?: number;
  size?:    'small' | 'large';
}

export function CoinCounter({ coins, prevCoins, size = 'small' }: CoinCounterProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isLarge   = size === 'large';

  useEffect(() => {
    if (prevCoins !== undefined && coins !== prevCoins) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.3, useNativeDriver: true, tension: 300 }),
        Animated.spring(scaleAnim, { toValue: 1,   useNativeDriver: true, tension: 200 }),
      ]).start();
    }
  }, [coins]);

  return (
    <Animated.View style={[
      styles.coinCounter,
      isLarge && styles.coinCounterLarge,
      { transform: [{ scale: scaleAnim }] },
    ]}>
      <Text style={[styles.coinIcon, isLarge && styles.coinIconLarge]}>🪙</Text>
      <Text style={[styles.coinValue, isLarge && styles.coinValueLarge]}>
        {coins.toLocaleString()}
      </Text>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// 4. LEVEL UP MODAL — pełny ekran awansu
// ════════════════════════════════════════════════════════════
interface LevelUpModalProps {
  visible:   boolean;
  newLevel:  number;
  rewards:   { xp?: number; coins?: number; unlocks?: string[] };
  onClose:   () => void;
}

export function LevelUpModal({ visible, newLevel, rewards, onClose }: LevelUpModalProps) {
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const starsAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      hapticSuccess();
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1, useNativeDriver: true,
          tension: 60, friction: 8,
        }),
        Animated.timing(glowAnim, {
          toValue: 1, duration: 600, useNativeDriver: true,
        }),
        Animated.timing(starsAnim, {
          toValue: 1, duration: 800, useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      glowAnim.setValue(0);
      starsAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        {/* Particle stars */}
        {[...Array(12)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left:  Math.random() * SW,
                top:   Math.random() * SH,
                opacity: starsAnim,
                transform: [{
                  scale: starsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.random() * 1.5 + 0.5],
                  }),
                }],
              },
            ]}
          >
            <Text style={styles.starText}>
              {['⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 4)]}
            </Text>
          </Animated.View>
        ))}

        {/* Główna karta */}
        <Animated.View style={[
          styles.levelUpCard,
          { transform: [{ scale: scaleAnim }] },
        ]}>
          {/* Glow ring */}
          <Animated.View style={[
            styles.levelGlow,
            { opacity: glowAnim },
          ]} />

          {/* Treść */}
          <Text style={styles.levelUpTitle}>AWANS!</Text>

          <View style={styles.levelCircle}>
            <Text style={styles.levelCircleNum}>{newLevel}</Text>
          </View>

          <Text style={styles.levelUpSub}>Osiągnąłeś poziom {newLevel}</Text>

          {/* Nagrody */}
          <View style={styles.rewardsBox}>
            {rewards.coins && (
              <View style={styles.rewardRow}>
                <Text style={styles.rewardIcon}>🪙</Text>
                <Text style={styles.rewardText}>+{rewards.coins} Dukatów</Text>
              </View>
            )}
            {rewards.unlocks?.map((unlock, i) => (
              <View key={i} style={styles.rewardRow}>
                <Text style={styles.rewardIcon}>🔓</Text>
                <Text style={styles.rewardText}>{unlock}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.levelUpBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.levelUpBtnText}>Kontynuuj ⚔</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// 5. REWARD TOAST — mały toast na górze ekranu
// ════════════════════════════════════════════════════════════
interface RewardToastProps {
  visible:  boolean;
  icon:     string;
  title:    string;
  subtitle: string;
  color?:   string;
}

export function RewardToast({ visible, icon, title, subtitle, color = Colors.gold }: RewardToastProps) {
  const slideY  = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      hapticSuccess();
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // Auto-ukryj po 3s
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideY, { toValue: -80, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 3000);
    }
  }, [visible]);

  return (
    <Animated.View style={[
      styles.toast,
      { transform: [{ translateY: slideY }], opacity, borderLeftColor: color },
    ]}>
      <Text style={styles.toastIcon}>{icon}</Text>
      <View>
        <Text style={[styles.toastTitle, { color }]}>{title}</Text>
        <Text style={styles.toastSub}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // Floating reward
  floatingReward: {
    position: 'absolute', zIndex: 9999,
    backgroundColor: 'rgba(13,21,32,0.95)',
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 6,
    width: 120, alignItems: 'center',
  },
  floatingText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // XP Bar
  xpBarContainer: { gap: 6 },
  xpBarHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelBadge: {
    backgroundColor: Colors.goldLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  levelBadgeText: { fontSize: 12, color: Colors.gold, fontWeight: '700' },
  xpText:         { fontSize: 12, color: Colors.textMuted },
  xpTrack:        { height: 8, backgroundColor: Colors.backgroundElevated, borderRadius: 4, overflow: 'hidden' },
  xpFill: {
    height: 8, borderRadius: 4,
    backgroundColor: Colors.gold,
    position: 'relative', overflow: 'hidden',
  },
  xpShimmer: {
    position: 'absolute', top: 0, bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  xpNextLabel: { fontSize: 11, color: Colors.textMuted },

  // Coin counter
  coinCounter: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.backgroundCard, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  coinCounterLarge: { paddingHorizontal: 16, paddingVertical: 10 },
  coinIcon:         { fontSize: 14 },
  coinIconLarge:    { fontSize: 24 },
  coinValue:        { fontSize: 14, color: Colors.gold, fontWeight: '700' },
  coinValueLarge:   { fontSize: 28, color: Colors.gold, fontWeight: '800' },

  // Level up modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  star:     { position: 'absolute' },
  starText: { fontSize: 20 },

  levelUpCard: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 24, padding: 32, alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: Colors.borderGold,
    width: SW * 0.85,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 30, elevation: 20,
  },
  levelGlow: {
    position: 'absolute', width: '130%', height: '130%',
    borderRadius: 40, backgroundColor: 'rgba(212,160,23,0.08)',
  },

  levelUpTitle: {
    fontSize: 14, color: Colors.gold, fontWeight: '900',
    letterSpacing: 6,
  },
  levelCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.goldLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.gold,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 20, elevation: 10,
  },
  levelCircleNum: { fontSize: 48, color: Colors.gold, fontWeight: '900' },
  levelUpSub:     { fontSize: 16, color: Colors.textSecondary },

  rewardsBox: {
    backgroundColor: Colors.backgroundCard, borderRadius: 12,
    padding: 14, gap: 8, width: '100%',
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardIcon:{ fontSize: 18 },
  rewardText:{ fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },

  levelUpBtn: {
    backgroundColor: Colors.gold, borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 14, width: '100%', alignItems: 'center',
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  levelUpBtnText: { fontSize: 16, color: Colors.ink, fontWeight: '800' },

  // Toast
  toast: {
    position: 'absolute', top: 52, left: 16, right: 16, zIndex: 9998,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.borderDefault,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  toastIcon:  { fontSize: 28 },
  toastTitle: { fontSize: 14, fontWeight: '700' },
  toastSub:   { fontSize: 12, color: Colors.textMuted },
});
