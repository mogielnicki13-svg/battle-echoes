// ============================================================
// BATTLE ECHOES — ShopScreen.tsx
// Sklep — Epoki · Przedmioty · Dukaty
// Bez prawdziwych płatności (IAP na później)
// ============================================================
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Modal, Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import { CoinCounter, FloatingReward, RewardToast } from '../components/XPSystem';
import RecruitPackCard from '../components/RecruitPackCard';
import { RARITY_META } from '../artifacts/data';
import type { Rarity } from '../artifacts/data';
import GoldIcon, { Icon, EraIcon } from '../components/GoldIcon';
import purchaseService, { PRODUCT_IDS } from '../services/PurchaseService';
import { useTranslation } from 'react-i18next';

const { width: SW, height: SH } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════
// TYPY
// ════════════════════════════════════════════════════════════
interface EraOffer {
  id:          string;
  name:        string;
  eraId:       string;
  color:       string;
  description: string;
  battles:     number;
  price:       number;
  highlight?:  boolean;
  bonusXP:     number;
}

interface CoinPack {
  id:        string;
  coins:     number;
  bonus:     number;
  price:     string;
  iconId:    string;
  popular?:  boolean;
  productId: string;  // RevenueCat product ID
}

interface ShopItem {
  id:          string;
  name:        string;
  iconId:      string;
  description: string;
  price:       number;
  color:       string;
  category:    'pack' | 'cosmetic' | 'artifact';
  rarity?:     Rarity;
}

type TabId = 'eras' | 'items' | 'coins';

// ════════════════════════════════════════════════════════════
// DANE SKLEPU
// ════════════════════════════════════════════════════════════
const ERA_OFFERS: EraOffer[] = [
  {
    id: 'medieval',     name: 'Średniowiecze',       eraId: 'medieval',     color: '#D4A017',
    description: 'Grunwald, Crécy, Agincourt — epoka rycerzy i zamków',
    battles: 8,  price: 0,   bonusXP: 0,
  },
  {
    id: 'napoleon',     name: 'Epoka Napoleońska',   eraId: 'napoleon',     color: '#4ade80',
    description: 'Waterloo, Austerlitz, Borodino — złota era taktyki',
    battles: 10, price: 200, bonusXP: 300, highlight: true,
  },
  {
    id: 'ww1',          name: 'I Wojna Światowa',    eraId: 'ww1',          color: '#94a3b8',
    description: 'Ypres, Verdun, Somma — okopy i gaz musztardowy',
    battles: 12, price: 250, bonusXP: 350,
  },
  {
    id: 'ww2',          name: 'II Wojna Światowa',   eraId: 'ww2',          color: '#f87171',
    description: 'Stalingrad, Monte Cassino, D-Day — największy konflikt w historii',
    battles: 15, price: 350, bonusXP: 500, highlight: true,
  },
  {
    id: 'ancient',      name: 'Starożytność',        eraId: 'ancient',      color: '#c084fc',
    description: 'Termopile, Kannae, Gaugamela — u zarania sztuki wojennej',
    battles: 9,  price: 300, bonusXP: 400,
  },
  {
    id: 'early_modern', name: 'Wczesna Nowożytność', eraId: 'early_modern', color: '#60a5fa',
    description: 'Lepanto, Wiedeń, Blenheim — proch zmienia wszystko',
    battles: 11, price: 280, bonusXP: 380,
  },
];

const COIN_PACKS: CoinPack[] = [
  { id: 'small',  coins: 100,  bonus: 0,   price: '2,99 zł',  iconId: 'coin',    productId: PRODUCT_IDS.coins_small },
  { id: 'medium', coins: 300,  bonus: 50,  price: '7,99 zł',  iconId: 'coin',    productId: PRODUCT_IDS.coins_medium, popular: true },
  { id: 'large',  coins: 700,  bonus: 150, price: '14,99 zł', iconId: 'diamond', productId: PRODUCT_IDS.coins_large },
  { id: 'mega',   coins: 1500, bonus: 400, price: '24,99 zł', iconId: 'crown',   productId: PRODUCT_IDS.coins_mega },
];

const BATTLE_PACKS: ShopItem[] = [
  {
    id: 'pack_women', name: 'Głosy Kobiet', iconId: 'microphone',
    description: 'Narracje z perspektywy kobiet — pielęgniarek, łączniczek i matek oczekujących na froncie',
    price: 150, color: '#c084fc', category: 'pack',
  },
  {
    id: 'pack_medics', name: 'Perspektywa Medyków', iconId: 'medical-bag',
    description: 'Sanitariusze i lekarze polowi — historia widziana ze szpitalnych namiotów i lazaretów',
    price: 150, color: '#60a5fa', category: 'pack',
  },
  {
    id: 'pack_diplomacy', name: 'Sala Dyplomatyczna', iconId: 'handshake',
    description: 'Negocjatorzy i dyplomaci — jak decyzje zza biurka kształtowały losy bitwy',
    price: 200, color: '#fbbf24', category: 'pack',
  },
];

