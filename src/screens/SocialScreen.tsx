// ============================================================
// BATTLE ECHOES — SocialScreen.tsx
// Spolecznosc — Znajomi · Wyzwania · Udostepnianie
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, TextInput, Alert, Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';
import { Colors, Radius, Spacing } from '../constants/theme';
import { useAppStore, levelFromXP } from '../store';
import { Icon } from '../components/GoldIcon';
import socialService, { type FriendProfile, type QuizChallenge } from '../services/SocialService';
import { useTranslation } from 'react-i18next';

const C = Colors;

type TabId = 'friends' | 'challenges' | 'share';

// ════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════
export default function SocialScreen({ navigation }: any) {
  useFocusEffect(useCallback(() => { logScreenView('Social'); }, []));
  const { t } = useTranslation();
  const user = useAppStore(s => s.user);

  const [activeTab, setActiveTab] = useState<TabId>('friends');
  const [friends, setFriends]     = useState<FriendProfile[]>([]);
  const [challenges, setChallenges] = useState<QuizChallenge[]>([]);
  const [friendCode, setFriendCode] = useState('------');
  const [showAddModal, setShowAddModal] = useState(false);

  // Load data on focus
  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    if (!user) return;
    const [code, fr, ch] = await Promise.all([
      socialService.getFriendCode(user.id),
      socialService.getFriends(),
      socialService.getChallenges(),
    ]);
    setFriendCode(code);
    setFriends(fr);
    setChallenges(ch);
  };

  const handleRemoveFriend = (friend: FriendProfile) => {
    Alert.alert(
      t('social.remove'),
      t('social.remove_confirm', { name: friend.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('social.remove'), style: 'destructive',
          onPress: async () => {
            await socialService.removeFriend(friend.id);
            setFriends(prev => prev.filter(f => f.id !== friend.id));
          },
        },
      ],
    );
  };

  const handleAcceptChallenge = (challenge: QuizChallenge) => {
    navigation.navigate('Quiz', {
      battleId: challenge.battleId,
      battleName: challenge.battleName,
      challengeId: challenge.id,
    });
  };

  const TABS: { id: TabId; iconId: string }[] = [
    { id: 'friends',    iconId: 'users' },
    { id: 'challenges', iconId: 'sword' },
    { id: 'share',      iconId: 'share' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon id="chevron_left" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('social.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Tabs ───────────────────────────────────────── */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon id={tab.iconId as any} size={13} color={activeTab === tab.id ? C.gold : C.textMuted} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {t(`social.${tab.id}`)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'friends' && (
          <FriendsTab
            friendCode={friendCode}
            friends={friends}
            onAddPress={() => setShowAddModal(true)}
            onRemove={handleRemoveFriend}
            t={t}
          />
        )}
        {activeTab === 'challenges' && (
          <ChallengesTab
            challenges={challenges}
            onAccept={handleAcceptChallenge}
            t={t}
          />
        )}
        {activeTab === 'share' && (
          <ShareTab user={user} t={t} />
        )}
      </ScrollView>

      {/* ── Add Friend Modal ───────────────────────────── */}
      <AddFriendModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={async (profile) => {
          await socialService.addFriend(profile);
          setFriends(prev => [...prev, profile]);
          setShowAddModal(false);
        }}
        t={t}
      />
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// FRIENDS TAB
// ════════════════════════════════════════════════════════════
function FriendsTab({ friendCode, friends, onAddPress, onRemove, t }: {
  friendCode: string;
  friends: FriendProfile[];
  onAddPress: () => void;
  onRemove: (f: FriendProfile) => void;
  t: any;
}) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(friendCode);
    Alert.alert(t('social.copy_code'), friendCode);
  };

  return (
    <>
      {/* Friend Code Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('social.your_code')}</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeText}>{friendCode}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Icon id="link" size={14} color={C.gold} />
            <Text style={styles.copyBtnText}>{t('social.copy_code')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Friend Button */}
      <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
        <Icon id="plus" size={18} color={C.gold} />
        <Text style={styles.addBtnText}>{t('social.add_friend')}</Text>
      </TouchableOpacity>

      {/* Friends List */}
      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon id="users" size={40} color={C.textMuted} />
          <Text style={styles.emptyTitle}>{t('social.no_friends')}</Text>
          <Text style={styles.emptyHint}>{t('social.no_friends_hint')}</Text>
        </View>
      ) : (
        friends.map(friend => (
          <FriendRow key={friend.id} friend={friend} onRemove={() => onRemove(friend)} t={t} />
        ))
      )}
    </>
  );
}

