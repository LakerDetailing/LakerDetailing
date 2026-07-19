const CACHE_VERSION = 'laker-pwa-v24';
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

// Notify all open windows that fresh content is available
async function notifyClientsContentUpdated() {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(c => c.postMessage({ type: 'CONTENT_UPDATED' }));
  } catch (e) {}
}

// Strategy: stale-while-revalidate
// Serve cached response immediately (fast FCP for returning visitors), then fetch fresh in background.
// If notifyOnChange=true and ETag/Last-Modified changed, post CONTENT_UPDATED to all clients.
// If no cache exists, waits for network (first-visit behaviour unchanged).
async function staleWhileRevalidate(request, fallbackUrl, notifyOnChange) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  // Always kick off a background revalidation (fire-and-forget when cached exists)
  const networkFetch = fetch(request, { cache: 'no-store' })
    .then(async response => {
      if (!response || !response.ok) return null;

      if (notifyOnChange && cached) {
        // Compare ETag or Last-Modified to detect real content changes
        const cachedEtag = cached.headers.get('etag');
        const freshEtag = response.headers.get('etag');
        const cachedMod = cached.headers.get('last-modified');
        const freshMod = response.headers.get('last-modified');
        const changed =
          (cachedEtag && freshEtag && cachedEtag !== freshEtag) ||
          (!cachedEtag && cachedMod && freshMod && cachedMod !== freshMod);

        cache.put(request, response.clone()).catch(() => {});
        if (changed) notifyClientsContentUpdated();
        return response;
      }

      cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => null);

  // Serve cached version immediately (returning visitor fast path)
  if (cached) return cached;

  // No cache: first visit — wait for network
  const response = await networkFetch;
  if (response) return response;

  // Network failed on first visit — try offline fallback
  if (fallbackUrl) {
    if (!isBot(request)) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response('Service Unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }

  return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
}

// Strategy: cache-first with network fallback (for immutable assets: images, fonts)
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
    // HTML: stale-while-revalidate — keširana verzija se servira ODMAH (instant load),
    // sveža se povlači u pozadini. Ako se sadržaj promenio (ETag), klijenti dobiju
    // CONTENT_UPDATED → init.js uradi tihi reload odmah po otvaranju ili pokaže baner.
    // Svežina posle deploya je i dalje garantovana, ali korisnik više NIKAD ne čeka mrežu.
    event.respondWith(staleWhileRevalidate(request, '/offline.html', true));
    return;
  }

  // Scripts and styles: stale-while-revalidate — instant iz keša, revalidacija u pozadini.
  // ?v= verzija u HTML-u garantuje svež JS posle deploya (nov URL = network fetch);
  // pozadinska revalidacija pokriva i slučaj kad ?v= nije bump-ovan.
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request, null, false));
    return;
  }

  // Images and fonts: cache-first (immutable — versioned URLs ensure freshness)
  if (request.destination === 'image' || request.destination === 'font' || url.pathname.endsWith('.png')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(fetch(request));
});
