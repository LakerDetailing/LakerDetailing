#!/usr/bin/env node
/*
 * tools-galerija.js — sistem za slike u galeriji sajta
 * NE DEPLOJUJE SE (u .vercelignore).
 *
 * Kako radi:
 *   1. Vlasnik ubaci / obrise slike u folder  galerija/
 *   2. Pokrene SLIKE.bat  (ili: node tools-galerija.js)
 *   3. Skripta: smanji slike -> napravi .webp i .jpg u assets/gallery/
 *              -> upise galeriju u index.html izmedju markera
 *              -> podigne CACHE_VERSION i verziju u futeru
 *              -> pita da li da objavi (git push)
 *
 * Komande:
 *   node tools-galerija.js          pun tok (napravi + pitaj za objavu)
 *   node tools-galerija.js --proba  samo prikaze sta bi uradila, NISTA ne menja
 *   node tools-galerija.js --vrati  vrati sve kako je bilo pre poslednjeg pokretanja
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { execFileSync, spawn } = require('child_process');

const ROOT   = __dirname;
const DROP   = path.join(ROOT, 'galerija');
const OUT    = path.join(ROOT, 'assets', 'gallery');
const INDEX  = path.join(ROOT, 'index.html');
const SW     = path.join(ROOT, 'service-worker.js');
const BACKUP = path.join(ROOT, '.galerija-backup');

const MARK_A = '<!-- GALERIJA:POCETAK';
const MARK_B = '<!-- GALERIJA:KRAJ -->';
const PREFIX = 'g-';
const SITE   = 'https://www.lakerdetailing.rs';

const SIRINA_VELIKA = 900;
const SIRINA_MALA   = 480;
const KVALITET_WEBP = 82;

const EXT_OK  = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const EXT_LOS = {
  '.heic': 'iPhone HEIC', '.heif': 'iPhone HEIF', '.avif': 'AVIF',
  '.tif': 'TIFF', '.tiff': 'TIFF', '.bmp': 'BMP', '.gif': 'GIF',
  '.mov': 'video', '.mp4': 'video', '.psd': 'Photoshop',
  '.dng': 'RAW', '.cr2': 'RAW', '.nef': 'RAW', '.arw': 'RAW'
};

/* ─────────────── ispis ─────────────── */
const C = { r: '\x1b[0m', b: '\x1b[1m', crv: '\x1b[31m', zel: '\x1b[32m', zut: '\x1b[33m', siv: '\x1b[90m' };
const log  = (s = '') => console.log(s);
const ok   = (s) => log(`  ${C.zel}✓${C.r} ${s}`);
const info = (s) => log(`  ${C.siv}·${C.r} ${s}`);
const upoz = (s) => log(`  ${C.zut}!${C.r} ${s}`);
const nasl = (s) => log(`\n${C.b}${s}${C.r}`);

function stop(poruka, savet) {
  log('');
  log(`${C.crv}${C.b}  ZAUSTAVLJENO — nista nije promenjeno${C.r}`);
  log(`${C.crv}  ${poruka}${C.r}`);
  if (savet) log(`\n  ${savet}`);
  log('');
  process.exit(1);
}

function pitaj(tekst) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(tekst, a => { rl.close(); res(a.trim().toLowerCase()); }));
}
const potvrda = (a) => a === 'd' || a === 'da' || a === 'y' || a === 'yes';

/* ─────────────── alati ─────────────── */
function alatPostoji(alat) {
  try { execFileSync(alat, ['-version'], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
}

function dimenzije(fajl) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', fajl
  ], { encoding: 'utf8' }).trim();
  const [w, h] = out.split('x').map(Number);
  if (!w || !h) throw new Error(`ne mogu da procitam dimenzije: ${fajl}`);
  return { w, h };
}

/* ─────────────── imena ─────────────── */
const SLOVA = { 'č': 'c', 'ć': 'c', 'ž': 'z', 'š': 's', 'đ': 'dj', 'Č': 'c', 'Ć': 'c', 'Ž': 'z', 'Š': 's', 'Đ': 'dj' };