function FriendRow({ friend, onRemove, t }: { friend: FriendProfile; onRemove: () => void; t: any }) {
  return (
    <View style={styles.friendRow}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>{friend.name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.friendName}>{friend.name}</Text>
        <Text style={styles.friendStats}>
          {t('social.level_short', { level: friend.level })} · {friend.totalXP} XP · {friend.streak} streak
        </Text>
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon id="close" size={18} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// CHALLENGES TAB
// ════════════════════════════════════════════════════════════
function ChallengesTab({ challenges, onAccept, t }: {
  challenges: QuizChallenge[];
  onAccept: (c: QuizChallenge) => void;
  t: any;
}) {
  const pending   = challenges.filter(c => c.status === 'pending');
  const completed = challenges.filter(c => c.status === 'completed');

  if (challenges.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon id="sword" size={40} color={C.textMuted} />
        <Text style={styles.emptyTitle}>{t('social.no_challenges')}</Text>
      </View>
    );
  }

  return (
    <>
      {pending.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('social.pending')}</Text>
          {pending.map(ch => (
            <ChallengeRow key={ch.id} challenge={ch} onAccept={() => onAccept(ch)} t={t} />
          ))}
        </>
      )}
      {completed.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('social.completed')}</Text>
          {completed.map(ch => (
            <ChallengeRow key={ch.id} challenge={ch} t={t} />
          ))}
        </>
      )}
    </>
  );
}

