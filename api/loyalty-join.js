// ══════════════════════════════════════════════════════════
//  LAKER DETAILING STUDIO — QR Loyalty prijava
//  GET  → javni config (Google client ID / Apple service ID)
//  POST → prijava: manual | google | apple
//  Google/Apple tokeni se verifikuju ISKLJUČIVO server-side.
// ══════════════════════════════════════════════════════════

const crypto = require('crypto');
const { getEnv, supabaseFetch, fromBase64Url } = require('./_push');
const { getClientIp, setSecurityHeaders, setCorsHeaders, checkPersistentRateLimit, auditSecurityEvent } = require('./_security');

const BREVO_API_KEY = getEnv('BREVO_API_KEY', 'BREVO_APIKEY', 'BREVO_KEY');
const BREVO_URL     = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL  = 'noreply@lakerdetailing.rs';
const SENDER_NAME   = 'Laker Detailing Studio';
const ADMIN_EMAIL   = 'detailinglaker@gmail.com';

// Public OAuth identifikatori — postavljaju se u Vercel env (nisu tajne, ali bez
// njih su Google/Apple dugmad sakrivena i ručna forma je jedini način prijave).
const GOOGLE_CLIENT_ID  = getEnv('GOOGLE_CLIENT_ID');
const APPLE_SERVICE_ID  = getEnv('APPLE_SERVICE_ID');

const SOURCES = {
  manual: 'qr_manual',
  google: 'qr_google',
  apple:  'qr_apple'
};
const SOURCE_LABELS = {
  qr_manual: 'QR — ručna prijava',
  qr_google: 'QR — Google nalog',
  qr_apple:  'QR — Apple nalog'
};

// ── SANITIZACIJA (isti pattern kao send-email.js) ─────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function cleanText(value, maxLen = 160) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}
function cleanEmail(value) {
  return cleanText(value, 254).toLowerCase();
}
function cleanPhone(value) {
  return String(value || '').trim().replace(/\s+/g, '').slice(0, 20);
}
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}
function isValidPhone(value) {
  return /^(\+?381|0)(6[0-9])(\d{6,7})$/.test(String(value || '').trim().replace(/\s+/g, ''));
}

// ── GOOGLE: verifikacija ID tokena preko Google tokeninfo ──
// tokeninfo proverava potpis i isteklost; mi proveravamo aud/iss/email_verified.
async function verifyGoogleCredential(credential) {
  if (!GOOGLE_CLIENT_ID) return { ok: false, error: 'Google prijava trenutno nije dostupna.' };
  const token = String(credential || '');
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return { ok: false, error: 'Neispravan Google token.' };
  let res;
  try {
    res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token));
  } catch (e) {
    return { ok: false, error: 'Google verifikacija nije uspela. Pokušajte ponovo.' };
  }
  if (!res.ok) return { ok: false, error: 'Google prijava nije prošla proveru.' };
  const info = await res.json().catch(() => ({}));
  const issOk = info.iss === 'https://accounts.google.com' || info.iss === 'accounts.google.com';
  if (!issOk || info.aud !== GOOGLE_CLIENT_ID) return { ok: false, error: 'Google prijava nije prošla proveru.' };
  if (String(info.email_verified) !== 'true' || !isValidEmail(info.email)) {
    return { ok: false, error: 'Google nalog nema verifikovan email.' };
  }
  const name = cleanText(info.name || [info.given_name, info.family_name].filter(Boolean).join(' '), 80);
  return { ok: true, email: cleanEmail(info.email), name: name || cleanEmail(info.email) };
}

// ── APPLE: verifikacija identity tokena preko Apple JWKS ──
async function verifyAppleIdToken(idToken) {
  if (!APPLE_SERVICE_ID) return { ok: false, error: 'Apple prijava trenutno nije dostupna.' };
  const token = String(idToken || '');
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'Neispravan Apple token.' };
  let header, payload;
  try {
    header  = JSON.parse(fromBase64Url(parts[0]).toString('utf8'));
    payload = JSON.parse(fromBase64Url(parts[1]).toString('utf8'));
  } catch (e) {
    return { ok: false, error: 'Neispravan Apple token.' };
  }
  if (header.alg !== 'RS256' || !header.kid) return { ok: false, error: 'Neispravan Apple token.' };
  let jwks;
  try {
    const res = await fetch('https://appleid.apple.com/auth/keys');
    if (!res.ok) throw new Error('jwks_fetch_failed');
    jwks = await res.json();
  } catch (e) {
    return { ok: false, error: 'Apple verifikacija nije uspela. Pokušajte ponovo.' };
  }
  const jwk = (jwks.keys || []).find(k => k.kid === header.kid && k.alg === 'RS256');
  if (!jwk) return { ok: false, error: 'Apple prijava nije prošla proveru.' };
  let valid = false;
  try {
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    valid = crypto.verify(
      'RSA-SHA256',
      Buffer.from(parts[0] + '.' + parts[1]),
      publicKey,
      fromBase64Url(parts[2])
    );
  } catch (e) {
    valid = false;
  }
  const now = Math.floor(Date.now() / 1000);
  if (!valid
    || payload.iss !== 'https://appleid.apple.com'
    || payload.aud !== APPLE_SERVICE_ID
    || !payload.sub
    || !payload.exp || payload.exp < now
    || (payload.nbf && payload.nbf > now)) {
    return { ok: false, error: 'Apple prijava nije prošla proveru.' };
  }
  if (!isValidEmail(payload.email)) {
    return { ok: false, error: 'Apple nalog nije podelio email adresu.' };
  }
  return { ok: true, email: cleanEmail(payload.email) };
}

