const CACHE = "padletic-shell-widget-v2";
const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => null)
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // API, Render backend, BO5 and every other cross-origin request
  // must bypass the service worker completely.
  // This prevents stale API responses and "Failed to fetch"
  // after changing environments/deployments.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation: network first, cached shell only as offline fallback.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    );
    return;
  }

  // Static assets: network first + cache fallback.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();

          caches
            .open(CACHE)
            .then((cache) =>
              cache.put(event.request, copy)
            );
        }

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
