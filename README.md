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
* A **Traditional Chinese translation** (zh-TW) of the whole tutorial, at
  <https://andyshiue.github.io/lets-play-agda/zh-TW/>; every page links to the same page in
  the other language (see [the translation](#the-traditional-chinese-translation)).
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

[`Padova2025-zh-TW/`](Padova2025-zh-TW) is a translation of `Padova2025/` into Traditional
Chinese, so an adaptation: it is under the same license (CC BY-SA), the original author and
contributors are credited in its pages (the footer, and the translated
[Welcome/About](Padova2025-zh-TW/Welcome/About.lagda.md), whose credits are those of the
original), and what was changed is this: the prose is translated; the Agda code is the original's
except that module names begin with `Padova2025-zh-TW.` instead of `Padova2025.`.

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
| [`Padova2025-zh-TW/`](Padova2025-zh-TW) | the Traditional Chinese translation of the tutorial, same file names (see below); its [`padova2025-zh-TW.agda-lib`](Padova2025-zh-TW/padova2025-zh-TW.agda-lib) is a copy of the one above |
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


## The Traditional Chinese translation

[`Padova2025-zh-TW/`](Padova2025-zh-TW) holds the whole tutorial in Traditional Chinese (as
written in Taiwan): the same 106 files under the same names. The site deploys it to `/zh-TW/`
(<https://andyshiue.github.io/lets-play-agda/zh-TW/>); the pages have the same names as the
English ones, and a button in the top bar (`EN` / `繁中`) goes to the same page in the other language.

* **What is translated, and what is not.** The prose and the *comments* in the code are
  translated, and the links are the translation's own: to its pages
  (`Padova2025-zh-TW.<Module>.html`, `Padova2025-zh-TW.zip`), and to the Chinese article where
  Wikipedia has one (nine links; `McCarthy 91 function` and `Separation logic` have none and
  stay English; the link for Bertrand's postulate goes to the Chinese article about the theorem,
  not to one about its proof: whether that article has the proof was not checked). Not translated: the Agda
  code (types, functions and variables keep their names), formulas (they only contain those
  names), the markers the build reads (`-- Holify`, `-- Tests`, `-- EX:`), commented-out code,
  Agda's own error messages quoted in comments, the notes inside hidden HTML comments
  (not shown on the page), and the titles of papers. One more change in the code: module
  names begin with `Padova2025-zh-TW.` (`module Padova2025-zh-TW.ProgrammingBasics.Booleans`),
  because Agda wants a module's name to say where it lives. Terms that do not translate well
  stay in English (hole, goal, case split, pattern matching, universe level, `Set`, …); the
  rest follows the usage in Taiwan (型別, 函數, 命題, 證明, 遞迴, 歸納法, 串列, 依值型別, 見證, …).
* **`node scripts/translate.mjs check`** (in `site/`) verifies the translation paragraph by
  paragraph: the same blocks, the same code (with the prefix, the words of comments aside),
  the same inline code, formulas, link targets (to the translation's pages, or Wikipedia), HTML tags,
  fences and list items. `status` counts the translated paragraphs,
  `extract` and `apply` are for working on a batch of files (see the header of the script).
  Whether the Chinese is *good* is nothing a script can tell: **the translation was drafted with
  an AI (Claude) and has not been proofread by a person.**
* **Agda.** `padova2025-zh-TW.agda-lib` is a copy of `padova2025.agda-lib`. It is inside the
  folder because two `.agda-lib` files in one directory are an error in Agda. According to
  Agda's documentation, the library of a file is found from the file's module name (the root
  of `Padova2025-zh-TW.X.Y` is the directory above `Padova2025-zh-TW/`, here the repository
  root), so the translation's modules load with the library at the root. Tested in the site's
  editor (Agda 2.8.0 as WebAssembly, `padova2025.agda-lib` at the workspace root, both trees
  in it): the first exercise of `Booleans` and the first of `Operators` (which imports the
  translation's `Booleans`) type-check as they should. **Not tested:** the other exercises, and
  a native Agda on the files of the repository.
* **The site.** `site/scripts/build-all.mjs` builds the English site and then the translation into
  `dist/zh-TW/` (`build.mjs --lang zh-TW --source ../Padova2025-zh-TW --root ../`). Pages keep
  the original's names and the ids of their headings are the original's too (so that links and
  bookmarks work in both languages); the editor, the service worker and the archives are
  the main site's. The words around the tutorial (buttons, messages, the exercise boxes) are
  in `UI` of `build.mjs` and `STRINGS` of `src/app.js`.

Limitations of the translation:

* *Edit hole…* on a translated page opens the translation's exercise file
  (`Exercise-zh-TW/<Chapter>/<Module>/Ex<n>.agda`, of the translation's modules, with its Chinese
  comments). Agda's own output in the editor (goals, errors) stays English. Progress and the
  reader's code are kept apart from the English site's: solving an exercise in one language
  does not mark it in the other.
* A translated page works offline once it has been read; only the English pages are
  stored up front.
* The archives of the translation (`Padova2025-zh-TW.zip`, with holes, and
  `Padova2025-zh-TW-solutions.zip`) hold its folder and the library file at the root, as the
  English ones hold theirs.
* The upstream text says that Cohen's forcing was a technique of the 1970s (Cohen's work was
  from 1963); the translation keeps what the original says.


## Status

* End-to-end tested in Edge (Chromium) against a GitHub-Pages-like server: reading, the
  editor, solving an exercise, progress, offline. Opening the first and the last exercise
  of every module in the editor works. Not tested: Safari, Firefox, phones, real GitHub Pages
  and the deployment workflow.
* The tutorial's text still mentions Emacs key bindings in a few places. `C-c C-v`
  (evaluate an expression; a custom binding of the original setup, needed because a browser
  keeps `C-n` for a new window) works: the editor binds it to the command of agda-mode's `C-c C-n`.
* Without Agda's own highlighting, identifiers show no type on hover (symbols show how to
  type them). Uses of names the tutorial declares are links to their declarations, found by
  the spelling of the name rather than by Agda's scoping (see `site/README.md`).
* The first start of the editor downloads about 30 MB (cached afterwards), and Agda needs a few
  to ~20 seconds to check the modules an exercise imports.
