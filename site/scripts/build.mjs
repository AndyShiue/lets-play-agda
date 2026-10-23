#!/usr/bin/env node
/*
 * Generates the tutorial site from ../Padova2025/**.lagda.md into dist/.
 *
 *   node scripts/build.mjs [--out dist] [--build-id <id>] [--editor-dist <dir>] [--strict]
 *
 * --editor-dist  a built editor (../editor) to publish under dist/editor/
 * --strict       fail on broken internal links
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, plainText } from './lib/markdown.mjs';
import { highlight, collectDeclarations, addOperatorParts } from './lib/agda.mjs';
import { createZip } from './lib/zip.mjs';

const require = createRequire(import.meta.url);
const ex = require('./lib/exercises.cjs');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const repo = path.resolve(root, '..');

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const out = path.resolve(process.cwd(), option('out', path.join(root, 'dist')));
const editorDist = option('editor-dist');
// A translation (zh-TW) is a site of its own in a directory of the main one: the same pages under the
// same names, the editor and the service worker of the main site (--root: from a page to its root).
const lang = option('lang', 'en');
const originalDir = path.join(repo, 'Padova2025');
const sourceDir = path.resolve(process.cwd(), option('source', originalDir));
const siteRoot = option('root', './');
const standalone = siteRoot === './';
const withEditor = !!editorDist || argv.includes('--with-editor');
const alternate = option('alternate'); // where the same page is in the other language, from a page, and what to call it
const alternateLabel = option('alternate-label', '');
// agda-mode's data about the Unicode input method (for the hover hints), if available
const agdaModeDir = path.resolve(process.cwd(), option('agda-mode', path.join(repo, 'editor', '.cache', 'ext', 'agda-mode')));
const strict = argv.includes('--strict');

const SITE_NAME = "Let's play Agda";
const REPO_URL = 'https://github.com/AndyShiue/lets-play-agda';
const UPSTREAM_URL = 'https://github.com/iblech/lets-play-agda';
// The pages are named after the modules, and a translation's modules have a prefix of their own
// (`Padova2025-zh-TW.ProgrammingBasics.Booleans`), so its pages, links and exercises are its own.
const PREFIX = lang === 'zh-TW' ? 'Padova2025-zh-TW' : 'Padova2025';
const OTHER_PREFIX = lang === 'zh-TW' ? 'Padova2025' : 'Padova2025-zh-TW';
const SKIP_IN_TOC = new Set([`${PREFIX}.ProvingBasics.Equality.Reasoning.Core`, 'Agda.Primitive']);

// The words of the page around the tutorial (the tutorial's own text is in the source files).
// The script (src/app.js) has its own, for what it shows.
const UI = lang === 'zh-TW' ? {
  exercise: '習題', editHole: '✏️ Edit hole…', editHoleTitle: '開啟編輯器，編輯這個習題的 hole',
  uses: '參考解答用到：', hintTitle: '點一下顯示；再點一下前往它的宣告處',
  yourSolution: '你的解答', referenceSolution: '參考解答',
  prev: '上一頁', next: '下一頁', pager: '上一頁與下一頁',
  navToggle: '顯示或隱藏目錄', searchPlaceholder: '搜尋…', searchLabel: '搜尋教學', themeToggle: '切換深色模式',
  editorToggle: '顯示或隱藏編輯器', toc: '目錄', backup: '下載備份', restore: '還原',
  editor: '編輯器', resize: '拖曳以調整大小',
  commandsTitle: '把 Agda 指令做成按鈕（載入、case split、give 等）', commands: 'Agda 指令',
  symbolsTitle: '符號列：輸入反斜線與幾個字母，再點選符號', symbols: '符號列', symbolsGroup: '符號',
  restart: '重新啟動編輯器', close: '關閉編輯器', wip: '施工中', anchor: '連結到這一節',
} : {
  exercise: 'Exercise', editHole: '✏️ Edit hole…', editHoleTitle: '',
  uses: 'The reference solution uses:', hintTitle: 'Click to show; click again to go to its declaration',
  yourSolution: 'Your solution', referenceSolution: 'Reference solution',
  prev: 'Previous', next: 'Next', pager: 'Previous and next page',
  navToggle: 'Show or hide the table of contents', searchPlaceholder: 'Search…', searchLabel: 'Search the tutorial', themeToggle: 'Toggle dark mode',
  editorToggle: 'Show or hide the editor', toc: 'Table of contents', backup: 'Download backup', restore: 'Restore',
  editor: 'Editor', resize: 'Drag to resize',
  commandsTitle: 'Agda commands as buttons (load, case split, give, …)', commands: 'Agda commands',
  symbolsTitle: 'Symbol bar: type a backslash and a few letters, then tap the symbol', symbols: 'Symbol bar', symbolsGroup: 'Symbols',
  restart: 'Restart the editor', close: 'Close the editor', wip: 'Under construction', anchor: 'Link to this section',
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');

// ---------------------------------------------------------------------------
// 1. read the modules
// ---------------------------------------------------------------------------
const modules = new Map();
/** The ids that the headings of a page get from the original's words: a translated page keeps them, so a link to a section works in both languages. */
function originalHeadingIds(original) {
  if (original === undefined) return undefined;
  const env = { headings: [], usedIds: new Set(), unknownTex: new Set(), rewriteUrl: (url) => ({ href: url }), renderCode: () => '' };
  renderMarkdown(ex.moduleInfo(original).text, env);
  return env.headings.map((h) => h.id);
}
/** The source of the same page in the original (for a translation). */
function readOriginal(file) {
  const original = path.join(originalDir, path.relative(sourceDir, file));
  return sourceDir !== originalDir && fs.existsSync(original) ? fs.readFileSync(original, 'utf8') : undefined;
}
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.lagda.md')) {
      const rel = path.relative(repo, full).split(path.sep).join('/');
      // the pages are named after the modules: the file's place in the source directory names it
      const name = PREFIX + '.' + path.relative(sourceDir, full).split(path.sep).join('/').replace(/\.lagda\.md$/, '').replace(/\//g, '.');
      const source = fs.readFileSync(full, 'utf8');
      const info = ex.moduleInfo(source);
      if (info.name !== name) console.warn(`warning: ${rel} declares module ${info.name}, not ${name}`);
      const deps = [];
      for (const b of info.blocks) {
        if (b.kind === 'agda') b.text.replace(/^\s*(?:open\s+)?import\s+([\w.'-]+)/gm, (_, m) => deps.push(m));
      }
      const original = readOriginal(full);
      modules.set(name, { name, rel, source, original, info, deps, decls: new Map(), headingIds: originalHeadingIds(original) });
    }
  }
})(sourceDir);
for (const mod of modules.values()) {
  for (const b of mod.info.blocks) if (b.kind === 'agda') collectDeclarations(ex.isExercise(b) ? ex.solutionDisplay(b.text) : b.text, mod.decls);
}

