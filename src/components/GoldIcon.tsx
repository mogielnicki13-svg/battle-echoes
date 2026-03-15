// ============================================================
// BATTLE ECHOES — GoldIcon.tsx
// Spójny system ikon w stylu "Burnished Gold / Patinated Metal"
// Używa @expo/vector-icons (MaterialCommunityIcons + Ionicons)
// ============================================================
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

// ── Typ ikony ─────────────────────────────────────────────
export type IconLib = 'mci' | 'ion';

export interface GoldIconProps {
  name: string;
  lib?: IconLib;
  size?: number;
  color?: string;             // nadpisuje domyślny kolor
  style?: ViewStyle;
  withBackground?: boolean;   // ciemne metalowe tło (domyślnie false)
  bgColor?: string;           // kolor tła (domyślnie dark bronze)
}

// ── Gotowe warianty na każdą erę ──────────────────────────
export const ERA_ICON_DEFS: Record<string, { name: string; lib: IconLib }> = {
  all:          { name: 'earth',           lib: 'mci' },
  ancient:      { name: 'bank',            lib: 'mci' }, // kolumny/świątynia
  medieval:     { name: 'sword',           lib: 'mci' }, // miecz
  early_modern: { name: 'anchor',          lib: 'mci' }, // kotwica
  napoleon:     { name: 'crown',           lib: 'mci' }, // korona napoleońska
  ww1:          { name: 'shield',          lib: 'mci' }, // tarcza/front
  ww2:          { name: 'airplane',        lib: 'mci' }, // samolot
};

// ── Główny komponent ikony ────────────────────────────────
export default function GoldIcon({
  name, lib = 'mci', size = 20, color, style, withBackground = false, bgColor,
}: GoldIconProps) {
  const IconComponent = lib === 'mci' ? MaterialCommunityIcons : Ionicons;

  if (withBackground) {
    return (
      <View style={[
        medallionStyles.wrap,
        { width: size + 16, height: size + 16, borderRadius: (size + 16) / 4 },
        bgColor ? { backgroundColor: bgColor } : null,
        style,
      ]}>
        {/* głębszy cień wewnętrzny (symulacja bevel) */}
        <View style={[medallionStyles.bevel, { borderRadius: (size + 16) / 4 - 1 }]} />
        <IconComponent
          name={name as any}
          size={size}
          color={color ?? '#C9A84C'}
          style={{ zIndex: 1 }}
        />
      </View>
    );
  }

  return (
    <IconComponent
      name={name as any}
      size={size}
      color={color ?? '#C9A84C'}
      style={style as any}
    />
  );
}

// ── Ikona epoki (skrót) ───────────────────────────────────
export function EraIcon({
  eraId, size = 16, color, active = false,
}: {
  eraId: string; size?: number; color?: string; active?: boolean;
}) {
  const def = ERA_ICON_DEFS[eraId] ?? ERA_ICON_DEFS.all;
  return (
    <GoldIcon
      name={def.name}
      lib={def.lib}
      size={size}
      color={color ?? (active ? '#C9A84C' : '#7a6235')}
    />
  );
}

// ── Medallion (ikona w metalowym tle) ─────────────────────
export function MedallionIcon({
  eraId, size = 22, color, bgColor, style,
}: {
  eraId: string; size?: number; color?: string; bgColor?: string; style?: ViewStyle;
}) {
  const def = ERA_ICON_DEFS[eraId] ?? ERA_ICON_DEFS.all;
  return (
    <GoldIcon
      name={def.name}
      lib={def.lib}
      size={size}
      color={color}
      withBackground
      bgColor={bgColor}
      style={style}
    />
  );
}

// ── Tabbar icon helper ────────────────────────────────────
export type TabIconName =
  | 'home' | 'map' | 'collection' | 'files'
  | 'search' | 'shop' | 'stats' | 'downloads' | 'notifications';

