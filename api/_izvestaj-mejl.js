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
  proizvod: 'Proizvod i trajnost', vazno: 'Važno da znate', nivoi: 'Četiri nivoa', test: 'Tri provere koje vidite sami',
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

// ── Prosti gradivni delovi (verzija za vlasnika, 2026-09-03) ──
// Svaka sekcija: PITANJE kao naslov → ODGOVOR u jednoj rečenici → spisak.
// Nema tabela sa više od 3 kolone — na telefonu se ne čitaju.

function pitanje(tekst) {
  return '<tr><td style="padding:30px 0 6px;font-family:' + FONT + ';font-size:20px;' +
         'font-weight:800;color:' + C.crna + '">' + bez(tekst) + '</td></tr>';
}

// Odgovor u rečenici — sme HTML (<b>).
function odgovor(html) {
  return '<tr><td style="padding:0 0 12px;font-family:' + FONT + ';font-size:15px;' +
         'line-height:1.6;color:' + C.crna + '">' + html + '</td></tr>';
}

function sitno(html) {
  return '<tr><td style="padding:6px 0 0;font-family:' + FONT + ';font-size:13px;' +
         'line-height:1.55;color:' + C.siva + '">' + html + '</td></tr>';
}

// Red sa trakom: ime levo, broj desno, ispod trake opis sitnim slovima (opciono).
function red(ime, broj, najveci, vrednost, boja, opis) {
  const v = Number(vrednost === undefined ? broj : vrednost) || 0;
  const p = najveci > 0 ? Math.max(3, Math.round((v / najveci) * 100)) : 3;
  return '' +
  '<tr><td style="padding:10px 0 3px;font-family:' + FONT + ';font-size:15px;color:' + C.crna + '">' +
    bez(ime) + '<span style="float:right;font-weight:800">' + bez(broj) + '</span></td></tr>' +
  '<tr><td style="padding:0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
      'style="background:' + C.svetla + ';border-radius:5px"><tr>' +
      '<td width="' + p + '%" style="background:' + (boja || C.crvena) + ';height:9px;' +
        'font-size:0;line-height:0;border-radius:5px">&nbsp;</td>' +
      '<td style="font-size:0;line-height:0">&nbsp;</td>' +
    '</tr></table></td></tr>' +
  (opis ? '<tr><td style="padding:3px 0 2px;font-family:' + FONT + ';font-size:12px;color:' + C.siva + '">' +
          bez(opis) + '</td></tr>' : '');
}

function blok(redovi) {
  return '<tr><td style="padding:0"><table role="presentation" width="100%" ' +
         'cellpadding="0" cellspacing="0">' + redovi + '</table></td></tr>';
}

function prazno(tekst) {
  return '<tr><td style="padding:10px 14px;background:' + C.svetla + ';border-radius:8px;' +
         'font-family:' + FONT + ';font-size:14px;color:' + C.siva + '">' + bez(tekst) + '</td></tr>';
}

// „7 od 10" — svima jasno, za razliku od 68%.
function odDeset(deo, celo) {
  const a = Number(deo) || 0, b = Number(celo) || 0;
  if (!b) return '0 od 10';
  return Math.round((a / b) * 10) + ' od 10';
}

function spoj(lista) {
  if (!lista.length) return '';
  if (lista.length === 1) return lista[0];
  return lista.slice(0, -1).join(', ') + ' i ' + lista[lista.length - 1];
}

