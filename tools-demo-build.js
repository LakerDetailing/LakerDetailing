// ══════════════════════════════════════════════════════════════════════
// GENERATOR DEMO STRANICA (ne deployuje se, kao i ostali tools-*.js)
// Pokreni:  node tools-demo-build.js
//
// Zašto generator a ne ručno pisanje: sekcije se vade DOSLOVNO iz
// index.html, pa demo pokazuje pravi sadržaj sajta bez ijedne greške u
// prepisivanju. Ako se index.html promeni, demo se regeneriše jednom
// komandom.
//
// PRAVILO: ovaj skript SAMO ČITA index.html. Nikad ga ne menja.
//
// CSP: demo stranice namerno NEMAJU JSON-LD (noindex su, Google ih ne
// gleda) i nose samo jednu inline skriptu — theme bootstrap, čiji hash
// već postoji u vercel.json. Zato demo ne traži NIJEDAN nov CSP hash.
// Ako neko kasnije doda inline skriptu, mora i hash.
// ══════════════════════════════════════════════════════════════════════
const fs = require('fs');

const src = fs.readFileSync('index.html', 'utf8');

// ── vađenje sekcija iz index.html ──────────────────────────────────────
function sekcija(id) {
  const poc = src.indexOf('<section id="' + id + '"');
  if (poc < 0) throw new Error('Nema sekcije #' + id);
  const kraj = src.indexOf('</section>', poc);
  return src.slice(poc, kraj + 10);
}
function izmedju(od, doo) {
  const i = src.indexOf(od);
  if (i < 0) throw new Error('Nema: ' + od);
  const j = src.indexOf(doo, i);
  return src.slice(i, j + doo.length);
}

// ── prevod sidra sa jedne duge strane u demo rute ──────────────────────
const RUTE = {
  '#pkg': '/demo-paketi',
  '#prc': '/demo-cenovnik',
  '#care': '/demo-loyalty',
  '#faq': '/demo-cenovnik#faq',
  '#cs': '/demo-o-nama',
  '#phi': '/demo-o-nama',
  '#proc': '/demo-o-nama',
  '#tst': '/demo-o-nama',
  '#loc': '/demo-kontakt',
  '#hero': '/demo'
};

function prevediLinkove(html) {
  let h = html;
  // <a href="#pkg" data-href="/usluge"> → <a href="/usluge">   (režim pregleda više ne treba)
  h = h.replace(/href="#[a-z]+"\s+data-href="([^"]+)"/g, 'href="$1"');
  // <a class="prc-more" data-href="/x"> → href
  h = h.replace(/data-href="([^"]+)"/g, 'href="$1"');
  // preostala sidra na demo rute
  for (const [sidro, ruta] of Object.entries(RUTE)) {
    h = h.split('href="' + sidro + '"').join('href="' + ruta + '"');
    h = h.split('href="/' + sidro + '"').join('href="' + ruta + '"');
  }
  return h;
}

const D = {
  hero: sekcija('hero'),
  phi: sekcija('phi'),
  cs: sekcija('cs'),
  proc: sekcija('proc'),
  pkg: sekcija('pkg'),
  care: sekcija('care'),
  prc: sekcija('prc'),
  faq: sekcija('faq'),
  tst: sekcija('tst'),
  loc: sekcija('loc'),
  loyOverlay: izmedju('<div id="loyOverlay"', '<!-- ══'),
  reviewModal: izmedju('<div id="reviewModal"', '<!-- ══')
};

// loyOverlay/reviewModal su izvučeni do sledećeg komentara — odseci višak
D.loyOverlay = D.loyOverlay.slice(0, D.loyOverlay.lastIndexOf('</div>') + 6);
D.reviewModal = D.reviewModal.slice(0, D.reviewModal.lastIndexOf('</div>') + 6);

for (const k of Object.keys(D)) D[k] = prevediLinkove(D[k]);

