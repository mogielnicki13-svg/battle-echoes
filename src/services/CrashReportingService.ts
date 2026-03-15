// ============================================================
// BATTLE ECHOES — CrashReportingService.ts
//
// Central crash & error reporting with two backends:
//
//   1. SENTRY (primary, recommended)
//      Install:  npx expo install @sentry/react-native
//      Set DSN:  SENTRY_DSN constant below
//      The service will auto-init on first use if DSN is set.
//
//   2. FIREBASE ANALYTICS (fallback, zero extra deps)
//      Non-fatal errors are sent as `non_fatal_error` events.
//      This works immediately with your existing firebase setup.
//
// Global JS errors are caught via ErrorUtils.setGlobalHandler
// (React Native's built-in mechanism — works in all RN versions).
//
// A rolling crash log (last 20 entries) is persisted in
// AsyncStorage for inspection in the DeveloperSettingsScreen.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Config ────────────────────────────────────────────────────
//
// TO ENABLE SENTRY:
//   1. npm install @sentry/react-native
//   2. npx @sentry/wizard@latest -i reactNative
//   3. Paste your DSN below
//
const SENTRY_DSN = '';  // ← YOUR SENTRY DSN HERE (leave empty to skip)

// ── Storage key ───────────────────────────────────────────────
const KEY_CRASH_LOG  = 'be_crash_log';
const MAX_CRASH_LOGS = 20;

// ── Types ──────────────────────────────────────────────────────
export type CrashSeverity = 'fatal' | 'error' | 'warning' | 'info';

export interface CrashEntry {
  message:   string;
  stack?:    string;
  context?:  Record<string, unknown>;
  severity:  CrashSeverity;
  timestamp: number;
  isFatal:   boolean;
}

// ── Sentry lazy bridge ─────────────────────────────────────────
// We lazy-require Sentry so the app never crashes if the package
// isn't installed. The pattern mirrors FirebaseService.ts.
let _sentry:       any     = null;
let _sentryInited: boolean = false;

function getSentry(): any | null {
  if (_sentryInited) return _sentry;
  _sentryInited = true;
  if (!SENTRY_DSN) return null;
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: SENTRY_DSN,
      // Sample 20% of performance traces (adjust for your volume)
      tracesSampleRate:           0.2,
      // Automatic session tracking (for crash-free session %)
      enableAutoSessionTracking:  true,
      // Don't send events in local dev unless you want to test
      enabled: !__DEV__,
    });
    _sentry = Sentry;
    console.info('[CrashReporting] Sentry initialized');
    return Sentry;
  } catch (e) {
    console.warn('[CrashReporting] Sentry not available (not installed):', e);
    return null;
  }
}

// ── Firebase Analytics fallback ───────────────────────────────
// Only used when Sentry is not configured.
function tryFirebaseEvent(name: string, params: Record<string, unknown>): void {
  try {
    const fb  = require('firebase/app');
    const fa  = require('firebase/analytics');
    const app = fb.getApps()[0];
    if (!app) return;
    const analytics = fa.getAnalytics(app);
    fa.logEvent(analytics, name, params);
  } catch {
    // Silent — Firebase might not be initialized yet
  }
}

// ── Local crash log ────────────────────────────────────────────
function writeCrashLog(entry: CrashEntry): void {
  (async () => {
    try {
      const raw  = await AsyncStorage.getItem(KEY_CRASH_LOG);
      const log: CrashEntry[] = raw ? JSON.parse(raw) : [];
      log.push(entry);
      await AsyncStorage.setItem(
        KEY_CRASH_LOG,
        JSON.stringify(log.slice(-MAX_CRASH_LOGS)),
      );
    } catch {}
  })();
}

export async function getCrashLog(): Promise<CrashEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CRASH_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearCrashLog(): Promise<void> {
  await AsyncStorage.removeItem(KEY_CRASH_LOG);
}

// ── Internal builder ──────────────────────────────────────────
function buildEntry(
  error:    Error | string,
  context?: Record<string, unknown>,
  severity: CrashSeverity = 'error',
  isFatal = false,
): CrashEntry {
  const isErr  = error instanceof Error;
  const message = isErr ? error.message : String(error);
  const stack   = isErr ? error.stack   : undefined;
  return { message, stack, context, severity, timestamp: Date.now(), isFatal };
}

// ════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════

/**
 * Log a non-fatal error with optional structured context.
 *
 * Usage:
 *   logError(err, { battleId: 'grunwald-1410', action: 'load_audio' });
 *   logError('Failed to load audio for Battle_ID_4', { source: 'NarrationScreen' });
 */
