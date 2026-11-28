/*
 * Elite IGCSE — service worker (v190)
 * ---------------------------------------------------------------------------
 * Conservative offline support, rebuilt after the v188/v189 kill switch.
 *
 * Strategy (deliberately boring, freshness first):
 *   - HTML / navigations .... network-first. A page is only ever served from
 *                             cache when the network request actually fails,
 *                             so students never see a stale page while online.
 *                             If the page itself is not cached either, the
 *                             precached offline.html is shown.
 *   - Static assets ......... stale-while-revalidate (CSS/JS/images/fonts):
 *     (CSS/JS/images/fonts)   instant from cache, refreshed in the background.
 *   - Data files ............ network-first with cache fallback. These are
 *     (questions-data.js,     the big question/solution banks; they are never
 *      *-data.js, /data/…)    precached, only kept after a real online visit.
 *   - Everything else ....... untouched. Non-GET requests and ALL cross-origin
 *                             traffic pass straight through: Firebase Auth,
 *                             Firestore, Google APIs, WhatsApp links and font
 *                             CDNs are never intercepted and never cached.
 *
 * Safety rules:
 *   - Admin/teacher pages (admin, stats, members, teacher-groups,
 *     teacher-tracker) are NEVER written to any cache, and no Firestore or
 *     auth response can ever be cached (cross-origin + non-GET pass-through
 *     above makes that structural, not just a promise).
 *   - Responses with `Cache-Control: no-store` are never stored.
 *   - This worker never unregisters itself and never force-reloads windows.
 *     Version bumps roll out by cache name: activate deletes every older
 *     `elite-igcse*` cache and claims clients; open pages keep running and
 *     pick up the new worker on their next navigation.
 *   - Escape hatch: the "Reset saved site" button on offline.html still
 *     unregisters the worker and clears caches from the page side.
 */

const SW_VERSION = "v201-tracker-direct-group";
const SHELL_CACHE = "elite-igcse-shell-" + SW_VERSION;
const RUNTIME_CACHE = "elite-igcse-runtime-" + SW_VERSION;
const CURRENT_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

/* App shell: small, hand-checked list. Every path must exist in the repo
 * (verified by test-batch14-sw.js). Data files are NOT precached on purpose. */
const APP_SHELL = [
  "./",
  "index.html",
  "offline.html",
  "styles.css",
  "elite-system.css",
  "elite-ux.css",
  "pathway-bootstrap.js",
  "pathway-mode.js",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/apple-touch-icon.png",
  "assets/logo-header.svg",
];

/* Pages whose HTML must never be stored (staff-only surfaces). */
const PRIVATE_PAGES = [
  "/admin.html",
  "/stats.html",
  "/members.html",
  "/teacher-groups.html",
  "/teacher-tracker.html",
];

const STATIC_DESTINATIONS = ["style", "script", "image", "font"];
const STATIC_EXTENSIONS = /\.(?:css|mjs|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)$/i;

function isPrivatePage(url) {
  return PRIVATE_PAGES.some((page) => url.pathname.endsWith(page));
}

function isDataFile(url) {
  return (
    /-data\.js$/i.test(url.pathname) ||
    /\/answer-index\.js$/i.test(url.pathname) ||
    url.pathname.indexOf("/data/") !== -1
  );
}

function isStaticAsset(request, url) {
  return (
    STATIC_DESTINATIONS.indexOf(request.destination) !== -1 ||
    STATIC_EXTENSIONS.test(url.pathname)
  );
}

function cacheable(response) {
  if (!response || !response.ok) return false;
  const control = response.headers.get("Cache-Control") || "";
  return control.toLowerCase().indexOf("no-store") === -1;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.indexOf("elite-igcse") === 0 &&
              CURRENT_CACHES.indexOf(key) === -1
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

/* Navigations: network-first. Cache a copy of public pages the student has
 * actually visited; fall back to the cached copy, then to offline.html. */
async function handleNavigation(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (cacheable(response) && !isPrivatePage(url)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const shell = await caches.open(SHELL_CACHE);
    const offline = await shell.match("offline.html");
    if (offline) return offline;
    throw error;
  }
}

/* Data files: network-first so a corrected question bank lands immediately;
 * the last good copy is kept for offline revision. */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

/* Static assets: serve the cached copy instantly (the precache is stored
 * under bare URLs, page requests carry ?v= cache-busters — hence
 * ignoreSearch), and refresh the runtime cache in the background. */
async function staleWhileRevalidate(event, request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  const refresh = fetch(request)
    .then(async (response) => {
      if (cacheable(response)) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const fresh = await refresh;
  if (fresh) return fresh;
  throw new Error("Offline and not cached: " + request.url);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return; // pass through: writes, auth, Firestore

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // pass through: Firebase/Google/WhatsApp/CDNs
  if (url.searchParams.has("online-check")) return; // offline.html probe must hit the real network
  if (url.pathname.endsWith("/service-worker.js")) return; // never cache the worker itself

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (isDataFile(url)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isStaticAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(event, request));
    return;
  }
  event.respondWith(networkFirst(request));
});