// ── zajednički delovi ──────────────────────────────────────────────────
const NAV_STAVKE = [
  ['/demo', 'Početna'],
  ['/usluge', 'Usluge'],
  ['/demo-paketi', 'Paketi'],
  ['/demo-cenovnik', 'Cenovnik'],
  ['/demo-loyalty', 'Loyalty'],
  ['/demo-o-nama', 'O nama'],
  ['/demo-kontakt', 'Kontakt']
];

function nav(aktivna) {
  const st = NAV_STAVKE.map(([h, t]) =>
    `    <li><a href="${h}"${h === aktivna ? ' aria-current="page"' : ''}>${t}</a></li>`).join('\n');
  return `<nav id="nav" class="solid">
  <a class="nl" href="/demo" aria-label="Laker Detailing Studio — demo početna">
    <div class="nl-text">
      <span class="nl-m">Laker</span>
      <span class="nl-s">Detailing Studio</span>
    </div>
    <picture>
      <source type="image/avif" srcset="/assets/icons/laker-logo-2.avif?v=2">
      <source type="image/webp" srcset="/assets/icons/laker-logo-2.webp?v=2">
      <img class="nl-logo" src="/assets/icons/laker-logo-2-opt.jpg?v=2" alt="Laker Auto Detailing Studio logo" width="219" height="120" loading="eager" decoding="async">
    </picture>
  </a>
  <ul class="nm" id="nm">
${st}
    <li><a href="/demo-loyalty" class="nb nb-loy" id="loyNavBtn">PRIJAVA <span class="loy-nav-email" id="loyNavEmail" style="display:none"></span></a></li>
  </ul>
  <div class="nav-right">
    <button class="theme-btn" id="themeBtn" type="button" aria-label="Promeni temu" title="Tamni / svetli režim"></button>
    <button class="hbg" id="hbg" type="button" aria-label="Meni"><span></span><span></span><span></span></button>
  </div>
</nav>

<div id="mobileOverlay" role="dialog" aria-modal="true" aria-label="Navigacija">
  <button id="mobileOverlay-close" type="button" aria-label="Zatvori meni" data-click="closeMobileMenu">✕</button>
${NAV_STAVKE.map(([h, t]) => `  <a href="${h}" data-click="closeMobileMenu">${t}</a>`).join('\n')}
  <a href="/demo-loyalty" class="nb" data-click="closeMobileMenu">PRIJAVA</a>
</div>`;
}

const FOOTER = prevediLinkove(izmedju('<footer>', '</footer>'));

const WA_STICK = `<a class="wa-stick" href="https://wa.me/381607260302" target="_blank" rel="noopener noreferrer" aria-label="Pišite nam na WhatsApp">
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>
</a>`;

// ── prvi naslov podstranice postaje H1 ─────────────────────────────────
// Sekcije su vađene sa duge početne, gde je H1 bio u hero-u. Kao zasebna
// stranica svaka mora imati tačno jedan H1 — inače je struktura dokumenta
// pogrešna (čitači ekrana i Google to čitaju kao stranu bez naslova).
// Sav stil nosi klasa `.sh`, golog `h1{}` pravila nema, pa je zamena
// vizuelno neprimetna.
function promoviH1(html) {
  return html.replace(/<h2 class="sh">([\s\S]*?)<\/h2>/, '<h1 class="sh">$1</h1>');
}

// ── skelet stranice ────────────────────────────────────────────────────
function stranica({ naslov, opis, aktivna, telo, modali = '' }) {
  return `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${naslov}</title>
<meta name="description" content="${opis}">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/assets/icons/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<meta name="theme-color" content="#080808">

<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/cormorant-garamond-300-latin.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/inter-400-latin.woff2">
<link rel="stylesheet" href="/assets/css/laker-base.css?v=3">
<link rel="stylesheet" href="/assets/css/laker-usluga.css?v=3">
<link rel="stylesheet" href="/assets/css/laker-demo.css?v=1">
</head>
<body>
<script>try{if(localStorage.getItem('laker-theme')==='light')document.body.className='light';}catch(e){}</script>

<div class="demo-traka">
  <span class="demo-traka-tag">Demo</span>
  <span class="demo-traka-txt">Ovo nije javni sajt — proba nove strukture</span>
  <a class="demo-traka-link" href="/demo">Sve varijante</a>
</div>

<div id="cur"></div>
<div id="cur-r"></div>

${nav(aktivna)}

<main id="content">
${telo}
</main>

${FOOTER}

${WA_STICK}
${modali}

<script src="/main.min.js?v=20260805c" defer></script>
<script src="/assets/js/demo-reveal.js?v=2" defer></script>
<script src="/init.js?v=20260813a" defer></script>
</body>
</html>
`;
}

