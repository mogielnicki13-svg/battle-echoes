// ============================================================
// BATTLE ECHOES — scripts/validateImages.js
// Sprawdza pliki w assets/battles/ i usuwa nieprawidlowe
// (czyli te ktore sa HTML zamiast prawdziwych obrazow)
//
// URUCHOMIENIE: node scripts/validateImages.js
// ============================================================

const fs   = require('fs');
const path = require('path');

const battlesDir = path.join(__dirname, '..', 'assets', 'battles');

if (!fs.existsSync(battlesDir)) {
  console.log('❌ Folder assets/battles/ nie istnieje.');
  process.exit(1);
}

// Sprawdz magic bytes pliku
function checkImageType(filepath) {
  try {
    const buf = Buffer.alloc(12);
    const fd  = fs.openSync(filepath, 'r');
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 3) return null;

    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'JPEG';

    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'PNG';

    // GIF: 47 49 46
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'GIF';

    // HTML / tekst (zepsute pobieranie)
    if (buf[0] === 0x3C || buf[0] === 0x0A || buf[0] === 0x20) return 'HTML';

    return null;
  } catch (e) {
    return null;
  }
}

const files = fs.readdirSync(battlesDir)
  .filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
  .sort();

if (files.length === 0) {
  console.log('⚠  Brak plikow w assets/battles/');
  process.exit(0);
}

console.log(`\nSprawdzam ${files.length} plikow w assets/battles/:\n`);

let valid = 0;
let removed = 0;
const badFiles = [];

for (const file of files) {
  const fp   = path.join(battlesDir, file);
  const size = fs.statSync(fp).size;
  const type = checkImageType(fp);

  if ((type === 'JPEG' || type === 'PNG' || type === 'GIF') && size > 2000) {
    const kb = Math.round(size / 1024);
    console.log(`  ✅  ${file.padEnd(35)} ${type}  ${kb} KB`);
    valid++;
  } else {
    const reason = size <= 2000 ? `za maly (${size} B)` : `typ: ${type || 'nieznany'}`;
    console.log(`  ❌  ${file.padEnd(35)} USUWAM — ${reason}`);
    fs.unlinkSync(fp);
    removed++;
    badFiles.push(file);
  }
}

console.log(`\n${'='.repeat(55)}`);
console.log(`Wynik: ✅ ${valid} prawidlowych | ❌ ${removed} usunietych`);

if (removed > 0) {
  console.log(`\nUsuniete pliki (trzeba pobrac recznie przez przegladarke):`);
  badFiles.forEach(f => {
    const id = f.replace(/\.(jpg|jpeg|png|gif)$/i, '');
    console.log(`  → ${id}`);
  });
}

if (valid > 0) {
  console.log(`\n➡  Uruchom teraz:`);
  console.log(`   node scripts\\generateLocalImages.js`);
  console.log(`   Potem w Metro: r`);
} else {
  console.log(`\n⚠  Brak prawidlowych obrazow.`);
  console.log(`   Pobierz reczenie przez przegladarke i uruchom generateLocalImages.js`);
}
