// ============================================================
// BATTLE ECHOES — scripts/fetchBattleImages.js
// Pobiera URL obrazów z Wikipedia API i zapisuje do pliku TS
//
// URUCHOMIENIE (z katalogu projektu):
//   node scripts/fetchBattleImages.js
//
// WYNIK: src/services/BattleImageUrls.ts  ← importowany przez app
// Każdy obraz to publiczne dzieło / PD z Wikimedia Commons.
// ============================================================

const fs   = require('fs');
const path = require('path');

// Pełna lista bitew — identyczna jak w WikipediaImageService.ts
const BATTLE_WIKIPEDIA = {
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

function toWikiThumbnail(thumbUrl, width) {
  return thumbUrl.replace(/\/\d+px-/, `/${width}px-`);
}

async function fetchBattleImage(battleId, wikiTitle) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BattleEchoes/1.0 (educational app)' },
    });
    if (!res.ok) return { battleId, imageUrl: null, error: `HTTP ${res.status}` };
    const data = await res.json();
    const thumb = data.thumbnail?.source ?? null;
    const imageUrl = thumb ? toWikiThumbnail(thumb, 800) : null;
    return { battleId, wikiTitle, imageUrl };
  } catch (err) {
    return { battleId, wikiTitle, imageUrl: null, error: err.message };
  }
}

async function main() {
  console.log('Pobieranie obrazów z Wikipedia API...\n');

  const results = [];
  for (const [battleId, wikiTitle] of Object.entries(BATTLE_WIKIPEDIA)) {
    const result = await fetchBattleImage(battleId, wikiTitle);
    results.push(result);

    if (result.imageUrl) {
      const short = result.imageUrl.length > 90
        ? result.imageUrl.slice(0, 87) + '...'
        : result.imageUrl;
      console.log(`✅ ${battleId.padEnd(20)} ${short}`);
    } else {
      console.log(`❌ ${battleId.padEnd(20)} brak obrazu${result.error ? ' — ' + result.error : ''}`);
    }

    await new Promise(r => setTimeout(r, 350));
  }

  // ── Zapisz src/services/BattleImageUrls.ts ─────────────
  const outputPath = path.join(__dirname, '..', 'src', 'services', 'BattleImageUrls.ts');
  const today = new Date().toISOString().slice(0, 10);
  const found   = results.filter(r => r.imageUrl);
  const missing = results.filter(r => !r.imageUrl);

  let ts = `// ============================================================\n`;
  ts += `// BATTLE ECHOES — BattleImageUrls.ts\n`;
  ts += `// AUTO-GENERATED: node scripts/fetchBattleImages.js\n`;
  ts += `// Data: ${today} | Znaleziono: ${found.length}/${results.length}\n`;
  ts += `// NIE EDYTUJ RĘCZNIE — uruchom skrypt żeby odświeżyć\n`;
  ts += `// ============================================================\n\n`;
  ts += `const BATTLE_IMAGE_URLS: Record<string, string> = {\n`;

  for (const r of results) {
    if (r.imageUrl) {
      ts += `  '${r.battleId}': '${r.imageUrl}',\n`;
    }
  }

  ts += `};\n\nexport default BATTLE_IMAGE_URLS;\n`;

  fs.writeFileSync(outputPath, ts, 'utf8');

  console.log(`\nPodsumowanie: ${found.length} znaleziono, ${missing.length} brak`);
  console.log(`\n✅ Zapisano: src/services/BattleImageUrls.ts`);
  console.log(`   → Teraz w Metro naciśnij 'r' żeby przeładować aplikację.`);

  if (missing.length > 0) {
    console.log('\nBrakujące:');
    missing.forEach(r => console.log(`  - ${r.battleId}: ${r.error || 'brak obrazu'}`));
  }
}

main().catch(console.error);
