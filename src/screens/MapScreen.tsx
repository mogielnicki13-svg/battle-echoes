// ============================================================
// BATTLE ECHOES — MapScreen.tsx v3
// Era bar na górze (kompaktowa), clustering znaczników
// ============================================================
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ScrollView, Platform, Modal, Alert, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../constants/theme';
import { useAppStore, Battle, Campaign } from '../store';
import gpsService, {
  BATTLE_SITES, ProximityResult, Coords, formatDistance,
} from '../services/GPSService';
import { ALL_ARTIFACTS } from '../artifacts/data';
import BATTLE_LOCAL_IMAGES from '../services/BattleLocalImages';
import { FloatingReward, RewardToast } from '../components/XPSystem';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import GoldIcon, { ERA_ICON_DEFS, DucatIcon } from '../components/GoldIcon';
import CampaignBanner from '../components/CampaignBanner';
import MapFallbackWeb from '../components/MapFallbackWeb';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');
const PANEL_HEIGHT = 220;
const RADAR_SIZE   = SW - 48;

const ERAS = [
  { id: null,           label: 'Wszystkie',        eraKey: 'all',          color: Colors.gold },
  { id: 'ancient',      label: 'Starożytność',     eraKey: 'ancient',      color: '#c084fc' },
  { id: 'medieval',     label: 'Średniowiecze',    eraKey: 'medieval',     color: '#D4A017' },
  { id: 'early_modern', label: 'Nowożytność',      eraKey: 'early_modern', color: '#60a5fa' },
  { id: 'napoleon',     label: 'Napoleon',         eraKey: 'napoleon',     color: '#4ade80' },
  { id: 'ww1',          label: 'I Wojna Świat.',   eraKey: 'ww1',          color: '#94a3b8' },
  { id: 'ww2',          label: 'II Wojna Świat.',  eraKey: 'ww2',          color: '#f87171' },
] as const;

const ERA_COLORS: Record<string, string> = {
  ancient: '#c084fc', medieval: '#D4A017', early_modern: '#60a5fa',
  napoleon: '#4ade80', ww1: '#94a3b8', ww2: '#f87171',
};

type MapMode = 'map' | 'radar';

const BATTLE_UNLOCK_PRICE = 100; // Dukaty — jednolita cena dla wszystkich bitew

// ── Clustering ───────────────────────────────────────────
type Cluster = { id: string; lat: number; lng: number; battles: Battle[] };

function clusterBattles(battles: Battle[], latDelta: number): Cluster[] {
  if (!battles.length || !latDelta || !isFinite(latDelta)) return [];
  const threshold = latDelta * 0.12;
  const used      = new Set<string>();
  const clusters: Cluster[] = [];
  for (const b of battles) {
    if (used.has(b.id)) continue;
    used.add(b.id);
    const group: Battle[] = [b];
    for (const other of battles) {
      if (used.has(other.id)) continue;
      if (
        Math.abs(other.location.lat - b.location.lat) < threshold &&
        Math.abs(other.location.lng - b.location.lng) < threshold * 1.5
      ) { group.push(other); used.add(other.id); }
    }
    clusters.push({
      id:  `c_${b.id}`,
      lat: group.reduce((s, x) => s + x.location.lat, 0) / group.length,
      lng: group.reduce((s, x) => s + x.location.lng, 0) / group.length,
      battles: group,
    });
  }
  return clusters;
}

function getRadarPosition(result: ProximityResult, userCoords: Coords | null) {
  if (!userCoords) return { x: RADAR_SIZE / 2, y: RADAR_SIZE / 2 };
  const maxDistM = 50000;
  const dist  = Math.min(result.distanceM, maxDistM);
  const ratio = dist / maxDistM;
  const angle = Math.atan2(
    result.site.coords.longitude - userCoords.longitude,
    result.site.coords.latitude  - userCoords.latitude,
  );
  const r = ratio * (RADAR_SIZE / 2 - 20);
  return { x: RADAR_SIZE / 2 + Math.sin(angle) * r, y: RADAR_SIZE / 2 - Math.cos(angle) * r };
}

// ── CrossedSwords — czyste View, zero fontów / ikon ────────
// Zawsze renderuje się poprawnie w react-native-maps Marker.
function CrossedSwords({ color = '#C9A84C', size = 18 }: { color?: string; size?: number }) {
  const barW = Math.max(2, Math.round(size * 0.13));
  const barH = Math.round(size * 0.78);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: barW, height: barH,
        backgroundColor: color, borderRadius: barW,
        transform: [{ rotate: '45deg' }],
      }} />
      <View style={{
        position: 'absolute', width: barW, height: barH,
        backgroundColor: color, borderRadius: barW,
        transform: [{ rotate: '-45deg' }],
      }} />
      {/* poprzeczna gardaRękojeści — krótka belka w środku */}
      <View style={{
        position: 'absolute', width: size * 0.55, height: barW,
        backgroundColor: color, borderRadius: barW,
      }} />
    </View>
  );
}

