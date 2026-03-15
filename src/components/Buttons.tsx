// ============================================================
// BATTLE ECHOES — Buttons.tsx
// Spójny system przycisków — jeden styl dla całej aplikacji
// ============================================================
// UŻYCIE:
//   <GoldButton label="Otwórz bitwę" onPress={...} />
//   <GoldButton label="Zablokowane" variant="ghost" icon="🔒" />
//   <GoldButton label="Pobierz" variant="outline" loading />
//   <IconButton icon="▶" onPress={...} />
//   <EraButton era={theme} label="Wybierz" onPress={...} />
// ============================================================

import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity, Text, View, StyleSheet,
  Animated, ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { BaseColors, Radius } from '../constants/theme';
import { useEraTheme } from '../hooks/EraThemeContext';

const C = BaseColors;

// ════════════════════════════════════════════════════════════
// GOLD BUTTON — główny przycisk akcji
// ════════════════════════════════════════════════════════════
interface GoldButtonProps {
  label:     string;
  onPress:   () => void;
  variant?:  'solid' | 'outline' | 'ghost' | 'danger';
  size?:     'sm' | 'md' | 'lg';
  icon?:     string;
  iconRight?: string;
  loading?:  boolean;
  disabled?: boolean;
  style?:    ViewStyle;
  fullWidth?: boolean;
}

