// ============================================================
// BATTLE ECHOES — scripts/downloadBattleImages.js
// Pobiera obrazy z Wikimedia na dysk i generuje BattleLocalImages.ts
//
// URUCHOMIENIE (z katalogu projektu):
//   node scripts/downloadBattleImages.js
//
// WYNIK:
//   assets/battles/*.jpg/png   ← pliki obrazów
//   src/services/BattleLocalImages.ts  ← require() map dla React Native
// ============================================================

const fs    = require('fs');
const path  = require('path');
const https = require('https');

// ── Czytaj URL-e z BattleImageUrls.ts ─────────────────────
const tsFile = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'services', 'BattleImageUrls.ts'), 'utf8'
);

const urlMap = {};
for (const line of tsFile.split('\n')) {
  const m = line.match(/^\s*'([^']+)':\s*'([^']+)'/);
  if (m) urlMap[m[1]] = m[2];
}

if (Object.keys(urlMap).length === 0) {
  console.error('❌ BattleImageUrls.ts jest pusty — najpierw uruchom: node scripts/fetchBattleImages.js');
  process.exit(1);
}

// ── Utwórz folder assets/battles ──────────────────────────
const outputDir = path.join(__dirname, '..', 'assets', 'battles');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Utworzono: assets/battles/\n`);
}

// ── Pobieranie z obsługą przekierowań ─────────────────────
function download(url, dest, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Zbyt wiele przekierowań'));

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 BattleEchoes/1.0',
        'Accept': 'image/*,*/*',
      },
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
        req.destroy();
        return download(res.headers.location, dest, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        req.destroy();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', err => { fs.unlink(dest, () => {}); reject(err); });
    });
    req.on('error', err => { fs.unlink(dest, () => {}); reject(err); });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── Rozszerzenie pliku na podstawie URL ───────────────────
function getExt(url) {
  const filename = decodeURIComponent(url.split('/').pop().split('?')[0]);
  const parts = filename.split('.');
  const ext = parts[parts.length - 1].toLowerCase();
  // Specjalny przypadek: SVG thumbnail serwowany jako PNG (np. somme)
  if (parts[parts.length - 2]?.toLowerCase() === 'svg') return 'png';
  if (ext === 'jpeg') return 'jpg';
  if (ext === 'png') return 'png';
  return 'jpg';
}

// ── Główna pętla ──────────────────────────────────────────
async function main() {
  console.log(`Pobieranie ${Object.keys(urlMap).length} obrazów do assets/battles/...\n`);

  const manifest = {}; // battleId → 'battleId.ext'
  let ok = 0, skip = 0, fail = 0;

  for (const [battleId, url] of Object.entries(urlMap)) {
    const ext  = getExt(url);
    const name = `${battleId}.${ext}`;
    const dest = path.join(outputDir, name);

    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`⏭  ${battleId.padEnd(22)} ${name} (już istnieje)`);
      manifest[battleId] = { name, ext };
      skip++;
      continue;
    }

    try {
      await download(url, dest);
      const kb = (fs.statSync(dest).size / 1024).toFixed(0);
      console.log(`✅ ${battleId.padEnd(22)} ${name} (${kb} KB)`);
      manifest[battleId] = { name, ext };
      ok++;
    } catch (err) {
      console.log(`❌ ${battleId.padEnd(22)} BŁĄD: ${err.message}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 150));
  }

  // ── Generuj src/services/BattleLocalImages.ts ─────────
  const today = new Date().toISOString().slice(0, 10);
  let ts  = `// ============================================================\n`;
  ts += `// BATTLE ECHOES — BattleLocalImages.ts\n`;
  ts += `// AUTO-GENERATED: node scripts/downloadBattleImages.js\n`;
  ts += `// Data: ${today} | Obrazy: ${ok + skip}/${Object.keys(urlMap).length}\n`;
  ts += `// ============================================================\n\n`;
  ts += `// eslint-disable-next-line @typescript-eslint/no-require-imports\n`;
  ts += `const BATTLE_LOCAL_IMAGES: Record<string, any> = {\n`;

  for (const [battleId, info] of Object.entries(manifest)) {
    ts += `  '${battleId}': require('../../assets/battles/${info.name}'),\n`;
  }

  ts += `};\n\nexport default BATTLE_LOCAL_IMAGES;\n`;

  const tsPath = path.join(__dirname, '..', 'src', 'services', 'BattleLocalImages.ts');
  fs.writeFileSync(tsPath, ts, 'utf8');

  console.log(`\nPodsumowanie: ✅ ${ok} nowych | ⏭ ${skip} istniejących | ❌ ${fail} błędów`);
  console.log(`\n✅ Zapisano: src/services/BattleLocalImages.ts`);
  console.log(`   → Teraz w oknie Metro naciśnij 'r' żeby przeładować aplikację.`);
}

main().catch(console.error);
