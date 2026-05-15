const CACHE_VERSION = "elite-igcse-v14";
const RUNTIME_CACHE = "elite-igcse-runtime-v14";

const APP_SHELL = [
  "./",
  "index.html",
  "practice.html",
  "exam.html",
  "checkup.html",
  "topics.html",
  "notes.html",
  "pastpapers.html",
  "progress.html",
  "planner.html",
  "about.html",
  "downloads.html",
  "offline.html",
  "styles.css",
  "lead.js",
  "pathway-mode.js",
  "firebase-config.js",
  "cloud-progress.js",
  "app.js",
  "exam.js",
  "checkup.js",
  "progress.js",
  "planner.js",
  "topics.js",
  "questions-data.js",
  "topic-normalizer.js",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/og-image.png",
  "assets/Mine-formal-bright.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("offline.html"))
    );
    return;
  }

  if (request.destination === "image" || url.pathname.includes("/downloads/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
