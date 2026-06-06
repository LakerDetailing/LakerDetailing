// ══════════════════════════════════════════════════════════
//  LAKER DETAILING STUDIO — Admin API (server-side)
//  Vercel serverless function
//  Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_PASSWORD
// ══════════════════════════════════════════════════════════

const crypto = require('node:crypto');
const { getClientIp, checkPersistentRateLimit, isBlockedByPersistentRateLimit, clearPersistentRateLimit, auditSecurityEvent } = require('./_security');
const ALLOWED_ORIGINS = new Set([
  'https://lakerdetailing.rs',
  'https://www.lakerdetailing.rs',
  'http://127.0.0.1:4173',
  'http://localhost:4173'
]);

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

const SB_URL   = getEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL');
const SB_SVC   = getEnv('SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE');
const ADMIN_PW = getEnv('ADMIN_PASSWORD', 'ADMIN_PW', 'VERCEL_ADMIN_PASSWORD');
// ── Supabase REST helper (service role) ──────────────────
async function sb(path, opts = {}) {
  const res = await fetch(SB_URL + path, {
    method:  opts.method || 'GET',
    headers: {
      'apikey':        SB_SVC,
      'Authorization': 'Bearer ' + SB_SVC,
      'Content-Type':  'application/json',
      'Prefer':        opts.prefer || ''
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (opts.raw) return { ok: res.ok, status: res.status };
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Supabase error ${res.status}`);
  }
  if (res.status === 204 || res.status === 201) return { ok: true };
  try { return await res.json(); } catch { return null; }
}

// ── Auth user delete ──────────────────────────────────────
async function deleteAuthUser(authUserId) {
  const res = await fetch(`${SB_URL}/auth/v1/admin/users/${authUserId}`, {
    method:  'DELETE',
    headers: { 'apikey': SB_SVC, 'Authorization': 'Bearer ' + SB_SVC }
  });
  return { ok: res.ok };
}

function stripMaintenanceMeta(note) {
  return String(note || '')
    .replace(/\s*\[maintenance_streak:[0-5]\]\s*/g, '\n')
    .replace(/\s*DOB:\d{4}-\d{2}-\d{2}/gi, '')
    .trim();
}

function cleanText(value, maxLen = 160) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function cleanEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

function cleanPhone(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function parsePlanValue(plan) {
  const p = cleanText(plan || '', 20).toLowerCase();
  const planType = p.includes('god') ? 'god' : (p.includes('mes') ? 'mes' : null);
  const carSize  = p.includes('_vs') || p.includes('vs') ? 'vs' : 'ms';
  return planType ? { planType, carSize, carePlan: p } : null;
}

// ── Route map ─────────────────────────────────────────────
const ACTIONS = {

  // REVIEWS
  async get_reviews() {
    const [pend, appr, all] = await Promise.all([
      sb('/rest/v1/testimonials?approved=eq.false&order=created_at.desc'),
      sb('/rest/v1/testimonials?approved=eq.true&order=created_at.desc'),
      sb('/rest/v1/testimonials?select=rating')
    ]);
    return { pending: pend || [], approved: appr || [], all: all || [] };
  },

  async approve_review({ id }) {
    return await sb(`/rest/v1/testimonials?id=eq.${id}`, {
      method: 'PATCH', prefer: 'return=minimal', body: { approved: true }
    });
  },

  async delete_review({ id }) {
    return await sb(`/rest/v1/testimonials?id=eq.${id}`, { method: 'DELETE' });
  },

  // LOYALTY — REQUESTS
  async get_loyalty() {
    const [reqs, custs] = await Promise.all([
      sb('/rest/v1/loyalty_wash_requests?order=created_at.desc'),
      sb('/rest/v1/loyalty_customers?order=created_at.desc&select=*')
    ]);
    return { requests: reqs || [], customers: custs || [] };
  },

  async get_loyalty_customers() {
    const custs = await sb('/rest/v1/loyalty_customers?order=created_at.desc&select=*');
    return Array.isArray(custs) ? custs : [];
  },

  async approve_wash_req({ reqId, custId }) {
    const cData = await sb(`/rest/v1/loyalty_customers?id=eq.${custId}&select=wash_count`);
    const c = Array.isArray(cData) ? cData[0] : null;
    if (!c) return { error: 'Korisnik nije pronađen' };
    const newCount = (c.wash_count || 0) + 1;
    const today = new Date().toISOString().split('T')[0];
    await Promise.all([
      sb(`/rest/v1/loyalty_customers?id=eq.${custId}`, {
        method: 'PATCH', prefer: 'return=minimal', body: { wash_count: newCount }
      }),
      sb('/rest/v1/loyalty_washes', {
        method: 'POST', prefer: 'return=minimal',
        body: { customer_id: custId, note: 'Odobreno od admina', added_by: 'admin', service_date: today }
      }),
      sb(`/rest/v1/loyalty_wash_requests?id=eq.${reqId}`, {
        method: 'PATCH', prefer: 'return=minimal', body: { status: 'approved' }
      })
    ]);
    return { ok: true, newCount };
  },

  async reject_wash_req({ reqId }) {
    return await sb(`/rest/v1/loyalty_wash_requests?id=eq.${reqId}`, {
      method: 'PATCH', prefer: 'return=minimal', body: { status: 'rejected' }
    });
  },

  // LOYALTY — CUSTOMERS
  async add_wash({ custId, custName, note, serviceDate }) {
    const cData = await sb(`/rest/v1/loyalty_customers?id=eq.${custId}&select=wash_count`);
    const c = Array.isArray(cData) ? cData[0] : null;
    if (!c) return { error: 'Korisnik nije pronađen' };
    const newCount  = (c.wash_count || 0) + 1;
    const svcDate   = serviceDate || new Date().toISOString().split('T')[0];
    await Promise.all([
      sb(`/rest/v1/loyalty_customers?id=eq.${custId}`, {
        method: 'PATCH', prefer: 'return=minimal', body: { wash_count: newCount }
      }),
      sb('/rest/v1/loyalty_washes', {
        method: 'POST', prefer: 'return=minimal',
        body: { customer_id: custId, note: note || 'Admin — ručno dodato', added_by: 'admin', service_date: svcDate }
      })
    ]);
    return { ok: true, newCount };
  },

  async remove_wash({ custId, currentCount }) {
    if (currentCount <= 0) return { error: 'Već je 0 pranja' };
    return await sb(`/rest/v1/loyalty_customers?id=eq.${custId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: { wash_count: currentCount - 1 }
    });
  },

  async save_note({ custId, note }) {
    const cleanNote = cleanText(note, 500) || null;
    return await sb(`/rest/v1/loyalty_customers?id=eq.${custId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: { admin_note: cleanNote }
    });
  },

  async update_care_plan({ custId, plan }) {
    if (!plan) {
      return await sb(`/rest/v1/loyalty_customers?id=eq.${custId}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: { plan_type: null, car_size: null, care_plan: null, care_plan_since: null }
      });
    }
    const parsed = parsePlanValue(plan);
    if (!parsed) return { error: 'Neispravan plan' };
    return await sb(`/rest/v1/loyalty_customers?id=eq.${custId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: {
        plan_type: parsed.planType,
        car_size:  parsed.carSize,
        care_plan: plan,
        care_plan_since: new Date().toISOString()
      }
    });
  },

  async get_wash_history({ custId }) {
    return await sb(`/rest/v1/loyalty_washes?customer_id=eq.${custId}&order=service_date.desc,created_at.desc&limit=50`);
  },

  async get_period_wash_counts() {
    const now = new Date();
    const yearStart  = now.getFullYear() + '-01-01';
    const monthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    const [yr, mo] = await Promise.all([
      sb(`/rest/v1/loyalty_washes?service_date=gte.${yearStart}&select=customer_id`),
      sb(`/rest/v1/loyalty_washes?service_date=gte.${monthStart}&select=customer_id`)
    ]);
    const yearCounts = {}, monthCounts = {};
    (yr || []).forEach(w => { yearCounts[w.customer_id]  = (yearCounts[w.customer_id]  || 0) + 1; });
    (mo || []).forEach(w => { monthCounts[w.customer_id] = (monthCounts[w.customer_id] || 0) + 1; });
    return { yearCounts, monthCounts };
  },

  async delete_customer({ custId, authUserId }) {
    await Promise.all([
      sb(`/rest/v1/loyalty_washes?customer_id=eq.${custId}`,        { method: 'DELETE' }),
      sb(`/rest/v1/loyalty_wash_requests?customer_id=eq.${custId}`, { method: 'DELETE' })
    ]);
    await sb(`/rest/v1/loyalty_customers?id=eq.${custId}`, { method: 'DELETE' });
    if (authUserId) await deleteAuthUser(authUserId);
    return { ok: true };
  },

  // CONTACTS
  async get_contacts() {
    return await sb('/rest/v1/contacts?order=created_at.desc');
  },

  async add_contact_to_loyalty({ ctId, name, phone, email, plan, note }) {
    const cleanName       = cleanText(name, 80);
    const cleanEmailValue = cleanEmail(email);
    const cleanPhoneValue = cleanPhone(phone);
    const parsed          = parsePlanValue(plan);
    if (!cleanEmailValue && !cleanPhoneValue) {
      return { error: 'Email ili telefon su obavezni' };
    }
    let existing = [];
    if (cleanEmailValue) {
      const byEmail = await sb(`/rest/v1/loyalty_customers?email=eq.${encodeURIComponent(cleanEmailValue)}&select=id`);
      if (Array.isArray(byEmail) && byEmail.length) existing = byEmail;
    }
    if (!existing.length && cleanPhoneValue) {
      const byPhone = await sb(`/rest/v1/loyalty_customers?phone=eq.${encodeURIComponent(cleanPhoneValue)}&select=id`);
      if (Array.isArray(byPhone) && byPhone.length) existing = byPhone;
    }
    let customerId = existing.length ? existing[0].id : null;
    if (!existing.length) {
      await sb('/rest/v1/loyalty_customers', {
        method: 'POST', prefer: 'return=minimal',
        body: {
          name:  cleanName || cleanEmailValue || cleanPhoneValue || 'Loyalty klijent',
          phone: cleanPhoneValue || null,
          email: cleanEmailValue || null,
          wash_count: 0,
          ...(parsed ? { plan_type: parsed.planType, car_size: parsed.carSize, care_plan: parsed.carePlan, care_plan_since: new Date().toISOString() } : {})
        }
      });
      const refetchPath = cleanEmailValue
        ? `/rest/v1/loyalty_customers?email=eq.${encodeURIComponent(cleanEmailValue)}&select=id`
        : `/rest/v1/loyalty_customers?phone=eq.${encodeURIComponent(cleanPhoneValue)}&select=id`;
      const created = await sb(refetchPath);
      customerId = Array.isArray(created) && created.length ? created[0].id : null;
    } else if (parsed) {
      await sb(`/rest/v1/loyalty_customers?id=eq.${existing[0].id}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: { plan_type: parsed.planType, car_size: parsed.carSize, care_plan: parsed.carePlan, care_plan_since: new Date().toISOString() }
      });
    }
    if (customerId) {
      const currentData = await sb(`/rest/v1/loyalty_customers?id=eq.${customerId}&select=name,phone,email`);
      const current = Array.isArray(currentData) ? currentData[0] : null;
      const patch = {};
      if (cleanName && (!current?.name || current.name === 'Loyalty klijent')) patch.name = cleanName;
      if (cleanPhoneValue && !current?.phone) patch.phone = cleanPhoneValue;
      if (cleanEmailValue && !current?.email) patch.email = cleanEmailValue;
      if (Object.keys(patch).length) {
        await sb(`/rest/v1/loyalty_customers?id=eq.${customerId}`, {
          method: 'PATCH', prefer: 'return=minimal', body: patch
        });
      }
    }
    return await sb(`/rest/v1/contacts?id=eq.${ctId}`, {
      method: 'PATCH', prefer: 'return=minimal', body: { loyalty_added: true }
    });
  },

  async delete_contact({ id }) {
    return await sb(`/rest/v1/contacts?id=eq.${id}`, { method: 'DELETE' });
  }
};

