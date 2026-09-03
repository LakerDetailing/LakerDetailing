// ══════════════════════════════════════════════════════════════════════════
// LAKER DETAILING — CENOVNIK
// Dve stvari: birač veličine vozila koji menja SVE cene na strani, i
// kalkulator „Sastavi sam" koji od izabranog auta i usluga pravi WhatsApp upit.
//
// Spisak auta je u assets/js/auti.js (window.LAKER_AUTI).
// Ništa se ne šalje na server — poruka se otvara u WhatsApp-u, korisnik je šalje.
// ══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var KAT = ['Mali', 'Srednji', 'Veliki', 'Ekstra'];
  var KAT_PUN = ['Mali · A i B klasa', 'Srednji · C klasa i mali krosover',
                 'Veliki · D i E klasa i SUV', 'Ekstra · veliki SUV, kombi i pikap'];
  // Red ispod dugmadi (#szHint). SUV i krosover idu po DUŽINI — pravilo je u
  // zaglavlju assets/js/auti.js; ovde stoji skraćeno da čovek odmah vidi gde
  // mu pada auto. Držati kratko: red se prelama najviše u dva reda na telefonu,
  // inače lepljiva traka poskakuje pri promeni veličine.
  var HINT = [
    'A i B klasa · Polo, Fabia, Clio, Fiesta',
    'C klasa i krosover do 4,35 m · Golf, Octavia, Juke',
    'D i E klasa i SUV 4,35–4,65 m · Passat, Tiguan, RAV4',
    'SUV preko 4,65 m, kombi i pikap · Kodiaq, X5'
  ];

  // ── USLUGE — iste cene kao u tabelama iznad (vidi CLAUDE.md, sekcija cene) ──
  var USLUGE = [
    { g: 'Eksterijer', id: 'pranje',    n: 'Premium ručno pranje u 3 faze',        c: [20, 25, 30, 35] },
    { g: 'Eksterijer', id: 'motor',     n: 'Detailing motornog prostora',          c: [30, 40, 45, 50] },
    { g: 'Eksterijer', id: 'ngfr',      n: 'Nano-Glass Front / Rear',              c: [30, 30, 40, 55] },
    { g: 'Eksterijer', id: 'ngall',     n: 'Nano-Glass All — sva stakla',          c: [50, 55, 65, 80] },
    { g: 'Enterijer',  id: 'detailing', n: 'Detailing auta (enterijer + eksterijer)', c: [99, 110, 130, 145] },
    { g: 'Enterijer',  id: 'koza',      n: 'Impregnacija kožnih površina',         c: [25, 40, 45, 50] },
    { g: 'Enterijer',  id: 'plastika',  n: 'Impregnacija plastičnih površina',     c: [25, 40, 45, 50] },
    { g: 'Poliranje i zaštita', id: 'pol1', n: 'Jednoslojno poliranje',            c: [100, 110, 135, 150] },
    { g: 'Poliranje i zaštita', id: 'p6',   n: 'One Cut & Finish P6',              c: [110, 130, 145, 155] },
    { g: 'Poliranje i zaštita', id: 'pol2', n: 'Dvoslojno poliranje',              c: [140, 150, 170, 195] },
    { g: 'Poliranje i zaštita', id: 'pol3', n: 'Troslojno / višeslojno poliranje', c: [235, 250, 260, 290] },
    { g: 'Poliranje i zaštita', id: 'keramika', n: 'Keramička zaštita (1 sloj)',   c: [140, 140, 205, 235] },
    { g: 'Poliranje i zaštita', id: 'nano',  n: '1K-Nano premaz',                  c: [80, 105, 115, 135] },
    { g: 'Poliranje i zaštita', id: 'vosak', n: 'Ručno karnauba voskiranje',       c: [45, 55, 60, 65] },
    { g: 'Poliranje i zaštita', id: 'farovi', n: 'Poliranje i zaštita farova',     c: [25, 25, 25, 25] }
  ];

  // ── ŠTA SE NE KOMBINUJE ─────────────────────────────────────────────────
  // U jednoj grupi sme da stoji samo JEDNA stavka. Čim je jedna izabrana,
  // ostale u grupi posive i ne mogu da se kliknu: nema smisla naručiti i
  // jednoslojno i dvoslojno poliranje, dva premaza preko istog laka, ni
  // Nano-Glass na prednje i zadnje staklo pa još jednom na sva stakla.
  // Da bi se izabrala druga stavka iz grupe, prvo se skida kvačica sa prve.
  var GRUPE = [
    { clanovi: ['pol1', 'p6', 'pol2', 'pol3'], zasto: 'već je izabran nivo poliranja' },
    { clanovi: ['keramika', 'nano', 'vosak'],  zasto: 'već je izabrana zaštita laka' },
    { clanovi: ['ngfr', 'ngall'],              zasto: 'već je izabran Nano-Glass' }
  ];

  // Veća usluga u sebi već sadrži manju — manja se gasi da se ne plati dvaput.
  var SADRZI = [
    // Impregnacija kože i plastike ulazi u Detailing auta (i u sva tri paketa),
    // pa se ne može dodati još jednom — vlasnik 2026-09-03. Samostalno se i dalje
    // naručuje, uz obično pranje, zato ostaje u USLUGE i u tabeli pojedinačnih cena.
    { veca: 'detailing', manje: ['pranje', 'koza', 'plastika'], zasto: 'već ulazi u Detailing auta' }
  ];

  // Vraća { id: razlog } za sve usluge koje trenutno ne mogu da se izaberu.
  function zakljucane() {
    var mapa = {}, i, j;
    for (var g = 0; g < GRUPE.length; g++) {
      var izabran = '';
      for (i = 0; i < GRUPE[g].clanovi.length; i++) {
        if (stanje.usluge.indexOf(GRUPE[g].clanovi[i]) > -1) { izabran = GRUPE[g].clanovi[i]; break; }
      }
      if (!izabran) continue;
      for (j = 0; j < GRUPE[g].clanovi.length; j++) {
        if (GRUPE[g].clanovi[j] !== izabran) mapa[GRUPE[g].clanovi[j]] = GRUPE[g].zasto;
      }
    }
    for (var v = 0; v < SADRZI.length; v++) {
      if (stanje.usluge.indexOf(SADRZI[v].veca) === -1) continue;
      for (i = 0; i < SADRZI[v].manje.length; i++) mapa[SADRZI[v].manje[i]] = SADRZI[v].zasto;
    }
    return mapa;
  }

  // Dodaje uslugu i izbacuje sve što ona zaključava. Bitno za par
  // „Detailing auta" / „Premium pranje": pranje se sme kliknuti prvo, pa
  // tek onda detailing — tada pranje ispada da se ne plati dvaput.
  // Kod grupa do sudara ne dolazi jer se sivi red uopšte ne klikće.
  function dodajUslugu(id) {
    if (stanje.usluge.indexOf(id) > -1) return;
    stanje.usluge.push(id);
    var zak = zakljucane();
    for (var j = stanje.usluge.length - 2; j >= 0; j--) {
      if (zak[stanje.usluge[j]]) stanje.usluge.splice(j, 1);
    }
  }

  var BOJE = [
    ['crna', '#141414'], ['bela', '#EDEDED'], ['siva', '#6E6E6E'], ['srebrna', '#B9BCC0'],
    ['crvena', '#B01C1C'], ['plava', '#1D3F80'], ['zelena', '#1F5136'], ['braon', '#4A3223'],
    ['bež', '#C8B491'], ['narandžasta', '#C2580E']
  ];

  // Slika auta se u kalkulatoru NE prikazuje (odluka vlasnika 2026-09-02) —
  // ostaje samo prepoznata kategorija, tip karoserije i izabrana boja u tekstu.
  var IME_KAROSERIJE = { h: 'hečbek', l: 'limuzina', k: 'karavan', s: 'SUV / krosover', v: 'kombi / van' };

  var KLJUC = 'laker_ponuda';

  var stanje = { sz: 0, marka: '', model: '', boja: 'crna', usluge: [] };

  // ═══════════════════════════════════════════════ pomoćne
  function $(id) { return document.getElementById(id); }
  function e(tag, cls, txt) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  }
  function bezKvacica(s) {
    return String(s).toLowerCase()
      .replace(/č|ć/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj');
  }
  function sacuvaj() {
    try { localStorage.setItem(KLJUC, JSON.stringify(stanje)); } catch (x) {}
  }
  function ucitaj() {
    try {
      var p = JSON.parse(localStorage.getItem(KLJUC) || 'null');
      if (p && typeof p === 'object') {
        stanje.sz = Math.min(3, Math.max(0, parseInt(p.sz, 10) || 0));
        stanje.marka = p.marka || '';
        stanje.model = p.model || '';
        stanje.boja = p.boja || 'crna';
        stanje.usluge = Array.isArray(p.usluge) ? p.usluge : [];
      }
    } catch (x) {}
  }

  // Stanje iz localStorage-a ume da bude staro: usluga koje više nema u
  // cenovniku ili kombinacija koja se od sada ne dozvoljava. Zadržava se
  // prva izabrana iz svake grupe, ostalo ispada.
  function uskladi() {
    var poznate = {}, i;
    for (i = 0; i < USLUGE.length; i++) poznate[USLUGE[i].id] = true;
    var trazene = stanje.usluge;
    stanje.usluge = [];
    for (i = 0; i < trazene.length; i++) {
      var id = trazene[i];
      if (!poznate[id] || stanje.usluge.indexOf(id) > -1) continue;
      if (zakljucane()[id]) continue;
      dodajUslugu(id);
    }
  }

  // ═══════════════════════════════════════════════ 1) birač veličine
  var szTabs = $('szTabs');

  function postaviVelicinu(i, odKalkulatora) {
    stanje.sz = i;

    if (szTabs) {
      var dugmad = szTabs.querySelectorAll('.tb');
      for (var d = 0; d < dugmad.length; d++) {
        var on = +dugmad[d].getAttribute('data-sz') === i;
        dugmad[d].classList.toggle('on', on);
        dugmad[d].setAttribute('aria-selected', on ? 'true' : 'false');
      }
    }
    var hint = $('szHint');
    if (hint) hint.textContent = HINT[i];

    // paketi
    var paketi = document.querySelectorAll('.pk[data-cene]');
    for (var p = 0; p < paketi.length; p++) {
      var cene = paketi[p].getAttribute('data-cene').split(',');
      var polje = paketi[p].querySelector('.pk-cena');
      if (polje) polje.textContent = cene[i];
      var kutije = paketi[p].querySelectorAll('.pk-sz');
      for (var q = 0; q < kutije.length; q++) {
        kutije[q].classList.toggle('on', +kutije[q].getAttribute('data-k') === i);
      }
    }

    // tabele pojedinačnih usluga
    var celije = document.querySelectorAll('#pojedinacne [data-k]');
    for (var c = 0; c < celije.length; c++) {
      celije[c].classList.toggle('prc-on', +celije[c].getAttribute('data-k') === i);
    }

    // Loyalty — Mali/Srednji dele cenu, Veliki/SUV dele cenu
    if (typeof window.selectLoyVeh === 'function') window.selectLoyVeh(i < 2 ? 'ms' : 'vs');

    // kalkulator
    if (!odKalkulatora) {
      // ručna promena veličine briše izabrani auto samo ako mu kategorija ne odgovara
      if (stanje.model && kategorijaModela(stanje.marka, stanje.model) !== i) {
        stanje.marka = ''; stanje.model = '';
        var trazi = $('cfgTrazi'); if (trazi) trazi.value = '';
        var mk = $('cfgMarka'); if (mk) mk.value = '';
        napuniModele('');
      }
    }
    crtajUsluge();
    crtajPonudu();
    sacuvaj();
  }

  if (szTabs) {
    szTabs.addEventListener('click', function (ev) {
      var b = ev.target.closest('.tb');
      if (b) postaviVelicinu(+b.getAttribute('data-sz'), false);
    });
  }

  // ═══════════════════════════════════════════════ 2) kalkulator
  var AUTI = window.LAKER_AUTI || null;
  var cfgL = $('cfgUsluge');
  if (!cfgL) { ucitaj(); postaviVelicinu(stanje.sz, false); return; }

  function nadjiModel(marka, model) {
    if (!AUTI || !AUTI[marka]) return null;
    for (var i = 0; i < AUTI[marka].length; i++) {
      if (AUTI[marka][i][0] === model) return AUTI[marka][i];
    }
    return null;
  }
  function kategorijaModela(marka, model) {
    var m = nadjiModel(marka, model);
    return m ? m[1] : -1;
  }

  // ── marka / model padajući meni ──
  var selMarka = $('cfgMarka'), selModel = $('cfgModel');
  if (AUTI) {
    var marke = Object.keys(AUTI);
    for (var i = 0; i < marke.length; i++) {
      var o = document.createElement('option');
      o.value = marke[i]; o.textContent = marke[i];
      selMarka.appendChild(o);
    }
  }

  function napuniModele(marka) {
    selModel.innerHTML = '<option value="">Model…</option>';
    if (!marka || !AUTI || !AUTI[marka]) { selModel.disabled = true; return; }
    selModel.disabled = false;
    var lista = AUTI[marka];
    for (var i = 0; i < lista.length; i++) {
      var o = document.createElement('option');
      o.value = lista[i][0]; o.textContent = lista[i][0];
      selModel.appendChild(o);
    }
  }

  selMarka.addEventListener('change', function () {
    napuniModele(this.value);
    stanje.marka = this.value; stanje.model = '';
    crtajAuto(); crtajPonudu(); sacuvaj();
  });
  selModel.addEventListener('change', function () {
    if (!this.value) return;
    izaberiAuto(selMarka.value, this.value);
  });

  function izaberiAuto(marka, model) {
    var m = nadjiModel(marka, model);
    if (!m) return;
    stanje.marka = marka; stanje.model = model;
    if (selMarka.value !== marka) { selMarka.value = marka; napuniModele(marka); }
    selModel.value = model;
    var trazi = $('cfgTrazi'); if (trazi) trazi.value = marka + ' ' + model;
    zatvoriRezultate();
    postaviVelicinu(m[1], true);
    crtajAuto();
    crtajPonudu();
    sacuvaj();
  }

  // ── pretraga po tekstu: „golf 4" nalazi Volkswagen Golf 4 ──
  var poljeTrazi = $('cfgTrazi'), kutijaRez = $('cfgRez'), izabranRed = -1, pogoci = [];

  function zatvoriRezultate() {
    if (!kutijaRez) return;
    kutijaRez.classList.remove('on');
    kutijaRez.innerHTML = '';
    izabranRed = -1;
    if (poljeTrazi) poljeTrazi.setAttribute('aria-expanded', 'false');
  }

  function trazi(upit) {
    var q = bezKvacica(upit).trim();
    if (!q || !AUTI) return [];
    var reci = q.split(/\s+/);
    var out = [];
    for (var marka in AUTI) {
      for (var i = 0; i < AUTI[marka].length; i++) {
        var m = AUTI[marka][i];
        var pun = bezKvacica(marka + ' ' + m[0]);
        var sve = true;
        for (var r = 0; r < reci.length; r++) {
          if (pun.indexOf(reci[r]) === -1) { sve = false; break; }
        }
        if (sve) out.push([marka, m]);
        if (out.length > 40) return out;
      }
    }
    return out;
  }

  function crtajRezultate(lista) {
    kutijaRez.innerHTML = '';
    if (!lista.length) {
      var p = e('div', 'prazno', 'Nema tog modela u spisku. Izaberite tip karoserije ručno ispod.');
      kutijaRez.appendChild(p);
      kutijaRez.classList.add('on');
      var rucno = $('cfgRucno'); if (rucno) rucno.hidden = false;
      return;
    }
    for (var i = 0; i < lista.length; i++) {
      (function (par) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'option');
        b.innerHTML = '';
        b.appendChild(document.createTextNode(par[0] + ' ' + par[1][0]));
        var s = e('small', null, KAT[par[1][1]]);
        b.appendChild(s);
        b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        b.addEventListener('click', function () { izaberiAuto(par[0], par[1][0]); });
        kutijaRez.appendChild(b);
      })(lista[i]);
    }
    kutijaRez.classList.add('on');
    poljeTrazi.setAttribute('aria-expanded', 'true');
  }

  if (poljeTrazi) {
    poljeTrazi.addEventListener('input', function () {
      pogoci = trazi(this.value);
      if (this.value.trim().length < 2) { zatvoriRezultate(); return; }
      crtajRezultate(pogoci);
    });
    poljeTrazi.addEventListener('keydown', function (ev) {
      var dugmad = kutijaRez.querySelectorAll('button');
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        if (!dugmad.length) return;
        ev.preventDefault();
        izabranRed += (ev.key === 'ArrowDown' ? 1 : -1);
        if (izabranRed < 0) izabranRed = dugmad.length - 1;
        if (izabranRed >= dugmad.length) izabranRed = 0;
        for (var i = 0; i < dugmad.length; i++) dugmad[i].classList.toggle('izabran', i === izabranRed);
        dugmad[izabranRed].scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'Enter') {
        if (izabranRed >= 0 && dugmad[izabranRed]) { ev.preventDefault(); dugmad[izabranRed].click(); }
        else if (dugmad.length === 1) { ev.preventDefault(); dugmad[0].click(); }
      } else if (ev.key === 'Escape') {
        zatvoriRezultate();
      }
    });
    poljeTrazi.addEventListener('blur', function () { setTimeout(zatvoriRezultate, 120); });
  }

  // ── ručni izbor karoserije kad modela nema u spisku ──
  var rucnoBtn = $('cfgRucnoBtn'), rucnoPolja = $('cfgRucnoPolja');
  if (rucnoBtn) {
    rucnoBtn.addEventListener('click', function () {
      rucnoPolja.hidden = !rucnoPolja.hidden;
      if (!rucnoPolja.hidden) crtajAuto();
    });
  }
  var selKaros = $('cfgKaros'), selVel = $('cfgVelicina');
  if (selKaros) selKaros.addEventListener('change', function () { crtajAuto(); crtajPonudu(); });
  if (selVel) selVel.addEventListener('change', function () {
    postaviVelicinu(+this.value, true); crtajAuto(); crtajPonudu();
  });

  // ── boje ──
  var kutijaBoja = $('cfgBoje');
  function crtajBoje() {
    kutijaBoja.innerHTML = '';
    for (var i = 0; i < BOJE.length; i++) {
      (function (b) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'col' + (b[0] === stanje.boja ? ' on' : '');
        d.style.background = b[1];
        d.title = b[0];
        d.setAttribute('aria-label', 'Boja: ' + b[0]);
        d.addEventListener('click', function () {
          stanje.boja = b[0];
          crtajBoje(); crtajAuto(); crtajPonudu(); sacuvaj();
        });
        kutijaBoja.appendChild(d);
      })(BOJE[i]);
    }
  }

  // ── prikaz auta ──
  function crtajAuto() {
    var kutija = $('cfgAuto'), kat = $('cfgKat'), sub = $('cfgKatSub');
    var m = nadjiModel(stanje.marka, stanje.model);
    var karoserija, kategorija;

    if (m) {
      karoserija = m[2]; kategorija = m[1];
    } else if (rucnoPolja && !rucnoPolja.hidden) {
      karoserija = selKaros.value; kategorija = +selVel.value;
    } else {
      kutija.hidden = true;
      return;
    }

    kutija.hidden = false;
    kat.childNodes[0].nodeValue = KAT[kategorija];
    sub.textContent = KAT_PUN[kategorija].split(' · ')[1] + ' · ' + IME_KAROSERIJE[karoserija] + ' · ' + stanje.boja;
  }

  // ── spisak usluga sa čekboksom ──
  function crtajUsluge() {
    if (!cfgL) return;
    cfgL.innerHTML = '';
    var zak = zakljucane();
    var grupa = '';
    for (var i = 0; i < USLUGE.length; i++) {
      var u = USLUGE[i];
      if (u.g !== grupa) {
        grupa = u.g;
        var g = e('li', 'g', grupa);
        g.style.cursor = 'default';
        g.style.borderTop = '0';
        cfgL.appendChild(g);
      }
      (function (u) {
        var izabrana = stanje.usluge.indexOf(u.id) > -1;
        var razlog = izabrana ? '' : (zak[u.id] || '');
        var li = e('li', izabrana ? 'on' : (razlog ? 'off' : ''));
        li.setAttribute('role', 'checkbox');
        li.setAttribute('tabindex', razlog ? '-1' : '0');
        li.setAttribute('aria-checked', izabrana ? 'true' : 'false');
        if (razlog) {
          li.setAttribute('aria-disabled', 'true');
          li.title = 'Ne ide zajedno — ' + razlog;
        }
        var bx = e('span', 'bx', izabrana ? '✓' : '');
        var im = e('span', null, u.n);
        if (razlog) im.appendChild(e('small', 'zas', razlog));
        var ce = e('span', 'p', u.c[stanje.sz] + ' €');
        li.appendChild(bx); li.appendChild(im); li.appendChild(ce);
        var prebaci = function () {
          if (razlog) return;
          var k = stanje.usluge.indexOf(u.id);
          if (k > -1) stanje.usluge.splice(k, 1); else dodajUslugu(u.id);
          crtajUsluge(); crtajPonudu(); sacuvaj();
        };
        li.addEventListener('click', prebaci);
        li.addEventListener('keydown', function (ev) {
          if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); prebaci(); }
        });
        cfgL.appendChild(li);
      })(u);
    }
  }

  // ── desna kartica: zbir i WhatsApp poruka ──
  function crtajPonudu() {
    var sumAuto = $('cfgSumAuto'), sum = $('cfgSum'), tot = $('cfgTot'), wa = $('cfgWa');
    if (!sum) return;

    var m = nadjiModel(stanje.marka, stanje.model);
    var imeAuta = m ? (stanje.marka + ' ' + stanje.model) :
      (rucnoPolja && !rucnoPolja.hidden ? 'Vaše vozilo' : '');
    if (imeAuta) {
      sumAuto.className = 'sum-auto ima';
      sumAuto.innerHTML = '';
      sumAuto.appendChild(document.createTextNode(imeAuta));
      sumAuto.appendChild(e('span', null, KAT_PUN[stanje.sz] + ' · ' + stanje.boja));
    } else {
      sumAuto.className = 'sum-auto';
      sumAuto.textContent = 'Izaberite auto';
    }

    sum.innerHTML = '';
    var zbir = 0, redovi = [];
    for (var i = 0; i < USLUGE.length; i++) {
      var u = USLUGE[i];
      if (stanje.usluge.indexOf(u.id) === -1) continue;
      var cena = u.c[stanje.sz];
      zbir += cena;
      redovi.push([u.n, cena]);
      var li = document.createElement('li');
      li.appendChild(document.createTextNode(u.n));
      var b = document.createElement('b');
      b.textContent = cena + ' €';
      li.appendChild(b);
      sum.appendChild(li);
    }
    if (!redovi.length) sum.appendChild(e('li', 'prazno', 'Još ništa nije izabrano'));
    tot.textContent = zbir + ' €';

    var spremno = redovi.length > 0;
    wa.setAttribute('aria-disabled', spremno ? 'false' : 'true');
    if (spremno) {
      var t = 'Zdravo! Želim ponudu.\n';
      t += 'Auto: ' + (imeAuta || 'nije izabran') + ' (' + KAT[stanje.sz] + ', ' + stanje.boja + ')\n';
      t += 'Usluge:\n';
      for (var r = 0; r < redovi.length; r++) t += '- ' + redovi[r][0] + ' ' + redovi[r][1] + ' €\n';
      t += 'Ukupno: ' + zbir + ' €';
      wa.href = 'https://wa.me/381607260302?text=' + encodeURIComponent(t);
    } else {
      wa.href = 'https://wa.me/381607260302';
    }
  }

  // ═══════════════════════════════════════════════ start
  ucitaj();
  uskladi();
  crtajBoje();
  if (stanje.marka) { napuniModele(stanje.marka); selMarka.value = stanje.marka; }
  if (stanje.marka && stanje.model && nadjiModel(stanje.marka, stanje.model)) {
    izaberiAuto(stanje.marka, stanje.model);
  } else {
    postaviVelicinu(stanje.sz, false);
    crtajAuto();
  }
  crtajUsluge();
  crtajPonudu();

  // „Prijava" sa drugih strana vodi na /cenovnik#prijava — tu se modal otvara sam.
  // setTimeout: main.min.js se učitava paralelno, openLoyalty postoji tek posle njega.
  function otvoriPrijavu() {
    if (typeof window.openLoyalty === 'function') window.openLoyalty();
  }
  if (location.hash === '#prijava') setTimeout(otvoriPrijavu, 60);
  // Na samom cenovniku je dugme „Prijava" u meniju #prijava — strana se ne učitava
  // ponovo, pa se modal otvara na promenu sidra.
  window.addEventListener('hashchange', function () {
    if (location.hash === '#prijava') otvoriPrijavu();
  });
})();