// ══════════════════════════════════════════════════════════
//  Glavno
// ══════════════════════════════════════════════════════════
function sastaviMejl(sada, pre, dodatno, od, doo, opcije) {
  const o          = opcije || {};
  const posetioci  = Number(sada.posetioci) || 0;
  const posPre     = Number(pre.posetioci) || 0;
  const kontakti   = Number(sada.kontakt_ljudi) || 0;
  const kontPre    = Number(pre.kontakt_ljudi) || 0;
  const pregledi   = Number(sada.pregledi) || 0;
  const ima        = posetioci > 0;
  const vremePosete = Number(sada.vreme_posete) || Number(sada.vreme_sec) || 0;
  const vremePre    = Number(pre.vreme_posete)  || Number(pre.vreme_sec)  || 0;
  const strane     = (sada.strane || []).slice().sort((a, b) => (b.ljudi || 0) - (a.ljudi || 0));
  const kanali     = (sada.kanali || []);
  const google     = (kanali.find(x => x.kanal === 'google') || {}).ljudi || 0;
  const kraj       = new Date(doo.getTime() - 1);

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
       'letter-spacing:2px;color:' + C.crvena + ';font-weight:700">TVOJ SAJT OVE NEDELJE</td></tr>' +
       '<tr><td style="padding:0 0 4px;font-family:Georgia,serif;font-size:28px;color:' + C.crna + '">' +
       'Kako je prošlo</td></tr>' +
       '<tr><td style="padding:0 0 18px;font-family:' + FONT + ';font-size:14px;color:' + C.siva + '">' +
       'od ' + bez(datum(od)) + ' do ' + bez(datum(kraj)) +
       (o.primer ? '' : ' · <b style="color:' + C.zelena + '">pravi brojevi, izmereni na sajtu</b>') + '</td></tr>';

  // ── Priča u pet rečenica ───────────────────────────────
  let prica;
  if (!ima) {
    prica = 'Ove nedelje sajt niko nije otvorio. Ako je merenje tek počelo, brojevi kreću da se skupljaju od sada.';
  } else {
    const delovi = [];
    delovi.push('Ove nedelje je tvoj sajt otvorilo <b>' + ljudi(posetioci) + '</b>' +
      (posPre ? ' (prošle nedelje ' + posPre + ')' : '') + '.');
    if (kontakti) {
      delovi.push('Od njih je <b>' + ljudi(kontakti) + '</b> kliknulo na WhatsApp, telefon ili mejl — to su ljudi koji su hteli da te pitaju za auto.');
    } else {
      delovi.push('<b>Niko</b> od njih nije kliknuo na WhatsApp, telefon ni mejl.');
    }
    if (google && posetioci) delovi.push('<b>' + odDeset(google, posetioci) + '</b> je došlo tako što te je našlo na Googlu.');
    const tel = (sada.uredjaji || []).find(x => x.uredjaj === 'telefon');
    if (tel && posetioci) delovi.push('<b>' + odDeset(tel.ljudi, posetioci) + '</b> gleda sa telefona.');
    if (vremePosete) delovi.push('Jedan čovek se u proseku zadrži <b>' + vreme(vremePosete) + '</b>.');
    prica = delovi.join(' ');
  }
  h += '<tr><td style="padding:16px 18px;background:#FDF6F5;border-left:4px solid ' + C.crvena + ';' +
       'border-radius:0 10px 10px 0;font-family:' + FONT + ';font-size:16px;line-height:1.7;' +
       'color:' + C.crna + '">' + prica + '</td></tr>';

  // ── Četiri glavna broja ────────────────────────────────
  h += pitanje('Četiri najvažnija broja');
  h += karta(kontakti, 'Hteli su da te pitaju za auto',
             'Kliknuli su na WhatsApp, na broj telefona ili na mejl. Ovo je najvažniji broj — to su mogući poslovi.',
             poredjenje(kontakti, kontPre, ljudi(kontPre)), C.zelena);
  h += karta(posetioci, 'Ljudi je otvorilo sajt',
             'Različiti ljudi. Ako isti čovek uđe tri puta istog dana, broji se jednom.',
             poredjenje(posetioci, posPre, ljudi(posPre)));
  h += karta(vremeKratko(vremePosete), 'Minuta se zadrže (min:sek)',
             'Koliko jedan čovek u proseku gleda sajt, kroz sve strane koje otvori. Broji se samo dok mu je sajt na ekranu.',
             poredjenje(vremePosete, vremePre, vreme(vremePre)));
  const spp = Number(sada.strana_po_poseti) || 0;
  h += karta(pregledi, 'Puta je otvorena neka strana',
             'Sve strane zajedno.' + (spp ? ' Jedan čovek u proseku pogleda ' + String(spp).replace('.', ',') + ' strane.' : ''),
             poredjenje(pregledi, pre.pregledi, puta(pre.pregledi)));

  // ── Dan po dan ─────────────────────────────────────────
  const dani = (sada.po_danima || []);
  if (dani.length) {
    const naj = dani.slice().sort((a, b) => b.posetioci - a.posetioci)[0];
    const najD = new Date(naj.dan + 'T12:00:00Z');
    h += pitanje('Koji dan je bio najjači?');
    h += odgovor('Najviše ljudi je bilo u <b>' + DANI[najD.getUTCDay()] + ' ' + najD.getUTCDate() + '.' + (najD.getUTCMonth() + 1) +
                 '.</b> — ' + ljudi(naj.posetioci) + (naj.kontakti ? ', od toga ' + kontakata(naj.kontakti) : '') + '.');
    const max = Math.max.apply(null, dani.map(x => x.posetioci || 0));
    let r = '';
    for (const x of dani) {
      const d = new Date(x.dan + 'T12:00:00Z');
      const ime = DANI[d.getUTCDay()] + ' ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.';
      const opis = [];
      if (x.kontakti) opis.push(kontakata(x.kontakti));
      if (x.vrhunac !== null && x.vrhunac !== undefined && x.posetioci > 1) opis.push('najviše oko ' + x.vrhunac + 'h');
      r += red(ime, ljudi(x.posetioci || 0), max, x.posetioci, x.kontakti ? C.zelena : C.crvena, opis.join(' · '));
    }
    h += blok(r);
    h += sitno('Zelena traka = tog dana je neko kliknuo na WhatsApp, telefon ili mejl.');
  }

  // ── Strane ─────────────────────────────────────────────
  if (strane.length) {
    h += pitanje('Koje strane su gledali?');
    const top = strane[0];
    const usluge = strane.filter(x => ['/', '/usluge', '/cenovnik', '/loyalty-join'].indexOf(x.putanja) < 0);
    let odg = 'Najviše ih je gledalo <b>' + bez(imeStrane(top.putanja)) + '</b> (' + ljudi(top.ljudi) + ').';
    const cen = strane.find(x => x.putanja === '/cenovnik');
    if (cen) odg += ' Do <b>cenovnika</b> je stiglo ' + ljudi(cen.ljudi) + ' — ' + odDeset(cen.ljudi, posetioci) + '.';
    if (usluge.length) {
      const u = usluge[0];
      odg += ' Od usluga ih najviše zanima <b>' + bez(imeStrane(u.putanja)) + '</b> (' + ljudi(u.ljudi) + ').';
    }
    h += odgovor(odg);
    const max = Math.max.apply(null, strane.map(x => x.ljudi || 0));
    let r = '';
    for (const x of strane.slice(0, 10)) {
      const opis = [];
      if (x.vreme_sec) opis.push('zadrže se ' + vreme(x.vreme_sec));
      if (x.dubina) opis.push('pročitaju ' + x.dubina + '% strane');
      if (x.kontakt_ljudi) opis.push(ljudi(x.kontakt_ljudi) + ' kliknulo kontakt');
      r += red(imeStrane(x.putanja), ljudi(x.ljudi || 0), max, x.ljudi, x.kontakt_ljudi ? C.zelena : C.braon, opis.join(' · '));
    }
    h += blok(r);
    h += sitno('„Pročitaju 60% strane" znači da u proseku odskroluju do 60% dužine strane. 100% = stignu do dna.');
  }

  // ── Ulazi i izlazi ─────────────────────────────────────
  const ulazi  = (sada.ulazi || []).filter(x => x.ljudi > 0);
  const izlazi = strane.filter(x => Number(x.izlazi) > 0).slice().sort((a, b) => b.izlazi - a.izlazi);
  if (ulazi.length) {
    h += pitanje('Na koju stranu prvo uđu, a sa koje odu?');
    const u = ulazi[0];
    let odg = 'Skoro svi prvo uđu na <b>' + bez(imeStrane(u.putanja)) + '</b> (' + ljudi(u.ljudi) + ' od ' + posetioci + ').';
    if (izlazi.length) {
      const z = izlazi[0];
      odg += ' Najčešće zatvore sajt dok gledaju <b>' + bez(imeStrane(z.putanja)) + '</b> (' + ljudi(z.izlazi) + ').';
    }
    h += odgovor(odg);
    const maxU = Math.max.apply(null, ulazi.map(x => x.ljudi));
    let r = '';
    for (const x of ulazi.slice(0, 6)) r += red('Ušli na: ' + imeStrane(x.putanja), ljudi(x.ljudi), maxU, x.ljudi, C.plava);
    if (izlazi.length) {
      const maxI = Math.max.apply(null, izlazi.map(x => x.izlazi));
      for (const x of izlazi.slice(0, 6)) r += red('Otišli sa: ' + imeStrane(x.putanja), ljudi(x.izlazi), maxI, x.izlazi, C.bleda);
    }
    h += blok(r);
    h += sitno('Ako mnogo ljudi odlazi sa neke strane usluge, tamo im nešto fali — cena, slika ili dugme za poziv.');
  }

  // ── Kuda idu dalje ─────────────────────────────────────
  const prelazi = (sada.prelazi || []);
  if (prelazi.length) {
    h += pitanje('Kuda idu posle prve strane?');
    const p = prelazi[0];
    h += odgovor('Najčešći put je <b>' + bez(imeStrane(p.sa)) + ' → ' + bez(imeStrane(p.na)) + '</b> (' + ljudi(p.ljudi) + ').');
    const max = Math.max.apply(null, prelazi.map(x => x.ljudi));
    let r = '';
    for (const x of prelazi.slice(0, 8)) {
      r += red(imeStrane(x.sa) + ' → ' + imeStrane(x.na), ljudi(x.ljudi), max, x.ljudi, C.braon);
    }
    h += blok(r);
  }

  // ── Odakle dolaze ──────────────────────────────────────
  if (kanali.length) {
    h += pitanje('Kako su našli sajt?');
    const k = kanali[0];
    let odg = 'Najviše ih dođe <b>' + bez((IME_KANALA[k.kanal] || k.kanal).toLowerCase()) + '</b> (' + ljudi(k.ljudi) + ').';
    if (google && posetioci) odg += ' Google ti je doveo <b>' + odDeset(google, posetioci) + '</b> ljudi — to donosi tvoja pozicija na Googlu.';
    h += odgovor(odg);
    const max = Math.max.apply(null, kanali.map(x => x.ljudi));
    let r = '';
    for (const x of kanali) r += red(IME_KANALA[x.kanal] || x.kanal, ljudi(x.ljudi), max, x.ljudi, C.crvena);
    h += blok(r);
    const izvori = (sada.izvori || []).filter(x => x.izvor && !/lakerdetailing/.test(x.izvor));
    if (izvori.length) {
      h += sitno('Tačno sa kojih sajtova: ' + bez(spoj(izvori.slice(0, 6).map(x => x.izvor + ' (' + x.ljudi + ')'))) + '.');
    }
    h += sitno('„Sami ukucali adresu" su i oni koji imaju sajt sačuvan, ili su kliknuli link iz poruke koja ne kaže odakle je.');
  }

  // ── Šta su kliktali ────────────────────────────────────
  h += pitanje('Na šta su kliktali?');
  const kps = (sada.kontakti_po_strani || []);
  if (kps.length) {
    const ukupnoKlik = kps.reduce((s, x) => s + (x.klikova || 0), 0);
    h += odgovor('Na WhatsApp, telefon ili mejl je kliknuto <b>' + puta(ukupnoKlik) + '</b>, ukupno ' + ljudi(kontakti) + '. Piše i sa koje strane su kliknuli.');
    const max = Math.max.apply(null, kps.map(x => x.klikova));
    let r = '';
    for (const x of kps.slice(0, 8)) {
      r += red(imeKlika(x.naziv), puta(x.klikova), max, x.klikova, C.zelena,
               'sa strane: ' + imeStrane(x.putanja) + ' · ' + ljudi(x.ljudi));
    }
    h += blok(r);
  } else {
    h += odgovor('Ove nedelje <b>niko</b> nije kliknuo na WhatsApp, telefon ni mejl.');
  }
  const ostali = (sada.ostali_klikovi || []);
  if (ostali.length) {
    h += sitno('<b>Ostalo što su kliktali:</b>');
    const max = Math.max.apply(null, ostali.map(x => x.klikova));
    let r = '';
    for (const x of ostali.slice(0, 10)) {
      r += red(imeKlika(x.naziv), puta(x.klikova), max, x.klikova, C.bleda, 'sa strane: ' + imeStrane(x.putanja));
    }
    h += blok(r);
  }

  // ── Dokle stižu — po strani ────────────────────────────
  const sekcije = (sada.sekcije || []).filter(x => x.od_ukupno > 0);
  if (sekcije.length) {
    h += pitanje('Dokle stignu kad skroluju?');
    h += odgovor('Za svaku stranu: od 10 ljudi koji je otvore, koliko ih stigne do kog dela. Gde broj naglo padne — tu prestanu da čitaju.');
    const redStrana = strane.map(x => x.putanja);
    const poStrani = {};
    for (const x of sekcije) (poStrani[x.putanja] = poStrani[x.putanja] || []).push(x);
    const putanje = Object.keys(poStrani).sort((a, b) => {
      const ia = redStrana.indexOf(a), ib = redStrana.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    for (const p of putanje.slice(0, 8)) {
      const lista = poStrani[p].slice().sort((a, b) => b.sesija - a.sesija);
      h += '<tr><td style="padding:14px 0 2px;font-family:' + FONT + ';font-size:15px;font-weight:800;color:' + C.crna + '">' +
           bez(imeStrane(p)) + ' <span style="font-weight:400;color:' + C.siva + '">— otvorena ' + puta(lista[0].od_ukupno) + '</span></td></tr>';
      let r = '';
      for (const x of lista.slice(0, 10)) {
        r += red(IME_SEKCIJE[x.sekcija] || x.sekcija, odDeset(x.sesija, x.od_ukupno), x.od_ukupno, x.sesija, C.braon);
      }
      h += blok(r);
    }
  }

  // ── Uređaji, brauzeri ──────────────────────────────────
  const uredjaji = (sada.uredjaji || []);
  if (uredjaji.length) {
    h += pitanje('Sa čega gledaju?');
    const u = uredjaji[0];
    h += odgovor('<b>' + odDeset(u.ljudi, posetioci) + '</b> gleda ' + bez((IME_UREDJAJA[u.uredjaj] || u.uredjaj).toLowerCase()) +
                 '. Zato sajt prvo mora na telefonu da izgleda savršeno.');
    const max = Math.max.apply(null, uredjaji.map(x => x.ljudi));
    let r = '';
    for (const x of uredjaji) r += red(IME_UREDJAJA[x.uredjaj] || x.uredjaj, ljudi(x.ljudi), max, x.ljudi, C.siva2);
    h += blok(r);
    const br = (sada.brauzeri || []);
    if (br.length) h += sitno('Pregledač koji koriste: ' + bez(spoj(br.map(x => (x.brauzer === 'ostalo' ? 'ostalo' : x.brauzer) + ' (' + x.ljudi + ')'))) + '.');
  }

  // ── Gradovi i zemlje ───────────────────────────────────
  const gradovi = (sada.gradovi || []);
  if (gradovi.length) {
    h += pitanje('Odakle su?');
    const g = gradovi[0];
    h += odgovor('Najviše ih „vidi" iz grada <b>' + bez(g.grad === 'nepoznato' ? 'Nepoznato' : g.grad) + '</b> (' + ljudi(g.ljudi) + ').');
    const max = Math.max.apply(null, gradovi.map(x => x.ljudi));
    let r = '';
    for (const x of gradovi.slice(0, 8)) r += red(x.grad === 'nepoznato' ? 'Nepoznato' : x.grad, ljudi(x.ljudi), max, x.ljudi, C.siva2);
    h += blok(r);
    h += sitno('<b>Oprez:</b> grad daje mobilna mreža, ne čovek. Mobilni internet često prijavi Beograd i kad je čovek u Čačku. Zato ovo uzmi sa rezervom.');
    const zemlje = (sada.zemlje || []).filter(x => x.zemlja && x.zemlja !== 'RS');
    if (zemlje.length) h += sitno('Iz inostranstva: ' + bez(spoj(zemlje.map(x => (IME_ZEMLJE[x.zemlja] || x.zemlja) + ' (' + x.ljudi + ')'))) + '.');
  }

  // ── Istorija ───────────────────────────────────────────
  const nedelje = (dodatno.nedelje || []).filter(n => Number(n.posetioci) > 0);
  if (nedelje.length > 1) {
    h += pitanje('Da li sajt raste?');
    const a = nedelje[nedelje.length - 1], b = nedelje[nedelje.length - 2];
    const p = procenat(a.posetioci, b.posetioci);
    h += odgovor(p === null ? 'Još je rano da se kaže.' :
                 p > 0 ? 'Da — ove nedelje je bilo <b>' + p + '% više</b> ljudi nego prošle.' :
                 p < 0 ? 'Ove nedelje je bilo <b>' + Math.abs(p) + '% manje</b> ljudi nego prošle.' :
                 'Isto kao prošle nedelje.');
    const max = Math.max.apply(null, nedelje.map(x => x.posetioci));
    let r = '';
    for (const n of nedelje) {
      const a1 = new Date(n.od + 'T12:00:00Z');
      const b1 = new Date(a1.getTime() + 6 * 24 * 60 * 60 * 1000);
      const raspon = a1.getUTCDate() + '.' + (a1.getUTCMonth() + 1) + '. – ' + b1.getUTCDate() + '.' + (b1.getUTCMonth() + 1) + '.';
      r += red(raspon, ljudi(n.posetioci), max, n.posetioci, C.crvena, kontakata(n.kontakti || 0));
    }
    h += blok(r);
  }

  // ── Šta ovo znači ──────────────────────────────────────
  h += pitanje('Šta da uradiš sa ovim?');
  const saveti = [];
  if (ima && kontakti === 0) {
    saveti.push('Ljudi dolaze, ali se niko ne javlja. Neka dugme za WhatsApp bude vidljivije, više puta niz stranu.');
  }
  if (ima) {
    const oo = Number(sada.odmah_otisli) || 0;
    saveti.push('<b>' + odDeset(oo, 100) + '</b> ode za manje od 10 sekundi, bez ijednog klika.' +
      (oo > 70 ? ' To je mnogo — prvi ekran ih ne zadrži. Tu je najveći dobitak.' : oo > 40 ? ' To je normalno za sajt sa Googla.' : ' To je dobro.'));
    const vs = Number(sada.vise_strana) || 0;
    if (vs) saveti.push('<b>' + ljudi(vs) + '</b> je otvorilo više od jedne strane — toliko ih je stvarno razgledalo.');
    const vr = Number(sada.vratili_se) || 0;
    if (vr) saveti.push('<b>' + ljudi(vr) + '</b> se istog dana vratilo na sajt bar još jednom.');
  }
  const najSat = (sada.po_satima || []).reduce((a, b) => (!a || b.posetioci > a.posetioci ? b : a), null);
  if (najSat) saveti.push('Najviše ljudi otvara sajt oko <b>' + najSat.sat + ':00</b>. Ako objavljuješ na Instagramu, to je najbolje vreme.');
  saveti.push('Nove loyalty prijave preko sajta: <b>' + (dodatno.prijave || 0) + '</b>. Nove recenzije na sajtu: <b>' + (dodatno.recenzije || 0) + '</b>.');

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
       '<b>Odakle ovi brojevi.</b> Sajt ih meri sam, na svakoj strani. Nema kolačića i ne zna se ko je ko — ' +
       'samo koliko ih je bilo i šta su radili. Google, roboti i skeneri se ne broje.<br>' +
       '<b>Tvoje posete se ne broje</b> na uređaju na kojem si jednom otvorio ' +
       'lakerdetailing.rs/?analitika=off<br>' +
       'Ovaj mejl sajt šalje sam, svakog ponedeljka u podne, za prethodnih 7 dana. Niko ga ne kuca ručno.' +
       '</td></tr>';

  return '<!doctype html><html lang="sr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light only">' +
    '</head><body style="margin:0;padding:0;background:' + C.svetla + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
      'style="background:' + C.svetla + '"><tr><td align="center" style="padding:20px 10px 34px">' +
    '<table role="presentation" width="620" cellpadding="0" cellspacing="0" ' +
      'style="max-width:620px;width:100%;background:' + C.bela + ';border-radius:16px;padding:28px 22px">' +
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
