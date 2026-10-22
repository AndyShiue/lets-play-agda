/*
 * Logic shared by
 *   - sw.js                       (the editor's service worker), and
 *   - vscode/.../pre/service-worker.js (a thin wrapper around VS Code's own
 *     webview service worker, see webview-sw.js).
 *
 * It is a plain script that only assigns to `self`, so it works both with
 * importScripts() and as an ES module import.
 *
 * What it does for every same-origin GET request:
 *   1. serves it from Cache Storage if possible (cache-first; navigations are
 *      network-first so that a new deployment is noticed),
 *   2. adds Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy /
 *      Cross-Origin-Resource-Policy headers. GitHub Pages cannot send them,
 *      but the Agda WASM build needs SharedArrayBuffer, which browsers only
 *      enable for cross-origin isolated pages.
 * It also answers requests that the stock VS Code web build sends to
 * Microsoft hosts (telemetry/experiments) locally, and caches the few
 * cross-origin files we still depend on.
 *
 * Two caches:
 *   - the site's own files (pages, scripts, our extension, the workspace) are
 *     named after the build id: every deployment starts a fresh one;
 *   - the VS Code build and the other files that never change for the same
 *     identity (the WebAssembly download) are named after that identity, so a
 *     deployment that does not touch VS Code does not make readers download
 *     its ~60 MB again.
 * The two ids in the names below are filled in by the build scripts.
 */
(function (g) {
  'use strict';

  const CACHE_PREFIX = 'lpa-';
  const SITE_CACHE = CACHE_PREFIX + 'site-__BUILD_ID__';
  const STATIC_CACHE = CACHE_PREFIX + 'static-__STATIC_ID__';
  const CACHE_NAMES = [SITE_CACHE, STATIC_CACHE];

  const cacheNameFor = (url) => (url.pathname.includes('/editor/vscode/') ? STATIC_CACHE : SITE_CACHE);

  // Hosts the stock VS Code web build talks to; we never want that traffic.
  const STUB_HOSTS = new Set(['main.vscode-cdn.net', 'default.exp-tas.com']);

  // Cross-origin files we are willing to fetch (CORS mode) and keep cached.
  const CACHED_EXTERNAL = [
    /^https:\/\/unpkg\.com\/agda-wasm@[^/]+\/als\//,
    /^https:\/\/raw\.githubusercontent\.com\/banacorn\/agda-library-proxy\//,
  ];

  // Responses built by fetch() are already decoded, so these headers would lie.
  const DROP_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding'];

  function isolate(resp) {
    // Opaque and opaque-redirect responses cannot be rewritten.
    if (resp.status === 0 || resp.type === 'opaque' || resp.type === 'opaqueredirect') return resp;
    const headers = new Headers(resp.headers);
    for (const h of DROP_HEADERS) headers.delete(h);
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
  }

  function stub() {
    return new Response('{}', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  }

  // The query strings of VS Code's iframe pages (extension host, webviews) only
  // carry per-instance ids; the page itself is the same file. Key them by path so
  // that they are found again and do not pile up in the cache.
  function cacheKey(request, url) {
    return request.destination === 'iframe' || request.destination === 'frame'
      ? url.origin + url.pathname
      : request;
  }

  // What the worker fetches from the network must not come out of the browser's
  // HTTP cache: GitHub Pages lets files live there for 10 minutes, so right after a
  // deployment a new worker would be handed (and store) the previous files. 'no-cache'
  // revalidates with the server (a 304 costs next to nothing).
  function fromNetwork(request) {
    if (request.mode === 'navigate') {
      // a navigation cannot be re-issued with another cache mode, only copied
      return new Request(request.url, { cache: 'no-cache', credentials: 'same-origin', redirect: request.redirect, headers: request.headers });
    }
    return new Request(request, { cache: 'no-cache' });
  }

  async function sameOrigin(request, url) {
    const cache = await caches.open(cacheNameFor(url));
    const key = cacheKey(request, url);
    // Only the top-level page is network-first (so that a new deployment is
    // noticed); everything else, iframes included, is cache-first.
    const isPage = request.mode === 'navigate' && request.destination === 'document';

    if (!isPage) {
      const hit = await cache.match(key);
      if (hit) return isolate(hit);
    }

    try {
      const net = await fetch(fromNetwork(request));
      if (net.status === 200 && net.type === 'basic') {
        cache.put(key, net.clone()).catch(() => {});
      }
      return isolate(net);
    } catch (err) {
      const hit = await cache.match(key);
      if (hit) return isolate(hit);
      throw err;
    }
  }

  async function cachedExternal(request) {
    // the URLs are pinned to a version: they never change
    const cache = await caches.open(STATIC_CACHE);
    const hit = await cache.match(request.url);
    if (hit) return hit;
    const net = await fetch(request);
    if (net.ok && net.type !== 'opaque') cache.put(request.url, net.clone()).catch(() => {});
    return net;
  }

  function onFetch(event) {
    const request = event.request;
    if (request.method !== 'GET') return;
    // Known Chromium quirk (same guard as coi-serviceworker).
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

    const url = new URL(request.url);
    if (STUB_HOSTS.has(url.host)) {
      event.respondWith(stub());
    } else if (url.origin === self.location.origin) {
      event.respondWith(sameOrigin(request, url));
    } else if (CACHED_EXTERNAL.some((re) => re.test(request.url))) {
      event.respondWith(cachedExternal(request));
    }
  }

  g.lpa = { CACHE_PREFIX, SITE_CACHE, STATIC_CACHE, CACHE_NAMES, onFetch };
})(self);
