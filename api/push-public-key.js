const { json, getVapidPublicKeyBase64Url, getEnv } = require('./_push');
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

  const publicKey = getVapidPublicKeyBase64Url();
  if (!publicKey) {
    json(res, 503, {
      ok: false,
      error: 'Push notifikacije nisu konfigurisane'
    });
    return;
  }

  json(res, 200, {
    ok: true,
    publicKey,
    subject: getEnv('PUSH_VAPID_SUBJECT', 'VAPID_SUBJECT', 'mailto:detailinglaker@gmail.com') || 'mailto:detailinglaker@gmail.com'
  });
};
