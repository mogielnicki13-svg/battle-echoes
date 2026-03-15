// ============================================================
// BATTLE ECHOES — PaywallModal.tsx
// Modal odblokowania zablokowanej bitwy / epoki
// Dwa warianty: kup za dukaty LUB przejdź do sklepu
// ============================================================
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions, ScrollView,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';
import { DucatIcon } from './GoldIcon';
import { useAppStore } from '../store';
import { hapticMedium, hapticSuccess, hapticError, hapticLight } from '../services/HapticsService';

const { width: SW, height: SH } = Dimensions.get('window');
const C = Colors;

// ── Typy ──────────────────────────────────────────────────
export interface PaywallConfig {
  type:       'battle' | 'era';
  id:         string;          // battleId lub eraId
  name:       string;          // Nazwa bitwy lub epoki
  icon:       string;          // Emoji ikona
  eraColor:   string;          // Kolor epoki
  coinPrice:  number;          // Cena w dukatach (0 = nie można kupić za dukaty)
  description?: string;
}

interface Props {
  visible:    boolean;
  config:     PaywallConfig | null;
  onClose:    () => void;
  onUnlocked: (id: string) => void;  // callback po odblokowaniu
  onGoToShop: () => void;
}

const BATTLE_PRICE = 150;
const ERA_PRICE    = 600;

