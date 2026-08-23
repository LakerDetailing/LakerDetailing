// ══════════════════════════════════════════════════════════
//  LAKER DETAILING — /api/mera
//  Prima merenja sa sajta i upisuje ih u Supabase.
//
//  Bez kolačića. Sirov IP se NIGDE ne upisuje — od njega se pravi
//  dnevni anonimni otisak (hash) koji sutra više ne važi, pa se isti
//  čovek ne može pratiti kroz dane ni povezati sa bilo čim drugim.
// ══════════════════════════════════════════════════════════

const crypto = require('node:crypto');
const { getEnv, json, supabaseFetch } = require('./_push');
const { getClientIp, setSecurityHeaders, setCorsHeaders } = require('./_security');

const MAX_TELO       = 16 * 1024;  // najveće telo zahteva
const MAX_DOGADJAJA  = 40;         // najviše događaja u jednom zahtevu
const VRSTE          = new Set(['pregled', 'klik', 'sekcija', 'kraj']);

// ── Anonimni otisak ───────────────────────────────────────
// So se izvodi iz servisnog ključa + datuma. Nije potrebna nova env
// varijabla, a hash se svakog ponoća menja sam od sebe.
function dnevniOtisak(ip, ua) {
  const tajna = getEnv('MERA_SO', 'SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY') || 'laker';
  const dan   = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256')
    .update(dan + '|' + tajna + '|' + ip + '|' + ua)
    .digest('hex')
    .slice(0, 20);
}

// ── Prepoznavanje robota ──────────────────────────────────
// Googlebot, skeneri i UptimeRobot ne smeju da ulaze u brojke.
// Namerno NE hvata „Instagram" ni „WhatsApp" u sredini stringa — to su
// ugrađeni brauzeri pravih ljudi koji dolaze sa mreža. Hvata se samo
// „WhatsApp/" oblik, kojim se predstavlja Metin skener za pregled linka.
const ROBOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pingdom|uptimerobot|curl\/|wget|python-requests|axios\/|node-fetch|go-http|java\/|okhttp|facebookexternalhit|whatsapp\/|semrush|ahrefs|petalbot|bytespider|gptbot|claudebot|dataprovider|chrome-lighthouse|vercel|screaming frog/i;

function jeRobot(ua) {
  return !ua || ua.length < 12 || ROBOT.test(ua);
}

// ── Uređaj i brauzer iz user-agenta ───────────────────────
function odrediUredjaj(ua, sirina) {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android.*mobile|windows phone/i.test(ua)) return 'telefon';
  if (Number(sirina) > 0 && Number(sirina) < 768) return 'telefon';
  if (Number(sirina) >= 768 && Number(sirina) < 1024) return 'tablet';
  return 'kompjuter';
}

function odrediBrauzer(ua) {
  if (/edg\//i.test(ua))                       return 'Edge';
  if (/opr\/|opera/i.test(ua))                 return 'Opera';
  if (/samsungbrowser/i.test(ua))              return 'Samsung';
  if (/firefox|fxios/i.test(ua))               return 'Firefox';
  if (/chrome|crios/i.test(ua))                return 'Chrome';
  if (/safari/i.test(ua))                      return 'Safari';
  return 'ostalo';
}

// ── Odakle je posetilac došao ─────────────────────────────
function odrediKanal(izvor, putanja) {
  const h = String(izvor || '').toLowerCase();
  if (!h) return 'direktno';
  if (/(^|\.)google\./.test(h) || h.includes('googleusercontent')) return 'google';
  if (h.includes('instagram') || h.includes('l.instagram'))        return 'instagram';
  if (h.includes('facebook') || h.includes('fb.') || h.includes('l.facebook')) return 'facebook';
  if (h.includes('bing') || h.includes('duckduckgo') || h.includes('yandex') || h.includes('yahoo')) return 'pretraga';
  if (h.includes('tiktok'))                                        return 'tiktok';
  if (h.includes('youtube'))                                       return 'youtube';
  if (h.includes('whatsapp') || h.includes('t.co') || h.includes('telegram')) return 'poruka';
  if (h.includes('lakerdetailing'))                                return 'direktno';
  void putanja;
  return 'ostalo';
}

// ── Skraćivanje na bezbednu dužinu ────────────────────────
function tekst(v, max) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max || 80);
}