const COSMETIC_ITEMS: ShopItem[] = [
  {
    id: 'motyw_pergamin', name: 'Motyw Pergamin', iconId: 'scroll',
    description: 'Złoty pergaminowy interfejs — stylowy jak średniowieczny iluminowany manuskrypt',
    price: 100, color: '#D4A017', category: 'cosmetic',
  },
  {
    id: 'motyw_olejny', name: 'Motyw Olejny', iconId: 'image-frame',
    description: 'Klasyczny styl inspirowany XVII-wiecznymi obrazami batalistycznymi',
    price: 150, color: '#c084fc', category: 'cosmetic',
  },
  {
    id: 'motyw_mapa', name: 'Mapa Bitewna', iconId: 'map',
    description: 'Taktyczna mapa jako tło aplikacji — dla miłośników sztuki wojennej',
    price: 200, color: '#60a5fa', category: 'cosmetic',
  },
];

const PREMIUM_ARTIFACTS: ShopItem[] = [
  {
    id: 'grunwald_letter_rare', name: 'List Jagiełły', iconId: 'scroll',
    description: 'Kopia królewskiego listu z 1410 r. — dostęp bez odsłuchania wszystkich perspektyw',
    price: 120, color: '#60a5fa', category: 'artifact', rarity: 'rare',
  },
  {
    id: 'waterloo_eagle_legendary', name: 'Orzeł Napoleoński', iconId: 'feather',
    description: 'Legendarny symbol pułku — dostęp bez ukończenia wszystkich aktywności Waterloo',
    price: 300, color: '#D4A017', category: 'artifact', rarity: 'legendary',
  },
  {
    id: 'ypres_menin_gate', name: 'Fragment Bramy Menin', iconId: 'bank',
    description: 'Symbol 54 896 poległych bez grobu — dostęp bez wizyty GPS w Ypres',
    price: 250, color: '#60a5fa', category: 'artifact', rarity: 'legendary',
  },
];

// ════════════════════════════════════════════════════════════
// GOLD BURST — animacja złotych cząsteczek
// ════════════════════════════════════════════════════════════
const BURST_COUNT  = 12;
const BURST_EMOJIS = ['bitcoin', 'star', 'star-four-points', 'star', 'fire', 'lightning-bolt'];

