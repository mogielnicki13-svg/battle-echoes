// ============================================================
// BATTLE ECHOES — QuizScreen.tsx
// Quiz wiedzy historycznej dla każdej bitwy
// 5 pytań MCQ → animowane odpowiedzi → wynik + nagroda XP
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { logScreenView } from '../services/AnalyticsService';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import {
  getQuizForBattle,
  calcQuizXP,
  type QuizQuestion,
} from '../data/quizData';
import {
  hapticSuccess,
  hapticError,
  hapticMedium,
  hapticLight,
  hapticSelect,
} from '../services/HapticsService';

type Phase = 'question' | 'reveal' | 'result';

const STORAGE_KEY = 'be_quiz_scores';
const C = Colors;

// ── Kolory odpowiedzi ──────────────────────────────────────
const ANSWER_DEFAULT   = C.backgroundElevated;
const ANSWER_CORRECT   = 'rgba(74,222,128,0.20)';
const ANSWER_WRONG     = 'rgba(248,113,113,0.20)';
const BORDER_DEFAULT   = C.borderDefault;
const BORDER_CORRECT   = '#4ade80';
const BORDER_WRONG     = '#f87171';

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function QuizScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteProp<RootStackParamList, 'Quiz'>>();
  const { battleId, battleName } = route.params ?? { battleId: '', battleName: 'Quiz' };

  useFocusEffect(useCallback(() => { logScreenView('Quiz'); }, []));
  const { t } = useTranslation();
  const { awardXP, markQuizCompleted, user } = useAppStore();
  const insets      = useSafeAreaInsets();

  const questions = getQuizForBattle(battleId);
  const total     = questions.length;

  const [qIndex,   setQIndex]   = useState(0);
  const [phase,    setPhase]    = useState<Phase>('question');
  const [selected, setSelected] = useState<number | null>(null);
  const [correct,  setCorrect]  = useState(0);
  const [xpGained, setXpGained] = useState(0);
  // Źródło prawdy: store (completedQuizzes); AsyncStorage jako fallback dla starych danych
  const [isNew,    setIsNew]    = useState(() =>
    !(user?.completedQuizzes?.includes(battleId) ?? false)
  );

  // Animacje kart odpowiedzi (0–3)
  const scaleAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current;
  // Fade progress baru
  const progressAnim = useRef(new Animated.Value(0)).current;
  // Fade ekranu wyniku
  const resultFade = useRef(new Animated.Value(0)).current;

  const q: QuizQuestion | undefined = questions[qIndex];

  // Fallback: sprawdź AsyncStorage — dotyczy kont sprzed wdrożenia completedQuizzes
  useEffect(() => {
    if (!isNew) return; // store już mówi: quiz był ukończony
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const scores: Record<string, number> = JSON.parse(raw);
          if (scores[battleId] !== undefined) setIsNew(false);
        }
      } catch {}
    })();
  }, [battleId]);

  // Animuj progress bar przy zmianie pytania
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue:  qIndex / total,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [qIndex]);

  // Animuj fade wyniku
  useEffect(() => {
    if (phase === 'result') {
      Animated.timing(resultFade, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }).start();
    }
  }, [phase]);

  // ── Obsługa wyboru odpowiedzi ──────────────────────────
  const handleAnswer = useCallback(async (idx: number) => {
    if (phase !== 'question' || !q) return;

    setSelected(idx);
    setPhase('reveal');

    const isCorrect = idx === q.correct;

    // Bounce animacja wybranej odpowiedzi
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 1.04, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1,    duration: 150, useNativeDriver: true }),
    ]).start();

    if (isCorrect) {
      await hapticSuccess();
      setCorrect(prev => prev + 1);
    } else {
      await hapticError();
    }

    // Po 1.8s przejdź do kolejnego pytania lub wyniku
    setTimeout(() => {
      if (qIndex + 1 < total) {
        setQIndex(prev => prev + 1);
        setSelected(null);
        setPhase('question');
        hapticLight();
      } else {
        // Oblicz XP i zapisz wynik
        const finalCorrect = isCorrect ? correct + 1 : correct;
        const xp = calcQuizXP(finalCorrect, total);
        setXpGained(xp);

        // Przyznaj XP tylko przy pierwszym rozwiązaniu
        if (isNew) {
          awardXP(xp, `Quiz: ${battleName}`);
          // Zarejestruj ukończenie w storze (potrzebne dla osiągnięć Historyka)
          markQuizCompleted(battleId);
          // Zapisz wynik lokalnie (najlepszy wynik per bitwa)
          (async () => {
            try {
              const raw = await AsyncStorage.getItem(STORAGE_KEY);
              const scores: Record<string, number> = raw ? JSON.parse(raw) : {};
              scores[battleId] = Math.max(scores[battleId] ?? 0, finalCorrect);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
            } catch {}
          })();
        }

        hapticMedium();
        setPhase('result');
      }
    }, 1800);
  }, [phase, q, qIndex, correct, total, isNew, awardXP, markQuizCompleted, battleId, battleName]);

  // ── Restart quizu ──────────────────────────────────────
  const handleRestart = useCallback(() => {
    hapticSelect();
    setQIndex(0);
    setSelected(null);
    setCorrect(0);
    setXpGained(0);
    setPhase('question');
    resultFade.setValue(0);
    progressAnim.setValue(0);
    setIsNew(false); // ponowne rozwiązania nie dają XP
  }, []);

  // ── EKRAN WYNIKU ───────────────────────────────────────
  if (phase === 'result') {
    const finalCorrect = correct;
    const stars = finalCorrect === total ? 3 : finalCorrect >= Math.ceil(total * 0.6) ? 2 : finalCorrect > 0 ? 1 : 0;
    const pct   = Math.round((finalCorrect / total) * 100);

    return (
      <Animated.View style={[styles.container, { opacity: resultFade, paddingTop: insets.top + 16 }]}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>

          {/* Nagłówek */}
          <Text style={styles.resultTitle}>{t('quiz.result_title')}</Text>
          <Text style={styles.resultSubtitle}>{battleName}</Text>

          {/* Gwiazdki */}
          <View style={styles.starsRow}>
            {[1, 2, 3].map(s => (
              <Text key={s} style={[styles.star, s > stars && styles.starEmpty]}>★</Text>
            ))}
          </View>

          {/* Wynik liczbowy */}
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNum}>{finalCorrect}</Text>
            <Text style={styles.scoreOf}>/{total}</Text>
          </View>
          <Text style={styles.scorePct}>{t('quiz.pct_correct', { pct })}</Text>

          {/* XP */}
          {isNew && xpGained > 0 && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>{t('quiz.xp_badge', { xp: xpGained })}</Text>
            </View>
          )}
          {!isNew && (
            <Text style={styles.replayNote}>{t('quiz.replay_note')}</Text>
          )}

          {/* Podsumowanie odpowiedzi */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>{t('quiz.summary')}</Text>
            {questions.map((question, i) => {
              // Po ekranie wyniku nie wiemy które były zaznaczone w szczegółach,
              // ale możemy pokazać tylko pytania.
              return (
                <View key={i} style={styles.summaryRow}>
                  <Text style={styles.summaryNum}>{i + 1}.</Text>
                  <Text style={styles.summaryQ} numberOfLines={2}>{question.question}</Text>
                </View>
              );
            })}
          </View>

          {/* Przyciski */}
          <View style={styles.resultBtns}>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRestart}>
              <Text style={styles.retryBtnText}>{t('quiz.play_again')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>{t('quiz.back_to_battle')}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </Animated.View>
    );
  }

  // ── EKRAN PYTANIA ──────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => { hapticLight(); navigation.goBack(); }}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{battleName}</Text>
        <View style={styles.counterChip}>
          <Text style={styles.counterText}>{qIndex + 1}/{total}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, {
          width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Numer pytania */}
        <Text style={styles.qLabel}>{t('quiz.question_label', { num: qIndex + 1 })}</Text>

        {/* Treść pytania */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{q?.question}</Text>
        </View>

        {/* Opcje */}
        <View style={styles.optionsGrid}>
          {q?.options.map((opt, idx) => {
            const isSelected = selected === idx;
            const isCorrectOpt = idx === q.correct;
            const revealed = phase === 'reveal';

            let bg:     string = ANSWER_DEFAULT;
            let border: string = BORDER_DEFAULT;
            let txtCol: string = C.textSecondary;

            if (revealed) {
              if (isCorrectOpt) {
                bg     = ANSWER_CORRECT;
                border = BORDER_CORRECT;
                txtCol = '#4ade80';
              } else if (isSelected && !isCorrectOpt) {
                bg     = ANSWER_WRONG;
                border = BORDER_WRONG;
                txtCol = '#f87171';
              }
            }

            const optLetter = ['A', 'B', 'C', 'D'][idx];

            return (
              <Animated.View
                key={idx}
                style={[
                  styles.optionWrap,
                  { transform: [{ scale: scaleAnims[idx] }] },
                ]}
              >
                <TouchableOpacity
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                  onPress={() => handleAnswer(idx)}
                  activeOpacity={0.75}
                  disabled={phase === 'reveal'}
                >
                  <View style={[styles.optionLetter, { borderColor: border }]}>
                    <Text style={[styles.optionLetterText, { color: revealed && isCorrectOpt ? '#4ade80' : C.gold }]}>
                      {revealed && isCorrectOpt ? '✓' : revealed && isSelected ? '✗' : optLetter}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: txtCol }]}>{opt}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Wyjaśnienie (po reveal) */}
        {phase === 'reveal' && q?.explanation && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationIcon}>💡</Text>
            <Text style={styles.explanationText}>{q.explanation}</Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },

  // ── Nagłówek ──────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: C.textMuted },
  headerTitle: {
    flex: 1, fontSize: 16, color: C.textPrimary, fontWeight: '700',
  },
  counterChip: {
    backgroundColor: `${C.gold}20`, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: `${C.gold}40`,
  },
  counterText: { fontSize: 12, color: C.gold, fontWeight: '700' },

  // ── Progress ──────────────────────────────────────────
  progressTrack: {
    height: 3,
    backgroundColor: C.backgroundElevated,
    marginHorizontal: 0,
  },
  progressFill: {
    height: 3,
    backgroundColor: C.gold,
  },

  // ── Treść pytania ──────────────────────────────────────
  content: {
    padding: 20,
    gap: 16,
  },
  qLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  questionBox: {
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${C.gold}25`,
    padding: 20,
  },
  questionText: {
    fontSize: 18,
    color: C.textPrimary,
    fontWeight: '700',
    lineHeight: 26,
  },

  // ── Opcje ──────────────────────────────────────────────
  optionsGrid: {
    gap: 10,
  },
  optionWrap: {
    // wrapper for scale anim
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 14,
  },
  optionLetter: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  optionLetterText: {
    fontSize: 14, fontWeight: '800',
  },
  optionText: {
    flex: 1, fontSize: 15, lineHeight: 21,
  },

  // ── Wyjaśnienie ────────────────────────────────────────
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${C.gold}30`,
    padding: 14,
  },
  explanationIcon: { fontSize: 18, marginTop: 1 },
  explanationText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 20 },

  // ════════════════════════════════════════════════════════
  // EKRAN WYNIKU
  // ════════════════════════════════════════════════════════
  resultScroll: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  resultTitle: {
    fontSize: 28, color: C.gold, fontWeight: '800',
    letterSpacing: 1,
  },
  resultSubtitle: {
    fontSize: 14, color: C.textMuted, marginTop: -8,
  },

  starsRow: {
    flexDirection: 'row', gap: 8, marginTop: 4,
  },
  star: {
    fontSize: 40, color: C.gold,
  },
  starEmpty: {
    color: C.backgroundElevated,
  },

  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: `${C.gold}15`,
    borderRadius: 80,
    width: 140, height: 140,
    borderWidth: 2,
    borderColor: `${C.gold}50`,
    marginTop: 4,
  },
  scoreNum: {
    fontSize: 56, color: C.gold, fontWeight: '800',
    lineHeight: 64,
  },
  scoreOf: {
    fontSize: 22, color: C.textMuted, fontWeight: '600',
    marginBottom: 10,
  },
  scorePct: {
    fontSize: 15, color: C.textSecondary, marginTop: -4,
  },

  xpBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 30, borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.40)',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  xpBadgeText: { fontSize: 16, color: '#fbbf24', fontWeight: '800' },

  replayNote: { fontSize: 12, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  summaryBox: {
    width: '100%',
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.borderDefault,
    padding: 16,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 12, color: C.textMuted, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  summaryNum: { fontSize: 13, color: C.textMuted, width: 18, flexShrink: 0 },
  summaryQ:   { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 18 },

  resultBtns: { width: '100%', gap: 10, marginTop: 4 },
  retryBtn: {
    backgroundColor: `${C.gold}20`,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${C.gold}50`,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryBtnText: { fontSize: 15, color: C.gold, fontWeight: '700' },
  backBtn: {
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backBtnText: { fontSize: 14, color: C.textMuted },
});
