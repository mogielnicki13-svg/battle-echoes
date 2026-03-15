// ============================================================
// BATTLE ECHOES — NotificationService.ts
// Lokalne powiadomienia — działają w Expo Go bez dev build!
//
// Typy powiadomień:
//   daily_streak      — codzienny reminder o wybranej godzinie
//   streak_at_risk    — seria zagrożona, codziennie o 22:00
//   new_battle        — odblokowanie nowej bitwy (natychmiast)
//   gps_nearby        — pole bitwy w pobliżu (natychmiast)
//   weekly_recap      — podsumowanie tygodnia (niedziela 18:00)
//   level_up_reminder — blisko nowego poziomu (następny dzień 15:00)
//
// UŻYCIE:
//   import notificationService from './NotificationService';
//   await notificationService.initialize();
//   await notificationService.scheduleDailyStreak(streak, hour);
//   await notificationService.notifyNewBattleUnlocked(name);
// ============================================================

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ── Wykryj Expo Go — push notifications NIE działają od SDK 53 ──
// SDK 55: executionEnvironment === 'storeClient' to pewniejsza flaga niż
// przestarzałe appOwnership === 'expo'. Fallback na appOwnership dla starszych SDK.
const IS_EXPO_GO =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

// ── Konfiguracja zachowania gdy app jest na pierwszym planie ──
// Ustawiane od razu przy imporcie modułu — TYLKO poza Expo Go
if (!IS_EXPO_GO) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert:  true,
        shouldPlaySound:  true,
        shouldSetBadge:   false,
        shouldShowBanner: true,
        shouldShowList:   true,
      }),
    });
  } catch {}
}

// ════════════════════════════════════════════════════════════
// TYPY
// ════════════════════════════════════════════════════════════
export type NotifType =
  | 'daily_streak'
  | 'streak_at_risk'
  | 'new_battle'
  | 'gps_nearby'
  | 'weekly_recap'
  | 'level_up_reminder';

export interface NotifSettings {
  enabled:       boolean;
  dailyStreak:   boolean;
  streakAtRisk:  boolean;
  newBattles:    boolean;
  gpsNearby:     boolean;
  weeklyRecap:   boolean;
  levelReminder: boolean;
  dailyHour:     number;   // 0–23, godzina codziennego reminder
}

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  enabled:       true,
  dailyStreak:   true,
  streakAtRisk:  true,
  newBattles:    true,
  gpsNearby:     true,
  weeklyRecap:   true,
  levelReminder: true,
  dailyHour:     10,
};

// ── Identyfikatory powiadomień (do anulowania) ────────────────
const ID = {
  DAILY:   'be_daily_streak',
  AT_RISK: 'be_streak_at_risk',
  WEEKLY:  'be_weekly_recap',
  LEVEL:   'be_level_reminder',
} as const;

// ── Treści powiadomień (do testów) ────────────────────────────
export const NOTIF_TEMPLATES: Record<NotifType, { title: string; body: string }> = {
  daily_streak:      { title: '⚔ Odkryj nową bitwę',            body: 'Czekają nieodkryte pola bitew. Nie przerywaj serii!' },
  streak_at_risk:    { title: '⏰ Seria zagrożona!',             body: 'Masz jeszcze 2 godziny. Wróć i ocal serię!' },
  new_battle:        { title: '⚔ Nowa bitwa odblokowana!',      body: 'Nowa narracja czeka na odkrycie. Posłuchaj historii!' },
  gps_nearby:        { title: '📍 Pole bitwy w pobliżu!',        body: 'Jesteś blisko miejsca historycznych wydarzeń. Zbliż się!' },
  weekly_recap:      { title: '📊 Twój tydzień w Battle Echoes', body: 'Sprawdź swoje postępy z ostatnich 7 dni.' },
  level_up_reminder: { title: '⭐ Prawie nowy poziom!',          body: 'Wróć i zdobądź ostatnie XP do awansu!' },
};

// ════════════════════════════════════════════════════════════
// ASYNCSTORAGE — PERSYSTENCJA USTAWIEŃ
// ════════════════════════════════════════════════════════════
export const NOTIF_SETTINGS_KEY = 'be_notif_settings_v1';

export async function loadNotifSettings(): Promise<NotifSettings> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_NOTIF_SETTINGS };
    // Merge z DEFAULT żeby nowe pola pojawiły się automatycznie
    return { ...DEFAULT_NOTIF_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIF_SETTINGS };
  }
}