// ── delovi koje pišemo sami (nema ih na postojećem sajtu) ──────────────
const PITCH = `<section class="us-sec" style="padding-top:86px">
  <div class="us-in" style="max-width:820px">
    <p class="demo-pitch">Auto detailing studio u Čačku. Radimo ručno i bez automatskih četki, isključivo
    Koch-Chemie hemijom — od premium pranja do keramičke zaštite koja drži godinama.</p>
  </div>
</section>`;

const PUTEVI = `<section class="us-sec" style="padding-top:40px">
  <div class="us-in">
    <div class="sl">Gde dalje</div>
    <h2 class="sh">Šta vas<br><em>zanima</em></h2>
    <div class="us-hub">
      <a class="us-hub-c" href="/usluge">
        <div class="us-hub-k">Pojedinačno</div>
        <h3>Usluge</h3>
        <p>Pet usluga, svaka sa svojom stranicom — šta tačno radimo, kako i koliko košta po veličini vozila.</p>
        <div class="us-hub-f"><span class="us-hub-p"><small>od</small>20 €</span><span class="us-hub-a">→</span></div>
      </a>
      <a class="us-hub-c" href="/demo-paketi">
        <div class="us-hub-k">Sve zajedno</div>
        <h3>Paketi</h3>
        <p>Clean, Boost i Laker — više usluga u istom terminu, jeftinije nego pojedinačno.</p>
        <div class="us-hub-f"><span class="us-hub-p"><small>od</small>99 €</span><span class="us-hub-a">→</span></div>
      </a>
      <a class="us-hub-c" href="/demo-cenovnik">
        <div class="us-hub-k">Sve stavke</div>
        <h3>Cenovnik</h3>
        <p>Kompletan cenovnik po kategorijama vozila, bez zvanja i pitanja.</p>
        <div class="us-hub-f"><span class="us-hub-p">Pogledaj</span><span class="us-hub-a">→</span></div>
      </a>
      <a class="us-hub-c" href="/demo-loyalty">
        <div class="us-hub-k">Redovna nega</div>
        <h3>Loyalty program</h3>
        <p>Dva pranja mesečno po fiksnoj ceni i prioritetan termin. Za one koji auto drže čistim non-stop.</p>
        <div class="us-hub-f"><span class="us-hub-p"><small>od</small>35 €<small style="margin-left:6px">/mes</small></span><span class="us-hub-a">→</span></div>
      </a>
    </div>
  </div>
</section>`;

const PAKETI_KRATKO = `<section class="us-sec alt">
  <div class="us-in">
    <div class="sl">Paketi</div>
    <h2 class="sh">Tri nivoa<br><em>obrade</em></h2>
    <p class="sd">Kad se više usluga radi u istom terminu, ide kroz paket i izlazi jeftinije nego pojedinačno.</p>
    <div class="us-hub demo-pak3">
      <a class="us-hub-c" href="/demo-paketi">
        <div class="us-hub-k">01 — Osnovna nega</div>
        <h3>Clean</h3>
        <p>Ručno pranje u fazama, voskiranje, dubinsko pranje enterijera, potkrila i felne.</p>
        <div class="us-hub-f"><span class="us-hub-p"><small>od</small>99 €</span><span class="us-hub-a">→</span></div>
      </a>
      <a class="us-hub-c" href="/demo-paketi">
        <div class="us-hub-k">02 — Najpopularnije</div>
        <h3>Boost</h3>
        <p>Sve iz Clean paketa, plus poliranje laka i ručno karnauba voskiranje.</p>
        <div class="us-hub-f"><span class="us-hub-p"><small>od</small>249 €</span><span class="us-hub-a">→</span></div>
      </a>
      <a class="us-hub-c" href="/demo-paketi">
        <div class="us-hub-k">03 — Kompletno</div>
        <h3>Laker</h3>
        <p>Višeslojno poliranje, keramička zaštita Koch-Chemie i Nano-Glass na svim staklima.</p>
        <div class="us-hub-f"><span class="us-hub-p"><small>od</small>499 €</span><span class="us-hub-a">→</span></div>
      </a>
    </div>
  </div>
</section>`;

