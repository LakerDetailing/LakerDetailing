const { json, supabaseFetch } = require('./_push');
const { getClientIp, setSecurityHeaders, setCorsHeaders, checkPersistentRateLimit, auditSecurityEvent } = require('./_security');

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
      const sourceIp = getClientIp(req);
      const rateCheck = await checkPersistentRateLimit({ scope: 'push-subscribe', key: sourceIp, max: 12, windowMs: 15 * 60 * 1000 });
      if (!rateCheck.allowed) {
        await auditSecurityEvent({
          scope: 'push-subscribe',
          action: 'rate_limit_block',
          status: 'blocked',
          ip: sourceIp,
          user_agent: String(req.headers['user-agent'] || ''),
          subject: 'subscription',
          details: { rateCheck }
        });
        json(res, 429, { ok: false, error: 'Too many requests' });
        return;
      }
      const subscription = data.subscription;
      if (!subscription || !subscription.endpoint) {
        json(res, 400, { ok: false, error: 'Invalid subscription payload' });
        return;
      }

      const endpoint = String(subscription.endpoint);
      const payload = {
        endpoint,
        subscription,
        user_agent: String(data.userAgent || ''),
        source: String(data.source || 'pwa'),
        updated_at: new Date().toISOString()
      };

      const save = await supabaseFetch('/rest/v1/push_subscriptions?on_conflict=endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([payload])
      });

      if (!save.ok) {
        const text = await save.text().catch(() => '');
        json(res, save.status || 500, {
          ok: false,
          error: text || 'Failed to save subscription'
        });
        return;
      }

      await auditSecurityEvent({
        scope: 'push-subscribe',
        action: 'subscription_saved',
        status: 'ok',
        ip: sourceIp,
        user_agent: String(req.headers['user-agent'] || ''),
        subject: endpoint,
        details: { source: String(data.source || 'pwa') }
      });

      json(res, 200, { ok: true });
    } catch (err) {
      await auditSecurityEvent({
        scope: 'push-subscribe',
        action: 'subscription_error',
        status: 'error',
        ip: getClientIp(req),
        user_agent: String(req.headers['user-agent'] || ''),
        subject: 'subscription',
        details: { error: String(err.message || err) }
      });
      json(res, 400, { ok: false, error: err.message || 'Bad request' });
    }
  };
  return _runHandler();
};