const TAB_ICON_DEFS: Record<TabIconName, { name: string; lib: IconLib }> = {
  home:          { name: 'home-variant',       lib: 'mci' },
  map:           { name: 'map',                lib: 'mci' },
  collection:    { name: 'treasure-chest',     lib: 'mci' },
  files:         { name: 'clipboard-text',     lib: 'mci' },
  search:        { name: 'magnify',            lib: 'mci' },
  shop:          { name: 'gift',               lib: 'mci' },
  stats:         { name: 'chart-bar',          lib: 'mci' },
  downloads:     { name: 'download',           lib: 'mci' },
  notifications: { name: 'bell',               lib: 'mci' },
};

export function TabIcon({
  tab, size = 22, color,
}: {
  tab: TabIconName; size?: number; color?: string;
}) {
  const def = TAB_ICON_DEFS[tab];
  return <GoldIcon name={def.name} lib={def.lib} size={size} color={color} />;
}

// ── Słownik ikon akcji / statusów / UI ───────────────────
// Używany w całej aplikacji zamiast emoji.
// Klucz = semantyczna nazwa, wartość = {name, lib} dla GoldIcon.
export const UI_ICONS: Record<string, { name: string; lib: IconLib }> = {
  // Nawigacja / akcje
  chevron_right:   { name: 'chevron-right',         lib: 'mci' },
  chevron_left:    { name: 'chevron-left',           lib: 'mci' },
  close:           { name: 'close',                  lib: 'mci' },
  refresh:         { name: 'refresh',                lib: 'mci' },
  search:          { name: 'magnify',                lib: 'mci' },
  // Status
  check:           { name: 'check-circle-outline',   lib: 'mci' },
  check_solid:     { name: 'check-circle',           lib: 'mci' },
  lock:            { name: 'lock',                   lib: 'mci' },
  lock_open:       { name: 'lock-open-variant',      lib: 'mci' },
  alert:           { name: 'alert',                  lib: 'mci' },
  info:            { name: 'information-outline',    lib: 'mci' },
  // Ekonomia
  coin:            { name: 'hand-coin',              lib: 'mci' },
  coins:           { name: 'circle-multiple',        lib: 'mci' },
  diamond:         { name: 'diamond-stone',          lib: 'mci' },
  gift:            { name: 'gift-open',              lib: 'mci' },
  // Komunikacja / media
  bell:            { name: 'bell',                   lib: 'mci' },
  bell_off:        { name: 'bell-off',               lib: 'mci' },
  microphone:      { name: 'microphone',             lib: 'mci' },
  headphones:      { name: 'headphones',             lib: 'mci' },
  radio:           { name: 'radio-tower',            lib: 'mci' },
  volume_high:     { name: 'volume-high',            lib: 'mci' },
  comment:         { name: 'comment-text-outline',   lib: 'mci' },
  // Czas
  timer:           { name: 'timer-outline',          lib: 'mci' },
  timer_sand:      { name: 'timer-sand',             lib: 'mci' },
  clock:           { name: 'clock-outline',          lib: 'mci' },
  alarm:           { name: 'alarm',                  lib: 'mci' },
  calendar:        { name: 'calendar',               lib: 'mci' },
  // Nagrody / osiągnięcia
  star:            { name: 'star',                   lib: 'mci' },
  star_outline:    { name: 'star-outline',           lib: 'mci' },
  trophy:          { name: 'trophy',                 lib: 'mci' },
  medal:           { name: 'medal',                  lib: 'mci' },
  fire:            { name: 'fire',                   lib: 'mci' },
  lightning:       { name: 'lightning-bolt',         lib: 'mci' },
  crown:           { name: 'crown',                  lib: 'mci' },
  sparkle:         { name: 'star-four-points',       lib: 'mci' },
  // Militaria / historia
  sword:           { name: 'sword',                  lib: 'mci' },
  shield:          { name: 'shield',                 lib: 'mci' },
  castle:          { name: 'castle',                 lib: 'mci' },
  cannon:          { name: 'bomb',                   lib: 'mci' },
  // Artefakty / kolekcja
  artifact:        { name: 'treasure-chest',         lib: 'mci' },
  scroll:          { name: 'scroll-text',            lib: 'mci' },
  pot:             { name: 'pot-mix',                lib: 'mci' },
  // Mapy / lokalizacja
  map_marker:      { name: 'map-marker',             lib: 'mci' },
  map:             { name: 'map',                    lib: 'mci' },
  compass:         { name: 'compass-rose',           lib: 'mci' },
  // UI
  account:         { name: 'account',                lib: 'mci' },
  shuffle:         { name: 'shuffle-variant',        lib: 'mci' },
  chart:           { name: 'chart-bar',              lib: 'mci' },
  bookshelf:       { name: 'bookshelf',              lib: 'mci' },
  school:          { name: 'school',                 lib: 'mci' },
  download:        { name: 'download',               lib: 'mci' },
  trash:           { name: 'trash-can-outline',      lib: 'mci' },
  // Brand
  google:          { name: 'google',                 lib: 'mci' },
  apple:           { name: 'apple',                  lib: 'mci' },
};

