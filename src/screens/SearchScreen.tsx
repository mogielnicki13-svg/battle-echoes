// ============================================================
// BATTLE ECHOES — SearchScreen.tsx
// Wyszukiwarka bitew i artefaktów
//   ✓ live dane z Firebase/store (nie MOCK_BATTLES)
//   ✓ debounce 300ms
//   ✓ filtr: tekst · era · rok · kraj
//   ✓ historia wyszukiwań w AsyncStorage
//   ✓ karty wyników w stylu aplikacji + badge epoki
//   ✓ działa w Expo Go
// ============================================================
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, TextInput, FlatList, ScrollView, Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, ERA_COLORS, ERA_ICONS, ERAS } from '../constants/theme';
import { useAppStore } from '../store';
import { ALL_ARTIFACTS, RARITY_META } from '../artifacts/data';
import { hapticLight, hapticSelect } from '../services/HapticsService';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Icon, EraIcon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

// ════════════════════════════════════════════════════════════
// TYPY
// ════════════════════════════════════════════════════════════
type ResultType = 'battle' | 'artifact';

interface SearchResult {
  id:       string;
  type:     ResultType;
  title:    string;
  subtitle: string;
  icon:     string;
  color:    string;
  meta?:    string;
  locked?:  boolean;
  era?:     string;     // tylko dla bitew
  country?: string;     // tylko dla bitew
}

// ════════════════════════════════════════════════════════════
// STAŁE
// ════════════════════════════════════════════════════════════
const RECENT_KEY = 'be_search_recent_v1';
const MAX_RECENT = 8;

/** Krótkie etykiety dla chips filtra epok */
const ERA_CHIP_LABELS: Record<string, string> = {
  ancient:      'Antyk',
  medieval:     'Śred.',
  early_modern: 'Nowożytność',
  napoleon:     'Napoleon',
  ww1:          'I WŚ',
  ww2:          'II WŚ',
};

const POPULAR_TAGS = [
  { iconId: 'sword',    label: 'Grunwald',    query: 'Grunwald',   flagEmoji: undefined },
  { iconId: 'shield',   label: 'Ypres',       query: 'Ypres',      flagEmoji: undefined },
  { iconId: 'trophy',   label: 'Waterloo',    query: 'Waterloo',   flagEmoji: undefined },
  { iconId: 'scroll',   label: 'Dokumenty',   query: 'dokument',   flagEmoji: undefined },
  { iconId: 'trophy',   label: 'Legendarne',  query: 'legendarny', flagEmoji: undefined },
  { iconId: 'shield',   label: 'Zbroja',      query: 'zbroja',     flagEmoji: undefined },
  { iconId: undefined,  label: 'Polska',      query: 'Polska',     flagEmoji: '🇵🇱'     },
  { iconId: undefined,  label: 'Belgia',      query: 'Belgia',     flagEmoji: '🇧🇪'     },
] as const;

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
/** Wyciąga rok z daty, np. "15 lipca 1410" → 1410 */
function extractYear(dateStr: string): number | null {
  const m = dateStr.match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
}

/** Wyciąga kraj z lokalizacji, np. "Grunwald, Polska" → "Polska" */
function extractCountry(locationName: string): string {
  const parts = locationName.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : '';
}

// ════════════════════════════════════════════════════════════
// ASYNCSTORAGE — historia wyszukiwań
// ════════════════════════════════════════════════════════════
async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    if (__DEV__) console.warn('[SearchScreen] Failed to load recent searches:', e);
    return [];
  }
}

