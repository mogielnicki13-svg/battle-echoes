// ============================================================
// BATTLE ECHOES — navigation/index.tsx (GPS w Mapie)
// ============================================================
import React, { useCallback } from 'react';
import { NavigationContainer, useNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import { TabIcon } from '../components/GoldIcon';
import { useAppStore } from '../store';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList, MainTabsParamList } from './types';

import LoginScreen        from '../screens/LoginScreen';
import HomeScreen         from '../screens/HomeScreen';
import MapScreen          from '../screens/MapScreen';
import BattleDetailScreen from '../screens/BattleDetailScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import ShopScreen         from '../screens/ShopScreen';
import ArtifactsScreen    from '../screens/ArtifactsScreen';
import DownloadsScreen    from '../screens/DownloadsScreen';
import SearchScreen       from '../screens/SearchScreen';
import StatsScreen            from '../screens/StatsScreen';
import NotificationsScreen    from '../screens/NotificationsScreen';
import GPSScreen              from '../screens/GPSScreen';
import NarrationScreen        from '../screens/NarrationScreen';
import QuizScreen             from '../screens/QuizScreen';
import LeaderboardScreen      from '../screens/LeaderboardScreen';
import AchievementsScreen     from '../screens/AchievementsScreen';
import SocialScreen           from '../screens/SocialScreen';
import { BattlesScreen }      from '../screens';
import LegalScreen            from '../screens/LegalScreen';
// ── Dev-only — no analytics, not listed anywhere in UI ──────
import DeveloperSettingsScreen from '../screens/DeveloperSettingsScreen';
import HostLobbyScreen        from '../screens/classroom/HostLobbyScreen';
import HostSessionScreen      from '../screens/classroom/HostSessionScreen';
import StudentJoinScreen      from '../screens/classroom/StudentJoinScreen';
import StudentSessionScreen   from '../screens/classroom/StudentSessionScreen';
import SessionResultsScreen   from '../screens/classroom/SessionResultsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs  = createBottomTabNavigator<MainTabsParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1520',
          borderTopColor: 'rgba(212,160,23,0.3)',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
        },
        tabBarActiveTintColor:   Colors.gold,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="Home"      component={HomeScreen}      options={{ title: t('nav.home'),       tabBarIcon: ({ color }) => <TabIcon tab="home"       size={22} color={color} />, tabBarAccessibilityLabel: t('nav.home') }} />
      <Tabs.Screen name="Map"       component={MapScreen}       options={{ title: t('nav.map'),        tabBarIcon: ({ color }) => <TabIcon tab="map"        size={22} color={color} />, tabBarAccessibilityLabel: t('nav.map') }} />
      <Tabs.Screen name="Artifacts" component={ArtifactsScreen} options={{ title: t('nav.collection'), tabBarIcon: ({ color }) => <TabIcon tab="collection" size={22} color={color} />, tabBarAccessibilityLabel: t('nav.collection') }} />
      <Tabs.Screen name="Profile"   component={ProfileScreen}   options={{ title: t('nav.profile'),    tabBarIcon: ({ color }) => <TabIcon tab="files"      size={22} color={color} />, tabBarAccessibilityLabel: t('nav.profile') }} />
    </Tabs.Navigator>
  );
}

export default function AppNavigation() {
  const user = useAppStore(s => s.user);
  const navRef = useNavigationContainerRef();

  // ── First-session deep-link: po pierwszym uruchomieniu nawiguj do Grunwaldu ──
  const handleNavReady = useCallback(async () => {
    try {
      const battleId = await AsyncStorage.getItem('battle_echoes_first_nav');
      if (!battleId) return;
      // Usuń klucz — pokazujemy deep-link tylko raz
      await AsyncStorage.removeItem('battle_echoes_first_nav');
      // Małe opóźnienie — pozwól, by HomeScreen zdążył się wyrenderować
      setTimeout(() => {
        navRef.dispatch(CommonActions.navigate('BattleDetail', { battleId }));
      }, 350);
    } catch {
      // Ignoruj błędy AsyncStorage — to tylko nice-to-have
    }
  }, [navRef]);

  return (
    <NavigationContainer ref={navRef} onReady={handleNavReady}>
      <Stack.Navigator screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D1520' },
        animation: 'slide_from_right',
      }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ animation: 'slide_from_bottom' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs"     component={MainTabs} />
            <Stack.Screen name="BattleDetail" component={BattleDetailScreen} />
            <Stack.Screen name="Battles"      component={BattlesScreen} />
            <Stack.Screen name="Search"       component={SearchScreen} />
            <Stack.Screen name="Downloads"    component={DownloadsScreen} />
            <Stack.Screen name="Shop"          component={ShopScreen} />
            <Stack.Screen name="Stats"         component={StatsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="GPS"           component={GPSScreen} />
            <Stack.Screen name="Narration"     component={NarrationScreen}    options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Quiz"          component={QuizScreen}          options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Leaderboard"   component={LeaderboardScreen} />
            <Stack.Screen name="Achievements"  component={AchievementsScreen} />
            <Stack.Screen name="Social"        component={SocialScreen} />
            {/* ── Hidden developer screen (7-tap on version in Profile) ── */}
            <Stack.Screen
              name="DeveloperSettings"
              component={DeveloperSettingsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            {/* ── Classroom (Kahoot-style) screens ─── */}
            <Stack.Screen name="HostLobby"       component={HostLobbyScreen}       options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="HostSession"     component={HostSessionScreen}     options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="StudentJoin"     component={StudentJoinScreen}     options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="StudentSession"  component={StudentSessionScreen}  options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="SessionResults"  component={SessionResultsScreen}  options={{ animation: 'slide_from_bottom' }} />
            {/* ── Upgrade guest → real account (modal z RecruitPackCard) ── */}
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ animation: 'slide_from_bottom' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
