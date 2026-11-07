/* Service Worker Kurniapedia
   - App shell di-cache supaya bisa dibuka cepat / offline
   - Halaman utama: network-first (update selalu terambil kalau online)
   - Aset CDN: stale-while-revalidate
   - Firebase/Firestore/Auth TIDAK di-cache (data selalu fresh)
   Naikkan angka VERSION setiap kali mengganti file ini. */
const VERSION = 'v14';
const SHELL_CACHE = 'kurniapedia-shell-' + VERSION;
const RUNTIME_CACHE = 'kurniapedia-runtime-' + VERSION;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './favicon.png',
  './css/ai-chat.css',
  './css/background.css',
  './css/banner.css',
  './css/base.css',
  './css/link-cards.css',
  './css/murottal.css',
  './css/profile-admin.css',
  './css/splash.css',
  './js/admin-form.js',
  './js/admin-ui.js',
  './js/ai-chat.js',
  './js/auth.js',
  './js/banner-admin.js',
  './js/banner.js',
  './js/config.js',
  './js/firebase.js',
  './js/link-light.js',
  './js/link-lock.js',
  './js/links-actions.js',
  './js/links-render.js',
  './js/main.js',
  './js/murottal-data.js',
  './js/murottal.js',
  './js/profile-edit.js',
  './js/profile.js',
  './js/pwa-early.js',
  './js/pwa.js',
  './js/search.js',
  './js/share.js',
  './js/splash.js',
  './js/state.js',
  './js/tailwind-config.js',
  './js/utils.js'
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

  // Audio/video (murottal) jangan di-cache: file besar & memakai permintaan Range
  if (req.headers.has('range') || req.destination === 'audio' || req.destination === 'video' ||
      /\.(mp3|m4a|ogg|wav|mp4)(\?|$)/i.test(url.pathname)) return;

  // Halaman utama: ambil dari jaringan (selalu versi terbaru), tetapi jika jaringan lambat
  // (> 2,5 detik) langsung tampilkan salinan tersimpan agar aplikasi tetap terasa cepat.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match('./index.html');
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put('./index.html', res.clone());
        return res;
      });
      if (!cached) return network;
      try {
        return await Promise.race([
          network,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
        ]);
      } catch (e) {
        network.catch(() => {}); // biarkan unduhan lanjut di latar belakang & memperbarui cache
        return cached;
      }
    })());
    return;
  }

  // File kode aplikasi (folder js/ dan css/): sama seperti halaman utama, ambil dari jaringan
  // supaya update selalu terbaru; jika jaringan lambat (> 2,5 detik) / offline, pakai salinan tersimpan.
  if (url.origin === self.location.origin && /\.(js|css)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      });
      const cached = await cache.match(req);
      if (!cached) return network;
      try {
        return await Promise.race([
          network,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
        ]);
      } catch (e) {
        network.catch(() => {}); // biarkan unduhan lanjut di latar belakang & memperbarui cache
        return cached;
      }
    })());
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
