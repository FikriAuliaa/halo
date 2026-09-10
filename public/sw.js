// Service Worker for Halo Kampus PWA
const CACHE_NAME = "halo-kampus-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          "/favicon.ico",
          "/favicon.svg",
          "/manifest.json",
          "/icons/icon-192.png",
          "/icons/icon-512.png",
        ]);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Never intercept cross-origin requests (e.g. fonts.googleapis.com, cloudflare insights)
  if (url.origin !== self.location.origin) return;

  // Never intercept API routes or admin routes
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  // Network first with cache fallback
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response("Offline", { status: 504, statusText: "Gateway Timeout" });
    }),
  );
});
