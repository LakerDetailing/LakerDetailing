// ══════════════════════════════════════════════════════════
//  Sastavljanje nedeljnog mejla — samo izgled, nula logike oko slanja.
//
//  Pravilo za tekst: piše se kao da objašnjavaš nekome ko nikad nije
//  video statistiku sajta. Nema „sesija", „konverzija", „bounce rate".
//  Svaki broj ima ispod sebe rečenicu šta znači.
//
//  Pravilo za HTML: samo tabele i inline stilovi. Gmail na telefonu
//  briše <style> blokove, flexbox i grid, pa ih nema.
// ══════════════════════════════════════════════════════════

// ── Boje ──────────────────────────────────────────────────
const C = {
  crvena:  '#C0392B',
  zelena:  '#1E8449',
  crna:    '#1C1C1C',
  siva:    '#7C766D',
  svetla:  '#F3F1EE',
  karta:   '#FAF9F7',
  ivica:   '#E8E4DD',
  bela:    '#FFFFFF'
};

const FONT = 'Arial,Helvetica,sans-serif';

// ── Nazivi na srpskom ─────────────────────────────────────
const IME_SEKCIJE = {
  // početna
  hero: 'Naslovna slika',   phi: 'Priča o studiju',  cs: 'Slike radova',
  faq: 'Pitanja i odgovori', tst: 'Recenzije',       soc: 'Instagram i mreže',
  loc: 'Gde se nalazimo',
  // cenovnik (od renoviranja 2026-09; paketi i Loyalty su preseljeni sa početne)
  paketi: 'Paketi',         loyalty: 'Loyalty članstvo',
  pojedinacne: 'Cene po usluzi', sastavi: 'Sastavi svoju ponudu',
  // strane usluga
  koraci: 'Kako radimo',    kome: 'Kome je namenjeno', cena: 'Cena usluge',
  // sekcije koje više ne postoje — ostaju da stari podaci u izveštaju imaju ime
  proc: 'Kako se radi',     pkg: 'Paketi (stara početna)',
  care: 'Loyalty (stara početna)', prc: 'Cenovnik (stara početna)',
  book: 'Zakazivanje'
};

const IME_KLIKA = {
  whatsapp:              'Pisali na WhatsApp',
  telefon:               'Zvali telefonom',
  email:                 'Slali mejl',
  instagram:             'Otišli na Instagram',
  tiktok:                'Otišli na TikTok',
  mapa:                  'Tražili adresu na mapi',
  galerija:              'Uveličali sliku iz galerije',
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
  pretraga:  'Sa drugih pretraživača',
  tiktok:    'Sa TikToka',
  youtube:   'Sa YouTube-a',
  poruka:    'Neko im poslao link',
  direktno:  'Sami ukucali adresu',
  ostalo:    'Ostalo'
};

const IME_UREDJAJA = { telefon: 'Sa telefona', kompjuter: 'Sa računara', tablet: 'Sa tableta', ostalo: 'Ostalo' };

const DANI = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];

