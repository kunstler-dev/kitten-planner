// Service worker for the phone/web version (generated into site/sw.js by scripts/build-web.js).
const CACHE = 'kitten-planner-__VERSION__';
const ART_CACHE = 'kitten-planner-art';
const SHELL = __SHELL__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ART_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' && req.method !== 'HEAD') return;
  if (url.origin !== location.origin) return; // Google Drive / OpenAI go straight to the network

  // The app page: network first (fresh version), cached copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  if (url.pathname.endsWith('/google-config.json')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }
  // Paintings: cached on first view, so the calendar works offline afterwards.
  if (url.pathname.includes('/assets/art/')) {
    event.respondWith(
      caches.open(ART_CACHE).then(async (cache) => {
        const hit = await cache.match(url.pathname);
        if (hit) return hit;
        const res = await fetch(url.pathname);
        if (res.ok) cache.put(url.pathname, res.clone());
        return req.method === 'HEAD' ? new Response(null, { status: res.status }) : res;
      }),
    );
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
