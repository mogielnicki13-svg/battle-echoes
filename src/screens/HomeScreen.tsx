// ============================================================
// BATTLE ECHOES — HomeScreen.tsx
// Dashboard — spersonalizowany ekran główny
// ============================================================
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Dimensions, Image,
} from 'react-native';
import { Colors, Radius, BaseColors, ERA_COLORS, ERA_ICONS } from '../constants/theme';
import { useAppStore, levelFromXP, type Battle } from '../store';
import { ALL_ARTIFACTS, RARITY_META } from '../artifacts/data';
import { CoinCounter } from '../components/XPSystem';
import { SmokeBackgroundFull, SmokeBackgroundCard } from '../components/SmokeBackground';
import EraThemeSelector from '../components/EraThemeSelector';
import { useEraTheme } from '../hooks/EraThemeContext';
import BATTLE_LOCAL_IMAGES from '../services/BattleLocalImages';
import GoldIcon, { ERA_ICON_DEFS, QuickActionIcon, Icon, type QuickActionId } from '../components/GoldIcon';
import PaywallModal, { type PaywallConfig } from '../components/PaywallModal';
import DailyRewardModal from '../components/DailyRewardModal';
import PromoteToCommanderModal from '../components/PromoteToCommanderModal';
import { hapticLight, hapticSelect } from '../services/HapticsService';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════
// DANE
// ════════════════════════════════════════════════════════════
const QUOTES = [
  { text: 'Historia to nie przeszłość. To klucz do teraźniejszości.', author: 'Benedetto Croce' },
  { text: 'Kto nie zna historii, skazany jest na jej powtarzanie.', author: 'George Santayana' },
  { text: 'Bitwa wygrana to bitwa, której nie uważamy za przegraną.', author: 'Wellington' },
  { text: 'W wojnie jak w polityce — nie ma spraw ostatecznie zakończonych.', author: 'Clausewitz' },
  { text: 'Żadna wielka sprawa nie była dokonana bez entuzjazmu.', author: 'Hegel' },
];

const DAILY_CHALLENGES = [
  { id: 'dc1', iconId: 'headphones', title: 'Odsłuchaj narrację', desc: 'Dowolna bitwa, dowolna perspektywa', reward: 75,  type: 'xp' as const },
  { id: 'dc2', iconId: 'refresh',    title: 'Dwie perspektywy', desc: 'Porównaj dwa punkty widzenia jednej bitwy', reward: 120, type: 'xp' as const },
  { id: 'dc3', iconId: 'map',        title: 'Odwiedź mapę', desc: 'Odkryj pole bitwy na mapie interaktywnej', reward: 40,  type: 'coins' as const },
];

