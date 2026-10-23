# The tutorial site

A static website generated from the literate Agda sources in `../Padova2025`,
with an in-browser Agda editor embedded next to every exercise. No backend, no
runtime dependencies (the generator is plain Node.js), no Nix.

It replaces the previous setup of the original project (Emacs in a sandbox on a
server, built with Nix), none of whose code is used here. The tutorial content
(`../Padova2025/**.lagda.md`) is by Ingo Blechschmidt and contributors, CC BY-SA;
see the [top-level README](../README.md) for credits and licenses.

## Layout

```
scripts/build-all.mjs   editor + site, with one build id
scripts/build.mjs       the site generator
scripts/lib/            Markdown renderer, Agda highlighter, exercise conventions
scripts/check.mjs       lint of the generated pages
scripts/e2e.mjs         end-to-end test in a real browser
src/app.css, app.js     the site's styles and client code
../editor/              the editor (VS Code for the Web + Agda WASM), see its README
```

## Build and run

```sh
cd ../editor && npm run fetch          # once: downloads VS Code (dev build), agda-mode, cubical
cd ../site && npm run build            # -> dist/
npm run serve                          # http://localhost:8080/lets-play-agda/
```

`npm run build` accepts `--vscode <dir>` etc. (see `scripts/build-all.mjs`) to
use inputs from elsewhere. `npm run check` lints the pages; `npm run e2e` needs
`npm install` (Playwright) and Edge or Chrome.

For publishing, `.github/workflows/pages.yml` builds VS Code for the Web from its
MIT-licensed sources (the dev build `fetch` downloads is Microsoft-licensed and
must not be published) and deploys to GitHub Pages. That workflow has not been
run yet.

## How the pieces fit

* **Pages.** Every `.lagda.md` becomes `Padova2025.<Module>.html` (the Welcome
  page is `index.html`), so the links inside the content keep working. The table
  of contents is the import structure, as before. Everything is relative, so the
  site works under any base path (GitHub Pages project sites).
* **Content conventions** (`scripts/lib/exercises.cjs`, shared with the editor):
  blocks with `{--}…{--}` or `-- Holify` are exercises (446 of them); the page
  shows them with holes `{!!}` and offers the reference solution; `-- Tests` /
  `-- EX:` lines become checks that Agda runs by `refl`.
* **Highlighting** is done without running Agda (keywords, comments, holes, and
  the names the tutorial declares, coloured like Agda does). Declarations get
  anchors so `Page.html#name` links work. Not available any more: clickable
  references from every identifier to its definition and the type tooltips, which
  need Agda to resolve names.
* **The editor** opens in a panel on the right (an `<iframe src="editor/">`) when
  you press *Edit hole…*. The page and the editor talk over a `BroadcastChannel`;
  the page notices when Agda says *All Done* and records the exercise as solved.
  The reader's code is kept in the browser (IndexedDB), progress in localStorage;
  *Download backup* / *Restore* in the sidebar export and import it. The file Agda
  checks holds the module's earlier code and the exercise's tests as well; the editor
  folds them away (a folding range provider in the editor's extension, and an empty first
  line of the file for the upper fold to collapse into), so that what is visible is the
  exercise exactly as the page shows it. A click on a fold shows the rest.
* **Cross-origin isolation.** Agda's WebAssembly build needs `SharedArrayBuffer`,
  which browsers only enable for pages with `Cross-Origin-Opener-Policy` and
  `Cross-Origin-Embedder-Policy` headers. GitHub Pages cannot send them, so a
  service worker at the site root (`sw.js`) adds them, and caches the site for
  offline use. Reading works without it; the first time you press *Edit hole…*
  the page reloads once so that the headers apply. An editor in an iframe can only
  use `SharedArrayBuffer` if the page around it is isolated too, which is why the
  worker covers the whole site.
* **Updates.** A new deployment has a new build id. The worker checks for a new
  `sw.js` whenever a page loads, when the tab becomes visible and every 30 minutes
  (`updateViaCache: 'none'`, so that the imported `sw-common.js`, which carries the
  id, is not served from the HTTP cache), installs and takes over at once
  (`skipWaiting`), and the page offers a reload ("A new version of this site is
  available"; a tab in the background reloads by itself). Two things matter for this to
  work on GitHub Pages: files stay in the browser's HTTP cache for 10 minutes there, so
  everything the worker fetches is revalidated (`cache: 'no-cache'`), otherwise a new
  worker would store the previous deployment's files; and there are two caches: the
  site's own files per build, and the VS Code files (about 60 MB) per VS Code identity,
  so a deployment that leaves VS Code alone does not make readers download it again.
  The editor's own files are cached when first used, so after an update they are fetched
  again the next time the page loads (the reload the notice asks for): offline use of
  the editor needs one online visit with the new version.
  The end-to-end test simulates a deployment and checks all of this.
* **If the service worker ever misbehaves:** open any page with `?nosw` to remove
  it and its caches.

## Known gaps

* The reader's edits and exercise progress live only in this browser.
* The two marker lines around the exercise (`-- EXERCISE STARTS` / `ENDS`) are ordinary
  text. Folded, they are mostly out of reach, but Backspace at the start of the first
  line joins it to the first marker (the fold opens and the damage is visible), and
  typing on the lines the cursor can step onto above and below the exercise changes
  them. Undo repairs it.
* Agda's type-checking runs in the browser from the sources: the first start of
  the editor downloads ~30 MB (cached afterwards), and the first load of an
  exercise type-checks the modules it imports (seconds to ~20 s for the cubical
  library). Precompiled `.agdai` files might help; untested.
* Tested in Edge (Chromium) only; not in Safari, Firefox or on phones.
* The tutorial's text still mentions Emacs key bindings in places; `C-c C-v`
  (a custom Emacs binding) does not exist in agda-mode for VS Code (`C-c C-n`).
* The sidebar's activity/streak display of the old site is not reimplemented.
