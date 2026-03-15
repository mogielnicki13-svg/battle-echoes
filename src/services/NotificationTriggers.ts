// ============================================================
// BATTLE ECHOES — NotificationTriggers.ts
// Automatyczne planowanie powiadomień na podstawie stanu gracza
//
// Wywoływane:
//   1. Po starcie aplikacji (initNotificationSchedule)
//   2. Po checkDailyStreak (rescheduleStreakNotifications)
//   3. Po awardXP / level-up (checkLevelUpReminder)
//   4. Po markBattleListened (rescheduleWeeklyRecap)
//
// UŻYCIE:
//   import { initNotificationSchedule } from './NotificationTriggers';
//   await initNotificationSchedule(user);  // call once after loadFromStorage
// ============================================================

import notificationService, { loadNotifSettings } from './NotificationService';
import type { User } from '../store';
import { levelFromXP } from '../store';

// ── Pełna inicjalizacja po starcie aplikacji ─────────────────
// Planuje/aktualizuje WSZYSTKIE powiadomienia na podstawie bieżącego stanu.
export async function initNotificationSchedule(user: User | null): Promise<void> {
  if (!user) return;

  const granted = await notificationService.initialize();
  if (!granted) return;

  const settings = await loadNotifSettings();
  if (!settings.enabled) return;

  // Równoległe planowanie — niezależne od siebie
  await Promise.allSettled([
    rescheduleStreakNotifications(user, settings.dailyHour),
    rescheduleWeeklyRecap(user),
    checkLevelUpReminder(user),
  ]);
}

// ── Streak: daily reminder + streak-at-risk ──────────────────
// Wywołaj po: checkDailyStreak(), app launch
export async function rescheduleStreakNotifications(
  user: User,
  dailyHour: number = 10,
): Promise<void> {
  const settings = await loadNotifSettings();
  if (!settings.enabled) return;

  if (settings.dailyStreak) {
    await notificationService.scheduleDailyStreak(user.streak, dailyHour);
  }
  if (settings.streakAtRisk) {
    await notificationService.scheduleStreakAtRisk(user.streak);
  }
}

// ── Weekly recap ─────────────────────────────────────────────
// Wywołaj po: markBattleListened(), app launch
export async function rescheduleWeeklyRecap(user: User): Promise<void> {
  const settings = await loadNotifSettings();
  if (!settings.enabled || !settings.weeklyRecap) return;

  const battlesThisWeek = countActivityLast7Days(user);
  await notificationService.scheduleWeeklyRecap(
    battlesThisWeek,
    user.totalXP,
    user.streak,
  );
}

// ── Level-up reminder ────────────────────────────────────────
// Wywołaj po: awardXP() (gdy gracz jest blisko nowego poziomu)
export async function checkLevelUpReminder(user: User): Promise<void> {
  const settings = await loadNotifSettings();
  if (!settings.enabled || !settings.levelReminder) return;

  const { level, currentXP, xpToNext } = levelFromXP(user.totalXP);
  if (xpToNext === 0) return;

  const progressPct = (currentXP / xpToNext) * 100;
  await notificationService.scheduleLevelUpReminder(
    level + 1,
    xpToNext - currentXP,
    progressPct,
  );
}

// ── Helper: policz aktywność z ostatnich 7 dni ──────────────
function countActivityLast7Days(user: User): number {
  const now = new Date();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    total += user.activityLog[key] ?? 0;
  }
  return total;
}
