// ============================================================
// BATTLE ECHOES — ErrorBoundary.tsx
//
// React class-component error boundary that:
//   • Catches rendering errors that ErrorUtils.setGlobalHandler
//     does NOT catch (React tree render errors).
//   • Reports them to CrashReportingService.
//   • Shows a clean "something went wrong" fallback UI instead
//     of a white crash screen in production.
//
// Usage (wrap the whole app in App.tsx):
//   <ErrorBoundary>
//     <YourApp />
//   </ErrorBoundary>
// ============================================================

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import i18next from 'i18next';
import { logError } from '../services/CrashReportingService';
import { Colors, Radius } from '../constants/theme';

// ── Types ──────────────────────────────────────────────────────
interface Props {
  children:  ReactNode;
  /** Optional custom fallback. Receives error + resetFn. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state  = { hasError: false, error: null };
    this.reset  = this.reset.bind(this);
  }

  // ── React lifecycle ──────────────────────────────────────────
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Report to CrashReportingService with the component stack
    logError(error, {
      componentStack: info.componentStack?.slice(0, 500) ?? 'unknown',
      source:         'ErrorBoundary',
    });
  }

  // ── Reset ────────────────────────────────────────────────────
  reset(): void {
    this.setState({ hasError: false, error: null });
  }

  // ── Render ───────────────────────────────────────────────────
  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError || !error) return children;

    // Custom fallback provided by parent
    if (fallback) return fallback(error, this.reset);

    // Default fallback UI
    return <DefaultCrashScreen error={error} onReset={this.reset} />;
  }
}

// ── Default Crash Screen ──────────────────────────────────────
function DefaultCrashScreen({
  error, onReset,
}: { error: Error; onReset: () => void }) {
  const isDev = __DEV__;

  return (
    <View style={s.container}>
      <View style={s.card}>
        {/* Icon */}
        <Text style={s.icon}>⚔️</Text>

        {/* Title */}
        <Text style={s.title}>{i18next.t('common.crash_title')}</Text>
        <Text style={s.subtitle}>
          {i18next.t('common.crash_subtitle')}
        </Text>

        {/* Error details — only in dev builds */}
        {isDev && (
          <ScrollView style={s.errorBox} showsVerticalScrollIndicator={false}>
            <Text style={s.errorTitle}>🐛 Dev info</Text>
            <Text style={s.errorMessage}>{error.message}</Text>
            {error.stack && (
              <Text style={s.errorStack} numberOfLines={20}>
                {error.stack}
              </Text>
            )}
          </ScrollView>
        )}

        {/* Actions */}
        <TouchableOpacity style={s.retryBtn} onPress={onReset} activeOpacity={0.85}>
          <Text style={s.retryBtnText}>{i18next.t('common.crash_retry')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.xl ?? 20, padding: 24, gap: 14,
    borderWidth: 1, borderColor: Colors.borderDefault,
    alignItems: 'center',
  },
  icon:     { fontSize: 52 },
  title:    { fontSize: 22, color: Colors.textPrimary,   fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textMuted,     textAlign: 'center', lineHeight: 20 },

  errorBox: {
    maxHeight: 200, width: '100%',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  errorTitle:   { fontSize: 11, color: Colors.gold,        fontWeight: '700', marginBottom: 4 },
  errorMessage: { fontSize: 12, color: '#ef4444',           marginBottom: 8 },
  errorStack:   { fontSize: 10, color: Colors.textMuted,    fontFamily: 'monospace', lineHeight: 14 },

  retryBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 32,
    width: '100%', alignItems: 'center',
  },
  retryBtnText: { fontSize: 15, color: '#000', fontWeight: '800' },
});
