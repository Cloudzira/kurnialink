/* Service Worker Kurniapedia
   - App shell di-cache supaya bisa dibuka cepat / offline
   - Halaman utama: network-first (update selalu terambil kalau online)
   - Aset CDN: stale-while-revalidate
   - Firebase/Firestore/Auth TIDAK di-cache (data selalu fresh)
   Naikkan angka VERSION setiap kali mengganti file ini. */
const VERSION = 'v2';
const SHELL_CACHE = 'kurniapedia-shell-' + VERSION;
const RUNTIME_CACHE = 'kurniapedia-runtime-' + VERSION;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(SHELL_ASSETS.map((url) => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('kurniapedia-') && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

const NO_CACHE_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'www.googleapis.com'
];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (NO_CACHE_HOSTS.includes(url.hostname)) return;

  // Halaman utama: network-first, fallback ke cache saat offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() =>
          caches.match('./index.html').then((r) => r || caches.match('./'))
        )
    );
    return;
  }

  // File se-origin (ikon, manifest, dll): cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Aset CDN (Tailwind, FontAwesome, Sortable, Google Fonts, Firebase SDK): stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
