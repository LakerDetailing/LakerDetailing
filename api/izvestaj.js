// ══════════════════════════════════════════════════════════
//  LAKER DETAILING — /api/izvestaj
//  Nedeljni izveštaj o sajtu, mejlom preko Brevo.
//
//  Cron ga zove SVAKI dan u 10:00 UTC, ali mejl ide ponedeljkom.
//  Ako slanje padne (npr. Brevo odbije poziv), sutradan pokušava
//  ponovo — jedan pad ne sme da pojede celu nedelju.
//
//  Izgled mejla je u ./_izvestaj-mejl.js — ovde je samo dohvatanje
//  brojeva, raspored slanja i sam poziv Brevo-a.
//
//  Ručno:  /api/izvestaj?kljuc=<ADMIN_PASSWORD>&sada=1
//  Primer: /api/izvestaj?kljuc=<ADMIN_PASSWORD>&primer=1   (izmišljeni brojevi)
//  Suvo:   ...&suvo=1                                      (ne šalje mejl)
// ══════════════════════════════════════════════════════════

const crypto = require('node:crypto');
const { getEnv, json, supabaseFetch } = require('./_push');
const { setSecurityHeaders } = require('./_security');
const { sastaviMejl, ljudi, datum, primerPodaci } = require('./_izvestaj-mejl');

const BREVO_URL  = 'https://api.brevo.com/v3/smtp/email';
const PRIMALAC   = 'detailinglaker@gmail.com';
const POSILJALAC = { email: 'noreply@lakerdetailing.rs', name: 'Laker Detailing' };
const CUVAJ_DANA = 120;   // koliko dugo se drže sirovi događaji

// ── Vreme po Beogradu ─────────────────────────────────────
function pomakBeograda(d) {
  const uBg  = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
  const uUtc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  return uBg.getTime() - uUtc.getTime();
}

function ponocBeograda(d) {
  const dan = 24 * 60 * 60 * 1000;
  const pomak = pomakBeograda(d);
  return new Date(Math.floor((d.getTime() + pomak) / dan) * dan - pomak);
}

function danBeograda(d) {
  return new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' })).getDay();
}

function satBeograda(d) {
  return new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' })).getHours();
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
  const primer = url.searchParams.get('primer') === '1';
  const sada   = url.searchParams.get('sada') === '1' || primer;
  const suvo   = url.searchParams.get('suvo') === '1';

  // ── Ko sme da pozove ────────────────────────────────────
  const tajna     = getEnv('CRON_SECRET');
  const lozinka   = getEnv('ADMIN_PASSWORD', 'ADMIN_PW', 'VERCEL_ADMIN_PASSWORD');
  const zaglavlje = String(req.headers.authorization || '');
  // Vercel cron NE šalje zaglavlje „x-vercel-cron" (to je bila greška zbog
  // koje mejl nije stizao od 23.8. do 3.9.2026 — svaki poziv je dobijao 401).
  // Šalje SAMO „x-vercel-cron-schedule" (raspored) i, kad je CRON_SECRET
  // podešen, „Authorization: Bearer <CRON_SECRET>". CRON_SECRET JE podešen
  // u Vercel-u od 2026-09-03; slabiji put ostaje samo kao rezerva ako neko
  // obriše varijablu — i tada ume da pokrene jedino redovni ponedeljni mejl.
  const odCrona   = !!req.headers['x-vercel-cron-schedule'] ||
                    /^vercel-cron/i.test(String(req.headers['user-agent'] || ''));

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

    // Vec poslato danas (cron ume da okine vise puta) — ne salji drugi put.
    if (proslo < 20 * 60 * 60 * 1000) {
      json(res, 200, { ok: true, poslato: false, razlog: 'vec poslat pre manje od 20h' });
      return;
    }
    // Nadoknada vazi i kad mejl NIKAD nije uspeo (proslo = Infinity) —
    // inace bi prvi neuspeo ponedeljak odlozio izvestaj za celu nedelju.
    // Cim jedno slanje prodje, gornja provera od 6 dana zaustavlja ponavljanje.
    // Ponedeljkom se salje UVEK (i kad je rucno slanje bilo pre 2 dana —
    // rucna proba ne sme da pojede redovni izvestaj). Ostalim danima samo
    // nadoknada, ako je od poslednjeg uspeha proslo vise od 8 dana.
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
    let ovaNedelja, prosla, dodatno, odP2 = od, dooP2 = doo;

    if (primer) {
      // Izmišljeni brojevi — samo da se vidi kako mejl izgleda.
      const p = primerPodaci();
      ovaNedelja = p.sada; prosla = p.pre; dodatno = p.dodatno;
      odP2 = p.od; dooP2 = p.doo;
    } else {
      const [a, b, nedelje, prijave, recenzije] = await Promise.all([
        periodni(od, doo),
        periodni(odP, od),
        istorijaNedelja(doo, 8),
        prebroj('contacts', '&submission_type=eq.loyalty_registration', od, doo),
        prebroj('testimonials', '', od, doo)
      ]);
      ovaNedelja = a; prosla = b; dodatno = { prijave, recenzije, nedelje };
    }

    const html = sastaviMejl(ovaNedelja, prosla, dodatno, odP2, dooP2, { primer });

    const kontakata = Number(ovaNedelja.kontakt_ljudi) || 0;
    const naslov = primer
      ? 'PRIMER izveštaja sa sajta — ovako će izgledati'
      : 'Sajt: ' + ljudi(ovaNedelja.posetioci || 0) + ', ' + kontakata + ' htelo da te kontaktira · ' +
        datum(odP2) + '–' + datum(new Date(dooP2.getTime() - 1));

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
    // Primer NE ulazi u trag — inače bi provera „već poslato" preskočila
    // pravi ponedeljni izveštaj.
    if (!primer) await upisiTrag(posalji.ok ? 'ok' : 'greska', {
      posetioci: ovaNedelja.posetioci || 0,
      pregledi: ovaNedelja.pregledi || 0,
      status: posalji.status
    });

    if (posalji.ok && !primer) await ocisti();

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
