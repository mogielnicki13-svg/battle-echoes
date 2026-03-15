// ============================================================
// BATTLE ECHOES — HostSessionScreen.tsx
// Teacher's live control panel during a classroom session:
//   • Play / Pause narration
//   • Navigate scenes (Prev / Next)
//   • Start Quiz, advance questions, show answers
//   • View real-time answer counts per question
//   • End session → SessionResults
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { logScreenView } from '../../services/AnalyticsService';
import { Colors, Radius } from '../../constants/theme';
import {
  listenToSession, listenToParticipants,
  setPlayingState, setCurrentScene,
  startQuiz, advanceQuiz, showResults, endSession,
  type ClassroomSession, type Participant,
} from '../../services/SessionService';
import { getQuizForBattle } from '../../data/quizData';
import { hapticLight, hapticMedium, hapticSuccess } from '../../services/HapticsService';
import GoldIcon from '../../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const C = Colors;

// ────────────────────────────────────────────────────────────
// Scenes (simplified — in production, pull from narration data)
// ────────────────────────────────────────────────────────────
const SCENE_TITLES = [
  'Prolog — Tło historyczne',
  'Scena 1 — Siły i plany',
  'Scena 2 — Starcie',
  'Scena 3 — Przełom',
  'Epilog — Następstwa',
];

