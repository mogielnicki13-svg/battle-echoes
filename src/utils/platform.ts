// ============================================================
// BATTLE ECHOES — platform.ts
// Utilidades de plataforma — web vs native helpers
// ============================================================

import { Platform, Dimensions } from 'react-native';

export const IS_WEB = Platform.OS === 'web';
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';

// Screen width breakpoints for responsive web layout
export const BREAKPOINTS = {
  mobile:  480,
  tablet:  768,
  desktop: 1024,
} as const;

export function getScreenCategory(): 'mobile' | 'tablet' | 'desktop' {
  if (!IS_WEB) return 'mobile';
  const { width } = Dimensions.get('window');
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

// Max content width for web — prevents ultra-wide layouts
export function getContentMaxWidth(): number | undefined {
  if (!IS_WEB) return undefined;
  return 600;
}

// Web-safe wrapper for features that don't work on web
export function isFeatureAvailable(feature: 'gps' | 'haptics' | 'maps' | 'push' | 'audio'): boolean {
  if (!IS_WEB) return true;
  switch (feature) {
    case 'gps':     return 'geolocation' in navigator;
    case 'haptics': return false;
    case 'maps':    return false; // react-native-maps doesn't work on web
    case 'push':    return false;
    case 'audio':   return true;  // expo-av supports web
    default:        return false;
  }
}
