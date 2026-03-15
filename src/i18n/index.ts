// ============================================================
// BATTLE ECHOES — i18n/index.ts
// Konfiguracja i18next + expo-localization
//
// UŻYCIE w komponentach:
//   import { useTranslation } from 'react-i18next';
//   const { t } = useTranslation();
//   <Text>{t('nav.home')}</Text>
//   <Text>{t('home.greeting_morning', { name: 'Jan' })}</Text>
//
// ZMIANA JĘZYKA:
//   import { changeLanguage, getCurrentLanguage } from '../i18n';
//   await changeLanguage('en');
// ============================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import pl from './locales/pl';
import en from './locales/en';

const LANG_STORAGE_KEY = 'be_language_v1';

// ── Zasoby ────────────────────────────────────────────────────
const resources = {
  pl: { translation: pl },
  en: { translation: en },
} as const;

export type SupportedLanguage = keyof typeof resources;
export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'pl', label: 'Polski',  flag: '🇵🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

// ── Wykryj język urządzenia ────────────────────────────────────
function detectDeviceLanguage(): SupportedLanguage {
  try {
    const locales = Localization.getLocales();
    if (locales.length > 0) {
      const code = locales[0].languageCode;
      if (code && code in resources) return code as SupportedLanguage;
    }
  } catch {}
  return 'pl'; // domyślnie polski
}

// ── Inicjalizacja ─────────────────────────────────────────────
// Wywoływana raz przy starcie (w App.tsx).
// Najpierw sprawdza zapisany wybór, potem język urządzenia.
export async function initI18n(): Promise<void> {
  let savedLang: string | null = null;
  try {
    savedLang = await AsyncStorage.getItem(LANG_STORAGE_KEY);
  } catch {}

  const lng = (savedLang && savedLang in resources)
    ? savedLang as SupportedLanguage
    : detectDeviceLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng: 'pl',
      interpolation: {
        escapeValue: false, // React Native nie wymaga escape
      },
      react: {
        useSuspense: false, // AsyncStorage wymaga async init
      },
    });
}

// ── Zmiana języka (z persystencją) ────────────────────────────
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

// ── Pomocnicze ────────────────────────────────────────────────
export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.language as SupportedLanguage) ?? 'pl';
}

export default i18n;
