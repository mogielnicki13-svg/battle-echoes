// ============================================================
// BATTLE ECHOES — screens/index.tsx (zaktualizowany profil)
// ============================================================
import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, FlatList, Alert,
} from 'react-native';
import { Colors, Spacing, Radius } from '../constants/theme';
import { useAppStore, levelFromXP } from '../store';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../services/AnalyticsService';

const C = Colors;

// ════════════════════════════════════════════════════════════
// MAPA
// ════════════════════════════════════════════════════════════
export function MapScreen() {
  return (
    <View style={[styles.bg, styles.center]}>
      <Text style={styles.bigEmoji}>🗺</Text>
      <Text style={styles.title}>Mapa Bitew</Text>
      <Text style={styles.sub}>Tu pojawi się interaktywna mapa{'\n'}pól bitew z całego świata</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>📍 Grunwald 1410 — Polska</Text>
        <Text style={styles.cardText}>📍 Ypres 1914 — Belgia</Text>
        <Text style={styles.cardText}>📍 Waterloo 1815 — Belgia</Text>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// LISTA BITEW
// ════════════════════════════════════════════════════════════
export function BattlesScreen({ navigation }: any) {
  const { battles, canAccessBattle } = useAppStore();
  useFocusEffect(useCallback(() => { logScreenView('Battles'); }, []));

  return (
    <View style={styles.bg}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚔ Bitwy</Text>
        <Text style={styles.headerSub}>Wybierz bitwę aby odsłuchać narrację</Text>
      </View>
      <FlatList
        data={battles}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => {
          const unlocked = canAccessBattle(item.id);
          return (
            <TouchableOpacity
              style={[styles.battleCard, !unlocked && styles.battleCardLocked]}
              onPress={() => {
                if (unlocked) {
                  navigation.navigate('BattleDetail', { battleId: item.id });
                } else {
                  Alert.alert('Zablokowane', 'Ta bitwa wymaga odblokowania epoki.');
                }
              }}
              activeOpacity={0.85}
            >
              <View style={styles.battleTop}>
                <View style={styles.eraTag}>
                  <Text style={styles.eraTagText}>
                    {item.era === 'ancient'      ? '🏛 Starożytność'
                    : item.era === 'medieval'    ? '⚔ Średniowiecze'
                    : item.era === 'early_modern'? '⚓ Nowożytność'
                    : item.era === 'napoleon'    ? '🎖 Napoleon'
                    : item.era === 'ww1'         ? '🪖 I Wojna Światowa'
                    : item.era === 'ww2'         ? '✈ II Wojna Światowa'
                    : item.era}
                  </Text>
                </View>
                {!unlocked && <Text style={styles.lockIcon}>🔒</Text>}
              </View>
              <Text style={styles.battleName}>{item.name}</Text>
              <Text style={styles.battleDate}>{item.date}</Text>
              <Text style={styles.battleLoc}>📍 {item.location.name}</Text>
              <Text style={styles.battleSummary} numberOfLines={2}>{item.summary}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// SZCZEGÓŁY BITWY
// ════════════════════════════════════════════════════════════
export function BattleDetailScreen({ route, navigation }: any) {
  const { battleId } = route.params;
  const { battles } = useAppStore();
  const battle = battles.find(b => b.id === battleId);

  if (!battle) return (
    <View style={[styles.bg, styles.center]}>
      <Text style={styles.title}>Bitwa nie znaleziona</Text>
    </View>
  );

  return (
    <ScrollView style={styles.bg} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailName}>{battle.name}</Text>
        <Text style={styles.detailDate}>{battle.date}</Text>
        <Text style={styles.detailLoc}>📍 {battle.location.name}</Text>
      </View>

      <InfoBox label="OPIS"    text={battle.summary} />
      <InfoBox label="WYNIK"   text={battle.outcome} />
      <InfoBox label="STRONY"  text={battle.sides.join('\nvs.\n')} />
      <InfoBox label="DOWÓDCY" text={battle.commanders.join(' vs. ')} />

      <TouchableOpacity style={styles.playBtn} activeOpacity={0.85}>
        <Text style={styles.playBtnText}>▶  Odsłuchaj narrację</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Wróć</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ════════════════════════════════════════════════════════════
// PROFIL — z wylogowaniem
// ════════════════════════════════════════════════════════════
export function ProfileScreen() {
  const { user, signOut } = useAppStore();

  const handleSignOut = () => {
    Alert.alert('Wyloguj', 'Czy na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', style: 'destructive', onPress: signOut },
    ]);
  };

  const providerIcon = user?.provider === 'google' ? 'G'
    : user?.provider === 'apple'  ? '🍎'
    : '👤';

  return (
    <ScrollView style={styles.bg} contentContainerStyle={{ padding: 20, gap: 16 }}>
      {/* Avatar */}
      <View style={styles.profileTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'Gość'}</Text>
        {user?.email ? <Text style={styles.profileEmail}>{user.email}</Text> : null}
        <View style={styles.providerTag}>
          <Text style={styles.providerText}>{providerIcon} {user?.provider || 'guest'}</Text>
        </View>
      </View>

      {/* Statystyki */}
      <View style={styles.statsRow}>
        <StatBox icon="⚔" value={user?.listenedBattles.length || 0} label="Odsłuchane" />
        <StatBox icon="📍" value={user?.visitedBattles.length || 0}  label="Odwiedzone" />
        <StatBox icon="🏆" value={user?.coins || 0}                  label="Dukaty" />
      </View>

      {/* XP */}
      {(() => {
        const { level, currentXP, xpToNext } = levelFromXP(user?.totalXP || 0);
        return (
          <View style={styles.xpBox}>
            <Text style={styles.xpLabel}>POZIOM {level}</Text>
            <Text style={styles.xpValue}>{user?.totalXP || 0} XP</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.min(currentXP / xpToNext * 100, 100)}%` }]} />
            </View>
            <Text style={styles.xpNext}>Do następnego poziomu: {xpToNext - currentXP} XP</Text>
          </View>
        );
      })()}

      {/* Odblokowane epoki */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ODBLOKOWANE EPOKI</Text>
        {(user?.unlockedEras || []).map(era => (
          <Text key={era} style={styles.sectionText}>
            {era === 'ancient'       ? '🏛 Starożytność'
            : era === 'medieval'     ? '⚔ Średniowiecze'
            : era === 'early_modern' ? '⚓ Nowożytność'
            : era === 'napoleon'     ? '🎖 Napoleon'
            : era === 'ww1'         ? '🪖 I Wojna Światowa'
            : era === 'ww2'         ? '✈ II Wojna Światowa'
            : era}
          </Text>
        ))}
      </View>

      {/* Wyloguj */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutText}>Wyloguj się</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---- Helpery ----
function InfoBox({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

function StatBox({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: C.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  bigEmoji: { fontSize: 64, marginBottom: 16 },
  title:  { fontSize: 22, color: C.textPrimary, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub:    { fontSize: 15, color: C.textMuted, textAlign: 'center', lineHeight: 22 },
  card:   { marginTop: 24, backgroundColor: C.backgroundCard, borderRadius: 12, padding: 16, gap: 8, width: '100%', borderWidth: 1, borderColor: C.borderDefault },
  cardText: { fontSize: 15, color: C.textSecondary },

  header:      { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.borderDefault },
  headerTitle: { fontSize: 24, color: C.gold, fontWeight: '700' },
  headerSub:   { fontSize: 13, color: C.textMuted, marginTop: 4 },

  battleCard:       { backgroundColor: C.backgroundCard, borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: C.borderDefault },
  battleCardLocked: { opacity: 0.5 },
  battleTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eraTag:           { backgroundColor: C.goldLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  eraTagText:       { fontSize: 11, color: C.gold, fontWeight: '600' },
  lockIcon:         { fontSize: 16 },
  battleName:       { fontSize: 18, color: C.textPrimary, fontWeight: '700' },
  battleDate:       { fontSize: 13, color: C.gold },
  battleLoc:        { fontSize: 12, color: C.textMuted },
  battleSummary:    { fontSize: 14, color: C.textSecondary, lineHeight: 20, marginTop: 4 },

  detailHeader: { backgroundColor: C.backgroundCard, borderRadius: 14, padding: 20, gap: 6, borderWidth: 1, borderColor: C.borderGold },
  detailName:   { fontSize: 24, color: C.textPrimary, fontWeight: '700', lineHeight: 30 },
  detailDate:   { fontSize: 14, color: C.gold },
  detailLoc:    { fontSize: 13, color: C.textMuted },

  section:      { backgroundColor: C.backgroundCard, borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: C.borderDefault },
  sectionLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  sectionText:  { fontSize: 15, color: C.textSecondary, lineHeight: 22 },

  playBtn:     { backgroundColor: C.gold, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: C.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  playBtnText: { fontSize: 16, color: C.ink, fontWeight: '700' },
  backBtn:     { padding: 12, alignItems: 'center' },
  backBtnText: { fontSize: 14, color: C.textMuted },

  profileTop:    { alignItems: 'center', gap: 8, paddingVertical: 16 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: C.goldLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.gold },
  avatarText:    { fontSize: 32, color: C.gold, fontWeight: '700' },
  profileName:   { fontSize: 22, color: C.textPrimary, fontWeight: '700' },
  profileEmail:  { fontSize: 13, color: C.textMuted },
  providerTag:   { backgroundColor: C.backgroundCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: C.borderDefault },
  providerText:  { fontSize: 12, color: C.textMuted },

  statsRow: { flexDirection: 'row', gap: 12 },
  statBox:  { flex: 1, backgroundColor: C.backgroundCard, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.borderDefault },
  statIcon: { fontSize: 22 },
  statValue:{ fontSize: 22, color: C.gold, fontWeight: '700' },
  statLabel:{ fontSize: 11, color: C.textMuted },

  xpBox:  { backgroundColor: C.backgroundCard, borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: C.borderDefault },
  xpLabel:{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  xpValue:{ fontSize: 28, color: C.gold, fontWeight: '700' },
  xpBar:  { height: 6, backgroundColor: C.backgroundElevated, borderRadius: 3 },
  xpFill: { height: 6, backgroundColor: C.gold, borderRadius: 3, minWidth: 4 },
  xpNext: { fontSize: 11, color: C.textMuted },

  signOutBtn:  { borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  signOutText: { fontSize: 14, color: '#f87171', fontWeight: '600' },
});