/**
 * Names visible in a module: its own declarations and those of everything it imports
 * (the nearest declaration of a name wins), with the module each is declared in.
 * `using`, `hiding` and `renaming` are not looked at (8 import lines of the tutorial).
 */
function visibleNames(name) {
  const result = new Map();
  const seen = new Set();
  (function visit(n) {
    if (seen.has(n) || !modules.has(n)) return;
    seen.add(n);
    for (const [k, v] of modules.get(n).decls) if (!result.has(k)) result.set(k, { kind: v, module: n, name: k });
    for (const d of modules.get(n).deps) visit(d);
  })(name);
  return addOperatorParts(result);
}

// ---------------------------------------------------------------------------
// 2. table of contents (the import structure of the tutorial)
// ---------------------------------------------------------------------------
const seenInToc = new Set(SKIP_IN_TOC);
const order = []; // reading order of pages

function buildTree(name, level) {
  const mod = modules.get(name);
  seenInToc.add(name);
  const title = mod.info.title ?? { nav: name, heading: name };
  const underConstruction = title.nav.includes('🚧');
  const node = {
    module: name,
    label: title.nav.replace(/\s*🚧\s*/, '').trim(),
    underConstruction,
    level,
    children: [],
    exercises: mod.info.exercises.length,
  };
  for (const dep of mod.info.imports) {
    if (!seenInToc.has(dep) && modules.has(dep)) node.children.push(buildTree(dep, level + 1));
  }
  node.isSection = node.children.length > 0;
  if (!node.isSection && !underConstruction && level > 0) order.push(name);
  return node;
}
const tree = buildTree(`${PREFIX}.Index`, 0);
const inToc = new Set(seenInToc);
const orphans = [...modules.keys()].filter((m) => !inToc.has(m));

