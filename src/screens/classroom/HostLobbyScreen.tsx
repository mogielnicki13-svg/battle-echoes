// ============================================================
// BATTLE ECHOES — HostLobbyScreen.tsx
// Teacher's lobby — displays PIN, waits for students to join,
// then launches the classroom session
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert, Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { logScreenView } from '../../services/AnalyticsService';
import { Colors, Radius } from '../../constants/theme';
import { useAppStore } from '../../store';
import {
  listenToSession,
  listenToParticipants,
  startNarration,
  endSession,
  type ClassroomSession,
  type Participant,
} from '../../services/SessionService';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelect } from '../../services/HapticsService';
import GoldIcon, { Icon } from '../../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const C = Colors;

// ════════════════════════════════════════════════════════════
// EKRAN
// ════════════════════════════════════════════════════════════
export default function HostLobbyScreen() {
  const navigation  = useNavigation<any>();
  const route       = useRoute<RouteProp<RootStackParamList, 'HostLobby'>>();
  const { sessionId, pin, battleId, battleName } = route.params;
  useFocusEffect(useCallback(() => { logScreenView('HostLobby'); }, []));
  const { user } = useAppStore();
  const insets  = useSafeAreaInsets();
  const { t } = useTranslation();

  const [session,      setSession]      = useState<ClassroomSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [starting,     setStarting]     = useState(false);
  const [pinCopied,    setPinCopied]    = useState(false);

  // Pulsating dot animation
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  // Stagger for student rows
  const listFade  = useRef(new Animated.Value(0)).current;

  // Pulse animation (waiting indicator)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Subscribe to Firestore
  useEffect(() => {
    const unsubSess = listenToSession(sessionId, setSession);
    const unsubPart = listenToParticipants(sessionId, (list) => {
      setParticipants(list);
      // Fade in list on update
      Animated.timing(listFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
    return () => { unsubSess(); unsubPart(); };
  }, [sessionId]);

  const handleCopyPin = useCallback(() => {
    hapticLight();
    Clipboard.setString(pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  }, [pin]);

  const handleStart = useCallback(async () => {
    if (participants.length === 0) {
      Alert.alert(t('classroom.no_students'), t('classroom.no_students_hint'));
      return;
    }
    setStarting(true);
    hapticMedium();
    try {
      await startNarration(sessionId, 'narrator');
      hapticSuccess();
      navigation.replace('HostSession', { sessionId, pin, battleId, battleName });
    } catch (e) {
      setStarting(false);
      Alert.alert(t('common.error'), t('classroom.start_error'));
    }
  }, [participants.length, sessionId, pin, battleId, battleName, navigation]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('classroom.end_session_title'),
      t('classroom.end_session_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('classroom.end'), style: 'destructive',
          onPress: async () => {
            await endSession(sessionId, pin).catch(() => {});
            navigation.goBack();
          },
        },
      ]
    );
  }, [sessionId, pin, navigation]);

  // PIN digits separated
  const pinDigits = pin.split('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <GoldIcon name="close" lib="mci" size={16} color={C.textMuted} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GoldIcon name="school" lib="mci" size={20} color={C.textPrimary} />
            <Text style={styles.headerTitle}>{t('classroom.lobby_title')}</Text>
          </View>
          <Text style={styles.headerSub} numberOfLines={1}>{battleName}</Text>
        </View>
        {/* Live indicator */}
        <Animated.View style={[styles.liveChip, { opacity: pulseAnim }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* PIN Section */}
        <View style={styles.pinSection}>
          <Text style={styles.pinLabel}>{t('classroom.join_code')}</Text>
          <Text style={styles.pinHint}>{t('classroom.join_code_hint')}</Text>

          <TouchableOpacity onPress={handleCopyPin} activeOpacity={0.85}>
            <View style={styles.pinBox}>
              <View style={styles.pinDigitsRow}>
                {pinDigits.map((d, i) => (
                  <View key={i} style={[styles.pinDigit, i === 3 && styles.pinDigitGap]}>
                    <Text style={styles.pinDigitText}>{d}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <GoldIcon
                  name={pinCopied ? 'check' : 'clipboard-text-outline'}
                  lib="mci"
                  size={12}
                  color={C.textMuted}
                />
                <Text style={styles.pinCopyHint}>
                  {pinCopied ? t('classroom.copied') : t('classroom.tap_to_copy')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* QR Placeholder */}
          <View style={styles.qrBox}>
            <View style={styles.qrPlaceholder}>
              <GoldIcon name="qrcode" lib="mci" size={52} color={C.textMuted} />
              <Text style={styles.qrPin}>{pin}</Text>
            </View>
            <Text style={styles.qrNote}>
              Zainstaluj{' '}
              <Text style={styles.qrNoteCode}>react-native-qrcode-svg</Text>
              {' '}aby wyświetlić QR code
            </Text>
          </View>
        </View>

        {/* Student count + list */}
        <View style={styles.studentsSection}>
          <View style={styles.studentsSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <GoldIcon name="account-group" lib="mci" size={18} color={C.textPrimary} />
              <Text style={styles.sectionTitle}>{t('classroom.students_count', { count: participants.length })}</Text>
            </View>
            <Animated.View style={[styles.waitingChip, { opacity: pulseAnim }]}>
              <Text style={styles.waitingChipText}>{t('classroom.waiting')}</Text>
            </Animated.View>
          </View>

          {participants.length === 0 ? (
            <View style={styles.emptyStudents}>
              <GoldIcon name="clock-outline" lib="mci" size={36} color={C.textMuted} />
              <Text style={styles.emptyText}>
                {t('classroom.no_one_joined')}
              </Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: listFade, gap: 8 }}>
              {participants.map((p, i) => (
                <StudentRow key={p.userId} participant={p} index={i} />
              ))}
            </Animated.View>
          )}
        </View>

        {/* Session info */}
        <View style={styles.infoBox}>
          <InfoRow iconName="sword"         label={t('classroom.battle')}   value={battleName} />
          <InfoRow iconName="account"       label={t('classroom.host')}     value={user?.name ?? t('classroom.teacher')} />
          <InfoRow iconName="clock-outline" label={t('classroom.validity')} value={t('classroom.validity_value')} />
        </View>

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.bottomCount}>
          {participants.length === 0
            ? t('classroom.wait_for_students')
            : t('classroom.students_ready', { count: participants.length })
          }
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, (participants.length === 0 || starting) && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={participants.length === 0 || starting}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <GoldIcon
              name={starting ? 'timer-sand' : 'play'}
              lib="mci"
              size={18}
              color="#000"
            />
            <Text style={styles.startBtnText}>
              {starting ? t('classroom.starting') : t('classroom.start_lesson')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────
function StudentRow({ participant, index }: { participant: Participant; index: number }) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.studentRow, {
      transform: [{ translateX: slideAnim }],
      opacity: fadeAnim,
    }]}>
      <View style={styles.studentAvatar}>
        <Text style={{ fontSize: 20 }}>{participant.avatar}</Text>
      </View>
      <Text style={styles.studentName}>{participant.name}</Text>
      <View style={styles.studentReadyBadge}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <GoldIcon name="check" lib="mci" size={10} color="#4ade80" />
          <Text style={styles.studentReadyText}>{t('classroom.ready')}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function InfoRow({ iconName, label, value }: { iconName: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <GoldIcon name={iconName} lib="mci" size={16} color={C.textMuted} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, gap: 10,
  },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: {},
  headerTitle:   { fontSize: 20, color: C.textPrimary, fontWeight: '700' },
  headerSub:     { fontSize: 13, color: C.textMuted, marginTop: 2 },

  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
  },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' },
  liveText: { fontSize: 11, color: '#ef4444', fontWeight: '800', letterSpacing: 1 },

  scroll: { padding: 16, gap: 20 },

  // PIN
  pinSection:   { alignItems: 'center', gap: 10 },
  pinLabel:     { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  pinHint:      { fontSize: 13, color: C.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  pinBox: {
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.xl ?? 20,
    borderWidth: 2, borderColor: `${C.gold}50`,
    paddingVertical: 20, paddingHorizontal: 24,
    alignItems: 'center', gap: 10,
    width: '100%',
  },
  pinDigitsRow:  { flexDirection: 'row', gap: 10 },
  pinDigit: {
    width: 44, height: 56,
    backgroundColor: C.backgroundElevated,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${C.gold}30`,
  },
  pinDigitGap:   { marginLeft: 8 }, // extra space in middle
  pinDigitText:  { fontSize: 28, color: C.gold, fontWeight: '800', fontFamily: 'monospace' },
  pinCopyHint:   { fontSize: 12, color: C.textMuted },

  qrBox: { alignItems: 'center', gap: 8, width: '100%' },
  qrPlaceholder: {
    width: 120, height: 120,
    backgroundColor: C.backgroundElevated,
    borderRadius: 12, borderWidth: 1, borderColor: C.borderDefault,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  qrIcon:  {},
  qrPin:   { fontSize: 12, color: C.textMuted, fontFamily: 'monospace' },
  qrNote:  { fontSize: 11, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  qrNoteCode: { color: C.gold },

  // Students
  studentsSection:       { gap: 10 },
  studentsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 16, color: C.textPrimary, fontWeight: '700' },
  waitingChip: {
    backgroundColor: C.backgroundElevated,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  waitingChipText: { fontSize: 11, color: C.textMuted },

  emptyStudents: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyIcon:     {},
  emptyText:     { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    padding: 12,
  },
  studentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  studentName:        { flex: 1, fontSize: 15, color: C.textPrimary, fontWeight: '600' },
  studentReadyBadge: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.40)',
  },
  studentReadyText: { fontSize: 11, color: '#4ade80', fontWeight: '700' },

  // Info box
  infoBox: {
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    padding: 14, gap: 10,
  },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIcon:  {},
  infoLabel: { fontSize: 13, color: C.textMuted, width: 68 },
  infoValue: { flex: 1, fontSize: 13, color: C.textSecondary, fontWeight: '600' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.backgroundCard,
    borderTopWidth: 1, borderTopColor: C.borderDefault,
    paddingTop: 12, paddingHorizontal: 16, gap: 8,
  },
  bottomCount: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  startBtn: {
    backgroundColor: C.gold,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: C.backgroundElevated },
  startBtnText:     { fontSize: 16, color: '#000', fontWeight: '800' },
});
