// ============================================================
// BATTLE ECHOES — BattleDetailScreen.tsx
// Pełny ekran bitwy z odtwarzaczem audio — 4 perspektywy
// Sceny ładowane z Firestore (getBattleById)
// ============================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions, ActivityIndicator, Alert, Image, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateAndCacheNarration } from '../services/ElevenLabsService';
import { getBattleById, type Scene } from '../services/FirebaseService';
import BATTLE_LOCAL_IMAGES from '../services/BattleLocalImages';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '../constants/theme';
import { useAppStore } from '../store';

import { hapticMedium, hapticSelect, hapticSuccess } from '../services/HapticsService';
import { createSession } from '../services/SessionService';
import { useFocusEffect } from '@react-navigation/native';
import type { ScreenProps } from '../navigation/types';
import { logScreenView } from '../services/AnalyticsService';
import CampaignBanner from '../components/CampaignBanner';
import GoldIcon, { Icon } from '../components/GoldIcon';
import socialService from '../services/SocialService';

// Lazy require expo-av (brak w Expo Go SDK 50+)
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch {
  // expo-av unavailable (Expo Go) — demo mode
}

const { width: SW } = Dimensions.get('window');

// ── Typy perspektyw ───────────────────────────────────────
type Perspective = 'narrator' | 'side_a' | 'side_b' | 'mix';

const PERSPECTIVES: {
  id: Perspective;
  label: string;
  iconName: string;  // MCI icon name for GoldIcon
  color: string;
  description: string;
}[] = [
  {
    id: 'narrator',
    label: 'Narrator',
    iconName: 'microphone',
    color: '#60a5fa',
    description: 'Bezstronny głos historii — widzi bitwę z lotu ptaka',
  },
  {
    id: 'side_a',
    label: 'Strona A',
    iconName: 'sword',
    color: '#4ade80',
    description: 'Perspektywa żołnierza zwycięskiej strony',
  },
  {
    id: 'side_b',
    label: 'Strona B',
    iconName: 'shield',
    color: '#f87171',
    description: 'Perspektywa żołnierza strony przeciwnej',
  },
  {
    id: 'mix',
    label: 'Mix',
    iconName: 'shuffle-variant',
    color: '#c084fc',
    description: 'Dwa głosy przeplatane — ten sam moment, dwa doświadczenia',
  },
];