function ChallengeRow({ challenge, onAccept, t }: {
  challenge: QuizChallenge;
  onAccept?: () => void;
  t: any;
}) {
  const isPending = challenge.status === 'pending';

  return (
    <View style={styles.challengeRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.challengeTitle}>{challenge.battleName}</Text>
        <Text style={styles.challengeSub}>
          {t('social.challenge_from', { name: challenge.challengerName })}
        </Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>
            {t('social.their_score')}: {challenge.challengerScore}
          </Text>
          {challenge.challengedScore !== undefined && (
            <Text style={[styles.scoreText, { color: C.gold }]}>
              {t('social.your_score')}: {challenge.challengedScore}
            </Text>
          )}
        </View>
      </View>
      {isPending && onAccept && (
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
          <Icon id="check" size={14} color="#080808" />
          <Text style={styles.acceptBtnText}>{t('social.accept')}</Text>
        </TouchableOpacity>
      )}
      {!isPending && (
        <View style={styles.completedBadge}>
          <Icon id="check" size={14} color="#4ade80" />
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// SHARE TAB
// ════════════════════════════════════════════════════════════
function ShareTab({ user, t }: { user: any; t: any }) {
  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'Battle Echoes',
        message: 'Odkryj historyczne bitwy z Battle Echoes! Stoj tam, gdzie historia sie dziala.\n\nhttps://battleechoes.app',
      });
    } catch {}
  };

  const handleShareStats = async () => {
    if (!user) return;
    const info = levelFromXP(user.totalXP);
    try {
      await Share.share({
        title: 'Battle Echoes — Moje statystyki',
        message: `Moje statystyki w Battle Echoes:\nPoziom ${info.level} | ${user.totalXP} XP | ${user.listenedBattles?.length ?? 0} bitew | Seria ${user.streak ?? 0} dni`,
      });
    } catch {}
  };

  const SHARE_OPTIONS = [
    { id: 'app',    iconId: 'share',   color: '#60a5fa', titleKey: 'social.share_app',    onPress: handleShareApp },
    { id: 'stats',  iconId: 'chart',   color: '#fbbf24', titleKey: 'social.share_stats',  onPress: handleShareStats },
  ];

  return (
    <>
      {SHARE_OPTIONS.map(opt => (
        <TouchableOpacity key={opt.id} style={styles.shareCard} onPress={opt.onPress} activeOpacity={0.8}>
          <View style={[styles.shareIconBox, { backgroundColor: `${opt.color}20` }]}>
            <Icon id={opt.iconId as any} size={24} color={opt.color} />
          </View>
          <Text style={styles.shareCardTitle}>{t(opt.titleKey)}</Text>
          <Icon id="chevron_right" size={20} color={opt.color} />
        </TouchableOpacity>
      ))}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// ADD FRIEND MODAL
// ════════════════════════════════════════════════════════════
function AddFriendModal({ visible, onClose, onAdd, t }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (profile: FriendProfile) => void;
  t: any;
}) {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    if (code.trim().length < 4) return;
    // Simulated friend lookup — in production this would query Firestore by code
    const mockProfile: FriendProfile = {
      id: `friend_${code.trim().toUpperCase()}`,
      name: `Player_${code.trim().slice(0, 3)}`,
      level: Math.floor(Math.random() * 10) + 1,
      totalXP: Math.floor(Math.random() * 5000),
      streak: Math.floor(Math.random() * 30),
      listenedCount: Math.floor(Math.random() * 20),
      visitedCount: Math.floor(Math.random() * 10),
      addedAt: new Date().toISOString(),
    };
    onAdd(mockProfile);
    setCode('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('social.add_friend')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon id="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>{t('social.enter_code')}</Text>
          <TextInput
            style={styles.modalInput}
            value={code}
            onChangeText={setCode}
            placeholder="ABC123"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.modalSubmit, code.trim().length < 4 && { opacity: 0.4 }]}
            onPress={handleSubmit}
            disabled={code.trim().length < 4}
            activeOpacity={0.8}
          >
            <Icon id="plus" size={16} color="#080808" />
            <Text style={styles.modalSubmitText}>{t('social.add_friend')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderDefault,
  },
  headerTitle: { fontSize: 22, color: C.textPrimary, fontWeight: '700' },

  // ── Tabs ────────────────────────────────────────────────
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderDefault },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: C.gold },
  tabText:       { fontSize: 12, color: C.textMuted,  fontWeight: '600' },
  tabTextActive: { color: C.gold },

  // ── Scroll ──────────────────────────────────────────────
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  // ── Card ────────────────────────────────────────────────
  card: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 16, gap: 10,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  cardLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600' },

  // ── Friend Code ─────────────────────────────────────────
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeText: {
    fontSize: 28, fontWeight: '700', color: C.gold,
    letterSpacing: 6, fontFamily: 'JetBrainsMono',
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${C.gold}15`, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: `${C.gold}30`,
  },
  copyBtnText: { fontSize: 12, color: C.gold, fontWeight: '600' },

  // ── Add Button ──────────────────────────────────────────
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: `${C.gold}15`, borderRadius: Radius.md,
    paddingVertical: 14,
    borderWidth: 1, borderColor: `${C.gold}30`,
  },
  addBtnText: { fontSize: 14, color: C.gold, fontWeight: '700' },

  // ── Empty State ─────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, color: C.textSecondary, fontWeight: '600' },
  emptyHint:  { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  // ── Friend Row ──────────────────────────────────────────
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: C.borderDefault,
  },
  friendAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${C.gold}20`, alignItems: 'center', justifyContent: 'center',
  },
  friendAvatarText: { fontSize: 16, color: C.gold, fontWeight: '700' },
  friendName:  { fontSize: 15, color: C.textPrimary, fontWeight: '700' },
  friendStats: { fontSize: 12, color: C.textMuted },

  // ── Section Label ───────────────────────────────────────
  sectionLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600', marginTop: 4 },

  // ── Challenge Row ───────────────────────────────────────
  challengeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: C.borderDefault,
  },
  challengeTitle: { fontSize: 15, color: C.textPrimary, fontWeight: '700' },
  challengeSub:   { fontSize: 12, color: C.textMuted },
  scoreRow:       { flexDirection: 'row', gap: 12, marginTop: 4 },
  scoreText:      { fontSize: 12, color: C.textSecondary },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.gold, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  acceptBtnText: { fontSize: 12, color: '#080808', fontWeight: '700' },
  completedBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Share Card ──────────────────────────────────────────
  shareCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 16, borderWidth: 1, borderColor: C.borderDefault,
  },
  shareIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  shareCardTitle: { flex: 1, fontSize: 15, color: C.textPrimary, fontWeight: '700' },

  // ── Modal ───────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    width: '100%', backgroundColor: C.backgroundElevated,
    borderRadius: Radius.lg, padding: 24, gap: 16,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:  { fontSize: 18, color: C.textPrimary, fontWeight: '700' },
  modalLabel:  { fontSize: 13, color: C.textMuted },
  modalInput: {
    backgroundColor: C.backgroundCard, borderRadius: Radius.md,
    padding: 14, fontSize: 20, color: C.textPrimary, fontWeight: '700',
    textAlign: 'center', letterSpacing: 4,
    borderWidth: 1, borderColor: C.borderDefault,
  },
  modalSubmit: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.gold, borderRadius: Radius.md, paddingVertical: 14,
  },
  modalSubmitText: { fontSize: 14, color: '#080808', fontWeight: '700' },
});
