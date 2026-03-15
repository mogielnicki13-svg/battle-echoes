// ============================================================
// BATTLE ECHOES — SocialService.ts
// System spolecznosciowy — znajomi, udostepnianie, wyzwania
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Platform } from 'react-native';

// ── Typy ──────────────────────────────────────────────────────
export interface FriendProfile {
  id:       string;
  name:     string;
  level:    number;
  totalXP:  number;
  streak:   number;
  listenedCount: number;
  visitedCount:  number;
  addedAt:  string; // ISO date
}

export interface QuizChallenge {
  id:           string;
  battleId:     string;
  battleName:   string;
  challengerId: string;
  challengerName: string;
  challengerScore: number;
  challengedId: string;
  status:       'pending' | 'completed' | 'expired';
  createdAt:    string;
  completedAt?: string;
  challengedScore?: number;
}

// ── Storage keys ─────────────────────────────────────────────
const FRIENDS_KEY     = 'be_friends_v1';
const CHALLENGES_KEY  = 'be_challenges_v1';
const FRIEND_CODE_KEY = 'be_friend_code_v1';

// ── Friend code generation ───────────────────────────────────
function generateFriendCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── Service ──────────────────────────────────────────────────
const socialService = {

  // Get or create user's friend code
  async getFriendCode(userId: string): Promise<string> {
    try {
      const saved = await AsyncStorage.getItem(FRIEND_CODE_KEY);
      if (saved) return saved;
      const code = generateFriendCode();
      await AsyncStorage.setItem(FRIEND_CODE_KEY, code);
      return code;
    } catch {
      return generateFriendCode();
    }
  },

  // Get friends list
  async getFriends(): Promise<FriendProfile[]> {
    try {
      const raw = await AsyncStorage.getItem(FRIENDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Add friend by code (simulated — in production would use Firestore lookup)
  async addFriend(profile: FriendProfile): Promise<void> {
    const friends = await this.getFriends();
    if (friends.some(f => f.id === profile.id)) return;
    friends.push(profile);
    await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  },

  // Remove friend
  async removeFriend(friendId: string): Promise<void> {
    const friends = await this.getFriends();
    const filtered = friends.filter(f => f.id !== friendId);
    await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(filtered));
  },

  // Share battle via system share sheet
  async shareBattle(battleName: string, battleId: string): Promise<void> {
    try {
      await Share.share({
        title: `Battle Echoes — ${battleName}`,
        message: `Odkryj bitwe "${battleName}" w Battle Echoes! Stoj tam, gdzie historia sie dziala.\n\nhttps://battleechoes.app/battle/${battleId}`,
      });
    } catch {}
  },

  // Share achievement
  async shareAchievement(achievementName: string, xp: number): Promise<void> {
    try {
      await Share.share({
        title: `Battle Echoes — ${achievementName}`,
        message: `Wlasnie odblokowalem osiagniecie "${achievementName}" (+${xp} XP) w Battle Echoes!`,
      });
    } catch {}
  },

  // Get quiz challenges
  async getChallenges(): Promise<QuizChallenge[]> {
    try {
      const raw = await AsyncStorage.getItem(CHALLENGES_KEY);
      const challenges: QuizChallenge[] = raw ? JSON.parse(raw) : [];
      // Filter out expired challenges (older than 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return challenges.filter(c =>
        c.status !== 'expired' && new Date(c.createdAt) > weekAgo
      );
    } catch {
      return [];
    }
  },

  // Create a quiz challenge
  async createChallenge(challenge: Omit<QuizChallenge, 'id' | 'status' | 'createdAt'>): Promise<QuizChallenge> {
    const newChallenge: QuizChallenge = {
      ...challenge,
      id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const challenges = await this.getChallenges();
    challenges.push(newChallenge);
    await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));
    return newChallenge;
  },

  // Complete a challenge
  async completeChallenge(challengeId: string, score: number): Promise<void> {
    const challenges = await this.getChallenges();
    const idx = challenges.findIndex(c => c.id === challengeId);
    if (idx >= 0) {
      challenges[idx].status = 'completed';
      challenges[idx].challengedScore = score;
      challenges[idx].completedAt = new Date().toISOString();
      await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));
    }
  },
};

export default socialService;
