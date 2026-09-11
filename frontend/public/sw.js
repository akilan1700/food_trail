// File: public/sw.js
// Description: PWA Service Worker for static assets, navigation pre-caching, and offline shell. API requests bypass SW to avoid network blocking.
// Author: Akilan M
// Created: 2026-09-10T15:33:45+05:30

const CACHE_NAME = 'foodtrail-cache-v5';

// Core routes and static assets to precache during install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/trails',
  '/trip',
  '/my-spots',
  '/add-spot',
  '/profile',
  '/settings',
  '/login',
  '/signup',
];

// Service Worker Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
              console.warn(`[PWA SW] Precache warning for ${url}:`, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Service Worker Activation & Cache Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Message Listener for update prompt skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync Listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-foodtrail-mutations') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
        });
      })
    );
  }
});

// Fetch Interception
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1. Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 2. Ignore non-http / chrome-extension schemes
  if (!request.url.startsWith('http')) {
    return;
  }

  // 3. Completely BYPASS all API calls and backend routes from Service Worker interception
  // This guarantees live API calls are never blocked, buffered, or altered when online.
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/upload') ||
    url.port === '5001'
  ) {
    return;
  }

  // 4. Static Next.js Assets & Images (/_next/static, /icons, /_next/image, unpkg, etc.): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. HTML Navigation Requests (Page Routes): Network-First falling back to Pre-cached Route or Home
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          const rootFallback = await caches.match('/');
          if (rootFallback) {
            return rootFallback;
          }
          return new Response(
            `<!DOCTYPE html><html><head><title>Offline | FoodTrail</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{background:#0b0f19;color:#f3f4f6;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;}.box{max-width:400px;background:#151c2e;padding:30px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);}button{background:#f18024;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:bold;cursor:pointer;margin-top:15px;}</style></head><body><div class="box"><h2>You are currently offline</h2><p>Please check your internet connection or navigate to cached pages.</p><button onclick="window.location.reload()">Retry Connection</button></div></body></html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        })
    );
    return;
  }

  // 6. Default fallback: Cache with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
      );
    })
  );
});
