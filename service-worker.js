const CACHE_VERSION = "elite-igcse-kill-v59";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.indexOf("elite-igcse") === 0)
          .map((key) => caches.delete(key))
      );
      await self.registration.unregister();
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      await Promise.all(windows.map((client) => client.navigate(client.url)));
    })()
  );
});

// Deliberately do not intercept fetch requests. The live site should use the
// network directly until the offline cache is rebuilt safely.