// ── SUPABASE helpers ─────────────────────────────────────
async function supabaseSelect(path) {
  const res = await supabaseFetch(path, { method: 'GET' });
  if (!res.ok) return [];
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

async function supabaseInsert(path, body) {
  const res = await supabaseFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body)
  });
  return { ok: res.ok, status: res.status };
}

// ── EMAIL templates (isti vizuelni stil kao send-email.js) ─
function headerHtml() {
  return `
  <div style="background:#0E0E0E;padding:28px 40px;border-bottom:2px solid #C0392B">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:#F2F0EC">LAKER</div>
    <div style="font-size:8px;letter-spacing:5px;text-transform:uppercase;color:#C0392B;margin-top:3px">DETAILING STUDIO · ČAČAK</div>
  </div>`;
}
function footerHtml() {
  return `
  <div style="background:#0E0E0E;padding:22px 40px;text-align:center;margin-top:0">
    <p style="font-size:11px;color:#555;margin:0">© 2025–2026 Laker Detailing Studio · Čačak, Srbija</p>
    <p style="font-size:11px;color:#555;margin:6px 0 0">
      <a href="tel:+381607260302" style="color:#C0392B;text-decoration:none">060 726 0302</a>
      &nbsp;·&nbsp;
      <a href="https://www.lakerdetailing.rs" style="color:#C0392B;text-decoration:none">lakerdetailing.rs</a>
    </p>
  </div>`;
}

function qrClientHtml({ name }) {
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.1)">
    ${headerHtml()}
    <div style="padding:40px">
      <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:12px">LAKER LOYALTY MEMBERSHIP</div>
      <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:300;color:#0E0E0E;margin:0 0 6px">Zahtev <em style="font-style:italic;color:#C0392B">primljen</em>, ${esc(name)}!</h1>
      <p style="font-size:13px;color:#888;margin:0 0 28px">Hvala na prijavi za Laker Loyalty program. Vlasnik će aktivirati vaš nalog i dobićete potvrdu na ovaj email.</p>

      <div style="background:#f7f7f7;border-left:2px solid #C0392B;padding:20px 24px;margin-bottom:24px">
        <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:12px">Šta vas čeka u Loyalty programu</div>
        <p style="font-size:13px;color:#555;line-height:2.1;margin:0">
          ◆ <strong>24 premium pranja godišnje</strong> — 2 puta mesečno<br>
          ◆ <strong>Prioritetan termin</strong> — uvek na prvom mestu<br>
          ◆ Pregled istorije usluga u vašem nalogu na sajtu
        </p>
      </div>

      <div style="background:#FFF9F9;border:1px solid rgba(192,57,43,.15);padding:16px 20px;margin-bottom:28px">
        <div style="font-size:12px;color:#555;line-height:1.7">
          <strong style="color:#C0392B">Sledeći korak:</strong> Pri aktivaciji dogovaramo plan (mesečni/godišnji) i prvi termin.<br>
          Za brži odgovor — WhatsApp: <a href="https://wa.me/381607260302" style="color:#C0392B;font-weight:700;text-decoration:none">060 726 0302</a>
        </div>
      </div>

      <div style="text-align:center">
        <a href="https://www.lakerdetailing.rs" style="display:inline-block;background:#C0392B;color:#fff;padding:14px 36px;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Posetite sajt →</a>
      </div>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

