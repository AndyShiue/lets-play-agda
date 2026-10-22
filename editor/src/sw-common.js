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
 * The build id in CACHE_NAME below is filled in by scripts/build-site.mjs.
 */
(function (g) {
  'use strict';

  const CACHE_PREFIX = 'lpa-editor-';
  const CACHE_NAME = CACHE_PREFIX + '__BUILD_ID__';

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

  async function sameOrigin(request, url) {
    const cache = await caches.open(CACHE_NAME);
    const key = cacheKey(request, url);
    // Only the top-level page is network-first (so that a new deployment is
    // noticed); everything else, iframes included, is cache-first.
    const isPage = request.mode === 'navigate' && request.destination === 'document';

    if (!isPage) {
      const hit = await cache.match(key);
      if (hit) return isolate(hit);
    }

    try {
      const net = await fetch(request);
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
    const cache = await caches.open(CACHE_NAME);
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

  g.lpa = { CACHE_PREFIX, CACHE_NAME, onFetch };
})(self);