export function logError(
  error:    Error | string,
  context?: Record<string, unknown>,
): void {
  const entry = buildEntry(error, context, 'error', false);

  // 1. Always write to local device log
  writeCrashLog(entry);

  // 2. Console (in dev builds only — avoid log pollution in prod)
  if (__DEV__) {
    console.error('[CrashReporting] Non-fatal:', entry.message, context ?? '');
  }

  // 3. Sentry (if installed + DSN configured)
  const Sentry = getSentry();
  if (Sentry) {
    Sentry.withScope((scope: any) => {
      scope.setLevel('error');
      if (context) scope.setContext('custom_context', context);
      Sentry.captureException(
        error instanceof Error ? error : new Error(entry.message),
      );
    });
    return;
  }

  // 4. Firebase Analytics fallback (Sentry not available)
  tryFirebaseEvent('non_fatal_error', {
    error_message: entry.message.slice(0, 100), // Firebase param limit
    context_keys:  context ? Object.keys(context).join(',') : '',
  });
}

/**
 * Log a warning — doesn't trigger alerts but is visible in
 * Sentry breadcrumbs and the local crash log.
 *
 * Usage:
 *   logWarning('Audio playback stalled', { retryCount: 3 });
 */
export function logWarning(
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry = buildEntry(message, context, 'warning', false);
  writeCrashLog(entry);

  if (__DEV__) {
    console.warn('[CrashReporting] Warning:', message, context ?? '');
  }

  const Sentry = getSentry();
  if (Sentry) {
    Sentry.captureMessage(message, 'warning');
  }
}

/**
 * Attach a breadcrumb (lightweight trace step) to the current
 * Sentry session. Breadcrumbs appear in the error context when
 * a crash happens later, helping you replay what the user did.
 *
 * Usage:
 *   addBreadcrumb('navigation', 'Opened BattleDetailScreen', { battleId });
 */
export function addBreadcrumb(
  category: string,
  message:  string,
  data?:    Record<string, unknown>,
): void {
  const Sentry = getSentry();
  if (Sentry) {
    Sentry.addBreadcrumb({ category, message, data, level: 'info' });
  }
}

/**
 * Set the anonymous user context so crashes are attributed to
 * a specific (non-identifiable) user session.
 * NEVER pass raw email/name — only the anonymized ID from AnalyticsService.
 *
 * Usage:
 *   setUserContext(anonymizeUserId(user.id), { provider: user.provider });
 */
export function setUserContext(
  anonymizedId: string,
  extra?: Record<string, string>,
): void {
  const Sentry = getSentry();
  if (Sentry) {
    Sentry.setUser({ id: anonymizedId, ...extra });
  }
}

/** Call on sign-out to clear user context from Sentry sessions */
export function clearUserContext(): void {
  const Sentry = getSentry();
  if (Sentry) {
    Sentry.configureScope((scope: any) => scope.setUser(null));
  }
}

// ════════════════════════════════════════════════════════════════
// GLOBAL JS ERROR HANDLER
// ════════════════════════════════════════════════════════════════
// Call initGlobalErrorHandler() ONCE at the top of App.tsx.
// It patches ErrorUtils so all unhandled Promise rejections and
// uncaught JS exceptions flow through our reporting pipeline.
// ════════════════════════════════════════════════════════════════

let _globalHandlerInstalled = false;

export function initGlobalErrorHandler(): void {
  if (_globalHandlerInstalled) return;
  _globalHandlerInstalled = true;

  // Grab the existing handler so we can chain to it.
  // React Native uses this for the red screen in dev builds.
  const previousHandler = (ErrorUtils as any).getGlobalHandler() as
    ((err: Error, isFatal?: boolean) => void) | undefined;

  (ErrorUtils as any).setGlobalHandler((error: Error, isFatal?: boolean) => {
    const entry = buildEntry(error, undefined, isFatal ? 'fatal' : 'error', !!isFatal);

    // 1. Local device log (always, synchronously enqueued)
    writeCrashLog(entry);

    // 2. Console
    console.error(
      `[CrashReporting] ${isFatal ? '💀 FATAL CRASH' : '⚡ JS Error'}:`,
      error.message,
    );

    // 3. Sentry
    const Sentry = getSentry();
    if (Sentry) {
      Sentry.captureException(error);
    } else {
      // Firebase Analytics fallback for fatal events
      tryFirebaseEvent('app_crash', {
        error_message: error.message.slice(0, 100),
        is_fatal:      String(!!isFatal),
      });
    }

    // 4. Chain to the original handler so RN red screen still works in dev
    previousHandler?.(error, isFatal);
  });

  console.info('[CrashReporting] Global error handler installed');
}

// ════════════════════════════════════════════════════════════════
// DEV UTILITY: Force a crash (used by DeveloperSettingsScreen)
// ════════════════════════════════════════════════════════════════

/**
 * Triggers a simulated fatal crash by calling the global error
 * handler directly. Use the "Force Crash" button in Dev Settings
 * to verify that Sentry/Crashlytics receives the event.
 */
export function forceCrash(message = 'Developer Force Crash'): void {
  const handler = (ErrorUtils as any).getGlobalHandler();
  handler(new Error(message), true);
}