// ── Marker pojedynczej bitwy ──────────────────────────────
// Architektura dwu-warstwowa:
//   markerWrap (46×46, overflow:visible domyślnie)
//     └─ square (40×40, overflow:hidden) ← przycina obraz DO borderRadius
//         └─ Image / CrossedSwords / overlay
//     └─ campaignDot (absolute w wrap, może wystawać poza square)
//
// Dlaczego tak: overflow:hidden + borderRadius w Marker na Androidzie
// musi być na tym samym View co obraz. Zewnętrzny wrap (overflow:visible)
// pozwala badge wystawać poza narożnik kwadratu.
const SingleMarker = React.memo(function SingleMarker({ battle, unlocked, hasCampaign, eraColor, onPress }: {
  battle: Battle; unlocked: boolean; hasCampaign: boolean;
  eraColor: string; onPress: () => void;
}) {
  const img = BATTLE_LOCAL_IMAGES[battle.id];

  // Android react-native-maps: onLoad odpala się przez JS bridge — natywny
  // Choreographer (snapshot) może przebiec ZANIM JS przetworzy zdarzenie.
  // Rozwiązanie: onLoad + setTimeout(50ms) = bufor 3 klatek (przy 60fps)
  // → gwarantuje że snapshot trafia PO wyrenderowaniu pikseli obrazu.
  // Markery bez obrazu (CrossedSwords = pure Views): false od razu.
  const [imgLoaded, setImgLoaded] = useState(false);
  const tracksView = img != null && !imgLoaded;

  const handleImgLoad = useCallback(() => {
    // Short delay to avoid Android Choreographer frame drop during marker render
    const MARKER_IMG_SETTLE_MS = 50;
    setTimeout(() => setImgLoaded(true), MARKER_IMG_SETTLE_MS);
  }, []);

  const borderColor = unlocked ? eraColor : `${eraColor}66`;
  const iconColor   = unlocked ? '#C9A84C' : '#666';

  return (
    <Marker
      coordinate={{ latitude: battle.location.lat, longitude: battle.location.lng }}
      onPress={onPress}
      tracksViewChanges={tracksView}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={mkStyles.markerWrap}>
        <View style={[mkStyles.square, { borderColor }, !unlocked && mkStyles.squareLocked]}>
          {img ? (
            <>
              <Image
                source={img}
                style={mkStyles.markerImg}
                resizeMode="cover"
                onLoad={handleImgLoad}
              />
              {!unlocked && <View style={mkStyles.imgLockDim} />}
              {!unlocked && (
                <View style={mkStyles.lockIconCenter}>
                  <CrossedSwords color="rgba(255,255,255,0.65)" size={18} />
                </View>
              )}
            </>
          ) : (
            <CrossedSwords color={iconColor} size={20} />
          )}
        </View>
        {hasCampaign && !unlocked && <View style={mkStyles.campaignDot} />}
      </View>
    </Marker>
  );
});

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function MapScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { battles, canAccessBattle, getCampaignForBattle, purchaseCampaign, user, markBattleVisited, unlockArtifact, unlockBattle, awardCoins } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('Map'); }, []));

  // focusVersion: rośnie za każdym powrotem na ekran mapy.
  // Używany w key markerów → wymusza remount → świeże snapshoty bitmapek.
  // Naprawia znikające markery po powrocie z BattleDetailScreen / innych ekranów.
  const [focusVersion, setFocusVersion] = useState(0);
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    setFocusVersion(v => v + 1);
  }, []));
  const insets = useSafeAreaInsets();

  const [mode,         setMode]         = useState<MapMode>('map');
  const [lockedBattle, setLockedBattle] = useState<Battle | null>(null);
  const [activeEra,    setActiveEra]    = useState<string | null>(null);
  const [mapRegion,  setMapRegion]  = useState<Region>({
    latitude: 50.0, longitude: 15.0, latitudeDelta: 25, longitudeDelta: 25,
  });

  const [permission,   setPermission]   = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [userCoords,   setUserCoords]   = useState<Coords | null>(null);
  const [proximity,    setProximity]    = useState<ProximityResult[]>([]);
  const [isWatching,   setIsWatching]   = useState(false);
  const [visitModal,   setVisitModal]   = useState<ProximityResult | null>(null);
  const [floaters,     setFloaters]     = useState<{ id: string; value: string; color: string }[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData,    setToastData]    = useState({ icon: '📍', title: '', subtitle: '', color: '#4ade80' });

  const mapRef        = useRef<MapView>(null);
  const panelAnim     = useRef(new Animated.Value(0)).current;
  const panelOpenedAt = useRef<number>(0); // guard against Android MapView onPress delay
  const radarPulse1 = useRef(new Animated.Value(0)).current;
  const radarPulse2 = useRef(new Animated.Value(0)).current;
  const radarPulse3 = useRef(new Animated.Value(0)).current;
  const radarSweep  = useRef(new Animated.Value(0)).current;
  const dotScale    = useRef(new Animated.Value(1)).current;

  const handleModeSwitch = (newMode: MapMode) => {
    setMode(newMode);
    if (newMode === 'radar' && permission === 'unknown') startGPS();
  };

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])).start();
    pulse(radarPulse1, 0); pulse(radarPulse2, 700); pulse(radarPulse3, 1400);
    Animated.loop(Animated.timing(radarSweep, { toValue: 1, duration: 3000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.spring(dotScale, { toValue: 1.4, useNativeDriver: true, tension: 60 }),
      Animated.spring(dotScale, { toValue: 1.0, useNativeDriver: true, tension: 60 }),
    ])).start();
  }, []);

  const startGPS = useCallback(async () => {
    const ok = await gpsService.requestPermission();
    if (!ok) { setPermission('denied'); return; }
    setPermission('granted');
    const coords = await gpsService.getCurrentLocation();
    if (coords) { setUserCoords(coords); setProximity(gpsService.checkProximity(coords)); }
    await gpsService.startWatching((c, p) => { setUserCoords(c); setProximity(p); });
    setIsWatching(true);
  }, []);
  useEffect(() => () => gpsService.stopWatching(), []);

  const simulateNearby = (siteIdx: number) => {
    const coords = gpsService.simulateLocation(siteIdx);
    setUserCoords(coords); setProximity(gpsService.checkProximity(coords));
    setPermission('granted'); setIsWatching(true);
  };

  const handleVisit = (result: ProximityResult) => {
    const { site } = result;
    if (user?.visitedBattles.includes(site.battleId)) {
      Alert.alert(`✅ ${t('map.already_visited_title')}`, t('map.already_visited_msg')); return;
    }
    markBattleVisited(site.battleId, site.xpReward, site.coinReward);
    if (site.artifactId) unlockArtifact(site.artifactId);
    const rid = Math.random().toString(36).substring(2, 8);
    setFloaters(prev => [...prev,
      { id: `${rid}_xp`,    value: `+${site.xpReward} XP`,  color: '#fbbf24' },
      { id: `${rid}_coins`, value: `+${site.coinReward} 🪙`, color: Colors.gold },
    ]);
    const artifactSuffix = site.artifactId ? ` · ${t('map.legendary_artifact')}!` : '';
    setToastData({ icon: '📍', title: t('map.unlocked_toast', { name: site.name }),
      subtitle: `+${site.xpReward} XP · +${site.coinReward} 🪙${artifactSuffix}`, color: '#4ade80' });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
    setVisitModal(null);
    const alertBody = site.artifactId
      ? t('map.congrats_msg_artifact', { name: site.name, xp: site.xpReward, coins: site.coinReward })
      : t('map.congrats_msg', { name: site.name, xp: site.xpReward, coins: site.coinReward });
    const alertButtons = site.artifactId
      ? [{ text: t('map.see_artifact'), onPress: () => navigation.navigate('Artifacts') }, { text: t('common.ok') }]
      : [{ text: t('common.ok') }];
    Alert.alert(`🏆 ${t('map.congrats_title')}`, alertBody, alertButtons);
  };

  const selectBattle = (battle: Battle) => {
    if (canAccessBattle(battle.id)) {
      // Odblokowana — przejdź bezpośrednio
      navigation.navigate('BattleDetail', { battleId: battle.id });
    } else {
      // Zablokowana — pokaż panel z ceną
      panelOpenedAt.current = Date.now(); // zapisz czas otwarcia
      setLockedBattle(battle);
      mapRef.current?.animateToRegion({
        latitude: battle.location.lat - 0.8, longitude: battle.location.lng,
        latitudeDelta: 3, longitudeDelta: 3,
      }, 600);
      Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 12 }).start();
    }
  };

  const closePanel = () => {
    Animated.timing(panelAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      .start(() => setLockedBattle(null));
  };

  // Android: MapView onPress odpala się z opóźnieniem po tapnięciu Markera
  const handleMapPress = () => {
    if (Date.now() - panelOpenedAt.current < 2500) return; // ignoruj przez 2.5s po otwarciu
    closePanel();
  };

  const handleUnlock = () => {
    if (!lockedBattle || !user) return;
    if (user.coins < BATTLE_UNLOCK_PRICE) {
      Alert.alert(t('map.no_coins_title'), t('map.no_coins_msg', { price: BATTLE_UNLOCK_PRICE, balance: user.coins }),
        [{ text: t('map.go_to_shop'), onPress: () => { closePanel(); navigation.navigate('Shop'); } }, { text: t('common.ok') }]
      );
      return;
    }
    const battle = lockedBattle;
    unlockBattle(battle.id);
    awardCoins(-BATTLE_UNLOCK_PRICE, 'Odblokowanie bitwy');
    closePanel();
    setTimeout(() => navigation.navigate('BattleDetail', { battleId: battle.id }), 300);
  };

  const eraBarItems     = useMemo(() => ERAS.filter(e => e.id === null || battles.some(b => b.era === e.id)).map(era => ({
    ...era,
    count: era.id ? battles.filter(b => b.era === era.id).length : battles.length,
  })), [battles]);
  const filtered        = useMemo(() => activeEra ? battles.filter(b => b.era === activeEra) : battles, [activeEra, battles]);
  const clusters        = useMemo(() => clusterBattles(filtered, mapRegion.latitudeDelta), [filtered, mapRegion.latitudeDelta]);
  const panelTranslateY = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [PANEL_HEIGHT + 80, 0] });
  const sweepRotate     = radarSweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const isGranted       = permission === 'granted';
  const eraBarHeight    = insets.top + 52; // status bar + chip row

  // Web fallback — react-native-maps nie działa w przeglądarce
  if (Platform.OS === 'web') {
    return (
      <MapFallbackWeb
        battles={filtered}
        onBattlePress={(battleId) => navigation.navigate('BattleDetail', { battleId })}
      />
    );
  }

  return (
    <View style={styles.container}>
      {floaters.map(f => (
        <FloatingReward key={f.id} value={f.value} color={f.color} y={300}
          onDone={() => setFloaters(prev => prev.filter(x => x.id !== f.id))} />
      ))}
      <RewardToast visible={toastVisible} icon={toastData.icon}
        title={toastData.title} subtitle={toastData.subtitle} color={toastData.color} />
      <VisitModal
        result={visitModal}
        visited={visitModal ? (user?.visitedBattles.includes(visitModal.site.battleId) || false) : false}
        onVisit={handleVisit}
        onClose={() => setVisitModal(null)}
      />

      {/* ════ WIDOK MAPY ════════════════════════════════ */}
      {mode === 'map' && (
        <>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            initialRegion={{ latitude: 50.0, longitude: 15.0, latitudeDelta: 25, longitudeDelta: 25 }}
            customMapStyle={getMapStyle(activeEra)}
            onPress={handleMapPress}
            onRegionChangeComplete={setMapRegion}
            showsUserLocation showsCompass={false} showsScale={false} toolbarEnabled={false}
          >
            {clusters.map(cluster => {
              if (cluster.battles.length === 1) {
                const battle      = cluster.battles[0];
                const unlocked    = canAccessBattle(battle.id);
                const hasCampaign = !!getCampaignForBattle(battle.id);
                return (
                  <SingleMarker
                    key={`${cluster.id}-${unlocked ? 'u' : 'l'}-${focusVersion}`}
                    battle={battle}
                    unlocked={unlocked}
                    hasCampaign={hasCampaign}
                    eraColor={ERA_COLORS[battle.era] || Colors.gold}
                    onPress={() => selectBattle(battle)}
                  />
                );
              }
              // Cluster marker — tap to zoom in
              // Mieszane epoki → czerwony; jedna epoka → kolor epoki
              const eras        = [...new Set(cluster.battles.map(b => b.era))];
              const clusterColor = eras.length === 1
                ? (ERA_COLORS[eras[0]] || Colors.gold)
                : '#ef4444'; // czerwony = wiele epok
              return (
                <Marker key={cluster.id}
                  coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
                  tracksViewChanges={false}
                  anchor={{ x: 0.5, y: 0.5 }}
                  onPress={() => mapRef.current?.animateToRegion({
                    latitude: cluster.lat, longitude: cluster.lng,
                    latitudeDelta: mapRegion.latitudeDelta / 3,
                    longitudeDelta: mapRegion.longitudeDelta / 3,
                  }, 600)}>
                  <View style={[mkStyles.clusterSquare, { borderColor: clusterColor }]}>
                    <CrossedSwords color={clusterColor} size={14} />
                    <Text style={[mkStyles.clusterCount, { color: clusterColor }]}>
                      {cluster.battles.length}
                    </Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <TouchableOpacity style={[styles.locateBtn, { bottom: 80 + insets.bottom }]}
            onPress={() => mapRef.current?.animateToRegion(
              { latitude: 50.0, longitude: 15.0, latitudeDelta: 25, longitudeDelta: 25 }, 800
            )}>
            <Text style={styles.locateBtnText}>🌍</Text>
          </TouchableOpacity>

          {lockedBattle && (
            <Animated.View style={[styles.panel, { bottom: 60 + insets.bottom, transform: [{ translateY: panelTranslateY }] }]}>
              <LockedBattleSheet
                battle={lockedBattle}
                userCoins={user?.coins ?? 0}
                price={BATTLE_UNLOCK_PRICE}
                campaign={getCampaignForBattle(lockedBattle.id)}
                onClose={closePanel}
                onUnlock={handleUnlock}
                onBuyCampaign={() => {
                  const c = getCampaignForBattle(lockedBattle.id);
                  if (c) purchaseCampaign(c.id);
                }}
              />
            </Animated.View>
          )}
        </>
      )}

      {/* ════ WIDOK RADARU ══════════════════════════════ */}
      {mode === 'radar' && (
        <ScrollView
          contentContainerStyle={[styles.radarScroll, { paddingTop: eraBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.radarWrap}>
            <View style={[styles.radar, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
              {[0.25, 0.5, 0.75, 1].map(r => (
                <View key={r} style={[styles.radarRing, {
                  width: RADAR_SIZE * r, height: RADAR_SIZE * r, borderRadius: RADAR_SIZE * r / 2,
                  top: RADAR_SIZE * (1 - r) / 2, left: RADAR_SIZE * (1 - r) / 2,
                }]} />
              ))}
              <View style={styles.radarLineH} />
              <View style={styles.radarLineV} />
              <Animated.View style={[styles.radarSweep, {
                width: RADAR_SIZE, height: RADAR_SIZE,
                transform: [{ rotate: sweepRotate }],
              }]} />
              {[radarPulse1, radarPulse2, radarPulse3].map((anim, i) => (
                <Animated.View key={i} style={[styles.radarPulse, {
                  width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2,
                  opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) }],
                }]} />
              ))}
              {isGranted && proximity.map(result => {
                const pos     = getRadarPosition(result, userCoords);
                const visited = user?.visitedBattles.includes(result.site.battleId);
                const col     = result.isInside ? '#4ade80' : visited ? Colors.gold : '#60a5fa';
                return (
                  <TouchableOpacity key={result.site.battleId}
                    style={[styles.radarPin, { left: pos.x - 16, top: pos.y - 16, backgroundColor: `${col}CC`, borderColor: col }]}
                    onPress={() => setVisitModal(result)}>
                    <Text style={styles.radarPinText}>⚔</Text>
                  </TouchableOpacity>
                );
              })}
              <Animated.View style={[styles.radarCenter, { transform: [{ scale: dotScale }] }]}>
                <Text style={{ fontSize: 24 }}>📍</Text>
              </Animated.View>
              <Text style={[styles.radarLabel, { top: 8, left: RADAR_SIZE / 2 - 12 }]}>50km</Text>
              <Text style={[styles.radarLabel, { top: RADAR_SIZE * 0.13, left: RADAR_SIZE / 2 - 12 }]}>25km</Text>
            </View>
            <View style={[styles.radarStatus, {
              backgroundColor: isWatching ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
              borderColor:     isWatching ? 'rgba(74,222,128,0.4)'  : Colors.borderDefault,
            }]}>
              <View style={[styles.statusDot, { backgroundColor: isWatching ? '#4ade80' : Colors.textMuted }]} />
              <Text style={[styles.statusText, { color: isWatching ? '#4ade80' : Colors.textMuted }]}>
                {isWatching ? t('map.gps_active') : t('map.gps_inactive')}
              </Text>
            </View>
          </View>

          {!isGranted ? (
            <View style={styles.permCard}>
              <Text style={styles.permIcon}>🗺</Text>
              <Text style={styles.permTitle}>{t('map.enable_location')}</Text>
              <Text style={styles.permDesc}>{t('map.radar_desc')}</Text>
              <TouchableOpacity style={styles.permBtn} onPress={startGPS}>
                <Text style={styles.permBtnText}>{t('map.enable_gps')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.demoCard}>
              <Text style={styles.demoTitle}>📡 {t('map.demo_title')}</Text>
              <View style={styles.demoButtons}>
                {BATTLE_SITES.map((site, i) => (
                  <TouchableOpacity key={site.battleId} style={styles.demoBtn} onPress={() => simulateNearby(i)}>
                    <Text style={styles.demoBtnText}>⚔ {site.name.split(' ').slice(-1)[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {proximity.length > 0 && (
            <View style={styles.proxList}>
              <Text style={styles.sectionLabel}>{t('map.nearby_battles')}</Text>
              {proximity.map(result => {
                const visited = user?.visitedBattles.includes(result.site.battleId) || false;
                const col     = result.isInside ? '#4ade80' : visited ? Colors.gold : '#60a5fa';
                return (
                  <TouchableOpacity key={result.site.battleId}
                    style={[styles.proxCard, { borderColor: `${col}40` }]}
                    onPress={() => setVisitModal(result)} activeOpacity={0.8}>
                    <View style={[styles.proxIcon, { backgroundColor: `${col}20` }]}>
                      <Text style={{ fontSize: 22 }}>{result.isInside ? '✅' : visited ? '🏆' : '⚔'}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.proxName}>{result.site.name}</Text>
                      <Text style={[styles.proxDist, { color: col }]}>
                        {result.isInside ? `🟢 ${t('map.in_zone')}` : formatDistance(result.distanceM)}
                        {visited ? ` · ${t('map.visited')} ✅` : ''}
                      </Text>
                      <Text style={styles.proxReward}>
                        +{result.site.xpReward} XP · +{result.site.coinReward} 🪙 · {t('map.legendary_artifact')}
                      </Text>
                    </View>
                    {result.isInside && !visited && (
                      <View style={styles.proxUnlockBtn}>
                        <Text style={styles.proxUnlockText}>{t('map.unlock')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* ════ PRZYCISKI prawy górny róg ═════════════════ */}
      <View style={[styles.topRightBtns, { top: eraBarHeight + 10 }]}>
        <TouchableOpacity
          style={[styles.radarToggleBtn, mode === 'radar' && styles.radarToggleBtnActive]}
          onPress={() => handleModeSwitch(mode === 'map' ? 'radar' : 'map')}
        >
          <Text style={styles.radarToggleIcon}>{mode === 'radar' ? '🗺' : '📍'}</Text>
          {isWatching && mode === 'map' && <View style={styles.radarActiveDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.gpsScreenBtn} onPress={() => navigation.navigate('GPS')}>
          <Text style={styles.gpsScreenBtnText}>🛰</Text>
        </TouchableOpacity>
      </View>

      {/* ════ ERA BAR — kompaktowy pasek filtrów na górze ════ */}
      <View style={[styles.eraBar, { paddingTop: insets.top + 8 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eraBarContent}>
          {eraBarItems.map(era => {
            const isActive = activeEra === era.id;
            const count    = era.count;
            const iconDef  = ERA_ICON_DEFS[era.eraKey];
            return (
              <TouchableOpacity
                key={String(era.id)}
                style={[styles.eraChip, isActive && { backgroundColor: `${era.color}25`, borderColor: era.color }]}
                onPress={() => { setActiveEra(era.id as string | null); closePanel(); }}
                activeOpacity={0.8}
              >
                <GoldIcon
                  name={iconDef.name}
                  lib={iconDef.lib}
                  size={13}
                  color={isActive ? era.color : '#7a6235'}
                />
                <Text style={[styles.eraChipLabel, isActive && { color: era.color }]}>{t(`era_names.${era.eraKey}`)}</Text>
                <View style={[styles.eraChipBadge, isActive && { backgroundColor: era.color }]}>
                  <Text style={[styles.eraChipBadgeText, isActive && { color: '#000' }]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// PANEL ZABLOKOWANEJ BITWY
// ════════════════════════════════════════════════════════════
function LockedBattleSheet({ battle, userCoins, price, campaign, onClose, onUnlock, onBuyCampaign }: {
  battle: Battle; userCoins: number; price: number;
  campaign?: Campaign;
  onClose: () => void; onUnlock: () => void; onBuyCampaign?: () => void;
}) {
  const { t } = useTranslation();
  const color     = ERA_COLORS[battle.era] || Colors.gold;
  const iconDef   = ERA_ICON_DEFS[battle.era] ?? ERA_ICON_DEFS.medieval;
  const eraLabel  = t(`era_names.${battle.era}`) || battle.era;
  const canAfford = userCoins >= price;
  return (
    <View style={styles.panelInner}>
      <View style={styles.panelTop}>
        <View style={styles.panelHandle} />
        <TouchableOpacity onPress={onClose} style={styles.panelClose}>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Nagłówek bitwy */}
      <View style={styles.panelContent}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.eraTag, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
            <GoldIcon name={iconDef.name} lib={iconDef.lib} size={12} color={color} />
            <Text style={[styles.eraTagText, { color }]}> {eraLabel}</Text>
          </View>
          <Text style={styles.panelName}>{battle.name}</Text>
          <Text style={styles.panelDate}>{battle.date}</Text>
          <Text style={styles.panelLoc}>📍 {battle.location.name}</Text>
        </View>
        <View style={styles.lockIconWrap}>
          <GoldIcon name="lock" size={32} color="#888" />
        </View>
      </View>

      {/* Cena + saldo */}
      <View style={styles.priceRow}>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>{t('map.unlock_cost')}</Text>
          <Text style={styles.priceValue}>{price} 🪙</Text>
        </View>
        <View style={[styles.balanceBox, !canAfford && styles.balanceBoxLow]}>
          <Text style={styles.balanceLabel}>{t('map.your_coins')}</Text>
          <Text style={[styles.balanceValue, !canAfford && { color: '#f87171' }]}>{userCoins} 🪙</Text>
        </View>
      </View>

      {/* Kampania banner (kompakt) — jeśli bitwa należy do pakietu */}
      {campaign && onBuyCampaign && (
        <CampaignBanner
          campaign={campaign}
          userCoins={userCoins}
          battleName={battle.name}
          onPurchase={() => { onBuyCampaign(); onClose(); }}
          compact
        />
      )}

      {/* Przycisk — kup tylko tę bitwę */}
      {canAfford ? (
        <TouchableOpacity style={styles.unlockBtn} onPress={onUnlock} activeOpacity={0.85}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <GoldIcon name="lock-open-variant" size={18} color="#000" />
            <Text style={styles.unlockBtnText}>
              {campaign ? t('map.only_this_battle', { price }) : t('map.unlock_for', { price })}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.noFundsBox}>
          <Text style={styles.noFundsText}>
            {t('map.no_funds', { amount: price - userCoins })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL WIZYTY GPS
// ════════════════════════════════════════════════════════════
function VisitModal({ result, visited, onVisit, onClose }: {
  result: ProximityResult | null; visited: boolean;
  onVisit: (r: ProximityResult) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    if (result) Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }).start();
    else slideAnim.setValue(600);
  }, [result]);
  if (!result) return null;
  const { site, distanceM, isInside } = result;
  const artifact = site.artifactId ? ALL_ARTIFACTS.find(a => a.id === site.artifactId) : null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={1}>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <Text style={{ fontSize: 14, color: Colors.textMuted }}>✕</Text>
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 40 }}>⚔</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalName}>{site.name}</Text>
                <Text style={[styles.modalDist, { color: isInside ? '#4ade80' : '#60a5fa' }]}>
                  {isInside ? `🟢 ${t('map.in_zone_full')}` : `📍 ${formatDistance(distanceM)}`}
                </Text>
              </View>
            </View>
            <View style={styles.modalRewards}>
              <Text style={styles.modalRewardsLabel}>{t('map.visit_rewards')}</Text>
              <View style={styles.modalRewardItem}><Text style={{ fontSize: 20 }}>⭐</Text><Text style={styles.modalRewardText}>+{site.xpReward} XP</Text></View>
              <View style={styles.modalRewardItem}><DucatIcon size={20} /><Text style={styles.modalRewardText}>+{site.coinReward} {t('gps.coins_label')}</Text></View>
              {artifact && (
                <View style={[styles.modalRewardItem, styles.modalRewardLegendary]}>
                  <Text style={{ fontSize: 24 }}>{artifact.icon}</Text>
                  <View><Text style={[styles.modalRewardText, { color: Colors.gold }]}>{artifact.name}</Text><Text style={{ fontSize: 11, color: Colors.textMuted }}>{t('map.legendary_artifact')}</Text></View>
                </View>
              )}
            </View>
            {visited ? (
              <View style={styles.modalDoneBtn}><Text style={styles.modalDoneBtnText}>✅ {t('map.already_visited_title')}</Text></View>
            ) : isInside ? (
              <TouchableOpacity style={styles.modalVisitBtn} onPress={() => onVisit(result)}>
                <Text style={styles.modalVisitBtnText}>🏆 {t('map.unlock_battlefield')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.modalTooFarBox}>
                <Text style={styles.modalTooFarText}>
                  {t('map.too_far', { radius: site.radiusM })}{'\n'}{t('map.remaining', { distance: formatDistance(Math.max(0, distanceM - site.radiusM)) })}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE MAP — dedykowane dla każdej epoki
// ════════════════════════════════════════════════════════════

// Domyślny — Wszystkie bitwy
// Głęboki teał (#0c1a1e) — unikalny kolor, żadna epoka go nie używa.
// Etykiety krajów: jasne (#dce8ec) dla maksymalnej czytelności.
// Granice administracyjne: wyraźne (#2a4a55) — widoczne na ciemnym tle.
const DARK_MAP_STYLE = [
  { elementType: 'geometry',                                    stylers: [{ color: '#0c1a1e' }] },
  { elementType: 'labels.text.fill',                            stylers: [{ color: '#90b8c4' }] },
  { elementType: 'labels.text.stroke',                          stylers: [{ color: '#0c1a1e' }] },
  { featureType: 'administrative',         elementType: 'geometry',         stylers: [{ color: '#2a4a55' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#dce8ec' }] },
  { featureType: 'administrative.province',elementType: 'labels.text.fill', stylers: [{ color: '#7aaab8' }] },
  { featureType: 'poi',                    elementType: 'labels',           stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park',               elementType: 'geometry',         stylers: [{ color: '#0f2428' }] },
  { featureType: 'road',                   elementType: 'geometry',         stylers: [{ color: '#172e36' }] },
  { featureType: 'road',                   elementType: 'labels',           stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway',           elementType: 'geometry',         stylers: [{ color: '#1c3d4a' }] },
  { featureType: 'transit',                elementType: 'labels',           stylers: [{ visibility: 'off' }] },
  { featureType: 'water',                  elementType: 'geometry',         stylers: [{ color: '#071418' }] },
  { featureType: 'water',                  elementType: 'labels.text.fill', stylers: [{ color: '#2a6070' }] },
];

// 🏛 Starożytność — ciemny kamień, złoto, głęboki błękit Morza Śródziemnego
const ANCIENT_MAP_STYLE = [
  { elementType: 'geometry',               stylers: [{ color: '#1a1208' }] },
  { elementType: 'labels.text.fill',       stylers: [{ color: '#9a7020' }] },
  { elementType: 'labels.text.stroke',     stylers: [{ color: '#1a1208' }] },
  { featureType: 'administrative',         elementType: 'geometry',         stylers: [{ color: '#261a06' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#c8960a' }] },
  { featureType: 'administrative',         elementType: 'geometry.stroke',  stylers: [{ color: '#5a3a08' }] },
  { featureType: 'poi.park',               elementType: 'geometry',         stylers: [{ color: '#1a1a06' }] },
  { featureType: 'road',                   elementType: 'geometry',         stylers: [{ color: '#261e0a' }] },
  { featureType: 'road.highway',           elementType: 'geometry',         stylers: [{ color: '#3a2a10' }] },
  { featureType: 'water',                  elementType: 'geometry',         stylers: [{ color: '#08122a' }] },
  { featureType: 'landscape.natural',      elementType: 'geometry',         stylers: [{ color: '#1e1a08' }] },
];

// ⚔ Średniowiecze — czerń pergaminu, atrament, mroczne lasy
const MEDIEVAL_MAP_STYLE = [
  { elementType: 'geometry',               stylers: [{ color: '#0c0a06' }] },
  { elementType: 'labels.text.fill',       stylers: [{ color: '#7a5a18' }] },
  { elementType: 'labels.text.stroke',     stylers: [{ color: '#0c0a06' }] },
  { featureType: 'administrative',         elementType: 'geometry',         stylers: [{ color: '#18140a' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#a07828' }] },
  { featureType: 'administrative',         elementType: 'geometry.stroke',  stylers: [{ color: '#4a3010' }] },
  { featureType: 'poi.park',               elementType: 'geometry',         stylers: [{ color: '#0a1006' }] },
  { featureType: 'road',                   elementType: 'geometry',         stylers: [{ color: '#18140a' }] },
  { featureType: 'road.highway',           elementType: 'geometry',         stylers: [{ color: '#241c0c' }] },
  { featureType: 'water',                  elementType: 'geometry',         stylers: [{ color: '#060c18' }] },
  { featureType: 'landscape.natural',      elementType: 'geometry',         stylers: [{ color: '#0c1006' }] },
];

// ⚓ Nowożytność — ciemna miedź, stary atlas, oceany eksploracji
const EARLY_MODERN_MAP_STYLE = [
  { elementType: 'geometry',               stylers: [{ color: '#12100a' }] },
  { elementType: 'labels.text.fill',       stylers: [{ color: '#8a5a22' }] },
  { elementType: 'labels.text.stroke',     stylers: [{ color: '#12100a' }] },
  { featureType: 'administrative',         elementType: 'geometry',         stylers: [{ color: '#1e1a0c' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#b8760b' }] },
  { featureType: 'administrative',         elementType: 'geometry.stroke',  stylers: [{ color: '#5a3a10' }] },
  { featureType: 'poi.park',               elementType: 'geometry',         stylers: [{ color: '#0e1408' }] },
  { featureType: 'road',                   elementType: 'geometry',         stylers: [{ color: '#1e1a10' }] },
  { featureType: 'road.highway',           elementType: 'geometry',         stylers: [{ color: '#2e2218' }] },
  { featureType: 'water',                  elementType: 'geometry',         stylers: [{ color: '#081018' }] },
  { featureType: 'landscape.natural',      elementType: 'geometry',         stylers: [{ color: '#14120a' }] },
];

// 🎖 Napoleon — pruski granat, mapa sztabowa, wojskowy błękit
const NAPOLEON_MAP_STYLE = [
  { elementType: 'geometry',               stylers: [{ color: '#070d1a' }] },
  { elementType: 'labels.text.fill',       stylers: [{ color: '#4a6890' }] },
  { elementType: 'labels.text.stroke',     stylers: [{ color: '#070d1a' }] },
  { featureType: 'administrative',         elementType: 'geometry',         stylers: [{ color: '#0c1628' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#6a8aba' }] },
  { featureType: 'administrative',         elementType: 'geometry.stroke',  stylers: [{ color: '#1a3060' }] },
  { featureType: 'poi.park',               elementType: 'geometry',         stylers: [{ color: '#08120e' }] },
  { featureType: 'road',                   elementType: 'geometry',         stylers: [{ color: '#0e1830' }] },
  { featureType: 'road.highway',           elementType: 'geometry',         stylers: [{ color: '#14203e' }] },
  { featureType: 'water',                  elementType: 'geometry',         stylers: [{ color: '#030918' }] },
  { featureType: 'landscape.natural',      elementType: 'geometry',         stylers: [{ color: '#080e18' }] },
];

// 🪖 I Wojna Światowa — szaro-błotny, okopy, wypalona ziemia
const WW1_MAP_STYLE = [
  { elementType: 'geometry',               stylers: [{ color: '#0e0c09' }] },
  { elementType: 'labels.text.fill',       stylers: [{ color: '#5a5645' }] },
  { elementType: 'labels.text.stroke',     stylers: [{ color: '#0e0c09' }] },
  { featureType: 'administrative',         elementType: 'geometry',         stylers: [{ color: '#1a1810' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#7a7860' }] },
  { featureType: 'administrative',         elementType: 'geometry.stroke',  stylers: [{ color: '#3a3828' }] },
  { featureType: 'poi.park',               elementType: 'geometry',         stylers: [{ color: '#0c0e08' }] },
  { featureType: 'road',                   elementType: 'geometry',         stylers: [{ color: '#1a180e' }] },
  { featureType: 'road.highway',           elementType: 'geometry',         stylers: [{ color: '#24221a' }] },
  { featureType: 'water',                  elementType: 'geometry',         stylers: [{ color: '#08090e' }] },
  { featureType: 'landscape.natural',      elementType: 'geometry',         stylers: [{ color: '#12100c' }] },
];

// ✈ II Wojna Światowa — ciemna zieleń militarna, mapa taktyczna
const WW2_MAP_STYLE = [
  { elementType: 'geometry',               stylers: [{ color: '#080d07' }] },
  { elementType: 'labels.text.fill',       stylers: [{ color: '#3a5535' }] },
  { elementType: 'labels.text.stroke',     stylers: [{ color: '#080d07' }] },
  { featureType: 'administrative',         elementType: 'geometry',         stylers: [{ color: '#0c1609' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#5a7848' }] },
  { featureType: 'administrative',         elementType: 'geometry.stroke',  stylers: [{ color: '#1e3018' }] },
  { featureType: 'poi.park',               elementType: 'geometry',         stylers: [{ color: '#091006' }] },
  { featureType: 'road',                   elementType: 'geometry',         stylers: [{ color: '#0e1809' }] },
  { featureType: 'road.highway',           elementType: 'geometry',         stylers: [{ color: '#142010' }] },
  { featureType: 'water',                  elementType: 'geometry',         stylers: [{ color: '#040a06' }] },
  { featureType: 'landscape.natural',      elementType: 'geometry',         stylers: [{ color: '#0a1208' }] },
];

function getMapStyle(era: string | null) {
  switch (era) {
    case 'ancient':      return ANCIENT_MAP_STYLE;
    case 'medieval':     return MEDIEVAL_MAP_STYLE;
    case 'early_modern': return EARLY_MODERN_MAP_STYLE;
    case 'napoleon':     return NAPOLEON_MAP_STYLE;
    case 'ww1':          return WW1_MAP_STYLE;
    case 'ww2':          return WW2_MAP_STYLE;
    default:             return DARK_MAP_STYLE;
  }
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const C = Colors;
// ── Style markerów (poza głównym StyleSheet — nie muszą być memoizowane) ──
const mkStyles = StyleSheet.create({
  // Zewnętrzna otoczka: trochę większa niż square, overflow:visible (domyślnie)
  // → pozwala campaignDot wystawać poza narożnik kwadratu
  // WAŻNE: elevation/shadow TUTAJ, nie na square (Android: elevation + overflow:hidden = konflikt!)
  markerWrap: {
    width: 46, height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 6,
  },
  // Wewnętrzny kwadrat: overflow:hidden przycina obraz DO borderRadius.
  // BEZ elevation — na Androidzie elevation wyłącza overflow:hidden!
  square: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: '#0D0D0D',
    borderWidth: 2,
    borderColor: Colors.gold, // placeholder — zawsze nadpisywany inline { borderColor }
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',       // ← działa tylko gdy BRAK elevation na tym View
  },
  squareLocked: {
    backgroundColor: '#080808',
  },
  // Badge kampanii: absolute w markerWrap (46×46), nie w square!
  // top:1, right:1 → ląduje tuż przy narożniku kwadratu (który jest wycentrowany w wrapperze)
  campaignDot: {
    position: 'absolute', top: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#C9A84C',
    borderWidth: 1.5, borderColor: '#0a0a0a',
  },
  // Obraz bitwy — JAWNY width/height zamiast absoluteFillObject.
  // absoluteFillObject (top/bottom/left/right:0) na Androidzie z overflow:hidden
  // nie wymusza rozmiaru → obraz renderuje się naturalnie (np. 800×500px)
  // i przez overflow:hidden widać tylko górny-lewy fragment.
  // Jawne width:40 height:40 = React Native wymusza skalowanie do kwadratu.
  // Border (2px) renderuje się na wierzchu obrazu — wygląda poprawnie.
  markerImg: {
    position: 'absolute',
    top: 0, left: 0,
    width: 40, height: 40,
  },
  // Przyciemnienie na locked + obraz — ten sam rozmiar co obraz
  imgLockDim: {
    position: 'absolute',
    top: 0, left: 0,
    width: 40, height: 40,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  // Ikona na środku gdy locked + obraz
  lockIconCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterSquare: {
    minWidth: 48, height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#0D0D0D',
    borderWidth: 2.5,
    borderColor: Colors.gold, // nadpisywane dynamicznie przez era color
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 6,
  },
  clusterCount: {
    color: '#C9A84C',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  // Markery → przeniesione do mkStyles (powyżej komponentu MapScreen)

  // Przyciski prawy górny
  topRightBtns: { position: 'absolute', right: 14, flexDirection: 'column', gap: 10 },
  radarToggleBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(10,16,28,0.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  radarToggleBtnActive: { borderColor: C.gold, backgroundColor: C.goldLight },
  radarToggleIcon:      { fontSize: 22 },
  radarActiveDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', borderWidth: 1, borderColor: C.background },
  gpsScreenBtn:     { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(10,16,28,0.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  gpsScreenBtnText: { fontSize: 22 },

  // Przycisk reset mapy
  locateBtn:     { position: 'absolute', right: 14, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(10,16,28,0.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  locateBtnText: { fontSize: 22 },

  // Panel bitwy
  panel:        { position: 'absolute', left: 0, right: 0, backgroundColor: C.backgroundElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: C.borderGold, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  panelInner:   { padding: 16, gap: 12 },
  panelTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  panelHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderDefault },
  panelClose:   { position: 'absolute', right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.backgroundCard, alignItems: 'center', justifyContent: 'center' },
  panelContent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  eraTag:       { alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  eraTagText:   { fontSize: 11, fontWeight: '600' },
  panelName:    { fontSize: 17, color: C.textPrimary, fontWeight: '700', lineHeight: 22 },
  panelDate:    { fontSize: 13, color: C.gold },
  panelLoc:     { fontSize: 12, color: C.textMuted },
  lockedTag:    { backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  lockedTagText:{ fontSize: 11, color: '#f87171' },
  panelRight:   { alignItems: 'center', justifyContent: 'center' },
  outcomeBar:   { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  outcomeText:  { fontSize: 13, color: C.textSecondary, fontStyle: 'italic' },

  // Locked battle sheet
  lockIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(248,113,113,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
  lockIcon:     { fontSize: 26 },
  priceRow:     { flexDirection: 'row', gap: 10 },
  priceBox:     { flex: 1, backgroundColor: C.goldLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.borderGold, alignItems: 'center', gap: 4 },
  priceLabel:   { fontSize: 9, color: C.textMuted, fontWeight: '700', letterSpacing: 1 },
  priceValue:   { fontSize: 20, color: C.gold, fontWeight: '800' },
  balanceBox:   { flex: 1, backgroundColor: C.backgroundCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.borderDefault, alignItems: 'center', gap: 4 },
  balanceBoxLow:{ borderColor: 'rgba(248,113,113,0.4)', backgroundColor: 'rgba(248,113,113,0.06)' },
  balanceLabel: { fontSize: 9, color: C.textMuted, fontWeight: '700', letterSpacing: 1 },
  balanceValue: { fontSize: 20, color: C.textPrimary, fontWeight: '800' },
  unlockBtn:    { backgroundColor: C.gold, borderRadius: Radius.md, padding: 14, alignItems: 'center' },
  unlockBtnText:{ fontSize: 15, color: C.ink, fontWeight: '800' },
  noFundsBox:   { backgroundColor: 'rgba(248,113,113,0.08)', borderRadius: Radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' },
  noFundsText:  { fontSize: 13, color: '#f87171', textAlign: 'center', lineHeight: 19 },

  // ── ERA BAR (góra, kompaktowy) ────────────────────────
  eraBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(8,8,8,0.90)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.2)',
    paddingBottom: 8,
  },
  eraBarContent:    { paddingHorizontal: 12, gap: 6 },
  eraChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  eraChipIcon:      { fontSize: 13 },
  eraChipLabel:     { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  eraChipBadge:     { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  eraChipBadgeText: { fontSize: 9, color: C.textPrimary, fontWeight: '700' },

  // Radar
  radarScroll: { padding: 16, gap: 14 },
  radarWrap:   { alignItems: 'center', gap: 10 },
  radar:       { position: 'relative', borderRadius: RADAR_SIZE / 2, backgroundColor: '#070E1A', borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)', overflow: 'hidden' },
  radarRing:   { position: 'absolute', borderWidth: 1, borderColor: 'rgba(96,165,250,0.15)' },
  radarLineH:  { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(96,165,250,0.1)' },
  radarLineV:  { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(96,165,250,0.1)' },
  radarSweep:  { position: 'absolute', borderRadius: RADAR_SIZE / 2, backgroundColor: 'transparent', borderTopWidth: RADAR_SIZE / 2, borderRightWidth: RADAR_SIZE / 2, borderTopColor: 'rgba(96,165,250,0.06)', borderRightColor: 'transparent' },
  radarPulse:  { position: 'absolute', borderWidth: 1, borderColor: 'rgba(96,165,250,0.6)' },
  radarPin:    { position: 'absolute', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  radarPinText:{ fontSize: 14 },
  radarCenter: { position: 'absolute', left: RADAR_SIZE / 2 - 18, top: RADAR_SIZE / 2 - 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  radarLabel:  { position: 'absolute', fontSize: 8, color: 'rgba(96,165,250,0.4)' },
  radarStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 12, fontWeight: '600' },

  permCard:    { backgroundColor: C.backgroundCard, borderRadius: Radius.lg, padding: 20, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.borderDefault },
  permIcon:    { fontSize: 40 },
  permTitle:   { fontSize: 17, color: C.textPrimary, fontWeight: '700' },
  permDesc:    { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  permBtn:     { backgroundColor: '#4ade80', borderRadius: Radius.md, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { fontSize: 15, color: C.ink, fontWeight: '800' },
  demoCard:    { backgroundColor: C.backgroundCard, borderRadius: Radius.md, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(212,160,23,0.3)' },
  demoTitle:   { fontSize: 13, color: C.gold, fontWeight: '700' },
  demoButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  demoBtn:     { backgroundColor: C.goldLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.borderGold },
  demoBtnText: { fontSize: 12, color: C.gold, fontWeight: '600' },

  proxList:       { gap: 10 },
  sectionLabel:   { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '700' },
  proxCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.backgroundCard, borderRadius: Radius.md, padding: 12, borderWidth: 1 },
  proxIcon:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  proxName:       { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  proxDist:       { fontSize: 12, fontWeight: '700' },
  proxReward:     { fontSize: 11, color: C.textMuted },
  proxUnlockBtn:  { backgroundColor: '#4ade80', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  proxUnlockText: { fontSize: 12, color: C.ink, fontWeight: '800' },

  modalBackdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard:            { backgroundColor: C.backgroundElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, borderTopWidth: 1, borderColor: C.borderGold },
  modalClose:           { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: C.backgroundCard, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalHeader:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalName:            { fontSize: 17, color: C.textPrimary, fontWeight: '700' },
  modalDist:            { fontSize: 13, fontWeight: '600', marginTop: 2 },
  modalRewards:         { backgroundColor: C.backgroundCard, borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: C.borderDefault },
  modalRewardsLabel:    { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  modalRewardItem:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalRewardLegendary: { backgroundColor: C.goldLight, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.borderGold },
  modalRewardText:      { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  modalVisitBtn:        { backgroundColor: '#4ade80', borderRadius: Radius.md, padding: 16, alignItems: 'center' },
  modalVisitBtnText:    { fontSize: 16, color: C.ink, fontWeight: '800' },
  modalDoneBtn:         { backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: Radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  modalDoneBtnText:     { fontSize: 14, color: '#4ade80', fontWeight: '600' },
  modalTooFarBox:       { backgroundColor: C.backgroundCard, borderRadius: Radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.borderDefault },
  modalTooFarText:      { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
});