const NEWS_ITEMS = [
  {
    id: 'n1', iconId: 'calendar', date: '1 marca',
    title: 'Rocznica bitwy pod Cassino',
    body: 'W marcu 1944 alianci przeprowadzili trzeci szturm na Monte Cassino. Posłuchaj narracji.',
    battleId: null, color: '#94a3b8',
  },
  {
    id: 'n2', iconId: 'lightning', date: 'Nowość',
    title: 'Nowa perspektywa: Wiedeń 1683',
    body: 'Dodaliśmy narrację z perspektywy husarza Jana III Sobieskiego. 15 minut epickiej historii.',
    battleId: null, color: '#D4A017',
  },
  {
    id: 'n3', iconId: 'diamond', date: 'Kolekcja',
    title: 'Seria artefaktów napoleońskich',
    body: 'Odblokowując wszystkie narracje Waterloo zdobędziesz kompletną serię 6 artefaktów.',
    battleId: null, color: '#4ade80',
  },
];

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const {
    user, getLevelInfo, canAccessBattle, battles, hasAllEras,
    dismissCommanderPromotion,
  } = useAppStore();
  const { theme, currentEra } = useEraTheme();
  const [showEraSelector, setShowEraSelector] = useState(false);
  const [paywallConfig,   setPaywallConfig]   = useState<PaywallConfig | null>(null);
  const [showPaywall,     setShowPaywall]      = useState(false);
  const [showDailyReward, setShowDailyReward]  = useState(false);
  const lvl = getLevelInfo();
  useFocusEffect(useCallback(() => { logScreenView('Home'); }, []));

  // ── Jaki dzień serii user ZARAZ zdobędzie (do DailyRewardModal) ──
  // Używamy tej samej logiki co checkDailyStreak() w store:
  //   jeśli lastActive = wczoraj → seria konsekwentna → nextDay = streak + 1
  //   w przeciwnym razie (przerwa) → zaczynamy od nowa → nextDay = 1
  const nextStreakDay = (() => {
    if (!user?.lastActive) return 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive =
      new Date(user.lastActive).toDateString() === yesterday.toDateString();
    return isConsecutive ? (user.streak ?? 0) + 1 : 1;
  })();

  // ── Promote to Commander modal (guests only, after first battle) ─
  const showCommanderPromo =
    (user?.isGuest === true) &&
    (user?.hasCompletedFirstBattle === true) &&
    (user?.promoteDismissed !== true);

  // ── Sprawdź czy pokazać dzienny reward przy starcie ─────
  useEffect(() => {
    // Pokazuj modal jeśli user nie zalogował się dziś (streak check)
    const today     = new Date().toDateString();
    const lastActive = user?.lastActive ? new Date(user.lastActive).toDateString() : '';
    if (lastActive !== today) {
      setTimeout(() => setShowDailyReward(true), 1500);
    }
  }, []);

  const handleBattlePress = useCallback((battle: Battle) => {
    if (canAccessBattle(battle.id)) {
      hapticSelect();
      navigation.navigate('BattleDetail', { battleId: battle.id });
    } else {
      hapticLight();
      // Znajdź kolor epoki
      const ERA_COLORS: Record<string, string> = {
        ancient: '#D4963A', medieval: '#C9A84C', early_modern: '#B8860B',
        napoleon: '#4a7cc9', ww1: '#6B7C5A', ww2: '#3A5F3A',
      };
      setPaywallConfig({
        type:        'battle',
        id:          battle.id,
        name:        battle.name,
        icon:        ERA_ICON_DEFS[battle.era]?.name ?? 'sword',
        eraColor:    ERA_COLORS[battle.era] ?? Colors.gold,
        coinPrice:   150,
        description: battle.summary,
      });
      setShowPaywall(true);
    }
  }, [canAccessBattle, navigation]);

  const headerAnim  = useRef(new Animated.Value(-20)).current;
  const headerFade  = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(30)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const quote = useMemo(() => QUOTES[new Date().getDay() % QUOTES.length], []);

  const featured = useMemo(() => {
    const unlistened = battles.filter(b =>
      !user?.listenedBattles.includes(b.id) && canAccessBattle(b.id)
    );
    return unlistened[0] ?? battles[0] ?? null;
  }, [battles, user?.listenedBattles, canAccessBattle]);

  const recentArtifacts = useMemo(() => (user?.unlockedArtifacts || [])
    .slice(-4)
    .map(id => ALL_ARTIFACTS.find(a => a.id === id))
    .filter(Boolean) as typeof ALL_ARTIFACTS, [user?.unlockedArtifacts]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? t('home.greeting_morning') : hour < 18 ? t('home.greeting_afternoon') : t('home.greeting_evening');
  }, [t]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim,  { toValue: 0, useNativeDriver: true, tension: 60 }),
      Animated.timing(headerFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.parallel([
      Animated.spring(contentAnim, { toValue: 0, delay: 150, useNativeDriver: true, tension: 60 }),
      Animated.timing(contentFade, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>

      {/* ── DYMI PEŁNOEKRANOWY W TLE ─────────────────────── */}
      <SmokeBackgroundFull
        color={`${theme.primary}18`}
        sparkColor={theme.sparkColor || theme.primary}
        intensity={0.8}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Nagłówek z powitaniem ────────────────────────── */}
        <Animated.View style={[
          styles.heroHeader,
          { transform: [{ translateY: headerAnim }], opacity: headerFade },
        ]}>
          {/* Dym w nagłówku */}
          <SmokeBackgroundCard
            color={`${theme.primary}20`}
            sparkColor={theme.sparkColor || theme.primary}
            intensity={0.9}
          />

          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.userName}>{user?.name?.split(' ')[0] || t('home.default_user')}</Text>
                <Icon id="sword" size={20} color={Colors.gold} />
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <Icon id="bell" size={18} color={Colors.gold} />
              </TouchableOpacity>
              <CoinCounter coins={user?.coins || 0} />
              <TouchableOpacity
                style={[styles.eraBtn, { borderColor: theme.primaryBorder, backgroundColor: theme.primaryLight }]}
                onPress={() => setShowEraSelector(true)}
                activeOpacity={0.8}
              >
                {(() => {
                  const def = ERA_ICON_DEFS[currentEra] ?? ERA_ICON_DEFS.medieval;
                  return <GoldIcon name={def.name} lib={def.lib} size={14} color={theme.primary} />;
                })()}
                <Text style={[styles.eraBtnLabel, { color: theme.primary }]}>{theme.nameShort}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pasek XP mini */}
          <View style={[styles.xpMiniCard, { borderColor: theme.primaryBorder }]}>
            <View style={styles.xpMiniRow}>
              <Text style={[styles.xpMiniLevel, { color: theme.primary }]}>{t('home.level', { level: lvl.level })}</Text>
              <Text style={styles.xpMiniTotal}>{t('home.xp_total', { xp: (user?.totalXP || 0).toLocaleString() })}</Text>
            </View>
            <View style={styles.xpMiniTrack}>
              <View style={[styles.xpMiniFill, {
                width: `${Math.round((lvl.currentXP / lvl.xpToNext) * 100)}%`,
                backgroundColor: theme.primary,
              }]} />
            </View>
            <View style={styles.xpMiniMeta}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon id="fire" size={11} color="#f97316" />
                <Text style={styles.xpMiniSub}>{t('home.streak_days', { count: user?.streak || 0 })}</Text>
              </View>
              <Text style={styles.xpMiniSub}>{t('home.level_next', { level: lvl.level + 1, xp: lvl.xpToNext - lvl.currentXP })}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[
          styles.contentWrap,
          { transform: [{ translateY: contentAnim }], opacity: contentFade },
        ]}>

          {/* ── Cytat dnia ─────────────────────────────────── */}
          <View style={[styles.quoteCard, { borderLeftColor: theme.primary, borderColor: theme.primaryBorder }]}>
            <Icon id="comment" size={20} color={Colors.gold} />
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={[styles.quoteAuthor, { color: theme.primary }]}>— {quote.author}</Text>
          </View>

          {/* ── Polecana bitwa ─────────────────────────────── */}
          {featured && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
                <Text style={styles.sectionLabel}>{t('home.featured_section')}</Text>
              </View>
              <FeaturedBattleCard
                battle={featured}
                onPress={() => navigation.navigate('BattleDetail', { battleId: featured.id })}
              />
            </View>
          )}

          {/* ── Wyzwania dzienne ───────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
              <Text style={styles.sectionLabel}>{t('home.daily_challenges')}</Text>
              <View style={styles.refreshBadge}>
                <Text style={styles.refreshText}>{t('home.reset_midnight')}</Text>
              </View>
            </View>
            {DAILY_CHALLENGES.map((ch, i) => (
              <DailyChallengeRow key={ch.id} challenge={ch} delay={i * 80} />
            ))}
          </View>

          {/* ── Upsell Banner (tylko gdy nie ma wszystkich epok) ── */}
          {!hasAllEras() && (
            <TouchableOpacity
              style={upsellStyles.banner}
              onPress={() => { hapticSelect(); navigation.navigate('Shop'); }}
              activeOpacity={0.88}
            >
              <View style={upsellStyles.left}>
                <View style={[upsellStyles.badge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Icon id="sparkle" size={8} color={Colors.gold} />
                  <Text style={upsellStyles.badgeText}>{t('home.upsell_badge')}</Text>
                </View>
                <Text style={upsellStyles.title}>{t('home.unlock_all_eras')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={upsellStyles.sub}>{t('home.upsell_sub')}</Text>
                  <Icon id="coin" size={12} color={Colors.gold} />
                </View>
              </View>
              <Icon id="chevron_right" size={24} color={Colors.gold} />
            </TouchableOpacity>
          )}

          {/* ── Dołącz do lekcji (student join banner) ─── */}
          <TouchableOpacity
            style={joinStyles.banner}
            onPress={() => { hapticSelect(); navigation.navigate('StudentJoin'); }}
            activeOpacity={0.88}
          >
            <View style={joinStyles.iconWrap}>
              <Icon id="school" size={26} color="#818cf8" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={joinStyles.title}>{t('home.join_lesson')}</Text>
              <Text style={joinStyles.sub}>{t('home.join_lesson_sub')}</Text>
            </View>
            <Icon id="chevron_right" size={20} color="#818cf8" />
          </TouchableOpacity>

          {/* ── Szybkie akcje ──────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
              <Text style={styles.sectionLabel}>{t('home.explore_section')}</Text>
            </View>
            <View style={styles.quickGrid}>
              <QuickAction iconId="map"        label={t('home.map')}        color="#60a5fa" onPress={() => navigation.navigate('Map')} />
              <QuickAction iconId="search"     label={t('home.search')}     color="#4ade80" onPress={() => navigation.navigate('Search')} />
              <QuickAction iconId="collection" label={t('home.collection')} color="#c084fc" onPress={() => navigation.navigate('Artifacts')} />
              <QuickAction iconId="downloads"  label={t('home.downloads')}  color={theme.primary} onPress={() => navigation.navigate('Downloads')} />
              <QuickAction iconId="stats"      label={t('home.stats')}      color="#f97316" onPress={() => navigation.navigate('Stats')} />
              <QuickAction iconId="shop"       label={t('home.shop')}       color="#94a3b8" onPress={() => navigation.navigate('Shop')} />
            </View>
          </View>

          {/* ── Ostatnie artefakty ─────────────────────────── */}
          {recentArtifacts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
                <Text style={styles.sectionLabel}>{t('home.recent_section')}</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                  onPress={() => navigation.navigate('Artifacts')}
                >
                  <Text style={[styles.seeAll, { color: theme.primary }]}>{t('home.see_all')}</Text>
                  <Icon id="chevron_right" size={12} color={theme.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.artifactsRow}>
                {recentArtifacts.map(art => {
                  const meta = RARITY_META[art.rarity];
                  return (
                    <View key={art.id} style={[styles.artifactMini, { borderColor: meta.color }]}>
                      <Text style={styles.artifactMiniIcon}>{art.icon}</Text>
                      <View style={[styles.artifactMiniDot, { backgroundColor: meta.color }]} />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Wszystkie bitwy ────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
              <Text style={styles.sectionLabel}>{t('home.battles_section')}</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                onPress={() => navigation.navigate('Battles')}
              >
                <Text style={[styles.seeAll, { color: theme.primary }]}>{t('home.all_battles')}</Text>
                <Icon id="chevron_right" size={12} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {battles.map(battle => (
              <BattleRow
                key={battle.id}
                battle={battle}
                listened={user?.listenedBattles.includes(battle.id) || false}
                locked={!canAccessBattle(battle.id)}
                onPress={() => handleBattlePress(battle)}
              />
            ))}
          </View>

          {/* ── Aktualności ────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
              <Text style={styles.sectionLabel}>{t('home.news_title').toUpperCase()}</Text>
            </View>
            {NEWS_ITEMS.map(item => (
              <NewsCard key={item.id} item={item} />
            ))}
          </View>

        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Selector motywu epoki */}
      <EraThemeSelector
        visible={showEraSelector}
        onClose={() => setShowEraSelector(false)}
      />

      {/* Paywall — odblokuj bitwę */}
      <PaywallModal
        visible={showPaywall}
        config={paywallConfig}
        onClose={() => setShowPaywall(false)}
        onUnlocked={() => setShowPaywall(false)}
        onGoToShop={() => {
          setShowPaywall(false);
          navigation.navigate('Shop');
        }}
      />

      {/* Dzienna nagroda */}
      <DailyRewardModal
        visible={showDailyReward}
        streakDay={nextStreakDay}
        alreadyClaimed={
          user?.lastActive
            ? new Date(user.lastActive).toDateString() === new Date().toDateString()
            : false
        }
        onClose={() => setShowDailyReward(false)}
      />

      {/* Zostań Dowódcą — konwersja gościa do konta */}
      <PromoteToCommanderModal
        visible={showCommanderPromo}
        onDismiss={dismissCommanderPromotion}
        onSignIn={() => {
          dismissCommanderPromotion();
          navigation.navigate('Login');
        }}
      />

    </View>
  );
}

// ════════════════════════════════════════════════════════════
// POLECANA BITWA
// ════════════════════════════════════════════════════════════
const FeaturedBattleCard = React.memo(function FeaturedBattleCard({ battle, onPress }: { battle: Battle; onPress: () => void }) {
  const { t } = useTranslation();
  const { theme } = useEraTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0.4)).current;
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [battle.imageUrl]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const eraColor = battle.era === 'medieval' ? theme.primary
                 : battle.era === 'ww1'       ? '#94a3b8'
                 : '#4ade80';

  const localImg  = BATTLE_LOCAL_IMAGES[battle.id];
  const showImage = (!!localImg || !!battle.imageUrl) && !imgError;

  return (
    <Animated.View style={[styles.featuredCard, {
      borderColor: theme.primaryBorder,
      transform: [{ scale: scaleAnim }],
    }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={()  => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 200 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 200 }).start()}
        activeOpacity={0.95}
      >
        {/* ── ZDJĘCIE NA GÓRZE ─────────────────────────── */}
        <View style={styles.featuredImageWrap}>
          {showImage ? (
            <Image
              source={localImg ?? { uri: battle.imageUrl! }}
              style={{ width: '100%', aspectRatio: 16 / 9 }}
              resizeMode="contain"
              onError={() => {
                if (!localImg && __DEV__) console.warn(`[Image] Błąd: ${battle.imageUrl}`);
                setImgError(true);
              }}
              onLoad={() => { if (__DEV__) console.log(`[Image] OK: ${battle.id}`); }}
            />
          ) : (
            <>
              <SmokeBackgroundCard
                color={`${eraColor}20`}
                sparkColor={theme.sparkColor || eraColor}
                intensity={1.0}
              />
              <Animated.View style={[styles.featuredGlow, { backgroundColor: eraColor, opacity: glowAnim }]} />
              {(() => {
                const def = ERA_ICON_DEFS[battle.era] ?? ERA_ICON_DEFS.medieval;
                return <GoldIcon name={def.name} lib={def.lib} size={48} color={eraColor} />;
              })()}
            </>
          )}
        </View>

        {/* ── INFO POD ZDJĘCIEM ────────────────────────── */}
        <View style={styles.featuredInner}>
          <View style={[styles.featuredBadge, { backgroundColor: `${eraColor}25`, borderColor: eraColor, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Icon id="sparkle" size={10} color={eraColor} />
            <Text style={[styles.featuredBadgeText, { color: eraColor }]}>{t('home.featured_badge')}</Text>
          </View>

          <Text style={styles.featuredName}>{battle.name}</Text>
          <Text style={styles.featuredDate}>{battle.date} · {battle.location.name}</Text>
          <Text style={styles.featuredOutcome} numberOfLines={2}>{battle.outcome}</Text>

          <View style={styles.featuredStats}>
            <View style={styles.featuredStat}>
              <Icon id="headphones" size={13} color={C.textMuted} />
              <Text style={styles.featuredStatText}>4 perspektywy</Text>
            </View>
            <View style={styles.featuredStat}>
              <Icon id="timer" size={13} color={C.textMuted} />
              <Text style={styles.featuredStatText}>~48 min</Text>
            </View>
            <View style={styles.featuredStat}>
              <Icon id="diamond" size={13} color={C.textMuted} />
              <Text style={styles.featuredStatText}>6 artefaktów</Text>
            </View>
          </View>

          <View style={[styles.featuredBtn, { backgroundColor: eraColor, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <Text style={styles.featuredBtnText}>{t('home.featured_listen')}</Text>
            <Icon id="chevron_right" size={15} color="#000" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════════
// WYZWANIE DZIENNE
// ════════════════════════════════════════════════════════════
const DailyChallengeRow = React.memo(function DailyChallengeRow({ challenge, delay }: {
  challenge: typeof DAILY_CHALLENGES[0]; delay: number;
}) {
  const { theme } = useEraTheme();
  const [done, setDone] = useState(false);
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, delay, useNativeDriver: true, tension: 80 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const rewardColor = challenge.type === 'xp' ? '#fbbf24' : theme.primary;

  return (
    <Animated.View style={[
      styles.challengeRow,
      done && styles.challengeRowDone,
      { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
    ]}>
      <View style={[styles.challengeIcon, {
        backgroundColor: done ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
      }]}>
        {done
          ? <Icon id="check_solid" size={20} color="#4ade80" />
          : <Icon id={challenge.iconId as any} size={20} color={theme.primary} />
        }
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.challengeTitle, done && styles.challengeTitleDone]}>
          {challenge.title}
        </Text>
        <Text style={styles.challengeDesc}>{challenge.desc}</Text>
      </View>
      <TouchableOpacity
        style={[styles.challengeReward, { borderColor: `${rewardColor}40` }]}
        onPress={() => !done && setDone(true)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          {done ? (
            <Icon id="check_solid" size={14} color="#4ade80" />
          ) : (
            <>
              <Text style={[styles.challengeRewardText, { color: rewardColor }]}>
                +{challenge.reward} {challenge.type === 'xp' ? 'XP' : ''}
              </Text>
              {challenge.type === 'coins' && <Icon id="coin" size={12} color={rewardColor} />}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════════
// SZYBKA AKCJA
// ════════════════════════════════════════════════════════════
const QuickAction = React.memo(function QuickAction({ iconId, label, color, onPress }: {
  iconId: QuickActionId; label: string; color: string; onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.quickAction, { borderColor: `${color}30` }]}
        onPress={onPress}
        onPressIn={()  => Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, tension: 200 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 200 }).start()}
        activeOpacity={1}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}18` }]}>
          <QuickActionIcon id={iconId} size={24} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════════
// WIERSZ BITWY
// ════════════════════════════════════════════════════════════
const BattleRow = React.memo(function BattleRow({ battle, listened, locked, onPress }: {
  battle: Battle;
  listened: boolean; locked: boolean;
  onPress: () => void;
}) {
  const { theme } = useEraTheme();
  const eraColor = ERA_COLORS[battle.era] ?? theme.primary;
  const iconDef  = ERA_ICON_DEFS[battle.era] ?? ERA_ICON_DEFS.medieval;
  const img      = BATTLE_LOCAL_IMAGES[battle.id];

  return (
    <TouchableOpacity
      style={[styles.battleRow, locked && styles.battleRowLocked]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* ── Miniaturka: zdjęcie + obramówka epoki ─────── */}
      <View style={[styles.battleRowThumb, { borderColor: eraColor }]}>
        {img ? (
          <Image source={img} style={styles.battleRowImg} resizeMode="cover" />
        ) : (
          <View style={[styles.battleRowIconFallback, { backgroundColor: `${eraColor}18` }]}>
            <GoldIcon name={iconDef.name} lib={iconDef.lib} size={22} color={eraColor} />
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.battleRowName}>{battle.name}</Text>
        <Text style={styles.battleRowMeta}>{battle.date} · {battle.location.name}</Text>
      </View>
      <View style={styles.battleRowRight}>
        {listened && <Icon id="check_solid" size={14} color="#4ade80" />}
        {locked    && <Icon id="lock" size={14} color="#888" />}
        <Icon id="chevron_right" size={16} color={theme.primary} />
      </View>
    </TouchableOpacity>
  );
});

// ════════════════════════════════════════════════════════════
// KARTA AKTUALNOŚCI
// ════════════════════════════════════════════════════════════
const NewsCard = React.memo(function NewsCard({ item }: { item: typeof NEWS_ITEMS[0] }) {
  return (
    <View style={[styles.newsCard, { borderLeftColor: item.color }]}>
      <View style={styles.newsHeader}>
        <Icon id={item.iconId as any} size={18} color={item.color} />
        <Text style={[styles.newsDate, { color: item.color }]}>{item.date}</Text>
      </View>
      <Text style={styles.newsTitle}>{item.title}</Text>
      <Text style={styles.newsBody}>{item.body}</Text>
    </View>
  );
});

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = BaseColors;

// Join session banner styles
const joinStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16,
    backgroundColor: 'rgba(99,102,241,0.10)',
    borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.35)',
    padding: 14,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title:  { fontSize: 15, color: '#a5b4fc', fontWeight: '700' },
  sub:    { fontSize: 12, color: BaseColors.textMuted },
  arrow:  { fontSize: 20, color: '#818cf8' },
});

// Upsell banner styles (defined before main styles to avoid forward ref issues)
const upsellStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(201,168,76,0.40)',
    padding: 14,
    gap: 10,
  },
  left:  { flex: 1, gap: 3 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,168,76,0.25)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    marginBottom: 2,
  },
  badgeText: { fontSize: 9, color: Colors.gold, fontWeight: '800', letterSpacing: 1 },
  title:     { fontSize: 15, color: Colors.textPrimary, fontWeight: '700' },
  sub:       { fontSize: 12, color: Colors.textMuted },
  arrow:     { fontSize: 24, color: Colors.gold },
});

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.background },
  container: { flex: 1 },
  scroll:    { gap: 0 },

  // Hero header
  heroHeader: {
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: C.backgroundCard,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
    gap: 14,
    overflow: 'hidden',
  },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  bellBtnText:  { fontSize: 18 },
  eraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  eraBtnIcon:  { fontSize: 14 },
  eraBtnLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  greeting:    { fontSize: 14, color: C.textMuted },
  userName:    { fontSize: 24, color: C.textPrimary, fontWeight: '800', marginTop: 2 },

  xpMiniCard:  { backgroundColor: C.backgroundElevated, borderRadius: Radius.md, padding: 12, gap: 6, borderWidth: 1 },
  xpMiniRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  xpMiniLevel: { fontSize: 13, fontWeight: '700' },
  xpMiniTotal: { fontSize: 12, color: C.textMuted },
  xpMiniTrack: { height: 4, backgroundColor: C.background, borderRadius: 2, overflow: 'hidden' },
  xpMiniFill:  { height: 4, borderRadius: 2 },
  xpMiniMeta:  { flexDirection: 'row', justifyContent: 'space-between' },
  xpMiniSub:   { fontSize: 11, color: C.textMuted },

  contentWrap: { padding: 16, gap: 20 },

  // Quote
  quoteCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 16, gap: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  quoteIcon:   {},  // unused — replaced by Icon component
  quoteText:   { fontSize: 14, color: C.textSecondary, lineHeight: 20, fontStyle: 'italic' },
  quoteAuthor: { fontSize: 12, fontWeight: '600', alignSelf: 'flex-end' },

  // Section
  section:       { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 3, height: 16, borderRadius: 2 },
  sectionLabel:  { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '700', flex: 1 },
  seeAll:        { fontSize: 12, fontWeight: '600' },
  refreshBadge:  { backgroundColor: C.backgroundCard, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.borderDefault },
  refreshText:   { fontSize: 10, color: C.textMuted },

  // Featured battle
  featuredCard: {
    backgroundColor: C.backgroundCard,
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
  },
  // Kontener zdjęcia — rozmiar definiuje Image (width:100% + aspectRatio)
  featuredImageWrap: {
    backgroundColor: '#0D1520',
  },
  featuredGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    opacity: 0.12,
  },
  // Tekst pod zdjęciem — zwykły padding, ciemne tło karty
  featuredInner: {
    padding: 16, gap: 8, alignItems: 'flex-start',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  featuredBadge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  featuredBadgeText:{ fontSize: 11, fontWeight: '700' },
  featuredEmoji:    { fontSize: 48 },
  featuredName:     { fontSize: 20, color: C.textPrimary, fontWeight: '800', lineHeight: 26 },
  featuredTextOnImage: {},   // nieużywane — zostaje dla kompatybilności
  featuredDate:     { fontSize: 12, color: C.textMuted },
  featuredOutcome:  { fontSize: 13, color: C.textSecondary, lineHeight: 19 },
  featuredStats:    { flexDirection: 'row', gap: 14, marginTop: 2 },
  featuredStat:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredStatIcon: {},  // unused — replaced by Icon component
  featuredStatText: { fontSize: 11, color: C.textMuted },
  featuredBtn:      { borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10, marginTop: 2, alignSelf: 'stretch', alignItems: 'center' },
  featuredBtnText:  { fontSize: 15, color: '#000', fontWeight: '800' },

  // Challenge
  challengeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 12, borderWidth: 1, borderColor: C.borderDefault,
  },
  challengeRowDone:  { opacity: 0.6 },
  challengeIcon:     { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  challengeTitle:    { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  challengeTitleDone:{ textDecorationLine: 'line-through', color: C.textMuted },
  challengeDesc:     { fontSize: 12, color: C.textMuted },
  challengeReward:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  challengeRewardText: { fontSize: 12, fontWeight: '700' },

  // Quick actions
  quickGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction:      {
    width: (SW - 52) / 3,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 12, alignItems: 'center', gap: 6,
    borderWidth: 1,
  },
  quickActionIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '600' },

  // Artifacts
  artifactsRow:    { flexDirection: 'row', gap: 10 },
  artifactMini:    { width: 60, height: 60, borderRadius: 14, backgroundColor: C.backgroundCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative' },
  artifactMiniIcon:{ fontSize: 28 },
  artifactMiniDot: { position: 'absolute', bottom: 5, right: 5, width: 8, height: 8, borderRadius: 4 },

  // Battle row
  battleRow:             { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.backgroundCard, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: C.borderDefault },
  battleRowLocked:       { opacity: 0.5 },
  battleRowThumb:        { width: 54, height: 54, borderRadius: 11, borderWidth: 2, overflow: 'hidden' },
  battleRowImg:          { width: '100%', height: '100%' },
  battleRowIconFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  battleRowName:         { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  battleRowMeta:         { fontSize: 12, color: C.textMuted },
  battleRowRight:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  battleRowListened:     {},  // unused — replaced by Icon
  battleRowLock:         {},  // unused — replaced by Icon
  battleRowArrow:        {},  // unused — replaced by Icon

  // News
  newsCard:   { backgroundColor: C.backgroundCard, borderRadius: Radius.md, padding: 14, gap: 6, borderWidth: 1, borderColor: C.borderDefault, borderLeftWidth: 3 },
  newsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newsIcon:   {},  // unused — replaced by Icon component
  newsDate:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  newsTitle:  { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  newsBody:   { fontSize: 13, color: C.textMuted, lineHeight: 18 },
});
