// Pomoćni skript (ne deployuje se): računa sha256 CSP hash-eve za sve
// inline <script> blokove u HTML fajlovima. Pokreni: node tools-csp-hashes.js
const fs = require('fs');
const crypto = require('crypto');

// Ovde MORA da stoji svaki HTML fajl koji ima inline <script>. Ako se novi
// fajl zaboravi, hash mu se nikad ne izračuna → u produkciji CSP blokira
// skriptu (a kod stranica usluga to je JSON-LD, pa Google ne vidi podatke).
// radovi.html, 404.html i loyalty-join.html namerno nemaju inline skripte.
const files = [
  'index.html', 'laker-admin-9x3k.html', 'offline.html',
  'usluge.html', 'cenovnik.html',
  'premium-pranje.html', 'detailing-auta.html', 'poliranje-laka.html',
  'keramicka-zastita.html', 'poliranje-farova.html'
];
const all = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(html)) !== null) {
    i++;
    if (!m[1].trim()) continue;
    const content = m[1].replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('base64');
    all.push({ file: f, idx: i, hash: `'sha256-${hash}'` });
  }
}
all.forEach(x => console.log(`${x.file} #${x.idx}: ${x.hash}`));
console.log('\nCSP lista:\n' + [...new Set(all.map(x => x.hash))].join(' '));
