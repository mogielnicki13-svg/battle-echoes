// ============================================================
// BATTLE ECHOES — HapticsService.ts
// Lazy-require wrapper dla expo-haptics
// (bezpieczne w Expo Go i na urządzeniach bez wibracji)
// ============================================================
let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

/** Delikatne puknięcie — tapnięcia, przewijanie */
export const hapticLight = (): Promise<void> =>
  Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light).catch(() => {}) ?? Promise.resolve();

/** Średnie puknięcie — odtwarzanie/pauza, nawigacja */
export const hapticMedium = (): Promise<void> =>
  Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Medium).catch(() => {}) ?? Promise.resolve();

/** Mocne puknięcie — ważne zdarzenia */
export const hapticHeavy = (): Promise<void> =>
  Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Heavy).catch(() => {}) ?? Promise.resolve();

/** Sukces — XP, awans, zdobyta nagroda */
export const hapticSuccess = (): Promise<void> =>
  Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success).catch(() => {}) ?? Promise.resolve();

/** Błąd */
export const hapticError = (): Promise<void> =>
  Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Error).catch(() => {}) ?? Promise.resolve();

/** Selekcja — zmiana perspektywy, wybór opcji */
export const hapticSelect = (): Promise<void> =>
  Haptics?.selectionAsync().catch(() => {}) ?? Promise.resolve();
