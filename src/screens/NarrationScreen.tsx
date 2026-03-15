// ============================================================
// BATTLE ECHOES — NarrationScreen.tsx
// Immersyjny odtwarzacz narracji z podświetlaniem zdań
// Sprint 1: prędkość, rozmiar czcionki, tryb jasny, haptyka
// Params: { battleId: string, initialPerspective?: Perspective }
// ============================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateAndCacheNarration } from '../services/ElevenLabsService';
import { getBattleById, type Scene } from '../services/FirebaseService';
import { hapticLight, hapticMedium, hapticSelect } from '../services/HapticsService';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import KaraokeReader from '../components/KaraokeReader';
import { useFocusEffect } from '@react-navigation/native';
import type { ScreenProps } from '../navigation/types';
import { logScreenView } from '../services/AnalyticsService';

// Lazy require — brak w Expo Go
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch {}

// ── AsyncStorage klucze ────────────────────────────────────
const KEY_SPEED        = 'be_narr_speed';
const KEY_FONTSIZE     = 'be_narr_fontsize';
const KEY_LIGHTMODE    = 'be_narr_lightmode';
const KEY_PERSP_PREFIX = 'be_narr_persp_';   // + battleId
const KEY_SCENE_PREFIX = 'be_narr_scene_';   // + battleId

// ── Prędkości odtwarzania ──────────────────────────────────
const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

// ── Typy ──────────────────────────────────────────────────────
type Perspective = 'narrator' | 'side_a' | 'side_b' | 'mix';

const PERSPECTIVES: { id: Perspective; label: string; icon: string; color: string }[] = [
  { id: 'narrator', label: 'Narrator', icon: '🎙', color: '#60a5fa' },
  { id: 'side_a',   label: 'Strona A', icon: '⚔',  color: '#4ade80' },
  { id: 'side_b',   label: 'Strona B', icon: '🛡',  color: '#f87171' },
  { id: 'mix',      label: 'Mix',      icon: '🔀',  color: '#c084fc' },
];

const MOOD_META: Record<string, { icon: string; color: string; label: string }> = {
  dramatic:    { icon: '🎭', color: '#f97316', label: 'Dramatyczny'  },
  tense:       { icon: '⏳', color: '#fbbf24', label: 'Napięcie'     },
  melancholic: { icon: '🌧', color: '#94a3b8', label: 'Melancholia'  },
  triumphant:  { icon: '🏆', color: '#4ade80', label: 'Triumf'       },
  brutal:      { icon: '💀', color: '#ef4444', label: 'Brutalny'     },
  strategic:   { icon: '🗺', color: '#a78bfa', label: 'Strategiczny' },
  desperate:   { icon: '😰', color: '#fb923c', label: 'Desperacja'   },
  heroic:      { icon: '⚡', color: '#facc15', label: 'Heroiczny'    },
  atmospheric: { icon: '🌫', color: '#60a5fa', label: 'Atmosfera'    },
  gathering:   { icon: '🐴', color: '#a78bfa', label: 'Zgrupowanie'  },
  charge:      { icon: '💨', color: '#f97316', label: 'Szarża'       },
  combat:      { icon: '⚔',  color: '#ef4444', label: 'Walka'        },
  retreat:     { icon: '🏃', color: '#8b5cf6', label: 'Odwrót'       },
  victory:     { icon: '🏆', color: '#4ade80', label: 'Zwycięstwo'   },
  defeat:      { icon: '💀', color: '#94a3b8', label: 'Klęska'       },
  aftermath:   { icon: '🌅', color: '#cbd5e1', label: 'Po walce'     },
  narrative:   { icon: '📜', color: '#93c5fd', label: 'Narracja'     },
};

// ── Helpers ───────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?…]+(?:[.!?…]+\s*)?/g) ?? [text];
  return parts.map(s => s.trim()).filter(Boolean);
}

// Proporcjonalne czasy zdań ważone liczbą znaków
function computeTimings(
  sentences: string[],
  totalDuration: number,
): Array<{ start: number; end: number }> {
  if (!sentences.length || !totalDuration) return [];
  const totalChars = sentences.reduce((s, t) => s + t.length, 0);
  let elapsed = 0;
  return sentences.map(s => {
    const start = elapsed;
    elapsed += (s.length / totalChars) * totalDuration;
    return { start, end: elapsed };
  });
}

