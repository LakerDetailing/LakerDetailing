// ══════════════════════════════════════════════════════════════════════════
// LAKER DETAILING — CENOVNIK (nova strana, vlasnik odobrio 2026-09-22)
// 1) pretraga auta — indeks nad window.LAKER_AUTI (assets/js/auti.js, 1322 modela)
//    razume srpski izgovor i nadimke (pežo, kaškaj, fića, golf trojka, bmw petica),
//    oznake motora (320d, c220) i izbacuje zapreminu, snagu, gorivo i godište;
// 2) veličina auta (pretragom ili dugmetom) menja SVE cene na strani odjednom
//    (data-c="mali,srednji,veliki,ekstra"), WhatsApp poruke i Loyalty cenu;
// 3) /cenovnik#prijava otvara Loyalty modal iz main.js.
// Ništa se ne šalje na server; izabrana veličina se pamti u localStorage.
// ══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ══════════════════════════════════════════════════ 1) pretraga auta
  var A = window.LAKER_AUTI || {};

  // ── dodatne reči za pretragu ──
  // Kako ljudi zaista kucaju: srpski izgovor marke, nadimci, oznake motora.
  var MARKA = {
    'Volkswagen': 'vw folksvagen folcvagen folkswagen',
    'Mercedes-Benz': 'mercedes merc mb benz',
    'Škoda': 'skoda', 'Citroën': 'citroen sitroen', 'DS': 'citroen sitroen',
    'Peugeot': 'pezo pezho pezot', 'Renault': 'reno', 'Hyundai': 'hjundai hundai hyndai hjundaj hundaj',
    'Chevrolet': 'sevrolet sevi chevy', 'Toyota': 'tojota', 'Nissan': 'nisan', 'Mitsubishi': 'micubisi mitsubisi mitcubisi',
    'Porsche': 'porse porshe', 'Jeep': 'dzip dzipi', 'Land Rover': 'lendrover landrover rendz',
    'Kia': 'kija', 'Dacia': 'dacija', 'Zastava / Yugo': 'jugo',
    'Fiat': 'fijat', 'Alfa Romeo': 'alfa', 'Lexus': 'leksus', 'Jaguar': 'dzaguar', 'Cupra': 'kupra',
    'Dodge': 'dodz', 'Chrysler': 'krajsler', 'Lancia': 'lancija lanca', 'Daewoo': 'devo deo dejvu',
    'Daihatsu': 'dajhacu dajhatsu', 'SsangYong': 'sangjong sangyong', 'Cadillac': 'kadilak', 'Hummer': 'hamer',
    'Lamborghini': 'lamborgini', 'Ferrari': 'ferari', 'Bentley': 'bentli', 'Rolls-Royce': 'rols rolsrojs',
    'Moskvič': 'moskvic', 'Great Wall / Haval': 'greatwall'
  };
  // [marka, regex na naziv modela, reči] — važi za svaki model te marke koji se poklopi
  var RECI = [
    ['Mazda', /^MX-5/, 'miata'],
    ['BMW', /^Serija 1\b/, '114 116 118 120 123 125 128 130 135 m135 m140 keca'],
    ['BMW', /^Serija 2 Coupe/, '218 220 225 228 230 m235 m240 m2'],
    ['BMW', /^Serija 3\b/, '316 318 320 323 324 325 328 330 335 340 m3 trojka'],
    ['BMW', /^Serija 4\b/, '418 420 425 428 430 435 440 m4'],
    ['BMW', /^Serija 5\b/, '518 520 523 524 525 528 530 535 540 545 550 m5 petica'],
    ['BMW', /^Serija 6\b/, '628 630 635 640 645 650 m6'],
    ['BMW', /^Serija 7\b/, '725 728 730 732 735 740 745 750 760 sedmica'],
    ['BMW', /^Serija 8\b/, '840 850 m8'],
    ['Mercedes-Benz', /^A klasa/, 'a140 a150 a160 a170 a180 a190 a200 a220 a250 a35 a45'],
    ['Mercedes-Benz', /^B klasa/, 'b150 b160 b170 b180 b200 b220 b250'],
    ['Mercedes-Benz', /^C klasa/, 'c180 c200 c220 c230 c240 c250 c270 c280 c300 c320 c350 c400 c43 c63'],
    ['Mercedes-Benz', /^E klasa/, 'e200 e220 e230 e240 e250 e260 e270 e280 e290 e300 e320 e350 e400 e420 e430 e450 e500 e55 e63'],
    ['Mercedes-Benz', /^E klasa W124/, '124 200 220 230 250 260 280 300 320 sestica'],
    ['Mercedes-Benz', /^W123/, '200d 220d 230e 240d 250 280e 300d'],
    ['Mercedes-Benz', /^190/, '190e 190d bejbi'],
    ['Mercedes-Benz', /^S klasa/, 's280 s300 s320 s350 s400 s420 s430 s450 s500 s550 s560 s580 s600 s63 s65'],
    ['Mercedes-Benz', /^ML/, 'ml230 ml250 ml270 ml280 ml300 ml320 ml350 ml400 ml420 ml430 ml500 ml55 ml63'],
    ['Mercedes-Benz', /^CLA/, 'cla180 cla200 cla220 cla250 cla35 cla45'],
    ['Mercedes-Benz', /^CLS/, 'cls250 cls320 cls350 cls400 cls450 cls500 cls53 cls63'],
    ['Mercedes-Benz', /^CLK/, 'clk200 clk220 clk230 clk240 clk270 clk320 clk350 clk430 clk500'],
    ['Mercedes-Benz', /^SLK|^SLC/, 'slk200 slk230 slk250 slk280 slk350 slc200 slc300'],
    ['Mercedes-Benz', /^GLA/, 'gla180 gla200 gla220 gla250 gla35 gla45'],
    ['Mercedes-Benz', /^GLC/, 'glc200 glc220 glc250 glc300 glc43 glc63'],
    ['Mercedes-Benz', /^GLE/, 'gle250 gle300 gle350 gle400 gle450 gle53 gle63'],
    ['Mercedes-Benz', /^Vito/, '108 109 110 111 112 113 114 115 116 119 122'],
    ['Mercedes-Benz', /^Sprinter/, '208 210 211 213 215 216 308 311 313 315 316 318 319 411 413 416 516 518 519'],
    ['Audi', /^A3/, 's3 rs3'], ['Audi', /^A4/, 's4 rs4'], ['Audi', /^A5/, 's5 rs5'], ['Audi', /^A6/, 's6 rs6'],
    ['Audi', /^A7/, 's7 rs7'], ['Audi', /^A8/, 's8 a8l'], ['Audi', /^Q5/, 'sq5'], ['Audi', /^Q7/, 'sq7'], ['Audi', /^Q8$/, 'sq8 rsq8'],
    ['Audi', /^TT/, 'tts ttrs'], ['Audi', /^80/, 'b3 b4 osamdeset'],
    ['Volkswagen', /^Golf 1$/, 'keca jedinica gti'], ['Volkswagen', /^Golf 2$/, 'dvojka gti'], ['Volkswagen', /^Golf 3$/, 'trojka gti vr6'],
    ['Volkswagen', /^Golf 4$/, 'cetvorka gti gtd r32'], ['Volkswagen', /^Golf 5$/, 'petica gti gtd r32'], ['Volkswagen', /^Golf 6$/, 'sestica gti gtd'],
    ['Volkswagen', /^Golf 7$/, 'sedmica gti gtd golfr'], ['Volkswagen', /^Golf 8$/, 'osmica gti gtd golfr'],
    ['Volkswagen', /^Passat/, 'pasat'], ['Volkswagen', /^Touareg/, 'tuareg'], ['Volkswagen', /^Touran/, 'turan'],
    ['Volkswagen', /^Sharan/, 'saran'], ['Volkswagen', /^Caddy/, 'kedi kadi'], ['Volkswagen', /^Jetta/, 'dzeta'],
    ['Volkswagen', /^Beetle|^Buba/, 'buba kafer'], ['Volkswagen', /^Transporter|^Caravelle|^Multivan/, 'transporter kombi'],
    ['Volkswagen', /^Tiguan/, 'tigvan'], ['Volkswagen', /^Scirocco/, 'siroko'],
    ['Zastava / Yugo', /^750/, 'fica fico'], ['Zastava / Yugo', /^Zastava 101|^Skala/, 'stojadin stojadinka skala keca'],
    ['Zastava / Yugo', /^1300/, 'tristac'], ['Zastava / Yugo', /^Yugo/, 'jugo'],
    ['Lada', /^21/, 'ziguli zigula'], ['Lada', /^Niva/, 'niva 4x4'], ['Renault', /^4 /, 'katrca r4'],
    ['Citroën', /^2CV/, 'spacek'], ['Fiat', /^126/, 'peglica'], ['Mercedes-Benz', /^W114/, 'osmica strih'],
    ['Škoda', /^Octavia/, 'oktavija'], ['Škoda', /^Octavia [234]/, 'rs vrs'], ['Škoda', /^Fabia/, 'fabija'], ['Škoda', /^Kodiaq/, 'kodijak'],
    ['Škoda', /^Karoq/, 'karok'], ['Škoda', /^Kamiq/, 'kamik'], ['Škoda', /^Rapid/, 'spaceback'],
    ['Ford', /^Focus/, 'fokus st rs'], ['Ford', /^Fiesta/, 'fijesta st'], ['Ford', /^Galaxy/, 'galaksi'], ['Ford', /^Transit/, 'tranzit'],
    ['Ford', /^Kuga/, 'kuga'], ['Ford', /^Mondeo/, 'mondeo'],
    ['Renault', /^Clio/, 'klio rs'], ['Renault', /^Megane/, 'megan rs'], ['Renault', /^Scenic|^Grand Scenic/, 'senik megane scenic'],
    ['Renault', /^Captur/, 'kaptur'], ['Renault', /^Kadjar/, 'kadzar'], ['Renault', /^Twingo/, 'tvingo'], ['Renault', /^Espace/, 'espas'],
    ['Opel', /^Corsa/, 'korsa opc gsi'], ['Opel', /^Astra/, 'opc gsi'], ['Opel', /^Vectra/, 'vektra'], ['Opel', /^Insignia/, 'insignija'],
    ['Opel', /^Kadett/, 'kadet gsi'],
    ['Nissan', /^Qashqai/, 'kaskaj kaskai kaskaji kashkai'], ['Nissan', /^Juke/, 'dzuk'], ['Nissan', /^X-Trail/, 'xtrail iks trejl'],
    ['Nissan', /^NV200/, 'env200'],
    ['Hyundai', /^Tucson/, 'tuson'], ['Hyundai', /^i30/, 'i30n'], ['Kia', /^Sportage/, 'sportaz'], ['Kia', /^Picanto/, 'pikanto'],
    ['Kia', /^Ceed|^ProCeed/, 'cee\'d proceed'],
    ['Toyota', /^Yaris/, 'jaris gr'], ['Toyota', /^Aygo/, 'ajgo'], ['Toyota', /^Corolla/, 'korola'], ['Toyota', /^Land Cruiser/, 'lendkruzer'],
    ['Honda', /^Civic/, 'sivik typer'], ['Honda', /^Accord/, 'akord'], ['Honda', /^Jazz/, 'dzez'],
    ['Mitsubishi', /^Pajero/, 'padzero'], ['Mitsubishi', /^Lancer/, 'lanser evo evolution'],
    ['Subaru', /^Impreza/, 'wrx sti'], ['Suzuki', /^Jimny/, 'dzimni'], ['Suzuki', /^Swift/, 'svift'],
    ['Seat', /^Leon/, 'cupra fr'], ['Seat', /^Ibiza/, 'ibica fr cupra'], ['Seat', /^Altea/, 'alteja'],
    ['Peugeot', /^20[678]$|^30[78]$/, 'gti'],
    ['Porsche', /^Cayenne/, 'kajen'], ['Porsche', /^Macan/, 'makan'], ['Porsche', /^Cayman|^Boxster/, '718'],
    ['Land Rover', /^Range Rover/, 'rendz'], ['Land Rover', /^Defender/, '90 110 130'], ['Land Rover', /^Discovery/, 'diskaveri'],
    ['Land Rover', /^Range Rover Evoque/, 'evok'],
    ['Jeep', /Cherokee/, 'ceroki'], ['Jeep', /^Wrangler/, 'rengler'],
    ['Chevrolet', /^Lacetti/, 'laceti'], ['Chevrolet', /^Captiva/, 'kaptiva'],
    ['Citroën', /^Xsara/, 'ksara pikaso'], ['Citroën', /Picasso/, 'pikaso'], ['Citroën', /^Xantia/, 'ksantija'],
    ['Dacia', /^Duster/, 'daster'], ['Fiat', /^Ducato/, 'dukato'],
    ['Mini', /./, 'cooper dzon kuper jcw'], ['Tesla', /^Model/, 'model']
  ];
  var TIP = { h: 'hecbek hatchback', l: 'limuzina sedan', k: 'karavan', s: 'dzip suv', v: 'kombi van' };

  // Ime za prikaz: „Zastava / Yugo" + „Yugo 45" → „Yugo 45", + „Florida" → „Zastava Florida";
  // „DS" + „DS 3" → „DS 3"; „Ostalo" se ne piše.
  function prikaz(marka, model) {
    if (marka === 'Ostalo') return model;
    var alt = marka.split(' / ');
    for (var i = 0; i < alt.length; i++) if (model.toLowerCase().indexOf(alt[i].toLowerCase() + ' ') === 0) return model;
    return alt[0] + ' ' + model;
  }
  function bez(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj').replace(/ł/g, 'l'); }
  function sabij(s) { return s.replace(/[^a-z0-9]/g, ''); }

  // Indeks: za svaki model vidljivo ime, njegove reči i sve dodatne reči po kojima se traži.
  var IDX = [];
  Object.keys(A).forEach(function (marka) {
    A[marka].forEach(function (m) {
      var ime = prikaz(marka, m[0]);
      var dod = marka + ' ' + (MARKA[marka] || '') + ' ' + TIP[m[2]];
      RECI.forEach(function (r) { if (r[0] === marka && r[1].test(m[0])) dod += ' ' + r[2]; });
      var vid = bez(ime), d = bez(dod);
      IDX.push({ ime: ime, kat: m[1], vid: vid, tok: vid.split(/[^a-z0-9#]+/), mtok: bez(m[0]).split(/[^a-z0-9#]+/),
        dod: d, dtok: d.split(/[^a-z0-9#']+/), sab: sabij(vid + ' ' + d),
        mar: bez(marka + ' ' + (MARKA[marka] || '')), cif: /\d/.test(m[0]) });
    });
  });

  // Koliko dobro jedna ukucana reč pogađa model: tačna reč u imenu 3, početak reči u imenu 2,
  // dodatna reč (nadimak, oznaka motora) 2 ili 1, deo imena 1. „mx5", „cx 5", „320d", „c220cdi"
  // se traže i sabijeno i bez slova na kraju. -1 = ne pogađa, model ispada.
  function ocena(rec, t) {
    if (t.tok.indexOf(rec) > -1) return 3;
    for (var i = 0; i < t.tok.length; i++) if (t.tok[i].indexOf(rec) === 0) return 2;
    if (t.dtok.indexOf(rec) > -1) return 2;
    if (t.vid.indexOf(rec) > -1 || t.dod.indexOf(rec) > -1) return 1;
    var s = sabij(rec);
    if (s.length >= 3 && t.sab.indexOf(s) > -1) return 0.5;
    var krn = /^([a-z]{0,3}\d{2,4})[a-z]{1,4}$/.exec(s);
    if (krn && (t.dtok.indexOf(krn[1]) > -1 || t.tok.indexOf(krn[1]) > -1)) return 0.5;
    return -1;
  }
  // Vraća SVE pogotke, najbolji prvi. Pri istoj oceni ide kraće ime (Golf 4 pre Golf 4 Variant),
  // pa prirodni redosled (Golf 1, 2, 3 … 8).
  // Reči koje ljudi dopišu, a ne govore ništa o veličini: motor, pogon, gorivo, godište.
  var SUVISNO = /^(cdi|tdi|tsi|tfsi|fsi|hdi|bluehdi|dci|crdi|cdti|dti|tdci|jtd|jtdm|gdi|tce|vvt|vvti|ecoboost|multijet|hybrid|hibrid|dizel|benzin|plin|gas|4matic|xdrive|quattro|4motion|awd|4x4|automatik|manuelni|karoserija|auto|godiste|god|(19[5-9]|20[0-3])\d)$/;
  var LAKER_TRAZI = function (upit) {
    // zapremina motora (2.0, 1,9, 1.5dci) i snaga (150ks) se izbacuju pre deljenja na reči
    var q = bez(upit).replace(/\b\d[.,]\d[a-z]*\b/g, ' ').replace(/\b\d{2,3}\s?(ks|kw|hp)\b/g, ' ').replace(/[,.;:!?()]/g, ' ').trim();
    if (q.length < 2) return [];
    var sve = q.split(/\s+/), reci = sve.filter(function (r) { return !SUVISNO.test(r); });
    if (!reci.length) reci = sve;
    var out = [];
    IDX.forEach(function (t) {
      var bod = 0;
      for (var i = 0; i < reci.length; i++) {
        var o = ocena(reci[i], t);
        if (o < 0) return;
        bod += o;
        if (t.mtok.indexOf(reci[i]) > -1) bod += 1;            // reč je baš iz naziva modela (Yugo 45 pre Zastave Poly)
        if (i && (t.dtok.indexOf(reci[i - 1] + reci[i]) > -1 || t.tok.indexOf(reci[i - 1] + reci[i]) > -1)) bod += 3; // „c 220" → c220, „rav 4" → rav4
      }
      // kad je ukucan i model (ne samo marka), generacije idu pre ostalih: Passat B5 pre Alltrack-a, Clio 3 pre Grandtour-a
      if (t.cif && reci.some(function (r) { return t.mar.indexOf(r) === -1; })) bod += 0.2;
      out.push({ ime: t.ime, kat: t.kat, bod: bod, vid: t.vid, n: t.tok.length });
    });
    out.sort(function (a, b) {
      return b.bod - a.bod || a.n - b.n || a.vid.localeCompare(b.vid, 'sr', { numeric: true });
    });
    return out;
  };

  // ══════════════════════════════════════════════════ 3) prijava
  // „Prijava" sa drugih strana vodi na /cenovnik#prijava — tu se modal otvara sam.
  // main.min.js je ranije u redosledu (defer), pa openLoyalty već postoji;
  // setTimeout je rezerva ako se redosled ikad promeni.
  function otvoriPrijavu() {
    if (typeof window.openLoyalty === 'function') window.openLoyalty();
  }
  if (location.hash === '#prijava') setTimeout(otvoriPrijavu, 60);
  // Na samom cenovniku je dugme „Prijava" u meniju #prijava — strana se ne učitava
  // ponovo, pa se modal otvara na promenu sidra.
  window.addEventListener('hashchange', function () {
    if (location.hash === '#prijava') otvoriPrijavu();
  });

  // ══════════════════════════════════════════════════ 2) strana
  // Cene stoje u markup-u kao data-c="mali,srednji,veliki,ekstra"; ovde se
  // samo bira koja se od četiri prikazuje.
  var WA = 'https://wa.me/381607260302';
  var KLJUC = 'laker_ponuda';
  var SZ = [
    { n: 'Mali',    ex: 'Polo, Audi A2, Corsa' },
    { n: 'Srednji', ex: 'Golf, Peugeot 307, Rapid' },
    { n: 'Veliki',  ex: 'Camry, CX-5, Serija 5' },
    { n: 'Ekstra',  ex: 'X7, Tiggo 8, Macan' }
  ];
  // Loyalty: Mali/Srednji dele cenu, Veliki/Ekstra dele cenu — isto kao LOY_TABLE u main.js
  var LOY = { god: [299, 299, 349, 349], mes: [35, 35, 40, 40], ust: [29, 29, 27, 27] };
  var PRIKAZ = 8;   // koliko pogodaka pretrage odjednom

  var st = { sz: 0, bill: 'god' };
  try {
    var s = JSON.parse(localStorage.getItem(KLJUC) || 'null');
    if (s && s.sz >= 0 && s.sz <= 3) st.sz = s.sz | 0;
  } catch (e) {}
  function sacuvaj() { try { localStorage.setItem(KLJUC, JSON.stringify({ sz: st.sz })); } catch (e) {} }

  function $(id) { return document.getElementById(id); }
  function $$(q) { return Array.prototype.slice.call(document.querySelectorAll(q)); }
  function wa(t) { return WA + '?text=' + encodeURIComponent(t); }
  function eur(n) { return String(n).replace('.', ',') + ' €'; }

  var inp = $('fndIn'), rez = $('fndR'), ok = $('fndOk'), clr = $('fndX'), pick = $('szPick');
  if (!inp || !rez || !ok || !clr || !pick) return;

  function primeni() {
    var k = st.sz, za = SZ[k].n.toLowerCase() + ' auto', pun = za + ' (' + SZ[k].ex + ')';
    // data-n = samo broj (znak € stoji ispred kao <sup>)
    $$('[data-c]').forEach(function (el) { var n = el.getAttribute('data-c').split(',')[k]; el.textContent = el.hasAttribute('data-n') ? n : n + ' €'; });
    $$('[data-za]').forEach(function (el) { el.textContent = za; });
    $$('[data-zapun]').forEach(function (el) { el.textContent = pun; });
    $$('[data-wa]').forEach(function (el) { el.href = wa('Zdravo! Zanima me ' + el.getAttribute('data-wa') + ' za ' + pun + '.'); });
    $$('#szPick [data-sz]').forEach(function (b) {
      var on = +b.getAttribute('data-sz') === k;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
    // main.js pamti izbor za Loyalty prijavu (activateLoyalty pretpopuni formu)
    if (typeof window.selectLoyVeh === 'function') window.selectLoyVeh(k < 2 ? 'ms' : 'vs');
    loyalty();
    sacuvaj();
  }

  // ── Loyalty: Godišnje / Mesečno (godišnje je podrazumevano) ──
  function loyalty() {
    var k = st.sz, god = st.bill === 'god';
    $('loySave').textContent = '−' + LOY.ust[k] + '%';
    $('loyCena').textContent = god ? LOY.god[k] : LOY.mes[k];
    $('loyPer').textContent = god ? 'godišnje' : 'mesečno';
    $('loyNap').textContent = (god ? '= ' + eur((LOY.god[k] / 12).toFixed(2)) + ' mesečno · ' : 'bez ugovora · ') + 'za ' + SZ[k].n.toLowerCase() + ' auto';
    $$('[data-bill]').forEach(function (b) {
      var on = b.getAttribute('data-bill') === st.bill;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
    if (typeof window.selectLoyBill === 'function') window.selectLoyBill(st.bill);
  }
  $$('[data-bill]').forEach(function (b) {
    b.addEventListener('click', function () { st.bill = b.getAttribute('data-bill'); loyalty(); });
  });

  // ── birač veličine ──
  pick.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sz]');
    if (!b) return;
    st.sz = +b.getAttribute('data-sz');
    // ručni izbor veličine poništava izabrani auto, da ne piše jedno a cene budu druge
    if (!ok.hidden) { ok.hidden = true; inp.value = ''; clr.hidden = true; }
    primeni();
  });
  // „Promeni" kod pojedinačnih cena vraća na pretragu
  $$('[data-promeni]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('pick').scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 450);
    });
  });

  // ── pretraga auta: polje stoji otvoreno, rezultati se pojave dok se kuca ──
  var nadjeni = [], akt = -1;
  function zatvori() {
    rez.hidden = true;
    rez.innerHTML = '';
    inp.setAttribute('aria-expanded', 'false');
    inp.removeAttribute('aria-activedescendant');
    akt = -1;
  }
  function oznaci(i) {
    var opc = rez.querySelectorAll('[role=option]');
    if (!opc.length) return;
    akt = (i + opc.length) % opc.length;
    for (var j = 0; j < opc.length; j++) {
      opc[j].classList.toggle('akt', j === akt);
      opc[j].setAttribute('aria-selected', j === akt);
    }
    inp.setAttribute('aria-activedescendant', opc[akt].id);
    opc[akt].scrollIntoView({ block: 'nearest' });
  }
  function trazi() {
    var q = inp.value;
    clr.hidden = !q;
    if (!ok.hidden) ok.hidden = true;
    if (q.trim().length < 2) { zatvori(); nadjeni = []; return; }
    nadjeni = LAKER_TRAZI(q);
    rez.innerHTML = '';
    akt = -1;
    if (!nadjeni.length) {
      var n = document.createElement('div');
      n.className = 'nema';
      n.textContent = 'Taj model ne nalazimo. Proverite kako je napisan ili izaberite veličinu ispod, po autu koji je najsličniji vašem.';
      rez.appendChild(n);
    }
    nadjeni.slice(0, PRIKAZ).forEach(function (x, i) {
      var d = document.createElement('div');
      d.setAttribute('role', 'option');
      d.id = 'auto-' + i;
      d.setAttribute('data-i', i);
      d.setAttribute('data-sz', x.kat);   // mera.js ga broji kao izbor veličine
      d.setAttribute('aria-selected', 'false');
      d.appendChild(document.createTextNode(x.ime));
      var sm = document.createElement('small');
      sm.textContent = SZ[x.kat].n;
      d.appendChild(sm);
      rez.appendChild(d);
    });
    if (nadjeni.length > PRIKAZ) {
      var v = document.createElement('div');
      v.className = 'vise';
      v.textContent = 'Ima ih još ' + (nadjeni.length - PRIKAZ) + '. Dopišite model ili generaciju, npr. „golf 5“ ili „e90“.';
      rez.appendChild(v);
    }
    rez.hidden = false;
    inp.setAttribute('aria-expanded', 'true');
  }
  function izaberi(i) {
    var x = nadjeni[i];
    if (!x) return;
    st.sz = x.kat;
    inp.value = x.ime;
    clr.hidden = false;
    zatvori();
    ok.innerHTML = '';
    var a = document.createElement('b'); a.textContent = x.ime;
    var k = document.createElement('b'); k.textContent = SZ[x.kat].n;
    ok.appendChild(a);
    ok.appendChild(document.createTextNode(' je u kategoriji '));
    ok.appendChild(k);
    ok.appendChild(document.createTextNode('. Sve cene ispod su za tu veličinu.'));
    ok.hidden = false;
    primeni();
    if (window.matchMedia('(hover: none)').matches) inp.blur();   // na telefonu skloni tastaturu
  }
  inp.addEventListener('input', trazi);
  inp.addEventListener('focus', function () { if (inp.value && ok.hidden) trazi(); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (rez.hidden) trazi(); oznaci(akt + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); oznaci(akt - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!rez.hidden && nadjeni.length) izaberi(akt > -1 ? akt : 0); }
    else if (e.key === 'Escape') zatvori();
  });
  // mousedown, ne click: da polje ne izgubi fokus i ne zatvori spisak pre izbora
  rez.addEventListener('mousedown', function (e) {
    var o = e.target.closest('[role=option]');
    if (!o) return;
    e.preventDefault();
    izaberi(+o.getAttribute('data-i'));
  });
  inp.addEventListener('blur', function () { setTimeout(zatvori, 120); });
  clr.addEventListener('click', function () {
    inp.value = '';
    clr.hidden = true;
    ok.hidden = true;
    zatvori();
    inp.focus();
  });

  primeni();

})();