// ── Nastroje scen → ikona / kolor ─────────────────────────
const MOOD_META: Record<string, { iconName: string; label: string; color: string }> = {
  // Nastroje z seed script
  dramatic:    { iconName: 'fire',                label: 'Dramatyczny',  color: '#f97316' },
  tense:       { iconName: 'timer-sand',          label: 'Napięcie',     color: '#fbbf24' },
  melancholic: { iconName: 'weather-rainy',       label: 'Melancholia',  color: '#94a3b8' },
  triumphant:  { iconName: 'trophy',              label: 'Triumf',       color: '#4ade80' },
  brutal:      { iconName: 'skull-crossbones',    label: 'Brutalny',     color: '#ef4444' },
  strategic:   { iconName: 'map',                 label: 'Strategiczny', color: '#a78bfa' },
  desperate:   { iconName: 'alert',               label: 'Desperacja',   color: '#fb923c' },
  heroic:      { iconName: 'lightning-bolt',      label: 'Heroiczny',    color: '#facc15' },
  // Nastroje legacy (zachowane dla kompatybilności)
  atmospheric: { iconName: 'weather-fog',         label: 'Atmosfera',    color: '#60a5fa' },
  gathering:   { iconName: 'account-group',       label: 'Zgrupowanie',  color: '#a78bfa' },
  charge:      { iconName: 'sword',               label: 'Szarża',       color: '#f97316' },
  combat:      { iconName: 'sword',               label: 'Walka',        color: '#ef4444' },
  retreat:     { iconName: 'run-fast',            label: 'Odwrót',       color: '#8b5cf6' },
  victory:     { iconName: 'trophy',              label: 'Zwycięstwo',   color: '#4ade80' },
  defeat:      { iconName: 'skull-crossbones',    label: 'Klęska',       color: '#94a3b8' },
  aftermath:   { iconName: 'weather-sunset-down', label: 'Po walce',     color: '#cbd5e1' },
  narrative:   { iconName: 'scroll-text',         label: 'Narracja',     color: '#93c5fd' },
};

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function BattleDetailScreen({ route, navigation }: ScreenProps<'BattleDetail'>) {
  const { battleId } = route.params || { battleId: 'grunwald-1410' };
  const { battles, markBattleListened, canAccessBattle, getCampaignForBattle, purchaseCampaign, user } = useAppStore();
  const { t } = useTranslation();
  useFocusEffect(useCallback(() => { logScreenView('BattleDetail'); }, []));
  const battle    = battles.find(b => b.id === battleId);
  const isLocked  = !canAccessBattle(battleId);
  const campaign  = isLocked ? getCampaignForBattle(battleId) : undefined;
  const [showCampaignBanner, setShowCampaignBanner] = useState(isLocked);
  const insets = useSafeAreaInsets();

  // ── Sceny z Firestore ─────────────────────────────────
  const [scenes, setScenes]           = useState<Scene[]>([]);
  const [scenesLoading, setScenesLoading] = useState(true);
  const scenesRef = useRef<Scene[]>([]);

  useEffect(() => {
    setScenesLoading(true);
    getBattleById(battleId).then(full => {
      const loaded = full?.scenes ?? [];
      setScenes(loaded);
      scenesRef.current = loaded;
      setScenesLoading(false);
    }).catch(err => {
      if (__DEV__) console.warn('[BattleDetail] Failed to load scenes:', err);
      setScenesLoading(false);
    });
  }, [battleId]);

  // Łączny czas narracji (w sekundach)
  const totalSeconds = useMemo(
    () => scenes.reduce((s, sc) => s + sc.duration, 0),
    [scenes],
  );

  // ── Stan odtwarzacza ─────────────────────────────────
  const [activePerspective, setActivePerspective] = useState<Perspective>('narrator');
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [currentScene, setCurrentScene] = useState(0);
  const [audioError,   setAudioError]   = useState<string | null>(null);
  const [isDemoMode,   setIsDemoMode]   = useState(false);

  // ── Stan UI ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'player' | 'info' | 'scenes'>('player');
  const [heroImgError,     setHeroImgError]     = useState(false);
  const [imageFullscreen, setImageFullscreen] = useState(false);

  // Resetuj błąd obrazu gdy URL zmieni się (np. Wikipedia API dostarczy nowy URL)
  useEffect(() => {
    setHeroImgError(false);
  }, [battle?.imageUrl]);

  // ── Audio refs ───────────────────────────────────────
  const soundRef          = useRef<any>(null);
  const currentSceneRef   = useRef(0);
  const sceneStartSecsRef = useRef(0);
  const sceneDurationsRef = useRef<number[]>([]);
  const activePerspRef    = useRef<Perspective>('narrator');
  const playSceneRef      = useRef<(idx: number) => void>(null!);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const playBtnScale = useRef(new Animated.Value(1)).current;

  // Synchronizuj perspektywę do refa
  useEffect(() => { activePerspRef.current = activePerspective; }, [activePerspective]);

  // Wyznacz aktualną scenę na podstawie czasu
  useEffect(() => {
    const scns = scenesRef.current;
    let elapsed = 0;
    for (let i = 0; i < scns.length; i++) {
      elapsed += scns[i].duration;
      if (currentTime < elapsed) {
        setCurrentScene(i);
        break;
      }
    }
  }, [currentTime]);

  // ── Animacja progressu ───────────────────────────────
  useEffect(() => {
    const pct = duration > 0 ? currentTime / duration : 0;
    Animated.timing(progressAnim, {
      toValue: pct, duration: 300, useNativeDriver: false,
    }).start();
  }, [currentTime, duration]);

  // ── Przełącz perspektywę ─────────────────────────────
  const switchPerspective = async (p: Perspective) => {
    if (p === activePerspective) return;
    hapticSelect();

    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsPlaying(false);
    setIsDemoMode(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
    sceneStartSecsRef.current = 0;
    sceneDurationsRef.current = [];
    currentSceneRef.current = 0;
    setCurrentScene(0);
    setActivePerspective(p);
  };

  // ── Playback status handler ───────────────────────────
  const handlePlaybackStatus = useCallback((status: any, sceneIdx: number) => {
    if (!status.isLoaded) return;

    const posSecs = (status.positionMillis ?? 0) / 1000;
    setCurrentTime(sceneStartSecsRef.current + posSecs);

    // Zaktualizuj łączny czas trwania gdy poznamy rzeczywisty
    if (status.durationMillis && !sceneDurationsRef.current[sceneIdx]) {
      sceneDurationsRef.current[sceneIdx] = status.durationMillis / 1000;
      const scns = scenesRef.current;
      let total = 0;
      for (let i = 0; i < scns.length; i++) {
        total += sceneDurationsRef.current[i] ?? scns[i].duration;
      }
      setDuration(total);
    }

    if (status.didJustFinish) {
      const scns = scenesRef.current;
      const sceneDur = sceneDurationsRef.current[sceneIdx] ?? scns[sceneIdx]?.duration ?? 0;
      if (sceneIdx < scns.length - 1) {
        sceneStartSecsRef.current += sceneDur;
        playSceneRef.current(sceneIdx + 1);
      } else {
        setIsPlaying(false);
        markBattleListened(battleId);
        setCurrentTime(0);
        sceneStartSecsRef.current = 0;
        currentSceneRef.current = 0;
        setCurrentScene(0);
      }
    }
  }, [battleId, markBattleListened]);

  // ── Odtwórz scenę ────────────────────────────────────
  const playScene = useCallback(async (sceneIdx: number) => {
    const scns = scenesRef.current;
    if (sceneIdx >= scns.length) return;

    const scene = scns[sceneIdx];
    currentSceneRef.current = sceneIdx;
    setCurrentScene(sceneIdx);
    setIsLoading(true);
    setAudioError(null);

    try {
      const voiceName = activePerspRef.current === 'mix'
        ? (sceneIdx % 2 === 0 ? 'side_a' : 'side_b')
        : activePerspRef.current;

      const uri = await generateAndCacheNarration(
        battleId, String(scene.id), scene.text, voiceName,
      );

      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      if (!uri) {
        // Brak klucza API — tryb demo
        const total = scenesRef.current.reduce((s, sc) => s + sc.duration, 0);
        setIsLoading(false);
        setIsPlaying(true);
        setIsDemoMode(true);
        setDuration(total);
        Alert.alert(
          t('battle.demo_mode_title'),
          t('battle.demo_mode_msg'),
          [{ text: t('common.ok') }],
        );
        return;
      }

      if (!Audio) {
        setIsLoading(false);
        Alert.alert(
          t('battle.expo_go_title'),
          t('battle.expo_go_msg'),
        );
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status: any) => handlePlaybackStatus(status, sceneIdx),
      );
      soundRef.current = sound;
      setIsLoading(false);
      setIsPlaying(true);
      setIsDemoMode(false);
    } catch (e: unknown) {
      setIsLoading(false);
      setAudioError(e instanceof Error ? e.message : t('narration.audio_error'));
      setIsPlaying(false);
    }
  }, [battleId, handlePlaybackStatus]);

  // Aktualizuj ref przy zmianie playScene (zapobiega stale closure)
  useEffect(() => { playSceneRef.current = playScene; }, [playScene]);

  // ── Play / Pause ─────────────────────────────────────
  const handlePlayPause = async () => {
    hapticMedium();
    Animated.sequence([
      Animated.timing(playBtnScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(playBtnScale, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();

    if (isPlaying) {
      if (isDemoMode) {
        setIsPlaying(false);
      } else if (soundRef.current) {
        await soundRef.current.pauseAsync().catch(() => {});
        setIsPlaying(false);
      }
      return;
    }

    // Wznów jeśli zatrzymany
    if (!isDemoMode && soundRef.current) {
      await soundRef.current.playAsync().catch(() => {});
      setIsPlaying(true);
      return;
    }

    // Zacznij od sceny 0
    sceneStartSecsRef.current = 0;
    sceneDurationsRef.current = [];
    setCurrentTime(0);
    playScene(0);
  };

  // ── Symulacja postępu (tryb demo — brak klucza API) ──
  const demoFinishedRef = useRef(false);
  useEffect(() => {
    if (!isPlaying || !isDemoMode) { demoFinishedRef.current = false; return; }
    const total = scenesRef.current.reduce((s, sc) => s + sc.duration, 0);
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= total && !demoFinishedRef.current) {
          demoFinishedRef.current = true;
          clearInterval(interval);
          setIsPlaying(false);
          setIsDemoMode(false);
          markBattleListened(battleId);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isDemoMode, battleId, markBattleListened]);

  // ── Cleanup ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ── Formatuj czas ────────────────────────────────────
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!battle) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.errorText}>{t('battle.not_found')}</Text>
      </View>
    );
  }

  const scene       = currentScene < scenes.length ? scenes[currentScene] : undefined;
  const moodMeta    = MOOD_META[scene?.mood ?? ''] || MOOD_META.narrative;
  const perspective = PERSPECTIVES.find(p => p.id === activePerspective) ?? PERSPECTIVES[0];
  const displayTotal = duration || totalSeconds;

  // ── Overlay dla zablokowanej bitwy ──────────────────────
  if (isLocked && showCampaignBanner) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        {/* Nagłówek — przycisk wróć */}
        <View style={[lockedStyles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={lockedStyles.backBtn}>
            <GoldIcon name="arrow-left" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[lockedStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Obraz tytułowy jako tło */}
          <View style={lockedStyles.heroBlur}>
            {(BATTLE_LOCAL_IMAGES[battle.id] || battle.imageUrl) && (
              <Image
                source={BATTLE_LOCAL_IMAGES[battle.id] ?? { uri: battle.imageUrl }}
                style={lockedStyles.heroImg}
                resizeMode="cover"
                blurRadius={8}
              />
            )}
            <View style={lockedStyles.heroOverlay} />
            <View style={lockedStyles.heroContent}>
              <GoldIcon name="lock" size={32} color="#888" />
              <Text style={lockedStyles.heroTitle}>{battle.name}</Text>
              <Text style={lockedStyles.heroDate}>{battle.date} · {battle.location.name}</Text>
            </View>
          </View>

          {/* Campaign banner pełna wersja */}
          {campaign ? (
            <CampaignBanner
              campaign={campaign}
              userCoins={user?.coins ?? 0}
              battleName={battle.name}
              onPurchase={() => {
                purchaseCampaign(campaign.id);
                setShowCampaignBanner(false);
              }}
              onDismiss={() => setShowCampaignBanner(false)}
            />
          ) : (
            /* Brak kampanii — prosty komunikat z powrotem */
            <View style={lockedStyles.noPackWrap}>
              <GoldIcon name="lock" size={28} color={Colors.gold} />
              <Text style={lockedStyles.noPackTitle}>{t('battle.locked')}</Text>
              <Text style={lockedStyles.noPackText}>
                {t('battle.unlock_hint')}
              </Text>
              <TouchableOpacity style={lockedStyles.noPackBtn} onPress={() => navigation.goBack()}>
                <Text style={lockedStyles.noPackBtnText}>{t('battle.back_to_map')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── NAGŁÓWEK HERO ──────────────────────────────── */}
      <View style={styles.heroContainer}>

        {/* Sekcja zdjęcia — padding-top na status bar, reszta auto-height przez contain */}
        <View style={[styles.heroImageSection, { paddingTop: insets.top }]}>
          {(BATTLE_LOCAL_IMAGES[battle.id] || (battle.imageUrl && !heroImgError)) ? (
            <TouchableOpacity
              onPress={() => setImageFullscreen(true)}
              activeOpacity={0.92}
              style={{ width: '100%' }}
            >
              <Image
                source={BATTLE_LOCAL_IMAGES[battle.id] ?? { uri: battle.imageUrl }}
                style={styles.heroImg}
                resizeMode="cover"
                onError={() => {
                  if (!BATTLE_LOCAL_IMAGES[battle.id]) {
                    if (__DEV__) console.warn(`[BattleDetail] Błąd obrazu: ${battle.imageUrl}`);
                    setHeroImgError(true);
                  }
                }}
                onLoad={() => {}}
              />
              <View style={styles.heroImageOverlay} />
              <View style={[styles.heroImgHint, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Icon id="search" size={10} color="rgba(255,255,255,0.75)" />
                <Text style={styles.heroImgHintTxt}>{t('battle.enlarge')}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.heroPlaceholder} />
          )}

          {/* Przycisk wstecz */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.heroBackBtn, { top: insets.top + 8 }]}
          >
            <GoldIcon name="arrow-left" lib="mci" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Sekcja tytułu — pod zdjęciem, ciemne tło */}
        <View style={styles.heroInfoSection}>
          <Text style={styles.heroTitle} numberOfLines={2}>{battle.name}</Text>
          <Text style={styles.heroSub}>{battle.date} · {battle.location.name}</Text>
        </View>

      </View>

      {/* ── ZAKŁADKI ────────────────────────────────── */}
      <View style={styles.tabs}>
        {(['player', 'info', 'scenes'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <GoldIcon
                name={tab === 'player' ? 'play' : tab === 'info' ? 'information' : 'scroll-text'}
                lib="mci"
                size={13}
                color={activeTab === tab ? Colors.gold : Colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'player' ? t('battle.tab_player') : tab === 'info' ? t('battle.tab_info') : t('battle.tab_scenes')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ════════════════════════════════════════════
            ZAKŁADKA: ODTWARZACZ
        ════════════════════════════════════════════ */}
        {activeTab === 'player' && (
          <View style={styles.playerTab}>

            {/* Immersyjny odtwarzacz — link do NarrationScreen */}
            <TouchableOpacity
              style={[styles.immersiveBtn, { borderColor: `${perspective.color}50` }]}
              onPress={() => navigation.navigate('Narration', {
                battleId,
                initialPerspective: activePerspective,
              })}
              activeOpacity={0.8}
            >
              <GoldIcon name="book-open-variant" lib="mci" size={24} color={perspective.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.immersiveBtnTitle, { color: perspective.color }]}>
                  {t('battle.narration_text')}
                </Text>
                <Text style={styles.immersiveBtnSub}>
                  {t('battle.narration_text_sub')}
                </Text>
              </View>
              <GoldIcon name="chevron-right" lib="mci" size={22} color={perspective.color} />
            </TouchableOpacity>

            {/* Quiz historyczny */}
            <TouchableOpacity
              style={[styles.immersiveBtn, { borderColor: 'rgba(251,191,36,0.45)' }]}
              onPress={() => {
                hapticMedium();
                navigation.navigate('Quiz', {
                  battleId,
                  battleName: battle?.name ?? 'Bitwa',
                });
              }}
              activeOpacity={0.8}
            >
              <GoldIcon name="head-question-outline" lib="mci" size={24} color="#fbbf24" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.immersiveBtnTitle, { color: '#fbbf24' }]}>
                  {t('battle.quiz_title')}
                </Text>
                <Text style={styles.immersiveBtnSub}>
                  {t('battle.quiz_sub')}
                </Text>
              </View>
              <GoldIcon name="chevron-right" lib="mci" size={22} color="#fbbf24" />
            </TouchableOpacity>

            {/* Host Classroom — visible only in Educator mode */}
            {user?.isEducator && (
              <TouchableOpacity
                style={[styles.immersiveBtn, { borderColor: 'rgba(99,102,241,0.45)' }]}
                onPress={async () => {
                  hapticMedium();
                  try {
                    const { sessionId, pin } = await createSession({
                      hostId:    user.id,
                      hostName:  user.name,
                      battleId,
                      battleName: battle?.name ?? 'Bitwa',
                    });
                    hapticSuccess();
                    navigation.navigate('HostLobby', {
                      sessionId, pin,
                      battleId,
                      battleName: battle?.name ?? 'Bitwa',
                    });
                  } catch {
                    Alert.alert(t('common.error'), t('battle.session_error'));
                  }
                }}
                activeOpacity={0.8}
              >
                <GoldIcon name="school" lib="mci" size={24} color="#818cf8" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.immersiveBtnTitle, { color: '#818cf8' }]}>
                    {t('battle.teach_class')}
                  </Text>
                  <Text style={styles.immersiveBtnSub}>
                    {t('battle.teach_class_sub')}
                  </Text>
                </View>
                <GoldIcon name="chevron-right" lib="mci" size={22} color="#818cf8" />
              </TouchableOpacity>
            )}

            {/* Udostępnij bitwę */}
            <TouchableOpacity
              style={[styles.immersiveBtn, { borderColor: 'rgba(96,165,250,0.45)' }]}
              onPress={() => {
                hapticSelect();
                socialService.shareBattle(battle?.name ?? 'Bitwa', battleId);
              }}
              activeOpacity={0.8}
            >
              <GoldIcon name="share-variant" lib="mci" size={24} color="#60a5fa" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.immersiveBtnTitle, { color: '#60a5fa' }]}>
                  {t('battle.share')}
                </Text>
                <Text style={styles.immersiveBtnSub}>
                  {t('battle.share_sub')}
                </Text>
              </View>
              <GoldIcon name="chevron-right" lib="mci" size={22} color="#60a5fa" />
            </TouchableOpacity>

            {/* Wybór perspektywy */}
            <Text style={styles.sectionLabel}>{t('battle.perspective')}</Text>
            <View style={styles.perspectivesGrid}>
              {PERSPECTIVES.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.perspectiveCard,
                    activePerspective === p.id && {
                      borderColor: p.color,
                      backgroundColor: `${p.color}15`,
                    },
                  ]}
                  onPress={() => switchPerspective(p.id)}
                  activeOpacity={0.8}
                >
                  <GoldIcon
                    name={p.iconName}
                    lib="mci"
                    size={22}
                    color={activePerspective === p.id ? p.color : Colors.textMuted}
                  />
                  <Text style={[
                    styles.perspectiveLabel,
                    activePerspective === p.id && { color: p.color },
                  ]}>
                    {t(`battle.${p.id}` as any)}
                  </Text>
                  {activePerspective === p.id && (
                    <View style={[styles.perspectiveActive, { backgroundColor: p.color }]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Opis perspektywy */}
            <View style={[styles.perspectiveDesc, { borderLeftColor: perspective.color }]}>
              <GoldIcon name={perspective.iconName} lib="mci" size={18} color={perspective.color} />
              <Text style={styles.perspectiveDescText}>{t(`battle.${perspective.id}_desc` as any)}</Text>
            </View>

            {/* Aktualny nastrój sceny */}
            {isPlaying && scene && (
              <View style={[styles.moodBar, { borderColor: moodMeta.color }]}>
                <GoldIcon name={moodMeta.iconName} lib="mci" size={18} color={moodMeta.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moodLabel, { color: moodMeta.color }]}>
                    {t(`battle.mood_${scene?.mood ?? 'narrative'}` as any, { defaultValue: moodMeta.label })}
                  </Text>
                  <Text style={styles.moodText} numberOfLines={2}>
                    {scene.text}
                  </Text>
                </View>
                <Text style={styles.sceneNum}>
                  {currentScene + 1}/{scenes.length}
                </Text>
              </View>
            )}

            {audioError && (
              <Text style={{ fontSize: 13, color: '#ef4444', textAlign: 'center' }}>
                ⚠ {audioError}
              </Text>
            )}

            {/* Główny odtwarzacz */}
            <View style={styles.playerCard}>
              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: perspective.color,
                    },
                  ]}
                />
              </View>

              {/* Czas */}
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(displayTotal)}</Text>
              </View>

              {/* Kontrolki */}
              <View style={styles.controls}>
                {/* -15s */}
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={async () => {
                    if (soundRef.current && !isDemoMode) {
                      const s = await soundRef.current.getStatusAsync().catch(() => null);
                      if (s?.isLoaded) {
                        await soundRef.current.setPositionAsync(
                          Math.max(0, s.positionMillis - 15000),
                        ).catch(() => {});
                      }
                    } else {
                      setCurrentTime(t => Math.max(0, t - 15));
                    }
                  }}
                >
                  <GoldIcon name="rewind-15" lib="mci" size={22} color={Colors.textSecondary} />
                  <Text style={styles.controlBtnLabel}>15s</Text>
                </TouchableOpacity>

                {/* Play/Pause */}
                <Animated.View style={{ transform: [{ scale: playBtnScale }] }}>
                  <TouchableOpacity
                    style={[styles.playBtn, { backgroundColor: perspective.color }]}
                    onPress={handlePlayPause}
                    disabled={scenesLoading}
                    activeOpacity={1}
                  >
                    {(isLoading || scenesLoading)
                      ? <ActivityIndicator color="#0D1520" size="small" />
                      : <GoldIcon name={isPlaying ? 'pause' : 'play'} lib="mci" size={28} color="#0D1520" />
                    }
                  </TouchableOpacity>
                </Animated.View>

                {/* +15s */}
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={async () => {
                    if (soundRef.current && !isDemoMode) {
                      const s = await soundRef.current.getStatusAsync().catch(() => null);
                      if (s?.isLoaded) {
                        await soundRef.current.setPositionAsync(
                          Math.min(s.durationMillis ?? 0, s.positionMillis + 15000),
                        ).catch(() => {});
                      }
                    } else {
                      setCurrentTime(t => Math.min(displayTotal, t + 15));
                    }
                  }}
                >
                  <GoldIcon name="fast-forward-15" lib="mci" size={22} color={Colors.textSecondary} />
                  <Text style={styles.controlBtnLabel}>15s</Text>
                </TouchableOpacity>
              </View>

              {/* Szacowany czas narracji */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                <GoldIcon
                  name={scenesLoading ? 'timer-sand' : 'clock-outline'}
                  lib="mci"
                  size={12}
                  color={Colors.textMuted}
                />
                <Text style={styles.durationHint}>
                  {scenesLoading
                    ? t('battle.loading_scenes')
                    : scenes.length === 0
                      ? t('battle.no_recording')
                      : t('battle.narration_duration', { min: Math.round(displayTotal / 60), count: scenes.length })
                  }
                </Text>
              </View>
            </View>

            {/* Info o nagraniu */}
            <View style={styles.audioInfo}>
              <View style={styles.audioInfoRow}>
                <GoldIcon name="microphone" lib="mci" size={16} color={Colors.textMuted} />
                <Text style={styles.audioInfoText}>{t('battle.ai_narrator')}</Text>
              </View>
              <View style={styles.audioInfoRow}>
                <GoldIcon name="earth" lib="mci" size={16} color={Colors.textMuted} />
                <Text style={styles.audioInfoText}>{t('battle.offline_available')}</Text>
              </View>
              <View style={styles.audioInfoRow}>
                <GoldIcon name="bookshelf" lib="mci" size={16} color={Colors.textMuted} />
                <Text style={styles.audioInfoText}>{t('battle.sources')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════
            ZAKŁADKA: INFO
        ════════════════════════════════════════════ */}
        {activeTab === 'info' && (
          <View style={styles.infoTab}>
            <InfoBox label={t('battle.battle_label').toUpperCase()} text={battle.name} />
            <InfoBox label={t('battle.date').toUpperCase()} text={battle.date} />
            <InfoBox label={t('battle.place').toUpperCase()} text={battle.location.name} />
            <InfoBox label={t('battle.outcome').toUpperCase()} text={battle.outcome} />

            <View style={styles.sidesContainer}>
              <View style={styles.sideBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <GoldIcon name="sword" lib="mci" size={12} color="#4ade80" />
                  <Text style={styles.sideLabel}>{t('battle.side_a').toUpperCase()}</Text>
                </View>
                <Text style={styles.sideText}>{battle.sides[0]}</Text>
                <Text style={styles.commanderText}>
                  {t('battle.commander', { name: battle.commanders[0] })}
                </Text>
              </View>
              <View style={styles.vsBox}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <View style={styles.sideBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <GoldIcon name="shield" lib="mci" size={12} color="#f87171" />
                  <Text style={styles.sideLabel}>{t('battle.side_b').toUpperCase()}</Text>
                </View>
                <Text style={styles.sideText}>{battle.sides[1]}</Text>
                <Text style={styles.commanderText}>
                  {t('battle.commander', { name: battle.commanders[1] })}
                </Text>
              </View>
            </View>

            {/* GPS */}
            <View style={styles.gpsBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <GoldIcon name="map-marker" lib="mci" size={16} color={Colors.gold} />
                <Text style={styles.gpsTitle}>{t('battle.visit_battlefield')}</Text>
              </View>
              <Text style={styles.gpsText}>{battle.location.name}</Text>
              <Text style={styles.gpsCoords}>
                {battle.location.lat.toFixed(4)}°N, {battle.location.lng.toFixed(4)}°E
              </Text>
              <Text style={styles.gpsHint}>
                {t('battle.gps_hint')}
              </Text>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════
            ZAKŁADKA: SCENY
        ════════════════════════════════════════════ */}
        {activeTab === 'scenes' && (
          <View style={styles.scenesTab}>
            {scenesLoading ? (
              <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
            ) : scenes.length === 0 ? (
              <Text style={styles.scenesHint}>{t('battle.no_scenes')}</Text>
            ) : (
              <>
                <Text style={styles.scenesHint}>
                  {t('battle.scenes_count', { count: scenes.length })}
                </Text>
                {scenes.map((sc, i) => {
                  const meta    = MOOD_META[sc.mood] || MOOD_META.narrative;
                  const elapsed = scenes.slice(0, i).reduce((s, x) => s + x.duration, 0);
                  const isCurrent = i === currentScene && isPlaying;

                  return (
                    <TouchableOpacity
                      key={String(sc.id)}
                      style={[styles.sceneCard, isCurrent && {
                        borderColor: meta.color,
                        backgroundColor: `${meta.color}10`,
                      }]}
                      onPress={() => setCurrentTime(elapsed)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.sceneLeft}>
                        <GoldIcon name={meta.iconName} lib="mci" size={18} color={meta.color} />
                        <View style={[styles.sceneLine, { backgroundColor: meta.color }]} />
                      </View>
                      <View style={styles.sceneRight}>
                        <View style={styles.sceneHeader}>
                          <Text style={[styles.sceneMood, { color: meta.color }]}>
                            {t(`battle.mood_${sc.mood}` as any, { defaultValue: meta.label }).toUpperCase()}
                          </Text>
                          <Text style={styles.sceneTime}>
                            {formatTime(elapsed)} · {sc.duration}s
                          </Text>
                        </View>
                        <Text style={styles.sceneText} numberOfLines={2}>{sc.text}</Text>
                        {isCurrent && (
                          <View style={[styles.sceneNowPlaying, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                            <GoldIcon name="play" lib="mci" size={10} color={meta.color} />
                            <Text style={[styles.sceneNowText, { color: meta.color }]}>
                              {t('battle.now_playing')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal pełnoekranowy ─────────────────────── */}
      <Modal
        visible={imageFullscreen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImageFullscreen(false)}
      >
        <View style={styles.imgModal}>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setImageFullscreen(false)}
            activeOpacity={1}
          >
            <Image
              source={BATTLE_LOCAL_IMAGES[battle.id] ?? { uri: battle.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.imgModalClose, { top: insets.top + 8 }]}
            onPress={() => setImageFullscreen(false)}
          >
            <GoldIcon name="close" lib="mci" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

// ── Helper ────────────────────────────────────────────────
function InfoBox({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = Colors;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  errorText: { color: C.textMuted, fontSize: 16 },

  // Nagłówek hero — obraz + info pod spodem
  heroContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,168,76,0.3)',
    backgroundColor: '#0D1520',
  },
  // Sekcja zdjęcia — paddingTop przez insets, obraz w contain (pełny obraz)
  heroImageSection: {
    backgroundColor: '#0D1520',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D1520',
  },

  // Miniatura — kompaktowa wysokość, cover (pełne wypełnienie)
  heroImg: {
    width: '100%',
    height: 160,
  },
  // Hint "Powiększ" w prawym dolnym rogu miniatury
  heroImgHint: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  heroImgHintTxt: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  // Fullscreen modal
  imgModal: {
    flex: 1, backgroundColor: '#000',
  },
  imgModalClose: {
    position: 'absolute', right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  imgModalCloseTxt: {},  // unused — replaced by GoldIcon close
  heroBackBtn: {
    position: 'absolute', left: 14,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  heroBackBtnText: {},  // unused — replaced by GoldIcon arrow-left
  // Sekcja tytułu — poniżej zdjęcia, ciemne tło, czytelny tekst
  heroInfoSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 4,
    backgroundColor: '#0D1520',
  },
  heroTitle: {
    fontSize: 22, color: '#fff', fontWeight: '800', lineHeight: 28,
  },
  heroSub: {
    fontSize: 13, color: C.gold, fontWeight: '500',
  },

  // Zakładki
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.gold },
  tabText:   { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  tabTextActive: { color: C.gold },

  // Treść
  content: { flex: 1 },

  // ── Odtwarzacz ──
  playerTab: { padding: 16, gap: 16 },

  sectionLabel: {
    fontSize: 10, color: C.textMuted,
    letterSpacing: 1.5, fontWeight: '600',
  },

  perspectivesGrid: { flexDirection: 'row', gap: 8 },
  perspectiveCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault, gap: 4,
    position: 'relative', overflow: 'hidden',
  },
  perspectiveIcon:   {},  // unused — replaced by GoldIcon
  perspectiveLabel:  { fontSize: 11, color: C.textMuted, fontWeight: '600', textAlign: 'center' },
  perspectiveActive: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },

  perspectiveDesc: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 12, borderLeftWidth: 3,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  perspectiveDescIcon: {},  // unused — replaced by GoldIcon
  perspectiveDescText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 18 },

  // Nastrój
  moodBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 12, borderWidth: 1,
  },
  moodIcon:  {},  // unused — replaced by GoldIcon
  moodLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  moodText:  { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginTop: 2 },
  sceneNum:  { fontSize: 11, color: C.textMuted },

  // Odtwarzacz
  playerCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.lg,
    padding: 20, gap: 12,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  progressContainer: {
    height: 4, backgroundColor: C.backgroundElevated, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },

  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 12, color: C.textMuted, fontFamily: 'monospace' },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  controlBtn: { alignItems: 'center', gap: 2 },
  controlBtnText: {},  // unused — replaced by GoldIcon
  controlBtnLabel: { fontSize: 9, color: C.textMuted },

  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  playBtnIcon: {},  // unused — replaced by GoldIcon

  durationHint: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  // Przycisk do NarrationScreen
  immersiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.backgroundCard, borderRadius: Radius.lg,
    padding: 16, borderWidth: 1,
  },
  immersiveBtnIcon:  {},  // unused — replaced by GoldIcon
  immersiveBtnTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  immersiveBtnSub:   { fontSize: 12, color: C.textMuted },

  // Audio info
  audioInfo: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, gap: 8,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  audioInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  audioInfoIcon: {},  // unused — replaced by GoldIcon
  audioInfoText: { fontSize: 13, color: C.textSecondary },

  // ── Info ──
  infoTab: { padding: 16, gap: 12 },
  infoBox: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, gap: 4,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  infoLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  infoText:  { fontSize: 16, color: C.textPrimary },

  sidesContainer: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  sideBox: {
    flex: 1, backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 12, gap: 4, borderWidth: 1, borderColor: C.borderDefault,
  },
  sideLabel:     { fontSize: 10, color: C.textMuted, letterSpacing: 1, fontWeight: '600' },
  sideText:      { fontSize: 13, color: C.textPrimary, fontWeight: '600' },
  commanderText: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
  vsBox: { justifyContent: 'center', paddingHorizontal: 4 },
  vsText: { fontSize: 14, color: C.textMuted, fontWeight: '700' },

  gpsBox: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 16, gap: 6, borderWidth: 1, borderColor: C.borderGold,
  },
  gpsTitle:  { fontSize: 14, color: C.gold, fontWeight: '700' },
  gpsText:   { fontSize: 15, color: C.textPrimary },
  gpsCoords: { fontSize: 12, color: C.textMuted, fontFamily: 'monospace' },
  gpsHint:   { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginTop: 4 },

  // ── Sceny ──
  scenesTab: { padding: 16, gap: 10 },
  scenesHint:{ fontSize: 13, color: C.textMuted, marginBottom: 4 },

  sceneCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 12, borderWidth: 1, borderColor: C.borderDefault,
  },
  sceneLeft:   { alignItems: 'center', gap: 4 },
  sceneEmoji:  {},  // unused — replaced by GoldIcon
  sceneLine:   { width: 2, flex: 1, borderRadius: 1 },
  sceneRight:  { flex: 1, gap: 4 },
  sceneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sceneMood:   { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  sceneTime:   { fontSize: 10, color: C.textMuted, fontFamily: 'monospace' },
  sceneText:   { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  sceneNowPlaying: { marginTop: 4 },
  sceneNowText:    { fontSize: 11, fontWeight: '600' },
});

// ── Style dla locked overlay ──────────────────────────────
const lockedStyles = StyleSheet.create({
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 8,
    zIndex: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: {
    paddingTop: 72, // miejsce na header
    paddingHorizontal: 0,
    gap: 0,
  },
  heroBlur: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#1a1208',
    marginBottom: 4,
  },
  heroImg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16,
  },
  heroTitle: {
    fontSize: 20, fontWeight: '800',
    color: '#fff', textAlign: 'center',
  },
  heroDate: {
    fontSize: 12, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  noPackWrap: {
    margin: 16, padding: 24,
    borderRadius: 14,
    backgroundColor: '#0e0e0e',
    borderWidth: 1, borderColor: '#222',
    alignItems: 'center', gap: 12,
  },
  noPackTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.textPrimary,
  },
  noPackText: {
    fontSize: 13, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 19,
  },
  noPackBtn: {
    marginTop: 8,
    backgroundColor: Colors.gold,
    paddingHorizontal: 24, paddingVertical: 11,
    borderRadius: 10,
  },
  noPackBtnText: {
    fontSize: 14, fontWeight: '700', color: '#000',
  },
});