function fmt(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
}

function fmtSpeed(s: Speed): string {
  return s === 1 ? '1×' : `${s}×`;
}

// ════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ════════════════════════════════════════════════════════════
export default function NarrationScreen({ route, navigation }: ScreenProps<'Narration'>) {
  const { battleId, initialPerspective = 'narrator' } = route.params ?? {};
  const { battles, markBattleListened } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('Narration'); }, []));
  const { t } = useTranslation();
  const battle = battles.find(b => b.id === battleId);
  const insets = useSafeAreaInsets();

  // ── Sceny z Firestore ────────────────────────────────────
  const [scenes, setScenes]       = useState<Scene[]>([]);
  const [scenesLoading, setScenesLoading] = useState(true);
  const scenesRef = useRef<Scene[]>([]);

  useEffect(() => {
    getBattleById(battleId).then(full => {
      const s = full?.scenes ?? [];
      setScenes(s);
      scenesRef.current = s;
      setScenesLoading(false);
    }).catch(err => {
      if (__DEV__) console.warn('[NarrationScreen] Failed to load scenes:', err);
      setScenesLoading(false);
    });
  }, [battleId]);

  // ── Stan odtwarzacza ─────────────────────────────────────
  const [perspective, setPerspective] = useState<Perspective>(initialPerspective);
  const [sceneIdx,    setSceneIdx]    = useState(0);
  const [scenePos,    setScenePos]    = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [playing,     setPlaying]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [isDemoMode,  setIsDemoMode]  = useState(false);
  const [audioError,  setAudioError]  = useState<string | null>(null);
  const [sentenceIdx, setSentenceIdx] = useState(0);

  // ── Persystencja postępu narracji ─────────────────────────
  const [savedSceneOnLoad, setSavedSceneOnLoad] = useState<number | null>(null);
  const progressReadyRef = useRef(false);

  // ── Sprint 1: prędkość, czcionka, tryb jasny ─────────────
  const [speed,     setSpeed]     = useState<Speed>(1);
  const [fontSize,  setFontSize]  = useState(21);
  const [lightMode, setLightMode] = useState(false);
  const speedRef = useRef<Speed>(1);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Wczytaj preferencje i postęp narracji (per-bitwa)
  useEffect(() => {
    progressReadyRef.current = false;
    setSavedSceneOnLoad(null);
    (async () => {
      const [sp, fs, lm, savedPersp, savedScene] = await Promise.all([
        AsyncStorage.getItem(KEY_SPEED),
        AsyncStorage.getItem(KEY_FONTSIZE),
        AsyncStorage.getItem(KEY_LIGHTMODE),
        AsyncStorage.getItem(KEY_PERSP_PREFIX + battleId),
        AsyncStorage.getItem(KEY_SCENE_PREFIX + battleId),
      ]);
      if (sp) {
        const v = parseFloat(sp) as Speed;
        if (SPEEDS.includes(v)) { setSpeed(v); speedRef.current = v; }
      }
      if (fs) { const n = parseInt(fs, 10); if (n >= 15 && n <= 30) setFontSize(n); }
      if (lm !== null) setLightMode(lm === '1');
      if (savedPersp) {
        const p = savedPersp as Perspective;
        if (PERSPECTIVES.some(x => x.id === p)) {
          setPerspective(p);
          perspRef.current = p;
        }
      }
      const sceneNum = savedScene ? parseInt(savedScene, 10) : 0;
      if (!isNaN(sceneNum) && sceneNum > 0) {
        setSavedSceneOnLoad(sceneNum);
      }
      progressReadyRef.current = true;
    })();
  }, [battleId]);

  // Zapisuj preferencje przy zmianie
  useEffect(() => { AsyncStorage.setItem(KEY_SPEED, String(speed)); }, [speed]);
  useEffect(() => { AsyncStorage.setItem(KEY_FONTSIZE, String(fontSize)); }, [fontSize]);
  useEffect(() => { AsyncStorage.setItem(KEY_LIGHTMODE, lightMode ? '1' : '0'); }, [lightMode]);

  // Przywróć ostatnią scenę (bezpieczne na wyścig: odpala gdy sceny LUB savedSceneOnLoad zmienią się)
  useEffect(() => {
    if (!savedSceneOnLoad || !scenes.length) return;
    const idx = Math.min(savedSceneOnLoad, scenes.length - 1);
    if (idx <= 0) return;
    sceneIdxRef.current = idx;
    setSceneIdx(idx);
    let start = 0;
    for (let i = 0; i < idx; i++) start += scenes[i].duration;
    sceneStartRef.current = start;
    setTotalElapsed(start);
  }, [scenes, savedSceneOnLoad]);

  // Zapisuj bieżącą scenę (tylko po załadowaniu preferencji)
  useEffect(() => {
    if (!progressReadyRef.current) return;
    if (sceneIdx === 0) {
      AsyncStorage.removeItem(KEY_SCENE_PREFIX + battleId).catch(() => {});
    } else {
      AsyncStorage.setItem(KEY_SCENE_PREFIX + battleId, String(sceneIdx)).catch(() => {});
    }
  }, [sceneIdx, battleId]);

  // Cykl prędkości
  const cycleSpeed = async () => {
    hapticSelect();
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    speedRef.current = next;
    if (soundRef.current && !isDemoMode) {
      await soundRef.current.setRateAsync(next, true).catch(() => {});
    }
  };

  // ── Refs ─────────────────────────────────────────────────
  const soundRef      = useRef<any>(null);
  const sceneIdxRef   = useRef(0);
  const sceneStartRef = useRef(0);
  const durationsRef  = useRef<number[]>([]);
  const perspRef      = useRef<Perspective>(initialPerspective);
  const playSceneFn   = useRef<(idx: number) => void>(null!);
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const btnAnim       = useRef(new Animated.Value(1)).current;
  const scrollRef     = useRef<ScrollView>(null);
  const sentenceYs    = useRef<number[]>([]);

  useEffect(() => { perspRef.current = perspective; }, [perspective]);

  // ── Dane bieżącej sceny ──────────────────────────────────
  const scene    = sceneIdx < scenes.length ? scenes[sceneIdx] : undefined;
  const mood     = MOOD_META[scene?.mood ?? ''] ?? MOOD_META.narrative;
  const perspObj = PERSPECTIVES.find(p => p.id === perspective) ?? PERSPECTIVES[0];;

  // ── Zdania i czasy ───────────────────────────────────────
  const sentences = useMemo(() => splitSentences(scene?.text ?? ''), [scene]);
  const timings   = useMemo(
    () => computeTimings(sentences, scene?.duration ?? 0),
    [sentences, scene?.duration],
  );

  // ── Łączny czas z rzeczywistych/szacowanych dur ──────────
  useEffect(() => {
    const t = scenes.reduce((s, sc, i) => s + (durationsRef.current[i] ?? sc.duration), 0);
    setTotalDuration(t);
  }, [scenes]);

  // ── Aktualne zdanie na podstawie pozycji w scenie ────────
  useEffect(() => {
    if (!timings.length) return;
    let idx = timings.findIndex(t => scenePos >= t.start && scenePos < t.end);
    if (idx < 0) idx = playing ? sentences.length - 1 : 0;
    setSentenceIdx(idx);
  }, [scenePos, timings, playing, sentences.length]);

  // Auto-scroll is handled by KaraokeReader internally via its scrollRef prop.

  // ── Reset przy zmianie sceny ─────────────────────────────
  useEffect(() => {
    sentenceYs.current = [];
    setSentenceIdx(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [sceneIdx]);

  // ── Animacja progressu ───────────────────────────────────
  useEffect(() => {
    const pct = totalDuration > 0 ? totalElapsed / totalDuration : 0;
    Animated.timing(progressAnim, { toValue: pct, duration: 200, useNativeDriver: false }).start();
  }, [totalElapsed, totalDuration]);

  // ── Cleanup ──────────────────────────────────────────────
  useEffect(() => () => { soundRef.current?.unloadAsync?.(); }, []);

  // ── Playback status (realny dźwięk) ─────────────────────
  const onStatus = useCallback((status: any, idx: number) => {
    if (!status.isLoaded) return;
    const pos = (status.positionMillis ?? 0) / 1000;
    setScenePos(pos);
    setTotalElapsed(sceneStartRef.current + pos);

    if (status.durationMillis && !durationsRef.current[idx]) {
      durationsRef.current[idx] = status.durationMillis / 1000;
      const scns = scenesRef.current;
      setTotalDuration(scns.reduce((s, sc, i) => s + (durationsRef.current[i] ?? sc.duration), 0));
    }

    if (status.didJustFinish) {
      const scns = scenesRef.current;
      const dur  = durationsRef.current[idx] ?? scns[idx]?.duration ?? 0;
      if (idx < scns.length - 1) {
        sceneStartRef.current += dur;
        playSceneFn.current(idx + 1);
      } else {
        setPlaying(false);
        markBattleListened(battleId);
        AsyncStorage.removeItem(KEY_SCENE_PREFIX + battleId).catch(() => {});
        setTotalElapsed(0); setScenePos(0);
        sceneStartRef.current = 0; sceneIdxRef.current = 0;
        setSceneIdx(0);
      }
    }
  }, [battleId, markBattleListened]);

  // ── Odtwórz konkretną scenę ──────────────────────────────
  const playScene = useCallback(async (idx: number) => {
    const scns = scenesRef.current;
    if (idx >= scns.length) return;
    const sc = scns[idx];
    if (!sc) { setLoading(false); setAudioError('Scene data missing'); return; }

    sceneIdxRef.current = idx;
    setSceneIdx(idx);
    setScenePos(0);
    setLoading(true);
    setAudioError(null);

    try {
      const voice = perspRef.current === 'mix'
        ? (idx % 2 === 0 ? 'side_a' : 'side_b')
        : perspRef.current;

      const uri = await generateAndCacheNarration(battleId, String(sc.id), sc.text, voice);

      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      if (!uri || !Audio) {
        setLoading(false);
        setIsDemoMode(true);
        setPlaying(true);
        return;
      }

      // Enable background playback + respect silent switch on iOS
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS:    true,
        shouldDuckAndroid:       true,
      }).catch(() => {});

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, rate: speedRef.current, shouldCorrectPitch: true },
        (s: any) => onStatus(s, idx),
      );
      soundRef.current = sound;
      setLoading(false);
      setIsDemoMode(false);
      setPlaying(true);
    } catch (e: unknown) {
      setLoading(false);
      setAudioError(e instanceof Error ? e.message : t('narration.audio_error'));
      setPlaying(false);
    }
  }, [battleId, onStatus]);

  useEffect(() => { playSceneFn.current = playScene; }, [playScene]);

  // ── Symulacja (tryb demo — brak klucza API) ──────────────
  const demoFinishedRef = useRef(false);
  useEffect(() => {
    if (!playing || !isDemoMode) { demoFinishedRef.current = false; return; }
    const scns = scenesRef.current;
    if (!scns.length) return;
    const totalDur = scns.reduce((s, sc) => s + sc.duration, 0);
    let elapsed = totalElapsed;

    const timer = setInterval(() => {
      elapsed += 0.5 * speedRef.current;   // ← uwzględnia prędkość
      if (elapsed >= totalDur && !demoFinishedRef.current) {
        demoFinishedRef.current = true;
        clearInterval(timer);
        setPlaying(false); setIsDemoMode(false);
        markBattleListened(battleId);
        AsyncStorage.removeItem(KEY_SCENE_PREFIX + battleId).catch(() => {});
        setTotalElapsed(0); setScenePos(0);
        sceneStartRef.current = 0; sceneIdxRef.current = 0;
        setSceneIdx(0);
        return;
      }
      let sceneSoFar = 0;
      for (let i = 0; i < scns.length; i++) {
        const dur = scns[i].duration;
        if (elapsed < sceneSoFar + dur) {
          const pos = elapsed - sceneSoFar;
          if (i !== sceneIdxRef.current) {
            sceneStartRef.current = sceneSoFar;
            sceneIdxRef.current = i;
            setSceneIdx(i);
          }
          setScenePos(pos);
          setTotalElapsed(elapsed);
          break;
        }
        sceneSoFar += dur;
      }
    }, 500);

    return () => clearInterval(timer);
  }, [playing, isDemoMode, battleId, markBattleListened]);

  // ── Play / Pause ─────────────────────────────────────────
  const handlePlayPause = async () => {
    hapticMedium();
    Animated.sequence([
      Animated.timing(btnAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(btnAnim, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();

    if (playing) {
      if (isDemoMode) { setPlaying(false); return; }
      await soundRef.current?.pauseAsync().catch(() => {});
      setPlaying(false);
      return;
    }
    if (!isDemoMode && soundRef.current) {
      await soundRef.current.playAsync().catch(() => {});
      setPlaying(true);
      return;
    }
    sceneStartRef.current = 0;
    durationsRef.current = [];
    setTotalElapsed(0); setScenePos(0);
    playScene(0);
  };

  // ── Przejdź do sceny ─────────────────────────────────────
  const goScene = useCallback(async (idx: number) => {
    hapticLight();
    await soundRef.current?.stopAsync().catch(() => {});
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setPlaying(false); setIsDemoMode(false);

    const scns = scenesRef.current;
    let start = 0;
    for (let i = 0; i < idx; i++) start += durationsRef.current[i] ?? scns[i].duration;
    sceneStartRef.current = start;
    sceneIdxRef.current = idx;
    setSceneIdx(idx); setScenePos(0); setTotalElapsed(start);
    setTimeout(() => playSceneFn.current(idx), 80);
  }, []);

  // ── Zmień perspektywę ────────────────────────────────────
  const switchPersp = async (p: Perspective) => {
    if (p === perspective) return;
    hapticSelect();
    await soundRef.current?.stopAsync().catch(() => {});
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setPlaying(false); setIsDemoMode(false);
    setTotalElapsed(0); setScenePos(0);
    sceneStartRef.current = 0; durationsRef.current = [];
    sceneIdxRef.current = 0; setSceneIdx(0);
    setPerspective(p);
    perspRef.current = p;
    AsyncStorage.setItem(KEY_PERSP_PREFIX + battleId, p).catch(() => {});
  };

  // ── Seek ±15s ────────────────────────────────────────────
  const seek = async (delta: number) => {
    hapticLight();
    if (!isDemoMode && soundRef.current) {
      const s = await soundRef.current.getStatusAsync().catch(() => null);
      if (s?.isLoaded) {
        const next = Math.max(0, Math.min(s.durationMillis ?? 0, s.positionMillis + delta * 1000));
        await soundRef.current.setPositionAsync(next).catch(() => {});
      }
    } else {
      const dur = scene?.duration ?? 0;
      setScenePos(p => Math.max(0, Math.min(dur, p + delta)));
    }
  };

  // ── Tryb jasny — kolory tła ───────────────────────────────
  const bgScroll  = lightMode ? '#F5F0E8' : C.background;
  const txtNormal = lightMode ? '#2C1810' : C.textSecondary;
  const txtPast   = lightMode ? 'rgba(44,24,16,0.22)' : 'rgba(154,142,122,0.25)';

  // ── Guard ────────────────────────────────────────────────
  if (!battle) return (
    <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: Colors.textMuted }}>{t('narration.not_found')}</Text>
    </View>
  );

  const displayDur = totalDuration || scenes.reduce((s, sc) => s + sc.duration, 0);

  // ════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      <StatusBar barStyle={lightMode ? 'dark-content' : 'light-content'} />

      {/* ── Header ────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnTxt}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle} numberOfLines={1}>{battle.name}</Text>
          <Text style={styles.headerSub}>{battle.date}</Text>
        </View>
        {scenes.length > 0 && (
          <View style={styles.sceneTag}>
            <Text style={styles.sceneTagTxt}>{sceneIdx + 1}/{scenes.length}</Text>
          </View>
        )}
      </View>

      {/* ── Mood bar ──────────────────────────────────── */}
      {scene && (
        <View style={[styles.moodBar, { borderLeftColor: mood.color }]}>
          <Text style={styles.moodIcon}>{mood.icon}</Text>
          <Text style={[styles.moodLbl, { color: mood.color }]}>
            {t(`battle.mood_${scene?.mood ?? 'narrative'}` as any, { defaultValue: mood.label }).toUpperCase()}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={[styles.perspTag, {
            borderColor: perspObj.color,
            backgroundColor: `${perspObj.color}18`,
          }]}>
            <Text style={[styles.perspTagTxt, { color: perspObj.color }]}>
              {perspObj.icon} {t(`battle.${perspObj.id}` as any)}
            </Text>
          </View>
        </View>
      )}

      {/* ── Scene dots ────────────────────────────────── */}
      {scenes.length > 1 && (
        <View style={styles.dots}>
          {scenes.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goScene(i)}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              <View style={[
                styles.dot,
                i === sceneIdx && [styles.dotActive, { backgroundColor: mood.color }],
                i < sceneIdx  && styles.dotDone,
              ]} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Obszar tekstu ─────────────────────────────── */}
      {scenesLoading ? (
        <View style={[styles.emptyArea, { backgroundColor: bgScroll }]}>
          <ActivityIndicator color={Colors.gold} size="large" />
          <Text style={styles.emptyTxt}>{t('narration.loading')}</Text>
        </View>
      ) : scenes.length === 0 ? (
        <View style={[styles.emptyArea, { backgroundColor: bgScroll }]}>
          <Text style={styles.emptyTxt}>{t('narration.no_scenes')}</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={[styles.scrollArea, { backgroundColor: bgScroll }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <KaraokeReader
            sentences={sentences}
            activeSentenceIdx={sentenceIdx}
            accentColor={mood.color}
            scrollRef={scrollRef}
            onSentenceLayout={(i, y) => { sentenceYs.current[i] = y; }}
            normalColor={txtNormal}
            pastColor={txtPast}
            fontSize={fontSize}
            isPlaying={playing}
          />
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── Kontrolki ─────────────────────────────────── */}
      <View style={[styles.ctrlBox, { paddingBottom: insets.bottom + 8 }]}>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: perspObj.color,
            },
          ]} />
        </View>

        {/* Czas */}
        <View style={styles.timeRow}>
          <Text style={styles.timeTxt}>{fmt(totalElapsed)}</Text>
          <Text style={styles.timeTxt}>{fmt(displayDur)}</Text>
        </View>

        {/* Główne przyciski */}
        <View style={styles.mainRow}>
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => sceneIdx > 0 && goScene(sceneIdx - 1)}
            disabled={sceneIdx === 0}
          >
            <Text style={[styles.ctrlIcon, sceneIdx === 0 && styles.ctrlDim]}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctrlBtn} onPress={() => seek(-15)}>
            <Text style={styles.ctrlIcon}>⏪</Text>
            <Text style={styles.ctrlLbl}>15s</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: perspObj.color }]}
              onPress={handlePlayPause}
              disabled={scenesLoading || scenes.length === 0}
              activeOpacity={1}
            >
              {(loading || scenesLoading)
                ? <ActivityIndicator color="#0D1520" size="small" />
                : <Text style={styles.playIcon}>{playing ? '⏸' : '▶'}</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.ctrlBtn} onPress={() => seek(15)}>
            <Text style={styles.ctrlIcon}>⏩</Text>
            <Text style={styles.ctrlLbl}>15s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => sceneIdx < scenes.length - 1 && goScene(sceneIdx + 1)}
            disabled={sceneIdx >= scenes.length - 1}
          >
            <Text style={[styles.ctrlIcon, sceneIdx >= scenes.length - 1 && styles.ctrlDim]}>⏭</Text>
          </TouchableOpacity>
        </View>

        {/* ── Ustawienia: prędkość | font | tryb jasny ─ */}
        <View style={styles.settingsRow}>
          {/* Prędkość */}
          <TouchableOpacity style={styles.settingBtn} onPress={cycleSpeed} activeOpacity={0.7}>
            <Text style={styles.settingBtnTxt}>{fmtSpeed(speed)}</Text>
          </TouchableOpacity>

          {/* Rozmiar czcionki */}
          <View style={styles.settingGroup}>
            <TouchableOpacity
              style={styles.settingBtn}
              onPress={() => { hapticLight(); setFontSize(f => Math.max(15, f - 2)); }}
              activeOpacity={0.7}
            >
              <Text style={styles.settingBtnTxt}>A⁻</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingBtn}
              onPress={() => { hapticLight(); setFontSize(f => Math.min(30, f + 2)); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.settingBtnTxt, { fontSize: 15 }]}>A⁺</Text>
            </TouchableOpacity>
          </View>

          {/* Tryb jasny/ciemny */}
          <TouchableOpacity
            style={[styles.settingBtn, lightMode && styles.settingBtnActive]}
            onPress={() => { hapticLight(); setLightMode(l => !l); }}
            activeOpacity={0.7}
          >
            <Text style={styles.settingBtnTxt}>{lightMode ? '☀' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* Perspektywy */}
        <View style={styles.perspRow}>
          {PERSPECTIVES.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.perspPill,
                perspective === p.id && {
                  backgroundColor: `${p.color}1A`,
                  borderColor: p.color,
                },
              ]}
              onPress={() => switchPersp(p.id)}
            >
              <Text style={styles.perspPillIcon}>{p.icon}</Text>
              <Text style={[styles.perspPillTxt, perspective === p.id && { color: p.color }]}>
                {t(`battle.${p.id}` as any)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {audioError  && <Text style={styles.errTxt}>⚠ {audioError}</Text>}
        {isDemoMode  && <Text style={styles.demoTxt}>{t('narration.demo_hint')}</Text>}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = Colors;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.12)',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnTxt: { fontSize: 18, color: '#fff' },
  headerMid: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 15, color: C.textPrimary, fontWeight: '700' },
  headerSub: { fontSize: 11, color: C.textMuted },
  sceneTag: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 4,
  },
  sceneTagTxt: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },

  // Mood bar
  moodBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 9,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  moodIcon: { fontSize: 15 },
  moodLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  perspTag: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  perspTagTxt: { fontSize: 10, fontWeight: '600' },

  // Scene dots
  dots: {
    flexDirection: 'row', justifyContent: 'center',
    paddingVertical: 10, gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  dotActive: { width: 22, height: 6, borderRadius: 3 },
  dotDone: { backgroundColor: 'rgba(255,255,255,0.35)' },

  // Tekst narracji
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20 },
  sentence: {
    // fontSize i lineHeight ustawiane dynamicznie z state
    color: C.textSecondary,
    marginBottom: 4,
  },
  sentActive: { fontWeight: '700' },

  // Loading/empty
  emptyArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { fontSize: 14, color: C.textMuted },

  // Kontrolki
  ctrlBox: {
    backgroundColor: '#080808',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12, paddingHorizontal: 16, gap: 10,
  },
  progressTrack: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2 },

  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeTxt: { fontSize: 11, color: C.textMuted, fontFamily: 'monospace' },

  mainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  ctrlBtn: { alignItems: 'center', gap: 2, minWidth: 36 },
  ctrlIcon: { fontSize: 22, color: C.textSecondary },
  ctrlLbl: { fontSize: 9, color: C.textMuted },
  ctrlDim: { opacity: 0.25 },

  playBtn: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45, shadowRadius: 8,
  },
  playIcon: { fontSize: 24 },

  // Settings row (Sprint 1)
  settingsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  settingGroup: { flexDirection: 'row', gap: 6 },
  settingBtn: {
    height: 30, minWidth: 48,
    borderRadius: 15, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 10,
  },
  settingBtnActive: {
    borderColor: C.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  settingBtnTxt: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },

  perspRow: { flexDirection: 'row', gap: 6 },
  perspPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  perspPillIcon: { fontSize: 11 },
  perspPillTxt: { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  errTxt:  { fontSize: 11, color: '#ef4444', textAlign: 'center' },
  demoTxt: { fontSize: 11, color: C.textMuted, textAlign: 'center' },
});
