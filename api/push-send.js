const crypto = require('node:crypto');
const { json, getEnv, supabaseFetch, sendWebPush, hasVapidPrivateKey } = require('./_push');
const { getClientIp, setSecurityHeaders, setCorsHeaders, checkPersistentRateLimit, auditSecurityEvent } = require('./_security');

function safeEqual(a, b) {
  const left  = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function clampStr(value, max) {
  return String(value || '').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  // Vercel auto-parsuje JSON body u req.body
  const _runHandler = async () => {
    try {
      let data = req.body;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
      if (!data || typeof data !== 'object') data = {};
      const adminPassword = String(data.adminPassword || '');
      const expectedPassword = getEnv('ADMIN_PASSWORD', 'ADMIN_PW', 'VERCEL_ADMIN_PASSWORD');
      const sourceIp = getClientIp(req);
      const rateCheck = await checkPersistentRateLimit({ scope: 'push-send', key: sourceIp, max: 8, windowMs: 15 * 60 * 1000 });
      if (!rateCheck.allowed) {
        await auditSecurityEvent({
          scope: 'push-send',
          action: 'rate_limit_block',
          status: 'blocked',
          ip: sourceIp,
          user_agent: String(req.headers['user-agent'] || ''),
          subject: 'broadcast',
          details: { rateCheck }
        });
        json(res, 429, { ok: false, error: 'Too many requests' });
        return;
      }
      if (!expectedPassword || !safeEqual(adminPassword, expectedPassword)) {
        await auditSecurityEvent({
          scope: 'push-send',
          action: 'auth_failed',
          status: 'blocked',
          ip: sourceIp,
          user_agent: String(req.headers['user-agent'] || ''),
          subject: 'adminPassword'
        });
        json(res, 401, { ok: false, error: 'Unauthorized' });
        return;
      }
      await auditSecurityEvent({
        scope: 'push-send',
        action: 'auth_success',
        status: 'ok',
        ip: sourceIp,
        user_agent: String(req.headers['user-agent'] || ''),
        subject: 'adminPassword'
      });

      const title     = clampStr(data.title   || 'Laker Detailing', 100);
      const notifBody = clampStr(data.body    || 'Imate novu obavest u Laker aplikaciji.', 300);
      const url       = clampStr(data.url     || '/?source=pwa', 500);
      const tag       = clampStr(data.tag     || 'laker-global', 64);
      const source    = clampStr(data.source  || 'admin', 32);

      const store = await supabaseFetch('/rest/v1/push_notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify([{
          title,
          body: notifBody,
          url,
          tag,
          source,
          created_at: new Date().toISOString()
        }])
      });

      if (!store.ok) {
        const text = await store.text().catch(() => '');
        json(res, store.status || 500, { ok: false, error: text || 'Failed to save notification' });
        return;
      }

      const storedRows = await store.json().catch(() => []);
      const storedItem = Array.isArray(storedRows) && storedRows.length ? storedRows[0] : null;
      const pushNotificationId = storedItem && storedItem.id ? storedItem.id : null;

      const subsRes = await supabaseFetch('/rest/v1/push_subscriptions?select=endpoint,subscription', {
        method: 'GET'
      });
      if (!subsRes.ok) {
        const text = await subsRes.text().catch(() => '');
        json(res, subsRes.status || 500, { ok: false, error: text || 'Failed to load subscriptions' });
        return;
      }

      const subs = await subsRes.json().catch(() => []);
      const notifications = Array.isArray(subs) ? subs : [];
      const results = [];
      const canDeliver = hasVapidPrivateKey();
      const warnings = [];
      if (!canDeliver) warnings.push('VAPID nije podesen, poruka je sacuvana ali push nije poslat.');
      if (!notifications.length) warnings.push('Nema aktivnih pretplatnika za push.');

      for (const row of notifications) {
        const sub = row && row.subscription ? row.subscription : null;
        const pushResult = canDeliver
          ? await sendWebPush(sub, { title, body: notifBody, url, tag })
          : { ok: false, status: 503, error: 'Missing VAPID configuration' };

        results.push({
          endpoint: row && row.endpoint ? row.endpoint : null,
          ok: !!pushResult.ok,
          status: pushResult.status,
          error: pushResult.error || null
        });
      }

      let logSaved = false;
      try {
        const logRes = await supabaseFetch('/rest/v1/push_delivery_logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify([{
            push_notification_id: pushNotificationId,
            title,
            body: notifBody,
            url,
            tag,
            sent: results.filter(r => r.ok).length,
            total: results.length,
            skipped: results.filter(r => !r.ok).length,
            warning: warnings.join(' ') || null,
            results,
            source,
            created_at: new Date().toISOString()
          }])
        });
        logSaved = !!logRes.ok;
      } catch (e) {}

      json(res, 200, {
        ok: true,
        title,
        body: notifBody,
        url,
        tag,
        sent: results.filter(r => r.ok).length,
        total: results.length,
        skipped: results.filter(r => !r.ok).length,
        warning: warnings.join(' '),
        logSaved,
        results
      });
      await auditSecurityEvent({
        scope: 'push-send',
        action: 'broadcast_completed',
        status: 'ok',
        ip: sourceIp,
        user_agent: String(req.headers['user-agent'] || ''),
        subject: tag,
        details: { sent: results.filter(r => r.ok).length, total: results.length, skipped: results.filter(r => !r.ok).length }
      });
    } catch (err) {
      await auditSecurityEvent({
        scope: 'push-send',
        action: 'broadcast_error',
        status: 'error',
        ip: getClientIp(req),
        user_agent: String(req.headers['user-agent'] || ''),
        subject: 'broadcast',
        details: { error: String(err.message || err) }
      });
      json(res, 500, { ok: false, error: 'Interna greška servera' });
    }
  };
  return _runHandler();
};
