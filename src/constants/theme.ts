// ============================================================
// BATTLE ECHOES — Design System v2
// Czerń + złoto jako baza. System motywów epok.
// ============================================================

import { Dimensions } from 'react-native';
const { width: SW } = Dimensions.get('window');

// ── INK — czysta czerń jako fundamentalna baza ─────────────
export const ink = '#000000';

// ════════════════════════════════════════════════════════════
// PALETA BAZOWA — Czerń + Złoto
// ════════════════════════════════════════════════════════════
export const BaseColors = {
  // Tła — głęboka czerń z subtelnymi odcieniami
  background:         '#080808',   // czysta czerń tła
  backgroundCard:     '#0f0f0f',   // karty — prawie czarne
  backgroundElevated: '#161616',   // wywyższone powierzchnie
  backgroundShimmer:  '#1a1a1a',   // shimmer efekt

  // Złoto — główny akcent
  gold:         '#C9A84C',         // prawdziwe złoto — nie żółte
  goldBright:   '#F0C040',         // złoto aktywne / hover
  goldDeep:     '#8B6914',         // ciemne złoto — akcent
  goldLight:    'rgba(201,168,76,0.12)', // złote tło
  goldGlow:     'rgba(201,168,76,0.25)', // złota poświata
  goldBorder:   'rgba(201,168,76,0.30)', // złota ramka
  goldBorderStrong: 'rgba(201,168,76,0.60)', // mocna złota ramka

  // Tekst
  textPrimary:   '#F5EDD8',        // kremowy pergamin
  textSecondary: '#9A8E7A',        // przytłumiony
  textMuted:     '#5A5040',        // bardzo przytłumiony
  textGold:      '#C9A84C',        // złoty tekst

  // Stany
  success: '#4ade80',
  warning: '#f59e0b',
  error:   '#ef4444',

  // Ramki
  borderDefault: 'rgba(255,255,255,0.06)',
  borderSubtle:  'rgba(255,255,255,0.03)',

  // Nakładki
  overlay:      'rgba(0,0,0,0.90)',
  overlayLight: 'rgba(0,0,0,0.70)',

  // Specjalne
  ink: '#000000',
  ember: '#C4400A',        // żarzące się węgle — CTA
  emberLight: '#E05A20',
  ash: '#2A2A2A',          // popiół — dividers
} as const;

// ════════════════════════════════════════════════════════════
// MOTYWY EPOK
// Każda epoka ma swój unikalny zestaw kolorów, tekstury i ambientu
// ════════════════════════════════════════════════════════════
export interface EraTheme {
  id: string;
  name: string;
  nameShort: string;
  icon: string;
  dateRange: [number, number];

  // Kolory charakterystyczne dla epoki
  primary: string;       // główny kolor akcentu
  primaryGlow: string;   // poświata głównego koloru
  primaryBorder: string; // ramka głównego koloru
  primaryLight: string;  // jasna wersja (tło)
  secondary: string;     // drugi akcent

  // Tło karty — gradient charakterystyczny dla epoki
  cardGradient: string[];

  // Ambient sound — plik audio w tle UI
  ambientSound: string | null;

  // Opis klimatu epoki
  atmosphere: string;

  // Particle/smoke color override (opcjonalne)
  smokeColor?: string;
  sparkColor?: string;

  // Freemium — true means all battles in this era are always accessible
  // even without an explicit unlock (e.g. "ancient" as the always-free sampler era)
  isFree?: boolean;
}

