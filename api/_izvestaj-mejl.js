// ══════════════════════════════════════════════════════════
//  Sastavljanje nedeljnog mejla — samo izgled, nula logike oko slanja.
//
//  Pravilo za tekst: piše se kao da objašnjavaš nekome ko nikad nije
//  video statistiku sajta. Nema „sesija", „konverzija", „bounce rate".
//  Svaki broj ima ispod sebe rečenicu šta znači.
//
//  Pravilo za HTML: samo tabele i inline stilovi. Gmail na telefonu
//  briše <style> blokove, flexbox i grid, pa ih nema. Gmail seče mejl
//  preko ~100 KB — zato su spiskovi ograničeni (top 8–12).
//
//  Podatke daje SQL funkcija stat_izvestaj (v2, 2026-09-03): brojevi po
//  strani, ulazi/izlazi, prelazi sa strane na stranu, kanal po PRVOM
//  otvaranju, sekcije po strani, kontakti po strani.
// ══════════════════════════════════════════════════════════

// ── Boje ──────────────────────────────────────────────────
const C = {
  crvena:  '#C0392B',
  zelena:  '#1E8449',
  plava:   '#2E6DA4',
  braon:   '#8E6E5E',
  siva2:   '#5D6D7E',
  crna:    '#1C1C1C',
  siva:    '#7C766D',
  bleda:   '#C8C2B7',
  svetla:  '#F3F1EE',
  karta:   '#FAF9F7',
  ivica:   '#E8E4DD',
  bela:    '#FFFFFF'
};

const FONT = 'Arial,Helvetica,sans-serif';

// ── Nazivi na srpskom ─────────────────────────────────────
// Strane sajta. Redosled ovde je i redosled u mejlu kad su brojevi isti.
const IME_STRANE = {
  '/':                  'Početna strana',
  '/usluge':            'Usluge (pregled)',
  '/premium-pranje':    'Premium ručno pranje',
  '/detailing-auta':    'Detailing auta',
  '/poliranje-laka':    'Poliranje laka',
  '/keramicka-zastita': 'Keramička zaštita',
  '/poliranje-farova':  'Poliranje farova',
  '/cenovnik':          'Cenovnik',
  '/loyalty-join':      'QR Loyalty prijava',
  '/dubinsko-ciscenje': 'Dubinsko čišćenje (stara strana)',
  '/radovi':            'Sajt u radovima'
};

const IME_SEKCIJE = {
  // početna
  hero: 'Naslovna slika',   phi: 'Priča o studiju',  cs: 'Slike radova',
  faq: 'Pitanja i odgovori', tst: 'Recenzije',       soc: 'Instagram i mreže',
  loc: 'Gde se nalazimo',
  // /usluge
  lista: 'Spisak usluga',
  // cenovnik
  paketi: 'Paketi',         loyalty: 'Loyalty članstvo',
  pojedinacne: 'Cene po usluzi', sastavi: 'Sastavi svoju ponudu',
  // strane usluga (blokovi .usl-block[id] + kartica cene .usl-aside#cena)
  kome: 'Kome je namenjeno', kako: 'Kako radimo', 'sta-ulazi': 'Šta ulazi',
  proizvod: 'Proizvod i trajnost', vazno: 'Važno da znate', nivoi: 'Četiri nivoa',
  trajnost: 'Koliko traje zaštita', 'cena-blok': 'Cena', cena: 'Kartica sa cenom',
  druge: 'Druge usluge (dno strane)',
  '1k-nano': '1K-Nano premaz', karnauba: 'Karnauba voskiranje', 'nano-glass': 'Nano-Glass',
  // sekcije koje više ne postoje — ostaju da stari podaci u izveštaju imaju ime
  proc: 'Kako se radi',     pkg: 'Paketi (stara početna)',
  care: 'Loyalty (stara početna)', prc: 'Cenovnik (stara početna)',
  book: 'Zakazivanje',      koraci: 'Kako radimo'
};

const IME_KLIKA = {
  whatsapp:              'Pisali na WhatsApp',
  telefon:               'Zvali telefonom',
  email:                 'Slali mejl',
  instagram:             'Otišli na Instagram',
  tiktok:                'Otišli na TikTok',
  mapa:                  'Tražili adresu na mapi',
  galerija:              'Uveličali sliku iz galerije',
  'paket-detalji':       'Otvorili detalje paketa',
  'loyalty-otvoren':     'Otvorili loyalty prijavu',
  'loyalty-prijava':     'Poslali loyalty prijavu',
  'loyalty-ulogovan':    'Ulogovali se u loyalty',
  'loyalty-aktivacija':  'Aktivirali loyalty',
  'recenzija-otvorena':  'Otvorili pisanje recenzije',
  'recenzija-poslata':   'Napisali recenziju',
  'ponuda-whatsapp':     'Poslali ponudu iz kalkulatora'
};

const IME_KANALA = {
  google:    'Sa Google pretrage',
  instagram: 'Sa Instagrama',
  facebook:  'Sa Facebooka',
  pretraga:  'Sa drugih pretraživača (Bing, DuckDuckGo…)',
  tiktok:    'Sa TikToka',
  youtube:   'Sa YouTube-a',
  poruka:    'Neko im poslao link (WhatsApp, Viber…)',
  direktno:  'Sami ukucali adresu ili sačuvana strana',
  ostalo:    'Sa nekog drugog sajta'
};

const IME_UREDJAJA = { telefon: 'Sa telefona', kompjuter: 'Sa računara', tablet: 'Sa tableta', ostalo: 'Ostalo' };
const IME_ZEMLJE   = { RS: 'Srbija', BA: 'Bosna i Hercegovina', ME: 'Crna Gora', HR: 'Hrvatska',
                       DE: 'Nemačka', AT: 'Austrija', CH: 'Švajcarska', US: 'SAD', SI: 'Slovenija',
                       MK: 'Severna Makedonija', IT: 'Italija', FR: 'Francuska', SE: 'Švedska',
                       NO: 'Norveška', GB: 'Velika Britanija', NL: 'Holandija', '??': 'Nepoznato' };

const DANI = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];

