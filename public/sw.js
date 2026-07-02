const CACHE_NAME = "nearby-eats-v4";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete all old caches so stale shells are gone immediately
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;
  // API responses must always be fresh
  if (request.url.includes("/api/")) return;

  // ── Navigation requests (the HTML page) ─────────────────────────────────
  // Always go to the network so users always see the latest deployed version.
  // Fall back to cache only when fully offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request) ?? caches.match("/")),
    );
    return;
  }

  // ── Next.js static chunks (/_next/static/) ──────────────────────────────
  // These filenames include a content hash so they never change.
  // Cache-first is safe and makes repeat visits fast.
  if (request.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // ── Everything else (fonts, icons, manifest) ────────────────────────────
  // Network-first so updates land immediately; fall back to cache if offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request)),
  );
});