// ── MAIN HANDLER ─────────────────────────────────────────
// ── BRUTE FORCE ZAŠTITA ─────────────────────────────────────
const _loginAttempts = {};
const _LOCKOUT_MAX   = 5;
const _LOCKOUT_MS    = 5 * 60 * 1000;

function _isLockedOut(ip) {
  const e = _loginAttempts[ip];
  if (!e) return false;
  if (e.count >= _LOCKOUT_MAX) {
    if (Date.now() - e.first < _LOCKOUT_MS) return true;
    delete _loginAttempts[ip];
  }
  return false;
}
function _recordFail(ip) {
  if (!_loginAttempts[ip]) _loginAttempts[ip] = { count: 0, first: Date.now() };
  _loginAttempts[ip].count++;
}
function _clearFails(ip) { delete _loginAttempts[ip]; }

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res;
}

function setCorsHeaders(req, res) {
  const origin = String(req?.headers?.origin || '');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}
// ────────────────────────────────────────────────────────────


// ── VERCEL HANDLER (konvertovano sa Netlify) ─────────────
module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!SB_URL || !SB_SVC || !ADMIN_PW) {
    const missing = [];
    if (!SB_URL) missing.push('SUPABASE_URL');
    if (!SB_SVC) missing.push('SUPABASE_SERVICE_KEY');
    if (!ADMIN_PW) missing.push('ADMIN_PASSWORD');
    console.error('Missing env vars for /api/admin:', missing.join(', '));
    return res.status(500).json({
      error: 'Server nije konfigurisan',
      missing
    });
  }

  // Vercel auto-parsuje JSON body, ali ako nije, parsujemo ručno
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      try {
        const parsed = new URLSearchParams(body);
        const params = parsed.get('params');
        body = {
          password: parsed.get('password') || '',
          action: parsed.get('action') || '',
          params: params ? JSON.parse(params) : {}
        };
      } catch {
        return res.status(400).json({ error: 'Invalid body format' });
      }
    }
  }
  if (!body || typeof body !== 'object') body = {};
  const _ip = getClientIp(req);

  // ── Brute force check — proveravamo SAMO blokadu, ne inkrementiramo ──────
  // checkPersistentRateLimit bi inkrementirao brojač na svaki zahtev (i uspešan!),
  // što bi blokiralo admina posle 5 normalnih API poziva. Koristimo read-only check.
  const persistentBlocked = await isBlockedByPersistentRateLimit({ scope: 'admin-login', key: _ip });
  if (persistentBlocked) {
    await auditSecurityEvent({
      scope: 'admin-login',
      action: 'rate_limit_block',
      status: 'blocked',
      ip: _ip,
      user_agent: String(req.headers['user-agent'] || ''),
      subject: 'login',
      details: { reason: 'persistent_block' }
    });
    return res.status(429).json({ error: 'Previše neuspešnih pokušaja. Sačekajte 5 minuta.' });
  }

  if (_isLockedOut(_ip)) {
    return res.status(429).json({ error: 'Previše pokušaja. Sačekajte 5 minuta.' });
  }

  // ── Auth check ─────────────────────────────────────────
  const submittedPassword = String(body.password || '').trim();
  if (!submittedPassword || !safeEqual(submittedPassword, ADMIN_PW)) {
    _recordFail(_ip);
    // Brojimo SAMO neuspele loginove u persistentnom rate limitu
    await checkPersistentRateLimit({ scope: 'admin-login', key: _ip, max: 5, windowMs: _LOCKOUT_MS });
    await auditSecurityEvent({
      scope: 'admin-login',
      action: 'login_failed',
      status: 'blocked',
      ip: _ip,
      user_agent: String(req.headers['user-agent'] || ''),
      subject: 'password',
      details: { reason: 'invalid_password' }
    });
    return res.status(401).json({ error: 'Neispravna lozinka' });
  }
  // Uspešan login — resetujemo i in-memory i persistent brojač
  _clearFails(_ip);
  await clearPersistentRateLimit({ scope: 'admin-login', key: _ip });
  await auditSecurityEvent({
    scope: 'admin-login',
    action: 'login_success',
    status: 'ok',
    ip: _ip,
    user_agent: String(req.headers['user-agent'] || ''),
    subject: 'password'
  });

  // ── Route ──────────────────────────────────────────────
  const action = cleanText(body.action, 64).toLowerCase();
  const actionHandler = ACTIONS[action];
  if (!actionHandler) {
    return res.status(400).json({ error: 'Nepoznata akcija: ' + action });
  }

  try {
    const params = body.params && typeof body.params === 'object' && !Array.isArray(body.params)
      ? body.params : {};
    const result = await actionHandler(params);
    await auditSecurityEvent({
      scope: 'admin-action',
      action,
      status: 'ok',
      ip: _ip,
      user_agent: String(req.headers['user-agent'] || ''),
      subject: action,
      details: { params: Object.keys(params || {}) }
    });
    return res.status(200).json({ ok: true, data: result });
  } catch (err) {
    console.error('Admin API error:', body.action, err);
    await auditSecurityEvent({
      scope: 'admin-action',
      action,
      status: 'error',
      ip: _ip,
      user_agent: String(req.headers['user-agent'] || ''),
      subject: action,
      details: { error: String(err.message || err) }
    });
    return res.status(500).json({ error: 'Interna greška servera' });
  }
};