// ── Sitni pomoćnici ───────────────────────────────────────
function bez(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function imeStrane(p) {
  if (IME_STRANE[p]) return IME_STRANE[p];
  const q = String(p || '').replace(/\/$/, '').replace(/\.html$/, '') || '/';
  return IME_STRANE[q] || q;
}

// Ime klika, i za dinamičke oblike „ka:/cenovnik#sastavi" i „velicina:veliki".
function imeKlika(n) {
  const s = String(n || '');
  if (IME_KLIKA[s]) return IME_KLIKA[s];
  if (s.indexOf('ka:') === 0) {
    const cilj = s.slice(3);
    const [put, hash] = cilj.split('#');
    let ime = 'Prešli na: ' + imeStrane(put || '/');
    if (hash) ime += ' → ' + (IME_SEKCIJE[hash] || (hash === 'prijava' ? 'Prijava' : hash));
    return ime;
  }
  if (s.indexOf('velicina:') === 0) {
    const v = s.slice(9);
    const IME = { mali: 'Mali auto', srednji: 'Srednji auto', veliki: 'Veliki auto', ekstra: 'Ekstra (veliki SUV, kombi)' };
    return 'Izabrali veličinu: ' + (IME[v] || v);
  }
  return s;
}

// „1 čovek", „3 čoveka", „7 ljudi" — da rečenice zvuče normalno.
function ljudi(n) {
  const x = Number(n) || 0;
  const zadnja = x % 10, dve = x % 100;
  if (zadnja === 1 && dve !== 11) return x + ' čovek';
  if (zadnja >= 2 && zadnja <= 4 && (dve < 12 || dve > 14)) return x + ' čoveka';
  return x + ' ljudi';
}

// „1 put", „3 puta", „22 puta" — 21 je „put", 22 je „puta".
function puta(n) {
  const x = Number(n) || 0;
  const zadnja = x % 10, dve = x % 100;
  return (zadnja === 1 && dve !== 11) ? x + ' put' : x + ' puta';
}

// „1 kontakt", „4 kontakta", „11 kontakata"
function kontakata(n) {
  const x = Number(n) || 0;
  const zadnja = x % 10, dve = x % 100;
  if (zadnja === 1 && dve !== 11) return x + ' kontakt';
  if (zadnja >= 2 && zadnja <= 4 && (dve < 12 || dve > 14)) return x + ' kontakta';
  return x + ' kontakata';
}

function vreme(sec) {
  const n = Number(sec) || 0;
  if (!n) return '—';
  if (n < 60) return n + ' sek';
  const m = Math.floor(n / 60), s = n % 60;
  if (!s) return m + ' min';
  return m + ' min ' + s + ' sek';
}

// Meseci u genitivu — „16. avgusta", ne „16. avgust".
// Intl vraca nominativ, pa se ne moze koristiti za ovu recenicu.
const MESECI = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
                'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'];

function datum(d) {
  const bg = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
  return bg.getDate() + '. ' + MESECI[bg.getMonth()];
}

