// FileForge Pro Service Worker - Offline-First PWA Cache
const CACHE_NAME = 'fileforge-v6';

const STATIC_PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/manifest.json',
  '/pdf.worker.min.mjs',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
];

const TOOL_SLUGS = [
  'scan-to-pdf',
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'rotate-pdf',
  'reorder-pdf',
  'pdf-to-images',
  'images-to-pdf',
  'lock-pdf',
  'unlock-pdf',
  'watermark-pdf',
  'page-numbers-pdf',
  'remove-pages-pdf',
  'pdf-metadata',
  'grayscale-pdf',
  'compress-image',
  'convert-image',
  'resize-image',
  'crop-image',
  'rotate-image',
  'image-filters',
  'blur-image',
  'color-palette',
  'image-to-base64',
  'svg-to-png',
  'ppt-to-pdf',
  'word-to-pdf',
  'excel-to-pdf',
  'csv-to-excel',
  'excel-to-csv',
  'json-to-csv',
  'markdown-to-pdf',
  'text-to-pdf',
  'compress-files',
  'zip-files',
  'unzip-files',
  'qr-code-studio',
  'file-hash',
  'file-inspector',
  'password-generator',
  'text-diff',
];

// Message listener for immediate takeover
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install: Pre-cache shell, static core assets, and all 40+ tool routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // 1. Critical core shell
        await cache.addAll(STATIC_PRECACHE);

        // 2. Pre-cache all tool pages in parallel (safe with allSettled)
        const toolUrls = TOOL_SLUGS.map((slug) => `/tools/${slug}`);
        await Promise.allSettled(toolUrls.map((url) => cache.add(url)));
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache warning:', err);
      })
  );
});

// Activate: Purge any old cache versions & take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[SW] Purging old cache version:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Smart offline caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore non-http/https
  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation requests (HTML pages): Network-First so users always get the freshest version!
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback: try exact requested page from cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          // Try without query string
          const pathOnly = await caches.match(url.pathname);
          if (pathOnly) return pathOnly;

          // Try root shell fallback '/'
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;

          return new Response('FileForge Pro is offline and this view is not cached yet.', {
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 2. Static Assets (Next.js static chunks, worker files, images, icons)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached asset immediately and refresh cache in background
          fetch(request)
            .then((fresh) => {
              if (fresh && fresh.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, fresh));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Cache miss: fetch from network and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Stale-While-Revalidate for everything else
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkPromise = fetch(request)
        .then((fresh) => {
          if (fresh && fresh.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, fresh.clone()));
          }
          return fresh;
        })
        .catch(() => cached);

      return cached || networkPromise;
    })
  );
});
