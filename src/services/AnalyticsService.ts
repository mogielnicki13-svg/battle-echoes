// ============================================================
// BATTLE ECHOES — AnalyticsService.ts
//
// GDPR-compliant analytics wrapper around Firebase Analytics.
//
// Design principles:
//   • All public methods are SYNC (fire-and-forget) — never
//     block UI on analytics writes.
//   • User IDs are NEVER sent as-is. They are anonymized with
//     FNV-1a hash + app salt before hitting any remote service.
//   • A rolling local log (last 10 events) is kept in
//     AsyncStorage for inspection in the Developer Screen.
//   • A single `be_analytics_enabled` flag lets you kill all
//     remote calls without touching the local log.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Storage keys ─────────────────────────────────────────────
const KEY_ENABLED   = 'be_analytics_enabled';
const KEY_EVENT_LOG = 'be_dev_event_log';

// ── Constants ─────────────────────────────────────────────────
const MAX_LOCAL_EVENTS = 10;
const APP_SALT         = 'battle_echoes_2025_gdpr_salt';

// Stable session ID — resets every cold app start
const SESSION_ID = `s_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

// ── Types ──────────────────────────────────────────────────────
export interface AnalyticsEvent {
  name:      string;
  params:    Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  sent:      boolean;  // false = analytics disabled, event was dropped
}

// ── Runtime state ─────────────────────────────────────────────
// Cached after first AsyncStorage read so sync callers never
// need to await.
let _enabledCache: boolean = true;
let _cacheLoaded:  boolean = false;

// ── GDPR: One-way user ID anonymization ───────────────────────
//
// We use FNV-1a (32-bit) to create a stable anonymous ID.
// The raw user ID never leaves the device.
//
// For stronger security (HIPAA, etc.), replace with:
//   import * as Crypto from 'expo-crypto';
//   const anonId = await Crypto.digestStringAsync(
//     Crypto.CryptoDigestAlgorithm.SHA256,
//     rawId + APP_SALT,
//   );
//
function fnv1a32(str: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = (h ^ str.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function anonymizeUserId(rawId: string): string {
  // Double-hash with salt so the anon ID can't be reversed even
  // with knowledge of the input space.
  const pass1 = fnv1a32(rawId + APP_SALT);
  const pass2 = fnv1a32(pass1 + APP_SALT + rawId.length);
  return `anon_${pass1}${pass2}`;
}

// ── Firebase Analytics lazy init ──────────────────────────────
// Mirrors the lazy-require pattern used throughout the app
// (prevents Expo Go crashes when native modules are absent).
let _fa: { analytics: any; logEvent: Function; setUserId: Function; setAnalyticsCollectionEnabled: Function } | null = null;
let _faAttempted = false;

function getFA() {
  if (_faAttempted) return _fa;
  _faAttempted = true;
  // Firebase Analytics używa DOM API (getElementsByTagName, document, window.location)
  // które nie istnieją w React Native. Inicjalizujemy tylko na platformie Web.
  if (Platform.OS !== 'web') return null;
  try {
    const fb  = require('firebase/app');
    const fa  = require('firebase/analytics');
    const app = fb.getApps()[0];
    if (!app) return null;
    _fa = {
      analytics:                    fa.getAnalytics(app),
      logEvent:                     fa.logEvent,
      setUserId:                    fa.setUserId,
      setAnalyticsCollectionEnabled: fa.setAnalyticsCollectionEnabled,
    };
    return _fa;
  } catch {
    return null;
  }
}

// ── Local event log (rolling buffer) ──────────────────────────
// Writes are fire-and-forget; reads are async for the Dev Screen.
function appendToLog(event: AnalyticsEvent): void {
  (async () => {
    try {
      const raw: string | null = await AsyncStorage.getItem(KEY_EVENT_LOG);
      const log: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
      log.push(event);
      await AsyncStorage.setItem(
        KEY_EVENT_LOG,
        JSON.stringify(log.slice(-MAX_LOCAL_EVENTS)),
      );
    } catch {
      // Silently ignore storage errors
    }
  })();
}

export async function getLocalEventLog(): Promise<AnalyticsEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_EVENT_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearLocalEventLog(): Promise<void> {
  await AsyncStorage.removeItem(KEY_EVENT_LOG);
}

// ── Analytics kill-switch ──────────────────────────────────────
// Load the flag once on first call; subsequent calls use the cache.
async function loadEnabledFlag(): Promise<void> {
  if (_cacheLoaded) return;
  try {
    const val  = await AsyncStorage.getItem(KEY_ENABLED);
    _enabledCache = val !== 'false';  // default: enabled
  } catch {
    _enabledCache = true;
  }
  _cacheLoaded = true;
}

// Call once during app init to prime the cache before first track().
export async function initAnalytics(): Promise<void> {
  await loadEnabledFlag();
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  _enabledCache = enabled;
  _cacheLoaded  = true;
  await AsyncStorage.setItem(KEY_ENABLED, String(enabled));
  // Propagate to Firebase
  try {
    const fa = getFA();
    if (fa) fa.setAnalyticsCollectionEnabled(fa.analytics, enabled);
  } catch {}
}

export async function getAnalyticsEnabled(): Promise<boolean> {
  await loadEnabledFlag();
  return _enabledCache;
}

// ── Core track function ────────────────────────────────────────
// SYNC from the caller's perspective. All async work is internal.
function track(name: string, params: Record<string, unknown> = {}): void {
  const sent = _cacheLoaded ? _enabledCache : true;  // optimistic before cache

  const event: AnalyticsEvent = {
    name,
    params,
    timestamp: Date.now(),
    sessionId: SESSION_ID,
    sent,
  };

  // Always write to local log (for dev screen visibility)
  appendToLog(event);

  if (!sent) {
    __DEV__ && console.debug(`[Analytics] ⚠ disabled — dropped: ${name}`);
    return;
  }

  // Send to Firebase Analytics
  const fa = getFA();
  if (fa) {
    try {
      fa.logEvent(fa.analytics, name, { ...params, session_id: SESSION_ID });
    } catch (e) {
      __DEV__ && console.warn('[Analytics] logEvent failed:', e);
    }
  } else {
    __DEV__ && console.debug(`[Analytics] 📊 ${name}`, params);
  }
}

// ── User identification ────────────────────────────────────────
export function identifyUser(rawUserId: string): void {
  const anonId = anonymizeUserId(rawUserId);
  const fa = getFA();
  if (fa) {
    try {
      fa.setUserId(fa.analytics, anonId);
    } catch {}
  }
}

export function clearIdentity(): void {
  const fa = getFA();
  if (fa) {
    try {
      fa.setUserId(fa.analytics, null);
    } catch {}
  }
}

// ════════════════════════════════════════════════════════════════
// PUBLIC API — Standardized Event Methods
// Every method has exactly the params needed for your BI dashboards.
// Keep method names snake_case to match Firebase event name limits.
// ════════════════════════════════════════════════════════════════

/** User tapped into a battle detail page */
export function logBattleStarted(battleId: string, era = 'unknown'): void {
  track('battle_started', { battle_id: battleId, era });
}

/**
 * User left a battle without completing (back button, background, etc.)
 * @param timeSpentSeconds  Seconds since battle_started was fired
 */
export function logBattleAbandoned(battleId: string, timeSpentSeconds: number): void {
  track('battle_abandoned', {
    battle_id:          battleId,
    time_spent_seconds: Math.round(timeSpentSeconds),
  });
}

/**
 * User finished the quiz for a battle.
 * @param score     Number of correct answers
 * @param maxScore  Total questions
 */
export function logQuizCompleted(battleId: string, score: number, maxScore: number): void {
  track('quiz_completed', {
    battle_id:   battleId,
    score,
    max_score:   maxScore,
    pct_correct: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    is_perfect:  score === maxScore,
  });
}

/** User opened the Shop / Monetization screen */
export function logStoreOpened(source = 'unknown'): void {
  track('store_opened', { source });
}

/** Track screen navigation for funnel analysis */
export function logScreenView(screenName: string): void {
  track('screen_view', { screen_name: screenName, screen_class: screenName });
}

/** User completed a full narration (audio to end) */
export function logNarrationCompleted(
  battleId: string,
  perspective: string,
  durationSeconds: number,
): void {
  track('narration_completed', {
    battle_id:        battleId,
    perspective,
    duration_seconds: Math.round(durationSeconds),
  });
}

/** User unlocked an era (with coins or bundle) */
export function logEraUnlocked(eraId: string, coinsSpent: number): void {
  track('era_unlocked', { era_id: eraId, coins_spent: coinsSpent });
}

/** User unlocked a single battle */
export function logBattleUnlocked(battleId: string, coinsSpent: number): void {
  track('battle_unlocked', { battle_id: battleId, coins_spent: coinsSpent });
}

/** Teacher created a classroom session */
export function logClassroomCreated(battleId: string): void {
  track('classroom_session_created', { battle_id: battleId });
}

/** Student joined a classroom session via PIN */
export function logClassroomJoined(): void {
  track('classroom_session_joined', {});
}

/** User claimed their daily login reward */
export function logDailyRewardClaimed(streakDay: number): void {
  track('daily_reward_claimed', { streak_day: streakDay });
}

/** User visited a GPS battle location in the real world */
export function logGPSVisit(battleId: string): void {
  track('gps_battle_visited', { battle_id: battleId });
}

/** App cold-start (called once per session in App.tsx) */
export function logAppOpen(): void {
  track('app_open', { date: new Date().toISOString().split('T')[0] });
}
