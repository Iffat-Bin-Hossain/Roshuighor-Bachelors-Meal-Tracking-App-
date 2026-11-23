/* রসুইঘর service worker — offline app shell. Bump VERSION to force clients to refresh caches. */
const VERSION = 'v1';
const SHELL_CACHE = `rosuighor-shell-${VERSION}`;
const RUNTIME_CACHE = `rosuighor-runtime-${VERSION}`;

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
  '/logo-dark.png',
  '/logo-transparent.png',
  '/logo-dark-transparent.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL_CACHE, RUNTIME_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache API calls: they carry the user's private data and auth token.
  if (url.pathname.startsWith('/api/') || (url.origin !== self.location.origin && !url.hostname.includes('fonts.'))) return;

  // Page navigations: network first (fresh deploys), fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets & Google Fonts: stale-while-revalidate.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = (await caches.match(request)) || undefined;
      const network = fetch(request)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
