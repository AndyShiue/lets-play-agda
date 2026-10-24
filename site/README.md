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
scripts/check.mjs       lint of the generated pages (of every language)
scripts/translate.mjs   the tool for a translation: skeleton, extract, apply, status, check
scripts/e2e.mjs         end-to-end test in a real browser
languages.json          the languages of the site (see "Languages" below)
i18n/<code>.json        the words of the pages and of the script, per language
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
* **Highlighting and links** are done without running Agda (keywords, comments, holes, and
  the names the tutorial declares, coloured like Agda does). Declarations get
  anchors so `Page.html#name` links work, and every use of a declared name is a link
  to its declaration, on the same page or another one (the build does two passes: the
  first finds out which anchors the pages have). The names are resolved by their
  spelling, not by Agda's scoping: the nearest module that declares the name wins (its
  own, then what it imports, `using`/`hiding`/`renaming` ignored: 8 lines of the
  tutorial), the parts of a mixfix name (`+` of `_+_`, `≡⟨` and `⟩` of `_≡⟨_⟩_`) count
  as the name, and a name that the declaration around the use binds itself (a
  parameter, a lambda variable, a variable in the patterns of a clause) is left
  alone. The module that an `import` names (`open import A.B.C`, `import A.B.C as X`)
  links to its page, or for `Cubical.…` to the library's documentation (in a tab of its
  own); `Agda.Primitive` has no page and is only coloured. Names of the libraries are
  not declared by the tutorial and do not link. `Set`, `Set₁`, `Setω` and `Prop` are built into Agda, so
  there is no declaration to go to: they link to Agda's documentation (universe levels,
  `Prop`), in a tab of their own. The `∈` of `Σ[ x ∈ A ]` is notation and does not link
  to the tutorial's `_∈_`. Not available: the type tooltips, which need Agda. Measured on the
  tutorial: 9840 uses of declared names, all linked (a name whose declaration is in a
  block that the page hides would not link: there is none); the identifiers that
  are not linked are almost all local variables. `node scripts/build.mjs --link-report`
  lists the commonest. How right the links are is only spot-checked (`go`, `f`, `g`,
  `id` and the commonest names were looked at: right), not measured.
* **The names a reference solution uses.** Under each exercise (when there is
  something to show) the page lists the names of the earlier material that the
  reference solution uses, except those the exercise shows already: blurred, so that
  they do not give the solution away; a click shows a name, the next click goes to
  its declaration. 397 of the 446 exercises have such a list. It follows from the
  same name resolution, so a name that is linked wrongly can be in a list, and one
  that is not found can be missing.
* **The editor** opens in a panel on the right (an `<iframe src="editor/">`) when
  you press *Edit hole…*. The page and the editor talk over a `BroadcastChannel`;
  the page notices when Agda says *All Done* and records the exercise as solved.
  The reader's code is kept in the browser (IndexedDB), progress in localStorage;
  *Download backup* / *Restore* in the sidebar export and import it. The file Agda
  checks holds the module's earlier code and the exercise's tests as well; the editor
  folds them away (a folding range provider in the editor's extension; the first line of
  a fold stays visible, so the file starts with a line `-- EXERCISE STARTS` for the code
  above the exercise to fold into, and the tests fold into `-- EXERCISE ENDS`), so that
  what is visible is the exercise exactly as the page shows it. A click on a fold shows
  the rest.
