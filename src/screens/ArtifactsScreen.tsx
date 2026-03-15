// ============================================================
// BATTLE ECHOES — ArtifactsScreen.tsx
// Ekran kolekcji artefaktów z animacją odsłonięcia
// ============================================================
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Modal, Dimensions,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import {
  ALL_ARTIFACTS, Artifact, Rarity,
  RARITY_META, getArtifactsForBattle,
  getCollectionStats,
} from '../artifacts/data';
import { FloatingReward, RewardToast } from '../components/XPSystem';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Icon, EraIcon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');
const CARD_SIZE = (SW - 48) / 3;

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function ArtifactsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, awardXP, awardCoins, battles } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('Artifacts'); }, []));
  const unlockedIds = user?.unlockedArtifacts || [];

  const [selected,    setSelected]    = useState<Artifact | null>(null);
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [filterBattle, setFilterBattle] = useState<string>('all');
  const [floaters,    setFloaters]    = useState<{ id: string; value: string; color: string }[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData,   setToastData]   = useState<{ icon: string; title: string; subtitle: string; color: string }>({ icon: '🏺', title: '', subtitle: '', color: Colors.gold });

  const stats = getCollectionStats(unlockedIds);

  // ── Filtrowanie ──────────────────────────────────────
  const filtered = useMemo(() => ALL_ARTIFACTS.filter(a => {
    if (filterRarity !== 'all' && a.rarity !== filterRarity) return false;
    if (filterBattle !== 'all' && a.battleId !== filterBattle) return false;
    return true;
  }), [filterRarity, filterBattle]);

  const showFloating = (value: string, color: string) => {
    const id = Math.random().toString(36).substring(2, 8);
    setFloaters(prev => [...prev, { id, value, color }]);
  };

  // ── Demo: odblokuj losowy artefakt ──────────────────
  const handleUnlockDemo = () => {
    const locked = ALL_ARTIFACTS.filter(a => !unlockedIds.includes(a.id));
    if (locked.length === 0) return;
    const artifact = locked[Math.floor(Math.random() * locked.length)];
    const meta     = RARITY_META[artifact.rarity];

    // Dodaj do store
    useAppStore.getState().unlockArtifact(artifact.id);
    awardXP(artifact.xpReward, `Artefakt: ${artifact.name}`);
    awardCoins(artifact.coinReward, `Artefakt: ${artifact.name}`);

    showFloating(`+${artifact.xpReward} XP`, '#fbbf24');
    setToastData({
      icon: artifact.icon,
      title: `${meta.label}: ${artifact.name}`,
      subtitle: t('artifacts.coins_reward', { xp: artifact.xpReward, coins: artifact.coinReward }),
      color: meta.color,
    });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);

    // Pokaż szczegóły
    setSelected(artifact);
  };

  // Unikalne battleId z danych artefaktów — tylko bitwy które mają artefakty
  const battleFilters = useMemo(() => {
    const artifactBattleIds = Array.from(new Set(ALL_ARTIFACTS.map(a => a.battleId)));
    return [
      { id: 'all', label: t('artifacts.all') },
      ...artifactBattleIds
        .map(bid => {
          const b = battles.find(b => b.id === bid);
          return b ? { id: bid, label: b.name.split(' ').slice(0, 2).join(' ') } : null;
        })
        .filter((x): x is { id: string; label: string } => x !== null),
    ];
  }, [battles]);

  const keyExtractor = useCallback((item: Artifact) => item.id, []);
  const renderArtifactItem = useCallback(({ item }: { item: Artifact }) => (
    <ArtifactCard
      artifact={item}
      unlocked={unlockedIds.includes(item.id)}
      onPress={() => setSelected(item)}
    />
  ), [unlockedIds]);
  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: CARD_SIZE, offset: (CARD_SIZE + 8) * Math.floor(index / 3), index,
  }), []);
  const columnWrapperStyle = useMemo(() => ({ gap: 8 }), []);

  return (
    <View style={styles.container}>
      {floaters.map(f => (
        <FloatingReward key={f.id} value={f.value} color={f.color} y={300}
          onDone={() => setFloaters(prev => prev.filter(x => x.id !== f.id))} />
      ))}
      <RewardToast visible={toastVisible} icon={toastData.icon}
        title={toastData.title} subtitle={toastData.subtitle} color={toastData.color} />

      {/* Modal szczegółów */}
      <ArtifactModal
        artifact={selected}
        unlocked={selected ? unlockedIds.includes(selected.id) : false}
        onClose={() => setSelected(null)}
      />

      {/* ── Nagłówek ─────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <View style={styles.headerTitleRow}>
            <Icon id="pot" size={18} color={Colors.textPrimary} />
            <Text style={styles.headerTitle}> {t('artifacts.title')}</Text>
          </View>
          <Text style={styles.headerSub}>
            {t('artifacts.collection_sub', { unlocked: stats.unlocked, total: stats.total, pct: stats.pct })}
          </Text>
        </View>
        <TouchableOpacity style={styles.demoBtn} onPress={handleUnlockDemo} activeOpacity={0.8}>
          <Text style={styles.demoBtnText}>+ Demo</Text>
        </TouchableOpacity>
      </View>

      {/* ── Statystyki rzadkości ─────────────────────── */}
      <View style={styles.rarityStats}>
        {(['common','uncommon','rare','legendary'] as Rarity[]).map(r => {
          const meta  = RARITY_META[r];
          const count = stats.byRarity[r];
          const total = ALL_ARTIFACTS.filter(a => a.rarity === r).length;
          return (
            <View key={r} style={styles.rarityStat}>
              <Text style={[styles.rarityStatNum, { color: meta.color }]}>{count}/{total}</Text>
              <Text style={styles.rarityStatLabel}>{meta.label}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Filtry — jeden pasek ─────────────────────── */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterGroupLabel}>{t('artifacts.battle_filter')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}>
          {battleFilters.map(b => (
            <TouchableOpacity
              key={b.id}
              style={[styles.filterChip, filterBattle === b.id && styles.filterChipActive]}
              onPress={() => setFilterBattle(b.id)}
            >
              <Text style={[styles.filterChipText, filterBattle === b.id && styles.filterChipTextActive]}>
                {b.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterGroupLabel}>{t('artifacts.rarity_filter')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}>
          {([['all', t('artifacts.all'), Colors.textMuted], ['common', t('artifacts.common'),'#94a3b8'],
             ['uncommon', t('artifacts.uncommon'),'#4ade80'], ['rare', t('artifacts.rare'),'#60a5fa'],
             ['legendary', t('artifacts.legendary'),'#D4A017']] as [string, string, string][]).map(([id, label, color]) => (
            <TouchableOpacity
              key={id}
              style={[styles.rarityChip, filterRarity === id && {
                backgroundColor: `${color}20`, borderColor: color,
              }]}
              onPress={() => setFilterRarity(id as any)}
            >
              <Text style={[styles.rarityChipText, filterRarity === id && { color }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Siatka artefaktów ────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={columnWrapperStyle}
        renderItem={renderArtifactItem}
        getItemLayout={getItemLayout}
        maxToRenderPerBatch={12}
        windowSize={5}
        initialNumToRender={12}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
              {t('artifacts.no_match')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA ARTEFAKTU
// ════════════════════════════════════════════════════════════
const ArtifactCard = React.memo(function ArtifactCard({ artifact, unlocked, onPress }: {
  artifact: Artifact;
  unlocked: boolean;
  onPress:  () => void;
}) {
  const meta      = RARITY_META[artifact.rarity];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  // Pulsowanie legendarne
  useEffect(() => {
    if (unlocked && artifact.rarity === 'legendary') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [unlocked]);

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 200 }).start();

  return (
    <Animated.View style={[
      styles.card,
      { transform: [{ scale: scaleAnim }] },
      unlocked && { borderColor: meta.color },
    ]}>
      {/* Glow dla legendarnych */}
      {unlocked && artifact.rarity === 'legendary' && (
        <Animated.View style={[
          styles.cardGlow,
          { backgroundColor: meta.glow, opacity: glowAnim },
        ]} />
      )}

      <TouchableOpacity
        style={styles.cardInner}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Ikona */}
        {unlocked ? (
          <Text style={styles.cardIcon}>{artifact.icon}</Text>
        ) : (
          <View style={styles.cardIconLocked}>
            <Icon id="lock" size={24} color={Colors.textMuted} />
          </View>
        )}

        {/* Rzadkość */}
        {unlocked && (
          <View style={[styles.rarityDot, { backgroundColor: meta.color }]} />
        )}

        {/* Nazwa */}
        <Text style={[styles.cardName, !unlocked && styles.cardNameLocked]}
          numberOfLines={2}>
          {unlocked ? artifact.name : '???'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════════
// MODAL SZCZEGÓŁÓW
// ════════════════════════════════════════════════════════════
function ArtifactModal({ artifact, unlocked, onClose }: {
  artifact: Artifact | null;
  unlocked: boolean;
  onClose:  () => void;
}) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const shineAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (artifact) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 65, friction: 12,
      }).start();

      // Shine effect dla odblokowanych
      if (unlocked) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(shineAnim, { toValue: 400, duration: 1500, useNativeDriver: true }),
            Animated.delay(3000),
            Animated.timing(shineAnim, { toValue: -200, duration: 0, useNativeDriver: true }),
          ])
        ).start();
      }
    } else {
      slideAnim.setValue(600);
      shineAnim.setValue(-200);
    }
  }, [artifact]);

  if (!artifact) return null;

  const meta = RARITY_META[artifact.rarity];

  // Mapowanie kategorii na iconId
  const categoryIconId =
    artifact.category === 'weapon'   ? 'sword'   :
    artifact.category === 'armor'    ? 'shield'  :
    artifact.category === 'document' ? 'scroll'  :
    'diamond';

  const categoryLabel =
    artifact.category === 'weapon'   ? t('artifacts.weapon')   :
    artifact.category === 'armor'    ? t('artifacts.armor')    :
    artifact.category === 'document' ? t('artifacts.document') :
    t('artifacts.personal');

  return (
    <Modal visible={!!artifact} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Shine overlay */}
            {unlocked && (
              <Animated.View style={[
                styles.shine,
                { transform: [{ translateX: shineAnim }, { skewX: '-20deg' }] },
              ]} />
            )}

            {/* Zamknij */}
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <Icon id="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Ikona */}
            <View style={[styles.modalIconBox, {
              backgroundColor: `${meta.color}15`,
              borderColor: meta.color,
              shadowColor: meta.color,
            }]}>
              {unlocked ? (
                <Text style={styles.modalIcon}>{artifact.icon}</Text>
              ) : (
                <Icon id="lock" size={40} color={Colors.textMuted} />
              )}
            </View>

            {/* Rzadkość badge */}
            <View style={[styles.modalRarityBadge, { backgroundColor: `${meta.color}25`, borderColor: meta.color }]}>
              <Text style={[styles.modalRarityText, { color: meta.color }]}>
                {meta.label.toUpperCase()} · {meta.chance}
              </Text>
            </View>

            {/* Nazwa */}
            <Text style={styles.modalName}>
              {unlocked ? artifact.name : t('artifacts.not_unlocked')}
            </Text>

            {/* Kategoria */}
            <View style={styles.modalCategoryRow}>
              <Icon id={categoryIconId as any} size={14} color={Colors.textMuted} />
              <Text style={styles.modalCategory}> {categoryLabel}</Text>
            </View>

            {unlocked ? (
              <>
                {/* Opis */}
                <Text style={styles.modalDesc}>{artifact.description}</Text>

                {/* Lore */}
                <View style={[styles.loreBox, { borderLeftColor: meta.color }]}>
                  <Text style={styles.loreText}>{artifact.lore}</Text>
                </View>

                {/* Nagrody */}
                <View style={styles.rewardsRow}>
                  <View style={styles.rewardBadge}>
                    <Icon id="star" size={14} color={Colors.gold} />
                    <Text style={styles.rewardBadgeText}> +{artifact.xpReward} XP</Text>
                  </View>
                  <View style={styles.rewardBadge}>
                    <Icon id="coin" size={14} color={Colors.gold} />
                    <Text style={styles.rewardBadgeText}> +{artifact.coinReward}</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.lockedHint}>
                  {t('artifacts.still_locked')}
                </Text>
                <View style={[styles.unlockHint, { borderColor: meta.color }]}>
                  <Text style={styles.unlockHintLabel}>{t('artifacts.how_to_unlock')}</Text>
                  <Text style={styles.unlockHintText}>{artifact.unlockCondition}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = Colors;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  headerSub:   { fontSize: 13, color: C.textMuted, marginTop: 2 },
  demoBtn: {
    backgroundColor: C.goldLight, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: C.borderGold,
  },
  demoBtnText: { fontSize: 13, color: C.gold, fontWeight: '700' },

  // Statystyki rzadkości
  rarityStats: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  rarityStat:      { flex: 1, alignItems: 'center', gap: 2 },
  rarityStatNum:   { fontSize: 16, fontWeight: '700' },
  rarityStatLabel: { fontSize: 9, color: C.textMuted, letterSpacing: 0.5 },

  // Filtry
  filtersSection: {
    paddingHorizontal: 16, paddingVertical: 10, gap: 6,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  filterGroupLabel: {
    fontSize: 9, color: C.textMuted, letterSpacing: 1.5, fontWeight: '700',
  },
  filterChip: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: C.backgroundCard, borderWidth: 1, borderColor: C.borderDefault,
  },
  filterChipActive:    { backgroundColor: C.goldLight, borderColor: C.gold },
  filterChipText:      { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  filterChipTextActive:{ color: C.gold },
  rarityChip: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: C.backgroundCard, borderWidth: 1, borderColor: C.borderDefault,
  },
  rarityChipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },

  // Siatka
  grid: { padding: 16, gap: 8 },

  // Karta
  card: {
    width: CARD_SIZE, height: CARD_SIZE,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    overflow: 'hidden', position: 'relative',
  },
  cardGlow: {
    position: 'absolute', inset: 0,
  },
  cardInner:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4 },
  cardIcon:       { fontSize: 28 },
  cardIconLocked: { opacity: 0.3 },
  rarityDot:      { width: 6, height: 6, borderRadius: 3 },
  cardName:       { fontSize: 9, color: C.textSecondary, textAlign: 'center', fontWeight: '600', lineHeight: 12 },
  cardNameLocked: { color: C.textMuted, opacity: 0.5 },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.backgroundElevated,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12,
    borderTopWidth: 1, borderColor: C.borderGold,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 20,
  },
  shine: {
    position: 'absolute', top: 0, bottom: 0, width: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    zIndex: 10,
  },
  modalClose: {
    position: 'absolute', top: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.backgroundCard,
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },

  modalIconBox: {
    width: 90, height: 90, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, alignSelf: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 10,
  },
  modalIcon: { fontSize: 44 },

  modalRarityBadge: {
    alignSelf: 'center', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1,
  },
  modalRarityText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  modalName:        { fontSize: 22, color: C.textPrimary, fontWeight: '700', textAlign: 'center' },
  modalCategoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalCategory:    { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  modalDesc:        { fontSize: 14, color: C.textSecondary, lineHeight: 20, textAlign: 'center' },

  loreBox: {
    backgroundColor: C.backgroundCard, borderRadius: 10,
    padding: 14, borderLeftWidth: 3,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  loreText: { fontSize: 13, color: C.textSecondary, lineHeight: 20, fontStyle: 'italic' },

  rewardsRow:  { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  rewardBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.goldLight, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: C.borderGold,
  },
  rewardBadgeText: { fontSize: 13, color: C.gold, fontWeight: '700' },

  lockedHint: { fontSize: 14, color: C.textMuted, textAlign: 'center', fontStyle: 'italic' },
  unlockHint: {
    backgroundColor: C.backgroundCard, borderRadius: 12,
    padding: 14, gap: 6, borderWidth: 1,
  },
  unlockHintLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  unlockHintText:  { fontSize: 14, color: C.textPrimary },
});