function qrAdminHtml({ name, email, telefon, velLabel, planLabel, sourceLabel, when }) {
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff">
    ${headerHtml()}
    <div style="padding:32px 40px">
      <div style="background:#C0392B;color:#fff;padding:8px 16px;display:inline-block;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px">📱 NOVA QR LOYALTY PRIJAVA</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888;width:130px">Klijent:</td><td style="padding:10px 14px;color:#111;font-weight:600">${esc(name)}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Email:</td><td style="padding:10px 14px"><a href="mailto:${esc(email)}" style="color:#C0392B">${esc(email)}</a></td></tr>
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Telefon:</td><td style="padding:10px 14px">${telefon ? `<a href="tel:${esc(telefon)}" style="color:#C0392B">${esc(telefon)}</a>` : '<span style="color:#999">— (prijava preko naloga)</span>'}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Vozilo:</td><td style="padding:10px 14px;font-weight:600">${velLabel ? esc(velLabel) : '<span style="color:#999;font-weight:400">— podesiti pri aktivaciji</span>'}</td></tr>
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Plan:</td><td style="padding:10px 14px;font-weight:600">${planLabel ? `<span style="color:#C0392B">${esc(planLabel)}</span>` : '<span style="color:#999;font-weight:400">— po dogovoru pri aktivaciji</span>'}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Izvor:</td><td style="padding:10px 14px;font-weight:600">${esc(sourceLabel)}</td></tr>
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Vreme:</td><td style="padding:10px 14px">${esc(when)}</td></tr>
      </table>
      <div style="margin-top:20px;padding:14px 18px;background:#fff3cd;border-left:2px solid #ffc107;font-size:12px;color:#555">
        ⚡ Aktivirajte nalog u admin panelu — <strong>📋 Loyalty Prijave</strong> → kliknite <strong>Aktiviraj</strong>.
      </div>
      <div style="text-align:center;margin-top:20px">
        <a href="https://www.lakerdetailing.rs/laker-admin-9x3k.html" style="display:inline-block;background:#C0392B;color:#fff;padding:12px 30px;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Otvori admin panel →</a>
      </div>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

async function brevoSend(payload) {
  const res = await fetch(BREVO_URL, {
    method:  'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
  return { ok: res.ok, status: res.status };
}

// ── MAIN HANDLER ─────────────────────────────────────────
module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Javni config za stranicu — koja dugmad su dostupna
  if (req.method === 'GET') {
    return res.status(200).json({
      google_client_id: GOOGLE_CLIENT_ID || null,
      apple_service_id: APPLE_SERVICE_ID || null
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const sourceIp  = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '');

  try {
    let data = req.body;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
    if (!data || typeof data !== 'object') data = {};

    // Anti-bot honeypot — tiho prihvatamo, ništa ne upisujemo
    if (String(data.website || '').trim()) {
      return res.status(200).json({ success: true });
    }

    const mode = cleanText(data.mode, 10).toLowerCase();
    if (!SOURCES[mode]) return res.status(400).json({ error: 'Neispravan zahtev.' });

    // Rate limit po IP — max 5 prijava / 10 min
    let rateCheck = { allowed: true };
    try {
      rateCheck = await checkPersistentRateLimit({ scope: 'loyalty-join', key: sourceIp, max: 5, windowMs: 10 * 60 * 1000 });
    } catch (rateErr) {
      console.warn('Rate limit check failed, allowing request:', rateErr.message);
    }
    if (!rateCheck.allowed) {
      await auditSecurityEvent({ scope: 'loyalty-join', action: 'rate_limit_block', status: 'blocked', ip: sourceIp, user_agent: userAgent, subject: mode });
      return res.status(429).json({ error: 'Previše zahteva. Pokušajte ponovo za nekoliko minuta.' });
    }

    // ── Izvuci identitet po modu ──
    let name = '', email = '', telefon = '', carSize = '';

    // Plan pretplate (opciono za sve modove — sprema se kad je prislan)
    const planType  = cleanText(data.plan_type, 10).toLowerCase();
    const planLabel = planType === 'god' ? 'Godišnji' : (planType === 'mes' ? 'Mesečni' : '');

    if (mode === 'manual') {
      name    = cleanText(data.name, 80);
      email   = cleanEmail(data.email);
      telefon = cleanPhone(data.phone);
      carSize = data.car_size === 'vs' ? 'vs' : (data.car_size === 'ms' ? 'ms' : '');
      if (!name || name.length < 2)  return res.status(400).json({ error: 'Unesite ime i prezime.' });
      if (!isValidEmail(email))      return res.status(400).json({ error: 'Unesite ispravnu email adresu.' });
      if (!isValidPhone(telefon))    return res.status(400).json({ error: 'Unesite ispravan broj telefona (npr. 060 123 4567).' });
    } else if (mode === 'google') {
      const v = await verifyGoogleCredential(data.credential);
      if (!v.ok) {
        await auditSecurityEvent({ scope: 'loyalty-join', action: 'google_verify_failed', status: 'error', ip: sourceIp, user_agent: userAgent, subject: 'google' });
        return res.status(401).json({ error: v.error });
      }
      name = v.name; email = v.email;
      // Telefon je opcioni dodatni podatak uz Google prijavu
      const extraPhone = cleanPhone(data.phone);
      if (extraPhone && isValidPhone(extraPhone)) telefon = extraPhone;
    } else if (mode === 'apple') {
      const v = await verifyAppleIdToken(data.id_token);
      if (!v.ok) {
        await auditSecurityEvent({ scope: 'loyalty-join', action: 'apple_verify_failed', status: 'error', ip: sourceIp, user_agent: userAgent, subject: 'apple' });
        return res.status(401).json({ error: v.error });
      }
      email = v.email;
      // Apple šalje ime SAMO pri prvoj prijavi i to client-side — čuvamo ga odmah
      name = cleanText(data.name, 80) || email.split('@')[0];
    }

    const source      = SOURCES[mode];
    const sourceLabel = SOURCE_LABELS[source];
    const velLabel    = carSize === 'vs' ? 'Veliki / SUV' : (carSize === 'ms' ? 'Mali / Srednji' : '');
    // Ažuriraj carSize iz Google/Apple moda ako je klijent poslao
    if (!carSize && data.car_size) {
      const cs = cleanText(data.car_size, 5).toLowerCase();
      if (cs === 'vs' || cs === 'ms') carSize = cs;
    }

    // ── Duplikati ──
    const emailFilter = encodeURIComponent(email);
    const [pendingRows, memberRows] = await Promise.all([
      supabaseSelect(`/rest/v1/contacts?email=eq.${emailFilter}&submission_type=eq.loyalty_registration&loyalty_added=eq.false&select=id&limit=1`),
      supabaseSelect(`/rest/v1/loyalty_customers?email=eq.${emailFilter}&select=id&limit=1`)
    ]);
    if (memberRows.length) {
      return res.status(200).json({ success: true, already_member: true, message: 'Već ste Laker Loyalty član! Prijavite se na sajtu sa svojim nalogom.' });
    }
    if (pendingRows.length) {
      return res.status(200).json({ success: true, duplicate: true, message: 'Vaša prijava je već primljena i čeka aktivaciju. Uskoro ćete dobiti potvrdu.' });
    }

    // ── Upis u contacts (vidi se u admin panelu → Loyalty Prijave) ──
    const save = await supabaseInsert('/rest/v1/contacts', {
      submission_type: 'loyalty_registration',
      ime: name,
      email,
      telefon: telefon || null,
      velicina: velLabel || null,
      usluga: 'Laker Loyalty — QR'
        + (velLabel  ? ' · ' + velLabel  : '')
        + (planLabel ? ' · ' + planLabel : ''),
      datum: new Date().toISOString().split('T')[0],
      napomena: `QR prijava — ${sourceLabel}`
        + (planLabel ? ` · Plan: ${planLabel}` : '')
        + (velLabel  ? ` · Vozilo: ${velLabel}` : ''),
      source,
      source_ip: sourceIp
    });
    if (!save.ok) {
      console.error('loyalty-join contacts insert failed:', save.status);
      await auditSecurityEvent({ scope: 'loyalty-join', action: 'db_insert_failed', status: 'error', ip: sourceIp, user_agent: userAgent, subject: mode, details: { status: save.status } });
      return res.status(500).json({ error: 'Greška pri čuvanju prijave. Pokušajte ponovo ili nas pozovite: 060 726 0302.' });
    }

    // ── Emailovi (ne ruše prijavu ako Brevo zakaže) ──
    const results = [{ to: 'contacts_db', ok: true }];
    if (BREVO_API_KEY) {
      const when = new Date().toLocaleString('sr-RS', { timeZone: 'Europe/Belgrade' });
      try {
        const rAdmin = await brevoSend({
          sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
          to:          [{ email: ADMIN_EMAIL, name: 'Laker Admin' }],
          replyTo:     { email, name },
          subject:     `📱 Nova QR Loyalty prijava: ${name}`,
          htmlContent: qrAdminHtml({ name, email, telefon, velLabel, planLabel, sourceLabel, when })
        });
        results.push({ to: 'admin', ok: rAdmin.ok });
      } catch (e) { results.push({ to: 'admin', ok: false }); }
      try {
        const rClient = await brevoSend({
          sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
          to:          [{ email, name }],
          replyTo:     { email: ADMIN_EMAIL },
          subject:     `✓ Zahtev primljen — Laker Loyalty`,
          htmlContent: qrClientHtml({ name })
        });
        results.push({ to: 'client', ok: rClient.ok });
      } catch (e) { results.push({ to: 'client', ok: false }); }
    }

    await auditSecurityEvent({ scope: 'loyalty-join', action: 'submission_completed', status: 'ok', ip: sourceIp, user_agent: userAgent, subject: source, details: { results } });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('loyalty-join error:', err);
    await auditSecurityEvent({ scope: 'loyalty-join', action: 'submission_error', status: 'error', ip: sourceIp, user_agent: userAgent, subject: '', details: { error: String(err.message || err) } });
    return res.status(500).json({ error: 'Interna greška servera. Pokušajte ponovo.' });
  }
};
