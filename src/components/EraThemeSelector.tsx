// ============================================================
// BATTLE ECHOES — EraThemeSelector.tsx
// Ekran wyboru motywu epoki — pełnoekranowy picker
// ============================================================
// UŻYCIE w navigation:
//   navigation.navigate('EraThemeSelector')
// lub jako modal:
//   <EraThemeSelector visible onClose={() => setVisible(false)} />
// ============================================================

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Animated, Modal,
} from 'react-native';
import { ERA_THEMES, BaseColors, Radius, EraTheme, EraId } from '../constants/theme';
import { useEraTheme } from '../hooks/EraThemeContext';
import { SmokeBackgroundCard } from './SmokeBackground';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 32;

// ── Karta pojedynczej epoki ───────────────────────────────────
function EraCard({
  era,
  isSelected,
  onSelect,
  index,
}: {
  era: EraTheme;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const scaleAnim  = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 80,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        delay: index * 80,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSelected]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.06)', era.primaryBorder],
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <Animated.View style={[
      styles.eraCardWrap,
      { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
    ]}>
      <TouchableOpacity onPress={onSelect} activeOpacity={0.8}>
        <Animated.View style={[
          styles.eraCard,
          { borderColor, shadowColor: era.primary, shadowOpacity },
        ]}>
          {/* Dym w tle karty */}
          <SmokeBackgroundCard
            color={`${era.primary}08`}
            sparkColor={era.sparkColor || era.primary}
            intensity={isSelected ? 0.8 : 0.4}
          />

          {/* Gradient tła karty */}
          <View style={[styles.eraCardBg, { backgroundColor: era.cardGradient[0] }]} />

          {/* Zawartość */}
          <View style={styles.eraCardContent}>
            <View style={styles.eraCardLeft}>
              <Text style={styles.eraIcon}>{era.icon}</Text>
              <View>
                <Text style={[styles.eraName, isSelected && { color: era.primary }]}>
                  {era.name}
                </Text>
                <Text style={styles.eraDate}>
                  {era.dateRange[0] < 0
                    ? `${Math.abs(era.dateRange[0])} p.n.e. – ${era.dateRange[1]} n.e.`
                    : `${era.dateRange[0]} – ${era.dateRange[1]}`
                  }
                </Text>
                <Text style={styles.eraAtmosphere}>{era.atmosphere}</Text>
              </View>
            </View>

            <View style={styles.eraCardRight}>
              {/* Wskaźnik wybrania */}
              <View style={[
                styles.selectDot,
                isSelected && { backgroundColor: era.primary, borderColor: era.primary },
              ]}>
                {isSelected && <View style={[styles.selectDotInner, { backgroundColor: era.primary }]} />}
              </View>

              {/* Badge dźwięku */}
              {era.ambientSound && (
                <View style={[styles.soundBadge, { borderColor: `${era.primary}40` }]}>
                  <Text style={[styles.soundBadgeText, { color: era.primary }]}>♪ Ambient</Text>
                </View>
              )}
            </View>
          </View>

          {/* Pasek koloru na dole */}
          <View style={[styles.eraColorBar, { backgroundColor: era.primary, opacity: isSelected ? 0.8 : 0.2 }]} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
interface EraThemeSelectorProps {
  visible?:  boolean;
  onClose?:  () => void;
  asScreen?: boolean;  // używaj jako osobny ekran (bez modala)
}

export default function EraThemeSelector({
  visible = true,
  onClose,
  asScreen = false,
}: EraThemeSelectorProps) {
  const { currentEra, setEra, theme } = useEraTheme();
  const [preview, setPreview] = useState<EraId>(currentEra);

  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(titleAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleSelect = (eraId: EraId) => {
    setPreview(eraId);
    setEra(eraId);
    setTimeout(() => onClose?.(), 400);
  };

  const content = (
    <View style={styles.container}>
      {/* Nagłówek */}
      <Animated.View style={[styles.header, {
        opacity: titleAnim,
        transform: [{ translateY: titleAnim.interpolate({ inputRange: [0,1], outputRange: [-20, 0] }) }],
      }]}>
        <View style={styles.headerTop}>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerTitle}>MOTYW EPOKI</Text>
        <Text style={styles.headerSub}>
          Wybierz epokę — zmieni się wygląd aplikacji i dźwięki tła
        </Text>
        <View style={[styles.headerAccent, { backgroundColor: theme.primary }]} />
      </Animated.View>

      {/* Lista epok */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {Object.values(ERA_THEMES).map((era, index) => (
          <EraCard
            key={era.id}
            era={era}
            isSelected={currentEra === era.id}
            onSelect={() => handleSelect(era.id as EraId)}
            index={index}
          />
        ))}

        {/* Info na dole */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✦ Motyw zmienia kolory, tło i dźwięki interfejsu{'\n'}
            ✦ Narracje audio są dostępne we wszystkich motywach{'\n'}
            ✦ Możesz zmienić motyw w dowolnej chwili
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  if (asScreen) return content;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        {content}
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = BaseColors;

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  container: {
    flex: 1,
    backgroundColor: C.background,
  },

  // Nagłówek
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.borderDefault,
  },
  closeBtnText: { fontSize: 14, color: C.textMuted },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 4,
  },
  headerSub: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 20,
  },
  headerAccent: {
    height: 2,
    width: 60,
    borderRadius: 1,
    marginTop: 8,
    opacity: 0.8,
  },

  // Lista
  list: {
    padding: 16,
    gap: 12,
  },

  // Karta epoki
  eraCardWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  eraCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  eraCardBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.95,
  },
  eraCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
    zIndex: 1,
  },
  eraCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  eraCardRight: {
    alignItems: 'center',
    gap: 8,
  },
  eraIcon: { fontSize: 36 },
  eraName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 2,
  },
  eraDate: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 3,
  },
  eraAtmosphere: {
    fontSize: 11,
    color: C.textSecondary,
    fontStyle: 'italic',
  },
  selectDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.borderDefault,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  selectDotInner: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.background,
  },
  soundBadge: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  soundBadgeText: { fontSize: 9, fontWeight: '700' },

  eraColorBar: {
    height: 3,
    width: '100%',
  },

  // Info
  infoBox: {
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: C.goldBorder,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 22,
  },
});
