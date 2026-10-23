# Browser editor (VS Code for the Web + Agda WASM)

Status: **prototype**. It proves that a fully static site can host VS Code for
the Web with `agda-mode`, running Agda 2.8.0 as WebAssembly in the browser,
with no backend. Not wired into the tutorial pages yet.

## How it works

```
index.html ── bootstrap.js ──► registers sw.js, reloads once, then boots VS Code
sw.js ── sw-common.js         adds COOP/COEP headers, precaches + caches everything
vscode/                       VS Code for the Web build (static files)
extensions/agda-mode          banacorn.agda-mode (MIT), web bundle
extensions/als-wasm-loader    qbane.als-wasm-loader (MIT)
extensions/lets-play-agda-fs  our tiny file system provider (`lpa:` scheme)
workspace/                    the tutorial's .lagda.md files + the cubical library
```

* **Why a service worker?** The Agda WASM build needs `SharedArrayBuffer`, which
  browsers only enable on cross-origin isolated pages (COOP + COEP response
  headers). GitHub Pages cannot send custom headers, so `sw.js` re-serves every
  same-origin response with those headers. The first visit installs the worker
  and reloads once.
* **Webviews.** VS Code registers its own, narrower service worker for its
  webviews (the Agda panel is one). `scripts/build-site.mjs` keeps it as
  `service-worker-orig.js` and puts a small wrapper (`src/webview-sw.js`) in its
  place so that those iframes get the isolation headers, too. The extension host
  runs from the same origin (VS Code supports this); webviews are not supposed
  to, because VS Code checks that their host name is derived from the parent's
  origin (one sub-domain per webview, which static hosting cannot give us).
  `scripts/build-site.mjs` therefore patches the webview host page
  (`pre/index.html`) in two places, and updates the page's CSP hash accordingly:
  1. skip the host-name check when the parent has the same origin,
  2. do not fail when the forced service-worker update check cannot reach the
     network (offline).

  The build stops with an error if VS Code changes and a patch no longer
  applies. Only the bundled, trusted extensions run, so same-origin webviews are
  acceptable here; do not offer an extension marketplace without revisiting this.
* **Caching.** `sw.js` precaches the core files and caches everything else on
  first use (cache-first, keyed by the build id, old caches are deleted on
  activation; navigations are network-first). `als.wasm` and the library zip
  that `agda-mode` fetches from unpkg / GitHub are cached, too. Requests that
  stock VS Code sends to Microsoft hosts (telemetry, experiments) are answered
  locally.
* **Important:** isolation is per top-level page. The editor must be its own
  page (or the page embedding it must be isolated itself); an `<iframe>` inside
  a non-isolated tutorial page cannot use `SharedArrayBuffer`.

## Embedded in the tutorial site

