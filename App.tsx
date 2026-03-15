// ============================================================
// BATTLE ECHOES — App.tsx (z onboardingiem)
// ============================================================
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './src/store';
import AppNavigation from './src/navigation';
import { Colors } from './src/constants/theme';
import { EraThemeProvider } from './src/hooks/EraThemeContext';
import { AccessibilityProvider } from './src/hooks/useAccessibility';
import AmbientSoundManager from './src/components/AmbientSoundManager';
import AchievementUnlockBanner from './src/components/AchievementUnlockBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initGlobalErrorHandler } from './src/services/CrashReportingService';
import { initAnalytics, logAppOpen } from './src/services/AnalyticsService';
import purchaseService from './src/services/PurchaseService';
import { initNotificationSchedule } from './src/services/NotificationTriggers';
import { initI18n } from './src/i18n';

// ── Bootstrap crash + analytics BEFORE first render ──────────
// This runs synchronously at module load time — before any
// React component mounts, so even early crashes are captured.
initGlobalErrorHandler();



export default function App() {
  const {
    loadFromStorage, isAppReady,
    signInAsGuest, saveToStorage, initFirstLaunch,
  } = useAppStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      // Initialize i18n (language detection + AsyncStorage preference)
      await initI18n();

      // Prime analytics cache before anything that may emit events
      await initAnalytics();

      const done = await AsyncStorage.getItem('battle_echoes_onboarding_done');

      if (done !== '1') {
        // ── FIRST LAUNCH: frictionless guest onboarding ───────────
        // Sign in as guest immediately (no login screen friction)
        signInAsGuest();
        // Ensure the guest user is persisted so loadFromStorage() can read it
        await saveToStorage();
        // Start the 48-hour Recruit Pack countdown timer
        await initFirstLaunch();
        // Mark onboarding as complete — won't show again
        await AsyncStorage.setItem('battle_echoes_onboarding_done', '1');
        // Signal navigation to deep-link to the first battle on next render
        await AsyncStorage.setItem('battle_echoes_first_nav', 'grunwald-1410');
      } else {
        // ── RETURNING USER: load persisted recruit pack timer ──────
        await initFirstLaunch();
      }

      setOnboardingDone(true);

      // Load user progress + battles from storage / Firestore
      await loadFromStorage();

      // Initialize RevenueCat IAP (after store loaded for user context)
      const user = useAppStore.getState().user;
      await purchaseService.initialize(user?.id);

      // Schedule notifications based on current user state
      await initNotificationSchedule(useAppStore.getState().user);

      // Log cold start (after storage loaded so we have user context)
      logAppOpen();
    };
    init();
  }, []);

  // Ładowanie — spinner
  if (!isAppReady || onboardingDone === null) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  // Normalna aplikacja (zawsze po zalogowaniu jako gość lub powracający użytkownik)
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <EraThemeProvider>
          <AccessibilityProvider>
          <View style={styles.appRoot}>
            <AmbientSoundManager />
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
            <AppNavigation />
            {/* Banner osiągnięć — globalny overlay, nad nawigacją */}
            <AchievementUnlockBanner />
          </View>
          </AccessibilityProvider>
        </EraThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
