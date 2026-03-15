// ============================================================
// BATTLE ECHOES — SessionResultsScreen.tsx
// Post-session podium + full leaderboard + XP awards
// Shown to both Host and Students after quiz ends
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { logScreenView } from '../../services/AnalyticsService';
import { Colors, Radius } from '../../constants/theme';
import { useAppStore } from '../../store';
import { listenToParticipants, fetchSession, type Participant } from '../../services/SessionService';
import { hapticSuccess, hapticMedium } from '../../services/HapticsService';
import GoldIcon, { Icon } from '../../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const C = Colors;

// XP rewards per placement
const PLACEMENT_XP: Record<number, number> = { 1: 200, 2: 140, 3: 100 };
const PARTICIPANT_XP = 50;   // everyone gets base XP

// ════════════════════════════════════════════════════════════
// EKRAN
// ════════════════════════════════════════════════════════════
export default function SessionResultsScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteProp<RootStackParamList, 'SessionResults'>>();
  const { sessionId, isHost, userId } = route.params;
  const insets   = useSafeAreaInsets();
  useFocusEffect(useCallback(() => { logScreenView('SessionResults'); }, []));
  const { user, awardXP, awardCoins } = useAppStore();
  const { t } = useTranslation();

  const [participants,  setParticipants]  = useState<Participant[]>([]);
  const [battleName,    setBattleName]    = useState('');
  const [xpAwarded,     setXpAwarded]     = useState(false);
  const [myPlacement,   setMyPlacement]   = useState(0);

  // Entry animations
  const headerAnim  = useRef(new Animated.Value(0)).current;
  const podiumAnim  = useRef(new Animated.Value(0)).current;
  const listAnim    = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(Array(8).fill(0).map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    r: new Animated.Value(0),
    o: new Animated.Value(1),
  }))).current;

  // ── Load data ─────────────────────────────────────────────
  useEffect(() => {
    // Fetch battle name
    fetchSession(sessionId).then(s => {
      if (s) setBattleName(s.battleName);
    });

    // Subscribe to final participant list
    const unsub = listenToParticipants(sessionId, (list) => {
      setParticipants(list);

      // Find my placement
      if (!isHost) {
        const rank = list.findIndex(p => p.userId === userId) + 1;
        setMyPlacement(rank || list.length);
      }
    });
    return () => unsub();
  }, [sessionId, isHost, userId]);

  // ── Award XP once ─────────────────────────────────────────
  useEffect(() => {
    if (xpAwarded || participants.length === 0 || isHost) return;
    setXpAwarded(true);

    const rank  = participants.findIndex(p => p.userId === userId) + 1;
    const xpAmt = PLACEMENT_XP[rank] ?? PARTICIPANT_XP;
    const coins = rank <= 3 ? [30, 20, 10][rank - 1] : 5;

    awardXP(xpAmt, t('classroom.placement_xp', { rank }));
    awardCoins(coins, t('classroom.participation_reward'));
    hapticSuccess();
  }, [participants, xpAwarded, isHost, userId]);

  // ── Intro animations ──────────────────────────────────────
  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(podiumAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(listAnim,   { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Confetti burst
    confettiAnims.forEach((anim, i) => {
      const angle = (i / confettiAnims.length) * 2 * Math.PI;
      const dist  = 80 + Math.random() * 60;
      Animated.parallel([
        Animated.timing(anim.x, { toValue: Math.cos(angle) * dist, duration: 700, useNativeDriver: true }),
        Animated.timing(anim.y, { toValue: -Math.abs(Math.sin(angle) * dist) - 20, duration: 700, useNativeDriver: true }),
        Animated.timing(anim.r, { toValue: Math.random() > 0.5 ? 1 : -1, duration: 700, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(anim.o, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, []);

  const handleClose = useCallback(() => {
    hapticMedium();
    navigation.popToTop();
  }, [navigation]);

  // ── Top 3 ─────────────────────────────────────────────────
  const top3: (Participant | undefined)[] = [
    participants[1],  // 2nd (left)
    participants[0],  // 1st (center, taller)
    participants[2],  // 3rd (right)
  ];

  const podiumHeights   = [80, 110, 60];
  const podiumColors    = ['#94a3b8', C.gold, '#cd7f32'];
  // podiumMedals replaced by GoldIcon medal rendering
  const podiumPositions = [2, 1, 3];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ─── Header ─────────────────────────────────────── */}
      <Animated.View style={[styles.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <GoldIcon name="trophy" lib="mci" size={24} color={C.textPrimary} />
          <Text style={styles.headerTitle}>{t('classroom.lesson_over')}</Text>
        </View>
        <Text style={styles.headerSub} numberOfLines={1}>{battleName}</Text>
        {!isHost && myPlacement > 0 && (
          <View style={styles.myRankBadge}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.myRankText}>{t('classroom.your_placement')}</Text>
              {myPlacement <= 3 ? (
                <GoldIcon
                  name="medal"
                  lib="mci"
                  size={16}
                  color={[C.gold, '#94a3b8', '#cd7f32'][myPlacement - 1]}
                />
              ) : (
                <Text style={styles.myRankText}>#{myPlacement}</Text>
              )}
            </View>
          </View>
        )}
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Podium ────────────────────────────────────── */}
        <Animated.View style={[styles.podiumWrap, {
          opacity: podiumAnim,
          transform: [{ scale: podiumAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        }]}>
          {/* Confetti burst from center */}
          <View style={styles.confettiAnchor} pointerEvents="none">
            {confettiAnims.map((a, i) => (
              <Animated.View key={i} style={[styles.confetti, {
                backgroundColor: [C.gold, '#f97316', '#ec4899', '#6366f1'][i % 4],
                opacity: a.o,
                transform: [
                  { translateX: a.x },
                  { translateY: a.y },
                  { rotate: a.r.interpolate({ inputRange: [-1, 1], outputRange: ['-180deg', '180deg'] }) },
                ],
              }]} />
            ))}
          </View>

          {top3.map((p, i) =>
            p ? (
              <View key={i} style={[styles.podiumColumn, i === 1 && { marginTop: -20 }]}>
                {/* Medal */}
                <GoldIcon
                  name="medal"
                  lib="mci"
                  size={26}
                  color={[podiumColors[0], podiumColors[1], podiumColors[2]][i]}
                />
                {/* Avatar */}
                <View style={[styles.podiumAvatar, {
                  borderColor: podiumColors[i],
                  backgroundColor: `${podiumColors[i]}18`,
                }]}>
                  <Text style={{ fontSize: 24 }}>{p.avatar}</Text>
                </View>
                {/* Name + Score */}
                <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.podiumScore, { color: podiumColors[i] }]}>{p.score}</Text>
                {/* Step */}
                <View style={[styles.podiumStep, {
                  height: podiumHeights[i],
                  backgroundColor: `${podiumColors[i]}25`,
                  borderTopColor: podiumColors[i],
                }]}>
                  <Text style={[styles.podiumRankNum, { color: podiumColors[i] }]}>
                    {podiumPositions[i]}
                  </Text>
                </View>
              </View>
            ) : (
              <View key={i} style={styles.podiumColumn} />
            )
          )}
        </Animated.View>

        {/* ─── Full leaderboard ──────────────────────────── */}
        <Animated.View style={[styles.leaderboard, { opacity: listAnim }]}>
          <Text style={styles.leaderboardTitle}>{t('classroom.full_results')}</Text>
          {participants.map((p, i) => (
            <LeaderRow
              key={p.userId}
              participant={p}
              rank={i + 1}
              isMe={p.userId === userId}
              index={i}
            />
          ))}
          {participants.length === 0 && (
            <Text style={styles.emptyText}>{t('classroom.no_participant_data')}</Text>
          )}
        </Animated.View>

        {/* ─── XP earned info (student only) ─────────────── */}
        {!isHost && (
          <View style={styles.xpBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <GoldIcon name="star" lib="mci" size={16} color={C.gold} />
              <Text style={styles.xpBoxTitle}>{t('classroom.lesson_rewards')}</Text>
            </View>
            <View style={styles.xpBoxRow}>
              <Text style={styles.xpBoxLabel}>{t('classroom.xp_participation')}</Text>
              <Text style={styles.xpBoxValue}>+{PLACEMENT_XP[myPlacement] ?? PARTICIPANT_XP} XP</Text>
            </View>
            <View style={styles.xpBoxRow}>
              <Text style={styles.xpBoxLabel}>{t('classroom.coins')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.xpBoxValue}>
                  +{myPlacement === 1 ? 30 : myPlacement === 2 ? 20 : myPlacement === 3 ? 10 : 5}
                </Text>
                <Icon id="coin" size={14} color={C.gold} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── Close button ────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.85}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <GoldIcon name="home" lib="mci" size={18} color="#000" />
            <Text style={styles.closeBtnText}>{t('classroom.back_to_home')}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════
function LeaderRow({ participant, rank, isMe, index }: {
  participant: Participant;
  rank: number;
  isMe: boolean;
  index: number;
}) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 50, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const medalColors: Record<number, string> = { 1: C.gold, 2: '#94a3b8', 3: '#cd7f32' };

  return (
    <Animated.View style={[
      styles.leaderRow,
      isMe && styles.leaderRowMe,
      { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
    ]}>
      <View style={{ width: 36, alignItems: 'center' }}>
        {rank <= 3 ? (
          <GoldIcon name="medal" lib="mci" size={18} color={medalColors[rank]} />
        ) : (
          <Text style={styles.leaderRank}>{rank}</Text>
        )}
      </View>
      <View style={styles.leaderAvatar}>
        <Text style={{ fontSize: 18 }}>{participant.avatar}</Text>
      </View>
      <Text style={[styles.leaderName, isMe && { color: C.gold }]} numberOfLines={1}>
        {participant.name}{isMe ? ` (${t('classroom.you')})` : ''}
      </Text>
      <View style={styles.leaderRight}>
        <Text style={styles.leaderScore}>{participant.score}</Text>
        <Text style={styles.leaderScoreUnit}>{t('classroom.pts')}</Text>
      </View>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 4,
  },
  headerTitle: { fontSize: 24, color: C.textPrimary, fontWeight: '900' },
  headerSub:   { fontSize: 13, color: C.textMuted },

  myRankBadge: {
    marginTop: 4,
    backgroundColor: `${C.gold}20`,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: `${C.gold}40`,
  },
  myRankText: { fontSize: 14, color: C.gold, fontWeight: '700' },

  scroll: { padding: 16, gap: 20 },

  // ── Podium ──────────────────────────────────────────────
  podiumWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'center', gap: 0,
    paddingHorizontal: 16, height: 220,
  },
  podiumColumn: {
    flex: 1, alignItems: 'center', gap: 4,
    justifyContent: 'flex-end',
  },
  podiumAvatar: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  podiumName: {
    fontSize: 11, color: C.textSecondary, fontWeight: '600',
    textAlign: 'center', maxWidth: 70,
  },
  podiumScore: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  podiumStep: {
    width: '100%', borderTopWidth: 3,
    borderRadius: 4, alignItems: 'center', justifyContent: 'center',
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
  },
  podiumRankNum: { fontSize: 22, fontWeight: '900' },

  // ── Confetti ─────────────────────────────────────────────
  confettiAnchor: {
    position: 'absolute', bottom: '60%', left: '50%',
    width: 0, height: 0, overflow: 'visible', zIndex: 10,
  },
  confetti: { position: 'absolute', width: 8, height: 8, borderRadius: 2 },

  // ── Leaderboard ──────────────────────────────────────────
  leaderboard: {
    backgroundColor: C.backgroundCard,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: C.borderDefault,
    padding: 14, gap: 2,
  },
  leaderboardTitle: {
    fontSize: 14, color: C.textSecondary, fontWeight: '700',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  leaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  leaderRowMe: {
    backgroundColor: `${C.gold}08`,
    borderRadius: Radius.sm, paddingHorizontal: 8,
  },
  leaderRank:   { fontSize: 18, width: 36, textAlign: 'center' },
  leaderAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.backgroundElevated, alignItems: 'center', justifyContent: 'center',
  },
  leaderName:  { flex: 1, fontSize: 14, color: C.textPrimary, fontWeight: '600' },
  leaderRight: { alignItems: 'flex-end' },
  leaderScore: { fontSize: 16, color: C.gold, fontWeight: '800' },
  leaderScoreUnit: { fontSize: 10, color: C.textMuted },

  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', padding: 16 },

  // ── XP box ───────────────────────────────────────────────
  xpBox: {
    backgroundColor: `${C.gold}10`,
    borderRadius: Radius.md, borderWidth: 1, borderColor: `${C.gold}30`,
    padding: 16, gap: 10,
  },
  xpBoxTitle: { fontSize: 14, color: C.gold, fontWeight: '700' },
  xpBoxRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  xpBoxLabel: { fontSize: 13, color: C.textMuted },
  xpBoxValue: { fontSize: 13, color: C.textPrimary, fontWeight: '700' },

  // ── Bottom bar ───────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: C.borderDefault,
    backgroundColor: C.backgroundCard,
  },
  closeBtn: {
    backgroundColor: C.gold, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center',
  },
  closeBtnText: { fontSize: 16, color: '#000', fontWeight: '800' },
});