function GoldBurst({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const anims = useRef(
    Array.from({ length: BURST_COUNT }, () => ({
      x:       new Animated.Value(0),
      y:       new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0),
    }))
  ).current;

  React.useEffect(() => {
    if (!visible) return;
    const animations = anims.map((anim, i) => {
      const angle = (i / BURST_COUNT) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
      const dist  = 65 + Math.random() * 55;
      anim.x.setValue(0);
      anim.y.setValue(0);
      anim.opacity.setValue(0);
      anim.scale.setValue(0);
      return Animated.sequence([
        Animated.parallel([
          Animated.spring(anim.scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
          Animated.timing(anim.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(anim.x,      { toValue: Math.cos(angle) * dist, duration: 420, useNativeDriver: true }),
          Animated.timing(anim.y,      { toValue: Math.sin(angle) * dist, duration: 420, useNativeDriver: true }),
        ]),
        Animated.timing(anim.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]);
    });
    Animated.parallel(animations).start(() => onDone());
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={{ position: 'absolute', top: SH * 0.42, left: SW * 0.5 }}>
        {anims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.burstParticle,
              {
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  { scale:      anim.scale },
                ],
                opacity: anim.opacity,
              },
            ]}
          >
            <GoldIcon name={BURST_EMOJIS[i % BURST_EMOJIS.length]} size={20} color="#C9A84C" />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function ShopScreen() {
  const { t } = useTranslation();
  const { user, awardCoins, awardXP, unlockEra, unlockArtifact, unlockAllEras, hasAllEras } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('Shop'); }, []));
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [activeTab, setActiveTab]       = useState<TabId>('eras');
  const [confirmOffer, setConfirmOffer] = useState<EraOffer | null>(null);
  const [confirmItem,  setConfirmItem]  = useState<ShopItem | null>(null);
  const [floaters, setFloaters]         = useState<{ id: string; value: string; color: string }[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData,    setToastData]    = useState<{ icon: string; title: string; subtitle: string; color: string }>({ icon: '🎉', title: '', subtitle: '', color: Colors.gold });
  const [burstVisible, setBurstVisible] = useState(false);

  // Shake animation dla CoinCounter (niewystarczające środki)
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  -7, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   7, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  // ── Helpers ────────────────────────────────────────────────
  const showFloating = (value: string, color: string) => {
    const id = Math.random().toString(36).substring(2, 8);
    setFloaters(prev => [...prev, { id, value, color }]);
  };

  const showToast = (icon: string, title: string, subtitle: string, color: string = Colors.gold) => {
    setToastData({ icon, title, subtitle, color });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  };

  // ── Pakiet Pełny ─────────────────────────────────────────
  const BUNDLE_PRICE = 1500;
  const handleBuyBundle = () => {
    if (hasAllEras()) return; // już posiada
    if ((user?.coins ?? 0) < BUNDLE_PRICE) {
      triggerShake();
      showToast('🪙', t('shop.not_enough_coins'),
        `${t('shop.need_coins', { amount: BUNDLE_PRICE })} — ${t('shop.go_to_coins')}`,
        '#f87171');
      return;
    }
    awardCoins(-BUNDLE_PRICE, 'Pakiet Pełny');
    unlockAllEras();
    awardXP(1000, 'Bonus za Pakiet Pełny');
    setTimeout(() => setBurstVisible(true), 120);
    showFloating(`✨ ${t('shop.all_eras_owned')}!`, Colors.gold);
    showToast('🏆', `${t('shop.all_eras_bundle')}!`, t('shop.all_eras_bundle_desc'), Colors.gold);
  };

  // ── Epoki ──────────────────────────────────────────────────
  const handleBuyEra = (offer: EraOffer) => {
    if (offer.price === 0) return;
    if ((user?.coins ?? 0) < offer.price) {
      triggerShake();
      showToast('🪙', t('shop.not_enough_coins'),
        `${t('shop.need_coins', { amount: offer.price })} — ${t('shop.go_to_coins')}`,
        '#f87171');
      return;
    }
    setConfirmOffer(offer);
  };

  const confirmEraPurchase = () => {
    if (!confirmOffer) return;
    const offer = confirmOffer;
    setConfirmOffer(null);
    awardCoins(-offer.price, 'Zakup epoki');
    unlockEra(offer.id);
    if (offer.bonusXP > 0) awardXP(offer.bonusXP, 'Bonus za epokę');
    setTimeout(() => setBurstVisible(true), 120);
    showFloating(`🔓 ${offer.name}`, offer.color);
    showToast('🎉', t('shop.unlocked_era', { name: offer.name }),
      t('shop.bonus_xp', { amount: offer.bonusXP }), offer.color);
  };

  // ── Przedmioty ─────────────────────────────────────────────
  const handleBuyItem = (item: ShopItem) => {
    if ((user?.unlockedArtifacts ?? []).includes(item.id)) return;
    if ((user?.coins ?? 0) < item.price) {
      triggerShake();
      showToast('🪙', t('shop.not_enough_coins'),
        `${t('shop.need_coins', { amount: item.price })} — ${t('shop.go_to_coins_short')}`,
        '#f87171');
      return;
    }
    setConfirmItem(item);
  };

  const confirmItemPurchase = () => {
    if (!confirmItem) return;
    const item = confirmItem;
    setConfirmItem(null);
    awardCoins(-item.price, 'Zakup przedmiotu');
    unlockArtifact(item.id);
    setTimeout(() => setBurstVisible(true), 120);
    const prefix = item.category === 'artifact' ? '🏺' : item.category === 'pack' ? '🎙' : '🎨';
    showFloating(`${prefix} ${item.name}`, item.color);
    const subtitle = item.rarity
      ? `${t('shop.rarity_label')}: ${RARITY_META[item.rarity].label}`
      : t('shop.available_now');
    showToast(prefix, t('shop.unlocked_item', { name: item.name }), subtitle, item.color);
  };

  // ── Dukaty (RevenueCat IAP) ───────────────────────────────
  const handleBuyCoins = async (pack: CoinPack) => {
    if (purchaseService.isAvailable()) {
      try {
        const result = await purchaseService.purchaseProduct(pack.productId);
        if (!result.success) return; // user cancelled
        const total = result.coins;
        awardCoins(total, `Zakup: ${pack.price}`);
        setBurstVisible(true);
        showFloating(`+${total} 🪙`, Colors.gold);
        showToast('🪙', `+${total} Dukatów`, `Zakup: ${pack.price}`, Colors.gold);
      } catch (e: unknown) {
        showToast('❌', t('shop.purchase_error'), e instanceof Error ? e.message : t('common.retry'), '#f87171');
      }
    } else {
      // Demo mode — IAP not available (Expo Go or not initialized)
      awardCoins(pack.coins + pack.bonus, 'Demo — zakup dukatów');
      setBurstVisible(true);
      showFloating(`+${pack.coins + pack.bonus} 🪙`, Colors.gold);
      showToast('🪙', `+${pack.coins + pack.bonus} Dukatów`,
        `Zakup: ${pack.price} — tryb demo`, Colors.gold);
    }
  };

  const unlockedEras      = user?.unlockedEras      ?? [];
  const unlockedArtifacts = user?.unlockedArtifacts ?? [];
  const coins             = user?.coins             ?? 0;

  return (
    <View style={styles.container}>
      {/* Złote cząsteczki zakupu */}
      <GoldBurst visible={burstVisible} onDone={() => setBurstVisible(false)} />

      {/* Latające nagrody */}
      {floaters.map(f => (
        <FloatingReward
          key={f.id} value={f.value} color={f.color} y={320}
          onDone={() => setFloaters(prev => prev.filter(x => x.id !== f.id))}
        />
      ))}

      {/* Toast */}
      <RewardToast
        visible={toastVisible}
        icon={toastData.icon}
        title={toastData.title}
        subtitle={toastData.subtitle}
        color={toastData.color}
      />

      {/* Modals */}
      <EraModal
        offer={confirmOffer}
        userCoins={coins}
        onConfirm={confirmEraPurchase}
        onCancel={() => setConfirmOffer(null)}
      />
      <ItemModal
        item={confirmItem}
        userCoins={coins}
        onConfirm={confirmItemPurchase}
        onCancel={() => setConfirmItem(null)}
      />

      {/* ── Nagłówek ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon id="sword" size={20} color={Colors.gold} />
            <Text style={styles.headerTitle}>{t('shop.quartermaster')}</Text>
          </View>
          <Text style={styles.headerSub}>{t('shop.unlock_desc')}</Text>
        </View>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <CoinCounter coins={coins} />
        </Animated.View>
      </View>

      {/* ── Zakładki ─────────────────────────────────────── */}
      <View style={styles.tabs}>
        {(['eras', 'items', 'coins'] as TabId[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {tab === 'eras' && <Icon id="sword" size={13} color={activeTab === tab ? Colors.gold : Colors.textMuted} />}
              {tab === 'items' && <Icon id="artifact" size={13} color={activeTab === tab ? Colors.gold : Colors.textMuted} />}
              {tab === 'coins' && <Icon id="coin" size={13} color={activeTab === tab ? Colors.gold : Colors.textMuted} />}
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'eras' ? t('shop.tab_eras') : tab === 'items' ? t('shop.tab_items') : t('shop.tab_coins')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Recruit Pack — 48h time-limited offer ───────── */}
        <RecruitPackCard onClaim={() => {
          // Gość → otwórz LoginScreen jako modal (flow: Google OAuth → promoteGuestToAuth)
          // Zalogowany pełny user → pakiet aktywowany bez logowania (IAP w przyszłości)
          if (user?.isGuest) {
            navigation.navigate('Login');
          }
        }} />

        {/* ══════════════════════════════════════════════
            ZAKŁADKA: EPOKI
        ══════════════════════════════════════════════ */}
        {activeTab === 'eras' && (
          <>
            <Text style={styles.sectionHint}>
              {t('shop.eras_hint')}
            </Text>

            {/* ── Pakiet Pełny — Bundle card ─────────────── */}
            {hasAllEras() ? (
              <View style={bundleStyles.cardOwned}>
                <Icon id="check_solid" size={24} color="#4ade80" />
                <View style={{ flex: 1 }}>
                  <Text style={bundleStyles.ownedTitle}>{t('shop.all_eras_owned')}</Text>
                  <Text style={bundleStyles.ownedSub}>{t('shop.all_eras_thanks')}</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={bundleStyles.card}
                onPress={handleBuyBundle}
                activeOpacity={0.88}
              >
                <View style={bundleStyles.badge}>
                  <Text style={bundleStyles.badgeText}>{t('shop.best_price')}</Text>
                </View>
                <View style={bundleStyles.row}>
                  <View style={bundleStyles.iconsRow}>
                    {(['medieval', 'ancient', 'early_modern', 'napoleon', 'ww1', 'ww2'] as string[]).map((era, i) => (
                      <EraIcon key={i} eraId={era} size={20} color={Colors.gold} />
                    ))}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={bundleStyles.title}>{t('shop.all_eras_bundle')}</Text>
                    <Text style={bundleStyles.sub}>{t('shop.all_eras_bundle_desc')}</Text>
                  </View>
                </View>
                <View style={bundleStyles.footer}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={bundleStyles.originalPrice}>{t('shop.original_price')}</Text>
                      <Icon id="coin" size={11} color={Colors.textMuted} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={bundleStyles.bundlePrice}>1 500</Text>
                      <Icon id="coin" size={16} color={Colors.gold} />
                    </View>
                  </View>
                  <View style={[
                    bundleStyles.buyBtn,
                    (user?.coins ?? 0) < 1500 && bundleStyles.buyBtnDisabled,
                  ]}>
                    <Text style={bundleStyles.buyBtnText}>
                      {(user?.coins ?? 0) >= 1500 ? t('shop.buy_now') : t('shop.not_enough')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <Text style={[styles.sectionHint, { marginTop: 8 }]}>
              {t('shop.buy_separately')}
            </Text>

            {ERA_OFFERS.map(offer => {
              const owned     = unlockedEras.includes(offer.id as any);
              const canAfford = coins >= offer.price;
              return (
                <EraCard
                  key={offer.id}
                  offer={offer}
                  owned={owned}
                  canAfford={canAfford}
                  onPress={() => owned ? undefined : handleBuyEra(offer)}
                />
              );
            })}
          </>
        )}

        {/* ══════════════════════════════════════════════
            ZAKŁADKA: PRZEDMIOTY
        ══════════════════════════════════════════════ */}
        {activeTab === 'items' && (
          <>
            {/* Sekcja 1: Paczki narracji */}
            <SectionHeader
              icon="microphone"
              title={t('shop.battle_packs')}
              subtitle={t('shop.battle_packs_desc')}
            />
            <View style={styles.itemsGrid}>
              {BATTLE_PACKS.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={unlockedArtifacts.includes(item.id)}
                  canAfford={coins >= item.price}
                  onPress={() => handleBuyItem(item)}
                />
              ))}
            </View>

            {/* Sekcja 2: Motywy kolekcji */}
            <SectionHeader
              icon="shuffle"
              title={t('shop.cosmetics')}
              subtitle={t('shop.cosmetics_desc')}
            />
            <View style={styles.itemsGrid}>
              {COSMETIC_ITEMS.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={unlockedArtifacts.includes(item.id)}
                  canAfford={coins >= item.price}
                  onPress={() => handleBuyItem(item)}
                />
              ))}
            </View>

            {/* Sekcja 3: Artefakty premium */}
            <SectionHeader
              icon="artifact"
              title={t('shop.premium_artifacts')}
              subtitle={t('shop.premium_artifacts_desc')}
            />
            {PREMIUM_ARTIFACTS.map(item => (
              <PremiumArtifactCard
                key={item.id}
                item={item}
                owned={unlockedArtifacts.includes(item.id)}
                canAfford={coins >= item.price}
                onPress={() => handleBuyItem(item)}
              />
            ))}
          </>
        )}

        {/* ══════════════════════════════════════════════
            ZAKŁADKA: DUKATY
        ══════════════════════════════════════════════ */}
        {activeTab === 'coins' && (
          <>
            <Text style={styles.sectionHint}>
              {t('shop.coins_hint')}
            </Text>

            <View style={styles.freeBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon id="gift" size={14} color={Colors.gold} />
                <Text style={styles.freeBoxTitle}>{t('shop.earn_free')}</Text>
              </View>
              {([
                ['microphone', t('shop.earn_listen'), '+25', 'coin'],
                ['map_marker', t('shop.earn_visit'), '+75', 'coin'],
                ['fire', t('shop.earn_streak'), '+140', 'coin'],
                ['trophy', t('shop.earn_level'), '+100', 'coin'],
              ] as [string, string, string, string][]).map(([iconId, label, amount, rewardIcon]) => (
                <View key={label} style={styles.freeRow}>
                  <Icon id={iconId as any} size={18} color={Colors.gold} style={{ width: 24 } as any} />
                  <Text style={styles.freeText}>
                    {label}
                    {' → '}
                    {amount}{' '}
                  </Text>
                  <Icon id={rewardIcon as any} size={13} color={Colors.gold} />
                </View>
              ))}
            </View>

            <Text style={styles.packSectionLabel}>{t('shop.demo_packs')}</Text>
            <View style={styles.packsGrid}>
              {COIN_PACKS.map(pack => (
                <CoinPackCard
                  key={pack.id}
                  pack={pack}
                  onPress={() => handleBuyCoins(pack)}
                />
              ))}
            </View>

            <View style={styles.policyBox}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Icon id="lock" size={14} color={Colors.textMuted} style={{ marginTop: 1 } as any} />
                <Text style={styles.policyText}>
                  {t('shop.policy_text')}
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// NAGŁÓWEK SEKCJI
// ════════════════════════════════════════════════════════════
function SectionHeader({ icon, title, subtitle }: {
  icon: string; title: string; subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon id={icon as any} size={15} color={Colors.gold} />
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionHeaderSub}>{subtitle}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA EPOKI
// ════════════════════════════════════════════════════════════
function EraCard({ offer, owned, canAfford, onPress }: {
  offer: EraOffer; owned: boolean; canAfford: boolean; onPress: () => void;
}) {
  const { t } = useTranslation();
  const scale    = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200 }).start();
  const isFree = offer.price === 0;

  return (
    <Animated.View style={[
      styles.eraCard, { transform: [{ scale }] },
      offer.highlight && !owned && styles.eraCardHighlight,
      owned && styles.eraCardOwned,
    ]}>
      {offer.highlight && !owned && (
        <View style={[styles.badge, { backgroundColor: offer.color }]}>
          <Text style={styles.badgeText}>{t('shop.popular').toUpperCase()}</Text>
        </View>
      )}
      {owned && (
        <View style={[styles.badge, { backgroundColor: '#4ade80' }]}>
          <Text style={styles.badgeText}>{t('shop.owned_badge')}</Text>
        </View>
      )}

      <View style={styles.eraCardTop}>
        <View style={[styles.eraIconBox, { backgroundColor: `${offer.color}20`, borderColor: `${offer.color}40` }]}>
          <EraIcon eraId={offer.id} size={24} color={offer.color} />
        </View>
        <View style={styles.eraInfo}>
          <Text style={[styles.eraName, owned && { color: '#4ade80' }]}>{offer.name}</Text>
          <Text style={styles.eraDesc}>{offer.description}</Text>
          <View style={styles.eraStats}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon id="microphone" size={11} color={Colors.textMuted} />
              <Text style={styles.eraStat}>{t('shop.battles_count', { count: offer.battles })}</Text>
            </View>
            {offer.bonusXP > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon id="star" size={11} color={Colors.textMuted} />
                <Text style={styles.eraStat}>{t('shop.bonus_xp', { amount: offer.bonusXP })}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {!owned && (
        <TouchableOpacity
          style={[
            styles.buyBtn, { borderColor: offer.color },
            isFree && { backgroundColor: '#4ade8020', borderColor: '#4ade80' },
            !canAfford && !isFree && styles.buyBtnDisabled,
          ]}
          onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}
        >
          {isFree ? (
            <Text style={[styles.buyBtnText, { color: '#4ade80' }]}>{t('shop.unlocked')}</Text>
          ) : (
            <>
              <Icon id="coin" size={16} color={canAfford ? offer.color : Colors.textMuted} />
              <Text style={[styles.buyBtnText, { color: canAfford ? offer.color : Colors.textMuted }]}>
                {offer.price} {t('shop.coins_label')}
              </Text>
              {!canAfford && <Text style={styles.buyBtnInsuf}>{t('shop.not_enough_suffix')}</Text>}
            </>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA PRZEDMIOTU — siatka 2-kolumnowa (paczki + motywy)
// ════════════════════════════════════════════════════════════
function ShopItemCard({ item, owned, canAfford, onPress }: {
  item: ShopItem; owned: boolean; canAfford: boolean; onPress: () => void;
}) {
  const { t } = useTranslation();
  const scale    = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200 }).start();

  return (
    <Animated.View style={[styles.itemCard, owned && styles.itemCardOwned, { transform: [{ scale }] }]}>
      {owned && (
        <View style={[styles.itemBadge, { backgroundColor: '#4ade80' }]}>
          <Text style={styles.itemBadgeText}>✓</Text>
        </View>
      )}

      <GoldIcon name={item.iconId} size={28} color={item.color} />
      <Text style={styles.itemCardName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.itemCardDesc} numberOfLines={4}>{item.description}</Text>

      {owned ? (
        <Text style={styles.itemOwnedLabel}>{t('shop.owns_item')}</Text>
      ) : (
        <TouchableOpacity
          style={[styles.itemBuyBtn, { borderColor: item.color }, !canAfford && styles.itemBuyBtnOff]}
          onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon id="coin" size={13} color={canAfford ? item.color : Colors.textMuted} />
            <Text style={[styles.itemBuyText, { color: canAfford ? item.color : Colors.textMuted }]}>
              {item.price}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA ARTEFAKTU PREMIUM — pełna szerokość z odznaką rzadkości
// ════════════════════════════════════════════════════════════
function PremiumArtifactCard({ item, owned, canAfford, onPress }: {
  item: ShopItem; owned: boolean; canAfford: boolean; onPress: () => void;
}) {
  const { t } = useTranslation();
  const scale    = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200 }).start();
  const rarity = item.rarity ? RARITY_META[item.rarity] : null;

  return (
    <Animated.View style={[
      styles.artifactCard, { transform: [{ scale }] },
      rarity && { borderColor: `${rarity.color}45` },
      owned  && styles.artifactCardOwned,
    ]}>
      <View style={styles.artifactCardRow}>
        {/* Ikona */}
        <View style={[
          styles.artifactIconBox,
          rarity && { backgroundColor: `${rarity.color}15`, borderColor: `${rarity.color}50` },
        ]}>
          <GoldIcon name={item.iconId} size={26} color={rarity ? rarity.color : item.color} />
        </View>

        {/* Treść */}
        <View style={styles.artifactInfo}>
          <View style={styles.artifactTitleRow}>
            <Text style={styles.artifactName}>{item.name}</Text>
            {rarity && (
              <View style={[styles.rarityBadge, { backgroundColor: `${rarity.color}25` }]}>
                <Text style={[styles.rarityBadgeText, { color: rarity.color }]}>
                  {rarity.label.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.artifactDesc}>{item.description}</Text>
        </View>
      </View>

      {/* Przycisk */}
      {owned ? (
        <View style={styles.artifactOwned}>
          <Text style={styles.artifactOwnedText}>{t('shop.owns_artifact')}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.artifactBuyBtn,
            { borderColor: item.color, backgroundColor: `${item.color}10` },
            !canAfford && styles.artifactBuyBtnOff,
          ]}
          onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}
        >
          <Icon id="coin" size={16} color={canAfford ? item.color : Colors.textMuted} />
          <Text style={[styles.artifactBuyText, { color: canAfford ? item.color : Colors.textMuted }]}>
            {item.price} {t('shop.coins_label')}
          </Text>
          {!canAfford && <Text style={styles.buyBtnInsuf}>{t('shop.not_enough_suffix')}</Text>}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA PAKIETU DUKATÓW
// ════════════════════════════════════════════════════════════
function CoinPackCard({ pack, onPress }: { pack: CoinPack; onPress: () => void }) {
  const { t } = useTranslation();
  const scale    = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200 }).start();

  return (
    <Animated.View style={[styles.packCard, pack.popular && styles.packCardPopular, { transform: [{ scale }] }]}>
      {pack.popular && (
        <View style={styles.packBadge}>
          <Text style={styles.packBadgeText}>{t('shop.best_price')}</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.packInner}
        onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}
      >
        <Icon id={pack.iconId as any} size={32} color={Colors.gold} />
        <Text style={styles.packCoins}>{pack.coins}</Text>
        <Text style={styles.packLabel2}>{t('shop.coins_label')}</Text>
        {pack.bonus > 0 && (
          <View style={styles.packBonus}>
            <Text style={styles.packBonusText}>+{pack.bonus} {t('shop.free_label')}</Text>
          </View>
        )}
        <Text style={styles.packPrice}>{pack.price}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// HELPERS: ModalRow i ModalButtons (DRY)
// ════════════════════════════════════════════════════════════
function ModalRow({ label, value, valueColor, last }: {
  label: string; value: string; valueColor?: string; last?: boolean;
}) {
  return (
    <View style={[styles.modalDetailRow, last && styles.modalDetailRowLast]}>
      <Text style={styles.modalDetailLabel}>{label}</Text>
      <Text style={[styles.modalDetailValue, valueColor ? { color: valueColor, fontWeight: '800' } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

function ModalButtons({ onCancel, onConfirm, confirmColor }: {
  onCancel: () => void; onConfirm: () => void; confirmColor: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.modalBtns}>
      <TouchableOpacity style={styles.modalBtnCancel} onPress={onCancel}>
        <Text style={styles.modalBtnCancelText}>{t('shop.cancel')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: confirmColor }]} onPress={onConfirm}>
        <Text style={styles.modalBtnConfirmText}>{t('shop.buy_now')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL POTWIERDZENIA — EPOKI
// ════════════════════════════════════════════════════════════
function EraModal({ offer, userCoins, onConfirm, onCancel }: {
  offer: EraOffer | null; userCoins: number; onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (offer) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 10 }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [offer]);

  if (!offer) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <Animated.View style={[styles.modalCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.modalIconBox, { backgroundColor: `${offer.color}20`, borderColor: offer.color }]}>
            <EraIcon eraId={offer.id} size={36} color={offer.color} />
          </View>
          <Text style={styles.modalTitle}>{t('shop.unlock', { name: offer.name })}</Text>
          <Text style={styles.modalDesc}>{offer.description}</Text>
          <View style={styles.modalDetails}>
            <ModalRow label={t('search.battles')}    value={`${offer.battles}`} />
            <ModalRow label="Bonus XP" value={`+${offer.bonusXP}`} />
            <ModalRow label={t('shop.price_label')}     value={`${offer.price} ${t('shop.coins_label')}`} valueColor={offer.color} last />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' }}>
            <Text style={styles.modalBalance}>{t('shop.after_purchase')}</Text>
            <Icon id="coin" size={13} color={Colors.textMuted} />
            <Text style={styles.modalBalance}>{userCoins - offer.price} {t('shop.coins_label')}</Text>
          </View>
          <ModalButtons onCancel={onCancel} onConfirm={onConfirm} confirmColor={offer.color} />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL POTWIERDZENIA — PRZEDMIOTY
// ════════════════════════════════════════════════════════════
function ItemModal({ item, userCoins, onConfirm, onCancel }: {
  item: ShopItem | null; userCoins: number; onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (item) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 10 }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [item]);

  if (!item) return null;

  const rarity = item.rarity ? RARITY_META[item.rarity] : null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <Animated.View style={[styles.modalCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.modalIconBox, { backgroundColor: `${item.color}20`, borderColor: item.color }]}>
            <GoldIcon name={item.iconId} size={36} color={item.color} />
          </View>
          <Text style={styles.modalTitle}>{item.name}</Text>
          <Text style={styles.modalDesc}>{item.description}</Text>
          <View style={styles.modalDetails}>
            {rarity && (
              <ModalRow label={t('shop.rarity_label')} value={rarity.label} valueColor={rarity.color} />
            )}
            <ModalRow label={t('shop.price_label')} value={`${item.price} ${t('shop.coins_label')}`} valueColor={item.color} last />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' }}>
            <Text style={styles.modalBalance}>{t('shop.after_purchase')}</Text>
            <Icon id="coin" size={13} color={Colors.textMuted} />
            <Text style={styles.modalBalance}>{userCoins - item.price} {t('shop.coins_label')}</Text>
          </View>
          <ModalButtons onCancel={onCancel} onConfirm={onConfirm} confirmColor={item.color} />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C      = Colors;
const ITEM_W = (SW - 44) / 2; // 2-kolumnowa siatka: 16 padding + 12 gap

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  headerTitle: { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  headerSub:   { fontSize: 13, color: C.textMuted,   marginTop: 2 },

  // ── Tabs ──────────────────────────────────────────────────
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderDefault },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: C.gold },
  tabText:       { fontSize: 12, color: C.textMuted,  fontWeight: '600' },
  tabTextActive: { color: C.gold },

  // ── Scroll ────────────────────────────────────────────────
  scroll:      { padding: 16, gap: 12 },
  sectionHint: { fontSize: 13, color: C.textMuted, lineHeight: 18, marginBottom: 4 },

  // ── Section header ────────────────────────────────────────
  sectionHeader:      { marginTop: 8, marginBottom: 2 },
  sectionHeaderTitle: { fontSize: 15, color: C.textPrimary, fontWeight: '700' },
  sectionHeaderSub:   { fontSize: 12, color: C.textMuted,   marginTop: 2 },

  // ── Era card ──────────────────────────────────────────────
  eraCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.lg,
    padding: 16, gap: 12, borderWidth: 1, borderColor: C.borderDefault,
  },
  eraCardHighlight: { borderColor: C.borderGold },
  eraCardOwned:     { borderColor: '#4ade8040', backgroundColor: '#4ade8008' },

  badge:     { position: 'absolute', top: 12, right: 12, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, color: C.ink, fontWeight: '800', letterSpacing: 0.5 },

  eraCardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  eraIconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  eraIcon:    { fontSize: 28 },
  eraInfo:    { flex: 1, gap: 4 },
  eraName:    { fontSize: 17, color: C.textPrimary, fontWeight: '700', paddingRight: 60 },
  eraDesc:    { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  eraStats:   { flexDirection: 'row', gap: 12, marginTop: 2 },
  eraStat:    { fontSize: 11, color: C.textMuted },

  buyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, backgroundColor: 'transparent',
  },
  buyBtnDisabled: { borderColor: C.borderDefault },
  buyBtnIcon:     { fontSize: 16 },
  buyBtnText:     { fontSize: 14, fontWeight: '700' },
  buyBtnInsuf:    { fontSize: 12, color: '#f87171' },

  // ── Items grid (2 columns: paczki + motywy) ───────────────
  itemsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itemCard: {
    width: ITEM_W,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault,
    padding: 14, gap: 8, alignItems: 'flex-start',
    overflow: 'hidden',
  },
  itemCardOwned: { borderColor: '#4ade8040', backgroundColor: '#4ade8008' },
  itemBadge:     { position: 'absolute', top: 8, right: 8, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 },
  itemBadgeText: { fontSize: 8, color: C.ink, fontWeight: '800' },
  itemCardIcon:  { fontSize: 28 },
  itemCardName:  { fontSize: 14, color: C.textPrimary,   fontWeight: '700', lineHeight: 18 },
  itemCardDesc:  { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  itemOwnedLabel:{ fontSize: 12, color: '#4ade80',        fontWeight: '600', alignSelf: 'center', marginTop: 4 },
  itemBuyBtn: {
    alignSelf: 'stretch', borderWidth: 1, borderRadius: Radius.sm,
    paddingVertical: 8, alignItems: 'center', marginTop: 4,
  },
  itemBuyBtnOff: { borderColor: C.borderDefault },
  itemBuyText:   { fontSize: 13, fontWeight: '700' },

  // ── Premium artifact card (full width) ───────────────────
  artifactCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: C.borderDefault, padding: 16, gap: 12,
  },
  artifactCardOwned:  { borderColor: '#4ade8040', backgroundColor: '#4ade8008' },
  artifactCardRow:    { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  artifactIconBox:    { width: 52, height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  artifactIcon:       { fontSize: 26 },
  artifactInfo:       { flex: 1, gap: 5 },
  artifactTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  artifactName:       { fontSize: 16, color: C.textPrimary,   fontWeight: '700' },
  rarityBadge:        { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  rarityBadgeText:    { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  artifactDesc:       { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  artifactOwned:      { backgroundColor: '#4ade8015', borderRadius: Radius.sm, paddingVertical: 8, alignItems: 'center' },
  artifactOwnedText:  { fontSize: 13, color: '#4ade80', fontWeight: '600' },
  artifactBuyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10,
  },
  artifactBuyBtnOff: { borderColor: C.borderDefault, backgroundColor: 'transparent' },
  artifactBuyIcon:   { fontSize: 16 },
  artifactBuyText:   { fontSize: 14, fontWeight: '700' },

  // ── Free box ──────────────────────────────────────────────
  freeBox: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 16, gap: 10, borderWidth: 1, borderColor: C.borderDefault,
  },
  freeBoxTitle: { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  freeRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  freeIcon:     { fontSize: 18, width: 24 },
  freeText:     { fontSize: 13, color: C.textSecondary },

  // ── Coin packs ────────────────────────────────────────────
  packSectionLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600', marginTop: 4 },
  packsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  packCard: {
    width: (SW - 44) / 2,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.borderDefault, overflow: 'hidden',
  },
  packCardPopular: { borderColor: C.borderGold },
  packBadge:       { backgroundColor: C.gold, paddingVertical: 3, alignItems: 'center' },
  packBadgeText:   { fontSize: 9, color: C.ink, fontWeight: '800', letterSpacing: 0.5 },
  packInner:       { padding: 16, alignItems: 'center', gap: 4 },
  packIcon:        { fontSize: 32 },
  packCoins:       { fontSize: 28, color: C.gold, fontWeight: '800' },
  packLabel2:      { fontSize: 11, color: C.textMuted },
  packBonus:       { backgroundColor: C.goldLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  packBonusText:   { fontSize: 11, color: C.gold, fontWeight: '600' },
  packPrice:       { fontSize: 16, color: C.textPrimary, fontWeight: '700', marginTop: 4 },

  // ── Policy ────────────────────────────────────────────────
  policyBox:  { backgroundColor: C.backgroundCard, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: C.borderDefault },
  policyText: { fontSize: 12, color: C.textMuted, lineHeight: 18 },

  // ── Modal ─────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: C.backgroundElevated, borderRadius: 20,
    padding: 24, gap: 14, width: '100%',
    borderWidth: 1, borderColor: C.borderGold,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 15,
  },
  modalIconBox:        { width: 72, height: 72, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, alignSelf: 'center' },
  modalIcon:           { fontSize: 36 },
  modalTitle:          { fontSize: 20, color: C.textPrimary,   fontWeight: '700', textAlign: 'center' },
  modalDesc:           { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalDetails:        { backgroundColor: C.backgroundCard, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.borderDefault },
  modalDetailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: C.borderDefault },
  modalDetailRowLast:  { borderBottomWidth: 0 },
  modalDetailLabel:    { fontSize: 13, color: C.textMuted },
  modalDetailValue:    { fontSize: 14, color: C.textPrimary },
  modalBalance:        { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  modalBtns:           { flexDirection: 'row', gap: 10 },
  modalBtnCancel:      { flex: 1, borderWidth: 1, borderColor: C.borderDefault, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
  modalBtnCancelText:  { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  modalBtnConfirm:     { flex: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
  modalBtnConfirmText: { fontSize: 14, color: C.ink, fontWeight: '800' },

  // ── Gold burst ────────────────────────────────────────────
  burstParticle: { position: 'absolute' },
});

// ── Bundle (Pakiet Pełny) styles ──────────────────────────
const bundleStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(201,168,76,0.07)',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: `${C.gold}55`,
    padding: 16,
    gap: 10,
  },
  cardOwned: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
    padding: 14,
  },
  ownedIcon:  { fontSize: 24 },
  ownedTitle: { fontSize: 15, color: '#4ade80', fontWeight: '700' },
  ownedSub:   { fontSize: 12, color: C.textMuted, marginTop: 2 },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: `${C.gold}30`,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: `${C.gold}50`,
  },
  badgeText: { fontSize: 10, color: C.gold, fontWeight: '800', letterSpacing: 1 },

  row:      { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconsRow: { flexDirection: 'row', flexWrap: 'wrap', width: 72, gap: 4 },
  title:    { fontSize: 16, color: C.textPrimary, fontWeight: '700' },
  sub:      { fontSize: 12, color: C.textMuted, lineHeight: 17, marginTop: 2 },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: `${C.gold}25`, paddingTop: 10, marginTop: 2,
  },
  originalPrice: { fontSize: 11, color: C.textMuted, textDecorationLine: 'line-through' },
  bundlePrice:   { fontSize: 20, color: C.gold, fontWeight: '800' },

  buyBtn: {
    backgroundColor: C.gold,
    borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  buyBtnDisabled: { backgroundColor: C.backgroundElevated },
  buyBtnText:     { fontSize: 14, color: '#000', fontWeight: '800' },
});
