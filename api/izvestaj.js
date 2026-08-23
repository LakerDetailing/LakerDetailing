// ══════════════════════════════════════════════════════════
//  LAKER DETAILING — /api/izvestaj
//  Nedeljni izveštaj o sajtu, mejlom preko Brevo.
//
//  Cron ga zove SVAKI dan u 06:00 UTC, ali mejl ide samo
//  ponedeljkom — tako izveštaj ne zavisi od toga da li Vercel
//  Hobby plan podržava nedeljni raspored.
//
//  Ručno:  /api/izvestaj?kljuc=<ADMIN_PASSWORD>&sada=1
//  Proba:  /api/izvestaj?kljuc=<ADMIN_PASSWORD>&sada=1&suvo=1   (ne šalje mejl)
// ══════════════════════════════════════════════════════════

const crypto = require('node:crypto');
const { getEnv, json, supabaseFetch } = require('./_push');
const { setSecurityHeaders } = require('./_security');

const BREVO_URL    = 'https://api.brevo.com/v3/smtp/email';
const PRIMALAC     = 'detailinglaker@gmail.com';
const POSILJALAC   = { email: 'noreply@lakerdetailing.rs', name: 'Laker Detailing — izveštaj' };
const CUVAJ_DANA   = 120;   // koliko dugo se drže sirovi događaji

// ── Nazivi na srpskom ─────────────────────────────────────
const IME_SEKCIJE = {
  hero: 'Naslovna', phi: 'Filozofija', cs: 'Galerija radova', proc: 'Kako radimo',
  pkg: 'Paketi', care: 'Loyalty', prc: 'Cenovnik', faq: 'Česta pitanja',
  book: 'Zakazivanje', tst: 'Recenzije', soc: 'Mreže', loc: 'Lokacija'
};

const IME_KLIKA = {
  whatsapp: 'WhatsApp', telefon: 'Poziv telefonom', email: 'Mejl',
  instagram: 'Instagram', tiktok: 'TikTok', mapa: 'Google Mape',
  galerija: 'Otvorena slika iz galerije',
  'loyalty-otvoren': 'Otvorena loyalty prijava',
  'loyalty-prijava': 'Poslata loyalty prijava',
  'loyalty-ulogovan': 'Loyalty prijavljivanje',
  'loyalty-aktivacija': 'Loyalty aktivacija',
  'recenzija-otvorena': 'Otvorena forma za recenziju',
  'recenzija-poslata': 'Poslata recenzija'
};

const IME_KANALA = {
  google: 'Google pretraga', instagram: 'Instagram', facebook: 'Facebook',
  pretraga: 'Druge pretraživače', tiktok: 'TikTok', youtube: 'YouTube',
  poruka: 'Poslat link (poruka)', direktno: 'Direktno (ukucali adresu)', ostalo: 'Ostalo'
};

// Klikovi koji zaista vode do posla.
const KONTAKT_KLIKOVI = ['whatsapp', 'telefon', 'email'];

// ── Vreme po Beogradu ─────────────────────────────────────
function pomakBeograda(d) {
  const uBg  = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
  const uUtc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  return uBg.getTime() - uUtc.getTime();
}

function ponocBeograda(d) {
  const pomak = pomakBeograda(d);
  const dan = 24 * 60 * 60 * 1000;
  return new Date(Math.floor((d.getTime() + pomak) / dan) * dan - pomak);
}

function satBeograda(d) {
  return new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' })).getHours();
}

function danBeograda(d) {
  return new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' })).getDay();
}

function datumSrpski(d) {
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    day: 'numeric', month: 'long', timeZone: 'Europe/Belgrade'
  }).format(d);
}

const DANI = ['ned', 'pon', 'uto', 'sre', 'čet', 'pet', 'sub'];

