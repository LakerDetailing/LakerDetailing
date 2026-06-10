const CACHE_VERSION = 'laker-pwa-v14';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// index.html i / su izbačeni — uvek se serve-uju network-first, nema smisla ih precache-ovati
const SHELL_ASSETS = [
  '/assets/icons/site.webmanifest',
  '/offline.html',
  '/assets/icons/favicon.ico',
  '/assets/icons/favicon-96x96.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/web-app-manifest-192x192.png',
  '/assets/icons/web-app-manifest-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => {
      if (key === SHELL_CACHE || key === RUNTIME_CACHE) return null;
      return caches.delete(key);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function getLatestPushNotification() {
  try {
    const res = await fetch('/api/push-latest?ts=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

self.addEventListener('push', event => {
  const promise = (async () => {
    const latest = await getLatestPushNotification();
    const title = latest && latest.title ? latest.title : 'Laker Detailing';
    const body = latest && latest.body ? latest.body : 'Imate novu obavest u Laker aplikaciji.';
    const url = latest && latest.url ? latest.url : '/?source=pwa';
    const tag = latest && latest.tag ? latest.tag : 'laker-global';

    await self.registration.showNotification(title, {
      body,
      icon: '/assets/icons/web-app-manifest-192x192.png',
      badge: '/assets/icons/web-app-manifest-192x192.png',
      data: { url },
      tag,
      renotify: true,
      silent: false
    });
  })();

  event.waitUntil(promise);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) ? event.notification.data.url : '/?source=pwa';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client && client.url === new URL(targetUrl, self.location.origin).href) {
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});

function isSameOrigin(requestUrl) {
  try {
    return new URL(requestUrl).origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

function isBot(request) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  return ua.includes('googlebot') || ua.includes('bingbot') || ua.includes('bot') || ua.includes('crawl') || ua.includes('spider');
}

async function cacheThenReturn(request, response, cacheName = RUNTIME_CACHE) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  const cache = await caches.open(cacheName);
  cache.put(request, response.clone()).catch(() => {});
  return response;
}

async function networkFirst(request, fallbackUrl = '/offline.html') {
  try {
    // cache: 'no-store' — uvek bypass-uj HTTP cache, uvek uzmi svežu verziju
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      await cacheThenReturn(request, response);
      return response;
    }
    throw new Error('Bad response');
  } catch (e) {
    // Never serve offline.html to bots/crawlers
    if (isBot(request)) {
      return new Response('Service Unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    const fallback = await caches.match(fallbackUrl);
    if (fallback) return fallback;
    throw e;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;
  const response = await fetch(request);
  return cacheThenReturn(request, response);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // External (cross-origin) resources — fonts, CDN images, analytics, etc.
  // Let the browser handle them directly. Service worker must NOT intercept
  // these because cross-origin fetches fail with CORS/CSP errors.
  if (!isSameOrigin(request.url)) return;

  const url = new URL(request.url);

  // Admin panel should never be cached offline or precached.
  if (url.pathname === '/laker-admin-9x3k.html') {
    event.respondWith(fetch(request));
    return;
  }

  // API calls always go straight to network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  const isNavigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    // Bots go straight to network, no offline fallback
    if (isBot(request)) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(networkFirst(request, '/offline.html'));
    return;
  }

  // Cache same-origin static assets
  if (['style', 'script', 'image', 'font'].includes(request.destination) || url.pathname.endsWith('.png')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(fetch(request));
});
