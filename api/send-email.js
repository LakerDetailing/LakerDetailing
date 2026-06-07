// ══════════════════════════════════════════════════════════
//  LAKER DETAILING STUDIO — Brevo Email Function
//  Vercel serverless function
// ══════════════════════════════════════════════════════════

function getEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

const { getClientIp, setSecurityHeaders, setCorsHeaders, checkPersistentRateLimit, auditSecurityEvent } = require('./_security');

const BREVO_API_KEY = getEnv('BREVO_API_KEY', 'BREVO_APIKEY', 'BREVO_KEY');
const BREVO_URL     = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL  = 'noreply@lakerdetailing.rs';
const SENDER_NAME   = 'Laker Detailing Studio';
const ADMIN_EMAIL   = 'detailinglaker@gmail.com';
const SUPABASE_URL  = getEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL');
const SUPABASE_KEY  = getEnv('SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE');
const _rateLimits = {};
const _RATE_LIMIT_MAX = 5;
const _RATE_LIMIT_MS = 10 * 60 * 1000;

function isRateLimited(ip) {
  const current = _rateLimits[ip];
  if (!current) return false;
  if (Date.now() - current.first > _RATE_LIMIT_MS) {
    delete _rateLimits[ip];
    return false;
  }
  return current.count >= _RATE_LIMIT_MAX;
}

function recordRateLimit(ip) {
  if (!_rateLimits[ip]) _rateLimits[ip] = { count: 0, first: Date.now() };
  _rateLimits[ip].count++;
}

