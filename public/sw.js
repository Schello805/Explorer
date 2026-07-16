const CACHE = "platzguide-shell-v3";
const SHELL = ["/", "/offline", "/manifest.webmanifest", "/icons/platzguide-logo.png"];

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

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Platzguide", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Platzguide";
  const options = {
    body: payload.body || "Neue Mitteilung verfügbar.",
    icon: "/icons/platzguide-logo.png",
    badge: "/icons/platzguide-logo.png",
    data: { url: payload.url || "/" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ("focus" in client && client.url === url) return client.focus();
    }
    return clients.openWindow(url);
  }));
});
