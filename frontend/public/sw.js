const CACHE_NAME = 'debugduel-cache-v1';
const OFFLINE_URL = '/offline';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/icon.svg',
];

// Install Event - cache the offline fallback and other critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - check cache first, then fall back to offline page if navigating offline
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests, skip non-http requests and API/websocket traffic
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin) ||
    event.request.url.includes('/socket.io/') ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('/_next/webpack-hmr')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful requests for later offline use (optional, but keep it simple)
        if (response.status === 200 && event.request.url.includes('/_next/static/')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, lookup in cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If we were navigating to a page, serve the cached offline fallback HTML
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