export function GoldButton({
  label,
  onPress,
  variant  = 'solid',
  size     = 'md',
  icon,
  iconRight,
  loading  = false,
  disabled = false,
  style,
  fullWidth = false,
}: GoldButtonProps) {
  const { theme } = useEraTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 200 }),
      Animated.timing(glowAnim,  { toValue: 1, duration: 100, useNativeDriver: false }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200 }),
      Animated.timing(glowAnim,  { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const sizeStyles = {
    sm: { paddingHorizontal: 14, paddingVertical: 8,  fontSize: 12, iconSize: 14, gap: 6,  borderRadius: Radius.sm },
    md: { paddingHorizontal: 20, paddingVertical: 12, fontSize: 14, iconSize: 16, gap: 8,  borderRadius: Radius.md },
    lg: { paddingHorizontal: 28, paddingVertical: 16, fontSize: 16, iconSize: 20, gap: 10, borderRadius: Radius.lg },
  }[size];

  const variantStyles: Record<string, { bg: string; border: string; text: string; shadowColor: string }> = {
    solid: {
      bg:          C.gold,
      border:      C.gold,
      text:        '#000000',
      shadowColor: C.gold,
    },
    outline: {
      bg:          'transparent',
      border:      theme.primaryBorder,
      text:        theme.primary,
      shadowColor: theme.primary,
    },
    ghost: {
      bg:          theme.primaryLight,
      border:      theme.primaryBorder,
      text:        theme.primary,
      shadowColor: 'transparent',
    },
    danger: {
      bg:          'rgba(239,68,68,0.1)',
      border:      'rgba(239,68,68,0.4)',
      text:        '#ef4444',
      shadowColor: '#ef4444',
    },
  };

  const vs = variantStyles[variant];
  const isDisabled = disabled || loading;

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <Animated.View style={[
      { transform: [{ scale: scaleAnim }] },
      fullWidth && { width: '100%' },
    ]}>
      <TouchableOpacity
        onPress={!isDisabled ? onPress : undefined}
        onPressIn={!isDisabled ? handlePressIn : undefined}
        onPressOut={!isDisabled ? handlePressOut : undefined}
        activeOpacity={1}
        style={[
          styles.btn,
          {
            backgroundColor:  isDisabled ? 'rgba(255,255,255,0.05)' : vs.bg,
            borderColor:      isDisabled ? C.borderDefault : vs.border,
            borderRadius:     sizeStyles.borderRadius,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical:   sizeStyles.paddingVertical,
            gap:              sizeStyles.gap,
            shadowColor:      vs.shadowColor,
          },
          fullWidth && { width: '100%', justifyContent: 'center' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={isDisabled ? C.textMuted : vs.text} />
        ) : (
          <>
            {icon && (
              <Text style={[styles.btnIcon, {
                fontSize: sizeStyles.iconSize,
                color: isDisabled ? C.textMuted : vs.text,
              }]}>
                {icon}
              </Text>
            )}
            <Text style={[styles.btnLabel, {
              fontSize: sizeStyles.fontSize,
              color: isDisabled ? C.textMuted : vs.text,
            }]}>
              {label}
            </Text>
            {iconRight && (
              <Text style={[styles.btnIcon, {
                fontSize: sizeStyles.iconSize,
                color: isDisabled ? C.textMuted : vs.text,
              }]}>
                {iconRight}
              </Text>
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// ICON BUTTON — okrągły przycisk z ikoną
// ════════════════════════════════════════════════════════════
interface IconButtonProps {
  icon:      string;
  onPress:   () => void;
  size?:     number;
  variant?:  'gold' | 'dark' | 'ghost' | 'era';
  badge?:    boolean;
  badgeColor?: string;
  disabled?: boolean;
  style?:    ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  size     = 44,
  variant  = 'dark',
  badge    = false,
  badgeColor = C.gold,
  disabled = false,
  style,
}: IconButtonProps) {
  const { theme } = useEraTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.90, useNativeDriver: true, tension: 200 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1.00, useNativeDriver: true, tension: 200 }).start();

  const variantStyle: Record<string, { bg: string; border: string; iconColor: string }> = {
    gold: {
      bg:        C.gold,
      border:    C.goldBright,
      iconColor: '#000',
    },
    dark: {
      bg:        'rgba(0,0,0,0.85)',
      border:    C.borderDefault,
      iconColor: C.textPrimary,
    },
    ghost: {
      bg:        theme.primaryLight,
      border:    theme.primaryBorder,
      iconColor: theme.primary,
    },
    era: {
      bg:        theme.primaryLight,
      border:    theme.primaryBorder,
      iconColor: theme.primary,
    },
  };

  const vs = variantStyle[variant];

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={!disabled ? onPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[
          styles.iconBtn,
          {
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: vs.bg,
            borderColor: vs.border,
          },
        ]}
      >
        <Text style={[styles.iconBtnIcon, { fontSize: size * 0.45, color: vs.iconColor }]}>
          {icon}
        </Text>
        {badge && (
          <View style={[styles.iconBtnBadge, { backgroundColor: badgeColor }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// ERA BADGE — tag epoki
// ════════════════════════════════════════════════════════════
interface EraBadgeProps {
  eraId:  string;
  color:  string;
  icon:   string;
  label:  string;
  small?: boolean;
}

export function EraBadge({ eraId, color, icon, label, small = false }: EraBadgeProps) {
  return (
    <View style={[
      styles.eraBadge,
      {
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        paddingHorizontal: small ? 8 : 10,
        paddingVertical:   small ? 3 : 5,
      }
    ]}>
      <Text style={{ fontSize: small ? 10 : 12 }}>{icon}</Text>
      <Text style={[styles.eraBadgeText, { color, fontSize: small ? 9 : 11 }]}>
        {label}
      </Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// SECTION HEADER — nagłówek sekcji z akcentem
// ════════════════════════════════════════════════════════════
interface SectionHeaderProps {
  title:    string;
  subtitle?: string;
  action?:  { label: string; onPress: () => void };
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { theme } = useEraTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={[styles.sectionAction, { color: theme.primary }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// GOLD CARD — bazowa karta z dyem
// ════════════════════════════════════════════════════════════
interface GoldCardProps {
  children:  React.ReactNode;
  style?:    ViewStyle;
  onPress?:  () => void;
  glow?:     boolean;
  noSmoke?:  boolean;
}

export function GoldCard({ children, style, onPress, glow = false, noSmoke = false }: GoldCardProps) {
  const { theme } = useEraTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn  = () => onPress && Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, tension: 200 }).start();
  const handlePressOut = () => onPress && Animated.spring(scaleAnim, { toValue: 1.00, useNativeDriver: true, tension: 200 }).start();

  const card = (
    <Animated.View style={[
      styles.goldCard,
      glow && { borderColor: theme.primaryBorder, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
      { transform: [{ scale: scaleAnim }] },
      style,
    ]}>
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
        {card}
      </TouchableOpacity>
    );
  }

  return card;
}

// ════════════════════════════════════════════════════════════
// DIVIDER — złoty separator
// ════════════════════════════════════════════════════════════
export function GoldDivider({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.divider, style]}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerIcon}>✦</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // GoldButton
  btn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  btnIcon:  { fontWeight: '700' },
  btnLabel: { fontWeight: '700', letterSpacing: 0.5 },

  // IconButton
  iconBtn: {
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  iconBtnIcon: { fontWeight: '700' },
  iconBtnBadge: {
    position: 'absolute',
    top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1, borderColor: C.background,
  },

  // EraBadge
  eraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  eraBadgeText: { fontWeight: '700', letterSpacing: 0.5 },

  // SectionHeader
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 3, height: 20, borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionSub: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
  },

  // GoldCard
  goldCard: {
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.borderDefault,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // GoldDivider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.goldBorder,
  },
  dividerIcon: {
    fontSize: 10,
    color: C.goldDeep,
  },
});
