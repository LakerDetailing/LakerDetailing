const { supabaseFetch } = require('./_push');

const ALLOWED_ORIGINS = new Set([
  'https://lakerdetailing.rs',
  'https://www.lakerdetailing.rs',
  'http://127.0.0.1:4173',
  'http://localhost:4173'
]);

function getClientIp(req) {
  const headers = req?.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || '';
  const realIp = headers['x-real-ip'] || headers['X-Real-Ip'] || '';
  const clientIp = headers['client-ip'] || headers['Client-Ip'] || '';
  return String(forwarded || realIp || clientIp || 'unknown')
    .split(',')[0]
    .trim()
    .slice(0, 64) || 'unknown';
}

function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
}

function setCorsHeaders(req, res, methods) {
  const origin = String(req?.headers?.origin || '');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods || 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

function encodeQueryValue(value) {
  return encodeURIComponent(String(value || ''));
}

async function readRateLimit(scope, key) {
  const res = await supabaseFetch(
    `/rest/v1/security_rate_limits?scope=eq.${encodeQueryValue(scope)}&key=eq.${encodeQueryValue(key)}&select=scope,key,hits,window_started_at,blocked_until,last_seen_at&limit=1`,
    { method: 'GET' }
  );
  if (!res.ok) return null;
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function writeRateLimit(scope, key, payload) {
  const body = [{
    scope,
    key,
    hits: payload.hits,
    window_started_at: payload.window_started_at,
    blocked_until: payload.blocked_until || null,
    last_seen_at: payload.last_seen_at,
    updated_at: payload.last_seen_at
  }];
  const res = await supabaseFetch(
    `/rest/v1/security_rate_limits?on_conflict=scope,key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(body)
    }
  );
  return res.ok;
}

// Read-only check — ne inkrementira brojač, samo proverava da li je IP blokiran
async function isBlockedByPersistentRateLimit({ scope, key }) {
  const row = await readRateLimit(scope, key);
  if (!row) return false;
  const blockedUntil = row.blocked_until ? new Date(row.blocked_until) : null;
  return !!(blockedUntil && blockedUntil.getTime() > Date.now());
}

// Reset brojača — poziva se posle uspešnog logina
async function clearPersistentRateLimit({ scope, key }) {
  try {
    const nowIso = new Date().toISOString();
    await writeRateLimit(scope, key, {
      hits: 0,
      window_started_at: nowIso,
      blocked_until: null,
      last_seen_at: nowIso
    });
  } catch (e) { /* non-fatal */ }
}

async function checkPersistentRateLimit({ scope, key, max = 5, windowMs = 10 * 60 * 1000 }) {
  const now = new Date();
  const nowIso = now.toISOString();
  const row = await readRateLimit(scope, key);

  if (!row) {
    const created = await writeRateLimit(scope, key, {
      hits: 1,
      window_started_at: nowIso,
      last_seen_at: nowIso
    });
    return { allowed: true, stored: created, hits: 1, remaining: Math.max(0, max - 1) };
  }

  const windowStarted = row.window_started_at ? new Date(row.window_started_at) : now;
  const blockedUntil = row.blocked_until ? new Date(row.blocked_until) : null;
  if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
    return {
      allowed: false,
      blocked: true,
      blocked_until: row.blocked_until,
      retry_after_ms: blockedUntil.getTime() - now.getTime(),
      hits: row.hits || max
    };
  }

  const windowExpired = now.getTime() - windowStarted.getTime() >= windowMs;
  const nextHits = windowExpired ? 1 : ((Number(row.hits) || 0) + 1);
  const shouldBlock = !windowExpired && nextHits > max;
  const blockedUntilIso = shouldBlock ? new Date(now.getTime() + windowMs).toISOString() : null;

  const saved = await writeRateLimit(scope, key, {
    hits: nextHits,
    window_started_at: windowExpired ? nowIso : (row.window_started_at || nowIso),
    blocked_until: blockedUntilIso,
    last_seen_at: nowIso
  });

  return {
    allowed: !shouldBlock,
    blocked: shouldBlock,
    stored: saved,
    hits: nextHits,
    remaining: shouldBlock ? 0 : Math.max(0, max - nextHits),
    retry_after_ms: shouldBlock ? windowMs : 0,
    blocked_until: blockedUntilIso
  };
}

async function auditSecurityEvent(entry) {
  try {
    const res = await supabaseFetch('/rest/v1/security_audit_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify([{
        scope: String(entry.scope || 'general'),
        action: String(entry.action || 'event'),
        status: String(entry.status || 'ok'),
        ip: String(entry.ip || 'unknown'),
        user_agent: String(entry.user_agent || ''),
        subject: String(entry.subject || ''),
        details: entry.details && typeof entry.details === 'object' ? entry.details : {},
        created_at: new Date().toISOString()
      }])
    });
    return !!res.ok;
  } catch (e) {
    return false;
  }
}

module.exports = {
  ALLOWED_ORIGINS,
  getClientIp,
  setSecurityHeaders,
  setCorsHeaders,
  checkPersistentRateLimit,
  isBlockedByPersistentRateLimit,
  clearPersistentRateLimit,
  auditSecurityEvent
};