async function persistRecentSearches(items: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch (e) {
    if (__DEV__) console.warn('[SearchScreen] Failed to persist recent searches:', e);
  }
}

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function SearchScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { battles, canAccessBattle } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('Search'); }, []));
  const insets = useSafeAreaInsets();

  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState<SearchResult[]>([]);
  const [recent,       setRecent]       = useState<string[]>([]);
  const [isFocused,    setIsFocused]    = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'battle' | 'artifact'>('all');
  const [activeEra,    setActiveEra]    = useState<'all' | string>('all');
  const [isSearching,  setIsSearching]  = useState(false);

  const inputRef  = useRef<TextInput>(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-8)).current;

  // Wczytaj historię wyszukiwań z AsyncStorage przy starcie
  useEffect(() => {
    loadRecentSearches().then(setRecent);
  }, []);

  // ── Animacja wejścia wyników ─────────────────────────────
  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(-8);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 120 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── Logika wyszukiwania ──────────────────────────────────
  const doSearch = useCallback((
    q:      string,
    filter: 'all' | 'battle' | 'artifact',
    era:    string,
  ) => {
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lower     = q.toLowerCase().trim();
    // Rozpoznaj zapytanie o rok (3–4 cyfry)
    const yearQuery = /^\d{3,4}$/.test(lower) ? parseInt(lower) : null;
    const out: SearchResult[] = [];

    // ── Bitwy ───────────────────────────────────────────────
    if (filter === 'all' || filter === 'battle') {
      battles.forEach(battle => {
        // Filtr epoki (niezależny od tekstu — wyklucza całkowicie)
        if (era !== 'all' && battle.era !== era) return;

        const battleYear    = extractYear(battle.date);
        const battleCountry = extractCountry(battle.location.name).toLowerCase();

        const matchText =
          battle.name.toLowerCase().includes(lower) ||
          battle.date.toLowerCase().includes(lower) ||
          battle.location.name.toLowerCase().includes(lower) ||
          battle.summary.toLowerCase().includes(lower) ||
          battle.outcome.toLowerCase().includes(lower) ||
          battle.sides.some(s => s.toLowerCase().includes(lower)) ||
          battle.commanders.some(c => c.toLowerCase().includes(lower)) ||
          battleCountry.includes(lower) ||
          battle.era.replace('_', ' ').includes(lower);

        // Dopasowanie po roku: tolerancja ±2 lata
        const matchYear =
          yearQuery !== null &&
          battleYear !== null &&
          Math.abs(battleYear - yearQuery) <= 2;

        if (matchText || matchYear) {
          out.push({
            id:       battle.id,
            type:     'battle',
            title:    battle.name,
            subtitle: `${battle.date} · ${battle.location.name}`,
            icon:     '',  // unused for battle type — EraIcon component used instead
            color:    ERA_COLORS[battle.era] ?? Colors.gold,
            meta:     battle.outcome,
            locked:   !canAccessBattle(battle.id),
            era:      battle.era,
            country:  extractCountry(battle.location.name),
          });
        }
      });
    }

    // ── Artefakty ───────────────────────────────────────────
    if (filter === 'all' || filter === 'artifact') {
      ALL_ARTIFACTS.forEach(art => {
        const rarityLabel = RARITY_META[art.rarity].label.toLowerCase();
        const catLabel    = art.category === 'weapon'   ? 'broń'
                          : art.category === 'armor'    ? 'zbroja'
                          : art.category === 'document' ? 'dokument'
                          : 'osobisty';

        const match =
          art.name.toLowerCase().includes(lower) ||
          art.description.toLowerCase().includes(lower) ||
          art.lore.toLowerCase().includes(lower) ||
          rarityLabel.includes(lower) ||
          catLabel.includes(lower);

        if (match) {
          const meta = RARITY_META[art.rarity];
          out.push({
            id:       art.id,
            type:     'artifact',
            title:    art.name,
            subtitle: `${meta.label} · ${catLabel}`,
            icon:     art.icon,
            color:    meta.color,
            meta:     art.unlockCondition,
          });
        }
      });
    }

    setResults(out);
    setIsSearching(false);
    if (out.length > 0) animateIn();
  }, [battles, canAccessBattle, animateIn]);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => doSearch(query, activeFilter, activeEra), 300);
    return () => clearTimeout(timer);
  }, [query, activeFilter, activeEra, doSearch]);

  // Animacja przy zmianie filtra typ/era (wyniki już w state)
  useEffect(() => {
    if (results.length > 0) animateIn();
  }, [activeFilter, activeEra]);

  // ── Historia wyszukiwań ──────────────────────────────────
  const addToRecent = useCallback((q: string) => {
    if (!q.trim()) return;
    const trimmed = q.trim();
    const next    = [trimmed, ...recent.filter(r => r.toLowerCase() !== trimmed.toLowerCase())]
      .slice(0, MAX_RECENT);
    setRecent(next);
    persistRecentSearches(next);
  }, [recent]);

  const clearRecent = () => {
    setRecent([]);
    persistRecentSearches([]);
  };

  // ── Akcje ────────────────────────────────────────────────
  const handleSubmit = () => {
    if (query.trim()) addToRecent(query);
    Keyboard.dismiss();
  };

  const handleTagPress = (q: string) => {
    hapticLight();
    setQuery(q);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    hapticLight();
    setQuery('');
    setResults([]);
    setActiveEra('all');
    inputRef.current?.focus();
  };

  const handleResultPress = useCallback((result: SearchResult) => {
    hapticSelect();
    // Use result.title as fallback to avoid stale query closure
    addToRecent(result.title);
    Keyboard.dismiss();
    if (result.type === 'battle') {
      navigation.navigate('BattleDetail', { battleId: result.id });
    } else if (result.type === 'artifact') {
      navigation.navigate('Artifacts');
    }
  }, [addToRecent, navigation]);

  const handleEraSelect = (eraId: string) => {
    hapticLight();
    setActiveEra(prev => prev === eraId ? 'all' : eraId);
  };

  // ── Pochodne stanu ───────────────────────────────────────
  const hasQuery     = !!query.trim();
  const showHome     = !hasQuery;
  const showEmpty    = hasQuery && results.length === 0 && !isSearching;

  /** Wyniki po filtrach typu i epoki */
  const displayedResults = useMemo(() => results.filter(r =>
    (activeFilter === 'all' || r.type === activeFilter) &&
    (activeEra    === 'all' || r.type !== 'battle' || r.era === activeEra)
  ), [results, activeFilter, activeEra]);
  const showResults  = hasQuery && displayedResults.length > 0;

  // Liczniki dla chipów typów (bez filtru era)
  const battleCount   = useMemo(() => results.filter(r => r.type === 'battle').length, [results]);
  const artifactCount = useMemo(() => results.filter(r => r.type === 'artifact').length, [results]);

  // Era filter visible: tylko gdy typ nie jest 'artifact' i jest zapytanie
  const showEraFilter = hasQuery && activeFilter !== 'artifact';

  const renderResultItem = useCallback(({ item }: { item: SearchResult }) => (
    <ResultRow result={item} onPress={() => handleResultPress(item)} />
  ), [handleResultPress]);
  const resultKeyExtractor = useCallback((item: SearchResult) => `${item.type}-${item.id}`, []);

  return (
    <View style={styles.container}>

      {/* ── Pasek wyszukiwania ─────────────────────────── */}
      <View style={[styles.searchBar, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.inputWrap, isFocused && styles.inputWrapFocused]}>
          <Icon id="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('search.placeholder_full')}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} accessibilityLabel={t('search.clear_search')} accessibilityRole="button">
              <Icon id="close" size={12} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filtr typów ───────────────────────────────── */}
      {hasQuery && (
        <View style={styles.typeFilterBar}>
          {([
            ['all',      `${t('search.all')} (${results.length})`],
            ['battle',   `${t('search.battles')} (${battleCount})`],
            ['artifact', `${t('search.artifacts')} (${artifactCount})`],
          ] as const).map(([id, label]) => (
            <TouchableOpacity
              key={id}
              style={[styles.filterChip, activeFilter === id && styles.filterChipActive]}
              onPress={() => setActiveFilter(id)}
              accessibilityLabel={`Filtr: ${label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilter === id }}
            >
              <Text style={[styles.filterChipText, activeFilter === id && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Filtr epok (ScrollView, tylko gdy bitwy w grze) ── */}
      {showEraFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.eraScroll}
          contentContainerStyle={styles.eraScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Chip "Wszystkie epoki" */}
          <TouchableOpacity
            style={[styles.eraChip, activeEra === 'all' && styles.eraChipAllActive]}
            onPress={() => setActiveEra('all')}
            accessibilityLabel={t('map.all_eras')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeEra === 'all' }}
          >
            <Text style={[styles.eraChipText, activeEra === 'all' && styles.eraChipTextActive]}>
              {t('map.all_eras')}
            </Text>
          </TouchableOpacity>

          {/* Chip per epoka */}
          {ERAS.map(era => {
            const isActive = activeEra === era.id;
            return (
              <TouchableOpacity
                key={era.id}
                style={[
                  styles.eraChip,
                  isActive && {
                    backgroundColor: `${era.color}28`,
                    borderColor:     `${era.color}70`,
                  },
                ]}
                onPress={() => handleEraSelect(era.id)}
                accessibilityLabel={`Epoka: ${era.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <View style={styles.eraChipInner}>
                  <EraIcon
                    eraId={era.id}
                    size={12}
                    color={isActive ? era.color : Colors.textMuted}
                  />
                  <Text style={[styles.eraChipText, isActive && { color: era.color }]}>
                    {ERA_CHIP_LABELS[era.id] ?? era.id}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════
          EKRAN GŁÓWNY — brak zapytania
      ════════════════════════════════════════════════ */}
      {showHome && (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={() => (
            <View style={styles.homeContent}>

              {/* Popularne tagi */}
              <Text style={styles.sectionLabel}>{t('search.popular')}</Text>
              <View style={styles.tagsGrid}>
                {POPULAR_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag.query}
                    style={styles.tag}
                    onPress={() => handleTagPress(tag.query)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.tagInner}>
                      {tag.flagEmoji ? (
                        <Text style={styles.tagEmoji}>{tag.flagEmoji}</Text>
                      ) : (
                        <Icon id={tag.iconId as any} size={13} color={Colors.textSecondary} />
                      )}
                      <Text style={styles.tagText}>{tag.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Historia wyszukiwań */}
              {recent.length > 0 && (
                <>
                  <View style={styles.recentHeader}>
                    <Text style={styles.sectionLabel}>{t('search.recent')}</Text>
                    <TouchableOpacity onPress={clearRecent}>
                      <Text style={styles.clearRecentText}>{t('search.clear')}</Text>
                    </TouchableOpacity>
                  </View>
                  {recent.map((r, i) => (
                    <TouchableOpacity
                      key={`${r}-${i}`}
                      style={styles.recentRow}
                      onPress={() => handleTagPress(r)}
                    >
                      <Icon id="clock" size={16} color={Colors.textMuted} />
                      <Text style={styles.recentText}>{r}</Text>
                      <Icon id="chevron_right" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Szybki dostęp — live bitwy ze store */}
              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
                {t('search.all_battles', { count: battles.length })}
              </Text>
              {battles.map(battle => {
                const eraColor = ERA_COLORS[battle.era] ?? Colors.gold;
                const locked   = !canAccessBattle(battle.id);
                const country  = extractCountry(battle.location.name);
                return (
                  <TouchableOpacity
                    key={battle.id}
                    style={[styles.quickRow, locked && styles.quickRowLocked]}
                    onPress={() => navigation.navigate('BattleDetail', { battleId: battle.id })}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.quickIconBox,
                      { backgroundColor: `${eraColor}18`, borderColor: `${eraColor}35` },
                    ]}>
                      <EraIcon eraId={battle.era} size={18} color={eraColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quickName}>{battle.name}</Text>
                      <Text style={styles.quickMeta}>
                        {battle.date}
                        {country ? ` · ${country}` : ''}
                      </Text>
                    </View>
                    {/* Era badge */}
                    <View style={[styles.quickEraBadge, { backgroundColor: `${eraColor}20` }]}>
                      <View style={styles.quickEraBadgeInner}>
                        <EraIcon eraId={battle.era} size={9} color={eraColor} />
                        <Text style={[styles.quickEraBadgeText, { color: eraColor }]}>
                          {ERA_CHIP_LABELS[battle.era] ?? battle.era}
                        </Text>
                      </View>
                    </View>
                    {locked ? (
                      <Icon id="lock" size={16} color={Colors.textMuted} style={styles.quickArrowIcon} />
                    ) : (
                      <Icon id="chevron_right" size={16} color={Colors.textMuted} style={styles.quickArrowIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* ════════════════════════════════════════════════
          WYNIKI WYSZUKIWANIA
      ════════════════════════════════════════════════ */}
      {showResults && (
        <Animated.FlatList
          data={displayedResults}
          keyExtractor={resultKeyExtractor}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          renderItem={renderResultItem}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews={true}
          ListFooterComponent={() => (
            <Text style={styles.resultsCount}>
              {displayedResults.length === 1
                ? t('search.result_one', { count: displayedResults.length })
                : displayedResults.length < 5
                  ? t('search.result_few', { count: displayedResults.length })
                  : t('search.result_many', { count: displayedResults.length })}
              {' '}dla „{query}"
              {activeEra !== 'all' ? (
                ` · ${ERAS.find(e => e.id === activeEra)?.label ?? activeEra}`
              ) : ''}
            </Text>
          )}
        />
      )}

      {/* ════════════════════════════════════════════════
          BRAK WYNIKÓW
      ════════════════════════════════════════════════ */}
      {showEmpty && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Icon id="search" size={48} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>{t('search.no_results')}</Text>
          <Text style={styles.emptyDesc}>
            {t('search.no_results_desc', { query })}
          </Text>

          {/* Sugestia usunięcia filtra epoki */}
          {activeEra !== 'all' && (
            <TouchableOpacity
              style={styles.clearEraBtn}
              onPress={() => setActiveEra('all')}
            >
              <View style={styles.clearEraBtnInner}>
                <Text style={styles.clearEraBtnText}>
                  {t('search.search_all_eras')}
                </Text>
                <Icon id="chevron_right" size={13} color={Colors.gold} />
              </View>
            </TouchableOpacity>
          )}

          {/* Szybkie tagi */}
          <View style={styles.emptyTags}>
            {POPULAR_TAGS.slice(0, 4).map(tag => (
              <TouchableOpacity
                key={tag.query}
                style={styles.tag}
                onPress={() => handleTagPress(tag.query)}
              >
                <View style={styles.tagInner}>
                  {tag.flagEmoji ? (
                    <Text style={styles.tagEmoji}>{tag.flagEmoji}</Text>
                  ) : (
                    <Icon id={tag.iconId as any} size={13} color={Colors.textSecondary} />
                  )}
                  <Text style={styles.tagText}>{tag.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// WIERSZ WYNIKU
// ════════════════════════════════════════════════════════════
const ResultRow = React.memo(function ResultRow({ result, onPress }: { result: SearchResult; onPress: () => void }) {
  const { t } = useTranslation();
  const scale      = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200 }).start();

  const eraMeta = result.era ? ERAS.find(e => e.id === result.era) : null;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.resultRow, result.locked && styles.resultRowLocked]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Ikona */}
        <View style={[
          styles.resultIcon,
          { backgroundColor: `${result.color}20`, borderColor: `${result.color}40` },
        ]}>
          {result.type === 'battle' && result.era ? (
            <EraIcon eraId={result.era} size={22} color={result.color} active />
          ) : (
            <Text style={styles.resultIconText}>{result.icon}</Text>
          )}
        </View>

        {/* Treść */}
        <View style={styles.resultContent}>
          {/* Wiersz 1: tytuł + badge typu */}
          <View style={styles.resultTopRow}>
            <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
            <View style={[styles.typeBadge, {
              backgroundColor: result.type === 'battle'
                ? 'rgba(212,160,23,0.15)'
                : 'rgba(192,132,252,0.15)',
            }]}>
              <Text style={[styles.typeBadgeText, {
                color: result.type === 'battle' ? Colors.gold : '#c084fc',
              }]}>
                {result.type === 'battle' ? t('search.battle_type') : t('search.artifact_type')}
              </Text>
            </View>
          </View>

          {/* Wiersz 2: data · lokalizacja */}
          <Text style={styles.resultSubtitle} numberOfLines={1}>{result.subtitle}</Text>

          {/* Wiersz 3: wynik bitwy + badge epoki */}
          <View style={styles.resultBottomRow}>
            {result.meta ? (
              <Text style={[styles.resultMeta, { color: result.color }]} numberOfLines={1}>
                {result.meta}
              </Text>
            ) : <View />}

            {eraMeta && (
              <View style={[styles.eraBadge, { backgroundColor: `${eraMeta.color}20` }]}>
                <View style={styles.eraBadgeInner}>
                  <EraIcon eraId={eraMeta.id} size={9} color={eraMeta.color} />
                  <Text style={[styles.eraBadgeText, { color: eraMeta.color }]}>
                    {ERA_CHIP_LABELS[eraMeta.id] ?? eraMeta.label}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Lock / Arrow */}
        {result.locked ? (
          <Icon id="lock" size={16} color={Colors.textMuted} />
        ) : (
          <Icon id="chevron_right" size={16} color={Colors.textMuted} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = Colors;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  // ── Search bar ────────────────────────────────────────────
  searchBar: {
    paddingBottom: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  inputWrapFocused: { borderColor: C.gold },
  searchIcon: {},
  input: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 0 },
  clearBtn:     { width: 24, height: 24, borderRadius: 12, backgroundColor: C.backgroundElevated, alignItems: 'center', justifyContent: 'center' },

  // ── Filtr typów ───────────────────────────────────────────
  typeFilterBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  filterChip: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: C.backgroundCard, borderWidth: 1, borderColor: C.borderDefault,
  },
  filterChipActive:     { backgroundColor: C.goldLight, borderColor: C.gold },
  filterChipText:       { fontSize: 12, color: C.textMuted,  fontWeight: '600' },
  filterChipTextActive: { color: C.gold },

  // ── Filtr epok ────────────────────────────────────────────
  eraScroll:        { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: C.borderDefault },
  eraScrollContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  eraChip: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: C.backgroundCard, borderWidth: 1, borderColor: C.borderDefault,
  },
  eraChipInner:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eraChipAllActive: { backgroundColor: C.goldLight, borderColor: C.gold },
  eraChipText:      { fontSize: 12, color: C.textMuted,  fontWeight: '600' },
  eraChipTextActive:{ color: C.gold },

  // ── Home ──────────────────────────────────────────────────
  homeContent:  { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '700', marginTop: 4 },

  tagsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:       { backgroundColor: C.backgroundCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.borderDefault },
  tagInner:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagText:   { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  tagEmoji:  { fontSize: 13 },

  recentHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  clearRecentText: { fontSize: 12, color: '#f87171' },
  recentRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  recentText:      { flex: 1, fontSize: 14, color: C.textSecondary },

  // Quick access (lista bitew na Home)
  quickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  quickRowLocked:     { opacity: 0.5 },
  quickIconBox:       { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  quickName:          { fontSize: 14, color: C.textPrimary, fontWeight: '600' },
  quickMeta:          { fontSize: 12, color: C.textMuted,   marginTop: 1 },
  quickEraBadge:      { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 4 },
  quickEraBadgeInner: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  quickEraBadgeText:  { fontSize: 9, fontWeight: '700' },
  quickArrowIcon:     { marginLeft: 2 },

  // ── Wyniki ────────────────────────────────────────────────
  resultsList:  { padding: 16, gap: 10 },
  resultsCount: { fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 8 },

  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 12, borderWidth: 1, borderColor: C.borderDefault,
  },
  resultRowLocked: { opacity: 0.55 },

  resultIcon:     { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  resultIconText: { fontSize: 22 },
  resultContent:  { flex: 1, gap: 3 },

  resultTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle:     { flex: 1, fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  typeBadge:       { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText:   { fontSize: 10, fontWeight: '700' },
  resultSubtitle:  { fontSize: 12, color: C.textMuted },

  resultBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultMeta:      { flex: 1, fontSize: 11, fontWeight: '600' },
  eraBadge:        { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  eraBadgeInner:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eraBadgeText:    { fontSize: 9, fontWeight: '700' },

  // ── Empty state ───────────────────────────────────────────
  emptyState:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyIconWrap:    { marginBottom: 4 },
  emptyTitle:       { fontSize: 18, color: C.textPrimary, fontWeight: '700' },
  emptyDesc:        { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  clearEraBtn:      { backgroundColor: C.goldLight, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: C.goldBorder },
  clearEraBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearEraBtnText:  { fontSize: 13, color: C.gold, fontWeight: '700' },

  emptyTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
});
