const CACHE_NAME = 'elegantbarb-v5';
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/brand/habitu/logo-horizontal-light.svg',
  '/brand/habitu/logo-horizontal-dark.svg',
  '/brand/habitu/symbol-color.svg',
  '/brand/habitu/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('elegantbarb-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

const isPublicResponse = (response) => response.ok && response.type !== 'opaque' &&
  !/(?:private|no-store)/i.test(response.headers.get('Cache-Control') || '');

const storeResponse = async (key, response) => {
  if (!isPublicResponse(response)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(key, response.clone());
  } catch {
    // Cache quota or private browsing must not interrupt a successful request.
  }
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      /^\/(?:api|recorrido)(?:\/|$)/.test(url.pathname) || request.headers.has('Authorization')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).then(async (response) => {
      if ((response.headers.get('Content-Type') || '').includes('text/html')) {
        await storeResponse('/index.html', response);
      }
      return response;
    }).catch(async () => (await caches.match('/index.html')) || Response.error()));
    return;
  }

  const isBuildAsset = url.pathname.startsWith('/assets/');
  const isStaticAsset = isBuildAsset || url.pathname.startsWith('/fonts/') || STATIC_ASSETS.includes(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached && isBuildAsset) return cached;
    try {
      const response = await fetch(request);
      await storeResponse(request, response);
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});

// Reuse the PWA worker for FCM Web Push; no second root-scope worker is registered.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  if (!payload || typeof payload !== 'object') return;
  const notification = payload.notification || {};
  // Keep lock-screen content generic; detailed records remain behind authenticated reads.
  event.waitUntil(self.registration.showNotification('habitu', {
    body: 'Tienes una novedad en tu cuenta. Abre habitu para revisarla.',
    icon: '/brand/habitu/symbol-color.svg',
    badge: '/brand/habitu/symbol-color.svg',
    tag: payload.data?.event_id || notification.tag || 'habitu-update',
    renotify: false,
    data: { url: '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const current = clients.find((client) => new URL(client.url).origin === self.location.origin);
    return current ? current.focus() : self.clients.openWindow('/');
  }));
});