export const ERA_THEMES: Record<string, EraTheme> = {

  // ── STAROŻYTNOŚĆ ──────────────────────────────────────────
  ancient: {
    id: 'ancient',
    name: 'Starożytność',
    nameShort: 'Antyk',
    icon: '🏛',
    dateRange: [-800, 476],
    primary:       '#D4963A',   // brąz / złoto antyczne
    primaryGlow:   'rgba(212,150,58,0.25)',
    primaryBorder: 'rgba(212,150,58,0.40)',
    primaryLight:  'rgba(212,150,58,0.10)',
    secondary:     '#8B4513',   // terakota
    cardGradient:  ['#1A0F00', '#0F0800'],
    ambientSound:  'ambient_ancient.mp3',  // wiatr, morze, miecze
    atmosphere:    'Brąz, marmur, pył imperium',
    smokeColor:    '#D4963A',
    sparkColor:    '#FFD700',
    isFree:        true,  // ← always free — sampler era for new users
  },

  // ── ŚREDNIOWIECZE ─────────────────────────────────────────
  medieval: {
    id: 'medieval',
    name: 'Średniowiecze',
    nameShort: 'Średniowiecze',
    icon: '⚔',
    dateRange: [476, 1500],
    primary:       '#C9A84C',   // złoto medievalne
    primaryGlow:   'rgba(201,168,76,0.25)',
    primaryBorder: 'rgba(201,168,76,0.40)',
    primaryLight:  'rgba(201,168,76,0.10)',
    secondary:     '#8B1A1A',   // głęboka czerwień — krew i herby
    cardGradient:  ['#120A00', '#0A0600'],
    ambientSound:  'ambient_medieval.mp3', // konie, miecze, bębny
    atmosphere:    'Stal, krew i modlitwa',
    smokeColor:    '#C9A84C',
    sparkColor:    '#FFD700',
  },

  // ── NOWOŻYTNOŚĆ ───────────────────────────────────────────
  early_modern: {
    id: 'early_modern',
    name: 'Nowożytność',
    nameShort: 'Nowożytność',
    icon: '⚓',
    dateRange: [1500, 1789],
    primary:       '#B8860B',   // ciemne złoto — miedź
    primaryGlow:   'rgba(184,134,11,0.25)',
    primaryBorder: 'rgba(184,134,11,0.40)',
    primaryLight:  'rgba(184,134,11,0.10)',
    secondary:     '#4A6741',   // leśna zieleń
    cardGradient:  ['#0A0F08', '#060A05'],
    ambientSound:  'ambient_early_modern.mp3', // morze, armaty, wiatr
    atmosphere:    'Proch, morze i imperium',
    smokeColor:    '#8B7355',
    sparkColor:    '#FFA500',
  },

  // ── NAPOLEON ─────────────────────────────────────────────
  napoleon: {
    id: 'napoleon',
    name: 'Era Napoleońska',
    nameShort: 'Napoleon',
    icon: '🎖',
    dateRange: [1789, 1815],
    primary:       '#1B3A6B',   // granat — mundury napoleońskie
    primaryGlow:   'rgba(27,58,107,0.30)',
    primaryBorder: 'rgba(27,58,107,0.50)',
    primaryLight:  'rgba(27,58,107,0.12)',
    secondary:     '#C9A84C',   // złoto — epolety
    cardGradient:  ['#050A14', '#030710'],
    ambientSound:  'ambient_napoleon.mp3', // armaty, bębny, fanfary
    atmosphere:    'Proch armatni i chwała',
    smokeColor:    '#4A6B8B',
    sparkColor:    '#FFD700',
  },

  // ── I WOJNA ŚWIATOWA ──────────────────────────────────────
  ww1: {
    id: 'ww1',
    name: 'I Wojna Światowa',
    nameShort: 'Wielka Wojna',
    icon: '🪖',
    dateRange: [1914, 1918],
    primary:       '#6B7C5A',   // khaki — okopy
    primaryGlow:   'rgba(107,124,90,0.25)',
    primaryBorder: 'rgba(107,124,90,0.40)',
    primaryLight:  'rgba(107,124,90,0.10)',
    secondary:     '#8B3A3A',   // ciemna czerwień
    cardGradient:  ['#080A06', '#050704'],
    ambientSound:  'ambient_ww1.mp3',  // artyleria, deszcz, okopy
    atmosphere:    'Błoto, druty i salwy artyleryjskie',
    smokeColor:    '#6B7C5A',
    sparkColor:    '#FF6600',
  },

  // ── II WOJNA ŚWIATOWA ─────────────────────────────────────
  ww2: {
    id: 'ww2',
    name: 'II Wojna Światowa',
    nameShort: 'II WŚ',
    icon: '✈',
    dateRange: [1939, 1945],
    primary:       '#3A5F3A',   // wojskowa zieleń
    primaryGlow:   'rgba(58,95,58,0.25)',
    primaryBorder: 'rgba(58,95,58,0.40)',
    primaryLight:  'rgba(58,95,58,0.10)',
    secondary:     '#8B6914',   // złoto — medale
    cardGradient:  ['#060906', '#040604'],
    ambientSound:  'ambient_ww2.mp3',  // samoloty, eksplozje, radio
    atmosphere:    'Stal, ogień i determinacja',
    smokeColor:    '#4A5A4A',
    sparkColor:    '#FF4400',
  },

} as const;

