// ============================================================
// BATTLE ECHOES — GPSScreen.tsx
// Ekran GPS — radar, wykrywanie pól bitew, odblokowywanie
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert, Dimensions, Modal, Platform,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';
import { useAppStore } from '../store';
import gpsService, {
  BATTLE_SITES, BattleSite, ProximityResult,
  Coords, formatDistance, haversineDistance,
} from '../services/GPSService';
import { FloatingReward, RewardToast } from '../components/XPSystem';
import { ALL_ARTIFACTS, RARITY_META } from '../artifacts/data';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Icon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');
const RADAR_SIZE = SW - 48;

// ════════════════════════════════════════════════════════════
// GŁÓWNY EKRAN
// ════════════════════════════════════════════════════════════
export default function GPSScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user, markBattleVisited, unlockArtifact } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('GPS'); }, []));

  const [permission,   setPermission]   = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [userCoords,   setUserCoords]   = useState<Coords | null>(null);
  const [proximity,    setProximity]    = useState<ProximityResult[]>([]);
  const [isWatching,   setIsWatching]   = useState(false);
  const [selectedSite, setSelectedSite] = useState<ProximityResult | null>(null);
  const [floaters,     setFloaters]     = useState<{ id: string; value: string; color: string }[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData,    setToastData]    = useState({ icon: '📍', title: '', subtitle: '', color: '#4ade80' });

  // Animacje radaru
  const radarPulse1 = useRef(new Animated.Value(0)).current;
  const radarPulse2 = useRef(new Animated.Value(0)).current;
  const radarPulse3 = useRef(new Animated.Value(0)).current;
  const radarSweep  = useRef(new Animated.Value(0)).current;
  const dotScale    = useRef(new Animated.Value(1)).current;

  // ── Animacja radaru ──────────────────────────────────────
  useEffect(() => {
    // Fale
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      ).start();

    pulse(radarPulse1, 0);
    pulse(radarPulse2, 700);
    pulse(radarPulse3, 1400);

    // Sweep
    Animated.loop(
      Animated.timing(radarSweep, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();

    // Dot puls
    Animated.loop(
      Animated.sequence([
        Animated.spring(dotScale, { toValue: 1.4, useNativeDriver: true, tension: 60 }),
        Animated.spring(dotScale, { toValue: 1.0, useNativeDriver: true, tension: 60 }),
      ])
    ).start();
  }, []);

  // ── Sprawdź uprawnienia ──────────────────────────────────
  useEffect(() => {
    gpsService.hasPermission().then(ok =>
      setPermission(ok ? 'granted' : 'unknown')
    );
  }, []);

  // ── Start nasłuchiwania ───────────────────────────────────
  const startGPS = useCallback(async () => {
    const ok = await gpsService.requestPermission();
    if (!ok) {
      setPermission('denied');
      return;
    }
    setPermission('granted');

    // Pobierz aktualną pozycję
    const coords = await gpsService.getCurrentLocation();
    if (coords) {
      setUserCoords(coords);
      setProximity(gpsService.checkProximity(coords));
    }

    // Nasłuchuj zmian
    await gpsService.startWatching((coords, prox) => {
      setUserCoords(coords);
      setProximity(prox);
    });
    setIsWatching(true);
  }, []);

  // Cleanup
  useEffect(() => () => gpsService.stopWatching(), []);

  // ── Symulacja (emulator/demo) ─────────────────────────────
  const simulateNearby = (siteIdx: number) => {
    const coords = gpsService.simulateLocation(siteIdx);
    setUserCoords(coords);
    setProximity(gpsService.checkProximity(coords));
    setPermission('granted');
    setIsWatching(true);
  };

  // ── Wizyta na polu bitwy ──────────────────────────────────
  const handleVisit = async (result: ProximityResult) => {
    const { site } = result;
    const alreadyVisited = user?.visitedBattles.includes(site.battleId);

    if (alreadyVisited) {
      Alert.alert(
        `✅ ${t('gps.already_visited_title')}`,
        t('gps.already_visited_msg', { name: site.name })
      );
      return;
    }

    // Odblokuj + przyznaj nagrody per-pole (xpReward/coinReward z BattleSite)
    markBattleVisited(site.battleId, site.xpReward, site.coinReward);

    // Odblokuj legendarny artefakt jeśli jest
    if (site.artifactId) {
      unlockArtifact(site.artifactId);
    }

    // Pokaż nagrody
    const rewardId = Math.random().toString(36).substring(2, 8);
    setFloaters(prev => [...prev,
      { id: `${rewardId}_xp`,    value: `+${site.xpReward} XP`,    color: '#fbbf24' },
      { id: `${rewardId}_coins`, value: `+${site.coinReward} 🪙`,  color: Colors.gold },
    ]);

    setToastData({
      icon:     '📍',
      title:    t('gps.unlocked_toast', { name: site.name }),
      subtitle: `+${site.xpReward} XP · +${site.coinReward} 🪙 · ${t('gps.legendary_artifact')}!`,
      color:    '#4ade80',
    });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);

    setSelectedSite(null);

    Alert.alert(
      `🏆 ${t('gps.congrats_title')}`,
      t('gps.congrats_msg', { name: site.name, xp: site.xpReward, coins: site.coinReward }),
      [
        { text: t('gps.see_artifact'), onPress: () => navigation.navigate('Artifacts') },
        { text: t('common.ok') },
      ]
    );
  };

  // ── Pozycje pingów na radarze ─────────────────────────────
  const getRadarPosition = (result: ProximityResult) => {
    if (!userCoords) return { x: RADAR_SIZE / 2, y: RADAR_SIZE / 2 };
    const maxDistM = 50000; // 50km = krawędź radaru
    const dist  = Math.min(result.distanceM, maxDistM);
    const ratio = dist / maxDistM;
    const angle = Math.atan2(
      result.site.coords.longitude - userCoords.longitude,
      result.site.coords.latitude  - userCoords.latitude,
    );
    const r = ratio * (RADAR_SIZE / 2 - 20);
    return {
      x: RADAR_SIZE / 2 + Math.sin(angle) * r,
      y: RADAR_SIZE / 2 - Math.cos(angle) * r,
    };
  };

  const sweepRotate = radarSweep.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  });

  const isGranted = permission === 'granted';

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Icon id="map_marker" size={48} color={Colors.textMuted} />
        <Text style={{ fontSize: 18, color: Colors.textPrimary, fontWeight: '700', marginTop: 16 }}>
          {t('gps.radar_title')}
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
          {t('gps.web_only_mobile')}{'\n'}
          {t('gps.web_only_mobile_desc')}
        </Text>
      </View>
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

      {/* Modal wizyty */}
      <VisitModal
        result={selectedSite}
        visited={selectedSite ? (user?.visitedBattles.includes(selectedSite.site.battleId) || false) : false}
        onVisit={handleVisit}
        onClose={() => setSelectedSite(null)}
      />

      {/* ── Nagłówek ──────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📍 {t('gps.radar_title')}</Text>
          <Text style={styles.headerSub}>{t('gps.detecting_nearby')}</Text>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: isWatching ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
          borderColor: isWatching ? 'rgba(74,222,128,0.4)' : Colors.borderDefault,
        }]}>
          <View style={[styles.statusDot, { backgroundColor: isWatching ? '#4ade80' : Colors.textMuted }]} />
          <Text style={[styles.statusText, { color: isWatching ? '#4ade80' : Colors.textMuted }]}>
            {isWatching ? t('gps.active') : t('gps.inactive')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Radar ────────────────────────────────────── */}
        <View style={styles.radarWrap}>
          {/* Tło radaru */}
          <View style={[styles.radar, { width: RADAR_SIZE, height: RADAR_SIZE }]}>

            {/* Siatka kołowa */}
            {[0.25, 0.5, 0.75, 1].map(r => (
              <View key={r} style={[styles.radarRing, {
                width:  RADAR_SIZE * r, height: RADAR_SIZE * r,
                borderRadius: RADAR_SIZE * r / 2,
                top:    RADAR_SIZE * (1 - r) / 2,
                left:   RADAR_SIZE * (1 - r) / 2,
              }]} />
            ))}

            {/* Linie krzyżowe */}
            <View style={styles.radarLineH} />
            <View style={styles.radarLineV} />

            {/* Sweep */}
            <Animated.View style={[
              styles.radarSweep,
              { width: RADAR_SIZE, height: RADAR_SIZE, transform: [{ rotate: sweepRotate }] },
            ]} />

            {/* Fale pulsu */}
            {[radarPulse1, radarPulse2, radarPulse3].map((anim, i) => (
              <Animated.View key={i} style={[
                styles.radarPulse,
                {
                  width: RADAR_SIZE, height: RADAR_SIZE,
                  borderRadius: RADAR_SIZE / 2,
                  opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) }],
                },
              ]} />
            ))}

            {/* Pola bitew na radarze */}
            {isGranted && proximity.map(result => {
              const pos     = getRadarPosition(result);
              const visited = user?.visitedBattles.includes(result.site.battleId);
              return (
                <TouchableOpacity
                  key={result.site.battleId}
                  style={[
                    styles.radarPin,
                    {
                      left: pos.x - 16, top: pos.y - 16,
                      backgroundColor: result.isInside
                        ? 'rgba(74,222,128,0.9)'
                        : visited
                          ? 'rgba(212,160,23,0.7)'
                          : 'rgba(96,165,250,0.8)',
                      borderColor: result.isInside ? '#4ade80' : visited ? Colors.gold : '#60a5fa',
                    },
                  ]}
                  onPress={() => setSelectedSite(result)}
                >
                  <Text style={styles.radarPinText}>⚔</Text>
                </TouchableOpacity>
              );
            })}

            {/* Środek — pozycja użytkownika */}
            <Animated.View style={[
              styles.radarCenter,
              { transform: [{ scale: dotScale }] },
            ]}>
              <Text style={styles.radarCenterText}>📍</Text>
            </Animated.View>

            {/* Opisy odległości */}
            <Text style={[styles.radarLabel, { top: 8, left: RADAR_SIZE / 2 - 12 }]}>50km</Text>
            <Text style={[styles.radarLabel, { top: RADAR_SIZE * 0.13, left: RADAR_SIZE / 2 - 12 }]}>25km</Text>

          </View>
        </View>

        {/* ── Przycisk start / demo ─────────────────────── */}
        {!isGranted ? (
          <View style={styles.permCard}>
            <Text style={styles.permIcon}>🗺</Text>
            <Text style={styles.permTitle}>{t('gps.permission')}</Text>
            <Text style={styles.permDesc}>
              {t('gps.enable_location_desc')}
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={startGPS}>
              <Text style={styles.permBtnText}>{t('gps.enable_gps')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.demoCard}>
            <Text style={styles.demoTitle}>📡 {t('gps.demo_title')}</Text>
            <Text style={styles.demoDesc}>{t('gps.demo_desc')}</Text>
            <View style={styles.demoButtons}>
              {BATTLE_SITES.map((site, i) => (
                <TouchableOpacity
                  key={site.battleId}
                  style={styles.demoSiteBtn}
                  onPress={() => simulateNearby(i)}
                >
                  <Text style={styles.demoSiteBtnText}>⚔ {site.name.split(' ').slice(-1)[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Lista pobliskich pól bitew ────────────────── */}
        {proximity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('gps.nearby_battles')}</Text>
            {proximity.map(result => {
              const visited = user?.visitedBattles.includes(result.site.battleId);
              return (
                <ProximityCard
                  key={result.site.battleId}
                  result={result}
                  visited={visited || false}
                  onPress={() => setSelectedSite(result)}
                />
              );
            })}
          </View>
        )}

        {/* ── Info ─────────────────────────────────────── */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🏆 {t('gps.how_gps_works')}</Text>
          <Text style={styles.infoText}>
            {t('gps.how_gps_works_desc')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// KARTA POLA BITWY
// ════════════════════════════════════════════════════════════
function ProximityCard({ result, visited, onPress }: {
  result:  ProximityResult;
  visited: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { site, distanceM, isInside } = result;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isInside) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isInside]);

  const color = isInside ? '#4ade80' : visited ? Colors.gold : '#60a5fa';

  return (
    <Animated.View style={[
      styles.proxCard,
      { borderColor: `${color}40`, transform: [{ scale: pulseAnim }] },
      isInside && { backgroundColor: 'rgba(74,222,128,0.06)' },
    ]}>
      <TouchableOpacity style={styles.proxCardInner} onPress={onPress} activeOpacity={0.8}>
        {/* Ikona */}
        <View style={[styles.proxIcon, { backgroundColor: `${color}20` }]}>
          <Text style={{ fontSize: 22 }}>
            {isInside ? '✅' : visited ? '🏆' : '⚔'}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.proxName}>{site.name}</Text>
          <View style={styles.proxMetaRow}>
            <Text style={[styles.proxDistance, { color }]}>
              {isInside ? `🟢 ${t('gps.in_zone')}` : formatDistance(distanceM)}
            </Text>
            {visited && <Text style={styles.proxVisited}>· {t('gps.visited')} ✅</Text>}
          </View>
          <Text style={styles.proxReward}>
            +{site.xpReward} XP · +{site.coinReward} 🪙 · {t('gps.legendary_artifact')}
          </Text>
        </View>

        {/* Przycisk */}
        {isInside && !visited && (
          <View style={styles.proxBtn}>
            <Text style={styles.proxBtnText}>{t('gps.unlock')}</Text>
          </View>
        )}

        {!isInside && (
          <Text style={styles.proxArrow}>→</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL WIZYTY
// ════════════════════════════════════════════════════════════
function VisitModal({ result, visited, onVisit, onClose }: {
  result:  ProximityResult | null;
  visited: boolean;
  onVisit: (r: ProximityResult) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (result) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [result]);

  if (!result) return null;

  const { site, distanceM, isInside } = result;
  const artifact = site.artifactId
    ? ALL_ARTIFACTS.find(a => a.id === site.artifactId)
    : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={1}>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <Text style={{ fontSize: 14, color: Colors.textMuted }}>✕</Text>
            </TouchableOpacity>

            {/* Nagłówek */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>⚔</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalName}>{site.name}</Text>
                <Text style={[styles.modalDist, {
                  color: isInside ? '#4ade80' : '#60a5fa',
                }]}>
                  {isInside ? `🟢 ${t('gps.in_zone_full')}` : `📍 ${formatDistance(distanceM)} ${t('gps.distance_from')}`}
                </Text>
              </View>
            </View>

            {/* Nagrody */}
            <View style={styles.modalRewards}>
              <Text style={styles.modalRewardsLabel}>{t('gps.visit_rewards')}</Text>
              <View style={styles.modalRewardsList}>
                <View style={styles.modalRewardItem}>
                  <Text style={styles.modalRewardIcon}>⭐</Text>
                  <Text style={styles.modalRewardText}>+{site.xpReward} XP</Text>
                </View>
                <View style={styles.modalRewardItem}>
                  <Text style={styles.modalRewardIcon}>🪙</Text>
                  <Text style={styles.modalRewardText}>+{site.coinReward} {t('gps.coins_label')}</Text>
                </View>
                {artifact && (
                  <View style={[styles.modalRewardItem, styles.modalRewardLegendary]}>
                    <Text style={styles.modalRewardIcon}>{artifact.icon}</Text>
                    <View>
                      <Text style={[styles.modalRewardText, { color: Colors.gold }]}>{artifact.name}</Text>
                      <Text style={styles.modalRewardSub}>{t('gps.legendary_artifact')}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Przycisk */}
            {visited ? (
              <View style={styles.modalDoneBtn}>
                <Text style={styles.modalDoneBtnText}>✅ {t('gps.visited_already')}</Text>
              </View>
            ) : isInside ? (
              <TouchableOpacity
                style={styles.modalVisitBtn}
                onPress={() => onVisit(result)}
              >
                <Text style={styles.modalVisitBtnText}>🏆 {t('gps.unlock_battlefield')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.modalTooFarBox}>
                <Text style={styles.modalTooFarText}>
                  {t('gps.too_far', { radius: site.radiusM })}{'\n'}
                  {t('gps.remaining', { distance: formatDistance(Math.max(0, distanceM - site.radiusM)) })}
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
// STYLE
// ════════════════════════════════════════════════════════════
const C = Colors;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  headerTitle: { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  headerSub:   { fontSize: 13, color: C.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 12, fontWeight: '600' },

  scroll: { padding: 16, gap: 16 },

  // Radar
  radarWrap: { alignItems: 'center' },
  radar: {
    position: 'relative', borderRadius: RADAR_SIZE / 2,
    backgroundColor: '#070E1A',
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)',
    overflow: 'hidden',
  },
  radarRing: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(96,165,250,0.15)' },
  radarLineH: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(96,165,250,0.1)' },
  radarLineV: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(96,165,250,0.1)' },
  radarSweep: {
    position: 'absolute',
    borderRadius: RADAR_SIZE / 2,
    // Sweep effect via gradient-like overlay (using transform)
    // Simplified: just a rotating semi-transparent wedge
    backgroundColor: 'transparent',
    // Używamy border trick dla wedge
    borderTopWidth: RADAR_SIZE / 2,
    borderRightWidth: RADAR_SIZE / 2,
    borderTopColor: 'rgba(96,165,250,0.06)',
    borderRightColor: 'transparent',
  },
  radarPulse: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(96,165,250,0.6)' },

  radarPin: {
    position: 'absolute', width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 5,
  },
  radarPinText: { fontSize: 14 },

  radarCenter: {
    position: 'absolute',
    left: RADAR_SIZE / 2 - 18, top: RADAR_SIZE / 2 - 18,
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  radarCenterText: { fontSize: 24 },

  radarLabel: { position: 'absolute', fontSize: 8, color: 'rgba(96,165,250,0.4)' },

  // Perm card
  permCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.lg,
    padding: 20, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  permIcon:    { fontSize: 48 },
  permTitle:   { fontSize: 18, color: C.textPrimary, fontWeight: '700' },
  permDesc:    { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  permBtn:     { backgroundColor: '#4ade80', borderRadius: Radius.md, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { fontSize: 15, color: C.ink, fontWeight: '800' },

  // Demo card
  demoCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, gap: 10,
    borderWidth: 1, borderColor: 'rgba(212,160,23,0.3)',
  },
  demoTitle:      { fontSize: 13, color: C.gold, fontWeight: '700' },
  demoDesc:       { fontSize: 12, color: C.textMuted },
  demoButtons:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  demoSiteBtn:    { backgroundColor: C.goldLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.borderGold },
  demoSiteBtnText:{ fontSize: 12, color: C.gold, fontWeight: '600' },

  // Section
  section:      { gap: 10 },
  sectionLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '700' },

  // Proximity card
  proxCard: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    borderWidth: 1, overflow: 'hidden',
  },
  proxCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  proxIcon:      { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  proxName:      { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  proxMetaRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proxDistance:  { fontSize: 13, fontWeight: '700' },
  proxVisited:   { fontSize: 12, color: C.textMuted },
  proxReward:    { fontSize: 11, color: C.textMuted },
  proxBtn:       { backgroundColor: '#4ade80', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  proxBtnText:   { fontSize: 12, color: C.ink, fontWeight: '800' },
  proxArrow:     { fontSize: 18, color: C.textMuted },

  // Info
  infoBox: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, gap: 8,
    borderWidth: 1, borderColor: C.borderDefault,
    borderLeftWidth: 3, borderLeftColor: '#4ade80',
  },
  infoTitle: { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  infoText:  { fontSize: 13, color: C.textMuted, lineHeight: 22 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.backgroundElevated,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16,
    borderTopWidth: 1, borderColor: C.borderGold,
  },
  modalClose:  { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: C.backgroundCard, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalEmoji:  { fontSize: 40 },
  modalName:   { fontSize: 17, color: C.textPrimary, fontWeight: '700' },
  modalDist:   { fontSize: 13, fontWeight: '600', marginTop: 2 },

  modalRewards:      { backgroundColor: C.backgroundCard, borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: C.borderDefault },
  modalRewardsLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  modalRewardsList:  { gap: 10 },
  modalRewardItem:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalRewardLegendary: { backgroundColor: C.goldLight, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.borderGold },
  modalRewardIcon:   { fontSize: 24, width: 32, textAlign: 'center' },
  modalRewardText:   { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  modalRewardSub:    { fontSize: 11, color: C.textMuted },

  modalVisitBtn:     { backgroundColor: '#4ade80', borderRadius: Radius.md, padding: 16, alignItems: 'center' },
  modalVisitBtnText: { fontSize: 16, color: C.ink, fontWeight: '800' },
  modalDoneBtn:      { backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: Radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  modalDoneBtnText:  { fontSize: 14, color: '#4ade80', fontWeight: '600' },
  modalTooFarBox:    { backgroundColor: C.backgroundCard, borderRadius: Radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.borderDefault },
  modalTooFarText:   { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
});
