/*
 * Service worker of the editor page.
 *
 * Registered with the scope of the directory it lives in. Responsibilities:
 *   - precache the core files and cache everything else on first use,
 *   - make the page cross-origin isolated (see sw-common.js).
 *
 * The build id (in sw-common.js) and the PRECACHE list below are filled in
 * by scripts/build-site.mjs.
 */
importScripts('sw-common.js');

const { CACHE_PREFIX, CACHE_NAME, onFetch } = self.lpa;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE.map(async (relative) => {
      const url = new URL(relative, self.registration.scope);
      const response = await fetch(url, { cache: 'reload' });
      if (response.status === 200) await cache.put(url, response);
    }));
    // First install: take over immediately. On updates the new worker waits
    // until every tab running the old version is closed, so a page never
    // sees a half-updated set of files.
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', onFetch);
