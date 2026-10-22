/*
 * Replaces VS Code's webview service worker (.../webview/browser/pre/service-worker.js).
 * The original is kept next to it as service-worker-orig.js and loaded unchanged.
 *
 * Why: VS Code registers that service worker with a scope that is narrower
 * than the editor's. Once it is registered, navigations to the webview pages
 * (pre/index.html, pre/fake.html) no longer pass through the editor service
 * worker, so they would be served without COEP and be blocked inside the
 * cross-origin isolated editor page. This wrapper adds the same behaviour
 * (cache + isolation headers) for that narrower scope.
 *
 * The file must stay named service-worker.js: the original derives its root
 * path from the name of the registered script.
 */
import './service-worker-orig.js';
import './sw-common.js';

self.addEventListener('fetch', self.lpa.onFetch);