function uSlug(tekst) {
  return tekst
    .replace(/[čćžšđČĆŽŠĐ]/g, z => SLOVA[z])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/* "3 - Mercedes AMG enterijer@40.jpg" -> { redni:3, opis:"Mercedes AMG enterijer", kadar:40 } */
function razloziIme(imeFajla) {
  let ime = imeFajla.replace(/\.[^.]+$/, '');
  let redni = null;
  const m = ime.match(/^\s*(\d{1,3})\s*[-_.\s]\s*(.+)$/);
  if (m) { redni = Number(m[1]); ime = m[2]; }
  let kadar = null;
  const k = ime.match(/@\s*(\d{1,3})\s*$/);
  if (k) { kadar = Math.min(100, Math.max(0, Number(k[1]))); ime = ime.slice(0, k.index); }
  return { redni, opis: ime.trim().replace(/\s+/g, ' '), kadar };
}

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ─────────────── citanje foldera galerija/ ─────────────── */
function ucitajUlaz() {
  if (!fs.existsSync(DROP)) {
    stop(`ne postoji folder:  galerija\\`,
      'Napravi folder "galerija" u glavnom folderu sajta i ubaci slike u njega.');
  }
  const sve = fs.readdirSync(DROP, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name);

  const slike = [], odbijene = [];
  for (const ime of sve) {
    if (ime.startsWith('.') || ime.toLowerCase().endsWith('.txt') || ime.toLowerCase().endsWith('.md')) continue;
    const ext = path.extname(ime).toLowerCase();
    if (EXT_OK.has(ext)) slike.push(ime);
    else odbijene.push({ ime, razlog: EXT_LOS[ext] || 'nepoznat format' });
  }

  if (odbijene.length) {
    nasl('Preskocene datoteke (format koji sajt ne podrzava)');
    odbijene.forEach(o => upoz(`${o.ime}   → ${o.razlog}`));
    log(`\n  ${C.zut}Resenje:${C.r} sacuvaj ih kao JPG i vrati u folder.`);
    log(`  ${C.siv}iPhone: Podesavanja → Kamera → Formati → "Najkompatibilnije"${C.r}`);
    log(`  ${C.siv}Ili: otvori sliku u Paint-u → Sacuvaj kao → JPEG${C.r}`);
  }

  if (!slike.length) {
    stop('u folderu galerija\\ nema nijedne slike (.jpg .jpeg .png .webp)',
      'Ubaci slike u folder pa pokreni ponovo. Galerija na sajtu nije dirana.');
  }

  const stavke = slike.map(ime => {
    const pun = path.join(DROP, ime);
    const bajt = fs.readFileSync(pun);
    const { redni, opis, kadar } = razloziIme(ime);
    if (!opis) {
      stop(`slika "${ime}" nema opis u imenu`,
        'Ime treba da bude npr:  1 - Mercedes AMG enterijer.jpg\n  (broj = redosled, tekst posle crte = opis slike za Google)');
    }
    return {
      ime, pun, opis, kadar,
      redni: redni === null ? 999 : redni,
      hash: crypto.createHash('sha256').update(bajt).digest('hex').slice(0, 8),
      izvorBajtova: bajt.length
    };
  });

  const poHesu = new Map();
  for (const s of stavke) {
    if (poHesu.has(s.hash)) {
      stop(`ista slika je u folderu dva puta:\n     "${poHesu.get(s.hash).ime}"  i  "${s.ime}"`,
        'Obrisi jednu od njih pa pokreni ponovo.');
    }
    poHesu.set(s.hash, s);
  }

  stavke.sort((a, b) => a.redni - b.redni || a.ime.localeCompare(b.ime, 'sr', { numeric: true }));
  stavke.forEach(s => { s.osnova = `${PREFIX}${uSlug(s.opis) || 'slika'}-${s.hash}`; });

  const imena = new Set();
  for (const s of stavke) {
    if (imena.has(s.osnova)) s.osnova += '-' + crypto.randomBytes(2).toString('hex');
    imena.add(s.osnova);
  }
  return stavke;
}

/* ─────────────── obrada slika ─────────────── */
function obradi(s, proba) {
  const w900  = path.join(OUT, `${s.osnova}.webp`);
  const w480  = path.join(OUT, `${s.osnova}-${SIRINA_MALA}.webp`);
  const j900  = path.join(OUT, `${s.osnova}-opt.jpg`);
  s.fajlovi = { w900, w480, j900 };

  const postoje = fs.existsSync(w900) && fs.existsSync(w480) && fs.existsSync(j900);
  if (postoje) {
    s.status = 'ista';
    const d = dimenzije(j900);
    s.w = d.w; s.h = d.h;
    s.bajtova = fs.statSync(w900).size;
    return;
  }
  s.status = 'nova';
  if (proba) return;

  const skala = (sirina) => `scale='min(${sirina},iw)':-2:flags=lanczos`;
  ffmpeg(['-i', s.pun, '-map_metadata', '-1', '-vf', skala(SIRINA_VELIKA),
    '-c:v', 'libwebp', '-quality', String(KVALITET_WEBP), '-preset', 'photo', '-compression_level', '6', w900]);
  ffmpeg(['-i', s.pun, '-map_metadata', '-1', '-vf', skala(SIRINA_MALA),
    '-c:v', 'libwebp', '-quality', String(KVALITET_WEBP), '-preset', 'photo', '-compression_level', '6', w480]);
  ffmpeg(['-i', s.pun, '-map_metadata', '-1', '-vf', skala(SIRINA_VELIKA),
    '-c:v', 'mjpeg', '-q:v', '4', '-pix_fmt', 'yuvj420p', j900]);

  // dimenzije se citaju sa GOTOVE slike — tako su tacne i kad je slika sa telefona okrenuta (EXIF rotacija)
  const d = dimenzije(j900);
  s.w = d.w; s.h = d.h;
  s.bajtova = fs.statSync(w900).size;
}

/* ─────────────── HTML ─────────────── */
function napraviHtml(stavke, eol) {
  const kartice = stavke.map(s => {
    const poz = s.kadar === null ? '' : ` style="object-position:center ${s.kadar}%"`;
    return [
      '    <div class="cs-card">',
      '      <picture>',
      `        <source type="image/webp" srcset="/assets/gallery/${s.osnova}-${SIRINA_MALA}.webp ${SIRINA_MALA}w, /assets/gallery/${s.osnova}.webp ${SIRINA_VELIKA}w" sizes="(max-width:600px) 50vw, 25vw">`,
      `        <img width="${s.w}" height="${s.h}" loading="lazy" decoding="async" src="/assets/gallery/${s.osnova}-opt.jpg" alt="${escHtml(s.opis)}"${poz}>`,
      '      </picture>',
      '    </div>'
    ].join(eol);
  }).join(eol);

  // isti prelom reda kao ostatak fajla (LF ili CRLF) — da se ne mesaju
  return `${MARK_A} — generisano skriptom tools-galerija.js, NE MENJATI RUCNO -->${eol}${kartice}${eol}  ${MARK_B}`;
}

function zameniBlok(html) {
  const a = html.indexOf(MARK_A);
  const b = html.indexOf(MARK_B);
  if (a === -1 || b === -1 || b < a) {
    stop('u index.html ne postoje markeri galerije',
      `Moraju da postoje redovi:\n     ${MARK_A} ... -->\n     ${MARK_B}\n  Pozovi Claude Code da ih vrati.`);
  }
  return { pre: html.slice(0, a), posle: html.slice(b + MARK_B.length) };
}

/* ─────────────── verzije ─────────────── */
function podigniVerziju(proba) {
  const sw = fs.readFileSync(SW, 'utf8');
  const m = sw.match(/const CACHE_VERSION = 'laker-pwa-v(\d+)';/);
  if (!m) stop('ne mogu da nadjem CACHE_VERSION u service-worker.js', 'Pozovi Claude Code.');
  const stara = Number(m[1]);
  const nova = stara + 1;
  const datum = new Date().toISOString().slice(0, 10);

  if (!proba) {
    fs.writeFileSync(SW, sw.replace(m[0], `const CACHE_VERSION = 'laker-pwa-v${nova}';`), 'utf8');
    const idx = fs.readFileSync(INDEX, 'utf8');
    const vm = idx.match(/(<span class="fb-v" id="siteVersion"[^>]*>verzija <b>)(\d+)(<\/b> · )([\d-]+)(<\/span>)/);
    if (!vm) stop('ne mogu da nadjem verziju u futeru index.html', 'Pozovi Claude Code.');
    fs.writeFileSync(INDEX, idx.replace(vm[0], `${vm[1]}${nova}${vm[3]}${datum}${vm[5]}`), 'utf8');
  }
  return { stara, nova, datum };
}

/* ─────────────── backup / vracanje ─────────────── */
function napraviBackup(zaBrisanje) {
  fs.rmSync(BACKUP, { recursive: true, force: true });
  fs.mkdirSync(path.join(BACKUP, 'slike'), { recursive: true });
  fs.copyFileSync(INDEX, path.join(BACKUP, 'index.html'));
  fs.copyFileSync(SW, path.join(BACKUP, 'service-worker.js'));
  for (const f of zaBrisanje) fs.copyFileSync(f, path.join(BACKUP, 'slike', path.basename(f)));
  fs.writeFileSync(path.join(BACKUP, 'kada.txt'), new Date().toISOString(), 'utf8');
}

function vrati() {
  if (!fs.existsSync(path.join(BACKUP, 'index.html'))) {
    stop('nema sacuvane kopije — nema sta da se vrati',
      'Kopija se pravi svaki put kad skripta menja galeriju.');
  }
  fs.copyFileSync(path.join(BACKUP, 'index.html'), INDEX);
  fs.copyFileSync(path.join(BACKUP, 'service-worker.js'), SW);
  const dirSlike = path.join(BACKUP, 'slike');
  let vraceno = 0;
  if (fs.existsSync(dirSlike)) {
    for (const f of fs.readdirSync(dirSlike)) {
      fs.copyFileSync(path.join(dirSlike, f), path.join(OUT, f));
      vraceno++;
    }
  }
  nasl('Vraceno na staro');
  ok('index.html i service-worker.js vraceni');
  if (vraceno) ok(`vraceno ${vraceno} slika u assets/gallery/`);
  info(`kopija je od: ${fs.readFileSync(path.join(BACKUP, 'kada.txt'), 'utf8').slice(0, 19).replace('T', ' ')}`);
  log(`\n  ${C.zut}Napomena:${C.r} ovo je vratilo samo fajlove na racunaru.`);
  log('  Ako si vec objavio na sajt, pokreni SLIKE.bat ponovo i objavi ovo vraceno stanje.\n');
}

/* ─────────────── ciscenje starih ─────────────── */
/* Brise samo fajlove koje je ova skripta napravila (pocinju na "g-"), a koje vise
   niko ne koristi. Gleda se NOVI index.html plus sve ostale strane sajta —
   zato work1/work2/logo i slicno nikad ne mogu da nestanu. */
function nadjiZaBrisanje(stavke, noviIndex) {
  const zadrzi = new Set();
  stavke.forEach(s => {
    zadrzi.add(`${s.osnova}.webp`);
    zadrzi.add(`${s.osnova}-${SIRINA_MALA}.webp`);
    zadrzi.add(`${s.osnova}-opt.jpg`);
  });

  const ostaleStrane = fs.readdirSync(ROOT)
    .filter(f => f.toLowerCase().endsWith('.html') && f.toLowerCase() !== 'index.html')
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n');
  const uUpotrebi = noviIndex + '\n' + ostaleStrane;

  return fs.readdirSync(OUT)
    .filter(f => f.startsWith(PREFIX) && !zadrzi.has(f) && !uUpotrebi.includes(f))
    .map(f => path.join(OUT, f));
}

/* ─────────────── git / objava ─────────────── */
function git(args, tiho) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: tiho ? 'pipe' : ['ignore', 'inherit', 'inherit'] });
}

