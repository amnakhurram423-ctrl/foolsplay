// GameBox offline cache. After the first successful load on a good connection,
// everything the app needs (this page, React, icon library, fonts) is stored
// here — so a flaky or dead connection later (like spotty classroom wifi)
// no longer stops the app from opening.

const CACHE_NAME = "gamebox-cache-v2";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://esm.sh/react@18.3.1",
  "https://esm.sh/react-dom@18.3.1/client",
  "https://esm.sh/lucide-react@0.383.0?external=react",
  "https://unpkg.com/@babel/standalone/babel.min.js",
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Fraunces:ital,wght@0,400;0,600;0,700;1,500&family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache what we can; don't let one failed URL (e.g. a font subset) block install.
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Cache-first for everything this app needs, with a network update happening
// in the background when possible (stale-while-revalidate) so the app stays
// current when there IS a connection, but never blocks on one.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
