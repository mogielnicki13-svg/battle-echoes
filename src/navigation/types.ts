// ============================================================
// BATTLE ECHOES — navigation/types.ts
// Type-safe navigation for all screens
// ============================================================
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ── Main Tab Navigator ──────────────────────────────────────
export type MainTabsParamList = {
  Home:      undefined;
  Map:       undefined;
  Artifacts: undefined;
  Profile:   undefined;
};

// ── Root Stack Navigator ────────────────────────────────────
export type RootStackParamList = {
  // Auth
  Login:              undefined;
  Legal:              { type?: 'terms' | 'privacy' };

  // Main tabs (nested navigator)
  MainTabs:           NavigatorScreenParams<MainTabsParamList>;

  // Battle flow
  BattleDetail:       { battleId: string };
  Battles:            undefined;
  Narration:          { battleId: string; initialPerspective?: 'narrator' | 'side_a' | 'side_b' | 'mix' };
  Quiz:               { battleId: string; battleName: string; challengeId?: string };

  // Utility screens
  Search:             undefined;
  Downloads:          undefined;
  Shop:               undefined;
  Stats:              undefined;
  Notifications:      undefined;
  GPS:                undefined;
  Leaderboard:        undefined;
  Achievements:       undefined;
  Social:             undefined;

  // Dev
  DeveloperSettings:  undefined;

  // Classroom (Kahoot-style)
  HostLobby:          { sessionId: string; pin: string; battleId: string; battleName: string };
  HostSession:        { sessionId: string; pin: string; battleId: string; battleName: string };
  StudentJoin:        undefined;
  StudentSession:     { sessionId: string; userId: string; userName: string };
  SessionResults:     { sessionId: string; isHost: boolean; userId?: string };
};

// ── Screen Props shortcuts ──────────────────────────────────
// Usage: const MyScreen = ({ navigation, route }: ScreenProps<'BattleDetail'>) => { ... }
export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof MainTabsParamList> =
  BottomTabScreenProps<MainTabsParamList, T>;

// ── Global declaration for useNavigation() ──────────────────
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