// ── Pomoćno ───────────────────────────────────────────────
function bez(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function vreme(sec) {
  const n = Number(sec) || 0;
  if (n < 60) return n + ' sek';
  const m = Math.floor(n / 60);
  const s = n % 60;
  return s ? m + ' min ' + s + ' sek' : m + ' min';
}

// Promena u odnosu na prošlu nedelju, kao gotov komad HTML-a.
function promena(sada, ranije, viseJeBolje) {
  const a = Number(sada) || 0;
  const b = Number(ranije) || 0;
  if (!b) return a ? '<span style="color:#7a7a7a;font-size:12px">nova stavka</span>' : '';
  const p = Math.round(((a - b) / b) * 100);
  if (p === 0) return '<span style="color:#7a7a7a;font-size:12px">isto kao prošle nedelje</span>';
  const gore = p > 0;
  const dobro = viseJeBolje === false ? !gore : gore;
  const boja = dobro ? '#1e8449' : '#C0392B';
  return '<span style="color:' + boja + ';font-size:12px;font-weight:700">' +
         (gore ? '▲ +' : '▼ ') + p + '%</span>' +
         '<span style="color:#9a9a9a;font-size:12px"> (bilo ' + b + ')</span>';
}

// Isti čovek ume da klikne i WhatsApp i telefon — zato broj RAZLIČITIH
// ljudi dolazi iz baze (`kontakt_ljudi`), a ne kao zbir po kanalima.
function zbirKontakata(period) {
  let klikova = 0;
  for (const k of (period && period.kontakti) || []) {
    if (KONTAKT_KLIKOVI.indexOf(k.naziv) === -1) continue;
    klikova += Number(k.klikova) || 0;
  }
  return { klikova, ljudi: Number(period && period.kontakt_ljudi) || 0 };
}

// ── Delovi mejla ──────────────────────────────────────────
function karta(naslov, broj, dodatak, promenaHtml) {
  return '' +
  '<td width="25%" style="padding:6px" valign="top">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;border:1px solid #e8e4dd;border-radius:10px">' +
      '<tr><td style="padding:16px 14px;text-align:center;font-family:Arial,Helvetica,sans-serif">' +
        '<div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#8a8378">' + bez(naslov) + '</div>' +
        '<div style="font-size:32px;font-weight:800;color:#1c1c1c;line-height:1.15;margin:8px 0 2px">' + bez(broj) + '</div>' +
        (dodatak ? '<div style="font-size:12px;color:#8a8378;margin-bottom:6px">' + bez(dodatak) + '</div>' : '') +
        (promenaHtml || '') +
      '</td></tr>' +
    '</table>' +
  '</td>';
}

function naslovSekcije(t) {
  return '<tr><td style="padding:26px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;' +
         'letter-spacing:2px;text-transform:uppercase;color:#C0392B;font-weight:700;' +
         'border-bottom:2px solid #f0ece5">' + bez(t) + '</td></tr>';
}

// Traka: naziv, broj i crvena linija duga srazmerno najvećem broju.
// `sufiks` je HTML koji sami sastavljamo, pa namerno ne ide kroz bez().
function traka(naziv, broj, najveci, sufiks) {
  const pct = najveci > 0 ? Math.max(2, Math.round((broj / najveci) * 100)) : 2;
  return '' +
  '<tr>' +
    '<td width="42%" style="padding:7px 8px 7px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1c1c1c">' + bez(naziv) + '</td>' +
    '<td width="42%" style="padding:7px 0">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
        '<td width="' + pct + '%" style="background:#C0392B;height:9px;font-size:0;line-height:0;border-radius:5px">&nbsp;</td>' +
        '<td style="font-size:0;line-height:0">&nbsp;</td>' +
      '</tr></table>' +
    '</td>' +
    '<td width="16%" style="padding:7px 0 7px 10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;' +
      'font-weight:700;color:#1c1c1c;text-align:right;white-space:nowrap">' + bez(broj) + (sufiks || '') + '</td>' +
  '</tr>';
}

function tabela(redovi) {
  if (!redovi) return '';
  return '<tr><td style="padding:6px 0 2px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
         redovi + '</table></td></tr>';
}

// Pravi red tabele „dan po dan".
function redDana(x) {
  const d = new Date(x.dan + 'T12:00:00Z');
  const c = 'padding:9px 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;' +
            'color:#1c1c1c;border-bottom:1px solid #f0ece5;text-align:center';
  const kontakt = Number(x.kontakti) || 0;
  return '<tr>' +
    '<td style="' + c + ';text-align:left;white-space:nowrap"><b>' +
      DANI[d.getUTCDay()] + '</b> ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.</td>' +
    '<td style="' + c + '"><b>' + (x.posetioci || 0) + '</b></td>' +
    '<td style="' + c + '">' + (x.pregledi || 0) + '</td>' +
    '<td style="' + c + (kontakt ? ';color:#1e8449;font-weight:700' : ';color:#b5aea3') + '">' +
      kontakt + '</td>' +
    '<td style="' + c + '">' + (x.vreme_sec ? vreme(x.vreme_sec) : '—') + '</td>' +
    '<td style="' + c + ';color:#8a8378">' +
      (x.vrhunac === null || x.vrhunac === undefined ? '—' : x.vrhunac + ':00') + '</td>' +
  '</tr>';
}

function zaglavljeDana() {
  const c = 'padding:8px 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;' +
            'letter-spacing:0.6px;text-transform:uppercase;color:#8a8378;' +
            'border-bottom:2px solid #f0ece5;text-align:center';
  return '<tr>' +
    '<td style="' + c + ';text-align:left">Dan</td>' +
    '<td style="' + c + '">Ljudi</td>' +
    '<td style="' + c + '">Otvaranja</td>' +
    '<td style="' + c + '">Kontakti</td>' +
    '<td style="' + c + '">Zadržavanje</td>' +
    '<td style="' + c + '">Gužva u</td>' +
  '</tr>';
}

function prazno(tekst) {
  return '<tr><td style="padding:12px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#8a8378">' +
         bez(tekst) + '</td></tr>';
}

// ── Sastavljanje mejla ────────────────────────────────────
function sastavi(sada, pre, dodatno, od, doo) {
  const k  = zbirKontakata(sada);
  const kp = zbirKontakata(pre);
  const sesija = Number(sada.ukupno_sesija) || 0;

  // ── Rečenica u ljudskom jeziku, na vrhu ────────────────
  const recenice = [];
  if (!sada.posetioci) {
    recenice.push('Ove nedelje sajt niko nije otvorio. Ako je ovo prva nedelja merenja, podaci tek počinju da se skupljaju.');
  } else {
    recenice.push('Sajt je otvorilo <b>' + sada.posetioci + '</b> ' +
      (sada.posetioci === 1 ? 'osoba' : 'različitih ljudi') + ', ukupno <b>' + sada.pregledi + '</b> puta.');
    if (k.klikova) {
      recenice.push('Njih <b>' + k.ljudi + '</b> je kliknulo na WhatsApp, broj telefona ili mejl — ' +
        'to su ljudi koji su hteli da te kontaktiraju.');
    } else {
      recenice.push('<b>Niko</b> nije kliknuo na WhatsApp, telefon ni mejl. Posete ima, ali se ne pretvaraju u kontakt.');
    }
    if (sada.vreme_sec) {
      recenice.push('Na sajtu se u proseku zadrže <b>' + vreme(sada.vreme_sec) + '</b> i preskroluju ' +
        '<b>' + (sada.dubina || 0) + '%</b> strane.');
    }
  }

  // ── Najbolji sat ────────────────────────────────────────
  let najSat = null;
  for (const s of sada.po_satima || []) {
    if (!najSat || s.posetioci > najSat.posetioci) najSat = s;
  }

  let h = '';

  h += '<tr><td style="padding:0 0 6px;font-family:Georgia,serif;font-size:26px;color:#1c1c1c;font-weight:normal">' +
       'Nedeljni izveštaj sa sajta</td></tr>' +
       '<tr><td style="padding:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8a8378">' +
       bez(datumSrpski(od)) + ' — ' + bez(datumSrpski(new Date(doo.getTime() - 1))) + ' &nbsp;·&nbsp; lakerdetailing.rs</td></tr>';

  h += '<tr><td style="padding:14px 16px;background:#fdf6f5;border-left:3px solid #C0392B;' +
       'font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#2a2a2a">' +
       recenice.join(' ') + '</td></tr>';

  // ── Četiri glavna broja ─────────────────────────────────
  h += '<tr><td style="padding:20px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
       karta('Ljudi', sada.posetioci || 0, 'različitih posetilaca', promena(sada.posetioci, pre.posetioci)) +
       karta('Otvaranja', sada.pregledi || 0, 'pregleda strane', promena(sada.pregledi, pre.pregledi)) +
       karta('Zadržavanje', sada.vreme_sec ? vreme(sada.vreme_sec) : '—', 'u proseku', promena(sada.vreme_sec, pre.vreme_sec)) +
       karta('Kontakti', k.ljudi, 'hteli da te zovu', promena(k.ljudi, kp.ljudi)) +
       '</tr></table></td></tr>';

  // ── Kontakti ────────────────────────────────────────────
  h += naslovSekcije('Šta su kliktali');
  if ((sada.kontakti || []).length) {
    const naj = Math.max.apply(null, sada.kontakti.map(x => x.klikova));
    let r = '';
    for (const x of sada.kontakti) {
      r += traka(IME_KLIKA[x.naziv] || x.naziv, x.klikova, naj,
                 ' <span style="font-weight:400;color:#8a8378">(' + x.ljudi + ' ljudi)</span>');
    }
    h += tabela(r);
  } else {
    h += prazno('Nijedan klik ove nedelje.');
  }

  // ── Dan po dan ──────────────────────────────────────────
  h += naslovSekcije('Dan po dan');
  if ((sada.po_danima || []).length) {
    let r = zaglavljeDana();
    for (const x of sada.po_danima) r += redDana(x);
    h += '<tr><td style="padding:8px 0 2px"><table role="presentation" width="100%" ' +
         'cellpadding="0" cellspacing="0" style="border-collapse:collapse">' + r + '</table></td></tr>';
  } else h += prazno('Nema podataka.');

  // ── Odakle dolaze ───────────────────────────────────────
  h += naslovSekcije('Odakle su došli');
  if ((sada.kanali || []).length) {
    const naj = Math.max.apply(null, sada.kanali.map(x => x.ljudi));
    let r = '';
    for (const x of sada.kanali) r += traka(IME_KANALA[x.kanal] || x.kanal, x.ljudi, naj, '');
    h += tabela(r);
  } else h += prazno('Nema podataka.');

  // ── Dokle stignu kroz stranu ────────────────────────────
  h += naslovSekcije('Dokle stignu kroz stranu');
  if ((sada.sekcije || []).length && sesija) {
    const naj = Math.max.apply(null, sada.sekcije.map(x => x.sesija));
    let r = '';
    for (const x of sada.sekcije) {
      const pct = Math.round((x.sesija / sesija) * 100);
      r += traka(IME_SEKCIJE[x.sekcija] || x.sekcija, x.sesija, naj,
                 ' <span style="font-weight:400;color:#8a8378">(' + pct + '%)</span>');
    }
    h += tabela(r);
  } else h += prazno('Nema podataka.');

  // ── Uređaji, gradovi, strane ────────────────────────────
  h += naslovSekcije('Sa čega gledaju');
  if ((sada.uredjaji || []).length) {
    const naj = Math.max.apply(null, sada.uredjaji.map(x => x.ljudi));
    let r = '';
    for (const x of sada.uredjaji) r += traka(x.uredjaj, x.ljudi, naj, '');
    h += tabela(r);
  } else h += prazno('Nema podataka.');

  h += naslovSekcije('Iz kog su grada');
  if ((sada.gradovi || []).length) {
    const naj = Math.max.apply(null, sada.gradovi.map(x => x.ljudi));
    let r = '';
    for (const x of sada.gradovi) r += traka(x.grad, x.ljudi, naj, '');
    h += tabela(r);
  } else h += prazno('Nema podataka.');

  if ((sada.strane || []).length > 1) {
    h += naslovSekcije('Najgledanije strane');
    const naj = Math.max.apply(null, sada.strane.map(x => x.pregledi));
    let r = '';
    for (const x of sada.strane) r += traka(x.putanja, x.pregledi, naj, '');
    h += tabela(r);
  }

  // ── Kako ide iz nedelje u nedelju ───────────────────────
  const nedelje = (dodatno.nedelje || []).filter(n => Number(n.posetioci) > 0);
  if (nedelje.length > 1) {
    h += naslovSekcije('Poslednjih ' + nedelje.length + ' nedelja');
    const naj = Math.max.apply(null, nedelje.map(x => x.posetioci));
    let r = '';
    for (const n of nedelje) {
      const p = new Date(n.od + 'T12:00:00Z');
      r += traka('nedelja od ' + p.getUTCDate() + '.' + (p.getUTCMonth() + 1) + '.',
                 n.posetioci, naj,
                 ' <span style="font-weight:400;color:#8a8378">(' + (n.kontakti || 0) + ' kont.)</span>');
    }
    h += tabela(r);
  }

  // ── Sitnice koje se isplati znati ───────────────────────
  h += naslovSekcije('Još ponešto');
  let sitno = '';
  if (najSat) {
    sitno += '<li style="margin-bottom:7px">Najviše ljudi otvori sajt oko <b>' +
             najSat.sat + ':00</b> — tada je najbolje objaviti nešto novo.</li>';
  }
  sitno += '<li style="margin-bottom:7px">Odmah ode, bez ijednog klika: <b>' +
           (sada.odmah_otisli || 0) + '%</b> otvaranja. ' +
           (Number(sada.odmah_otisli) > 70 ? 'Ovo je visoko — vredi pogledati šta ih odbija na vrhu strane.' : '') + '</li>';
  sitno += '<li style="margin-bottom:7px">Nove loyalty prijave preko sajta: <b>' + dodatno.prijave + '</b></li>';
  sitno += '<li style="margin-bottom:7px">Nove recenzije poslate preko sajta: <b>' + dodatno.recenzije + '</b></li>';
  h += '<tr><td style="padding:10px 0"><ul style="margin:0;padding-left:20px;font-family:Arial,Helvetica,sans-serif;' +
       'font-size:14px;line-height:1.6;color:#2a2a2a">' + sitno + '</ul></td></tr>';

  h += '<tr><td style="padding:26px 0 0;border-top:1px solid #eee7dd;font-family:Arial,Helvetica,sans-serif;' +
       'font-size:11px;line-height:1.7;color:#a09a90">' +
       'Meri se bez kolačića i bez ličnih podataka — ne zna se ko je ko, samo koliko ih je i šta su radili.<br>' +
       'Tvoje sopstvene posete se ne broje ako si na svom telefonu i računaru jednom otvorio ' +
       '<b>lakerdetailing.rs/?nemeri=on</b>.<br>' +
       'Izveštaj šalje sajt sam, svakog ponedeljka ujutru.' +
       '</td></tr>';

  return '<!doctype html><html lang="sr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#f3f1ee">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ee">' +
    '<tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="640" cellpadding="0" cellspacing="0" ' +
      'style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;padding:30px 26px">' +
    h +
    '</table></td></tr></table></body></html>';
}

// ── Dohvatanje ────────────────────────────────────────────
async function periodni(od, doo) {
  const res = await supabaseFetch('/rest/v1/rpc/stat_izvestaj', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ od: od.toISOString(), do: doo.toISOString() })
  });
  if (!res.ok) throw new Error('stat_izvestaj: ' + res.status + ' ' + (await res.text().catch(() => '')));
  return await res.json();
}

