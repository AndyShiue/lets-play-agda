/*
 * Service worker of the editor page.
 *
 * Registered with the scope of the directory it lives in. Responsibilities:
 *   - precache the core files and cache everything else on first use,
 *   - make the page cross-origin isolated (see sw-common.js).
 *
 * The build ids (in sw-common.js) and the PRECACHE list below are filled in
 * by scripts/build-site.mjs.
 */
importScripts('sw-common.js');

const { CACHE_PREFIX, SITE_CACHE, CACHE_NAMES, onFetch } = self.lpa;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SITE_CACHE);
    await Promise.allSettled(PRECACHE.map(async (relative) => {
      const url = new URL(relative, self.registration.scope);
      const response = await fetch(url, { cache: 'reload' });
      if (response.status === 200) await cache.put(url, response);
    }));
    // Take over at once, also on updates. Waiting until every tab of the old
    // version is closed (the default) leaves readers on the old files, with the
    // old bugs, for as long as they keep a tab open; the page (app.js) notices
    // the change and offers a reload.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && !CACHE_NAMES.includes(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', onFetch);
