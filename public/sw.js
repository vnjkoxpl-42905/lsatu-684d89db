// Kill-switch service worker.
//
// This file replaces a previous Workbox-built worker that was caching the app
// shell + JS bundles and serving the retired "Structure" bootcamp UI long
// after the source was removed. We deliberately ship a minimal worker at the
// same path so existing devices that already registered the old SW will pick
// this one up on next visit, claim all clients, drop every cache, force a
// single cache-busting reload, and then unregister itself.
//
// Once this has been live long enough to reach all returning users, this file
// (and /service-worker.js) can be deleted.

self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));

self.addEventListener('activate', (e) =>
  e.waitUntil(
    (async () => {
      try {
        await self.clients.claim();
      } catch {}
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch {}
      try {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        await Promise.all(
          clients.map((c) => {
            try {
              const url = new URL(c.url);
              url.searchParams.set('sw-cleanup', Date.now().toString());
              return c.navigate(url.toString());
            } catch {
              return Promise.resolve();
            }
          }),
        );
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
    })(),
  ),
);

// Never serve cached responses. Always go to network.
self.addEventListener('fetch', () => {});
