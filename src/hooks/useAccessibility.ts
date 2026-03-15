// ============================================================
// BATTLE ECHOES — useAccessibility.ts
// Hook i kontekst dla ustawień dostępności
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AccessibilityInfo, useColorScheme, PixelRatio } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Typy ──────────────────────────────────────────────────────
export interface AccessibilitySettings {
  fontScale:          number;   // 1.0 = normal, 1.25 = large, 1.5 = extra large
  reduceMotion:       boolean;  // disable animations
  highContrast:       boolean;  // increase contrast
  screenReaderActive: boolean;  // detected from system
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontScale:          1.0,
  reduceMotion:       false,
  highContrast:       false,
  screenReaderActive: false,
};

const STORAGE_KEY = 'be_accessibility_v1';

// ── Context ──────────────────────────────────────────────────
interface AccessibilityContextType {
  settings: AccessibilitySettings;
  setFontScale: (scale: number) => void;
  setReduceMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  scaledFont: (size: number) => number;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  settings: DEFAULT_SETTINGS,
  setFontScale: () => {},
  setReduceMotion: () => {},
  setHighContrast: () => {},
  scaledFont: (size) => size,
});

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

// ── Provider ─────────────────────────────────────────────────
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  // Load saved settings + detect screen reader
  useEffect(() => {
    const init = async () => {
      // Load persisted settings
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setSettings(prev => ({ ...prev, ...saved }));
        }
      } catch {}

      // Detect screen reader
      try {
        const isActive = await AccessibilityInfo.isScreenReaderEnabled();
        setSettings(prev => ({ ...prev, screenReaderActive: isActive }));
      } catch {}

      // Detect reduce motion preference
      try {
        const reduced = await AccessibilityInfo.isReduceMotionEnabled();
        if (reduced) {
          setSettings(prev => ({ ...prev, reduceMotion: true }));
        }
      } catch {}
    };
    init();

    // Listen for screen reader changes
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (isActive) => {
      setSettings(prev => ({ ...prev, screenReaderActive: isActive }));
    });

    return () => sub.remove();
  }, []);

  // Persist when settings change
  const persist = useCallback(async (newSettings: AccessibilitySettings) => {
    try {
      const { screenReaderActive, ...toSave } = newSettings;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, []);

  const setFontScale = useCallback((scale: number) => {
    const clamped = Math.max(0.75, Math.min(2.0, scale));
    setSettings(prev => {
      const next = { ...prev, fontScale: clamped };
      persist(next);
      return next;
    });
  }, [persist]);

  const setReduceMotion = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const next = { ...prev, reduceMotion: enabled };
      persist(next);
      return next;
    });
  }, [persist]);

  const setHighContrast = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const next = { ...prev, highContrast: enabled };
      persist(next);
      return next;
    });
  }, [persist]);

  const scaledFont = useCallback((size: number) => {
    return Math.round(size * settings.fontScale);
  }, [settings.fontScale]);

  const value = {
    settings,
    setFontScale,
    setReduceMotion,
    setHighContrast,
    scaledFont,
  };

  return React.createElement(AccessibilityContext, { value }, children);
}

// ── Font scale presets ───────────────────────────────────────
export const FONT_SCALE_PRESETS = [
  { label: 'S',  value: 0.85, labelPL: 'Mały',         labelEN: 'Small' },
  { label: 'M',  value: 1.0,  labelPL: 'Normalny',     labelEN: 'Normal' },
  { label: 'L',  value: 1.15, labelPL: 'Duży',         labelEN: 'Large' },
  { label: 'XL', value: 1.3,  labelPL: 'Bardzo duży',  labelEN: 'Extra large' },
  { label: '2X', value: 1.5,  labelPL: 'Maksymalny',   labelEN: 'Maximum' },
] as const;
