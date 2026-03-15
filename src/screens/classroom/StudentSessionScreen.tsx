// ============================================================
// BATTLE ECHOES — StudentSessionScreen.tsx
// Student's live view — reacts to session state changes:
//   • 'narrating' / 'paused' → listening / waiting screen
//   • 'quiz'                 → answer quiz questions
//   • 'results'              → navigate to SessionResults
//   • 'ended'                → graceful disconnect
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { logScreenView } from '../../services/AnalyticsService';
import { Colors, Radius } from '../../constants/theme';
import {
  listenToSession, submitAnswer, leaveSession,
  calcAnswerPoints, QUESTION_TIME_MS,
  type ClassroomSession,
} from '../../services/SessionService';
import { getQuizForBattle } from '../../data/quizData';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../../services/HapticsService';
import GoldIcon from '../../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const C = Colors;
const OPTION_COLORS = ['#6366f1', '#f97316', '#ec4899', '#14b8a6'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ════════════════════════════════════════════════════════════
// EKRAN
// ════════════════════════════════════════════════════════════
export default function StudentSessionScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteProp<RootStackParamList, 'StudentSession'>>();
  useFocusEffect(useCallback(() => { logScreenView('StudentSession'); }, []));
  const { sessionId, userId, userName } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [session,      setSession]      = useState<ClassroomSession | null>(null);
  const [myAnswers,    setMyAnswers]     = useState<Record<number, number>>({});   // qi → chosenIndex
  const [myScore,      setMyScore]      = useState(0);
  const [pointsGained, setPointsGained] = useState<number | null>(null);         // flash after answer

  // Timer countdown (per question)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(0);

  // Animations
  const pulseAnim  = useRef(new Animated.Value(0.5)).current;
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  // ── Breathing animation (narration phase) ─────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, []);

  // ── Flash points animation ─────────────────────────────────
  const flashPoints = useCallback((pts: number) => {
    setPointsGained(pts);
    Animated.sequence([
      Animated.spring(pointsAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.delay(1200),
      Animated.timing(pointsAnim,  { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setPointsGained(null));
  }, [pointsAnim]);

  // ── Timer logic ───────────────────────────────────────────
  const startTimer = useCallback((startTs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    questionStartRef.current = startTs;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTs;
      const left    = Math.max(0, QUESTION_TIME_MS - elapsed);
      setTimeLeft(Math.ceil(left / 1000));
      if (left === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 250);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(0);
  }, []);

  // ── Firestore listener ────────────────────────────────────
  useEffect(() => {
    const unsub = listenToSession(sessionId, (s) => {
      if (!s) return;
      setSession(s);

      if (s.state === 'results') {
        stopTimer();
        navigation.replace('SessionResults', { sessionId, isHost: false, userId });
      }
      if (s.state === 'ended') {
        stopTimer();
        Alert.alert(t('classroom.session_ended'), t('classroom.teacher_ended'), [
          { text: t('common.ok'), onPress: () => navigation.popToTop() },
        ]);
      }
      // Start/reset timer when new question begins
      if (s.state === 'quiz' && !s.quizState.showAnswer) {
        const ts = s.quizState.questionStartedAt;
        if (ts && ts !== questionStartRef.current) {
          startTimer(ts);
        }
      }
      if (s.state === 'quiz' && s.quizState.showAnswer) {
        stopTimer();
      }
    });

    return () => {
      unsub();
      stopTimer();
      leaveSession(sessionId, userId).catch(() => {});
    };
  }, [sessionId, userId]);

  // ── Answer submission ─────────────────────────────────────
  const handleAnswer = useCallback(async (chosenIndex: number) => {
    if (!session?.quizState) return;
    const qi = session.quizState.questionIndex;
    if (myAnswers[qi] !== undefined) return;  // already answered

    const questions = getQuizForBattle(session.battleId);
    const question  = questions[qi];
    if (!question) return;

    hapticMedium();

    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();

    const elapsed = Date.now() - questionStartRef.current;
    const correct = chosenIndex === question.correct;
    const pts     = calcAnswerPoints(correct, elapsed);

    setMyAnswers(prev => ({ ...prev, [qi]: chosenIndex }));
    setMyScore(prev => prev + pts);
    flashPoints(pts);

    if (correct) hapticSuccess();
    else hapticError();

    try {
      await submitAnswer({
        sessionId,
        userId,
        questionIndex: qi,
        answer:        chosenIndex,
        correct,
        timeMs:        elapsed,
      });
    } catch { /* silent — local state still tracked */ }
  }, [session, myAnswers, sessionId, userId, flashPoints, scaleAnim]);

  // ── Derived ───────────────────────────────────────────────
  const state     = session?.state ?? 'lobby';
  const qi        = session?.quizState.questionIndex ?? 0;
  const showAns   = session?.quizState.showAnswer ?? false;
  const questions = session ? getQuizForBattle(session.battleId) : [];
  const question  = questions[qi];
  const myChoice  = myAnswers[qi];
  const answered  = myChoice !== undefined;

  const timerPct  = Math.min(1, timeLeft / (QUESTION_TIME_MS / 1000));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>

      {/* ─── Header strip ─────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <GoldIcon name="account" lib="mci" size={16} color={C.textSecondary} />
          <Text style={styles.headerName}>{userName}</Text>
        </View>
        <View style={styles.headerScore}>
          <Text style={styles.headerScoreLabel}>{t('classroom.points')}</Text>
          <Text style={styles.headerScoreValue}>{myScore}</Text>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════
          NARRATING / PAUSED
      ══════════════════════════════════════════════════════ */}
      {(state === 'narrating' || state === 'paused' || state === 'lobby') && (
        <View style={styles.centeredContent}>
          <Animated.View style={[styles.glowCircle, { opacity: pulseAnim }]}>
            <GoldIcon
              name={state === 'paused' ? 'pause' : 'microphone'}
              lib="mci"
              size={48}
              color={C.gold}
            />
          </Animated.View>

          <Text style={styles.stateTitle}>
            {state === 'paused' ? t('classroom.narration_paused') : t('classroom.listen_narration')}
          </Text>
          <Text style={styles.stateSubtitle}>
            {state === 'paused'
              ? t('classroom.paused_hint')
              : t('classroom.listen_hint')}
          </Text>

          {session && (
            <View style={styles.infoBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <GoldIcon name="sword" lib="mci" size={14} color={C.textSecondary} />
                <Text style={styles.infoBadgeText}>{session.battleName}</Text>
              </View>
            </View>
          )}

          {state === 'narrating' && (
            <View style={styles.listenHint}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <GoldIcon name="head-question-outline" lib="mci" size={14} color={C.textMuted} />
                <Text style={styles.listenHintText}>{t('classroom.quiz_after_narration')}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════
          QUIZ
      ══════════════════════════════════════════════════════ */}
      {state === 'quiz' && question && (
        <View style={styles.quizContent}>

          {/* Progress + timer */}
          <View style={styles.quizMeta}>
            <Text style={styles.quizProgress}>
              {t('classroom.quiz_question', { current: qi + 1, total: questions.length })}
            </Text>
            {!answered && !showAns && (
              <View style={styles.timerChip}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <GoldIcon
                    name="clock-outline"
                    lib="mci"
                    size={14}
                    color={timeLeft <= 5 ? '#ef4444' : C.textPrimary}
                  />
                  <Text style={[styles.timerText, timeLeft <= 5 && { color: '#ef4444' }]}>
                    {timeLeft}s
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Timer bar */}
          {!answered && !showAns && (
            <View style={styles.timerBar}>
              <Animated.View style={[styles.timerBarFill, {
                width: `${timerPct * 100}%` as any,
                backgroundColor: timerPct > 0.3 ? C.gold : '#ef4444',
              }]} />
            </View>
          )}

          {/* Question */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.question}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsGrid}>
            {question.options.map((opt, i) => {
              let cardStyle: object = styles.optionCard;
              let textStyle: object = styles.optionText;
              const bgColor = OPTION_COLORS[i];

              if (showAns) {
                if (i === question.correct) {
                  cardStyle = [styles.optionCard, styles.optionCorrect];
                } else if (i === myChoice) {
                  cardStyle = [styles.optionCard, styles.optionWrong];
                } else {
                  cardStyle = [styles.optionCard, styles.optionDimmed];
                }
              } else if (answered) {
                if (i === myChoice) {
                  cardStyle = [styles.optionCard, { backgroundColor: `${bgColor}30`, borderColor: bgColor }];
                } else {
                  cardStyle = [styles.optionCard, styles.optionDimmed];
                }
              } else {
                cardStyle = [styles.optionCard, { backgroundColor: `${bgColor}20`, borderColor: `${bgColor}60` }];
              }

              return (
                <TouchableOpacity
                  key={i}
                  style={cardStyle}
                  onPress={() => handleAnswer(i)}
                  disabled={answered || showAns}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optionLabel, { backgroundColor: bgColor }]}>
                    <Text style={styles.optionLabelText}>{OPTION_LABELS[i]}</Text>
                  </View>
                  <Text style={[styles.optionText, textStyle]} numberOfLines={3}>{opt}</Text>
                  {showAns && i === question.correct && (
                    <GoldIcon name="check" lib="mci" size={20} color="#4ade80" />
                  )}
                  {showAns && i === myChoice && i !== question.correct && (
                    <GoldIcon name="close" lib="mci" size={20} color="#ef4444" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Answered state */}
          {answered && !showAns && (
            <View style={styles.waitBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <GoldIcon name="check-circle" lib="mci" size={16} color="#4ade80" />
                <Text style={styles.waitBadgeText}>{t('classroom.answered_wait')}</Text>
              </View>
            </View>
          )}

          {/* Explanation after reveal */}
          {showAns && question.explanation && (
            <View style={styles.explanationBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <GoldIcon name="lightbulb-outline" lib="mci" size={14} color={C.gold} />
                <Text style={styles.explanationLabel}>{t('quiz.explanation')}</Text>
              </View>
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Floating points popup ──────────────────────────── */}
      {pointsGained !== null && (
        <Animated.View style={[styles.pointsPopup, {
          opacity: pointsAnim,
          transform: [{ scale: pointsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        }]}>
          <Text style={[styles.pointsPopupText, pointsGained > 0 ? styles.pointsGold : styles.pointsGray]}>
            {pointsGained > 0 ? `+${pointsGained} ${t('classroom.pts')}` : `0 ${t('classroom.pts')}`}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  headerName:       { fontSize: 15, color: C.textSecondary, fontWeight: '600' },
  headerScore:      { alignItems: 'flex-end' },
  headerScoreLabel: { fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerScoreValue: { fontSize: 20, color: C.gold, fontWeight: '800' },

  // ── Narration / Paused ──────────────────────────────────
  centeredContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 20, paddingHorizontal: 32,
  },
  glowCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: `${C.gold}15`,
    borderWidth: 2, borderColor: `${C.gold}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  glowIcon:      {},
  stateTitle:    { fontSize: 22, color: C.textPrimary, fontWeight: '800', textAlign: 'center' },
  stateSubtitle: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  infoBadge: {
    backgroundColor: C.backgroundCard,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  infoBadgeText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },

  listenHint: {
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: `${C.gold}25`,
  },
  listenHintText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  // ── Quiz ────────────────────────────────────────────────
  quizContent: {
    flex: 1, paddingHorizontal: 14, paddingTop: 14, gap: 12,
  },
  quizMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  quizProgress: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  timerChip: {
    backgroundColor: C.backgroundElevated,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  timerText: { fontSize: 14, color: C.textPrimary, fontWeight: '700' },

  timerBar: {
    height: 5, backgroundColor: C.backgroundElevated, borderRadius: 3, overflow: 'hidden',
  },
  timerBarFill: { height: '100%', borderRadius: 3 },

  questionCard: {
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: `${C.gold}25`,
    padding: 16,
  },
  questionText: { fontSize: 15, color: C.textPrimary, lineHeight: 22, fontWeight: '600' },

  optionsGrid: { gap: 10, flex: 1 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: C.borderDefault,
    padding: 14,
  },
  optionCorrect: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderColor: '#4ade80',
  },
  optionWrong: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: '#ef4444',
  },
  optionDimmed: {
    opacity: 0.4,
    backgroundColor: C.backgroundCard,
    borderColor: C.borderDefault,
  },
  optionLabel: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  optionLabelText: { fontSize: 14, color: '#fff', fontWeight: '800' },
  optionText: { flex: 1, fontSize: 14, color: C.textPrimary, lineHeight: 18 },
  optionCheck: {},
  optionX:     {},

  waitBadge: {
    backgroundColor: 'rgba(74,222,128,0.10)',
    borderRadius: Radius.md, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.30)',
  },
  waitBadgeText: { fontSize: 13, color: '#4ade80', fontWeight: '600' },

  explanationBox: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: `${C.gold}30`, gap: 6,
  },
  explanationLabel: { fontSize: 12, color: C.gold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  explanationText:  { fontSize: 13, color: C.textSecondary, lineHeight: 18 },

  // ── Points popup ─────────────────────────────────────────
  pointsPopup: {
    position: 'absolute', top: '40%', alignSelf: 'center',
    backgroundColor: C.backgroundCard,
    borderRadius: 30, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 2, borderColor: C.gold,
    shadowColor: C.gold, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  pointsPopupText: { fontSize: 22, fontWeight: '900' },
  pointsGold:      { color: C.gold },
  pointsGray:      { color: C.textMuted },
});