// ════════════════════════════════════════════════════════════
// KOMPONENT
// ════════════════════════════════════════════════════════════
export default function PaywallModal({ visible, config, onClose, onUnlocked, onGoToShop }: Props) {
  const { user, awardCoins, unlockBattle, unlockEra } = useAppStore();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY          = useRef(new Animated.Value(SH)).current;
  const shakeX          = useRef(new Animated.Value(0)).current;

  const coins = user?.coins ?? 0;
  const price = config?.coinPrice ?? (config?.type === 'era' ? ERA_PRICE : BATTLE_PRICE);
  const canAfford = coins >= price;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: SH, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  -7, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   7, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleBuyWithCoins = () => {
    if (!config) return;
    hapticMedium();

    if (!canAfford) {
      hapticError();
      triggerShake();
      return;
    }

    awardCoins(-price, `Odblokowanie: ${config.name}`);

    if (config.type === 'battle') {
      unlockBattle(config.id);
    } else {
      unlockEra(config.id);
    }

    hapticSuccess();
    onUnlocked(config.id);
    onClose();
  };

  const handleGoToShop = () => {
    hapticLight();
    onClose();
    onGoToShop();
  };

  if (!config) return null;

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

        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={[styles.iconBox, { backgroundColor: `${config.eraColor}20`, borderColor: `${config.eraColor}50` }]}>
          <Text style={styles.iconText}>{config.icon}</Text>
          <View style={[styles.lockBadge, { backgroundColor: config.eraColor }]}>
            <Text style={styles.lockBadgeText}>🔒</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {config.type === 'battle' ? 'Odblokuj bitwę' : 'Odblokuj epokę'}
        </Text>
        <Text style={[styles.battleName, { color: config.eraColor }]}>{config.name}</Text>

        {config.description && (
          <Text style={styles.desc}>{config.description}</Text>
        )}

        {/* Zasoby */}
        <View style={styles.coinsRow}>
          <Text style={styles.coinsLabel}>Twoje dukaty:</Text>
          <View style={styles.coinsChip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <DucatIcon size={14} />
              <Text style={styles.coinsChipText}>{coins.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Opcje */}
        <View style={styles.options}>

          {/* Opcja 1: Kup za dukaty */}
          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                canAfford
                  ? { borderColor: `${config.eraColor}60`, backgroundColor: `${config.eraColor}12` }
                  : styles.optionBtnDisabled,
              ]}
              onPress={handleBuyWithCoins}
              activeOpacity={0.8}
            >
              <View style={styles.optionLeft}>
                <DucatIcon size={24} />
                <View>
                  <Text style={[styles.optionTitle, canAfford && { color: config.eraColor }]}>
                    {price.toLocaleString()} Dukatów
                  </Text>
                  <Text style={styles.optionSub}>
                    {canAfford
                      ? `Pozostanie: ${(coins - price).toLocaleString()} 🪙`
                      : `Brakuje: ${(price - coins).toLocaleString()} 🪙`
                    }
                  </Text>
                </View>
              </View>
              <View style={[
                styles.optionArrow,
                { backgroundColor: canAfford ? config.eraColor : C.backgroundElevated },
              ]}>
                <Text style={{ fontSize: 14, color: canAfford ? '#000' : C.textMuted }}>→</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Opcja 2: Idź do sklepu */}
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={handleGoToShop}
            activeOpacity={0.8}
          >
            <Text style={styles.shopBtnIcon}>🛒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopBtnTitle}>Zdobądź więcej Dukatów</Text>
              <Text style={styles.shopBtnSub}>Sklep · Paczki monet · Nagrody</Text>
            </View>
            <Text style={styles.shopBtnArrow}>›</Text>
          </TouchableOpacity>

          {/* Opcja 3: Pakiet pełny */}
          <TouchableOpacity
            style={styles.premiumBtn}
            onPress={handleGoToShop}
            activeOpacity={0.8}
          >
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>✨ BEST VALUE</Text>
            </View>
            <Text style={styles.premiumTitle}>Pakiet Wszystkich Epok</Text>
            <Text style={styles.premiumSub}>Odblokuj WSZYSTKIE bitwy jednorazowo · 1 500 🪙</Text>
          </TouchableOpacity>

        </View>

        {/* Zamknij */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Może później</Text>
        </TouchableOpacity>

        <View style={{ height: 12 }} />
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
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.backgroundCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
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
    marginBottom: 20,
  },

  iconBox: {
    width: 80, height: 80, borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  iconText: { fontSize: 36 },
  lockBadge: {
    position: 'absolute',
    bottom: -6, right: -6,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.backgroundCard,
  },
  lockBadgeText: { fontSize: 13 },

  title: {
    fontSize: 13, color: C.textMuted,
    fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 4,
  },
  battleName: {
    fontSize: 22, fontWeight: '800',
    textAlign: 'center', marginBottom: 6,
  },
  desc: {
    fontSize: 13, color: C.textSecondary,
    textAlign: 'center', lineHeight: 18,
    marginBottom: 12, paddingHorizontal: 8,
  },

  coinsRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 16,
  },
  coinsLabel: { fontSize: 13, color: C.textMuted },
  coinsChip: {
    backgroundColor: `${C.gold}18`, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: `${C.gold}40`,
  },
  coinsChipText: { fontSize: 14, color: C.gold, fontWeight: '700' },

  options: { width: '100%', gap: 10 },

  // Opcja: kup za dukaty
  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    padding: 14, gap: 12,
    backgroundColor: C.backgroundElevated,
  },
  optionBtnDisabled: {
    borderColor: C.borderDefault,
    backgroundColor: C.backgroundElevated,
    opacity: 0.6,
  },
  optionLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  optionIcon: { fontSize: 24 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  optionSub:   { fontSize: 12, color: C.textMuted, marginTop: 2 },
  optionArrow: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  // Opcja: sklep
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    padding: 14,
  },
  shopBtnIcon:  { fontSize: 22 },
  shopBtnTitle: { fontSize: 15, color: C.textPrimary, fontWeight: '600' },
  shopBtnSub:   { fontSize: 12, color: C.textMuted, marginTop: 2 },
  shopBtnArrow: { fontSize: 22, color: C.textMuted },

  // Opcja: pakiet premium
  premiumBtn: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: `${C.gold}45`,
    padding: 14,
    alignItems: 'center', gap: 4,
  },
  premiumBadge: {
    backgroundColor: `${C.gold}30`,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    marginBottom: 2,
  },
  premiumBadgeText: { fontSize: 10, color: C.gold, fontWeight: '800', letterSpacing: 1 },
  premiumTitle:     { fontSize: 15, color: C.gold, fontWeight: '700' },
  premiumSub:       { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  closeBtn: {
    marginTop: 14, paddingVertical: 8, paddingHorizontal: 24,
  },
  closeBtnText: { fontSize: 14, color: C.textMuted },
});