// „1:52" — kratko, da stane u kolonu velike kartice na telefonu.
function vremeKratko(sec) {
  const n = Number(sec) || 0;
  if (!n) return '—';
  const m = Math.floor(n / 60), s = n % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function procenat(sada, ranije) {
  const a = Number(sada) || 0, b = Number(ranije) || 0;
  if (!b) return null;
  return Math.round(((a - b) / b) * 100);
}

function pct(deo, celo) {
  const a = Number(deo) || 0, b = Number(celo) || 0;
  return b ? Math.round((a / b) * 100) : 0;
}

// ── Gradivni delovi ───────────────────────────────────────

// Strelica sa objašnjenjem u rečenici, ne samo broj.
function poredjenje(sada, ranije, prikazRanije) {
  const p = procenat(sada, ranije);
  if (p === null) {
    return '<span style="font-size:13px;color:' + C.siva + '">Prve nedelje — nema sa čim da se uporedi</span>';
  }
  if (p === 0) {
    return '<span style="font-size:13px;color:' + C.siva + '">Isto kao prošle nedelje</span>';
  }
  const gore = p > 0;
  const boja = gore ? C.zelena : C.crvena;
  const rec  = gore ? 'više' : 'manje';
  return '<span style="font-size:13px;color:' + boja + ';font-weight:700">' +
         (gore ? '▲' : '▼') + ' ' + Math.abs(p) + '% ' + rec + '</span>' +
         '<span style="font-size:13px;color:' + C.siva + '"> nego prošle nedelje — tada ' +
         bez(prikazRanije !== undefined && prikazRanije !== null ? prikazRanije : ranije) + '</span>';
}

// Velika kartica: broj levo, objašnjenje desno. Čita se i na telefonu.
function karta(broj, naslov, objasnjenje, poredjenjeHtml, boja) {
  return '' +
  '<tr><td style="padding:0 0 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
      'style="background:' + C.karta + ';border:1px solid ' + C.ivica + ';border-radius:12px">' +
      '<tr>' +
        '<td width="108" valign="middle" align="center" style="padding:18px 6px 18px 14px">' +
          '<div style="font-family:' + FONT + ';font-size:36px;line-height:1.05;font-weight:800;' +
            'color:' + (boja || C.crna) + '">' + bez(broj) + '</div>' +
        '</td>' +
        '<td valign="middle" style="padding:16px 16px 16px 6px;font-family:' + FONT + '">' +
          '<div style="font-size:16px;font-weight:700;color:' + C.crna + ';line-height:1.35">' + bez(naslov) + '</div>' +
          '<div style="font-size:13px;color:' + C.siva + ';line-height:1.5;margin:4px 0 6px">' + bez(objasnjenje) + '</div>' +
          (poredjenjeHtml || '') +
        '</td>' +
      '</tr>' +
    '</table>' +
  '</td></tr>';
}

// Naslov sekcije + rečenica ispod koja kaže šta se tu vidi.
function sekcija(naslov, objasnjenje) {
  return '<tr><td style="padding:28px 0 4px;font-family:' + FONT + ';font-size:19px;' +
         'font-weight:800;color:' + C.crna + '">' + bez(naslov) + '</td></tr>' +
         (objasnjenje
           ? '<tr><td style="padding:0 0 10px;font-family:' + FONT + ';font-size:13px;' +
             'color:' + C.siva + ';line-height:1.5">' + bez(objasnjenje) + '</td></tr>'
           : '');
}

// Manji podnaslov unutar sekcije (npr. ime strane iznad njenih delova).
function podnaslov(tekst) {
  return '<tr><td style="padding:14px 0 2px;font-family:' + FONT + ';font-size:14px;' +
         'font-weight:700;color:' + C.crna + '">' + bez(tekst) + '</td></tr>';
}

function traka(naziv, broj, najveci, sufiks, boja, vrednost) {
  const v = (vrednost === undefined || vrednost === null) ? broj : vrednost;
  const p = najveci > 0 ? Math.max(3, Math.round((v / najveci) * 100)) : 3;
  return '' +
  '<tr>' +
    '<td colspan="2" style="padding:9px 0 3px;font-family:' + FONT + ';font-size:14px;color:' + C.crna + '">' +
      bez(naziv) +
      '<span style="float:right;font-weight:700">' + bez(broj) + (sufiks || '') + '</span>' +
    '</td>' +
  '</tr>' +
  '<tr><td colspan="2" style="padding:0 0 4px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
      'style="background:' + C.svetla + ';border-radius:5px"><tr>' +
      '<td width="' + p + '%" style="background:' + (boja || C.crvena) + ';height:8px;' +
        'font-size:0;line-height:0;border-radius:5px">&nbsp;</td>' +
      '<td style="font-size:0;line-height:0">&nbsp;</td>' +
    '</tr></table>' +
  '</td></tr>';
}

function trakeBloka(redovi) {
  return '<tr><td style="padding:2px 0 0"><table role="presentation" width="100%" ' +
         'cellpadding="0" cellspacing="0">' + redovi + '</table></td></tr>';
}

function nemaPodataka(tekst) {
  return '<tr><td style="padding:10px 14px;background:' + C.svetla + ';border-radius:8px;' +
         'font-family:' + FONT + ';font-size:14px;color:' + C.siva + '">' + bez(tekst) + '</td></tr>';
}

// Generička tabela: zaglavlja + redovi već formatirani kao niz ćelija (HTML).
function tabela(zaglavlja, redovi, poravnanja) {
  const th = 'padding:9px 4px;font-family:' + FONT + ';font-size:11px;font-weight:700;' +
             'color:' + C.siva + ';border-bottom:2px solid ' + C.ivica;
  const td = 'padding:10px 4px;font-family:' + FONT + ';font-size:14px;' +
             'color:' + C.crna + ';border-bottom:1px solid ' + C.ivica;
  let r = '<tr>';
  zaglavlja.forEach((z, i) => {
    r += '<td style="' + th + ';text-align:' + (poravnanja[i] || 'center') + '">' + bez(z) + '</td>';
  });
  r += '</tr>';
  for (const red of redovi) {
    r += '<tr>';
    red.forEach((c, i) => {
      r += '<td style="' + td + ';text-align:' + (poravnanja[i] || 'center') + '">' + c + '</td>';
    });
    r += '</tr>';
  }
  return '<tr><td style="padding:2px 0 0"><table role="presentation" width="100%" ' +
         'cellpadding="0" cellspacing="0" style="border-collapse:collapse">' + r + '</table></td></tr>';
}

function sivo(t) { return '<span style="color:' + C.siva + ';font-size:13px">' + t + '</span>'; }
function jako(t, boja) { return '<b style="color:' + (boja || C.crna) + '">' + t + '</b>'; }

// ── Tabela dan po dan ─────────────────────────────────────
function tabelaDana(poDanima) {
  const redovi = poDanima.map(x => {
    const d = new Date(x.dan + 'T12:00:00Z');
    const kont = Number(x.kontakti) || 0;
    const vrh = (x.vrhunac === null || x.vrhunac === undefined) ? '–' : x.vrhunac + 'h';
    return [
      '<b>' + DANI[d.getUTCDay()].slice(0, 3) + '</b> ' + sivo(d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.'),
      jako(x.posetioci || 0),
      sivo(x.pregledi || 0),
      kont ? jako(kont, C.zelena) : '<span style="color:' + C.bleda + '">–</span>',
      sivo(x.vreme_sec ? vreme(x.vreme_sec) : '–'),
      sivo(vrh)
    ];
  });
  return tabela(['DAN', 'LJUDI', 'OTVARANJA', 'KONTAKTI', 'PO STRANI', 'NAJJAČI SAT'],
                redovi, ['left', 'center', 'center', 'center', 'center', 'center']);
}

// ── Tabela po stranama ────────────────────────────────────
function tabelaStrana(strane) {
  const redovi = strane.map(x => {
    const kont = Number(x.kontakt_ljudi) || 0;
    return [
      jako(imeStrane(x.putanja)),
      jako(x.ljudi || 0),
      sivo(x.pregledi || 0),
      sivo(x.vreme_sec ? vreme(x.vreme_sec) : '–'),
      sivo(x.dubina ? x.dubina + '%' : '–'),
      kont ? jako(kont, C.zelena) : '<span style="color:' + C.bleda + '">–</span>'
    ];
  });
  return tabela(['STRANA', 'LJUDI', 'OTVARANJA', 'ZADRŽE SE', 'PROČITAJU', 'KONTAKT'],
                redovi, ['left', 'center', 'center', 'center', 'center', 'center']);
}

// ══════════════════════════════════════════════════════════
//  Glavno
// ══════════════════════════════════════════════════════════
function sastaviMejl(sada, pre, dodatno, od, doo, opcije) {
  const o        = opcije || {};
  const kontakti = Number(sada.kontakt_ljudi) || 0;
  const kontPre  = Number(pre.kontakt_ljudi) || 0;
  const ima      = Number(sada.posetioci) > 0;
  const posetioci = Number(sada.posetioci) || 0;
  const vremePosete = Number(sada.vreme_posete) || Number(sada.vreme_sec) || 0;
  const vremePre    = Number(pre.vreme_posete)  || Number(pre.vreme_sec)  || 0;
  const strane   = (sada.strane || []).slice();

  let h = '';

  // ── Traka za primer ────────────────────────────────────
  if (o.primer) {
    h += '<tr><td style="padding:0 0 18px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
        'style="background:#FFF4E5;border:1px solid #F0C88A;border-radius:10px"><tr>' +
        '<td style="padding:14px 16px;font-family:' + FONT + ';font-size:14px;line-height:1.55;color:#7A5A1E">' +
          '<b>OVO JE SAMO PRIMER.</b> Brojevi u ovom mejlu su izmišljeni, da vidiš kako izveštaj izgleda. ' +
          'Pravi mejl sa stvarnim brojevima stiže ponedeljkom.' +
        '</td>' +
      '</tr></table>' +
    '</td></tr>';
  }

  // ── Zaglavlje ──────────────────────────────────────────
  h += '<tr><td style="padding:0 0 2px;font-family:' + FONT + ';font-size:12px;' +
       'letter-spacing:2px;color:' + C.crvena + ';font-weight:700">IZVEŠTAJ SA SAJTA</td></tr>' +
       '<tr><td style="padding:0 0 4px;font-family:Georgia,serif;font-size:27px;color:' + C.crna + '">' +
       'Kako je prošla nedelja</td></tr>' +
       '<tr><td style="padding:0 0 20px;font-family:' + FONT + ';font-size:14px;color:' + C.siva + '">' +
       'od ' + bez(datum(od)) + ' do ' + bez(datum(new Date(doo.getTime() - 1))) + '</td></tr>';

  // ── Rečenica na vrhu ───────────────────────────────────
  let uvod;
  if (!ima) {
    uvod = 'Ove nedelje sajt niko nije otvorio. Ako je merenje tek počelo, brojevi kreću da se skupljaju od sada.';
  } else if (kontakti > 0) {
    const p = procenat(kontakti, kontPre);
    uvod = 'Sajt je videlo <b>' + ljudi(posetioci) + '</b>, a <b>' + ljudi(kontakti) +
           '</b> je htelo da te kontaktira.' +
           (p !== null && p > 0 ? ' To je bolje nego prošle nedelje.' :
            p !== null && p < 0 ? ' To je slabije nego prošle nedelje.' : '');
  } else {
    uvod = 'Sajt je videlo <b>' + ljudi(posetioci) + '</b>, ali <b>niko</b> nije kliknuo ' +
           'na WhatsApp, telefon ni mejl. Ljudi dolaze, ali se ne javljaju.';
  }

  h += '<tr><td style="padding:16px 18px;background:#FDF6F5;border-left:4px solid ' + C.crvena + ';' +
       'border-radius:0 10px 10px 0;font-family:' + FONT + ';font-size:16px;line-height:1.65;' +
       'color:' + C.crna + '">' + uvod + '</td></tr>';

  // ── Četiri glavna broja ────────────────────────────────
  h += sekcija('Najvažnije', 'Četiri broja koja ti kažu kako sajt radi.');

  h += karta(kontakti, 'Hteli su da te kontaktiraju',
             'Toliko ljudi je kliknulo na WhatsApp, na tvoj broj telefona ili na mejl. Ovo je najvažniji broj — to su mogući poslovi.',
             poredjenje(kontakti, kontPre, ljudi(kontPre)), C.zelena);

  h += karta(posetioci, 'Toliko ljudi je videlo sajt',
             'Različiti ljudi, ne otvaranja. Ako isti čovek uđe tri puta istog dana, računa se kao jedan.',
             poredjenje(posetioci, pre.posetioci, ljudi(pre.posetioci)));

  h += karta(vremeKratko(vremePosete), 'Toliko minuta se zadrže na sajtu',
             'Minuti i sekunde (' + vreme(vremePosete) + '). Prosek jedne posete kroz sve strane koje čovek otvori. Broji se samo dok je sajt zaista na ekranu.',
             poredjenje(vremePosete, vremePre, vreme(vremePre)));

  const spp = Number(sada.strana_po_poseti) || 0;
  h += karta(sada.pregledi || 0, 'Toliko puta je otvorena neka strana',
             'Ukupan broj otvaranja svih strana.' + (spp ? ' U proseku jedan čovek pogleda ' +
             String(spp).replace('.', ',') + ' strane po poseti.' : ''),
             poredjenje(sada.pregledi, pre.pregledi, puta(pre.pregledi)));

  // ── Dan po dan ─────────────────────────────────────────
  h += sekcija('Svaki dan posebno',
               '„Po strani" je koliko se prosečno zadrže na jednoj strani tog dana. „Najjači sat" je kad je bilo najviše otvaranja.');
  h += (sada.po_danima || []).length ? tabelaDana(sada.po_danima) : nemaPodataka('Još nema podataka po danima.');

  // ── Strane ─────────────────────────────────────────────
  h += sekcija('Koje strane gledaju',
               '„Zadrže se" je prosečno vreme na toj strani. „Pročitaju" je dokle prosečno stignu niz stranu (100% = do dna). ' +
               '„Kontakt" je koliko je ljudi baš sa te strane kliknulo WhatsApp, telefon ili mejl.');
  if (strane.length) {
    h += tabelaStrana(strane);
  } else h += nemaPodataka('Još nema podataka.');

  // ── Ulazi i izlazi ─────────────────────────────────────
  const ulazi  = (sada.ulazi || []).filter(x => x.ljudi > 0);
  const izlazi = strane.filter(x => Number(x.izlazi) > 0).slice().sort((a, b) => b.izlazi - a.izlazi);
  if (ulazi.length || izlazi.length) {
    h += sekcija('Gde uđu, gde odu',
                 'Prva strana koju čovek otvori (ulaz) i poslednja pre nego što zatvori sajt (izlaz). ' +
                 'Ako mnogo ljudi izlazi sa neke strane usluge, tamo im nešto fali — cena, slika ili dugme.');
    if (ulazi.length) {
      h += podnaslov('Gde su ušli');
      const naj = Math.max.apply(null, ulazi.map(x => x.ljudi));
      let r = '';
      for (const x of ulazi.slice(0, 8)) r += traka(imeStrane(x.putanja), ljudi(x.ljudi), naj, '', C.plava, x.ljudi);
      h += trakeBloka(r);
    }
    if (izlazi.length) {
      h += podnaslov('Odakle su otišli');
      const naj = Math.max.apply(null, izlazi.map(x => x.izlazi));
      let r = '';
      for (const x of izlazi.slice(0, 8)) r += traka(imeStrane(x.putanja), ljudi(x.izlazi), naj, '', C.braon, x.izlazi);
      h += trakeBloka(r);
    }
  }

  // ── Kuda idu dalje ─────────────────────────────────────
  const prelazi = (sada.prelazi || []);
  if (prelazi.length) {
    h += sekcija('Kuda idu dalje',
                 'Najčešći putevi kroz sajt — sa koje strane na koju su prelazili. Vidi se šta ih zanima posle prvog pogleda.');
    const redovi = prelazi.slice(0, 12).map(x => [
      bez(imeStrane(x.sa)) + ' <span style="color:' + C.crvena + '">→</span> ' + jako(imeStrane(x.na)),
      jako(x.ljudi || 0),
      sivo(x.puta || 0)
    ]);
    h += tabela(['SA STRANE → NA STRANU', 'LJUDI', 'PUTA'], redovi, ['left', 'center', 'center']);
  }

  // ── Odakle dolaze ──────────────────────────────────────
  h += sekcija('Odakle su došli',
               'Kako su uopšte našli sajt. Gleda se samo prvo otvaranje — ko dođe sa Googla pa pređe na cenovnik, ostaje „sa Googla".');
  if ((sada.kanali || []).length) {
    const naj = Math.max.apply(null, sada.kanali.map(x => x.ljudi));
    let r = '';
    for (const x of sada.kanali) r += traka(IME_KANALA[x.kanal] || x.kanal, ljudi(x.ljudi), naj, '', C.crvena, x.ljudi);
    h += trakeBloka(r);
    const g = (sada.kanali.find(x => x.kanal === 'google') || {}).ljudi || 0;
    if (posetioci) {
      h += '<tr><td style="padding:8px 0 0;font-family:' + FONT + ';font-size:13px;color:' + C.siva + ';line-height:1.5">' +
           'Sa Google pretrage je došlo <b>' + pct(g, posetioci) + '%</b> ljudi. To je ono što Google pozicija donosi.</td></tr>';
    }
  } else h += nemaPodataka('Još nema podataka.');

  const izvori = (sada.izvori || []).filter(x => x.izvor && !/lakerdetailing/.test(x.izvor));
  if (izvori.length) {
    h += podnaslov('Tačno sa kojih sajtova');
    const redovi = izvori.slice(0, 8).map(x => [bez(x.izvor), jako(x.ljudi || 0)]);
    h += tabela(['SAJT', 'LJUDI'], redovi, ['left', 'center']);
  }

  // ── Šta su kliktali ────────────────────────────────────
  h += sekcija('Šta su kliktali',
               'Zeleno su klikovi koji vode do posla — WhatsApp, telefon, mejl — i sa koje strane su ih kliknuli. Sivo je sve ostalo.');
  const kps = (sada.kontakti_po_strani || []);
  if (kps.length) {
    const naj = Math.max.apply(null, kps.map(x => x.klikova));
    let r = '';
    for (const x of kps.slice(0, 10)) {
      // traka() escape-uje naziv i broj; HTML sme samo u sufiks.
      r += traka(imeKlika(x.naziv) + ' — sa strane: ' + imeStrane(x.putanja), puta(x.klikova),
                 naj, ' <span style="font-weight:400;color:' + C.siva + '">· ' + bez(ljudi(x.ljudi)) + '</span>',
                 C.zelena, x.klikova);
    }
    h += trakeBloka(r);
  } else h += nemaPodataka('Niko nije kliknuo na WhatsApp, telefon ni mejl ove nedelje.');

  const ostali = (sada.ostali_klikovi || []);
  if (ostali.length) {
    h += podnaslov('Ostali klikovi');
    const naj = Math.max.apply(null, ostali.map(x => x.klikova));
    let r = '';
    for (const x of ostali.slice(0, 14)) {
      r += traka(imeKlika(x.naziv) + ' — sa strane: ' + imeStrane(x.putanja), puta(x.klikova), naj, '', C.bleda, x.klikova);
    }
    h += trakeBloka(r);
  }

  // ── Dokle stižu — po strani ────────────────────────────
  const sekcije = (sada.sekcije || []).filter(x => x.od_ukupno > 0);
  if (sekcije.length) {
    h += sekcija('Dokle su stigli niz svaku stranu',
                 'Koliko od ljudi koji su otvorili tu stranu je stiglo do kog dela. Gde traka naglo padne — tu ih gubiš.');
    // Grupiši po strani, redosled strana kao u tabeli strana (po broju otvaranja).
    const redStrana = strane.map(x => x.putanja);
    const poStrani = {};
    for (const x of sekcije) (poStrani[x.putanja] = poStrani[x.putanja] || []).push(x);
    const putanje = Object.keys(poStrani).sort((a, b) => {
      const ia = redStrana.indexOf(a), ib = redStrana.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    for (const p of putanje.slice(0, 9)) {
      const lista = poStrani[p].slice().sort((a, b) => b.sesija - a.sesija);
      h += podnaslov(imeStrane(p) + ' — otvorena ' + puta(lista[0].od_ukupno));
      let r = '';
      for (const x of lista.slice(0, 12)) {
        const procenat_ = pct(x.sesija, x.od_ukupno);
        r += traka(IME_SEKCIJE[x.sekcija] || x.sekcija, procenat_,
                   100, '<span style="font-weight:400;color:' + C.siva + '">%</span>', C.braon, procenat_);
      }
      h += trakeBloka(r);
    }
  }

  // ── Uređaji, brauzeri ──────────────────────────────────
  h += sekcija('Sa čega gledaju', 'Ako je skoro sve telefon, sajt mora prvo na telefonu da izgleda savršeno.');
  if ((sada.uredjaji || []).length) {
    const naj = Math.max.apply(null, sada.uredjaji.map(x => x.ljudi));
    let r = '';
    for (const x of sada.uredjaji) r += traka(IME_UREDJAJA[x.uredjaj] || x.uredjaj, ljudi(x.ljudi), naj, '', C.siva2, x.ljudi);
    h += trakeBloka(r);
  } else h += nemaPodataka('Još nema podataka.');

  if ((sada.brauzeri || []).length) {
    h += podnaslov('Koji pregledač koriste');
    const naj = Math.max.apply(null, sada.brauzeri.map(x => x.ljudi));
    let r = '';
    for (const x of sada.brauzeri) r += traka(x.brauzer === 'ostalo' ? 'Ostalo' : x.brauzer, ljudi(x.ljudi), naj, '', C.bleda, x.ljudi);
    h += trakeBloka(r);
  }

  // ── Gradovi i zemlje ───────────────────────────────────
  h += sekcija('Iz kog su grada',
               'Grad daje mreža preko koje su na internetu, pa mobilni internet često „vidi" kao Beograd i kad je čovek u Čačku. Uzmi sa rezervom.');
  if ((sada.gradovi || []).length) {
    const naj = Math.max.apply(null, sada.gradovi.map(x => x.ljudi));
    let r = '';
    for (const x of sada.gradovi) {
      r += traka(x.grad === 'nepoznato' ? 'Nepoznato' : x.grad, ljudi(x.ljudi), naj, '', C.siva2, x.ljudi);
    }
    h += trakeBloka(r);
  } else h += nemaPodataka('Još nema podataka.');

  const zemlje = (sada.zemlje || []).filter(x => x.zemlja && x.zemlja !== 'RS');
  if (zemlje.length) {
    const redovi = zemlje.map(x => [bez(IME_ZEMLJE[x.zemlja] || x.zemlja), jako(x.ljudi || 0)]);
    h += podnaslov('Iz inostranstva');
    h += tabela(['ZEMLJA', 'LJUDI'], redovi, ['left', 'center']);
  }

  // ── Istorija ───────────────────────────────────────────
  const nedelje = (dodatno.nedelje || []).filter(n => Number(n.posetioci) > 0);
  if (nedelje.length > 1) {
    h += sekcija('Nedelja po nedelja', 'Da vidiš da li sajt raste ili stoji. Jedan red je jedna nedelja.');
    const naj = Math.max.apply(null, nedelje.map(x => x.posetioci));
    let r = '';
    for (const n of nedelje) {
      const a = new Date(n.od + 'T12:00:00Z');
      const b = new Date(a.getTime() + 6 * 24 * 60 * 60 * 1000);
      const raspon = a.getUTCDate() + '.' + (a.getUTCMonth() + 1) + '. – ' +
                     b.getUTCDate() + '.' + (b.getUTCMonth() + 1) + '.';
      r += traka(raspon, ljudi(n.posetioci), naj,
                 ' <span style="font-weight:400;color:' + C.siva + '">· ' +
                 kontakata(n.kontakti || 0) + '</span>', C.crvena, n.posetioci);
    }
    h += trakeBloka(r);
  }

  // ── Šta ovo znači ──────────────────────────────────────
  h += sekcija('Šta ti ovo govori', 'Kratko, na osnovu brojeva odozgo.');

  const saveti = [];
  if (ima && kontakti === 0) {
    saveti.push('Ljudi dolaze na sajt, ali niko se ne javlja. Vredi da dugme za WhatsApp bude vidljivije, više puta niz stranu.');
  }
  if (ima) {
    const oo = Number(sada.odmah_otisli) || 0;
    saveti.push('<b>' + oo + '%</b> ljudi ode za manje od 10 sekundi, bez ijednog klika i bez druge strane.' +
      (oo > 70 ? ' To je visoko — znači da ih prvi ekran ne zadrži, tu je najveći dobitak ako se popravi.' : ''));
    const vs = Number(sada.vise_strana) || 0;
    if (vs) saveti.push('<b>' + ljudi(vs) + '</b> je otvorilo više od jedne strane (' + pct(vs, posetioci) + '% svih). Toliko njih je stvarno razgledalo.');
    const vr = Number(sada.vratili_se) || 0;
    if (vr) saveti.push('<b>' + ljudi(vr) + '</b> se istog dana vratilo na sajt bar još jednom.');
  }
  // Najgledanija strana usluge
  const usluge = strane.filter(x => x.putanja !== '/' && x.putanja !== '/usluge' && x.putanja !== '/cenovnik' && x.putanja !== '/loyalty-join');
  if (usluge.length) {
    const top = usluge.slice().sort((a, b) => b.ljudi - a.ljudi)[0];
    saveti.push('Od usluga najviše ih zanima <b>' + bez(imeStrane(top.putanja)) + '</b> — ' + ljudi(top.ljudi) +
                (top.vreme_sec ? ', zadrže se prosečno ' + vreme(top.vreme_sec) : '') + '.');
  }
  const cen = strane.find(x => x.putanja === '/cenovnik');
  if (cen && posetioci) {
    saveti.push('Do cenovnika je stiglo <b>' + pct(cen.ljudi, posetioci) + '%</b> ljudi (' + ljudi(cen.ljudi) + ').' +
                (cen.kontakt_ljudi ? ' Sa cenovnika te je kontaktiralo ' + ljudi(cen.kontakt_ljudi) + '.' : ''));
  }
  const najSat = (sada.po_satima || []).reduce((a, b) => (!a || b.posetioci > a.posetioci ? b : a), null);
  if (najSat) {
    saveti.push('Najviše ljudi otvara sajt oko <b>' + najSat.sat + ':00</b>. Ako objavljuješ nešto na Instagramu, to je najbolje vreme.');
  }
  saveti.push('Nove loyalty prijave preko sajta ove nedelje: <b>' + (dodatno.prijave || 0) + '</b>. Nove recenzije: <b>' + (dodatno.recenzije || 0) + '</b>.');

  h += '<tr><td style="padding:4px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">';
  for (const s of saveti) {
    h += '<tr><td valign="top" width="22" style="padding:6px 0;font-family:' + FONT + ';' +
         'font-size:15px;color:' + C.crvena + '">•</td>' +
         '<td style="padding:6px 0;font-family:' + FONT + ';font-size:15px;line-height:1.6;' +
         'color:' + C.crna + '">' + s + '</td></tr>';
  }
  h += '</table></td></tr>';

  // ── Podnožje ───────────────────────────────────────────
  h += '<tr><td style="padding:28px 0 0;border-top:1px solid ' + C.ivica + ';font-family:' + FONT + ';' +
       'font-size:12px;line-height:1.75;color:#A09A90">' +
       '<b>Odakle ovi brojevi.</b> Sajt ih meri sam. Nema kolačića i ne zna se ko je ko — ' +
       'samo koliko ih je bilo i šta su radili. Roboti (Google, skeneri) se ne broje.<br>' +
       '<b>Tvoje posete se ne broje</b> na uređaju na kojem si jednom otvorio ' +
       'lakerdetailing.rs/?analitika=off<br>' +
       'Ovaj mejl sajt šalje sam, svakog ponedeljka u podne. Niko ga ne kuca ručno.' +
       '</td></tr>';

  return '<!doctype html><html lang="sr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light only">' +
    '</head><body style="margin:0;padding:0;background:' + C.svetla + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
      'style="background:' + C.svetla + '"><tr><td align="center" style="padding:20px 10px 34px">' +
    '<table role="presentation" width="620" cellpadding="0" cellspacing="0" ' +
      'style="max-width:620px;width:100%;background:' + C.bela + ';border-radius:16px;padding:28px 24px">' +
    h +
    '</table></td></tr></table></body></html>';
}

module.exports = { sastaviMejl, ljudi, vreme, datum, IME_STRANE, IME_SEKCIJE };

// ══════════════════════════════════════════════════════════
//  Izmišljeni brojevi za prikaz izgleda mejla.
//  Koriste ih i /api/izvestaj?primer=1 i tools-izvestaj-proba.js,
//  da proba i pravi mejl uvek izgledaju isto.
// ══════════════════════════════════════════════════════════
function primerPodaci() {
  const sada = {
    posetioci: 147, pregledi: 286, vreme_sec: 58, vreme_posete: 112, dubina: 58,
    odmah_otisli: 41, ukupno_sesija: 286, kontakt_ljudi: 24,
    strana_po_poseti: 1.9, vise_strana: 63, vratili_se: 12,
    kontakti: [
      { naziv: 'whatsapp',           klikova: 22, ljudi: 18 },
      { naziv: 'telefon',            klikova: 11, ljudi:  9 },
      { naziv: 'email',              klikova:  2, ljudi:  2 },
      { naziv: 'galerija',           klikova: 47, ljudi: 26 },
      { naziv: 'instagram',          klikova:  8, ljudi:  7 }
    ],
    kontakti_po_strani: [
      { putanja: '/',            naziv: 'whatsapp', klikova: 12, ljudi: 10 },
      { putanja: '/cenovnik',    naziv: 'whatsapp', klikova:  7, ljudi:  6 },
      { putanja: '/',            naziv: 'telefon',  klikova:  6, ljudi:  5 },
      { putanja: '/cenovnik',    naziv: 'telefon',  klikova:  4, ljudi:  3 },
      { putanja: '/poliranje-laka', naziv: 'whatsapp', klikova: 3, ljudi: 2 },
      { putanja: '/',            naziv: 'email',    klikova:  2, ljudi:  2 },
      { putanja: '/detailing-auta', naziv: 'telefon', klikova: 1, ljudi: 1 }
    ],
    ostali_klikovi: [
      { naziv: 'galerija',            putanja: '/',        klikova: 47, ljudi: 26 },
      { naziv: 'ka:/cenovnik',        putanja: '/',        klikova: 31, ljudi: 28 },
      { naziv: 'ka:/usluge',          putanja: '/',        klikova: 24, ljudi: 22 },
      { naziv: 'ka:/poliranje-laka',  putanja: '/usluge',  klikova: 11, ljudi: 11 },
      { naziv: 'ka:/cenovnik#sastavi', putanja: '/poliranje-laka', klikova: 6, ljudi: 6 },
      { naziv: 'velicina:veliki',     putanja: '/cenovnik', klikova: 9, ljudi: 7 },
      { naziv: 'velicina:srednji',    putanja: '/cenovnik', klikova: 6, ljudi: 5 },
      { naziv: 'paket-detalji',       putanja: '/cenovnik', klikova: 14, ljudi: 9 },
      { naziv: 'instagram',           putanja: '/',        klikova:  8, ljudi: 7 },
      { naziv: 'ponuda-whatsapp',     putanja: '/cenovnik', klikova: 3, ljudi: 3 }
    ],
    po_danima: [
      { dan: '2026-08-24', posetioci: 14, pregledi: 26, kontakti: 1, vreme_sec:  41, vrhunac: 20 },
      { dan: '2026-08-25', posetioci: 26, pregledi: 51, kontakti: 6, vreme_sec:  62, vrhunac: 19 },
      { dan: '2026-08-26', posetioci: 19, pregledi: 37, kontakti: 3, vreme_sec:  48, vrhunac: 13 },
      { dan: '2026-08-27', posetioci: 23, pregledi: 44, kontakti: 5, vreme_sec:  57, vrhunac: 19 },
      { dan: '2026-08-28', posetioci: 31, pregledi: 61, kontakti: 9, vreme_sec:  74, vrhunac: 21 },
      { dan: '2026-08-29', posetioci: 22, pregledi: 41, kontakti: 7, vreme_sec:  55, vrhunac: 18 },
      { dan: '2026-08-30', posetioci: 12, pregledi: 26, kontakti: 2, vreme_sec:  34, vrhunac: 11 }
    ],
    po_satima: [{ sat: 9, posetioci: 8 }, { sat: 13, posetioci: 15 },
                { sat: 19, posetioci: 27 }, { sat: 21, posetioci: 22 }],
    kanali: [
      { kanal: 'google', ljudi: 71 }, { kanal: 'instagram', ljudi: 38 },
      { kanal: 'direktno', ljudi: 24 }, { kanal: 'poruka', ljudi: 9 },
      { kanal: 'facebook', ljudi: 5 }
    ],
    izvori: [{ izvor: 'google.com', ljudi: 71 }, { izvor: 'l.instagram.com', ljudi: 38 },
             { izvor: 'bing.com', ljudi: 3 }, { izvor: 'm.facebook.com', ljudi: 5 }],
    uredjaji: [{ uredjaj: 'telefon', ljudi: 118 }, { uredjaj: 'kompjuter', ljudi: 23 },
               { uredjaj: 'tablet', ljudi: 6 }],
    brauzeri: [{ brauzer: 'Chrome', ljudi: 79 }, { brauzer: 'Safari', ljudi: 51 },
               { brauzer: 'Samsung', ljudi: 11 }, { brauzer: 'Edge', ljudi: 6 }],
    gradovi: [
      { grad: 'Čačak', ljudi: 76 }, { grad: 'Belgrade', ljudi: 21 },
      { grad: 'Kraljevo', ljudi: 14 }, { grad: 'Užice', ljudi: 11 },
      { grad: 'Gornji Milanovac', ljudi: 9 }, { grad: 'nepoznato', ljudi: 16 }
    ],
    zemlje: [{ zemlja: 'RS', ljudi: 139 }, { zemlja: 'DE', ljudi: 5 }, { zemlja: 'CH', ljudi: 3 }],
    strane: [
      { putanja: '/',                  pregledi: 131, ljudi: 121, vreme_sec: 44, dubina: 52, ulazi: 108, izlazi: 61, kontakt_ljudi: 15 },
      { putanja: '/cenovnik',          pregledi:  58, ljudi:  49, vreme_sec: 96, dubina: 71, ulazi:  19, izlazi: 38, kontakt_ljudi:  8 },
      { putanja: '/usluge',            pregledi:  41, ljudi:  36, vreme_sec: 12, dubina: 60, ulazi:   6, izlazi:  9, kontakt_ljudi:  0 },
      { putanja: '/poliranje-laka',    pregledi:  22, ljudi:  20, vreme_sec: 81, dubina: 66, ulazi:   7, izlazi: 14, kontakt_ljudi:  2 },
      { putanja: '/keramicka-zastita', pregledi:  15, ljudi:  14, vreme_sec: 74, dubina: 58, ulazi:   4, izlazi: 11, kontakt_ljudi:  0 },
      { putanja: '/detailing-auta',    pregledi:  11, ljudi:  10, vreme_sec: 63, dubina: 70, ulazi:   2, izlazi:  8, kontakt_ljudi:  1 },
      { putanja: '/premium-pranje',    pregledi:   5, ljudi:   5, vreme_sec: 52, dubina: 64, ulazi:   1, izlazi:  4, kontakt_ljudi:  0 },
      { putanja: '/poliranje-farova',  pregledi:   3, ljudi:   3, vreme_sec: 40, dubina: 80, ulazi:   0, izlazi:  2, kontakt_ljudi:  0 }
    ],
    ulazi: [{ putanja: '/', ljudi: 108 }, { putanja: '/cenovnik', ljudi: 19 },
            { putanja: '/poliranje-laka', ljudi: 7 }, { putanja: '/usluge', ljudi: 6 },
            { putanja: '/keramicka-zastita', ljudi: 4 }, { putanja: '/detailing-auta', ljudi: 2 },
            { putanja: '/premium-pranje', ljudi: 1 }],
    prelazi: [
      { sa: '/', na: '/cenovnik', ljudi: 28, puta: 31 },
      { sa: '/', na: '/usluge', ljudi: 22, puta: 24 },
      { sa: '/usluge', na: '/poliranje-laka', ljudi: 11, puta: 11 },
      { sa: '/usluge', na: '/keramicka-zastita', ljudi: 8, puta: 8 },
      { sa: '/cenovnik', na: '/', ljudi: 7, puta: 9 },
      { sa: '/poliranje-laka', na: '/cenovnik', ljudi: 6, puta: 6 },
      { sa: '/usluge', na: '/detailing-auta', ljudi: 5, puta: 5 },
      { sa: '/keramicka-zastita', na: '/cenovnik', ljudi: 4, puta: 4 }
    ],
    sekcije: [
      { putanja: '/', sekcija: 'hero', sesija: 128, od_ukupno: 131 }, { putanja: '/', sekcija: 'phi', sesija: 91, od_ukupno: 131 },
      { putanja: '/', sekcija: 'cs',   sesija: 79, od_ukupno: 131 },  { putanja: '/', sekcija: 'faq', sesija: 41, od_ukupno: 131 },
      { putanja: '/', sekcija: 'loc',  sesija: 27, od_ukupno: 131 },
      { putanja: '/cenovnik', sekcija: 'paketi', sesija: 55, od_ukupno: 58 }, { putanja: '/cenovnik', sekcija: 'loyalty', sesija: 38, od_ukupno: 58 },
      { putanja: '/cenovnik', sekcija: 'pojedinacne', sesija: 31, od_ukupno: 58 }, { putanja: '/cenovnik', sekcija: 'sastavi', sesija: 22, od_ukupno: 58 },
      { putanja: '/poliranje-laka', sekcija: 'kome', sesija: 21, od_ukupno: 22 }, { putanja: '/poliranje-laka', sekcija: 'kako', sesija: 17, od_ukupno: 22 },
      { putanja: '/poliranje-laka', sekcija: 'nivoi', sesija: 14, od_ukupno: 22 }, { putanja: '/poliranje-laka', sekcija: 'cena', sesija: 16, od_ukupno: 22 },
      { putanja: '/poliranje-laka', sekcija: 'vazno', sesija: 9, od_ukupno: 22 }, { putanja: '/poliranje-laka', sekcija: 'druge', sesija: 6, od_ukupno: 22 }
    ]
  };

  const pre = JSON.parse(JSON.stringify(sada));
  pre.posetioci = 121; pre.pregledi = 235; pre.vreme_posete = 104; pre.kontakt_ljudi = 19;

  const dodatno = {
    prijave: 3, recenzije: 1,
    nedelje: [
      { od: '2026-07-13', posetioci:  38, kontakti:  4 },
      { od: '2026-07-20', posetioci:  52, kontakti:  6 },
      { od: '2026-07-27', posetioci:  71, kontakti:  9 },
      { od: '2026-08-03', posetioci:  84, kontakti: 11 },
      { od: '2026-08-10', posetioci:  96, kontakti: 14 },
      { od: '2026-08-17', posetioci: 121, kontakti: 19 },
      { od: '2026-08-24', posetioci: 147, kontakti: 24 }
    ]
  };

  const doo = new Date('2026-08-31T00:00:00+02:00');
  const od  = new Date(doo.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { sada, pre, dodatno, od, doo };
}

module.exports.primerPodaci = primerPodaci;
