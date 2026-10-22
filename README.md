# Let's play Agda

An interactive tutorial for the proof assistant [Agda](https://agda.readthedocs.io/),
as a **static website**: the text, the exercises and an Agda editor all run in your
browser. There is no server to host and no installation for readers.

* Programming and proving in Agda, from Booleans to verified algorithms and
  Cubical Agda: 106 pages and 446 exercises.
* Next to every exercise, a VS Code editor with [agda-mode](https://github.com/banacorn/agda-mode-vscode)
  opens in the page. Agda itself runs in the browser (as WebAssembly), so
  *C-c C-l*, case splitting, goals and the rest work as on a desktop.
* Progress, your solutions and a streak calendar stay in your browser; you can back
  them up and restore them. Everything also works offline once visited.
* Deployed to GitHub Pages by GitHub Actions. No Nix, no Docker, no backend.


## Credits and license

**The tutorial was created by [Ingo Blechschmidt](https://www.ingo-blechschmidt.eu/)**
(University of Antwerp) for a 2025 course at the
[University of Padova](https://www.unipd.it/en/dm) organized by
[Milly Maietti](https://www.math.unipd.it/~maietti/), and was improved by many
contributors and course participants (see
[Welcome/About](Padova2025/Welcome/About.lagda.md)). This repository is a fork of
his project:

* original site: <https://lets-play-agda.quasicoherent.io/>
* original repository: <https://github.com/iblech/lets-play-agda>

**The text and the Agda code of the tutorial (everything in [`Padova2025/`](Padova2025))
are licensed under [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/).**
If you reuse or adapt them, you must credit the original author and contributors
as above, link to the license, indicate what you changed, and share adaptations
under the same license. The generated website is an adaptation and carries the same
license (its pages credit the original author in their footer). The original
repository's README says "CC BY-SA" without naming a version; this repository links
version 4.0, so check with the original author if the exact version matters to you.

Changes made to the tutorial files in this repository: only
[`Padova2025/Welcome/About.lagda.md`](Padova2025/Welcome/About.lagda.md) was edited
(a note about this version, and an updated description of the technology; its
credits are those of the original). Everything else about the presentation is
generated from the files as they are.

**The code in this repository (`site/`, `editor/`, `.github/`) is licensed under
[AGPL-3.0-or-later](https://www.gnu.org/licenses/agpl-3.0.html)**, the license of the
original project's code. It was written from scratch for this static version, but it
implements the exercise conventions of the original project's build scripts, so it
uses the same license to be safe.

At run time the site uses these projects, built from their sources or downloaded
as noted: [Visual Studio Code for the Web](https://github.com/microsoft/vscode)
(Code - OSS, MIT; built from source in CI), [agda-mode for VS Code](https://github.com/banacorn/agda-mode-vscode)
(MIT, Ting-Gian Lua), the [ALS WASM Loader](https://github.com/qbane/vscode-als-wasm-loader)
(MIT, Pan Kuang-Lin), the WebAssembly build of the
[Agda Language Server](https://github.com/agda/agda-language-server) and Agda from
the [Agda Web](https://agda-web.github.io/) project (npm package `agda-wasm`, MIT; fetched
from unpkg on first use), the [cubical library](https://github.com/agda/cubical)
(MIT, with exceptions for individual files) and [Agda](https://github.com/agda/agda).


## Build and run it

You need Node.js 20 or newer (the site generator has no other dependencies).

```sh
cd editor && node scripts/fetch-inputs.mjs
```

downloads, for local development only, the VS Code build that Microsoft distributes
(about 55 MB; its license does not allow publishing it, see below), the two VS Code
extensions and the cubical library into `editor/.cache`. Then

```sh
cd site && npm run build && npm run serve
```

builds the site into `site/dist` and serves it at <http://localhost:8080/lets-play-agda/>
as GitHub Pages would (without any special headers). Open an exercise and press
*Edit hole…*.

Other commands in `site/`: `npm test` (unit tests of the exercise conventions),
`npm run check` (lint of the generated pages), `npm run e2e` (end-to-end test in
Edge or Chrome, needs `npm install` for Playwright).


## Deployment

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds VS Code for the Web
from the MIT-licensed sources of `microsoft/vscode` (a pinned commit, cached), builds
the site and deploys it to GitHub Pages. Set *Settings → Pages → Source* to
*GitHub Actions*. **This workflow has not been run on GitHub yet.**

Never publish a site built with the Microsoft binary that `fetch-inputs.mjs` downloads:
the build script marks such a build with `DEV-BUILD-DO-NOT-PUBLISH.txt`.


## Repository layout

| | |
|---|---|
| [`Padova2025/`](Padova2025) | the tutorial: literate Agda in Markdown (`*.lagda.md`), CC BY-SA |
| [`padova2025.agda-lib`](padova2025.agda-lib) | Agda library file, for working with a local Agda |
| [`site/`](site/README.md) | the site generator, the client code (navigation, progress, the editor panel) and the end-to-end test |
| [`editor/`](editor/README.md) | the in-browser editor: VS Code for the Web, agda-mode, Agda as WebAssembly, and a service worker |
| [`.github/workflows/pages.yml`](.github/workflows/pages.yml) | build and deployment |

The older setup of the original project (Emacs in a sandbox on a server, behind
nginx and ttyd, built with Nix) is not part of this repository any more; see the
original repository if you need it.


## How it works, in short

* `site/` turns every `*.lagda.md` into a page (`Padova2025.<Module>.html`), colours
  the Agda code without running Agda, and offers every exercise with holes and a
  reference solution. The table of contents is the import structure of the modules.
* Pressing *Edit hole…* opens the editor in an `<iframe>`. The editor generates a
  file for that exercise (all code before it, the exercise with holes, its tests),
  and Agda checks it in the browser. When Agda reports *All Done*, the page records
  the exercise as solved.
* Agda's WebAssembly build needs `SharedArrayBuffer`, which browsers only enable for
  pages sent with COOP/COEP headers. GitHub Pages cannot send them, so a service worker
  adds them (and caches the site for offline use). Details and the reasons for
  the design are in [`site/README.md`](site/README.md) and [`editor/README.md`](editor/README.md).


## Writing exercises

The files in `Padova2025/` are valid Agda: they contain the **solutions**. Markers
turn a code block into an exercise:

```agda
double : ℕ → ℕ
-- Holify
double n = n + n

-- Tests
-- EX: double 3 ≡ 6
```

* `-- Holify` says: everything after it is the solution; the exercise shows
  `double = {!!}`. Alternatively wrap a solution in `{--}…{--}`, which is an Agda
  comment around it: `f = {--}x + y{--}` is shown as `f = {!!}`.
* `-- Tests` followed by `-- EX: <claim>` lines adds checks (`<claim>` is proved by
  `refl`) to the exercise's file; they are not shown in the page.
* Fenced blocks without a language are Agda code; blocks such as ` ```code ` are only
  displayed. Code inside `<!-- … -->` is Agda code that is not displayed (used for
  module headers).
* `# Title // Page heading` gives a short title for the table of contents and a longer
  one for the page. `::: Hint :::`, `::: More :::`, `::: Aside :::` and `::: Todo :::`
  open boxes closed by `:::`.

The pages of the table of contents are the modules reached from
`Padova2025/Index.lagda.md` through plain `import` lines.


## Status

* End-to-end tested in Edge (Chromium) against a GitHub-Pages-like server: reading, the
  editor, solving an exercise, progress, offline. Opening the first and the last exercise
  of every module in the editor works. Not tested: Safari, Firefox, phones, real GitHub Pages
  and the deployment workflow.
* The tutorial's text still mentions Emacs key bindings in a few places; `C-c C-v`
  (a custom binding of the original setup) is `C-c C-n` in agda-mode for VS Code.
* Without Agda's own highlighting, identifiers in code are not clickable and show no type on
  hover (symbols show how to type them).
* The first start of the editor downloads about 30 MB (cached afterwards), and Agda needs a few
  to ~20 seconds to check the modules an exercise imports.