`../site` publishes this editor under `editor/` and shows it in an `<iframe>` next
to the exercises (`npm run build` there passes `--no-own-sw --sw ../sw.js --sw-scope ../`
so that the site's root service worker, not an own one, makes everything isolated).
`editor/?embedded=1&theme=dark` selects the look; the editor then has no side bar
or tabs of its own.

The page and the editor talk over a `BroadcastChannel` named `lpa-editor`
(see `src/fs-extension/extension.js`):

| page → editor | meaning |
|---|---|
| `{t:'open', module, ordinal}` | open exercise `ordinal` (1-based) of `module` (`Padova2025.…`) |
| `{t:'get-code', module, ordinal}` | send the reader's solution (the part between the markers) |
| `{t:'ping'}` | are you there? |

| editor → page | meaning |
|---|---|
| `{t:'ready'}` | the extension is active |
| `{t:'opened', module, ordinal, path}` | the exercise file `lpa:<path>` is open |
| `{t:'code', module, ordinal, text}` | the solution |
| `{t:'error', message}` | something went wrong |

An exercise's file is generated from the tutorial source by the conventions in
`../site/scripts/lib/exercises.cjs` (all earlier code blocks, then the exercise
with holes, then its tests) under `Exercise/<Chapter>/<Module>/Ex<n>.agda`, with a
module name of its own so that it never clashes with the solution module that other
modules import. The reader's code (the part between the markers) is kept in
IndexedDB and put back when the exercise is opened again; the rest of the file is
regenerated, so updates of the tutorial text reach readers who have started.

## Commands

```sh
npm run fetch      # download inputs into .cache/ (see below)
npm run build      # assemble dist/
npm run serve      # GitHub-Pages-like server: http://localhost:8080/lets-play-agda/editor/
npm run e2e        # end-to-end test (needs playwright-core and Edge/Chrome)
```

`npm run e2e` needs `npm install` (Playwright) and a Chromium-based browser
installed (Edge by default, `E2E_CHANNEL=chrome` for Chrome). It starts the
Pages-like server itself and runs three visits in a fresh browser profile:

1. cold: the service worker installs, the page reloads and becomes isolated,
   VS Code starts, Agda type-checks `Padova2025/Cubical/FirstSteps.lagda.md`
   (which imports `Cubical.Foundations.Prelude`);
2. warm: nearly nothing should reach the server, nothing external;
3. the server is stopped: the editor must still start and check Agda.

`npm run build -- --vscode <dir> --agda-mode <dir> --als-loader <dir> --cubical <dir>`
takes the inputs from elsewhere.

## Measured (Edge, Windows, local GitHub-Pages-like server, 2026-10-22)

| | cold visit | warm visit | server stopped |
|---|---|---|---|
| cross-origin isolated | yes (after one automatic reload) | yes | yes |
| `Agda: Load` of `FirstSteps` (cubical prelude) | ~29 s, incl. ~9 MB `als.wasm` from unpkg | ~21 s | ~20 s |
| requests that reach the server | 170 | 13 | – |
| external requests that hit the network | 1 (`als.wasm`) | 0 | 0 |

Cache Storage after a visit: 146 entries, ~62 MB (origin storage ~82 MB in total).
The 13 remaining requests on a warm visit are 404s for pruned built-in extension
code (`github-authentication`, `emmet`, …; 404s are not cached) and the service
worker's own update check. Not tested: Safari, Firefox, mobile, real GitHub Pages.

## Licensing: read before publishing

* `npm run fetch` downloads the VS Code for the Web build that **Microsoft
  distributes** (`update.code.visualstudio.com`). Its license
  ("Microsoft Visual Studio Code" terms) does not allow redistribution on a
  public site. **Use it for local development only**; the build script writes
  `dist/DEV-BUILD-DO-NOT-PUBLISH.txt` when it detects it.
* For publishing, build VS Code for the Web from the MIT-licensed sources
  (`microsoft/vscode`, `npm ci && npm run gulp vscode-web-min`, Node version
  from its `.nvmrc`) in CI and pass the result with `--vscode`. Not done yet.
* agda-mode and the ALS WASM loader are MIT; cubical is MIT; the tutorial
  content is CC BY-SA; the code in this directory is AGPL-3.0-or-later like the
  rest of the frontend.

## Hidden files do not survive publishing

GitHub's `actions/upload-pages-artifact` leaves out hidden files (names starting
with a dot). The editor once depended on `workspace/.vscode/settings.json` (it tells
Agda where the cubical library is); on the published site that file was a 404 and
every exercise failed with `Library 'cubical' not found`. The settings are now a
plain file, `workspace-settings.json`, which the file system extension presents to
VS Code as `/.vscode/settings.json`, and `site/scripts/check.mjs` fails the build
if the site contains a hidden file of ours.

## Known gaps / TODO

* Edits to ordinary files live in memory only (`extensions/lets-play-agda-fs`);
  only the exercises' code is kept (IndexedDB), see below.
* `als.wasm` (~9 MB over the wire) still comes from unpkg on the first visit;
  self-host it and map the URL in `sw-common.js`.
* Every page load type-checks the cubical prelude from scratch (~15–20 s). Try
  shipping precompiled `.agdai` files.
* The whole `vscode/` tree is ~95 MB; prune it further once the source build
  exists. Pruned built-in extensions still show a few "Not Found" errors in the
  console (their code is missing on purpose); answer those requests in the
  service worker or drop the extensions from the build's built-in list.
* The tutorial says `C-c C-v` evaluates an expression (a custom Emacs binding of the
  original setup; agda-mode for VS Code has `C-c C-n`, which a browser keeps for a new
  window). `lets-play-agda-fs/package.json` binds `C-c C-v` to the same command
  (`agda-mode.compute-normal-form[DefaultCompute]`, with agda-mode's own `when` clause).
  Without it the keys are Copy and Paste, which duplicates the current line.
