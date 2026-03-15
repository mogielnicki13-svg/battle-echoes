// ============================================================
// BATTLE ECHOES — MapFallbackWeb.tsx
// Zastępczy widok mapy dla przeglądarki (react-native-maps nie działa na web)
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';
import { Icon, EraIcon } from './GoldIcon';

interface Battle {
  id: string;
  name: string;
  era: string;
  date: string;
  location: { name: string; lat: number; lng: number };
}

interface Props {
  battles: Battle[];
  onBattlePress: (battleId: string) => void;
}

const ERA_COLORS: Record<string, string> = {
  ancient: '#c084fc', medieval: '#D4A017', early_modern: '#60a5fa',
  napoleon: '#4ade80', ww1: '#94a3b8', ww2: '#f87171',
};

export default function MapFallbackWeb({ battles, onBattlePress }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon id="map" size={24} color={Colors.gold} />
        <Text style={styles.headerTitle}>Mapa Bitew</Text>
        <Text style={styles.headerSub}>
          Interaktywna mapa dostępna w aplikacji mobilnej.{'\n'}
          Poniżej lista wszystkich lokalizacji.
        </Text>
      </View>

      <FlatList
        data={battles}
        keyExtractor={b => b.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const color = ERA_COLORS[item.era] ?? Colors.gold;
          return (
            <TouchableOpacity
              style={styles.battleRow}
              onPress={() => onBattlePress(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.eraIcon, { backgroundColor: `${color}20` }]}>
                <EraIcon eraId={item.era} size={18} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.battleName}>{item.name}</Text>
                <Text style={styles.battleMeta}>{item.date} · {item.location.name}</Text>
              </View>
              <Icon id="chevron_right" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    alignItems: 'center', padding: Spacing.lg, gap: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.borderDefault,
  },
  headerTitle: { fontSize: 20, color: Colors.gold, fontWeight: '700' },
  headerSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  list: { padding: Spacing.md, gap: 8 },
  battleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.backgroundCard, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: Colors.borderDefault,
  },
  eraIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  battleName: { fontSize: 14, color: Colors.textPrimary, fontWeight: '700' },
  battleMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
