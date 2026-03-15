// ============================================================
// BATTLE ECHOES — DownloadsScreen.tsx
// Pre-generuje narracje ElevenLabs do cache offline
// Perspektywa: narrator (domyślna) lub wybrana przez użytkownika
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, ERA_THEMES } from '../constants/theme';
import { useAppStore } from '../store';
import { getBattleById } from '../services/FirebaseService';
import {
  pregenerateBattle,
  countCachedNarrations,
  clearBattleCache,
} from '../services/ElevenLabsService';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/HapticsService';
import { ELEVENLABS_API_KEY } from '../constants/auth';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Icon, EraIcon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

// ── Typy ─────────────────────────────────────────────────────
interface BattleState {
  totalScenes:  number | null;  // null = sceny jeszcze nie załadowane
  cachedScenes: number;
  isGenerating: boolean;
  progress:     number;         // 0–total
  error?:       string;
}

const DEFAULT_VOICE = 'narrator';


const ERA_COLORS: Record<string, string> = {
  ancient: '#c084fc', medieval: '#D4A017', early_modern: '#60a5fa',
  napoleon: '#4ade80', ww1: '#94a3b8', ww2: '#f87171',
};

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function DownloadsScreen() {
  const { t } = useTranslation();
  const { battles, canAccessBattle } = useAppStore();
  const insets = useSafeAreaInsets();
  const [states, setStates] = useState<Record<string, BattleState>>({});
  const [eraDownloading, setEraDownloading] = useState<string | null>(null);
  const [eraProgress, setEraProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  useFocusEffect(useCallback(() => { logScreenView('Downloads'); }, []));
  const abortRefs = useRef<Record<string, boolean>>({});

  // ── Inicjalizacja: sprawdź cache dla każdej bitwy ──────────
  useEffect(() => {
    if (battles.length === 0) return;

    (async () => {
      const initial: Record<string, BattleState> = {};
      for (const b of battles) {
        const cached = await countCachedNarrations(b.id, DEFAULT_VOICE);
        initial[b.id] = {
          totalScenes:  null,
          cachedScenes: cached,
          isGenerating: false,
          progress:     0,
        };
      }
      setStates(initial);
    })();
  }, [battles]);

  // ── Generuj narrator dla jednej bitwy ─────────────────────
  const generate = useCallback(async (battleId: string) => {
    hapticMedium();
    if (!ELEVENLABS_API_KEY) {
      Alert.alert(
        t('downloads.no_api_key'),
        t('downloads.no_api_key_msg'),
      );
      return;
    }

    // Pobierz sceny z Firestore
    setStates(prev => ({
      ...prev,
      [battleId]: { ...prev[battleId], isGenerating: true, progress: 0, error: undefined },
    }));

    const full = await getBattleById(battleId);
    const scenes = full?.scenes ?? [];

    if (scenes.length === 0) {
      setStates(prev => ({
        ...prev,
        [battleId]: { ...prev[battleId], isGenerating: false, error: t('downloads.no_scenes') },
      }));
      return;
    }

    setStates(prev => ({
      ...prev,
      [battleId]: { ...prev[battleId], totalScenes: scenes.length },
    }));

    abortRefs.current[battleId] = false;

    const { succeeded, failed, skipped } = await pregenerateBattle(
      battleId,
      scenes,
      DEFAULT_VOICE,
      (done, total) => {
        if (abortRefs.current[battleId]) return;
        setStates(prev => ({
          ...prev,
          [battleId]: { ...prev[battleId], progress: done, totalScenes: total },
        }));
      },
    );

    const cached = await countCachedNarrations(battleId, DEFAULT_VOICE);

    setStates(prev => ({
      ...prev,
      [battleId]: {
        ...prev[battleId],
        isGenerating: false,
        cachedScenes: cached,
        totalScenes:  scenes.length,
        error: failed > 0 ? t('downloads.scenes_failed', { count: failed }) : undefined,
      },
    }));

    if (failed === 0) {
      hapticSuccess();
      Alert.alert(t('downloads.done_title'), t('downloads.done_msg', { count: succeeded + skipped }));
    }
  }, []);

  // ── Usuń cache danej bitwy ─────────────────────────────────
  const handleDelete = useCallback((battleId: string, battleName: string) => {
    hapticLight();
    Alert.alert(
      t('downloads.delete_title'),
      t('downloads.delete_confirm', { name: battleName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await clearBattleCache(battleId);
            setStates(prev => ({
              ...prev,
              [battleId]: { ...prev[battleId], cachedScenes: 0, totalScenes: null, progress: 0 },
            }));
          },
        },
      ],
    );
  }, []);

  // ── Generuj narracje dla całej epoki ────────────────────
  const generateEra = useCallback(async (eraId: string) => {
    hapticMedium();
    if (!ELEVENLABS_API_KEY) {
      Alert.alert(t('downloads.no_api_key'), t('downloads.no_api_key_msg'));
      return;
    }

    const eraBattles = battles.filter(b => b.era === eraId && canAccessBattle(b.id));
    if (eraBattles.length === 0) return;

    setEraDownloading(eraId);
    let totalDone = 0;
    let totalScenes = 0;

    for (const battle of eraBattles) {
      const full = await getBattleById(battle.id);
      const scenes = full?.scenes ?? [];
      if (scenes.length === 0) continue;

      totalScenes += scenes.length;
      setEraProgress({ done: totalDone, total: totalScenes });

      // Update individual battle state
      setStates(prev => ({
        ...prev,
        [battle.id]: { ...prev[battle.id], isGenerating: true, totalScenes: scenes.length, progress: 0 },
      }));

      await pregenerateBattle(
        battle.id,
        scenes,
        DEFAULT_VOICE,
        (done) => {
          setStates(prev => ({
            ...prev,
            [battle.id]: { ...prev[battle.id], progress: done },
          }));
          setEraProgress({ done: totalDone + done, total: totalScenes });
        },
      );

      const cached = await countCachedNarrations(battle.id, DEFAULT_VOICE);
      setStates(prev => ({
        ...prev,
        [battle.id]: {
          ...prev[battle.id],
          isGenerating: false,
          cachedScenes: cached,
          totalScenes: scenes.length,
        },
      }));

      totalDone += scenes.length;
    }

    setEraDownloading(null);
    setEraProgress({ done: 0, total: 0 });
    hapticSuccess();
    Alert.alert(t('downloads.done_title'), t('downloads.era_done_msg', { era: t(`era_names.${eraId}`) }));
  }, [battles, canAccessBattle]);

  // ── Usuń cache całej epoki ──────────────────────────────
  const clearEraCache = useCallback(async (eraId: string) => {
    const eraBattles = battles.filter(b => b.era === eraId);
    hapticLight();
    Alert.alert(
      t('downloads.clear_era_title'),
      t('downloads.clear_era_confirm', { era: t(`era_names.${eraId}`) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            for (const b of eraBattles) {
              await clearBattleCache(b.id);
              setStates(prev => ({
                ...prev,
                [b.id]: { ...prev[b.id], cachedScenes: 0, totalScenes: null, progress: 0 },
              }));
            }
          },
        },
      ],
    );
  }, [battles]);

  // Zlicz ogólne statystyki
  const totalCached  = Object.values(states).reduce((s, st) => s + st.cachedScenes, 0);
  const generatingAny = Object.values(states).some(st => st.isGenerating);

  return (
    <View style={styles.container}>

      {/* ── Nagłówek ─────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <View style={styles.headerTitleRow}>
            <Icon id="download" size={20} color={C.textPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>{t('downloads.offline')}</Text>
          </View>
          <Text style={styles.headerSub}>{t('downloads.narrations_local')}</Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.statChip}>{t('downloads.scenes_cached', { count: totalCached })}</Text>
        </View>
      </View>

      {/* ── Info o API ────────────────────────────────────── */}
      {!ELEVENLABS_API_KEY && (
        <View style={styles.apiWarning}>
          <View style={styles.apiWarningRow}>
            <Icon id="alert" size={14} color="#fbbf24" style={{ marginRight: 6 }} />
            <Text style={styles.apiWarningText}>
              {t('downloads.no_api_key_warn')}
            </Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.hint}>
          {t('downloads.hint')}
        </Text>

        {battles.length === 0 && (
          <View style={styles.emptyState}>
            <Icon id="timer_sand" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>{t('downloads.loading_battles')}</Text>
          </View>
        )}

        {/* Era packs */}
        <Text style={styles.sectionTitle}>{t('downloads.era_packs')}</Text>
        {Object.keys(ERA_THEMES).map(eraId => {
          const eraBattles = battles.filter(b => b.era === eraId);
          const eraCached = eraBattles.reduce((sum, b) => sum + (states[b.id]?.cachedScenes ?? 0), 0);
          const eraTotal = eraBattles.reduce((sum, b) => {
            const st = states[b.id];
            return sum + (st?.totalScenes ?? 0);
          }, 0);

          return (
            <EraPackCard
              key={eraId}
              eraId={eraId}
              battleCount={eraBattles.length}
              cachedScenes={eraCached}
              totalScenes={eraTotal}
              isDownloading={eraDownloading === eraId}
              progress={eraDownloading === eraId ? eraProgress : { done: 0, total: 0 }}
              onDownload={() => generateEra(eraId)}
              onClear={() => clearEraCache(eraId)}
            />
          );
        })}

        <View style={styles.dividerLine} />
        <Text style={styles.sectionTitle}>{t('downloads.individual')}</Text>

        {battles.map(battle => {
          const st       = states[battle.id];
          const unlocked = canAccessBattle(battle.id);
          const cached   = st?.cachedScenes ?? 0;
          const total    = st?.totalScenes ?? null;
          const generating = st?.isGenerating ?? false;
          const progress = st?.progress ?? 0;
          const isDone   = total !== null && cached >= total && total > 0;

          return (
            <BattleCard
              key={battle.id}
              battle={battle}
              unlocked={unlocked}
              cached={cached}
              total={total}
              generating={generating}
              progress={progress}
              error={st?.error}
              isDone={isDone}
              onGenerate={() => generate(battle.id)}
              onDelete={() => handleDelete(battle.id, battle.name)}
            />
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA BITWY
// ════════════════════════════════════════════════════════════
function BattleCard({
  battle, unlocked, cached, total, generating, progress,
  error, isDone, onGenerate, onDelete,
}: {
  battle:     any;
  unlocked:   boolean;
  cached:     number;
  total:      number | null;
  generating: boolean;
  progress:   number;
  error?:     string;
  isDone:     boolean;
  onGenerate: () => void;
  onDelete:   () => void;
}) {
  const { t } = useTranslation();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (total && total > 0) {
      Animated.timing(progressAnim, {
        toValue:  progress / total,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, total]);

  const pct = total ? Math.round((cached / total) * 100) : 0;

  const eraColor = ERA_COLORS[battle.era] ?? Colors.gold;

  return (
    <View style={[styles.card, !unlocked && styles.cardLocked]}>
      {/* Nagłówek */}
      <View style={styles.cardHeader}>
        <View style={[styles.eraIconWrap, { backgroundColor: `${eraColor}20` }]}>
          <EraIcon eraId={battle.era ?? 'medieval'} size={18} color={eraColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1}>{battle.name}</Text>
          <Text style={styles.cardMeta}>{battle.date} · {battle.era}</Text>
        </View>
        {!unlocked && (
          <Icon id="lock" size={18} color={C.textMuted} />
        )}
      </View>

      {/* Status cache */}
      <View style={styles.cacheRow}>
        <View style={styles.cacheTrack}>
          {generating ? (
            <Animated.View style={[
              styles.cacheFill,
              {
                backgroundColor: eraColor,
                width: total ? progressAnim.interpolate({
                  inputRange:  [0, 1],
                  outputRange: ['0%', '100%'],
                }) : '0%',
              },
            ]} />
          ) : (
            <View style={[styles.cacheFill, {
              backgroundColor: isDone ? '#4ade80' : eraColor,
              width: `${pct}%`,
            }]} />
          )}
        </View>

        <Text style={styles.cacheLabel}>
          {generating
            ? t('downloads.scenes_progress', { done: progress, total: total ?? '?' })
            : total !== null
              ? t('downloads.scenes_count', { cached, total })
              : cached > 0
                ? t('downloads.scenes_cached', { count: cached })
                : t('downloads.no_cache')
          }
        </Text>
      </View>

      {error && (
        <View style={styles.errorRow}>
          <Icon id="alert" size={13} color="#f87171" style={{ marginRight: 4 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Akcje */}
      {unlocked && (
        <View style={styles.actions}>
          {isDone ? (
            <>
              <View style={styles.doneBadge}>
                <View style={styles.doneBadgeInner}>
                  <Icon id="check_solid" size={13} color="#4ade80" style={{ marginRight: 4 }} />
                  <Text style={styles.doneBadgeText}>{t('downloads.offline_ready')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <Icon id="trash" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </>
          ) : generating ? (
            <View style={styles.generatingBadge}>
              <View style={styles.generatingInner}>
                <Icon id="timer_sand" size={13} color={Colors.gold} style={{ marginRight: 4 }} />
                <Text style={styles.generatingText}>{t('downloads.generating_ai')}</Text>
              </View>
            </View>
          ) : (
            <>
              {cached > 0 && (
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                  <Icon id="trash" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.generateBtn, { borderColor: eraColor, backgroundColor: `${eraColor}18` }]}
                onPress={onGenerate}
                activeOpacity={0.8}
              >
                <View style={styles.generateBtnInner}>
                  <Icon id="download" size={14} color={eraColor} style={{ marginRight: 4 }} />
                  <Text style={[styles.generateBtnText, { color: eraColor }]}>
                    {cached > 0 ? t('downloads.complete_btn') : t('downloads.generate_offline')}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA EPOKI (batch download)
// ════════════════════════════════════════════════════════════
function EraPackCard({
  eraId, battleCount, cachedScenes, totalScenes,
  isDownloading, progress, onDownload, onClear,
}: {
  eraId: string;
  battleCount: number;
  cachedScenes: number;
  totalScenes: number;
  isDownloading: boolean;
  progress: { done: number; total: number };
  onDownload: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const color = ERA_COLORS[eraId] ?? Colors.gold;
  const name = t(`era_names.${eraId}`) || eraId;
  const isDone = totalScenes > 0 && cachedScenes >= totalScenes;
  const pct = totalScenes > 0 ? Math.round((cachedScenes / totalScenes) * 100) : 0;

  return (
    <View style={[styles.eraCard, { borderColor: `${color}40` }]}>
      <View style={styles.eraCardHeader}>
        <View style={[styles.eraIconWrap, { backgroundColor: `${color}20` }]}>
          <EraIcon eraId={eraId} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eraCardName, { color }]}>{name}</Text>
          <Text style={styles.eraCardMeta}>{t('downloads.battles_count', { count: battleCount })} · {t('downloads.scenes_count', { cached: cachedScenes, total: totalScenes > 0 ? totalScenes : '?' })}</Text>
        </View>
        {isDone && <Icon id="check_solid" size={18} color="#4ade80" />}
      </View>

      {/* Progress bar */}
      <View style={styles.cacheTrack}>
        <View style={[styles.cacheFill, {
          backgroundColor: isDone ? '#4ade80' : color,
          width: `${pct}%`,
        }]} />
      </View>

      {/* Actions */}
      <View style={styles.eraActions}>
        {isDownloading ? (
          <View style={[styles.generatingBadge, { flex: 1 }]}>
            <View style={styles.generatingInner}>
              <Icon id="timer_sand" size={13} color={Colors.gold} style={{ marginRight: 4 }} />
              <Text style={styles.generatingText}>
                {progress.total > 0 ? t('downloads.scenes_progress', { done: progress.done, total: progress.total }) + '...' : t('downloads.preparing')}
              </Text>
            </View>
          </View>
        ) : isDone ? (
          <>
            <View style={[styles.doneBadge, { flex: 1 }]}>
              <View style={styles.doneBadgeInner}>
                <Icon id="check_solid" size={13} color="#4ade80" style={{ marginRight: 4 }} />
                <Text style={styles.doneBadgeText}>{t('downloads.offline_ready')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={onClear}>
              <Icon id="trash" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {cachedScenes > 0 && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onClear}>
                <Icon id="trash" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.generateBtn, { borderColor: color, backgroundColor: `${color}18`, flex: 1 }]}
              onPress={onDownload}
              activeOpacity={0.8}
            >
              <View style={styles.generateBtnInner}>
                <Icon id="download" size={14} color={color} style={{ marginRight: 4 }} />
                <Text style={[styles.generateBtnText, { color }]}>
                  {cachedScenes > 0 ? t('downloads.complete_era') : t('downloads.download_era')}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = Colors;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle:    { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  headerSub:      { fontSize: 13, color: C.textMuted, marginTop: 2 },
  headerStats:    { alignItems: 'flex-end' },
  statChip: {
    fontSize: 12, color: C.gold, fontWeight: '700',
    backgroundColor: `${C.gold}18`, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: `${C.gold}40`,
  },

  apiWarning: {
    backgroundColor: 'rgba(251,191,36,0.1)', padding: 12, margin: 12,
    borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
  },
  apiWarningRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  apiWarningText: { fontSize: 12, color: '#fbbf24', lineHeight: 18, flex: 1 },

  scroll: { padding: 16, gap: 10 },
  hint:   { fontSize: 13, color: C.textMuted, lineHeight: 18, marginBottom: 4 },

  sectionTitle: {
    fontSize: 13, color: C.gold, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', marginTop: 8, marginBottom: 4,
  },
  dividerLine: {
    height: 1, backgroundColor: C.borderDefault, marginVertical: 12,
  },

  // ── Karta epoki ─────────────────────────────────────────────
  eraCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.lg,
    borderWidth: 1, padding: 14, gap: 10, marginBottom: 4,
  },
  eraCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eraCardName: { fontSize: 15, fontWeight: '700' },
  eraCardMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  eraActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, color: C.textMuted },

  // ── Karta bitwy ───────────────────────────────────────────
  card: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: C.borderDefault,
    padding: 14, gap: 10,
  },
  cardLocked: { opacity: 0.5 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eraIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 15, color: C.textPrimary, fontWeight: '700' },
  cardMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  // Cache progress
  cacheRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cacheTrack: {
    flex: 1, height: 4, backgroundColor: C.backgroundElevated,
    borderRadius: 2, overflow: 'hidden',
  },
  cacheFill: { height: 4, borderRadius: 2, minWidth: 2 },
  cacheLabel: { fontSize: 11, color: C.textMuted, fontFamily: 'monospace', width: 80, textAlign: 'right' },

  errorRow:  { flexDirection: 'row', alignItems: 'center' },
  errorText: { fontSize: 12, color: '#f87171', flex: 1 },

  // Akcje
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },

  doneBadge: {
    flex: 1, backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
  },
  doneBadgeInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  doneBadgeText:  { fontSize: 12, color: '#4ade80', fontWeight: '700' },

  generatingBadge: {
    flex: 1, backgroundColor: `${Colors.gold}10`, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: `${Colors.gold}30`,
  },
  generatingInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  generatingText:  { fontSize: 12, color: Colors.gold, fontWeight: '600' },

  generateBtn: {
    flex: 1, borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
  },
  generateBtnInner: { flexDirection: 'row', alignItems: 'center' },
  generateBtnText:  { fontSize: 13, fontWeight: '700' },

  deleteBtn: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
  },
});