async function objavi(stavke, verzija) {
  nasl('Objavljivanje na sajt');
  try {
    git(['add', '--', 'index.html', 'service-worker.js', 'assets/gallery']);
    const promene = git(['status', '--porcelain', '--', 'index.html', 'service-worker.js', 'assets/gallery'], true).trim();
    if (!promene) { upoz('nema nicega novog za objavu'); return; }
    git(['commit', '-m', `galerija: ${stavke.length} slika (verzija ${verzija.nova})`], true);
    ok('promene sacuvane');
    info('preuzimam eventualne tudje izmene (pull --rebase)…');
    git(['-c', 'rebase.autoStash=true', 'pull', '--rebase', 'origin', 'main']);
    git(['push', 'origin', 'main']);
    ok('poslato na GitHub — Vercel gradi novu verziju sajta');
  } catch (e) {
    log('');
    log(`${C.crv}  Git je prijavio gresku.${C.r}`);
    log(`  ${String(e.stderr || e.message).trim().split('\n').slice(0, 6).join('\n  ')}`);
    log(`\n  Slike su napravljene i index.html je izmenjen, ali NISU objavljene.`);
    log(`  Pozovi Claude Code da zavrsi objavu.\n`);
    return;
  }

  const proba = `${SITE}/assets/gallery/${stavke[0].osnova}.webp`;
  info('cekam da sajt uhvati novu verziju (do 3 minuta)…');
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 10000));
    try {
      const r = await fetch(proba, { method: 'HEAD', cache: 'no-store' });
      if (r.ok) {
        ok('nove slike su ZIVE na sajtu');
        try {
          const h = await fetch(`${SITE}/api/health`, { cache: 'no-store' });
          const j = await h.json();
          ok(j && j.ok ? 'backend sajta radi normalno (/api/health)' : 'paznja: /api/health nije "ok" — javi Claude Code');
        } catch { upoz('/api/health se ne javlja — javi Claude Code'); }
        log(`\n  ${C.b}Gotovo.${C.r} Otvori ${SITE} i pritisni Ctrl+F5.\n`);
        return;
      }
    } catch { /* mreza — probaj opet */ }
    process.stdout.write('.');
  }
  log('');
  upoz('sajt jos nije prikazao nove slike — sacekaj minut i osvezi sa Ctrl+F5');
  log(`  ${C.siv}Ako ni posle 5 minuta ne radi, javi Claude Code.${C.r}\n`);
}

