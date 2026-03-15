// ============================================================
// BATTLE ECHOES — EraThemeContext.tsx
// Globalny kontekst motywu epoki — zmienia kolory całej aplikacji
// ============================================================
// UŻYCIE:
//   const { theme, setEra, currentEra } = useEraTheme();
//   <View style={{ backgroundColor: theme.primaryLight }}>
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ERA_THEMES, DEFAULT_ERA_THEME, EraTheme, EraId } from '../constants/theme';

// ── Typy ─────────────────────────────────────────────────────
interface EraThemeContextValue {
  theme:      EraTheme;
  currentEra: EraId;
  setEra:     (eraId: EraId) => void;
  fadeAnim:   Animated.Value;
  isChanging: boolean;
}

// ── Kontekst ─────────────────────────────────────────────────
const EraThemeContext = createContext<EraThemeContextValue>({
  theme:      DEFAULT_ERA_THEME,
  currentEra: 'medieval',
  setEra:     () => {},
  fadeAnim:   new Animated.Value(1),
  isChanging: false,
});

// ── Provider ─────────────────────────────────────────────────
export function EraThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentEra, setCurrentEra] = useState<EraId>('medieval');
  const [isChanging, setIsChanging]  = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const currentEraRef = useRef<EraId>(currentEra);
  useEffect(() => { currentEraRef.current = currentEra; }, [currentEra]);

  // Wczytaj zapisany motyw
  useEffect(() => {
    AsyncStorage.getItem('selectedEra').then(saved => {
      if (saved && ERA_THEMES[saved as EraId]) {
        setCurrentEra(saved as EraId);
      }
    }).catch(() => {});
  }, []);

  const setEra = useCallback((eraId: EraId) => {
    if (eraId === currentEraRef.current || !ERA_THEMES[eraId]) return;

    setIsChanging(true);

    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentEra(eraId);
      currentEraRef.current = eraId;
      AsyncStorage.setItem('selectedEra', eraId).catch(() => {});

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setIsChanging(false));
    });
  }, [fadeAnim]);

  const theme = ERA_THEMES[currentEra] || DEFAULT_ERA_THEME;

  return (
    <EraThemeContext.Provider value={{ theme, currentEra, setEra, fadeAnim, isChanging }}>
      {children}
    </EraThemeContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useEraTheme() {
  return useContext(EraThemeContext);
}