* **The symbol bar** (the `∀` button above the editor; on by default where the screen
  is touched). agda-mode's input method (`\to` → `→`) starts from a key press of the
  backslash and keeps its state from key to key; with a phone's keyboard it does not
  work, or only in bits. The bar has no state: the editor's extension looks at the text
  before the cursor, and when a backslash and a few characters are there (in a hole, too)
  the bar lists the candidates of agda-mode's table (`extensions/lets-play-agda-fs/symbols.json`,
  made from agda-mode's own), exact match first and the symbols the tutorial uses most
  next; a tap puts the symbol in place of what was typed. Without a backslash the bar
  shows a backslash button (which a phone's keyboard hides away) and those common symbols,
  which a tap puts in at the cursor. While the bar is on, agda-mode's input method is
  switched off (the page tells the extension), so that the two do not work on the same text.
* **The command bar** (the `λ` button; on by default where the screen is touched), under the
  symbol bar: agda-mode's commands as buttons (Load, Case split, Give, Refine, Auto, Evaluate,
  Goal & context, Next/Previous goal, Infer type, Goal type, Context, Cancel), each with
  the key chord it stands for, because a phone cannot press `C-c C-l` and the like. The list
  is `editor/src/fs-extension/agda-commands.json` (the editor build checks that every command
  in it exists in the agda-mode that is built in); a button runs the command at the cursor,
  as the key chord would. As in Emacs, *Evaluate* inside a hole evaluates what is in the hole
  (the tutorial says to put the expression there), and asks for an expression outside one.
  *Cancel* presses Esc in the prompt of the Agda panel (agda-mode's own command for Esc does
  not take such a prompt away here), and otherwise runs agda-mode's command.
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
* **Languages.** [`languages.json`](languages.json) lists them, in the order of the language menu; one is the
  base (the tutorial's own files, `Padova2025/`, English), every other is a translation. A translation is a site
  of its own in a directory of the main one, `dist/<code>/`, and everything about it follows from its code:

  | | the base (`en`) | a translation (`zh-TW`, say) |
  |---|---|---|
  | its files | `Padova2025/` | `Padova2025-zh-TW/` |
  | its modules | `Padova2025.…` | `Padova2025-zh-TW.…` |
  | its pages | `Padova2025.<Module>.html` | `zh-TW/Padova2025-zh-TW.<Module>.html` |
  | its exercises in the editor | `Exercise/<Chapter>/<Module>/Ex<n>.agda` | `Exercise-zh-TW/…` |
  | its archives | `Padova2025.zip`, `…-solutions.zip` | `zh-TW/Padova2025-zh-TW.zip`, … |

  `lib/languages.cjs` reads the registry and derives these names (the exercise code does not need it: it
  follows the same convention, `splitModuleName` in `exercises.cjs`, because the editor's extension has a copy of
  that file but no list of languages). `build-all.mjs` builds the base and then every translation whose folder is in
  the repository (`build.mjs --lang <code>`); the language menu lists the languages that are there.

  **Adding a language** (`ja`, say): put an entry in `languages.json` (`code`, `name` as the menu shows it,
  `htmlLang`); run `node scripts/translate.mjs --lang ja skeleton`, which creates `Padova2025-ja/` (the original's
  text and code, the modules with the new prefix, the links to the new pages) and `i18n/ja.json` (the base language's
  words); translate the files (`status`, `extract`, `apply`, `check`, as for any translation) and the words (a word
  that is missing is the base language's, the build says so; a plural word has a form per category of
  `Intl.PluralRules`, with `other`); fill in the `sample` of `i18n/ja.json` (the words of the pages that the
  end-to-end test looks for: see `i18n/zh-TW.json`; `npm test` complains until it is); add the rules to
  `src/app.css` that the writing of the language needs, under `:lang(…)` (fonts, emphasis). Then `npm run build` and
  `npm run e2e` handle it like the others. Tested: the build, the menu, the links and the lint with the skeleton of
  a third language (made and removed again); not tested: a translated third language, and the end-to-end test with
  three languages. So far there is one translation.
* **A translation's pages** differ from the base's in a few ways:
  * Pages, links and exercises have the translation's own names (see the table): `PREFIX` in `build.mjs`; the name
    comes from the file's place in the source directory, and the build warns if the file declares another module.
    `data-module` is the translation's module, so the progress of the languages is kept apart. The checks of
    `-- EX:` lines use the equality of the same language (`exercises.cjs`). The editor's workspace holds all the
    trees (`editor/scripts/build-site.mjs`).
  * The language menu in the top bar (a globe; the list opens when it is pressed) lists the languages that are
    there, each a link to the page of the same module in that language (`languageMenu` in `build.mjs`, a few lines
    in `app.js`); the script renews the links when a page is loaded without reloading.
  * The ids of the headings are the original's (`originalHeadingIds`: the build renders the original page's headings
    to get them), otherwise a link such as `Conjunction.html#exercise-de-morgans-laws` would not find its heading
    once the heading is in another language. The numbers of headings agree because `translate.mjs check` says so.
  * Not emitted: the editor, `sw.js`, `404.html`: they are the main site's (the page's `config.root` is `../`, so
    that the editor is `../editor/` and the worker `../sw.js` with scope `../`). The archives are the translation's own.
  * The words around the tutorial are `i18n/<code>.json`: `ui` for what the generator writes (the exercise boxes, the
    top bar, the pager, the footer, the label of Todo), `script` for what `app.js` shows (messages, the copy button,
    the hint toggles; they come with the page, in its `config.words`). The editor's own messages (agda-mode, the
    command bar's names) stay English.
  * The table of Unicode symbols and its hover hints are made from the original's characters (the punctuation of
    another language would otherwise end up in them).
  The end-to-end test reads the pages of every translation, uses the language menu, opens exercises from them (the
  editor is the main site's) and reads one offline.

## Known gaps

* The reader's edits and exercise progress live only in this browser.
* The marker lines around the exercise (`-- EXERCISE STARTS HERE`, hidden by the fold, and
  `-- EXERCISE ENDS`) are ordinary text. Backspace at the start of the first line joins
  it to the hidden marker (the fold opens and the damage is visible), and typing into
  the `-- EXERCISE ENDS` line, which the cursor can step onto, breaks the fold below.
  Undo repairs it.
* Agda's type-checking runs in the browser from the sources: the first start of
  the editor downloads ~30 MB (cached afterwards), and the first load of an
  exercise type-checks the modules it imports (seconds to ~20 s for the cubical
  library). Precompiled `.agdai` files might help; untested.
* Tested in Edge (Chromium) only; not in Safari, Firefox or on phones. The symbol bar is
  tested on a desktop and with a phone-sized touch emulation, not with a phone's keyboard:
  whether the bar stays above an on-screen keyboard (the page asks for
  `interactive-widget=resizes-content`, which Safari does not support) and what the
  keyboards of real phones do is unknown. The symbol bar inserts into the editor only, not
  into the prompt of the Agda panel (`C-c C-v`).
* The command bar's buttons run agda-mode's commands; their results (the Agda panel) and
  prompts are agda-mode's. Only *Load*, *Goal & context*, *Evaluate* and *Cancel* are
  covered by the end-to-end test; the others (Case split, Give, Refine, Auto, …) use the same
  path, but nothing checks what they do.
* The tutorial's text still mentions Emacs key bindings in places. `C-c C-v` (evaluate
  an expression) works, as the tutorial says: the editor's extension binds it to
  agda-mode's "compute normal form", which is `C-c C-n` there, a key a browser keeps for
  a new window.
* The sidebar's activity/streak display of the old site is not reimplemented.
* The translation: a translated page is available offline only once it has been read, and
  its progress is kept apart from the English site's. Of the translation's exercises only
  the first of the Booleans page and the first of the Operators page (which imports another
  module of the translation) have been opened in the editor and checked by Agda (end-to-end
  test); the rest has the same code as the original, but nothing has checked every one.