// Domyślny motyw — Średniowiecze (Grunwald)
export const DEFAULT_ERA_THEME = ERA_THEMES.medieval;

// ════════════════════════════════════════════════════════════
// KOLORY EKSPORTOWANE (kompatybilność wsteczna)
// ════════════════════════════════════════════════════════════
export const Colors = {
  ...BaseColors,
  // Aliasy dla kompatybilności
  rust:        BaseColors.ember,
  rustLight:   BaseColors.emberLight,
  sepia:       BaseColors.goldDeep,
  nearby:      BaseColors.ember,
  // Aliasy ramek — używane przez ekrany
  borderGold:  BaseColors.goldBorder,        // 'rgba(201,168,76,0.30)'
  borderGoldStrong: BaseColors.goldBorderStrong, // 'rgba(201,168,76,0.60)'
} as const;

// ════════════════════════════════════════════════════════════
// TYPOGRAFIA
// ════════════════════════════════════════════════════════════
export const Typography = {
  fontDisplay: 'Cinzel',       // Nagłówki — historyczny serif
  fontBody:    'CrimsonPro',   // Treść — elegancki serif
  fontMono:    'JetBrainsMono', // Statystyki — mono

  sizes: {
    xs:   10,
    sm:   12,
    md:   14,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },
} as const;

// ════════════════════════════════════════════════════════════
// SPACING
// ════════════════════════════════════════════════════════════
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const Radius = {
  sm:   6,
  md:   10,
  lg:   16,
  xl:   22,
  full: 999,
} as const;

// ════════════════════════════════════════════════════════════
// IKONY — spójny zestaw emoji zastąpiony SVG-ready stringami
// Każda kategoria ma jeden styl: bold geometric
// ════════════════════════════════════════════════════════════
export const Icons = {
  // Nawigacja
  home:       '⌂',
  map:        '◈',
  collection: '◆',
  profile:    '◉',
  radar:      '◎',

  // Epoki
  ancient:      '𝌆',
  medieval:     '✦',
  early_modern: '⚓',
  napoleon:     '✶',
  ww1:          '✠',
  ww2:          '✈',

  // Akcje
  play:     '▶',
  pause:    '⏸',
  unlock:   '◈',
  lock:     '◆',
  download: '↓',
  share:    '↗',
  back:     '←',
  close:    '✕',

  // Nagrody
  xp:       '✦',
  coin:     '◈',
  artifact: '◆',
  battle:   '✦',

  // GPS
  location: '◎',
  compass:  '⊕',
} as const;

// ════════════════════════════════════════════════════════════
// SHADOWS — złote cienie zamiast czarnych
// ════════════════════════════════════════════════════════════
export const Shadows = {
  card: {
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  cardActive: {
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  }),
} as const;

// ════════════════════════════════════════════════════════════
// ERA COLORS — kolory per epoka dla markerów mapy i tagów
// ════════════════════════════════════════════════════════════
export const ERA_COLORS: Record<string, string> = {
  ancient:      '#D4963A',
  medieval:     '#C9A84C',
  early_modern: '#B8860B',
  napoleon:     '#4A7BC9',
  ww1:          '#6B7C5A',
  ww2:          '#3A5F3A',
};

export const ERA_ICONS: Record<string, string> = {
  ancient:      '🏛',
  medieval:     '⚔',
  early_modern: '⚓',
  napoleon:     '🎖',
  ww1:          '🪖',
  ww2:          '✈',
};

// Aliasy dla wstecznej kompatybilności z ERAS
export const ERAS = [
  { id: 'ancient',      label: 'Starożytność',    icon: '🏛', dateRange: [-800, 476],  color: ERA_COLORS.ancient },
  { id: 'medieval',     label: 'Średniowiecze',   icon: '⚔',  dateRange: [476, 1500],  color: ERA_COLORS.medieval },
  { id: 'early_modern', label: 'Nowożytność',     icon: '⚓',  dateRange: [1500, 1789], color: ERA_COLORS.early_modern },
  { id: 'napoleon',     label: 'Era Napoleońska', icon: '🎖',  dateRange: [1789, 1815], color: ERA_COLORS.napoleon },
  { id: 'ww1',          label: 'I Wojna Światowa', icon: '🪖', dateRange: [1914, 1918], color: ERA_COLORS.ww1 },
  { id: 'ww2',          label: 'II Wojna Światowa', icon: '✈', dateRange: [1939, 1945], color: ERA_COLORS.ww2 },
] as const;

export type EraId = keyof typeof ERA_THEMES;