async function istorijaNedelja(kraj, koliko) {
  try {
    const res = await supabaseFetch('/rest/v1/rpc/stat_nedelje', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kraj: kraj.toISOString(), koliko })
    });
    return res.ok ? await res.json() : [];
  } catch { return []; }
}

async function prebroj(tabelaIme, uslov, od, doo) {
  const q = '/rest/v1/' + tabelaIme + '?select=id&created_at=gte.' + od.toISOString() +
            '&created_at=lt.' + doo.toISOString() + (uslov || '');
  const res = await supabaseFetch(q, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
  const raspon = res.headers && res.headers.get ? res.headers.get('content-range') : '';
  const m = /\/(\d+)$/.exec(String(raspon || ''));
  return m ? Number(m[1]) : 0;
}

async function ocisti() {
  const granica = new Date(Date.now() - CUVAJ_DANA * 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabaseFetch('/rest/v1/stat_dogadjaji?ts=lt.' + granica, {
      method: 'DELETE', headers: { Prefer: 'return=minimal' }
    });
  } catch { /* nije kritično */ }
}

// Kada je poslednji put mejl STVARNO otisao. null = nikad.
async function poslednjiUspeh() {
  const res = await supabaseFetch(
    '/rest/v1/security_audit_logs?select=created_at&scope=eq.izvestaj&action=eq.nedeljni_mejl' +
    '&status=eq.ok&order=created_at.desc&limit=1', { method: 'GET' });
  if (!res.ok) return null;
  const r = await res.json().catch(() => []);
  if (!Array.isArray(r) || !r.length) return null;
  const d = new Date(r[0].created_at);
  return isNaN(d.getTime()) ? null : d;
}

async function upisiTrag(status, detalji) {
  try {
    await supabaseFetch('/rest/v1/security_audit_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify([{
        scope: 'izvestaj', action: 'nedeljni_mejl', status: String(status),
        ip: 'cron', user_agent: 'vercel-cron', subject: PRIMALAC,
        details: detalji || {}, created_at: new Date().toISOString()
      }])
    });
  } catch { /* nije kritično */ }
}