// hero bez „Scroll" strelice — na kratkoj strani nema šta da se skroluje
const HERO_KRATAK = D.hero.replace(/<div class="he-scroll">[\s\S]*?<\/div>\s*<\/section>/, '</section>');

// ── stranice ───────────────────────────────────────────────────────────
const STRANICE = {

  'demo-a': stranica({
    naslov: 'Varijanta A — Laker Detailing (demo)',
    opis: 'Demo varijanta A: hero, kratak tekst, putevi, mapa.',
    aktivna: '/demo',
    telo: [D.hero, PITCH, PUTEVI, D.loc].join('\n\n')
  }),

  'demo-b': stranica({
    naslov: 'Varijanta B — Laker Detailing (demo)',
    opis: 'Demo varijanta B: samo hero i mapa.',
    aktivna: '/demo',
    telo: [HERO_KRATAK, D.loc].join('\n\n')
  }),

  'demo-c': stranica({
    naslov: 'Varijanta C — Laker Detailing (demo)',
    opis: 'Demo varijanta C: hero, putevi, paketi sa cenom, mapa.',
    aktivna: '/demo',
    telo: [D.hero, PUTEVI, PAKETI_KRATKO, D.loc].join('\n\n')
  }),

  'demo-paketi': stranica({
    naslov: 'Paketi — Laker Detailing (demo)',
    opis: 'Demo: Clean, Boost i Laker paketi.',
    aktivna: '/demo-paketi',
    telo: promoviH1(D.pkg)
  }),

  'demo-cenovnik': stranica({
    naslov: 'Cenovnik — Laker Detailing (demo)',
    opis: 'Demo: kompletan cenovnik i česta pitanja.',
    aktivna: '/demo-cenovnik',
    telo: promoviH1([D.prc, D.faq].join('\n\n'))
  }),

  'demo-loyalty': stranica({
    naslov: 'Loyalty program — Laker Detailing (demo)',
    opis: 'Demo: loyalty program, dva pranja mesečno po fiksnoj ceni.',
    aktivna: '/demo-loyalty',
    telo: promoviH1(D.care),
    modali: D.loyOverlay
  }),

  'demo-o-nama': stranica({
    naslov: 'O nama — Laker Detailing (demo)',
    opis: 'Demo: ko smo, kako radimo, galerija i utisci klijenata.',
    aktivna: '/demo-o-nama',
    telo: promoviH1([D.phi, D.proc, D.cs, D.tst].join('\n\n')),
    modali: D.reviewModal
  }),

  'demo-kontakt': stranica({
    naslov: 'Kontakt — Laker Detailing (demo)',
    opis: 'Demo: adresa, radno vreme, telefon i mapa.',
    aktivna: '/demo-kontakt',
    telo: promoviH1(D.loc)
  })
};

// ── raskrsnica ─────────────────────────────────────────────────────────
function karticaVar(ruta, oznaka, ime, opis, sadrzaj) {
  return `      <a class="us-hub-c" href="${ruta}">
        <div class="us-hub-k">${oznaka}</div>
        <h3>${ime}</h3>
        <p>${opis}</p>
        <div class="us-hub-f"><span class="demo-sadrzaj">${sadrzaj}</span><span class="us-hub-a">→</span></div>
      </a>`;
}

