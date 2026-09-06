/* Fuse Studio service worker — makes the app installable + fast.
   Strategy: network-first for everything, falling back to cache when
   offline. We intentionally never cache API/auth calls. */
const CACHE = 'fuse-atelier-vercel-v2';
const SHELL = [
  '/app/index.html',
  '/app/studio.html',
  '/app/styles.css',
  '/app/config.js',
  '/app/icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache functions, Supabase, Paystack or other cross-origin APIs.
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') ||
      url.origin !== location.origin) {
    return; // let it hit the network normally
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/app/index.html')))
  );
});