async function brevoSend(payload) {
  const res = await fetch(BREVO_URL, {
    method:  'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function supabaseWrite(path, body) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase servis nije konfigurisan');
  const res = await fetch(SUPABASE_URL + path, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ── ESC — zaštita od HTML injection u email templateovima ──
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function birthDateFromNote(note) {
  const m = String(note || '').match(/DOB:(\d{4}-\d{2}-\d{2})/i);
  return m ? m[1] : '';
}

function cleanMaintenanceNote(note) {
  return String(note || '')
    .replace(/\s*\|\s*DOB:\d{4}-\d{2}-\d{2}/i, '')
    .replace(/\s*DOB:\d{4}-\d{2}-\d{2}/i, '')
    .trim();
}

function cleanNumberString(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function cleanText(value, maxLen = 160) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function cleanParagraph(value, maxLen = 500) {
  return String(value || '')
    .trim()
    .slice(0, maxLen);
}

function cleanEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

function cleanPhone(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

function isValidPhone(value) {
  return /^(\+?381|0)(6[0-9])(\d{6,7})$/.test(String(value || '').trim().replace(/\s+/g, ''));
}

// ── HTML TEMPLATE HELPERS ────────────────────────────────
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

// ── EMAIL: BOOKING POTVRDA — KLIJENT ────────────────────
function bookingClientHtml({ ime, email, telefon, auto, velicina, usluga, datum, napomena }) {
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.1)">
    ${headerHtml()}
    <div style="padding:40px">
      <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:300;color:#0E0E0E;margin:0 0 6px;letter-spacing:-1px">Zahtev <em style="font-style:italic;color:#C0392B">primljen</em></h1>
      <p style="font-size:13px;color:#888;margin:0 0 28px">Hvala, ${esc(ime)}. Javićemo Vam se uskoro radi potvrde termina.</p>
      
      <div style="background:#f7f7f7;border-left:2px solid #C0392B;padding:22px 26px;margin-bottom:24px">
        <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:14px">Detalji zahteva</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:6px 0;color:#888;width:120px">Vozilo:</td><td style="padding:6px 0;color:#111;font-weight:500">${esc(auto)} (${esc(velicina)})</td></tr>
          <tr><td style="padding:6px 0;color:#888">Usluga:</td><td style="padding:6px 0;color:#111;font-weight:500">${esc(usluga)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Datum:</td><td style="padding:6px 0;color:#111;font-weight:500">${datum || 'Po dogovoru'}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Telefon:</td><td style="padding:6px 0;color:#111;font-weight:500">${esc(telefon)}</td></tr>
          ${cleanMaintenanceNote(napomena) ? `<tr><td style="padding:6px 0;color:#888;vertical-align:top">Napomena:</td><td style="padding:6px 0;color:#111">${esc(cleanMaintenanceNote(napomena))}</td></tr>` : ''}
        </table>
      </div>

      <p style="font-size:13px;color:#555;line-height:1.8;margin:0 0 24px">
        Za brži odgovor pišite nam na WhatsApp:<br>
        <a href="https://wa.me/381607260302" style="color:#C0392B;font-weight:600;text-decoration:none">060 726 0302</a>
      </p>

      <div style="text-align:center;margin-top:28px">
        <a href="https://www.lakerdetailing.rs" style="display:inline-block;background:#C0392B;color:#fff;padding:14px 36px;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Posetite sajt →</a>
      </div>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

// ── EMAIL: BOOKING NOTIFIKACIJA — ADMIN ─────────────────
function bookingAdminHtml({ ime, email, telefon, auto, velicina, usluga, datum, napomena }) {
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff">
    ${headerHtml()}
    <div style="padding:32px 40px">
      <div style="background:#C0392B;color:#fff;padding:8px 16px;display:inline-block;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px">NOVI ZAHTEV ZA TERMIN</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888;width:130px">Klijent:</td><td style="padding:10px 14px;color:#111;font-weight:600">${esc(ime)}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Email:</td><td style="padding:10px 14px"><a href="mailto:${esc(email)}" style="color:#C0392B">${esc(email)}</a></td></tr>
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Telefon:</td><td style="padding:10px 14px"><a href="tel:${esc(telefon)}" style="color:#C0392B">${esc(telefon)}</a></td></tr>
        <tr><td style="padding:10px 14px;color:#888">Vozilo:</td><td style="padding:10px 14px;font-weight:600">${esc(auto)} (${esc(velicina)})</td></tr>
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Usluga:</td><td style="padding:10px 14px;font-weight:600">${esc(usluga)}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Željeni datum:</td><td style="padding:10px 14px">${datum || 'Nije naveden'}</td></tr>
        ${cleanMaintenanceNote(napomena) ? `<tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888;vertical-align:top">Napomena:</td><td style="padding:10px 14px">${esc(cleanMaintenanceNote(napomena))}</td></tr>` : ''}
      </table>
      <div style="margin-top:20px;padding:14px 18px;background:#fff3cd;border-left:2px solid #ffc107;font-size:12px;color:#555">
        ⚡ Odgovorite klijentu što pre — pogledajte admin panel za upravljanje upitima.
      </div>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

// ── EMAIL: LOYALTY WELCOME (šalje se kad admin ODOBRI) ───
function loyaltyWelcomeHtml({ name, email, plan, velicina }) {
  const isGod = String(plan||'').includes('god');
  const isVS  = String(velicina||'').toLowerCase().match(/veliki|suv|vs/);
  const planLabel  = isGod ? 'Godišnji plan' : 'Mesečni plan';
  const velLabel   = isVS  ? 'Veliki / SUV'  : 'Mali / Srednji';
  const priceLabel = isVS
    ? (isGod ? '€349 / godišnje' : '€40 / mesečno')
    : (isGod ? '€299 / godišnje' : '€35 / mesečno');

  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.1)">
    ${headerHtml()}
    <div style="padding:40px">
      <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:12px">LAKER LOYALTY — ODOBRENO ✓</div>
      <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:300;color:#0E0E0E;margin:0 0 6px">Dobrodošli, <em style="font-style:italic;color:#C0392B">${esc(name)}</em>!</h1>
      <p style="font-size:13px;color:#888;margin:0 0 28px">Vaša Loyalty prijava je <strong style="color:#27AE60">odobrena</strong>. Članstvo je aktivno od danas.</p>

      <div style="background:#0E0E0E;padding:22px 26px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:4px">${esc(planLabel)}</div>
            <div style="font-family:Georgia,serif;font-size:26px;font-weight:300;color:#F2F0EC">${esc(priceLabel)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:4px">Vozilo</div>
            <div style="font-size:15px;color:#F2F0EC;font-weight:500">${esc(velLabel)}</div>
          </div>
        </div>
      </div>

      <div style="background:#f7f7f7;border-left:2px solid #C0392B;padding:20px 24px;margin-bottom:24px">
        <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:12px">Vaše membership uključuje</div>
        <p style="font-size:13px;color:#555;line-height:2.1;margin:0">
          ◆ <strong>24 premium pranja godišnje</strong> — 2 puta mesečno<br>
          ◆ <strong>Prioritetan termin</strong> — uvek na prvom mestu<br>
          ◆ Pregled istorije pranja i preostalog broja u vašem nalogu
        </p>
      </div>

      <div style="background:#FFF9F9;border:1px solid rgba(192,57,43,.15);padding:16px 20px;margin-bottom:28px">
        <div style="font-size:12px;color:#555;line-height:1.7">
          <strong style="color:#C0392B">Sledeći korak:</strong> Prijavite se na sajtu i zakažite prvi termin. Za brži odgovor — WhatsApp:
          <a href="https://wa.me/381607260302" style="color:#C0392B;font-weight:700;text-decoration:none"> 060 726 0302</a>
        </div>
      </div>

      <div style="text-align:center">
        <a href="https://www.lakerdetailing.rs/#loyalty" style="display:inline-block;background:#C0392B;color:#fff;padding:14px 36px;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Otvori moj nalog →</a>
      </div>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

// ── EMAIL: LOYALTY REGISTRACIJA — KLIJENT (čeka odobrenje) ─
function loyaltyRegistrationClientHtml({ name, planLabel, velLabel, priceLabel }) {
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.1)">
    ${headerHtml()}
    <div style="padding:40px">
      <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:12px">LAKER LOYALTY MEMBERSHIP</div>
      <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:300;color:#0E0E0E;margin:0 0 6px">Prijava <em style="font-style:italic;color:#C0392B">primljena</em>, ${esc(name)}!</h1>
      <p style="font-size:13px;color:#888;margin:0 0 28px">Hvala na registraciji za Laker Loyalty. Pregledaćemo vašu prijavu i javiti se u najkraćem roku.</p>

      <div style="background:#0E0E0E;padding:22px 26px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:4px">Odabrani plan</div>
            <div style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#F2F0EC">${esc(planLabel)}</div>
            <div style="font-size:14px;color:#888;margin-top:4px">${esc(priceLabel)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:4px">Vozilo</div>
            <div style="font-size:15px;color:#F2F0EC;font-weight:500">${esc(velLabel)}</div>
          </div>
        </div>
      </div>

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
          <strong style="color:#C0392B">Sledeći korak:</strong> Pregledaćemo vašu prijavu i kontaktirati vas radi potvrde i dogovaranja prvog termina.<br>
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

// ── EMAIL: LOYALTY REGISTRACIJA — ADMIN NOTIFIKACIJA ─────
function loyaltyRegistrationAdminHtml({ name, email, telefon, planLabel, velLabel, priceLabel }) {
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff">
    ${headerHtml()}
    <div style="padding:32px 40px">
      <div style="background:#C0392B;color:#fff;padding:8px 16px;display:inline-block;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px">🏅 NOVA LOYALTY REGISTRACIJA</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888;width:130px">Klijent:</td><td style="padding:10px 14px;color:#111;font-weight:600">${esc(name)}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Email:</td><td style="padding:10px 14px"><a href="mailto:${esc(email)}" style="color:#C0392B">${esc(email)}</a></td></tr>
        ${telefon ? `<tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Telefon:</td><td style="padding:10px 14px"><a href="tel:${esc(telefon)}" style="color:#C0392B">${esc(telefon)}</a></td></tr>` : ''}
        <tr${telefon ? '' : ' style="background:#f7f7f7"'}><td style="padding:10px 14px;color:#888">Plan:</td><td style="padding:10px 14px;font-weight:600">${esc(planLabel)} · ${esc(priceLabel)}</td></tr>
        <tr style="${telefon ? 'background:#f7f7f7' : ''}"><td style="padding:10px 14px;color:#888">Vozilo:</td><td style="padding:10px 14px;font-weight:600">${esc(velLabel)}</td></tr>
      </table>
      <div style="margin-top:20px;padding:14px 18px;background:#fff3cd;border-left:2px solid #ffc107;font-size:12px;color:#555">
        ⚡ Odobrite prijavu u admin panelu — <strong>📋 Loyalty Prijave</strong> → kliknite <strong>Aktiviraj</strong>.
      </div>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

// ── EMAIL: NOVA RECENZIJA — ADMIN NOTIFIKACIJA ────────────
function testimonialAdminHtml({ name, car, city, text, rating }) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff">
    ${headerHtml()}
    <div style="padding:32px 40px">
      <div style="background:#C0392B;color:#fff;padding:8px 16px;display:inline-block;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px">⭐ NOVA RECENZIJA — ČEKA ODOBRENJE</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888;width:130px">Ime:</td><td style="padding:10px 14px;color:#111;font-weight:600">${esc(name)}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Ocena:</td><td style="padding:10px 14px;font-size:18px;color:#F2C200;letter-spacing:2px">${stars}</td></tr>
        ${car  ? `<tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Vozilo:</td><td style="padding:10px 14px">${esc(car)}</td></tr>`  : ''}
        ${city ? `<tr${car ? '' : ' style="background:#f7f7f7"'}><td style="padding:10px 14px;color:#888">Grad:</td><td style="padding:10px 14px">${esc(city)}</td></tr>` : ''}
      </table>
      <div style="margin-top:16px;background:#f7f7f7;border-left:2px solid #C0392B;padding:16px 20px">
        <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:8px">Tekst recenzije</div>
        <p style="font-size:14px;color:#222;font-style:italic;line-height:1.7;margin:0">„${esc(text)}"</p>
      </div>
      <div style="margin-top:20px;padding:14px 18px;background:#fff3cd;border-left:2px solid #ffc107;font-size:12px;color:#555">
        ⚡ Idite u admin panel → <strong>⭐ Recenzije</strong> i odobrite ili odbacite ovu recenziju.
      </div>
      <div style="text-align:center;margin-top:20px">
        <a href="https://www.lakerdetailing.rs/laker-admin-9x3k.html" style="display:inline-block;background:#C0392B;color:#fff;padding:12px 30px;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Otvori admin panel →</a>
      </div>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

// ── EMAIL: LOYALTY PRIJAVA — KLIJENT ──────────────────────
function maintenanceClientHtml({ name, email, telefon, auto, velicina, usluga, napomena }) {
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff">
    ${headerHtml()}
    <div style="padding:40px">
      <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:12px">LAKER LOYALTY MEMBERSHIP</div>
      <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:300;color:#0E0E0E;margin:0 0 6px">Prijava <em style="font-style:italic;color:#C0392B">primljena</em>, ${esc(name)}!</h1>
      <p style="font-size:13px;color:#888;margin:0 0 28px">Hvala na interesovanju za Laker Loyalty. Javljamo se uskoro radi potvrde i aktivacije.</p>

      <div style="background:#f7f7f7;border-left:2px solid #C0392B;padding:22px 26px;margin-bottom:24px">
        <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:14px">Detalji prijave</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${auto ? `<tr><td style="padding:6px 0;color:#888;width:120px">Vozilo:</td><td style="padding:6px 0;color:#111;font-weight:500">${esc(auto)}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#888">Veličina:</td><td style="padding:6px 0;color:#111;font-weight:500">${esc(velicina)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Plan:</td><td style="padding:6px 0;color:#111;font-weight:500">${esc(usluga)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Telefon:</td><td style="padding:6px 0;color:#111;font-weight:500">${esc(telefon)}</td></tr>
          ${cleanMaintenanceNote(napomena) ? `<tr><td style="padding:6px 0;color:#888;vertical-align:top">Napomena:</td><td style="padding:6px 0;color:#111">${esc(cleanMaintenanceNote(napomena))}</td></tr>` : ''}
        </table>
      </div>

      <div style="background:#0E0E0E;padding:18px 22px;margin-bottom:24px">
        <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C0392B;margin-bottom:10px">Vaše članstvo uključuje</div>
        <div style="font-size:13px;color:#F2F0EC;line-height:2.0">
          ◆ 2 premium usluge mesečno<br>
          ◆ Prioritetan termin — uvek na prvom mestu
        </div>
      </div>

      <p style="font-size:13px;color:#555;line-height:1.8;margin:0 0 24px">
        Za brži odgovor pišite nam na WhatsApp:<br>
        <a href="https://wa.me/381607260302" style="color:#C0392B;font-weight:600;text-decoration:none">060 726 0302</a>
      </p>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

// ── EMAIL: LOYALTY PRIJAVA — ADMIN ────────────────────────
function maintenanceAdminHtml({ name, email, telefon, auto, velicina, usluga, napomena }) {
  return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:20px;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#fff">
    ${headerHtml()}
    <div style="padding:32px 40px">
      <div style="background:#C0392B;color:#fff;padding:8px 16px;display:inline-block;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px">NOVA LOYALTY PRIJAVA</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888;width:130px">Klijent:</td><td style="padding:10px 14px;color:#111;font-weight:600">${esc(name)}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Email:</td><td style="padding:10px 14px"><a href="mailto:${esc(email)}" style="color:#C0392B">${esc(email)}</a></td></tr>
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Telefon:</td><td style="padding:10px 14px"><a href="tel:${esc(telefon)}" style="color:#C0392B">${esc(telefon)}</a></td></tr>
        ${auto ? `<tr><td style="padding:10px 14px;color:#888">Vozilo:</td><td style="padding:10px 14px;font-weight:600">${esc(auto)}</td></tr>` : ''}
        <tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888">Veličina:</td><td style="padding:10px 14px;font-weight:600">${esc(velicina)}</td></tr>
        <tr><td style="padding:10px 14px;color:#888">Plan:</td><td style="padding:10px 14px;font-weight:600">${esc(usluga)}</td></tr>
        ${cleanMaintenanceNote(napomena) ? `<tr style="background:#f7f7f7"><td style="padding:10px 14px;color:#888;vertical-align:top">Napomena:</td><td style="padding:10px 14px">${esc(cleanMaintenanceNote(napomena))}</td></tr>` : ''}
      </table>
      <div style="margin-top:20px;padding:14px 18px;background:#fff3cd;border-left:2px solid #ffc107;font-size:12px;color:#555">
        ⚡ Novi Loyalty član — potvrdite plan i aktivirajte termin u admin panelu.
      </div>
    </div>
    ${footerHtml()}
  </div>
  </body></html>`;
}

// ── MAIN HANDLER (Vercel format) ─────────────────────────
module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Email servis nije konfigurisan' });
  }

  try {
    // Vercel auto-parsuje JSON body, ali ako nije, parsujemo rucno
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { data = {}; }
    }
    if (!data || typeof data !== 'object') data = {};

    const type = cleanText(data.type, 32).toLowerCase();

    // Anti-bot: server-side honeypot check
    const honeypot = String(data.website || '').trim();
    if (honeypot) {
      // Bot popunio skriveno polje — tiho odbacujemo, ne otkrivamo da smo detektovali
      return res.status(200).json({ success: true, results: [] });
    }

    const results = [];
    const sourceIp = getClientIp(req);
    let rateCheck = { allowed: true };
    try {
      rateCheck = await checkPersistentRateLimit({ scope: 'send-email', key: sourceIp, max: 5, windowMs: 10 * 60 * 1000 });
    } catch (rateErr) {
      console.warn('Rate limit check failed, allowing request:', rateErr.message);
    }
    if (!rateCheck.allowed) {
      await auditSecurityEvent({
        scope: 'send-email',
        action: 'rate_limit_block',
        status: 'blocked',
        ip: sourceIp,
        user_agent: String(req.headers['user-agent'] || ''),
        subject: type,
        details: { rateCheck }
      });
      return res.status(429).json({ error: 'Previše zahteva. Pokušajte kasnije.' });
    }
    await auditSecurityEvent({
      scope: 'send-email',
      action: 'submission_received',
      status: 'ok',
      ip: sourceIp,
      user_agent: String(req.headers['user-agent'] || ''),
      subject: type
    });

    if (isRateLimited(sourceIp)) {
      return res.status(429).json({ error: 'Previše zahteva. Pokušajte kasnije.' });
    }
    recordRateLimit(sourceIp);

    if (type === 'booking') {
      const ime = cleanText(data.ime, 80);
      const email = cleanEmail(data.email);
      const telefon = cleanPhone(data.telefon);
      const auto = cleanText(data.auto, 120);
      const velicina = cleanText(data.velicina, 80);
      const usluga = cleanText(data.usluga, 120);
      const datum = cleanText(data.datum, 40);
      const napomena = cleanParagraph(data.napomena, 500);

      if (!ime || !isValidEmail(email) || !isValidPhone(telefon) || !auto || !velicina || !usluga) {
        return res.status(400).json({ error: 'Nedostaju ili nisu ispravna obavezna polja za booking' });
      }

      const r1 = await brevoSend({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email, name: ime }],
        replyTo:     { email: ADMIN_EMAIL },
        subject:     `✅ Zahtev primljen — Laker Detailing Studio`,
        htmlContent: bookingClientHtml({ ime, email, telefon, auto, velicina, usluga, datum, napomena })
      });
      results.push({ to: 'client', ok: r1.ok });

      const r2 = await brevoSend({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email: ADMIN_EMAIL, name: 'Laker Admin' }],
        replyTo:     { email, name: ime },
        subject:     `🚗 Novi zahtev: ${esc(ime)} — ${esc(usluga)}`,
        htmlContent: bookingAdminHtml({ ime, email, telefon, auto, velicina, usluga, datum, napomena })
      });
      results.push({ to: 'admin', ok: r2.ok });
      try {
        const save = await supabaseWrite('/rest/v1/contacts', {
          submission_type: 'booking',
          ime,
          email,
          telefon,
          auto,
          velicina,
          usluga,
          datum,
          napomena: cleanParagraph(napomena, 500),
          source_ip: sourceIp
        });
        results.push({ to: 'contacts_db', ok: save.ok });
      } catch (err) {
        results.push({ to: 'contacts_db', ok: false, error: err.message });
      }
    } else if (type === 'loyalty_welcome') {
      const name     = cleanText(data.name, 80);
      const email    = cleanEmail(data.email);
      const plan     = cleanText(data.plan     || '', 20);
      const velicina = cleanText(data.velicina || '', 40);
      if (!name || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Nedostaju ili nisu ispravna obavezna polja za loyalty email' });
      }
      const r = await brevoSend({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email, name }],
        subject:     `✅ Loyalty prijava odobrena — Laker Detailing Studio`,
        htmlContent: loyaltyWelcomeHtml({ name, email, plan, velicina })
      });
      results.push({ to: 'member', ok: r.ok });

    } else if (type === 'loyalty_registration') {
      const ime      = cleanText(data.ime || data.name, 80);
      const email    = cleanEmail(data.email);
      const telefon  = cleanPhone(data.telefon || '');
      const planType = cleanText(data.plan_type || '', 10);
      const carSize  = cleanText(data.car_size  || '', 10);

      if (!ime || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Nedostaju podaci za loyalty registraciju' });
      }

      const isGod      = planType === 'god';
      const isVS       = carSize === 'vs';
      const planLabel  = isGod ? 'Godišnji plan' : 'Mesečni plan';
      const velLabel   = isVS  ? 'Veliki / SUV'  : 'Mali / Srednji';
      const priceLabel = isVS
        ? (isGod ? '€349 / godišnje' : '€40 / mesečno')
        : (isGod ? '€299 / godišnje' : '€35 / mesečno');
      const uslugarStr = `Laker Loyalty Prijava — ${planLabel} · ${priceLabel}`;

      const r1 = await brevoSend({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email, name: ime }],
        replyTo:     { email: ADMIN_EMAIL },
        subject:     `📋 Loyalty prijava primljena — Laker Detailing Studio`,
        htmlContent: loyaltyRegistrationClientHtml({ name: ime, planLabel, velLabel, priceLabel })
      });
      results.push({ to: 'client', ok: r1.ok });

      const r2 = await brevoSend({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email: ADMIN_EMAIL, name: 'Laker Admin' }],
        replyTo:     { email, name: ime },
        subject:     `🏅 Nova Loyalty registracija: ${ime} — ${planLabel}`,
        htmlContent: loyaltyRegistrationAdminHtml({ name: ime, email, telefon, planLabel, velLabel, priceLabel })
      });
      results.push({ to: 'admin', ok: r2.ok });

      try {
        const save = await supabaseWrite('/rest/v1/contacts', {
          submission_type: 'loyalty_registration',
          ime,
          email,
          telefon: telefon || null,
          usluga:  uslugarStr,
          velicina: velLabel,
          datum:   new Date().toISOString().split('T')[0],
          napomena: `Loyalty registracija — ${planLabel} · ${velLabel}`,
          source_ip: sourceIp
        });
        results.push({ to: 'contacts_db', ok: save.ok });
      } catch (err) {
        results.push({ to: 'contacts_db', ok: false, error: err.message });
      }

    } else if (type === 'maintenance' || type === 'care' || type === 'loyalty') {
      const ime = cleanText(data.ime, 80);
      const email = cleanEmail(data.email);
      const telefon = cleanPhone(data.telefon);
      const auto = cleanText(data.auto, 120);
      const velicina = cleanText(data.velicina, 80);
      const usluga = cleanText(data.usluga, 120);
      const napomena = cleanParagraph(data.napomena, 500);

      if (!ime || !isValidEmail(email) || !isValidPhone(telefon) || !usluga) {
        return res.status(400).json({ error: 'Nedostaju ili nisu ispravna obavezna polja za Maintenance prijavu' });
      }
      const r1 = await brevoSend({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email, name: ime }],
        replyTo:     { email: ADMIN_EMAIL },
        subject:     `✅ Loyalty prijava primljena — Laker Detailing`,
        htmlContent: maintenanceClientHtml({ name: ime, email, telefon, auto, velicina, usluga, napomena })
      });
      results.push({ to: 'client', ok: r1.ok });

      const r2 = await brevoSend({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email: ADMIN_EMAIL, name: 'Laker Admin' }],
        replyTo:     { email, name: ime },
        subject:     `🏅 Nova Loyalty prijava: ${ime}`,
        htmlContent: maintenanceAdminHtml({ name: ime, email, telefon, auto, velicina, usluga, napomena })
      });
      results.push({ to: 'admin', ok: r2.ok });
      try {
        const save = await supabaseWrite('/rest/v1/contacts', {
          submission_type: 'maintenance',
          ime,
          email,
          telefon,
          auto,
          velicina,
          usluga: cleanText('Laker Maintenance — ' + usluga, 120),
          datum: new Date().toISOString().split('T')[0],
          napomena: cleanParagraph(`Maintenance membership prijava | ${napomena}`, 500),
          source_ip: sourceIp
        });
        results.push({ to: 'contacts_db', ok: save.ok });
      } catch (err) {
        results.push({ to: 'contacts_db', ok: false, error: err.message });
      }
    } else if (type === 'birthday') {
      // Birthday email je ukinut — Loyalty 2.0 ne koristi više birthday pogodnosti
      results.push({ to: 'member', ok: true, info: 'birthday_disabled' });
    } else if (type === 'testimonial') {
      const name   = cleanText(data.name, 80);
      const car    = cleanText(data.car, 80);
      const city   = cleanText(data.city, 80);
      const text   = cleanParagraph(data.text, 3000);
      const rating = Math.max(1, Math.min(5, parseInt(data.rating, 10) || 5));
      if (!name || !text) {
        return res.status(400).json({ error: 'Unesite ime i tekst recenzije.' });
      }
      try {
        // submission_type i source_ip su OBAVEZNI — trigger ih zahteva.
        // source_ip se šalje da rate-limit bude po korisniku (IP), a ne globalan.
        const payload = { name, text, rating, approved: false, submission_type: 'testimonial', source_ip: sourceIp };
        if (car)  payload.car  = car;
        if (city) payload.city = city;
        const save = await supabaseWrite('/rest/v1/testimonials', payload);
        if (!save.ok) {
          console.error('Testimonial save failed:', save.status, JSON.stringify(save.data));
          results.push({ to: 'testimonials_db', ok: false, status: save.status });
          // Prevedi poznate greške iz baze na razumljivu poruku
          const dbMsg = String(save.data?.message || save.data?.error || '');
          let userMsg = 'Greška pri čuvanju recenzije. Pokušajte ponovo.';
          if (/too short/i.test(dbMsg))          userMsg = 'Recenzija je prekratka — napišite bar 20 karaktera.';
          else if (/too many/i.test(dbMsg))      userMsg = 'Već ste poslali recenziju nedavno. Sačekajte nekoliko minuta pa pokušajte ponovo.';
          else if (/submission type/i.test(dbMsg)) userMsg = 'Tehnička greška pri slanju recenzije. Javite nam se direktno.';
          return res.status(200).json({ success: false, error: userMsg, results });
        }
        results.push({ to: 'testimonials_db', ok: true });
        // Pošalji admin notifikaciju za novu recenziju
        try {
          const rAdmin = await brevoSend({
            sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
            to:          [{ email: ADMIN_EMAIL, name: 'Laker Admin' }],
            subject:     `⭐ Nova recenzija čeka odobrenje — ${esc(name)} (${rating}/5)`,
            htmlContent: testimonialAdminHtml({ name, car, city, text, rating })
          });
          results.push({ to: 'admin_notify', ok: rAdmin.ok });
        } catch (emailErr) {
          results.push({ to: 'admin_notify', ok: false, error: emailErr.message });
        }
      } catch (err) {
        results.push({ to: 'testimonials_db', ok: false, error: err.message });
      }
    } else {
      return res.status(400).json({ error: 'Nepoznat tip emaila' });
    }

    await auditSecurityEvent({
      scope: 'send-email',
      action: 'submission_completed',
      status: 'ok',
      ip: sourceIp,
      user_agent: String(req.headers['user-agent'] || ''),
      subject: type,
      details: { results }
    });

    return res.status(200).json({ success: true, results });

  } catch (err) {
    console.error('send-email error:', err);
    await auditSecurityEvent({
      scope: 'send-email',
      action: 'submission_error',
      status: 'error',
      ip: getClientIp(req),
      user_agent: String(req.headers['user-agent'] || ''),
      subject: String(req.body?.type || ''),
      details: { error: String(err.message || err) }
    });
    return res.status(500).json({ error: 'Interna greška servera' });
  }
};