// ════════════════════════════════════════════════════════════
// EKRAN
// ════════════════════════════════════════════════════════════
export default function HostSessionScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteProp<RootStackParamList, 'HostSession'>>();
  useFocusEffect(useCallback(() => { logScreenView('HostSession'); }, []));
  const { sessionId, pin, battleId, battleName } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [session,      setSession]      = useState<ClassroomSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [busy,         setBusy]         = useState(false);

  // Track quiz questions for this battle
  const questions = getQuizForBattle(battleId);

  // Pulsing indicator for LIVE mode
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Subscribe to Firestore
  useEffect(() => {
    const unsubSess = listenToSession(sessionId, (s) => {
      setSession(s);
      // Auto-navigate to results when host shows results
      if (s?.state === 'results') {
        navigation.replace('SessionResults', {
          sessionId, isHost: true, userId: s.hostId,
        });
      }
      // Auto-navigate to lobby if session ended externally
      if (s?.state === 'ended') {
        navigation.popToTop();
      }
    });
    const unsubPart = listenToParticipants(sessionId, setParticipants);
    return () => { unsubSess(); unsubPart(); };
  }, [sessionId]);

  // ── Helpers ──────────────────────────────────────────────
  const run = useCallback(async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    hapticLight();
    try { await fn(); }
    catch { Alert.alert(t('common.error'), t('classroom.action_error')); }
    finally { setBusy(false); }
  }, [busy]);

  // ── Narration controls ───────────────────────────────────
  const handleTogglePlay = useCallback(() => run(async () => {
    hapticMedium();
    await setPlayingState(sessionId, !session?.isPlaying);
  }), [session?.isPlaying, sessionId, run]);

  const handlePrevScene = useCallback(() => run(async () => {
    const cur = session?.currentScene ?? 0;
    if (cur > 0) await setCurrentScene(sessionId, cur - 1);
  }), [session?.currentScene, sessionId, run]);

  const handleNextScene = useCallback(() => run(async () => {
    const cur   = session?.currentScene ?? 0;
    const maxSc = SCENE_TITLES.length - 1;
    if (cur < maxSc) await setCurrentScene(sessionId, cur + 1);
  }), [session?.currentScene, sessionId, run]);

  // ── Quiz controls ────────────────────────────────────────
  const handleStartQuiz = useCallback(() => {
    Alert.alert(
      t('classroom.start_quiz_title'),
      t('classroom.start_quiz_msg', { count: questions.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('classroom.start'), onPress: () => run(async () => {
          hapticSuccess();
          await startQuiz(sessionId);
        }) },
      ]
    );
  }, [questions.length, sessionId, run]);

  const handleShowAnswer = useCallback(() => run(async () => {
    const qi = session?.quizState.questionIndex ?? 0;
    hapticMedium();
    await advanceQuiz(sessionId, qi, true);
  }), [session?.quizState.questionIndex, sessionId, run]);

  const handleNextQuestion = useCallback(() => run(async () => {
    const qi   = session?.quizState.questionIndex ?? 0;
    const next = qi + 1;
    if (next >= questions.length) {
      // All questions done → results
      hapticSuccess();
      await showResults(sessionId);
    } else {
      hapticMedium();
      await advanceQuiz(sessionId, next, false);
    }
  }), [session?.quizState, questions.length, sessionId, run]);

  // ── End session ──────────────────────────────────────────
  const handleEndSession = useCallback(() => {
    Alert.alert(
      t('classroom.end_session_title'),
      t('classroom.end_session_disconnect'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('classroom.end'), style: 'destructive', onPress: () => run(async () => {
          await endSession(sessionId, pin);
          navigation.popToTop();
        }) },
      ]
    );
  }, [sessionId, pin, navigation, run]);

  // ── Answer stats ─────────────────────────────────────────
  const qi = session?.quizState.questionIndex ?? 0;
  const answeredCount = participants.filter(p =>
    p.quizAnswers && p.quizAnswers[qi] !== undefined
  ).length;

  // ── Derived state ─────────────────────────────────────────
  const state     = session?.state ?? 'narrating';
  const isPlaying = session?.isPlaying ?? false;
  const curScene  = session?.currentScene ?? 0;
  const quizState = session?.quizState;
  const isQuiz    = state === 'quiz';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ─── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GoldIcon name="school" lib="mci" size={19} color={C.textPrimary} />
            <Text style={styles.headerTitle}>{t('classroom.live_session')}</Text>
          </View>
          <Text style={styles.headerSub} numberOfLines={1}>{battleName}</Text>
        </View>

        {/* State badge */}
        <StateBadge state={state} pulseAnim={pulseAnim} />

        {/* End button */}
        <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
          <Text style={styles.endBtnText}>{t('classroom.end')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Participants overview ────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard iconName="account-school" value={String(participants.length)} label={t('classroom.students')} />
          <StatCard
            iconName="trophy"
            value={participants[0]?.score ? String(participants[0].score) : '—'}
            label={t('classroom.leader')}
          />
          <StatCard iconName="pin" value={pin} label="PIN" mono />
        </View>

        {/* ─── NARRATION PANEL ─────────────────────────── */}
        {(state === 'narrating' || state === 'paused') && (
          <View style={styles.panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <GoldIcon name="microphone" lib="mci" size={15} color={C.textPrimary} />
              <Text style={styles.panelTitle}>{t('classroom.narration')}</Text>
            </View>

            {/* Current scene */}
            <View style={styles.sceneBox}>
              <Text style={styles.sceneNumber}>{t('classroom.scene_num', { current: curScene + 1, total: SCENE_TITLES.length })}</Text>
              <Text style={styles.sceneTitle}>{SCENE_TITLES[curScene] ?? 'Scena'}</Text>
            </View>

            {/* Play / Pause */}
            <TouchableOpacity
              style={[styles.playBtn, busy && styles.btnDisabled]}
              onPress={handleTogglePlay}
              disabled={busy}
            >
              <GoldIcon name={isPlaying ? 'pause' : 'play'} lib="mci" size={22} color={C.gold} />
              <Text style={styles.playBtnLabel}>
                {isPlaying ? t('classroom.pause_narration') : t('classroom.resume_narration')}
              </Text>
            </TouchableOpacity>

            {/* Scene navigation */}
            <View style={styles.sceneNav}>
              <TouchableOpacity
                style={[styles.sceneNavBtn, curScene === 0 && styles.btnDisabled]}
                onPress={handlePrevScene}
                disabled={curScene === 0 || busy}
              >
                <Text style={styles.sceneNavText}>{t('classroom.prev_scene')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sceneNavBtn, curScene === SCENE_TITLES.length - 1 && styles.btnDisabled]}
                onPress={handleNextScene}
                disabled={curScene === SCENE_TITLES.length - 1 || busy}
              >
                <Text style={styles.sceneNavText}>{t('classroom.next_scene')}</Text>
              </TouchableOpacity>
            </View>

            {/* Start Quiz CTA */}
            <TouchableOpacity
              style={[styles.quizStartBtn, busy && styles.btnDisabled]}
              onPress={handleStartQuiz}
              disabled={busy}
            >
              <GoldIcon name="head-question-outline" lib="mci" size={20} color="#f97316" />
              <Text style={styles.quizStartBtnLabel}>{t('classroom.start_final_quiz')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── QUIZ PANEL ───────────────────────────────── */}
        {isQuiz && quizState && (
          <View style={styles.panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <GoldIcon name="head-question-outline" lib="mci" size={15} color={C.textPrimary} />
              <Text style={styles.panelTitle}>
                {t('classroom.quiz_question', { current: (quizState.questionIndex) + 1, total: questions.length })}
              </Text>
            </View>

            {/* Current question preview */}
            {questions[quizState.questionIndex] && (
              <View style={styles.questionBox}>
                <Text style={styles.questionText}>
                  {questions[quizState.questionIndex].question}
                </Text>
              </View>
            )}

            {/* Answer stats */}
            <View style={styles.answerStats}>
              <Text style={styles.answerStatsLabel}>{t('classroom.student_answers')}</Text>
              <AnswerBar
                answered={answeredCount}
                total={participants.length}
              />
              {/* Per-option answer distribution */}
              {quizState.showAnswer && questions[quizState.questionIndex] && (
                <AnswerDistribution
                  participants={participants}
                  questionIndex={quizState.questionIndex}
                  correctOption={questions[quizState.questionIndex].correct}
                  options={questions[quizState.questionIndex].options}
                />
              )}
            </View>

            {/* Controls */}
            {!quizState.showAnswer ? (
              <TouchableOpacity
                style={[styles.quizActionBtn, { backgroundColor: '#f97316' }, busy && styles.btnDisabled]}
                onPress={handleShowAnswer}
                disabled={busy}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <GoldIcon name="bullhorn" lib="mci" size={18} color="#fff" />
                  <Text style={styles.quizActionBtnText}>{t('classroom.show_answer')}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.quizActionBtn, { backgroundColor: C.gold }, busy && styles.btnDisabled]}
                onPress={handleNextQuestion}
                disabled={busy}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <GoldIcon
                    name={quizState.questionIndex + 1 >= questions.length ? 'trophy' : 'play'}
                    lib="mci"
                    size={16}
                    color="#000"
                  />
                  <Text style={[styles.quizActionBtnText, { color: '#000' }]}>
                    {quizState.questionIndex + 1 >= questions.length
                      ? t('classroom.show_results')
                      : t('classroom.next_question')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── LIVE LEADERBOARD ─────────────────────────── */}
        <View style={styles.panel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GoldIcon name="chart-bar" lib="mci" size={15} color={C.textPrimary} />
            <Text style={styles.panelTitle}>{t('classroom.live_leaderboard')}</Text>
          </View>
          {participants.length === 0 ? (
            <Text style={styles.emptyText}>{t('classroom.no_students')}</Text>
          ) : (
            participants.slice(0, 5).map((p, i) => (
              <ParticipantRow key={p.userId} participant={p} rank={i + 1} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════

function StateBadge({ state, pulseAnim }: { state: string; pulseAnim: Animated.Value }) {
  const { t } = useTranslation();
  const config: Record<string, { label: string; bg: string; color: string }> = {
    narrating: { label: t('classroom.state_narration'), bg: 'rgba(251,191,36,0.15)', color: C.gold },
    paused:    { label: t('classroom.state_paused'),    bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
    quiz:      { label: t('classroom.state_quiz'),      bg: 'rgba(249,115,22,0.15)',  color: '#f97316' },
    results:   { label: t('classroom.state_results'),   bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
    lobby:     { label: t('classroom.state_lobby'),     bg: 'rgba(99,102,241,0.15)',  color: '#6366f1' },
    ended:     { label: t('classroom.state_ended'),     bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  };
  const cfg = config[state] ?? config.lobby;
  const isLive = state === 'narrating' || state === 'quiz';

  return (
    <Animated.View style={[styles.stateBadge, { backgroundColor: cfg.bg, opacity: isLive ? pulseAnim : 1 }]}>
      <Text style={[styles.stateBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </Animated.View>
  );
}

function StatCard({ iconName, value, label, mono }: {
  iconName: string; value: string; label: string; mono?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <GoldIcon name={iconName} lib="mci" size={22} color={C.textSecondary} />
      <Text style={[styles.statCardValue, mono && { fontFamily: 'monospace', letterSpacing: 2 }]}>
        {value}
      </Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

function AnswerBar({ answered, total }: { answered: number; total: number }) {
  const pct = total > 0 ? answered / total : 0;
  return (
    <View style={styles.answerBarWrap}>
      <View style={styles.answerBarTrack}>
        <View style={[styles.answerBarFill, { width: `${pct * 100}%` as any }]} />
      </View>
      <Text style={styles.answerBarLabel}>{answered}/{total}</Text>
    </View>
  );
}

function AnswerDistribution({ participants, questionIndex, correctOption, options }: {
  participants: Participant[];
  questionIndex: number;
  correctOption: number;
  options: string[];
}) {
  const counts = [0, 0, 0, 0];
  for (const p of participants) {
    const ans = p.quizAnswers?.[questionIndex];
    if (ans !== undefined && ans.answer >= 0 && ans.answer <= 3) {
      counts[ans.answer]++;
    }
  }
  const total = participants.length || 1;
  const LABELS = ['A', 'B', 'C', 'D'];
  const OPTION_COLORS = ['#6366f1', '#f97316', '#ec4899', '#14b8a6'];

  return (
    <View style={styles.distWrap}>
      {options.map((opt, i) => {
        const isCorrect = i === correctOption;
        const pct = counts[i] / total;
        return (
          <View key={i} style={styles.distRow}>
            <View style={[styles.distLetter, isCorrect && styles.distLetterCorrect]}>
              <Text style={styles.distLetterText}>{LABELS[i]}</Text>
            </View>
            <View style={styles.distBarWrap}>
              <View style={[
                styles.distBarFill,
                { width: `${pct * 100}%` as any, backgroundColor: isCorrect ? '#4ade80' : OPTION_COLORS[i] },
              ]} />
            </View>
            <Text style={styles.distCount}>{counts[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ParticipantRow({ participant, rank }: { participant: Participant; rank: number }) {
  const { t } = useTranslation();
  const medalColors: Record<number, string> = { 1: C.gold, 2: '#94a3b8', 3: '#cd7f32' };
  return (
    <View style={styles.participantRow}>
      <View style={{ width: 32, alignItems: 'center' }}>
        {rank <= 3 ? (
          <GoldIcon name="medal" lib="mci" size={20} color={medalColors[rank]} />
        ) : (
          <Text style={styles.participantRank}>{rank}.</Text>
        )}
      </View>
      <View style={styles.participantAvatar}>
        <Text style={{ fontSize: 18 }}>{participant.avatar}</Text>
      </View>
      <Text style={styles.participantName} numberOfLines={1}>{participant.name}</Text>
      <Text style={styles.participantScore}>{participant.score} {t('classroom.pts')}</Text>
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
  headerTitle: { fontSize: 19, color: C.textPrimary, fontWeight: '700' },
  headerSub:   { fontSize: 12, color: C.textMuted, marginTop: 2 },

  stateBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  stateBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  endBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
  },
  endBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '700' },

  scroll: { padding: 16, gap: 16 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: C.backgroundCard,
    borderRadius: Radius.md, borderWidth: 1, borderColor: C.borderDefault,
    padding: 12, alignItems: 'center', gap: 4,
  },
  statCardValue: { fontSize: 18, color: C.textPrimary, fontWeight: '800' },
  statCardLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Panel
  panel: {
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: C.borderDefault,
    padding: 16, gap: 12,
  },
  panelTitle: { fontSize: 15, color: C.textPrimary, fontWeight: '700' },

  // Scene
  sceneBox: {
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.md, padding: 14, gap: 4,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  sceneNumber: { fontSize: 11, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  sceneTitle:  { fontSize: 15, color: C.textPrimary, fontWeight: '600' },

  // Play button
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: `${C.gold}20`,
    borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: `${C.gold}50`,
    paddingVertical: 14, paddingHorizontal: 20,
    justifyContent: 'center',
  },
  playBtnLabel: { fontSize: 15, color: C.gold, fontWeight: '700' },

  // Scene navigation
  sceneNav: { flexDirection: 'row', gap: 10 },
  sceneNavBtn: {
    flex: 1, backgroundColor: C.backgroundElevated,
    borderRadius: Radius.md, borderWidth: 1, borderColor: C.borderDefault,
    paddingVertical: 12, alignItems: 'center',
  },
  sceneNavText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },

  // Quiz start
  quizStartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.35)',
    paddingVertical: 13, paddingHorizontal: 20, justifyContent: 'center',
  },
  quizStartBtnLabel: { fontSize: 14, color: '#f97316', fontWeight: '700' },

  // Question box
  questionBox: {
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: `${C.gold}30`,
  },
  questionText: { fontSize: 14, color: C.textPrimary, lineHeight: 20 },

  // Answer stats
  answerStats: { gap: 10 },
  answerStatsLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },

  answerBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  answerBarTrack: {
    flex: 1, height: 10, borderRadius: 5,
    backgroundColor: C.backgroundElevated, overflow: 'hidden',
  },
  answerBarFill: {
    height: '100%', borderRadius: 5,
    backgroundColor: C.gold,
  },
  answerBarLabel: { fontSize: 13, color: C.textPrimary, fontWeight: '700', width: 36, textAlign: 'right' },

  // Distribution
  distWrap: { gap: 8, marginTop: 4 },
  distRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLetter: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.backgroundElevated, alignItems: 'center', justifyContent: 'center',
  },
  distLetterCorrect: { backgroundColor: 'rgba(74,222,128,0.25)' },
  distLetterText:    { fontSize: 12, color: C.textPrimary, fontWeight: '700' },
  distBarWrap: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: C.backgroundElevated, overflow: 'hidden',
  },
  distBarFill: { height: '100%', borderRadius: 4 },
  distCount:   { fontSize: 12, color: C.textMuted, width: 20, textAlign: 'right' },

  // Quiz action button
  quizActionBtn: {
    borderRadius: Radius.md, paddingVertical: 15,
    alignItems: 'center',
  },
  quizActionBtnText: { fontSize: 15, color: '#fff', fontWeight: '800' },

  // Participant row
  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  participantRank:   { fontSize: 20, width: 32, textAlign: 'center' },
  participantAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.backgroundElevated, alignItems: 'center', justifyContent: 'center',
  },
  participantName:  { flex: 1, fontSize: 14, color: C.textPrimary, fontWeight: '600' },
  participantScore: { fontSize: 14, color: C.gold, fontWeight: '700' },

  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 12 },

  btnDisabled: { opacity: 0.45 },
});
