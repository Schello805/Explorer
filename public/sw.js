const CACHE = "platzguide-shell-v2";
const SHELL = ["/", "/offline", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
  ));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.startsWith("/_next/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request)
      .catch(() => caches.match("/offline")));
    return;
  }

  const canCache = requestUrl.pathname.startsWith("/icons/")
    || requestUrl.pathname.startsWith("/uploads/")
    || requestUrl.pathname === "/manifest.webmanifest"
    || requestUrl.pathname === "/offline";

  if (!canCache) return;

  event.respondWith(fetch(event.request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    })
    .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("/offline"))));
});