export async function saveNotifSettings(s: NotifSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

// ════════════════════════════════════════════════════════════
// WEWNĘTRZNY HELPER — bezpieczne planowanie
// ════════════════════════════════════════════════════════════
async function schedule(
  id:      string | undefined,
  content: { title: string; body: string; data?: Record<string, any> },
  trigger: any,
): Promise<void> {
  // Expo Go SDK 53+: push/local notifications wymagają dev buildu
  if (IS_EXPO_GO) return;
  try {
    await Notifications.scheduleNotificationAsync({
      ...(id ? { identifier: id } : {}),
      content: { sound: true, ...content },
      trigger,
    });
  } catch (e) {
    console.warn('[Notif] Błąd planowania powiadomienia:', e);
  }
}

// ════════════════════════════════════════════════════════════
// SERVICE
// ════════════════════════════════════════════════════════════
const notificationService = {

  // ── Inicjalizacja / prośba o uprawnienia ─────────────────
  async initialize(): Promise<boolean> {
    // Expo Go SDK 53+: push notifications nie działają — zwróć false cicho
    if (IS_EXPO_GO) {
      if (__DEV__) console.log('[Notif] Expo Go — powiadomienia push niedostępne. Użyj dev buildu.');
      return false;
    }
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === 'granted') return true;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  // ── Lista zaplanowanych powiadomień ──────────────────────
  async getScheduled(): Promise<Notifications.NotificationTrigger[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync() as any;
    } catch {
      return [];
    }
  },

  // ── Anuluj wszystkie ─────────────────────────────────────
  async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
  },

  // ── Codzienny reminder "Odkryj nową bitwę" ───────────────
  // Planuje cykliczne powiadomienie o godzinie `hour`:00.
  // Treść zmienia się gdy użytkownik ma aktywną serię.
  async scheduleDailyStreak(streak: number, hour: number = 10): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(ID.DAILY).catch(() => {});

    const title = streak > 1
      ? `🔥 Seria ${streak} dni — nie przerywaj!`
      : '⚔ Odkryj nową bitwę';
    const body = streak > 1
      ? 'Zaloguj się i kontynuuj swoją historyczną podróż.'
      : 'Czekają nieodkryte pola bitew. Uruchom Battle Echoes!';

    await schedule(ID.DAILY, { title, body, data: { type: 'daily_streak' } }, {
      type:   Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:   Math.max(0, Math.min(23, hour)),
      minute: 0,
    });
  },

  // ── Seria zagrożona — codziennie o 22:00 ─────────────────
  // Nie planuje jeśli streak === 0 (nie ma czego chronić).
  async scheduleStreakAtRisk(streak: number): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(ID.AT_RISK).catch(() => {});
    if (streak === 0) return;

    await schedule(ID.AT_RISK, {
      title: `⏰ Seria ${streak} dni zagrożona!`,
      body:  'Masz jeszcze 2 godziny. Nie pozwól jej zniknąć!',
      data:  { type: 'streak_at_risk' },
    }, {
      type:   Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:   22,
      minute: 0,
    });
  },

  // ── Tygodniowe podsumowanie — niedziela 18:00 ────────────
  // weekday: 1 = niedziela (konwencja iOS NSCalendar)
  async scheduleWeeklyRecap(battles: number, xp: number, streak: number): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(ID.WEEKLY).catch(() => {});

    await schedule(ID.WEEKLY, {
      title: '📊 Twój tydzień w Battle Echoes',
      body:  `${battles} bitew · ${xp.toLocaleString('pl-PL')} XP · seria ${streak} dni. Świetnie!`,
      data:  { type: 'weekly_recap' },
    }, {
      type:    Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,   // niedziela
      hour:    18,
      minute:  0,
    });
  },

  // ── Blisko nowego poziomu — następny dzień o 15:00 ───────
  // Aktywuje się tylko gdy progressPct >= 70% do następnego poziomu.
  async scheduleLevelUpReminder(
    nextLevel:   number,
    xpNeeded:    number,
    progressPct: number,
  ): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(ID.LEVEL).catch(() => {});
    if (progressPct < 70) return; // za wcześnie — nie zawracaj głowy

    const at = new Date();
    at.setDate(at.getDate() + 1);
    at.setHours(15, 0, 0, 0);

    await schedule(ID.LEVEL, {
      title: `⭐ Prawie poziom ${nextLevel}!`,
      body:  `Tylko ${xpNeeded} XP dzieli Cię od awansu. Wróć i walcz!`,
      data:  { type: 'level_up_reminder' },
    }, {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
    });
  },

  // ── Odblokowanie bitwy (natychmiast) ─────────────────────
  // Sprawdza ustawienia zanim wyśle — nie spamuje jeśli wyłączone.
  async notifyNewBattleUnlocked(battleName: string): Promise<void> {
    const s = await loadNotifSettings();
    if (!s.enabled || !s.newBattles) return;

    await schedule(undefined, {
      title: '⚔ Nowa bitwa odblokowana!',
      body:  `"${battleName}" czeka na odkrycie. Posłuchaj narracji!`,
      data:  { type: 'new_battle' },
    }, {
      type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    });
  },

  // ── GPS: pole bitwy w pobliżu (natychmiast) ──────────────
  async notifyGpsNearby(battleName: string, distanceM: number): Promise<void> {
    const s = await loadNotifSettings();
    if (!s.enabled || !s.gpsNearby) return;

    const dist = distanceM < 1000
      ? `${Math.round(distanceM)} m`
      : `${(distanceM / 1000).toFixed(1)} km`;

    await schedule(undefined, {
      title: `📍 Jesteś blisko: ${battleName}!`,
      body:  `Pole bitwy oddalone o ${dist}. Odwiedź je po 300 XP!`,
      data:  { type: 'gps_nearby' },
    }, {
      type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    });
  },

  // ── Testowe powiadomienie — pojawi się za 2 sekundy ──────
  // Zamknij aplikację żeby zobaczyć powiadomienie.
  async sendTestNotification(type: NotifType): Promise<void> {
    const tpl = NOTIF_TEMPLATES[type];
    await schedule(undefined, {
      title: tpl.title,
      body:  tpl.body,
      data:  { type },
    }, {
      type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
    });
  },
};

export default notificationService;
