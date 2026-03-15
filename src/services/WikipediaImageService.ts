// ============================================================
// BATTLE ECHOES — WikipediaImageService.ts
// Dynamiczne pobieranie URL-i obrazów z Wikipedia REST API
//
// Dlaczego: hardkodowane URL-i Wikimedia zawierają hash MD5 nazwy pliku —
// nawet mała literówka powoduje 404. Wikipedia API zwraca ZAWSZE
// poprawny, zweryfikowany URL miniatury.
//
// Przepływ:
//   1. Sprawdź AsyncStorage (cache ważny 7 dni)
//   2. Jeśli brak/przeterminowany — fetchuj Wikipedia REST API
//   3. Nadpisz imageUrl w tablicy bitew
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const WIKI_CACHE_KEY = 'wiki_images_v3';
const WIKI_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dni

// Mapowanie battle ID → angielski tytuł artykułu na Wikipedii
const BATTLE_WIKI_TITLES: Record<string, string> = {
  // Ancient
  'marathon-490bc':    'Battle_of_Marathon',
  'cannae-216bc':      'Battle_of_Cannae',
  'thermopylae-480bc': 'Battle_of_Thermopylae',

  // Medieval
  'grunwald-1410':     'Battle_of_Grunwald',
  'hastings-1066':     'Battle_of_Hastings',
  'agincourt-1415':    'Battle_of_Agincourt',

  // Early Modern
  'lepanto-1571':      'Battle_of_Lepanto',
  'vienna-1683':       'Battle_of_Vienna_(1683)',
  'rocroi-1643':       'Battle_of_Rocroi',
  'gettysburg-1863':   'Battle_of_Gettysburg',

  // Napoleon
  'waterloo-1815':     'Battle_of_Waterloo',
  'austerlitz-1805':   'Battle_of_Austerlitz',
  'borodino-1812':     'Battle_of_Borodino',

  // WW1
  'ypres-1914':        'First_Battle_of_Ypres',
  'marne-1914':        'First_Battle_of_the_Marne',
  'verdun-1916':       'Battle_of_Verdun',
  'somme-1916':        'Battle_of_the_Somme',

  // WW2
  'britain-1940':      'Battle_of_Britain',
  'stalingrad-1942':   'Battle_of_Stalingrad',
  'kursk-1943':        'Battle_of_Kursk',
  'normandy-1944':     'Normandy_landings',
  'berlin-1945':       'Battle_of_Berlin',
};

// Konwertuje URL miniaturki Wikipedia na wersję 800px
// Używamy 800px — taki rozmiar zwraca też skrypt Node.js i jest wiarygodnie dostępny
function toWikiThumbnail(thumbUrl: string, width = 800): string {
  return thumbUrl.replace(/\/\d+px-/, `/${width}px-`);
}

// Pobierz jeden URL z Wikipedia REST API
async function fetchOneImage(wikiTitle: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BattleEchoes/1.0 (educational app; https://github.com/battle-echoes)',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const thumb = data.thumbnail?.source ?? null;
    return thumb ? toWikiThumbnail(thumb, 800) : null;
  } catch {
    return null;
  }
}

// ── Publiczne API ─────────────────────────────────────────────

/**
 * Załaduj mapę imageUrl { battleId → url } z cache lub Wikipedia API.
 * Cache jest ważny 7 dni. W przypadku błędu sieci zwraca pustą mapę.
 */
export async function loadWikiImageUrls(): Promise<Record<string, string>> {
  // 1. Sprawdź cache
  try {
    const [rawTs, rawData] = await Promise.all([
      AsyncStorage.getItem(`${WIKI_CACHE_KEY}_ts`),
      AsyncStorage.getItem(WIKI_CACHE_KEY),
    ]);
    if (rawTs && rawData) {
      const age = Date.now() - parseInt(rawTs, 10);
      if (age < WIKI_CACHE_TTL) {
        const cached: Record<string, string> = JSON.parse(rawData);
        if (__DEV__) console.log(`[Wiki] Cache: ${Object.keys(cached).length} obrazów`);
        return cached;
      }
    }
  } catch {}

  // 2. Pobierz z Wikipedia API (sekwencyjnie, żeby nie przeciążać API)
  if (__DEV__) console.log('[Wiki] Pobieranie obrazów z Wikipedia API...');
  const result: Record<string, string> = {};
  const entries = Object.entries(BATTLE_WIKI_TITLES);

  for (const [battleId, wikiTitle] of entries) {
    const url = await fetchOneImage(wikiTitle);
    if (url) {
      result[battleId] = url;
      if (__DEV__) console.log(`[Wiki] ✅ ${battleId}`);
    } else {
      console.warn(`[Wiki] ❌ ${battleId} (${wikiTitle})`);
    }
    // Grzeczna przerwa między requestami (API rate-limit)
    const WIKI_API_THROTTLE_MS = 200;
    await new Promise(r => setTimeout(r, WIKI_API_THROTTLE_MS));
  }

  // 3. Zapisz cache
  try {
    await Promise.all([
      AsyncStorage.setItem(WIKI_CACHE_KEY, JSON.stringify(result)),
      AsyncStorage.setItem(`${WIKI_CACHE_KEY}_ts`, Date.now().toString()),
    ]);
    if (__DEV__) console.log(`[Wiki] Cache zapisany: ${Object.keys(result).length} obrazów`);
  } catch {}

  return result;
}

/**
 * Aplikuj obrazy z Wikpedia na tablicę bitew.
 * Nadpisuje imageUrl jeśli Wikipedia ma wartość dla danego battle ID.
 */
export function applyWikiImages<T extends { id: string; imageUrl?: string }>(
  battles: T[],
  wikiImages: Record<string, string>,
): T[] {
  return battles.map(b => ({
    ...b,
    imageUrl: wikiImages[b.id] ?? b.imageUrl,
  }));
}

/**
 * Wymuś odświeżenie cache (np. po aktualizacji aplikacji).
 * Czyści też poprzednie klucze v1 i v2.
 */
export async function invalidateWikiCache(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(WIKI_CACHE_KEY),
      AsyncStorage.removeItem(`${WIKI_CACHE_KEY}_ts`),
      // Wyczyść poprzednie wersje cache
      AsyncStorage.removeItem('wiki_images_v1'),
      AsyncStorage.removeItem('wiki_images_v1_ts'),
      AsyncStorage.removeItem('wiki_images_v2'),
      AsyncStorage.removeItem('wiki_images_v2_ts'),
    ]);
  } catch {}
}