// ── Sitni pomoćnici ───────────────────────────────────────
function bez(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  if (n < 60) return n + ' sekundi';
  const m = Math.floor(n / 60), s = n % 60;
  if (!s) return m === 1 ? '1 minut' : m + ' minuta';
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

function procenat(sada, ranije) {
  const a = Number(sada) || 0, b = Number(ranije) || 0;
  if (!b) return null;
  return Math.round(((a - b) / b) * 100);
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
          '<div style="font-family:' + FONT + ';font-size:38px;line-height:1.05;font-weight:800;' +
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
  return '<tr><td style="padding:26px 0 4px;font-family:' + FONT + ';font-size:18px;' +
         'font-weight:800;color:' + C.crna + '">' + bez(naslov) + '</td></tr>' +
         (objasnjenje
           ? '<tr><td style="padding:0 0 10px;font-family:' + FONT + ';font-size:13px;' +
             'color:' + C.siva + ';line-height:1.5">' + bez(objasnjenje) + '</td></tr>'
           : '');
}

function traka(naziv, broj, najveci, sufiks, boja, vrednost) {
  const v = (vrednost === undefined || vrednost === null) ? broj : vrednost;
  const pct = najveci > 0 ? Math.max(3, Math.round((v / najveci) * 100)) : 3;
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
      '<td width="' + pct + '%" style="background:' + (boja || C.crvena) + ';height:8px;' +
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

// ── Tabela dan po dan ─────────────────────────────────────
function tabelaDana(poDanima) {
  const th = 'padding:9px 4px;font-family:' + FONT + ';font-size:11px;font-weight:700;' +
             'color:' + C.siva + ';text-align:center;border-bottom:2px solid ' + C.ivica;
  let r = '<tr>' +
    '<td style="' + th + ';text-align:left">DAN</td>' +
    '<td style="' + th + '">LJUDI</td>' +
    '<td style="' + th + '">KONTAKTI</td>' +
    '<td style="' + th + '">ZADRŽALI SE</td>' +
  '</tr>';

  for (const x of poDanima) {
    const d = new Date(x.dan + 'T12:00:00Z');
    const kont = Number(x.kontakti) || 0;
    const td = 'padding:11px 4px;font-family:' + FONT + ';font-size:14px;' +
               'color:' + C.crna + ';text-align:center;border-bottom:1px solid ' + C.ivica;
    r += '<tr>' +
      '<td style="' + td + ';text-align:left">' +
        '<b>' + DANI[d.getUTCDay()].slice(0, 3) + '</b> ' +
        '<span style="color:' + C.siva + '">' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.</span></td>' +
      '<td style="' + td + ';font-weight:700">' + (x.posetioci || 0) + '</td>' +
      '<td style="' + td + (kont ? ';color:' + C.zelena + ';font-weight:800' : ';color:#BDB7AC') + '">' +
        (kont || '–') + '</td>' +
      '<td style="' + td + ';color:' + C.siva + ';font-size:13px">' +
        (x.vreme_sec ? vreme(x.vreme_sec) : '–') + '</td>' +
    '</tr>';
  }
  return '<tr><td style="padding:2px 0 0"><table role="presentation" width="100%" ' +
         'cellpadding="0" cellspacing="0" style="border-collapse:collapse">' + r + '</table></td></tr>';
}

// ══════════════════════════════════════════════════════════
//  Glavno
// ══════════════════════════════════════════════════════════
function sastaviMejl(sada, pre, dodatno, od, doo, opcije) {
  const o        = opcije || {};
  const kontakti = Number(sada.kontakt_ljudi) || 0;
  const kontPre  = Number(pre.kontakt_ljudi) || 0;
  const ukupno   = Number(sada.ukupno_sesija) || 0;
  const ima      = Number(sada.posetioci) > 0;

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
    uvod = 'Sajt je videlo <b>' + ljudi(sada.posetioci) + '</b>, a <b>' + ljudi(kontakti) +
           '</b> je htelo da te kontaktira.' +
           (p !== null && p > 0 ? ' To je bolje nego prošle nedelje.' :
            p !== null && p < 0 ? ' To je slabije nego prošle nedelje.' : '');
  } else {
    uvod = 'Sajt je videlo <b>' + ljudi(sada.posetioci) + '</b>, ali <b>niko</b> nije kliknuo ' +
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

  h += karta(sada.posetioci || 0, 'Toliko ljudi je videlo sajt',
             'Različiti ljudi, ne otvaranja. Ako isti čovek uđe tri puta, računa se kao jedan.',
             poredjenje(sada.posetioci, pre.posetioci, ljudi(pre.posetioci)));

  h += karta(sada.vreme_sec ? vreme(sada.vreme_sec) : '—', 'Toliko se zadrže na sajtu',
             'Prosečno vreme koje provedu gledajući. Duže je bolje — znači da ih sadržaj drži.',
             poredjenje(sada.vreme_sec, pre.vreme_sec, vreme(pre.vreme_sec)));

  h += karta(sada.pregledi || 0, 'Toliko puta je sajt otvoren',
             'Ukupan broj otvaranja. Veći je od broja ljudi jer se isti čovek često vraća.',
             poredjenje(sada.pregledi, pre.pregledi, puta(pre.pregledi)));

  // ── Dan po dan ─────────────────────────────────────────
  h += sekcija('Svaki dan posebno',
               'Koji dan je bio najjači i kada su te ljudi tražili.');
  h += (sada.po_danima || []).length ? tabelaDana(sada.po_danima) : nemaPodataka('Još nema podataka po danima.');

  // ── Odakle dolaze ──────────────────────────────────────
  h += sekcija('Odakle su došli',
               'Kako su uopšte našli sajt. Ovo ti kaže gde se isplati ulagati trud.');
  if ((sada.kanali || []).length) {
    const naj = Math.max.apply(null, sada.kanali.map(x => x.ljudi));
    let r = '';
    for (const x of sada.kanali) r += traka(IME_KANALA[x.kanal] || x.kanal, x.ljudi, naj, '', C.crvena);
    h += trakeBloka(r);
  } else h += nemaPodataka('Još nema podataka.');

  // ── Šta su kliktali ────────────────────────────────────
  h += sekcija('Šta su kliktali',
               'Zelene trake su klikovi koji vode do posla — oni idu prvi. Sivo je ostalo.');
  if ((sada.kontakti || []).length) {
    const VAZNI = ['whatsapp', 'telefon', 'email'];
    // Kontakt-klikovi uvek na vrh, bez obzira što ih galerija ume da nadmaši.
    const poredjani = sada.kontakti.slice().sort((a, b) => {
      const va = VAZNI.indexOf(a.naziv) > -1, vb = VAZNI.indexOf(b.naziv) > -1;
      if (va !== vb) return va ? -1 : 1;
      return (b.klikova || 0) - (a.klikova || 0);
    });
    const naj = Math.max.apply(null, poredjani.map(x => x.klikova));
    let r = '';
    for (const x of poredjani) {
      const vazan = VAZNI.indexOf(x.naziv) > -1;
      r += traka(IME_KLIKA[x.naziv] || x.naziv, puta(x.klikova), naj, '',
                 vazan ? C.zelena : '#C8C2B7', x.klikova);
    }
    h += trakeBloka(r);
  } else h += nemaPodataka('Niko nije ništa kliknuo ove nedelje.');

  // ── Dokle stižu ────────────────────────────────────────
  h += sekcija('Dokle su stigli niz stranu',
               'Sajt je duga strana. Ovo pokazuje koliko njih je stiglo do kog dela — gde ih gubiš.');
  if ((sada.sekcije || []).length && ukupno) {
    const naj = Math.max.apply(null, sada.sekcije.map(x => x.sesija));
    let r = '';
    for (const x of sada.sekcije) {
      const pct = Math.round((x.sesija / ukupno) * 100);
      r += traka(IME_SEKCIJE[x.sekcija] || x.sekcija, pct, naj / ukupno * 100,
                 '<span style="font-weight:400;color:' + C.siva + '">%</span>', '#8E6E5E');
    }
    h += trakeBloka(r);
  } else h += nemaPodataka('Još nema podataka.');

  // ── Uređaji i gradovi ──────────────────────────────────
  h += sekcija('Sa čega gledaju', 'Ako je skoro sve telefon, sajt mora prvo na telefonu da izgleda savršeno.');
  if ((sada.uredjaji || []).length) {
    const naj = Math.max.apply(null, sada.uredjaji.map(x => x.ljudi));
    let r = '';
    for (const x of sada.uredjaji) r += traka(IME_UREDJAJA[x.uredjaj] || x.uredjaj, x.ljudi, naj, '', '#5D6D7E');
    h += trakeBloka(r);
  } else h += nemaPodataka('Još nema podataka.');

  h += sekcija('Iz kog su grada', 'Koliko ih je iz Čačka, a koliko je spremno da dovede auto sa strane.');
  if ((sada.gradovi || []).length) {
    const naj = Math.max.apply(null, sada.gradovi.map(x => x.ljudi));
    let r = '';
    for (const x of sada.gradovi) {
      r += traka(x.grad === 'nepoznato' ? 'Nepoznato' : x.grad, x.ljudi, naj, '', '#5D6D7E');
    }
    h += trakeBloka(r);
  } else h += nemaPodataka('Još nema podataka.');

  // ── Strane ─────────────────────────────────────────────
  // Ima smisla tek kad postoji vise od naslovne (stranice usluga).
  if ((sada.strane || []).length > 1) {
    h += sekcija('Koje strane gledaju', 'Ako neka stranica usluge vuče više od ostalih, tu vredi dodati slike i detalje.');
    const naj = Math.max.apply(null, sada.strane.map(x => x.pregledi));
    let r = '';
    for (const x of sada.strane) {
      r += traka(x.putanja === '/' ? 'Naslovna strana' : x.putanja,
                 puta(x.pregledi), naj, '', '#8E6E5E', x.pregledi);
    }
    h += trakeBloka(r);
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
    saveti.push('<b>' + oo + '%</b> ljudi ode skoro odmah, bez ijednog klika.' +
      (oo > 70 ? ' To je visoko — znači da ih prvi ekran ne zadrži, tu je najveći dobitak ako se popravi.' : ''));
  }
  const najSat = (sada.po_satima || []).reduce((a, b) => (!a || b.posetioci > a.posetioci ? b : a), null);
  if (najSat) {
    saveti.push('Najviše ljudi otvara sajt oko <b>' + najSat.sat + ':00</b>. Ako objavljuješ nešto na Instagramu, to je najbolje vreme.');
  }
  if (sada.dubina) {
    saveti.push('U proseku pregledaju <b>' + sada.dubina + '%</b> strane pre nego što odu.');
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
       'samo koliko ih je bilo i šta su radili.<br>' +
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

module.exports = { sastaviMejl, ljudi, vreme, datum };

// ══════════════════════════════════════════════════════════
//  Izmišljeni brojevi za prikaz izgleda mejla.
//  Koriste ih i /api/izvestaj?primer=1 i tools-izvestaj-proba.js,
//  da proba i pravi mejl uvek izgledaju isto.
// ══════════════════════════════════════════════════════════
function primerPodaci() {
  const sada = {
    posetioci: 147, pregledi: 231, vreme_sec: 96, dubina: 58,
    odmah_otisli: 41, ukupno_sesija: 231, kontakt_ljudi: 24,
    kontakti: [
      { naziv: 'whatsapp',           klikova: 22, ljudi: 18 },
      { naziv: 'telefon',            klikova: 11, ljudi:  9 },
      { naziv: 'email',              klikova:  2, ljudi:  2 },
      { naziv: 'galerija',           klikova: 47, ljudi: 26 },
      { naziv: 'instagram',          klikova:  8, ljudi:  7 },
      { naziv: 'loyalty-otvoren',    klikova:  6, ljudi:  5 },
      { naziv: 'mapa',               klikova:  4, ljudi:  4 },
      { naziv: 'recenzija-otvorena', klikova:  2, ljudi:  2 }
    ],
    po_danima: [
      { dan: '2026-08-16', posetioci: 14, pregledi: 21, kontakti: 1, vreme_sec:  71, vrhunac: 20 },
      { dan: '2026-08-17', posetioci: 26, pregledi: 38, kontakti: 6, vreme_sec: 112, vrhunac: 19 },
      { dan: '2026-08-18', posetioci: 19, pregledi: 30, kontakti: 3, vreme_sec:  88, vrhunac: 13 },
      { dan: '2026-08-19', posetioci: 23, pregledi: 37, kontakti: 5, vreme_sec: 101, vrhunac: 19 },
      { dan: '2026-08-20', posetioci: 31, pregledi: 49, kontakti: 9, vreme_sec: 124, vrhunac: 21 },
      { dan: '2026-08-21', posetioci: 22, pregledi: 34, kontakti: 7, vreme_sec:  95, vrhunac: 18 },
      { dan: '2026-08-22', posetioci: 12, pregledi: 22, kontakti: 2, vreme_sec:  64, vrhunac: 11 }
    ],
    po_satima: [{ sat: 9, posetioci: 8 }, { sat: 13, posetioci: 15 },
                { sat: 19, posetioci: 27 }, { sat: 21, posetioci: 22 }],
    kanali: [
      { kanal: 'google', ljudi: 71 }, { kanal: 'instagram', ljudi: 38 },
      { kanal: 'direktno', ljudi: 24 }, { kanal: 'poruka', ljudi: 9 },
      { kanal: 'facebook', ljudi: 5 }
    ],
    uredjaji: [{ uredjaj: 'telefon', ljudi: 118 }, { uredjaj: 'kompjuter', ljudi: 23 },
               { uredjaj: 'tablet', ljudi: 6 }],
    gradovi: [
      { grad: 'Čačak', ljudi: 76 }, { grad: 'Beograd', ljudi: 21 },
      { grad: 'Kraljevo', ljudi: 14 }, { grad: 'Užice', ljudi: 11 },
      { grad: 'Gornji Milanovac', ljudi: 9 }, { grad: 'nepoznato', ljudi: 16 }
    ],
    strane: [{ putanja: '/', pregledi: 198 }, { putanja: '/usluge', pregledi: 21 }],
    sekcije: [
      { sekcija: 'hero', sesija: 228 }, { sekcija: 'phi', sesija: 171 },
      { sekcija: 'cs',   sesija: 149 }, { sekcija: 'proc', sesija: 118 },
      { sekcija: 'pkg',  sesija: 96 },  { sekcija: 'prc',  sesija: 74 },
      { sekcija: 'faq',  sesija: 41 },  { sekcija: 'tst',  sesija: 33 },
      { sekcija: 'loc',  sesija: 27 }
    ]
  };

  const pre = JSON.parse(JSON.stringify(sada));
  pre.posetioci = 121; pre.pregledi = 205; pre.vreme_sec = 104; pre.kontakt_ljudi = 19;

  const dodatno = {
    prijave: 3, recenzije: 1,
    nedelje: [
      { od: '2026-07-05', posetioci:  38, kontakti:  4 },
      { od: '2026-07-12', posetioci:  52, kontakti:  6 },
      { od: '2026-07-19', posetioci:  71, kontakti:  9 },
      { od: '2026-07-26', posetioci:  84, kontakti: 11 },
      { od: '2026-08-02', posetioci:  96, kontakti: 14 },
      { od: '2026-08-09', posetioci: 121, kontakti: 19 },
      { od: '2026-08-16', posetioci: 147, kontakti: 24 }
    ]
  };

  const doo = new Date('2026-08-23T00:00:00+02:00');
  const od  = new Date(doo.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { sada, pre, dodatno, od, doo };
}

module.exports.primerPodaci = primerPodaci;
