// ============================================================
// BATTLE ECHOES — auth.ts
// Google OAuth Client IDs
//
// Jak uzyskać Client IDs:
// 1. Wejdź na https://console.cloud.google.com
// 2. Utwórz projekt lub wybierz istniejący
// 3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
//
// Potrzebne 3 Client IDs:
//   WEB    → typ "Web application"
//            Authorized redirect URIs: https://auth.expo.io/@twoj-login/battle-echoes
//   ANDROID → typ "Android", package: com.battleechoes.app
//             SHA-1 fingerprint: (z `cd android && ./gradlew signingReport`)
//   IOS    → typ "iOS", bundle ID: com.battleechoes.app
// ============================================================

// ElevenLabs API Key — set EXPO_PUBLIC_ELEVENLABS_API_KEY in .env
export const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '';

export const GOOGLE_CLIENT_IDS = {
  // Web Client ID — używany w Expo Go i na web
  web: '656849814409-5tupj2ourpj50ec61udc5f67ud62m6qs.apps.googleusercontent.com',

  // Android Client ID — używany w dev build / produkcji Android
  android: '656849814409-unmo1ukprnd3f8vvgj8umsm0v2sqek2f.apps.googleusercontent.com',

  // iOS Client ID — używany w dev build / produkcji iOS
  ios: '656849814409-gg1hvmscfm1infv4s7s9kmcgalqj3n36.apps.googleusercontent.com',
} as const;