function ceo(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

// ── Sitni brojač u memoriji lambde ────────────────────────
// Ne štiti savršeno (Vercel diže više instanci), ali odbija
// najprostije preplavljivanje bez ijednog upita u bazu.
const brojac = new Map();
function prebrzo(kljuc) {
  const sad = Date.now();
  const red = brojac.get(kljuc);
  if (!red || sad - red.od > 60000) {
    brojac.set(kljuc, { od: sad, n: 1 });
    if (brojac.size > 500) brojac.clear();
    return false;
  }
  red.n += 1;
  return red.n > 120;   // preko 120 zahteva u minutu sa iste adrese
}

// ══════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST')    { json(res, 405, { ok: false }); return; }

  const ua = String(req.headers['user-agent'] || '').slice(0, 300);

  // Robotima uvek uredan odgovor, ali ništa se ne upisuje.
  if (jeRobot(ua)) { json(res, 202, { ok: true }); return; }

  const ip = getClientIp(req);
  if (prebrzo(ip)) { json(res, 202, { ok: true }); return; }

  // ── Telo zahteva ────────────────────────────────────────
  // Vercel sam raspakuje JSON, ali sendBeacon ume da stigne i kao sirov tok.
  let telo = req.body;
  if (telo === undefined || telo === null) {
    telo = await new Promise((resolve) => {
      let sirovo = '';
      req.on('data', (deo) => {
        sirovo += deo;
        if (sirovo.length > MAX_TELO) { sirovo = ''; req.destroy(); }
      });
      req.on('end',   () => resolve(sirovo));
      req.on('error', () => resolve(''));
    });
  }
  if (typeof telo === 'string') {
    if (telo.length > MAX_TELO) { json(res, 413, { ok: false }); return; }
    try { telo = JSON.parse(telo); } catch { json(res, 400, { ok: false }); return; }
  }
  if (!telo || typeof telo !== 'object') { json(res, 400, { ok: false }); return; }

  const dogadjaji = Array.isArray(telo.e) ? telo.e.slice(0, MAX_DOGADJAJA) : [];
  if (!dogadjaji.length) { json(res, 202, { ok: true }); return; }

  // ── Zajedničko za sve događaje iz ovog zahteva ──────────
  const sesija  = tekst(telo.s, 40) || 'x';
  const putanja = tekst(telo.p, 120) || '/';

  let izvor = null;
  if (telo.r) {
    try { izvor = tekst(new URL(String(telo.r)).hostname.replace(/^www\./, ''), 80); }
    catch { izvor = null; }
  }

  const zajedno = {
    poseta_id: dnevniOtisak(ip, ua),
    sesija_id: sesija,
    putanja,
    izvor:   izvor || 'direktno',
    kanal:   odrediKanal(izvor, putanja),
    uredjaj: odrediUredjaj(ua, telo.w),
    brauzer: odrediBrauzer(ua),
    zemlja:  tekst(req.headers['x-vercel-ip-country'], 8),
    grad:    tekst(decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')), 60)
  };

  // ── Redovi za upis ──────────────────────────────────────
  const redovi = [];
  for (const d of dogadjaji) {
    if (!d || typeof d !== 'object') continue;
    const vrsta = tekst(d.v, 12);
    if (!vrsta || !VRSTE.has(vrsta)) continue;

    redovi.push({
      ...zajedno,
      vrsta,
      naziv:   tekst(d.n, 60),
      sekcija: tekst(d.sec, 40),
      sekundi: vrsta === 'kraj' ? ceo(d.t, 0, 7200) : null,
      dubina:  vrsta === 'kraj' ? ceo(d.d, 0, 100)  : null
    });
  }

  if (!redovi.length) { json(res, 202, { ok: true }); return; }

  try {
    const r = await supabaseFetch('/rest/v1/stat_dogadjaji', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(redovi)
    });
    // Posetiocu je svejedno da li je upis prošao — nikad ne kvarimo stranu.
    json(res, 202, { ok: !!r.ok });
  } catch {
    json(res, 202, { ok: true });
  }
};
