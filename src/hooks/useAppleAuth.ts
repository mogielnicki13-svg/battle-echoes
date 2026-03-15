// ============================================================
// BATTLE ECHOES — useAppleAuth.ts
// Apple Sign-In flow via expo-apple-authentication
// ============================================================
// WYMAGANIA:
//   1. Działa tylko na fizycznym urządzeniu iOS (≥13.0)
//   2. Dodaj "Sign in with Apple" capability w Apple Developer Console
//   3. Plugin expo-apple-authentication w app.json
//
// EXPO GO: Działa poprawnie od iOS 13+
// DEV BUILD: Tak samo — wymaga Apple Developer account z entitlement
// ============================================================

import { useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { useAppStore } from '../store';

export function useAppleAuth() {
  const { user, signInWithApple, promoteGuestToAuth, isAuthLoading } = useAppStore();
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = Platform.OS === 'ios';

  const handlePress = async () => {
    if (!isAvailable) {
      setError('Apple Sign-In dostępne tylko na iOS');
      return;
    }

    setError(null);
    setIsOAuthLoading(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const userId = credential.user;
      const email = credential.email ?? `${userId}@privaterelay.appleid.com`;
      const displayName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : email.split('@')[0];

      if (user?.isGuest) {
        await promoteGuestToAuth({
          id:       userId,
          name:     displayName || 'Dowódca',
          email,
          provider: 'apple',
        });
      } else {
        await signInWithApple({
          id:    userId,
          name:  displayName || 'Dowódca',
          email,
        });
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled — silent
      } else {
        setError(err.message ?? 'Błąd logowania Apple');
      }
    } finally {
      setIsOAuthLoading(false);
    }
  };

  return {
    handlePress,
    isLoading: isOAuthLoading || isAuthLoading,
    error,
    disabled: !isAvailable,
  };
}
