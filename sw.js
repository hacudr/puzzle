// Network first, so new puzzles show up as soon as they are published;
// falls back to the last copy seen so the app keeps working offline.
const CACHE = 'puzzle-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // The host lets a browser keep each file for ten minutes without asking, so
  // a new page could be drawn with the old script and its new buttons do
  // nothing. The page, script and styles are checked against the host each time.
  const fresh = ['document', 'script', 'style'].includes(req.destination);
  e.respondWith(
    fetch(req, fresh ? { cache: 'no-cache' } : {})
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
