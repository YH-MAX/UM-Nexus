/* Only public offline assets are cached. Account pages, API responses and
 * Supabase requests always use the network and never enter this cache. */
const CACHE_NAME = "um-nexus-pwa-v1";
const OFFLINE_URL = "/offline.html";
const OFFLINE_ASSETS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("um-nexus-pwa-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(async () => {
      return (await caches.match(OFFLINE_URL)) || Response.error();
    }));
    return;
  }

  if (OFFLINE_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