/* ─────────────── pregled uzivo ─────────────── */
async function pregledaj() {
  const server = spawn(process.execPath, [path.join(ROOT, 'tools-dev-server.js')], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  try { spawn('cmd', ['/c', 'start', '', 'http://127.0.0.1:4173/#cs'], { stdio: 'ignore', detached: true }).unref(); } catch { }
  log(`\n  Otvoreno u pregledacu: ${C.b}http://127.0.0.1:4173/#cs${C.r}`);
  await pitaj('  Kad pogledas, pritisni ENTER da nastavis… ');
  server.kill();
}

/* ─────────────── glavni tok ─────────────── */
async function main() {
  const proba = process.argv.includes('--proba');
  if (process.argv.includes('--vrati')) return vrati();

  log(`\n${C.b}  GALERIJA — Laker Detailing${C.r}`);
  log(`  ${C.siv}${proba ? 'PROBA — nista se nece promeniti' : 'folder: galerija\\'}${C.r}`);

  if (!alatPostoji('ffmpeg') || !alatPostoji('ffprobe')) {
    stop('na racunaru nema programa ffmpeg (njime se smanjuju slike)',
      'Instalacija: otvori PowerShell i pokreni\n     winget install Gyan.FFmpeg\n  Pa zatvori i otvori SLIKE.bat ponovo.');
  }

  const stavke = ucitajUlaz();

  nasl(`Slike u folderu galerija\\  (${stavke.length})`);
  stavke.forEach((s, i) => info(`${String(i + 1).padStart(2)}. ${s.opis}${s.kadar === null ? '' : `   ${C.siv}[kadar ${s.kadar}%]${C.r}`}`));

  if (stavke.length < 3) upoz('manje od 3 slike — galerija ce izgledati prazno');
  if (stavke.length > 12) upoz('vise od 12 slika — stranica ce se sporije ucitavati');

  nasl('Pripremam slike');
  for (const s of stavke) {
    obradi(s, proba);
    if (s.status === 'nova') ok(`${s.ime}  →  ${proba ? 'bice smanjena (proba)' : `${(s.izvorBajtova / 1048576).toFixed(1)} MB smanjeno na ${Math.round(s.bajtova / 1024)} KB (${s.w}×${s.h})`}`);
    else info(`${s.ime}  →  vec pripremljena, preskacem`);
  }

  const staro = fs.readFileSync(INDEX, 'utf8');
  const html = napraviHtml(stavke, staro.includes('\r\n') ? '\r\n' : '\n');
  const { pre, posle } = zameniBlok(staro);
  const novo = pre + html + posle;

  const zaBrisanje = nadjiZaBrisanje(stavke, novo);
  const sklonjene = new Set(zaBrisanje.map(f => path.basename(f).replace(/(-\d+)?(-opt)?\.(webp|jpg)$/, '')));

  if (novo === staro && !zaBrisanje.length) {
    nasl('Nema promena');
    ok('galerija na sajtu je vec tacno ovakva — nista nije dirano');
    log('');
    return;
  }

  nasl('Sta ce se promeniti');
  const nove = stavke.filter(s => s.status === 'nova');
  nove.forEach(s => ok(`DODAJE se:  ${s.opis}`));
  sklonjene.forEach(f => upoz(`SKLANJA se:  ${f.slice(PREFIX.length).replace(/-[0-9a-f]{8}$/, '').replace(/-/g, ' ')}`));
  info(`galerija ce imati ukupno ${stavke.length} slika`);

  if (proba) {
    log(`\n  ${C.b}Ovo je bila samo proba — nista nije promenjeno.${C.r}`);
    log(`  Pokreni bez --proba da se stvarno primeni.\n`);
    return;
  }

  // sigurnosna brava: ako se galerija smanjuje, trazi izricitu potvrdu PRE nego sto isceta bilo sta
  const staroBrojac = (staro.match(/<div class="cs-card"/g) || []).length;
  if (stavke.length < staroBrojac) {
    log('');
    upoz(`galerija se smanjuje: ${staroBrojac} → ${stavke.length} slika`);
    log(`  ${C.siv}(slika nestaje sa sajta ako je nema u folderu galerija\\)${C.r}`);
    if (!potvrda(await pitaj('  Da li je to ono sto hoces? (d/n) '))) {
      log(`\n  U redu — nista nije promenjeno.`);
      log(`  Vrati slike u folder galerija\\ pa pokreni ponovo.\n`);
      return;
    }
  }

  napraviBackup(zaBrisanje);
  fs.writeFileSync(INDEX, novo, 'utf8');
  zaBrisanje.forEach(f => fs.rmSync(f, { force: true }));
  const verzija = podigniVerziju(false);
  ok(`index.html izmenjen, verzija sajta ${verzija.stara} → ${verzija.nova}`);
  info(`kopija starog stanja: .galerija-backup\\  (vracanje: SLIKE.bat → opcija 3)`);

  if (potvrda(await pitaj('\n  Da vidis kako izgleda pre objave? (d/n) '))) await pregledaj();

  log('');
  if (!potvrda(await pitaj(`  ${C.b}Objaviti na sajt lakerdetailing.rs?${C.r} (d/n) `))) {
    log(`\n  Nije objavljeno. Slike su spremne na racunaru.`);
    log(`  Kad budes hteo: pokreni SLIKE.bat pa opciju 1 (odmah ce ponuditi objavu).`);
    log(`  Ako hoces da ponistis: SLIKE.bat pa opciju 3.\n`);
    return;
  }
  await objavi(stavke, verzija);
}

main().catch(e => {
  log('');
  log(`${C.crv}${C.b}  NEOCEKIVANA GRESKA${C.r}`);
  log(`  ${String(e && e.message || e)}`);
  log(`\n  Posalji ovu poruku Claude Code-u.\n`);
  process.exit(1);
});
