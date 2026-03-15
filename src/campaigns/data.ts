// ============================================================
// BATTLE ECHOES — campaigns/data.ts
//
// SKALOWALNOŚĆ: Aby dodać bitwę do kampanii wystarczy:
//   1. Dodać jej ID do tablicy battleIds w odpowiedniej kampanii poniżej.
//   2. Żaden kod UI nie wymaga zmian.
//
// Aby dodać NOWĄ kampanię wystarczy dodać obiekt do SEED_CAMPAIGNS.
// ============================================================
import type { EraId } from '../constants/theme';

// ── Model ────────────────────────────────────────────────────
export interface Campaign {
  id:          string;      // 'napoleon-pack' — unikalny klucz
  name:        string;      // 'Kampania Napoleońska'
  shortName:   string;      // 'Napoleon' — skrót w UI
  tagline:     string;      // krótki podtytuł
  description: string;      // pełny opis
  battleIds:   string[];    // ← DODAJ TUTAJ nowe bitwy, zero zmian w UI
  era:         EraId;       // podstawowa epoka (kolor / motyw)
  price:       number;      // cena w Dukatach
  originalPrice?: number;   // przekreślona cena (show "save X%")
  sortOrder:   number;      // kolejność wyświetlania
  isActive:    boolean;     // false = ukryte (coming soon)
  badgeIcon:   string;      // ikona MCO (GoldIcon)
  accentColor: string;      // kolor akcentu (gradient, obramówka)
}

// ── Dane startowe ─────────────────────────────────────────────
// Łatwe w rozszerzaniu — nie zmienia się żaden komponent UI.
export const SEED_CAMPAIGNS: Campaign[] = [

  // ────────────────────────────────────────────────────────────
  // 1. KAMPANIA NAPOLEOŃSKA
  // Dodaj np. 'jena-1806' lub 'austerlitz-deeper' → battleIds
  // ────────────────────────────────────────────────────────────
  {
    id:           'napoleon-pack',
    name:         'Kampania Napoleońska',
    shortName:    'Napoleon',
    tagline:      'Trzy bitwy, które zmieniły Europę',
    description:  'Śledź drogę Napoleona przez trzy przełomowe starcia — od szczytu potęgi w Austerlitz, przez krwawe pole pod Borodino, aż po ostateczny zmierzch pod Waterloo.',
    battleIds:    ['austerlitz-1805', 'borodino-1812', 'waterloo-1815'],
    // ↑ ROZSZERZ TUTAJ — np. dodaj 'jena-1806', 'wagram-1809'
    era:          'napoleon',
    price:        350,
    originalPrice: 450,    // 3 × 150 zł = 450 → oszczędzasz 22%
    sortOrder:    1,
    isActive:     true,
    badgeIcon:    'crown',
    accentColor:  '#4a7cc9',
  },

  // ────────────────────────────────────────────────────────────
  // 2. STAROŻYTNE EPOPEJE
  // ────────────────────────────────────────────────────────────
  {
    id:           'ancient-pack',
    name:         'Starożytne Epopeje',
    shortName:    'Starożytność',
    tagline:      'Gdzie zrodziła się cywilizacja i umarła wolność',
    description:  'Od wąwozu Termopil po równiny Kanny — trzy bitwy, które ukształtowały zachodnią historię na tysiąclecia.',
    battleIds:    ['thermopylae-480bc', 'marathon-490bc', 'cannae-216bc'],
    // ↑ ROZSZERZ TUTAJ — np. dodaj 'gaugamela-331bc', 'zama-202bc'
    era:          'ancient',
    price:        300,
    originalPrice: 450,
    sortOrder:    2,
    isActive:     true,
    badgeIcon:    'bank',
    accentColor:  '#c084fc',
  },

  // ────────────────────────────────────────────────────────────
  // 3. PIEKŁO II WOJNY
  // ────────────────────────────────────────────────────────────
  {
    id:           'ww2-pack',
    name:         'Piekło II Wojny Światowej',
    shortName:    'II Wojna',
    tagline:      'Największy konflikt w dziejach ludzkości',
    description:  'Stalingrad, Bitwa o Anglię, Kursk — trzy starcia, które zadecydowały o losach świata.',
    battleIds:    ['stalingrad-1942', 'britain-1940', 'kursk-1943'],
    era:          'ww2',
    price:        350,
    originalPrice: 450,
    sortOrder:    3,
    isActive:     true,
    badgeIcon:    'airplane',
    accentColor:  '#ef4444',
  },

  // ────────────────────────────────────────────────────────────
  // PRZYKŁAD: kampania wyłączona (coming soon)
  // ────────────────────────────────────────────────────────────
  {
    id:           'medieval-pack',
    name:         'Rycerze Średniowiecza',
    shortName:    'Średniowiecze',
    tagline:      'Stal, krew i honor',
    description:  'Bitwy, które kształtowały Europę w erze rycerzy i zamków.',
    battleIds:    ['grunwald-1410', 'agincourt-1415'],
    era:          'medieval',
    price:        250,
    originalPrice: 300,
    sortOrder:    4,
    isActive:     false, // Coming soon — tylko grunwald w selekcji
    badgeIcon:    'sword',
    accentColor:  '#D4A017',
  },
];

// ── Pomocnicze ────────────────────────────────────────────────
/** Znajdź kampanię dla danego battleId. O(n) — raz obliczane. */
export function findCampaignForBattle(
  campaigns: Campaign[],
  battleId: string,
): Campaign | undefined {
  return campaigns.find(c => c.isActive && c.battleIds.includes(battleId));
}

/** Oblicz procent oszczędności (dla banera "Kup taniej"). */
export function campaignSavePercent(c: Campaign): number {
  if (!c.originalPrice) return 0;
  return Math.round((1 - c.price / c.originalPrice) * 100);
}
