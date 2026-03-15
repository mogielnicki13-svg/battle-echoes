// ============================================================
// BATTLE ECHOES — Avatar Data
// Historical commander portraits / busts as user avatars
// ============================================================
import { EraId } from '../constants/theme';

export type AvatarRarity = 'common' | 'rare' | 'legendary';

export interface Avatar {
  id: string;
  name: string;              // Commander's full name
  title: string;             // Short title/epithet
  era: EraId;
  rarity: AvatarRarity;
  price: number;             // 0 = free / earned
  /** How to unlock (if not purchasable): 'purchase' | battle ID | achievement ID */
  unlockSource: 'purchase' | 'default' | string;
  /** Initials for fallback display (when no image) */
  initials: string;
  /** MCI icon name for styled fallback */
  icon: string;
  /** Local image require() — set when asset exists in assets/avatars/ */
  image?: number;
}

// ── Rarity colors ──────────────────────────────────────────
export const AVATAR_RARITY_COLORS: Record<AvatarRarity, string> = {
  common:    '#9ca3af',
  rare:      '#60a5fa',
  legendary: '#fbbf24',
};

// ── Avatar definitions ─────────────────────────────────────
// Images: place PNGs in assets/avatars/{id}.png and uncomment the image field.
// The fallback (initials + era color + icon) works without images.
export const AVATARS: Avatar[] = [
  // ── DEFAULT (free) ──────────────────────────────────────
  {
    id: 'default_soldier',
    name: 'Nieznany Żołnierz',
    title: 'Początkujący rekrut',
    era: 'medieval',
    rarity: 'common',
    price: 0,
    unlockSource: 'default',
    initials: 'ŻR',
    icon: 'account',
  },

  // ── ANCIENT ─────────────────────────────────────────────
  {
    id: 'alexander',
    name: 'Aleksander Wielki',
    title: 'Król Macedonii',
    era: 'ancient',
    rarity: 'legendary',
    price: 500,
    unlockSource: 'purchase',
    initials: 'AW',
    icon: 'crown',
  },
  {
    id: 'leonidas',
    name: 'Leonidas I',
    title: 'Król Sparty',
    era: 'ancient',
    rarity: 'rare',
    price: 300,
    unlockSource: 'purchase',
    initials: 'LI',
    icon: 'shield',
  },
  {
    id: 'caesar',
    name: 'Juliusz Cezar',
    title: 'Dyktator Rzymu',
    era: 'ancient',
    rarity: 'legendary',
    price: 500,
    unlockSource: 'purchase',
    initials: 'JC',
    icon: 'pillar',
  },
  {
    id: 'hannibal',
    name: 'Hannibal Barka',
    title: 'Strateg Kartaginy',
    era: 'ancient',
    rarity: 'rare',
    price: 300,
    unlockSource: 'purchase',
    initials: 'HB',
    icon: 'elephant',
  },

  // ── MEDIEVAL ────────────────────────────────────────────
  {
    id: 'jagiello',
    name: 'Władysław II Jagiełło',
    title: 'Król Polski',
    era: 'medieval',
    rarity: 'legendary',
    price: 0,
    unlockSource: 'grunwald-1410',
    initials: 'WJ',
    icon: 'crown',
  },
  {
    id: 'jungingen',
    name: 'Ulrich von Jungingen',
    title: 'Wielki Mistrz Krzyżacki',
    era: 'medieval',
    rarity: 'rare',
    price: 0,
    unlockSource: 'grunwald-1410',
    initials: 'UJ',
    icon: 'sword-cross',
  },
  {
    id: 'richard_lionheart',
    name: 'Ryszard Lwie Serce',
    title: 'Król Anglii',
    era: 'medieval',
    rarity: 'rare',
    price: 300,
    unlockSource: 'purchase',
    initials: 'RL',
    icon: 'sword',
  },
  {
    id: 'saladin',
    name: 'Saladyn',
    title: 'Sułtan Egiptu i Syrii',
    era: 'medieval',
    rarity: 'legendary',
    price: 500,
    unlockSource: 'purchase',
    initials: 'SL',
    icon: 'star-crescent',
  },
  {
    id: 'joan_of_arc',
    name: 'Joanna d\'Arc',
    title: 'Dziewica Orleańska',
    era: 'medieval',
    rarity: 'legendary',
    price: 500,
    unlockSource: 'purchase',
    initials: 'JA',
    icon: 'flag-variant',
  },

  // ── EARLY MODERN ────────────────────────────────────────
  {
    id: 'sobieski',
    name: 'Jan III Sobieski',
    title: 'Król Polski',
    era: 'early_modern',
    rarity: 'legendary',
    price: 0,
    unlockSource: 'vienna-1683',
    initials: 'JS',
    icon: 'horseshoe',
  },
  {
    id: 'drake',
    name: 'Sir Francis Drake',
    title: 'Admirał Anglii',
    era: 'early_modern',
    rarity: 'rare',
    price: 300,
    unlockSource: 'purchase',
    initials: 'FD',
    icon: 'anchor',
  },
  {
    id: 'gustavus',
    name: 'Gustaw II Adolf',
    title: 'Król Szwecji',
    era: 'early_modern',
    rarity: 'rare',
    price: 300,
    unlockSource: 'purchase',
    initials: 'GA',
    icon: 'chess-king',
  },

  // ── NAPOLEONIC ──────────────────────────────────────────
  {
    id: 'napoleon',
    name: 'Napoleon Bonaparte',
    title: 'Cesarz Francuzów',
    era: 'napoleon',
    rarity: 'legendary',
    price: 0,
    unlockSource: 'waterloo-1815',
    initials: 'NB',
    icon: 'crown',
  },
  {
    id: 'wellington',
    name: 'Książę Wellington',
    title: 'Marszałek Polny',
    era: 'napoleon',
    rarity: 'rare',
    price: 0,
    unlockSource: 'waterloo-1815',
    initials: 'AW',
    icon: 'shield-star',
  },
  {
    id: 'kutuzov',
    name: 'Michał Kutuzow',
    title: 'Feldmarszałek Rosji',
    era: 'napoleon',
    rarity: 'rare',
    price: 300,
    unlockSource: 'purchase',
    initials: 'MK',
    icon: 'shield-cross',
  },
  {
    id: 'dabrowski',
    name: 'Jan Henryk Dąbrowski',
    title: 'Generał Legionów',
    era: 'napoleon',
    rarity: 'rare',
    price: 250,
    unlockSource: 'purchase',
    initials: 'JD',
    icon: 'bugle',
  },

  // ── WWI ─────────────────────────────────────────────────
  {
    id: 'pilsudski',
    name: 'Józef Piłsudski',
    title: 'Marszałek Polski',
    era: 'ww1',
    rarity: 'legendary',
    price: 0,
    unlockSource: 'warsaw-1920',
    initials: 'JP',
    icon: 'star',
  },
  {
    id: 'foch',
    name: 'Ferdinand Foch',
    title: 'Naczelny Wódz Ententy',
    era: 'ww1',
    rarity: 'rare',
    price: 300,
    unlockSource: 'purchase',
    initials: 'FF',
    icon: 'medal',
  },
  {
    id: 'mustafa_kemal',
    name: 'Mustafa Kemal Atatürk',
    title: 'Bohater Gallipoli',
    era: 'ww1',
    rarity: 'legendary',
    price: 500,
    unlockSource: 'purchase',
    initials: 'MK',
    icon: 'star-crescent',
  },

  // ── WWII ────────────────────────────────────────────────
  {
    id: 'anders',
    name: 'Władysław Anders',
    title: 'Generał II Korpusu',
    era: 'ww2',
    rarity: 'rare',
    price: 0,
    unlockSource: 'monte-cassino-1944',
    initials: 'WA',
    icon: 'shield-star',
  },
  {
    id: 'eisenhower',
    name: 'Dwight D. Eisenhower',
    title: 'Naczelny Dowódca Aliantów',
    era: 'ww2',
    rarity: 'legendary',
    price: 500,
    unlockSource: 'purchase',
    initials: 'DE',
    icon: 'star-circle',
  },
  {
    id: 'montgomery',
    name: 'Bernard Montgomery',
    title: 'Marszałek Polny',
    era: 'ww2',
    rarity: 'rare',
    price: 300,
    unlockSource: 'purchase',
    initials: 'BM',
    icon: 'tank',
  },
  {
    id: 'zhukov',
    name: 'Gieorgij Żukow',
    title: 'Marszałek ZSRR',
    era: 'ww2',
    rarity: 'legendary',
    price: 500,
    unlockSource: 'purchase',
    initials: 'GŻ',
    icon: 'star',
  },
  {
    id: 'churchill',
    name: 'Winston Churchill',
    title: 'Premier Wielkiej Brytanii',
    era: 'ww2',
    rarity: 'legendary',
    price: 500,
    unlockSource: 'purchase',
    initials: 'WC',
    icon: 'cigar',
  },
];

// ── Helpers ────────────────────────────────────────────────
export function getAvatar(id: string): Avatar {
  return AVATARS.find(a => a.id === id) ?? AVATARS[0];
}

export function getAvatarsByEra(era: EraId | 'all'): Avatar[] {
  if (era === 'all') return AVATARS;
  return AVATARS.filter(a => a.era === era);
}

export function isAvatarEarnedFromBattle(avatar: Avatar): boolean {
  return avatar.unlockSource !== 'purchase' && avatar.unlockSource !== 'default';
}
