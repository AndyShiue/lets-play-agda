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
import { highlight, collectDeclarations } from './lib/agda.mjs';
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
// agda-mode's data about the Unicode input method (for the hover hints), if available
const agdaModeDir = path.resolve(process.cwd(), option('agda-mode', path.join(repo, 'editor', '.cache', 'ext', 'agda-mode')));
const strict = argv.includes('--strict');

const SITE_NAME = "Let's play Agda";
const REPO_URL = 'https://github.com/AndyShiue/lets-play-agda';
const UPSTREAM_URL = 'https://github.com/iblech/lets-play-agda';
const SKIP_IN_TOC = new Set(['Padova2025.ProvingBasics.Equality.Reasoning.Core', 'Agda.Primitive']);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');

// ---------------------------------------------------------------------------
// 1. read the modules
// ---------------------------------------------------------------------------
const modules = new Map();
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.lagda.md')) {
      const rel = path.relative(repo, full).split(path.sep).join('/');
      const name = rel.replace(/\.lagda\.md$/, '').replace(/\//g, '.');
      const source = fs.readFileSync(full, 'utf8');
      const info = ex.moduleInfo(source);
      if (info.name !== name) console.warn(`warning: ${rel} declares module ${info.name}`);
      const deps = [];
      for (const b of info.blocks) {
        if (b.kind === 'agda') b.text.replace(/^\s*(?:open\s+)?import\s+([\w.']+)/gm, (_, m) => deps.push(m));
      }
      modules.set(name, { name, rel, source, info, deps, decls: new Map() });
    }
  }
})(path.join(repo, 'Padova2025'));

for (const mod of modules.values()) {
  for (const b of mod.info.blocks) if (b.kind === 'agda') collectDeclarations(ex.isExercise(b) ? ex.solutionDisplay(b.text) : b.text, mod.decls);
}

