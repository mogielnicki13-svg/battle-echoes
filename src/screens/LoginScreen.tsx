// ============================================================
// BATTLE ECHOES — LoginScreen.tsx
// Animowany ekran logowania — bez zewnętrznych bibliotek ikon
// Kompatybilny z Expo SDK 55
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, ActivityIndicator, Alert,
  SafeAreaView, Platform,
} from 'react-native';
import { Colors, Spacing, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import GoldIcon, { Icon, EraIcon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const { width: SW, height: SH } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════
// EKRAN LOGOWANIA
// ════════════════════════════════════════════════════════════
export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  useFocusEffect(useCallback(() => { logScreenView('Login'); }, []));
  const { signInAsGuest } = useAppStore();
  const {
    handlePress: handleGooglePress,
    isLoading:   isGoogleLoading,
    error:       googleError,
    disabled:    googleDisabled,
  } = useGoogleAuth();
  const {
    handlePress: handleApplePress,
    isLoading:   isAppleLoading,
    error:       appleError,
    disabled:    appleDisabled,
  } = useAppleAuth();

  // Animacje wejścia
  const logoAnim   = useRef(new Animated.Value(0)).current;
  const titleAnim  = useRef(new Animated.Value(0)).current;
  const btnsAnim   = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Sekwencja animacji wejścia
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1, duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(titleAnim, {
        toValue: 1, duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(btnsAnim, {
        toValue: 1, duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsowanie złotego glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Tło — pionowe linie jak stare mapy */}
      <View style={styles.bgLines}>
        {[...Array(8)].map((_, i) => (
          <View key={i} style={[styles.bgLine, { left: `${i * 14}%` }]} />
        ))}
      </View>

      {/* Złoty glow za logo */}
      <Animated.View style={[styles.glow, { opacity: glowAnim }]} />

      {/* LOGO */}
      <Animated.View style={[styles.logoContainer, {
        opacity: logoAnim,
        transform: [{ translateY: logoAnim.interpolate({
          inputRange: [0, 1], outputRange: [-40, 0],
        }) }],
      }]}>
        <View style={styles.logoCircle}>
          <GoldIcon name="sword" size={28} color="#C9A84C" />
        </View>
      </Animated.View>

      {/* TYTUŁ */}
      <Animated.View style={[styles.titleContainer, {
        opacity: titleAnim,
        transform: [{ translateY: titleAnim.interpolate({
          inputRange: [0, 1], outputRange: [20, 0],
        }) }],
      }]}>
        <Text style={styles.appName}>BATTLE</Text>
        <Text style={styles.appNameGold}>ECHOES</Text>
        <Text style={styles.tagline}>
          {t('auth.tagline')}
        </Text>

        {/* Ozdobna linia */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Icon id="sword" size={16} color="#C9A84C" />
          <View style={styles.dividerLine} />
        </View>
      </Animated.View>

      {/* PRZYCISKI LOGOWANIA */}
      <Animated.View style={[styles.buttonsContainer, {
        opacity: btnsAnim,
        transform: [{ translateY: btnsAnim.interpolate({
          inputRange: [0, 1], outputRange: [40, 0],
        }) }],
      }]}>

        {googleError && (
          <Text style={styles.errorText}>{googleError}</Text>
        )}
        {appleError && (
          <Text style={styles.errorText}>{appleError}</Text>
        )}

        {(isGoogleLoading || isAppleLoading) ? (
          <ActivityIndicator color={Colors.gold} size="large" style={{ marginVertical: 32 }} />
        ) : (
          <>
            {/* Google */}
            <AuthButton
              iconNode={<Icon id="google" size={20} color="#ffffff" />}
              label={t('auth.google')}
              onPress={handleGooglePress}
              disabled={googleDisabled}
              style={styles.btnGoogle}
              textStyle={styles.btnGoogleText}
            />

            {/* Apple — tylko iOS */}
            {Platform.OS === 'ios' && (
              <AuthButton
                iconNode={<Icon id="apple" size={20} color="#ffffff" />}
                label={t('auth.apple')}
                onPress={handleApplePress}
                disabled={appleDisabled}
                style={styles.btnApple}
                textStyle={styles.btnAppleText}
              />
            )}

            {/* Gość */}
            <TouchableOpacity
              style={styles.btnGuest}
              onPress={signInAsGuest}
              activeOpacity={0.7}
            >
              <Text style={styles.btnGuestText}>{t('auth.guest')}</Text>
              <Text style={styles.btnGuestSub}>{t('auth.guest_sub')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Regulamin */}
        <Text style={styles.legal}>
          {t('auth.legal_prefix')}{' '}
          <Text style={styles.legalLink} onPress={() => navigation.navigate('Legal', { type: 'terms' })}>{t('auth.terms')}</Text>
          {' '}{t('auth.and')}{' '}
          <Text style={styles.legalLink} onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>{t('auth.privacy')}</Text>
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

// ---- Przycisk logowania ----
function AuthButton({ iconNode, label, onPress, disabled, style, textStyle }: {
  iconNode: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style: any;
  textStyle: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, {
    toValue: 0.96, useNativeDriver: true, tension: 200,
  }).start();

  const onPressOut = () => Animated.spring(scale, {
    toValue: 1, useNativeDriver: true, tension: 200,
  }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.5 : 1 }}>
      <TouchableOpacity
        style={[styles.authBtn, style]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        <View style={styles.authBtnIcon}>{iconNode}</View>
        <Text style={[styles.authBtnLabel, textStyle]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // Tło
  bgLines: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  bgLine: {
    position: 'absolute',
    top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(212,160,23,0.04)',
  },

  // Glow
  glow: {
    position: 'absolute',
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(212,160,23,0.08)',
    top: SH * 0.15,
  },

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(212,160,23,0.5)',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 10,
  },

  // Tytuł
  titleContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  appName: {
    fontSize: 42, color: Colors.textPrimary,
    fontWeight: '900', letterSpacing: 8,
  },
  appNameGold: {
    fontSize: 42, color: Colors.gold,
    fontWeight: '900', letterSpacing: 8,
    marginTop: -8,
  },
  tagline: {
    fontSize: 15, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 22,
    marginTop: Spacing.md, fontStyle: 'italic',
  },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginTop: Spacing.lg, width: 200,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,160,23,0.25)' },

  // Przyciski
  buttonsContainer: { width: '100%', gap: Spacing.sm },

  authBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 20,
    borderRadius: Radius.md, gap: 12,
  },
  authBtnIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  authBtnLabel: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },

  // Google
  btnGoogle: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  btnGoogleText: { color: '#1a1a1a' },

  // Apple
  btnApple: { backgroundColor: '#000000', borderWidth: 1, borderColor: '#333' },
  btnAppleText: { color: '#ffffff' },

  // Gość
  btnGuest: {
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(212,160,23,0.3)',
    alignItems: 'center', gap: 2,
    marginTop: Spacing.xs,
  },
  btnGuestText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  btnGuestSub:  { fontSize: 11, color: Colors.textMuted },

  // Błąd logowania
  errorText: {
    fontSize: 13, color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },

  // Legal
  legal: {
    fontSize: 11, color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.md, lineHeight: 16,
  },
  legalLink: { color: Colors.gold, textDecorationLine: 'underline' },
});