STRANICE['demo'] = stranica({
  naslov: 'Demo — Laker Detailing',
  opis: 'Demo nove strukture sajta: tri varijante početne i sve podstranice.',
  aktivna: '/demo',
  telo: `<section class="us-hero">
  <div class="us-hero-in">
    <h1 class="us-h1">Tri varijante<br><em>početne.</em></h1>
    <p class="us-lead">Podstranice su iste za sve tri — razlikuje se samo početna strana. Otvorite jednu po jednu,
    prođite kroz meni kao posetilac, pa recite koja vam sedi. Ništa od ovoga nije javno.</p>
  </div>
</section>

<section class="us-sec">
  <div class="us-in">
    <div class="sl">Uporedite</div>
    <h2 class="sh">Početna<br><em>strana</em></h2>
    <div class="us-hub">
${karticaVar('/demo-a', 'Varijanta A', 'Uravnoteženo', 'Hero, kratak pasus o studiju, četiri kartice puteva i mapa. Posetilac odmah vidi šta radite i ima gde da klikne.', '2—3 ekrana')}
${karticaVar('/demo-b', 'Varijanta B', 'Maksimalno golo', 'Samo hero i mapa. Najčistije izgleda, ali ko ne klikne nikad ne sazna šta radite ni koliko košta.', '1—2 ekrana')}
${karticaVar('/demo-c', 'Varijanta C', 'Sa cenama', 'Hero, putevi i tri paketa sa cenom „od". Cena se vidi bez ijednog klika, ali je strana najduža.', '3—4 ekrana')}
    </div>
  </div>
</section>

<section class="us-sec alt">
  <div class="us-in">
    <div class="sl">Iste za sve tri</div>
    <h2 class="sh">Podstranice<br><em>iz menija</em></h2>
    <div class="us-hub">
${karticaVar('/demo-paketi', 'Meni', 'Paketi', 'Clean, Boost i Laker sa svim stavkama koje se otvaraju na plus.', 'Pogledaj')}
${karticaVar('/demo-cenovnik', 'Meni', 'Cenovnik', 'Sve cene po kategorijama vozila, sa tabovima, i česta pitanja na dnu.', 'Pogledaj')}
${karticaVar('/demo-loyalty', 'Meni', 'Loyalty', 'Program sa dva pranja mesečno. Prijava radi kao na pravom sajtu.', 'Pogledaj')}
${karticaVar('/demo-o-nama', 'Meni', 'O nama', 'Ko smo, kako radimo, galerija i utisci klijenata — spojeno u jednu stranu.', 'Pogledaj')}
${karticaVar('/demo-kontakt', 'Meni', 'Kontakt', 'Adresa, radno vreme, telefon i mapa.', 'Pogledaj')}
${karticaVar('/usluge', 'Meni', 'Usluge', 'Postojeći hub sa pet stranica usluga — ovo je već napravljeno, ne menja se.', 'Pogledaj')}
    </div>
  </div>
</section>

<section class="us-sec">
  <div class="us-in">
    <div class="us-note">
      <p><strong>Živi sajt nije diran.</strong> <a href="/" style="color:var(--gold)">lakerdetailing.rs</a> radi
      tačno kao pre — ovo su zasebne stranice koje nigde nisu linkovane i koje Google ne indeksira.</p>
      <p>Kad izaberete varijantu, ona postaje pravi sajt. Do tada se ništa ne menja.</p>
    </div>
  </div>
</section>`
});

// ── upis ───────────────────────────────────────────────────────────────
let uk = 0;
for (const [ime, html] of Object.entries(STRANICE)) {
  fs.writeFileSync(ime + '.html', html);
  console.log(String(html.split('\n').length).padStart(4) + ' lin  ' + ime + '.html');
  uk++;
}
console.log('\nGenerisano ' + uk + ' demo stranica. index.html nije diran.');