const hrefOf = (name) => (/^Padova2025(-zh-TW)?\.Welcome$/.test(name) ? 'index.html' : `${name}.html`);

// ---------------------------------------------------------------------------
// 3. pages
// ---------------------------------------------------------------------------
const pages = new Map(); // module -> { html, ids, headings, text }
const links = [];
const unknownTex = new Set();

function rewriteUrl(from) {
  return (url) => {
    let m;
    if (/^(https?:|mailto:)/.test(url)) return { href: url, external: true };
    if (/^(javascript:|#)/.test(url)) return { href: url };
    if ((m = /^(Padova2025(?:-zh-TW)?\.[\w.']+)\.html(#.*)?$/.exec(url))) {
      links.push({ from, to: m[1], frag: m[2] ?? '' });
      return { href: hrefOf(m[1]) + (m[2] ?? '') };
    }
    if ((m = /^(Cubical\.[\w.']+)\.html(#.*)?$/.exec(url))) {
      return { href: `https://agda.github.io/cubical/${m[1]}.html${m[2] ?? ''}`, external: true };
    }
    return { href: url };
  };
}

const KIND_CLASS = { datatype: 'dt', record: 'dt', constructor: 'ct', function: 'fn', field: 'fd' };
const linkStats = { known: 0, linked: 0, unresolved: new Map() };

/**
 * `linking`: the second pass. A use of a declared name links to its declaration when that has
 * an anchor on its page, which the first pass found out (pages.get(module).ids).
 */
function renderPage(mod, linking = false) {
  const names = visibleNames(mod.name);
  const anchors = new Set();
  const firstAgda = mod.info.blocks.find((b) => b.kind === 'agda');
  const href = (entry) => {
    const target = linking && pages.get(entry.module);
    if (!target || !target.ids.has(entry.name)) return null;
    return (entry.module === mod.name ? '' : hrefOf(entry.module)) + '#' + encodeURIComponent(entry.name);
  };
  // the module an `import` names: the tutorial's own page, or the documentation of the Cubical library
  const moduleHref = (written) => {
    if (!linking) return null;
    if (modules.has(written)) return written === mod.name ? null : hrefOf(written);
    return /^Cubical\./.test(written) ? `https://agda.github.io/cubical/${written}.html` : null;
  };
  const stats = linking ? linkStats : undefined;

  const pre = (cls, code) => `<pre class="${cls}"><code>${code}</code></pre>\n`;
  const exercisesByBlock = new Map(mod.info.exercises.map((e) => [e.block, e]));

  const env = {
    headings: [],
    headingIds: mod.headingIds,
    usedIds: new Set(),
    unknownTex,
    rewriteUrl: rewriteUrl(mod.name),
    anchorLabel: UI.anchor,
    renderCode(n) {
      const b = mod.info.blocks[n];
      if (!b || b.hidden) return '';
      if (b.kind === 'other') return pre('code', highlight(b.text, { names, noAnchors: true }));
      const exercise = exercisesByBlock.get(n);
      if (exercise) {
        const { shown } = ex.holeify(b.text);
        const solution = ex.solutionDisplay(b.text);
        const statementRefs = new Map();
        const solutionRefs = new Map();
        const statementHtml = highlight(shown, { names, anchors, href, moduleHref, collect: statementRefs, stats });
        const solutionHtml = highlight(solution, { names, noAnchors: true, href, moduleHref, collect: solutionRefs, stats });
        // what the solution uses of the earlier material, that the exercise does not show already
        const own = collectDeclarations(solution);
        const uses = [...solutionRefs].filter(([key, ref]) => !statementRefs.has(key) && !own.has(ref.entry.name));
        const hints = uses.length
          ? `<div class="hints"><span class="hints-title">${UI.uses}</span> ${uses.map(([, ref]) =>
            `<a class="hint ${KIND_CLASS[ref.entry.kind]}" href="${escAttr(ref.href)}" title="${escAttr(UI.hintTitle)}">${esc(ref.entry.name)}</a>`).join(' ')}</div>\n`
          : '';
        return `<section class="exercise" id="exercise-${exercise.ordinal}" data-module="${escAttr(mod.name)}" data-ordinal="${exercise.ordinal}" data-id="${escAttr(exercise.id)}">
<div class="exercise-head"><span class="badge">${UI.exercise} ${exercise.ordinal}</span><code>${esc(exercise.id)}</code></div>
${pre('agda', statementHtml)}<div class="exercise-actions">
<button type="button" class="btn primary" data-action="edit"${UI.editHoleTitle ? ` title="${escAttr(UI.editHoleTitle)}"` : ''}>${UI.editHole}</button>
<span class="exercise-status" data-status></span>
</div>
${hints}<div class="your-code" hidden><div class="your-code-title">${UI.yourSolution}</div><pre class="agda"><code></code></pre></div>
<details class="solution"><summary>${UI.referenceSolution}</summary>${pre('agda', solutionHtml)}</details>
</section>\n`;
      }
      const header = b === firstAgda && /^\s*(\{-#|module\s)/.test(b.text);
      return pre(header ? 'agda header' : 'agda', highlight(b.text, { names, anchors, href, moduleHref, stats }));
    },
  };

  // The old pages carried scripts for widgets of the previous site; the new client code provides them.
  const body = renderMarkdown(mod.info.text, env).replace(/<script[\s\S]*?<\/script>\n?/g, '');
  const ids = new Set([...env.usedIds]);
  for (const a of anchors) ids.add(a);
  body.replace(/\bid="([^"]+)"/g, (_, id) => ids.add(id));

  pages.set(mod.name, { html: body, ids, headings: env.headings, text: plainText(body) });
}

for (const mod of modules.values()) renderPage(mod); // first: which anchors the pages have
links.length = 0;
for (const mod of modules.values()) renderPage(mod, true); // second: the same, with the links to them

// ---------------------------------------------------------------------------
// 4. link check
// ---------------------------------------------------------------------------
const broken = [];
for (const l of links) {
  const target = pages.get(l.to);
  if (!target) { broken.push(`${l.from}: no page ${l.to}`); continue; }
  const frag = l.frag.replace(/^#/, '');
  if (frag && !target.ids.has(frag) && !target.ids.has(decodeURIComponent(frag))) broken.push(`${l.from}: ${l.to}#${frag}`);
}

// ---------------------------------------------------------------------------
// 5. page layout
// ---------------------------------------------------------------------------
function renderNav(current) {
  const ancestors = new Set();
  (function find(node, trail) {
    if (node.module === current) trail.forEach((t) => ancestors.add(t));
    node.children.forEach((c) => find(c, [...trail, node.module]));
  })(tree, []);

  function item(node) {
    if (node.isSection) {
      const open = (node.level <= 1 && !node.underConstruction) || ancestors.has(node.module) ? ' open' : '';
      return `<li class="section"><details${open}><summary>${esc(node.label)}</summary><ol>${node.children.map(item).join('')}</ol></details></li>`;
    }
    if (node.underConstruction) return `<li class="wip">${esc(node.label)} <span class="wip-mark" title="${UI.wip}">🚧</span></li>`;
    const cur = node.module === current ? ' aria-current="page"' : '';
    return `<li class="page"><a href="${hrefOf(node.module)}" data-module="${escAttr(node.module)}" data-ex="${node.exercises}"${cur}>${esc(node.label)}</a></li>`;
  }
  return `<ol class="toc">${tree.children.map(item).join('')}</ol>`;
}

const assets = {};
function emitAsset(file, transform = (s) => s) {
  const content = transform(fs.readFileSync(path.join(root, 'src', file), 'utf8'));
  const ext = path.extname(file);
  const name = `assets/${path.basename(file, ext)}.${hash(content).slice(0, 10)}${ext}`;
  assets[file] = name;
  fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(out, name), content);
}

function layout(mod) {
  const page = pages.get(mod.name);
  const title = mod.info.title ?? { nav: mod.name, heading: mod.name };
  const idx = order.indexOf(mod.name);
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  const label = (m) => (modules.get(m).info.title?.nav ?? m).replace(/\s*🚧\s*/, '');
  const pager = `<nav class="pager" aria-label="${UI.pager}">
${prev ? `<a class="prev" href="${hrefOf(prev)}" rel="prev"><span>${UI.prev}</span>${esc(label(prev))}</a>` : '<span></span>'}
${next ? `<a class="next" href="${hrefOf(next)}" rel="next"><span>${UI.next}</span>${esc(label(next))}</a>` : '<span></span>'}
</nav>`;
  const source = `${REPO_URL}/blob/main/${mod.rel}`;
  const footer = lang === 'zh-TW'
    ? `<footer class="page-footer">
<p><a href="${escAttr(source)}" target="_blank" rel="noopener">在 GitHub 上編輯這一頁</a> ·
內容：<a href="${UPSTREAM_URL}" target="_blank" rel="noopener">${SITE_NAME}</a>，作者 Ingo Blechschmidt，繁體中文翻譯，
<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant" target="_blank" rel="noopener">CC BY-SA</a>。</p>
</footer>`
    : `<footer class="page-footer">
<p><a href="${escAttr(source)}" target="_blank" rel="noopener">Edit this page on GitHub</a> ·
Content: <a href="${UPSTREAM_URL}" target="_blank" rel="noopener">${SITE_NAME}</a> by Ingo Blechschmidt,
<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA</a>.</p>
</footer>`;

  return `<!DOCTYPE html>
<html lang="${lang === 'zh-TW' ? 'zh-Hant-TW' : 'en'}" data-theme="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">
<title>${esc(plainText(title.nav === title.heading ? title.nav : title.nav))} — ${SITE_NAME}</title>
<meta name="description" content="${escAttr(page.text.slice(0, 160))}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🐔%3C/text%3E%3C/svg%3E">
<script>try{var t=localStorage.getItem('lpa:theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="stylesheet" href="${assets['app.css']}">
<script src="${assets['app.js']}" defer></script>
</head>
<body>
<div class="app" id="app">
<header class="topbar">
<button type="button" class="icon-btn nav-toggle" aria-label="${UI.navToggle}" aria-controls="toc-panel">☰</button>
<a class="brand" href="index.html"><span class="brand-logo">🐔</span><span class="brand-name">${SITE_NAME}</span></a>
<div class="search"><input type="search" id="search" placeholder="${UI.searchPlaceholder}" aria-label="${UI.searchLabel}" autocomplete="off"><div id="search-results" hidden></div></div>
${alternate ? `<a class="icon-btn lang-switch" href="${escAttr(alternate + hrefOf(OTHER_PREFIX + mod.name.slice(PREFIX.length)))}" hreflang="${lang === 'zh-TW' ? 'en' : 'zh-Hant-TW'}" lang="${lang === 'zh-TW' ? 'en' : 'zh-Hant-TW'}" title="${lang === 'zh-TW' ? 'This page in English' : '這一頁的繁體中文版'}">${esc(alternateLabel)}</a>\n` : ''}<button type="button" class="icon-btn" id="theme-toggle" aria-label="${UI.themeToggle}" title="${UI.themeToggle}">◐</button>
<button type="button" class="icon-btn" id="editor-toggle" aria-label="${UI.editorToggle}" title="${UI.editorToggle}" aria-pressed="false">⌨</button>
</header>
<nav class="sidebar" id="toc-panel" aria-label="${UI.toc}">
${renderNav(mod.name)}
<div class="activity" id="activity" hidden></div>
<div class="sidebar-foot"><a href="#" data-action="export-progress">${UI.backup}</a> · <a href="#" data-action="import-progress">${UI.restore}</a></div>
</nav>
<main id="main">
<article id="content" data-module="${escAttr(mod.name)}" data-title="${escAttr(plainText(title.nav))}" data-exercises="${mod.info.exercises.length}">
${page.html}
${pager}
${footer}
</article>
</main>
<aside class="editor-panel" id="editor-panel" aria-label="${UI.editor}" hidden>
<div class="editor-resizer" id="editor-resizer" role="separator" aria-orientation="vertical" title="${UI.resize}"></div>
<div class="editor-bar"><span class="editor-title" id="editor-title">${UI.editor}</span>
<button type="button" class="icon-btn" data-action="commands" title="${UI.commandsTitle}" aria-label="${UI.commands}" aria-pressed="false">λ</button>
<button type="button" class="icon-btn" data-action="symbols" title="${UI.symbolsTitle}" aria-label="${UI.symbols}" aria-pressed="false">∀</button>
<button type="button" class="icon-btn" data-action="editor-reload" title="${UI.restart}" aria-label="${UI.restart}">↻</button>
<button type="button" class="icon-btn" data-action="editor-close" title="${UI.close}" aria-label="${UI.close}">✕</button></div>
<div class="editor-status" id="editor-status" role="status"></div>
<div class="symbol-bar" id="symbol-bar" role="toolbar" aria-label="${UI.symbolsGroup}" hidden></div>
<div class="command-bar" id="command-bar" role="toolbar" aria-label="${UI.commands}" hidden></div>
</aside>
<div class="scrim" id="scrim" hidden></div>
</div>
<script type="application/json" id="lpa-config">${JSON.stringify({ buildId: BUILD_ID, searchUrl: assets['search'], unicodeUrl: assets['unicode'] ?? null, editor: withEditor, root: siteRoot, lang })}</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// 6. write everything
// ---------------------------------------------------------------------------
const BUILD_ID = option('build-id', hash(JSON.stringify([...modules.values()].map((m) => m.source)) + fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8') + fs.readFileSync(path.join(root, 'src', 'app.css'), 'utf8')).slice(0, 12));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
emitAsset('app.css');
emitAsset('app.js');

// search index
const searchIndex = [];
for (const mod of modules.values()) {
  const page = pages.get(mod.name);
  const title = mod.info.title?.nav ?? mod.name;
  if (!inToc.has(mod.name) || title.includes('🚧')) continue;
  searchIndex.push({
    u: hrefOf(mod.name),
    t: plainText(title),
    h: page.headings.filter((h) => h.level >= 2).map((h) => [h.text, h.id]),
    x: page.text.slice(0, 5000),
  });
}
const searchJson = JSON.stringify(searchIndex);
const searchName = `assets/search.${hash(searchJson).slice(0, 10)}.json`;
fs.writeFileSync(path.join(out, searchName), searchJson);
assets['search'] = searchName;

// Unicode input hints: which key sequences produce the symbols the tutorial uses
try {
  const query = require(path.join(agdaModeDir, 'asset', 'query.js')).default;
  const used = new Set();
  // (a translation has the symbols of the original: its own words would add the punctuation of its language)
  for (const mod of modules.values()) for (const ch of mod.original ?? mod.source) if (ch.codePointAt(0) > 127) used.add(ch);
  const table = {};
  for (const ch of [...used].sort()) {
    const sequences = query[String(ch.codePointAt(0))];
    if (sequences) table[ch] = sequences.map((s) => '\\' + s).join('   ');
  }
  const json = JSON.stringify(table);
  assets['unicode'] = `assets/unicode.${hash(json).slice(0, 10)}.json`;
  fs.writeFileSync(path.join(out, assets['unicode']), json);
  console.log(`  input-method hints for ${Object.keys(table).length} of ${used.size} non-ASCII symbols`);
} catch {
  console.warn(`  no input-method data in ${agdaModeDir}: no hover hints`);
}

const htmlFiles = [];
for (const mod of modules.values()) {
  const file = hrefOf(mod.name);
  fs.writeFileSync(path.join(out, file), layout(mod));
  htmlFiles.push(file);
}

// the files the service worker keeps for offline use
const precache = ['./', ...htmlFiles, assets['app.css'], assets['app.js'], assets['search'], 'sw-common.js'];

// service worker: the editor's one, with the list of this site's files
// the id of the worker's long-lived cache comes from the editor build (it identifies the VS Code files)
let staticId = 'none';
if (editorDist) {
  try { staticId = JSON.parse(fs.readFileSync(path.join(path.resolve(process.cwd(), editorDist), 'build-info.json'), 'utf8')).staticId ?? staticId; } catch { /* keep 'none' */ }
}
const swCommon = fs.readFileSync(path.join(repo, 'editor', 'src', 'sw-common.js'), 'utf8').replaceAll('__BUILD_ID__', BUILD_ID).replaceAll('__STATIC_ID__', staticId);
// (a translation in a directory of the main site has none: the main site's covers it)
if (standalone) {
  fs.writeFileSync(path.join(out, 'sw-common.js'), swCommon);
  fs.writeFileSync(path.join(out, 'sw.js'), fs.readFileSync(path.join(repo, 'editor', 'src', 'sw.js'), 'utf8')
    .replaceAll('__BUILD_ID__', BUILD_ID)
    .replaceAll('__STATIC_ID__', staticId)
    .replaceAll('__PRECACHE__', () => JSON.stringify(precache, null, 2)));
}

// The Agda files as archives, for working with a local Agda: with holes (the
// exercises as the pages show them) and with the solutions.
function exerciseSource(mod) {
  const lines = mod.source.split('\n');
  const exerciseAt = new Map(mod.info.blocks.filter((b) => ex.isExercise(b) && !b.hidden).map((b) => [b.line - 1, b]));
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i]);
    const block = exerciseAt.get(i);
    if (!block) continue;
    let close = i + 1;
    while (close < lines.length && !/^\s*```\s*$/.test(lines[close])) close++;
    result.push(...ex.holeify(block.text).shown.replace(/\n$/, '').split('\n'));
    i = close - 1; // the closing fence is copied by the next iteration
  }
  return result.join('\n');
}
{
  // (a translation's archives hold its folder; the library file at the root finds its modules, too)
  const files = [...modules.values()].sort((a, b) => (a.rel < b.rel ? -1 : 1));
  const agdaLib = { name: 'padova2025.agda-lib', data: fs.readFileSync(path.join(repo, 'padova2025.agda-lib')) };
  fs.writeFileSync(path.join(out, `${PREFIX}.zip`), createZip([...files.map((m) => ({ name: m.rel, data: Buffer.from(exerciseSource(m)) })), agdaLib]));
  fs.writeFileSync(path.join(out, `${PREFIX}-solutions.zip`), createZip([...files.map((m) => ({ name: m.rel, data: Buffer.from(m.source) })), agdaLib]));
}
if (standalone) {
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  fs.writeFileSync(path.join(out, '404.html'), `<!DOCTYPE html><meta charset="utf-8"><title>Not found</title><meta name="viewport" content="width=device-width, initial-scale=1"><body style="font:18px system-ui;max-width:32em;margin:4em auto;padding:0 1em"><h1>Page not found</h1><p><a href="index.html">Back to the tutorial</a></p>`);

  if (editorDist) {
    fs.cpSync(path.resolve(process.cwd(), editorDist), path.join(out, 'editor'), { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// 7. report
// ---------------------------------------------------------------------------
const exerciseCount = [...modules.values()].reduce((n, m) => n + m.info.exercises.length, 0);
let size = 0;
for (const f of fs.readdirSync(out, { withFileTypes: true })) if (f.isFile()) size += fs.statSync(path.join(out, f.name)).size;
console.log(`Built ${htmlFiles.length} pages, ${exerciseCount} exercises → ${out}`);
console.log(`  build id: ${BUILD_ID}; pages+assets: ${(size / 1048576).toFixed(1)} MB; ${order.length} pages in reading order`);
console.log(`  links: ${linkStats.linked} of ${linkStats.known} uses of declared names link to their declaration`);
if (process.argv.includes('--link-report')) {
  const top = [...linkStats.unresolved].sort((a, b) => b[1] - a[1]).slice(0, 60);
  console.log(`  identifiers that are no declared name (${linkStats.unresolved.size} different), the commonest:\n    ${top.map(([t, n]) => `${t} ${n}`).join('  ')}`);
}
if (orphans.length) console.log(`  not in the table of contents (generated anyway): ${orphans.join(', ')}`);
if (unknownTex.size) console.warn(`  unknown TeX macros: ${[...unknownTex].join(' ')}`);
if (broken.length) {
  console.warn(`  ${broken.length} broken internal links:\n    ${broken.slice(0, 30).join('\n    ')}`);
  if (strict) process.exit(1);
}
