/* ============================================================
   THE LAST HAND — offline service worker
   Cache-first. Once installed, the game never touches the network.
   Bump CACHE_VERSION to ship an update.
   ============================================================ */

const CACHE_VERSION = 'last-hand-v10';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/game.js',
  './js/art.js',
  './js/models3d.js',
  './js/bgm.js',
  './js/score.js',
  './assets/audio/manifest.json',
  './assets/audio/menu.mp3',
  './assets/audio/duel.mp3',
  './assets/audio/final.mp3',
  './assets/fonts/cinzel-400.woff2',
  './assets/fonts/cinzel-600.woff2',
  './assets/fonts/cinzel-700.woff2',
  './assets/fonts/cormorant-400.woff2',
  './assets/fonts/cormorant-600.woff2',
  './assets/fonts/cormorant-400-italic.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon-180.png',
  './assets/icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache or proxy anything cross-origin.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;

      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline and uncached: serve the shell so a navigation still works.
          if (req.mode === 'navigate') return caches.match('./index.html');
          throw new Error('offline');
        });
    })
  );
});
