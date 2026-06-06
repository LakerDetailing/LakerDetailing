const crypto = require('crypto');

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

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getSupabaseConfig() {
  return {
    url: getEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL'),
    key: getEnv('SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE')
  };
}

async function supabaseFetch(path, options = {}) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return { ok: false, status: 500, json: async () => ({ error: 'Missing Supabase env' }), text: async () => 'Missing Supabase env' };
  }
  const res = await fetch(url + path, {
    ...options,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  return res;
}

function toBase64Url(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

function getVapidPrivateKeyPem() {
  return getEnv('PUSH_VAPID_PRIVATE_KEY_PEM', 'VAPID_PRIVATE_KEY_PEM');
}

function hasVapidPrivateKey() {
  return !!getVapidPrivateKeyPem();
}

function getVapidPublicKeyBase64Url() {
  const explicit = getEnv('PUSH_VAPID_PUBLIC_KEY', 'VAPID_PUBLIC_KEY');
  if (explicit) return explicit;
  const pem = getVapidPrivateKeyPem();
  if (!pem) return '';
  const privateKey = crypto.createPrivateKey(pem);
  const publicKey = crypto.createPublicKey(privateKey);
  const jwk = publicKey.export({ format: 'jwk' });
  if (!jwk || !jwk.x || !jwk.y) return '';
  const x = fromBase64Url(jwk.x);
  const y = fromBase64Url(jwk.y);
  return toBase64Url(Buffer.concat([Buffer.from([0x04]), x, y]));
}

function signVapidJwt(aud) {
  const pem = getVapidPrivateKeyPem();
  if (!pem) return '';
  const subject = getEnv('PUSH_VAPID_SUBJECT', 'VAPID_SUBJECT', 'mailto:detailinglaker@gmail.com') || 'mailto:detailinglaker@gmail.com';
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject
  };
  const signingInput = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({ key: pem, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${toBase64Url(signature)}`;
}

async function sendWebPush(subscription, notification) {
  if (!subscription || !subscription.endpoint) {
    return { ok: false, status: 400, error: 'Invalid subscription' };
  }
  const privateKey = getVapidPrivateKeyPem();
  const publicKey = getVapidPublicKeyBase64Url();
  if (!privateKey || !publicKey) {
    return { ok: false, status: 500, error: 'Missing VAPID configuration' };
  }
  const endpoint = new URL(subscription.endpoint);
  const token = signVapidJwt(endpoint.origin);
  if (!token) {
    return { ok: false, status: 500, error: 'Failed to sign VAPID JWT' };
  }
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '60',
      Urgency: 'high',
      Authorization: 'WebPush ' + token,
      'Crypto-Key': 'p256ecdsa=' + publicKey,
      'Content-Length': '0'
    },
    body: ''
  });
  const ok = res.ok || res.status === 201;
  return { ok, status: res.status, notification };
}

module.exports = {
  getEnv,
  json,
  getSupabaseConfig,
  supabaseFetch,
  toBase64Url,
  fromBase64Url,
  hasVapidPrivateKey,
  getVapidPublicKeyBase64Url,
  signVapidJwt,
  sendWebPush
};