function jednako(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  if (!x.length || x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

// ══════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json');

  const url    = new URL(req.url, 'https://lakerdetailing.rs');
  const kljuc  = url.searchParams.get('kljuc') || '';
  const sada   = url.searchParams.get('sada') === '1';
  const suvo   = url.searchParams.get('suvo') === '1';

  // ── Ko sme da pozove ────────────────────────────────────
  const tajna     = getEnv('CRON_SECRET');
  const lozinka   = getEnv('ADMIN_PASSWORD', 'ADMIN_PW', 'VERCEL_ADMIN_PASSWORD');
  const zaglavlje = String(req.headers.authorization || '');
  const odCrona   = !!req.headers['x-vercel-cron'];

  // Zaglavlje x-vercel-cron može da izmisli bilo ko, pa se prihvata SAMO
  // kad CRON_SECRET nije podešen i samo za redovno slanje. Time neko sa
  // strane u najgorem slučaju pokrene isti onaj mejl koji bi tog ponedeljka
  // ionako otišao — a osigurač od 20h ga svede na jedan.
  const rucno    = !!(lozinka && kljuc && jednako(kljuc, lozinka));
  const saTajnom = !!(tajna && jednako(zaglavlje, 'Bearer ' + tajna));
  const slabiCron = odCrona && !tajna && !sada;
  const smem     = rucno || saTajnom || slabiCron;

  if (!smem) { json(res, 401, { ok: false, greska: 'Nema pristupa' }); return; }

  // ── Kada se šalje ───────────────────────────────────────
  // Redovno: ponedeljkom, cron je na 10:00 UTC (leti 12h, zimi 11h).
  // Nadoknada: ako slanje padne (npr. Brevo odbije poziv), cron sutradan
  // pokuša ponovo umesto da se cela nedelja izgubi.
  const sadaVreme = new Date();
  const dan = 24 * 60 * 60 * 1000;

  if (!sada) {
    const zadnji  = await poslednjiUspeh();
    const proslo  = zadnji ? (sadaVreme.getTime() - zadnji.getTime()) : Infinity;

    // Vec poslato ove nedelje — ne salji drugi put.
    if (proslo < 6 * dan) {
      json(res, 200, { ok: true, poslato: false, razlog: 'vec poslat pre manje od 6 dana' });
      return;
    }
    // Nadoknada vazi i kad mejl NIKAD nije uspeo (proslo = Infinity) —
    // inace bi prvi neuspeo ponedeljak odlozio izvestaj za celu nedelju.
    // Cim jedno slanje prodje, gornja provera od 6 dana zaustavlja ponavljanje.
    const ponedeljak = danBeograda(sadaVreme) === 1;
    const nadoknada  = proslo > 8 * dan;

    if (!ponedeljak && !nadoknada) {
      json(res, 200, { ok: true, poslato: false, razlog: 'nije ponedeljak' });
      return;
    }
    if (satBeograda(sadaVreme) < 10) {
      json(res, 200, { ok: true, poslato: false, razlog: 'prerano u danu' });
      return;
    }
  }

  // ── Period: poslednjih 7 dana ───────────────────────────
  // Redovan ponedeljni mejl se seče na ponoć, pa pokriva tačno prošlu
  // nedelju. Ručno pokretanje (`sada=1`) ide do OVOG trenutka, da bi
  // proba pokazala i ono što se desilo danas.
  const doo  = sada ? sadaVreme : ponocBeograda(sadaVreme);
  const od   = new Date(doo.getTime() - 7 * dan);
  const odP  = new Date(doo.getTime() - 14 * dan);

  try {
    const [ovaNedelja, prosla, nedelje, prijave, recenzije] = await Promise.all([
      periodni(od, doo),
      periodni(odP, od),
      istorijaNedelja(doo, 8),
      prebroj('contacts', '&submission_type=eq.loyalty_registration', od, doo),
      prebroj('testimonials', '', od, doo)
    ]);

    const html = sastavi(ovaNedelja, prosla, { prijave, recenzije, nedelje }, od, doo);
    const naslov = 'Sajt · ' + (ovaNedelja.posetioci || 0) + ' ljudi, ' +
                   zbirKontakata(ovaNedelja).ljudi + ' kontakata — ' +
                   datumSrpski(od) + '–' + datumSrpski(new Date(doo.getTime() - 1));

    if (suvo) {
      json(res, 200, { ok: true, poslato: false, razlog: 'suva proba', naslov, podaci: ovaNedelja });
      return;
    }

    const brevoKljuc = getEnv('BREVO_API_KEY', 'BREVO_APIKEY', 'BREVO_KEY');
    if (!brevoKljuc) { json(res, 500, { ok: false, greska: 'Nema BREVO_API_KEY' }); return; }

    const posalji = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': brevoKljuc, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: POSILJALAC,
        to: [{ email: PRIMALAC, name: 'Laker Detailing' }],
        subject: naslov,
        htmlContent: html
      })
    });

    const odgovor = await posalji.json().catch(() => ({}));
    await upisiTrag(posalji.ok ? 'ok' : 'greska', {
      posetioci: ovaNedelja.posetioci || 0,
      pregledi: ovaNedelja.pregledi || 0,
      status: posalji.status
    });

    if (posalji.ok) await ocisti();

    // Brevo ume da odbije poziv sa nepoznate IP adrese („authorised IPs").
    // Vercel funkcije nemaju stalnu IP, pa je to podesavanje treba ugasiti
    // na Brevo nalogu: Settings → Security → Authorised IPs.
    const nepoznataIp = !posalji.ok &&
      String(odgovor && odgovor.message || '').indexOf('unrecognised IP') > -1;

    json(res, posalji.ok ? 200 : 502, {
      ok: posalji.ok, poslato: posalji.ok, naslov,
      savet: nepoznataIp
        ? 'Brevo blokira poziv sa nepoznate IP adrese. Ugasi „Authorised IPs" na Brevo nalogu — Vercel nema stalnu IP pa dodavanje jedne adrese ne resava trajno.'
        : undefined,
      brevo: posalji.ok ? (odgovor.messageId || 'ok') : odgovor
    });
  } catch (e) {
    await upisiTrag('greska', { poruka: String(e && e.message || e).slice(0, 300) });
    json(res, 500, { ok: false, greska: String(e && e.message || e).slice(0, 300) });
  }
};

// Otvoreno samo radi probe izgleda mejla bez slanja (tools-izvestaj-proba.js).
module.exports._sastavi = sastavi;
