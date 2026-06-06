const { json, supabaseFetch } = require('./_push');
const { setSecurityHeaders, setCorsHeaders } = require('./_security');

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const latest = await supabaseFetch('/rest/v1/push_notifications?select=title,body,url,tag,created_at&order=created_at.desc&limit=1', {
    method: 'GET',
    headers: { Prefer: 'return=representation' }
  });

  if (!latest.ok) {
    json(res, 200, {
      ok: true,
      title: 'Laker Detailing',
      body: 'Imate novu obavest u Laker aplikaciji.',
      url: '/?source=pwa',
      tag: 'laker-global'
    });
    return;
  }

  const rows = await latest.json().catch(() => []);
  const item = Array.isArray(rows) && rows.length ? rows[0] : null;
  json(res, 200, {
    ok: true,
    title: item && item.title ? item.title : 'Laker Detailing',
    body: item && item.body ? item.body : 'Imate novu obavest u Laker aplikaciji.',
    url: item && item.url ? item.url : '/?source=pwa',
    tag: item && item.tag ? item.tag : 'laker-global',
    created_at: item && item.created_at ? item.created_at : null
  });
};
