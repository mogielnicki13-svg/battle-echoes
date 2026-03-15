// ============================================================
// BATTLE ECHOES — scripts/generateLocalImages.js
// Generuje src/services/BattleLocalImages.ts z plikow w assets/battles/
// (NIE pobiera obrazow — tylko tworzy mape require())
//
// URUCHOMIENIE (z katalogu projektu):
//   node scripts/generateLocalImages.js
//
// WYMAGANIE: obrazy musza byc juz w assets/battles/
//   (pobierz skryptem: powershell -ExecutionPolicy Bypass -File scripts\downloadImages.ps1)
// ============================================================

const fs   = require('fs');
const path = require('path');

const battlesDir = path.join(__dirname, '..', 'assets', 'battles');

// Sprawdz czy folder istnieje
if (!fs.existsSync(battlesDir)) {
  console.error('❌ Folder assets/battles/ nie istnieje.');
  console.error('   Najpierw pobierz obrazy: powershell -ExecutionPolicy Bypass -File scripts\\downloadImages.ps1');
  process.exit(1);
}

// Znajdz wszystkie pliki obrazow
const files = fs.readdirSync(battlesDir)
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  .sort();

if (files.length === 0) {
  console.error('❌ Brak plikow obrazow w assets/battles/');
  console.error('   Pobierz obrazy: powershell -ExecutionPolicy Bypass -File scripts\\downloadImages.ps1');
  process.exit(1);
}

console.log(`\nZnaleziono ${files.length} plikow w assets/battles/:`);
files.forEach(f => {
  const size = Math.round(fs.statSync(path.join(battlesDir, f)).size / 1024);
  console.log(`  ${f.padEnd(35)} ${size} KB`);
});

// Zbuduj mape battleId -> filename
const manifest = {};
for (const file of files) {
  const m = file.match(/^(.+)\.(jpg|jpeg|png)$/i);
  if (m) manifest[m[1]] = file;
}

// Generuj BattleLocalImages.ts
const today = new Date().toISOString().slice(0, 10);
let ts  = `// ============================================================\n`;
ts += `// BATTLE ECHOES — BattleLocalImages.ts\n`;
ts += `// AUTO-GENERATED: node scripts/generateLocalImages.js\n`;
ts += `// Data: ${today} | Obrazy: ${files.length}\n`;
ts += `// ============================================================\n\n`;
ts += `// eslint-disable-next-line @typescript-eslint/no-require-imports\n`;
ts += `const BATTLE_LOCAL_IMAGES: Record<string, any> = {\n`;

for (const [battleId, filename] of Object.entries(manifest)) {
  ts += `  '${battleId}': require('../../assets/battles/${filename}'),\n`;
}

ts += `};\n\nexport default BATTLE_LOCAL_IMAGES;\n`;

const tsPath = path.join(__dirname, '..', 'src', 'services', 'BattleLocalImages.ts');
fs.writeFileSync(tsPath, ts, 'utf8');

console.log(`\n✅ Zapisano: src/services/BattleLocalImages.ts (${files.length} obrazow)`);
console.log(`   Klucze: ${Object.keys(manifest).join(', ')}`);
console.log(`\n➡  NASTEPNE KROKI:`);
console.log(`   1. W oknie Metro nacisnij 'r' (reload)`);
console.log(`   2. Jezeli obrazy nadal nie widac: zatrzymaj Metro (Ctrl+C) i uruchom ponownie: npx expo start`);
