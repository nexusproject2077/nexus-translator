/* Service worker Nexus Translator — met en cache l'app pour usage hors ligne.
   Les traductions, elles, sont mises en cache côté app via localStorage. */
const CACHE = "nexus-translator-v3";
const ASSETS = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./languages.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  // On ne met en cache que l'app (même origine, GET). Les appels API restent en réseau.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
