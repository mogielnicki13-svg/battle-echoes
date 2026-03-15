// ============================================================
// BATTLE ECHOES — StudentJoinScreen.tsx
// Kahoot-style PIN entry for students:
//   • 6-digit PIN numpad
//   • Validates PIN via lookupPin()
//   • Auto-joins session and navigates to StudentSessionScreen
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../../services/AnalyticsService';
import { Colors, Radius } from '../../constants/theme';
import GoldIcon from '../../components/GoldIcon';
import { useAppStore } from '../../store';
import {
  lookupPin, joinSession, randomAvatar,
} from '../../services/SessionService';
import { hapticLight, hapticMedium, hapticError, hapticSuccess } from '../../services/HapticsService';
import { useTranslation } from 'react-i18next';

const C = Colors;

const NUMPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

// ════════════════════════════════════════════════════════════
// EKRAN
// ════════════════════════════════════════════════════════════
export default function StudentJoinScreen() {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  useFocusEffect(useCallback(() => { logScreenView('StudentJoin'); }, []));
  const { user }   = useAppStore();
  const { t }      = useTranslation();

  const [pin,     setPin]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Shake animation for invalid PIN
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const doShake = useCallback(() => {
    hapticError();
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0,  duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleKey = useCallback((key: string) => {
    if (loading) return;
    setError('');
    if (key === '⌫') {
      hapticLight();
      setPin(p => p.slice(0, -1));
    } else if (key === '') {
      // empty spacer — no-op
    } else {
      hapticLight();
      if (pin.length < 6) setPin(p => p + key);
    }
  }, [pin, loading]);

  const handleJoin = useCallback(async () => {
    if (pin.length < 6) {
      doShake();
      setError(t('classroom.enter_full_pin'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await lookupPin(pin);
      if (!result) {
        doShake();
        setError(t('classroom.session_not_found'));
        setLoading(false);
        return;
      }

      // Join as participant
      const userId = user?.id ?? `guest_${Math.random().toString(36).substring(2, 8)}`;
      const name   = user?.name ?? 'Uczeń';
      const avatar = randomAvatar();

      await joinSession({
        sessionId: result.sessionId,
        userId,
        name,
        avatar,
      });

      hapticSuccess();
      navigation.replace('StudentSession', {
        sessionId: result.sessionId,
        userId,
        userName: name,
      });
    } catch (e) {
      doShake();
      setError(t('classroom.connection_error'));
    } finally {
      setLoading(false);
    }
  }, [pin, user, navigation, doShake]);

  // Digits display
  const digits = Array(6).fill('').map((_, i) => pin[i] ?? '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon + Title */}
        <View style={styles.titleSection}>
          <GoldIcon name="school" lib="mci" size={52} color={C.gold} />
          <Text style={styles.title}>{t('classroom.join_title')}</Text>
          <Text style={styles.subtitle}>{t('classroom.join_subtitle')}</Text>
        </View>

        {/* PIN display */}
        <Animated.View style={[styles.pinRow, { transform: [{ translateX: shakeAnim }] }]}>
          {digits.map((d, i) => (
            <View
              key={i}
              style={[
                styles.pinCell,
                d ? styles.pinCellFilled : null,
                i === pin.length && styles.pinCellActive,
              ]}
            >
              <Text style={styles.pinCellText}>{d}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <GoldIcon name="alert-circle-outline" lib="mci" size={14} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        ) : null}

        {/* Numpad */}
        <View style={styles.numpad}>
          {NUMPAD.map((key, idx) => (
            key === '' ? (
              <View key={idx} style={styles.numKey} />
            ) : (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.numKey,
                  key === '⌫' && styles.numKeyDelete,
                  (loading || (key !== '⌫' && pin.length >= 6)) && styles.numKeyDisabled,
                ]}
                onPress={() => handleKey(key)}
                disabled={loading || (key !== '⌫' && pin.length >= 6)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.numKeyText,
                  key === '⌫' && styles.numKeyDeleteText,
                ]}>
                  {key}
                </Text>
              </TouchableOpacity>
            )
          ))}
        </View>

        {/* Join button */}
        <TouchableOpacity
          style={[styles.joinBtn, (pin.length < 6 || loading) && styles.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={pin.length < 6 || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <GoldIcon name="sword" lib="mci" size={18} color="#000" />
              <Text style={styles.joinBtnText}>{t('classroom.join_session')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: insets.bottom }} />
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  backBtn: {
    position: 'absolute', left: 16, zIndex: 10,
    paddingVertical: 4,
  },
  backBtnText: { fontSize: 16, color: C.gold, fontWeight: '600' },

  content: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 56, gap: 28,
    justifyContent: 'center',
  },

  titleSection: { alignItems: 'center', gap: 8 },
  bigIcon:  {},  // unused — replaced by GoldIcon
  title:    { fontSize: 26, color: C.textPrimary, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  // PIN row
  pinRow: { flexDirection: 'row', gap: 10 },
  pinCell: {
    width: 44, height: 58,
    backgroundColor: C.backgroundElevated,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.borderDefault,
  },
  pinCellFilled: { borderColor: `${C.gold}60`, backgroundColor: `${C.gold}10` },
  pinCellActive: { borderColor: C.gold },
  pinCellText:   { fontSize: 28, color: C.gold, fontWeight: '800', fontFamily: 'monospace' },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: Radius.sm,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: { fontSize: 13, color: '#ef4444', textAlign: 'center' },

  // Numpad
  numpad: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: 264, gap: 10,
    justifyContent: 'space-between',
  },
  numKey: {
    width: 78, height: 64,
    backgroundColor: C.backgroundCard,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.borderDefault,
  },
  numKeyDelete:     { backgroundColor: 'rgba(239,68,68,0.08)' },
  numKeyDisabled:   { opacity: 0.35 },
  numKeyText:       { fontSize: 22, color: C.textPrimary, fontWeight: '600' },
  numKeyDeleteText: { fontSize: 20, color: '#ef4444' },

  // Join button
  joinBtn: {
    backgroundColor: C.gold, borderRadius: Radius.md,
    paddingVertical: 16, width: '100%', alignItems: 'center',
  },
  joinBtnDisabled: { backgroundColor: C.backgroundElevated },
  joinBtnText:     { fontSize: 16, color: '#000', fontWeight: '800' },
});
