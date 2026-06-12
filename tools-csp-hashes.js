// Pomoćni skript (ne deployuje se): računa sha256 CSP hash-eve za sve
// inline <script> blokove u HTML fajlovima. Pokreni: node tools-csp-hashes.js
const fs = require('fs');
const crypto = require('crypto');

const files = ['index.html', 'laker-admin-9x3k.html', 'offline.html'];
const all = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(html)) !== null) {
    i++;
    if (!m[1].trim()) continue;
    const hash = crypto.createHash('sha256').update(m[1], 'utf8').digest('base64');
    all.push({ file: f, idx: i, hash: `'sha256-${hash}'` });
  }
}
all.forEach(x => console.log(`${x.file} #${x.idx}: ${x.hash}`));
console.log('\nCSP lista:\n' + [...new Set(all.map(x => x.hash))].join(' '));