// Shortcut: renderuje ikonę UI po kluczu semantycznym
export function Icon({
  id, size = 18, color, style,
}: {
  id: keyof typeof UI_ICONS; size?: number; color?: string; style?: any;
}) {
  const def = UI_ICONS[id] ?? UI_ICONS.info;
  return <GoldIcon name={def.name} lib={def.lib} size={size} color={color} style={style} />;
}

// ── Quick Action helper ───────────────────────────────────
export type QuickActionId =
  | 'map' | 'search' | 'collection' | 'downloads' | 'stats' | 'shop';

const QUICK_ICON_DEFS: Record<QuickActionId, { name: string; lib: IconLib }> = {
  map:        { name: 'map-legend',     lib: 'mci' },
  search:     { name: 'magnify',        lib: 'mci' },
  collection: { name: 'diamond-stone',  lib: 'mci' },
  downloads:  { name: 'download-box',   lib: 'mci' },
  stats:      { name: 'chart-areaspline', lib: 'mci' },
  shop:       { name: 'gift-open',      lib: 'mci' },
};

export function QuickActionIcon({
  id, size = 24, color,
}: {
  id: QuickActionId; size?: number; color?: string;
}) {
  const def = QUICK_ICON_DEFS[id];
  return <GoldIcon name={def.name} lib={def.lib} size={size} color={color} />;
}

// ── Ducat Icon — spójny symbol waluty ─────────────────────
// Zastępuje emoji 🪙 we wszystkich komponentach UI.
// Renderuje jako złota ikona monety z opcjonalnym tłem.
export function DucatIcon({
  size = 16, color, style, withBg = false,
}: {
  size?: number; color?: string; style?: ViewStyle; withBg?: boolean;
}) {
  return (
    <GoldIcon
      name="hand-coin"
      lib="mci"
      size={size}
      color={color ?? '#D4A017'}
      withBackground={withBg}
      bgColor={withBg ? '#1a1208' : undefined}
      style={style}
    />
  );
}

// ── Style ─────────────────────────────────────────────────
const medallionStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1208',   // ciemny spiżowy brąz
    borderWidth: 1.5,
    borderColor: '#4a3810',       // ciemne złoto — krawędź
    // cień zewnętrzny
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'visible',
  },
  bevel: {
    position: 'absolute',
    top: 1, left: 1, right: 1, bottom: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: 'rgba(201,168,76,0.25)',  // jasny brzeg — górna bevel
    borderLeftColor: 'rgba(201,168,76,0.15)',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.5)',     // ciemny brzeg — dolna bevel
    borderRightColor: 'rgba(0,0,0,0.4)',
  },
});
