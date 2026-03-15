// ============================================================
// BATTLE ECHOES — useGoogleAuth.ts
// Google OAuth flow przez expo-auth-session
// ============================================================
// WYMAGANIA:
//   1. Client IDs w src/constants/auth.ts — już uzupełnione
//   2. Scheme "battle-echoes" w app.json — już dodane
//   3. W Google Cloud Console → Web Client ID → Authorized redirect URIs
//      dodaj URI wypisany w konsoli przy starcie apki:
//      "[GoogleAuth] Redirect URI: ..."
//
// EXPO GO:  redirect URI = exp://IP:PORT (np. exp://192.168.1.5:8081)
//           → Google Console wymaga HTTPS, więc Expo Go NIE ZADZIAŁA
//           → Użyj dev build: npx expo run:android
//
// DEV BUILD: redirect URI = battle-echoes://
//            → Dodaj do Google Console: battle-echoes://
// ============================================================

import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAppStore } from '../store';
import { GOOGLE_CLIENT_IDS } from '../constants/auth';

// Wymagane — zamyka okno przeglądarki po redirect
WebBrowser.maybeCompleteAuthSession();

// Wygeneruj redirect URI i zaloguj go — skopiuj do Google Console
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'battle-echoes' });
if (__DEV__) {
  console.log('[GoogleAuth] Redirect URI:', REDIRECT_URI);
  console.log('[GoogleAuth] Dodaj ten URI w Google Console → Web Client ID → Authorized redirect URIs');
}

interface GoogleUserProfile {
  id:    string;
  email: string;
  name:  string;
}

// ── Hook ─────────────────────────────────────────────────────
export function useGoogleAuth() {
  const { user, signInWithGoogle, promoteGuestToAuth, isAuthLoading } = useAppStore();
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:        GOOGLE_CLIENT_IDS.web,
    iosClientId:     GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    redirectUri:     REDIRECT_URI,
  });

  // Obsługa odpowiedzi OAuth
  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      setError(null);
      fetchGoogleProfile(response.authentication!.accessToken);
    } else if (response.type === 'error') {
      setIsOAuthLoading(false);
      setError(response.error?.message ?? 'Błąd logowania Google');
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      // Użytkownik zamknął okno — cicha rezygnacja
      setIsOAuthLoading(false);
    }
  }, [response]);

  // Pobierz dane profilu z Google API
  const fetchGoogleProfile = async (accessToken: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error(`Błąd Google API: ${res.status}`);

      const profile: GoogleUserProfile = await res.json();

      if (!profile.id || !profile.email) throw new Error('Niekompletne dane profilu Google');

      const displayName = profile.name || profile.email.split('@')[0];

      if (user?.isGuest) {
        // Gość loguje się po raz pierwszy → zachowaj cały postęp, zmień tylko konto
        await promoteGuestToAuth({
          id:       profile.id,
          name:     displayName,
          email:    profile.email,
          provider: 'google',
        });
      } else {
        // Nowe konto lub powracający zalogowany użytkownik
        await signInWithGoogle({
          id:    profile.id,
          name:  displayName,
          email: profile.email,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Nie udało się pobrać danych z Google');
    } finally {
      setIsOAuthLoading(false);
    }
  };

  // Uruchom flow OAuth
  const handlePress = async () => {
    setError(null);
    setIsOAuthLoading(true);
    await promptAsync();
  };

  return {
    handlePress,
    isLoading: isOAuthLoading || isAuthLoading,
    error,
    disabled: !request,
  };
}
