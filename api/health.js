const { json } = require('./_push');
const { supabaseFetch } = require('./_push');
const { setSecurityHeaders } = require('./_security');

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { ok: false });
    return;
  }

  const start = Date.now();
  let dbOk = false;

  try {
    const r = await supabaseFetch('/rest/v1/testimonials?select=id&limit=1', { method: 'GET' });
    dbOk = r.ok;
  } catch { dbOk = false; }

  const ms = Date.now() - start;
  const status = dbOk ? 200 : 503;

  json(res, status, {
    ok: dbOk,
    service: 'laker-detailing',
    db: dbOk ? 'ok' : 'error',
    latency_ms: ms,
    ts: new Date().toISOString()
  });
};