/** Names visible in a module: its own declarations and those of everything it imports. */
function visibleNames(name) {
  const result = new Map();
  const seen = new Set();
  (function visit(n) {
    if (seen.has(n) || !modules.has(n)) return;
    seen.add(n);
    for (const [k, v] of modules.get(n).decls) if (!result.has(k)) result.set(k, v);
    for (const d of modules.get(n).deps) visit(d);
  })(name);
  return result;
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
const tree = buildTree('Padova2025.Index', 0);
const inToc = new Set(seenInToc);
const orphans = [...modules.keys()].filter((m) => !inToc.has(m));

const hrefOf = (name) => (name === 'Padova2025.Welcome' ? 'index.html' : `${name}.html`);

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
    if ((m = /^(Padova2025\.[\w.']+)\.html(#.*)?$/.exec(url))) {
      links.push({ from, to: m[1], frag: m[2] ?? '' });
      return { href: hrefOf(m[1]) + (m[2] ?? '') };
    }
    if ((m = /^(Cubical\.[\w.']+)\.html(#.*)?$/.exec(url))) {
      return { href: `https://agda.github.io/cubical/${m[1]}.html${m[2] ?? ''}`, external: true };
    }
    return { href: url };
  };
}

function renderPage(mod) {
  const names = visibleNames(mod.name);
  const anchors = new Set();
  const firstAgda = mod.info.blocks.find((b) => b.kind === 'agda');

  const pre = (cls, code) => `<pre class="${cls}"><code>${code}</code></pre>\n`;
  const exercisesByBlock = new Map(mod.info.exercises.map((e) => [e.block, e]));

  const env = {
    headings: [],
    usedIds: new Set(),
    unknownTex,
    rewriteUrl: rewriteUrl(mod.name),
    renderCode(n) {
      const b = mod.info.blocks[n];
      if (!b || b.hidden) return '';
      if (b.kind === 'other') return pre('code', highlight(b.text, { names, noAnchors: true }));
      const exercise = exercisesByBlock.get(n);
      if (exercise) {
        const { shown } = ex.holeify(b.text);
        const solution = ex.solutionDisplay(b.text);
        return `<section class="exercise" id="exercise-${exercise.ordinal}" data-module="${escAttr(mod.name)}" data-ordinal="${exercise.ordinal}" data-id="${escAttr(exercise.id)}">
<div class="exercise-head"><span class="badge">Exercise ${exercise.ordinal}</span><code>${esc(exercise.id)}</code></div>
${pre('agda', highlight(shown, { names, anchors }))}<div class="exercise-actions">
<button type="button" class="btn primary" data-action="edit">✏️ Edit hole…</button>
<span class="exercise-status" data-status></span>
</div>
<div class="your-code" hidden><div class="your-code-title">Your solution</div><pre class="agda"><code></code></pre></div>
<details class="solution"><summary>Reference solution</summary>${pre('agda', highlight(solution, { names, noAnchors: true }))}</details>
</section>\n`;
      }
      const header = b === firstAgda && /^\s*(\{-#|module\s)/.test(b.text);
      return pre(header ? 'agda header' : 'agda', highlight(b.text, { names, anchors }));
    },
  };

  // The old pages carried scripts for widgets of the previous site; the new client code provides them.
  const body = renderMarkdown(mod.info.text, env).replace(/<script[\s\S]*?<\/script>\n?/g, '');
  const ids = new Set([...env.usedIds]);
  for (const a of anchors) ids.add(a);
  body.replace(/\bid="([^"]+)"/g, (_, id) => ids.add(id));

  pages.set(mod.name, { html: body, ids, headings: env.headings, text: plainText(body) });
}

for (const mod of modules.values()) renderPage(mod);

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
    if (node.underConstruction) return `<li class="wip">${esc(node.label)} <span class="wip-mark" title="Under construction">🚧</span></li>`;
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
  const pager = `<nav class="pager" aria-label="Previous and next page">
${prev ? `<a class="prev" href="${hrefOf(prev)}" rel="prev"><span>Previous</span>${esc(label(prev))}</a>` : '<span></span>'}
${next ? `<a class="next" href="${hrefOf(next)}" rel="next"><span>Next</span>${esc(label(next))}</a>` : '<span></span>'}
</nav>`;
  const source = `${REPO_URL}/blob/main/${mod.rel}`;
  const footer = `<footer class="page-footer">
<p><a href="${escAttr(source)}" target="_blank" rel="noopener">Edit this page on GitHub</a> ·
Content: <a href="${UPSTREAM_URL}" target="_blank" rel="noopener">${SITE_NAME}</a> by Ingo Blechschmidt,
<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA</a>.</p>
</footer>`;

  return `<!DOCTYPE html>
<html lang="en" data-theme="auto">
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
<button type="button" class="icon-btn nav-toggle" aria-label="Show or hide the table of contents" aria-controls="toc-panel">☰</button>
<a class="brand" href="index.html"><span class="brand-logo">🐔</span><span class="brand-name">${SITE_NAME}</span></a>
<div class="search"><input type="search" id="search" placeholder="Search…" aria-label="Search the tutorial" autocomplete="off"><div id="search-results" hidden></div></div>
<button type="button" class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode" title="Toggle dark mode">◐</button>
<button type="button" class="icon-btn" id="editor-toggle" aria-label="Show or hide the editor" title="Show or hide the editor" aria-pressed="false">⌨</button>
</header>
<nav class="sidebar" id="toc-panel" aria-label="Table of contents">
${renderNav(mod.name)}
<div class="activity" id="activity" hidden></div>
<div class="sidebar-foot"><a href="#" data-action="export-progress">Download backup</a> · <a href="#" data-action="import-progress">Restore</a></div>
</nav>
<main id="main">
<article id="content" data-module="${escAttr(mod.name)}" data-title="${escAttr(plainText(title.nav))}" data-exercises="${mod.info.exercises.length}">
${page.html}
${pager}
${footer}
</article>
</main>
<aside class="editor-panel" id="editor-panel" aria-label="Editor" hidden>
<div class="editor-resizer" id="editor-resizer" role="separator" aria-orientation="vertical" title="Drag to resize"></div>
<div class="editor-bar"><span class="editor-title" id="editor-title">Editor</span>
<button type="button" class="icon-btn" data-action="commands" title="Agda commands as buttons (load, case split, give, …)" aria-label="Agda commands" aria-pressed="false">λ</button>
<button type="button" class="icon-btn" data-action="symbols" title="Symbol bar: type a backslash and a few letters, then tap the symbol" aria-label="Symbol bar" aria-pressed="false">∀</button>
<button type="button" class="icon-btn" data-action="editor-reload" title="Restart the editor" aria-label="Restart the editor">↻</button>
<button type="button" class="icon-btn" data-action="editor-close" title="Close the editor" aria-label="Close the editor">✕</button></div>
<div class="editor-status" id="editor-status" role="status"></div>
<div class="symbol-bar" id="symbol-bar" role="toolbar" aria-label="Symbols" hidden></div>
<div class="command-bar" id="command-bar" role="toolbar" aria-label="Agda commands" hidden></div>
</aside>
<div class="scrim" id="scrim" hidden></div>
</div>
<script type="application/json" id="lpa-config">${JSON.stringify({ buildId: BUILD_ID, searchUrl: assets['search'], unicodeUrl: assets['unicode'] ?? null, editor: !!editorDist })}</script>
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
  for (const mod of modules.values()) for (const ch of mod.source) if (ch.codePointAt(0) > 127) used.add(ch);
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
fs.writeFileSync(path.join(out, 'sw-common.js'), swCommon);
fs.writeFileSync(path.join(out, 'sw.js'), fs.readFileSync(path.join(repo, 'editor', 'src', 'sw.js'), 'utf8')
  .replaceAll('__BUILD_ID__', BUILD_ID)
  .replaceAll('__STATIC_ID__', staticId)
  .replaceAll('__PRECACHE__', () => JSON.stringify(precache, null, 2)));

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
  const files = [...modules.values()].sort((a, b) => (a.rel < b.rel ? -1 : 1));
  const agdaLib = { name: 'padova2025.agda-lib', data: fs.readFileSync(path.join(repo, 'padova2025.agda-lib')) };
  fs.writeFileSync(path.join(out, 'Padova2025.zip'), createZip([...files.map((m) => ({ name: m.rel, data: Buffer.from(exerciseSource(m)) })), agdaLib]));
  fs.writeFileSync(path.join(out, 'Padova2025-solutions.zip'), createZip([...files.map((m) => ({ name: m.rel, data: Buffer.from(m.source) })), agdaLib]));
}

fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, '404.html'), `<!DOCTYPE html><meta charset="utf-8"><title>Not found</title><meta name="viewport" content="width=device-width, initial-scale=1"><body style="font:18px system-ui;max-width:32em;margin:4em auto;padding:0 1em"><h1>Page not found</h1><p><a href="index.html">Back to the tutorial</a></p>`);

if (editorDist) {
  fs.cpSync(path.resolve(process.cwd(), editorDist), path.join(out, 'editor'), { recursive: true });
}

// ---------------------------------------------------------------------------
// 7. report
// ---------------------------------------------------------------------------
const exerciseCount = [...modules.values()].reduce((n, m) => n + m.info.exercises.length, 0);
let size = 0;
for (const f of fs.readdirSync(out, { withFileTypes: true })) if (f.isFile()) size += fs.statSync(path.join(out, f.name)).size;
console.log(`Built ${htmlFiles.length} pages, ${exerciseCount} exercises → ${out}`);
console.log(`  build id: ${BUILD_ID}; pages+assets: ${(size / 1048576).toFixed(1)} MB; ${order.length} pages in reading order`);
if (orphans.length) console.log(`  not in the table of contents (generated anyway): ${orphans.join(', ')}`);
if (unknownTex.size) console.warn(`  unknown TeX macros: ${[...unknownTex].join(' ')}`);
if (broken.length) {
  console.warn(`  ${broken.length} broken internal links:\n    ${broken.slice(0, 30).join('\n    ')}`);
  if (strict) process.exit(1);
}
