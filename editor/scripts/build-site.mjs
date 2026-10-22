#!/usr/bin/env node
/*
 * Assembles the static editor site into editor/dist (publish that directory).
 *
 * Inputs (see `npm run fetch`, or pass your own):
 *   --vscode <dir>      a VS Code for the Web build (`out/`, `node_modules/`, `extensions/`)
 *   --agda-mode <dir>   unpacked agda-mode extension (banacorn.agda-mode)
 *   --als-loader <dir>  unpacked ALS WASM loader extension (qbane.als-wasm-loader)
 *   --cubical <dir>     checkout of the cubical library
 * Options:
 *   --out <dir>         output directory (default: dist)
 *   --build-id <id>     cache version; default: hash of the inputs
 *   --no-prune          keep all built-in VS Code extensions
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '..');

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
function option(name, fallback) {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : fallback;
}
const flag = (name) => argv.includes('--' + name);
const abs = (p) => path.resolve(process.cwd(), p);

const cache = path.join(root, '.cache');
const inputs = {
  vscode: abs(option('vscode', path.join(cache, 'vscode-web'))),
  agdaMode: abs(option('agda-mode', path.join(cache, 'ext', 'agda-mode'))),
  alsLoader: abs(option('als-loader', path.join(cache, 'ext', 'als-wasm-loader'))),
  cubical: abs(option('cubical', path.join(cache, 'cubical'))),
};
const out = abs(option('out', path.join(root, 'dist')));
const prune = !flag('no-prune');
// Where the page registers the service worker. Standalone the editor has its own;
// inside the tutorial site (--no-own-sw) the site's root worker serves everything.
const swUrl = option('sw', 'sw.js');
const swScope = option('sw-scope', './');
const ownSw = !flag('no-own-sw');

// Built-in VS Code extensions we keep (themes, icons, a few grammars).
const KEEP_BUILTIN_EXTENSIONS = new Set([
  'theme-defaults', 'theme-seti', 'markdown-basics', 'json', 'ini', 'configuration-editing',
]);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const rel = (p) => p.split(path.sep).join('/');

function require_(file, hint) {
  if (!fs.existsSync(file)) {
    console.error(`Missing input: ${file}\n${hint}\nRun \`npm run fetch\` or pass the path explicitly.`);
    process.exit(1);
  }
}

function copy(src, dst, filter = () => true) {
  fs.cpSync(src, dst, {
    recursive: true,
    filter: (s) => filter(rel(path.relative(src, s))),
  });
}

function walk(dir, visit, base = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit, base);
    else visit(full, rel(path.relative(base, full)));
  }
}

function dirSize(dir) {
  let total = 0;
  walk(dir, (f) => { total += fs.statSync(f).size; });
  return total;
}

const MB = (n) => (n / 1048576).toFixed(1) + ' MB';

// ---------------------------------------------------------------------------
// check inputs
// ---------------------------------------------------------------------------
require_(path.join(inputs.vscode, 'out', 'vs', 'workbench', 'workbench.web.main.internal.js'), 'VS Code web build not found.');
require_(path.join(inputs.agdaMode, 'package.json'), 'agda-mode extension not found.');
require_(path.join(inputs.alsLoader, 'package.json'), 'ALS WASM loader extension not found.');
require_(path.join(inputs.cubical, 'cubical.agda-lib'), 'cubical library not found.');

const licenseFile = path.join(inputs.vscode, 'LICENSE');
const isMicrosoftBuild = fs.existsSync(licenseFile) && /MICROSOFT/i.test(fs.readFileSync(licenseFile, 'utf8').slice(0, 200));

// ---------------------------------------------------------------------------
// assemble
// ---------------------------------------------------------------------------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

console.log('• VS Code for the Web');
const vscodeOut = path.join(out, 'vscode');
copy(path.join(inputs.vscode, 'out'), path.join(vscodeOut, 'out'), (r) =>
  !r.endsWith('.map') && !/^nls\.(keys|metadata|messages)\.json$/.test(r));
copy(path.join(inputs.vscode, 'node_modules'), path.join(vscodeOut, 'node_modules'), (r) => !r.endsWith('.map'));
// The workbench knows its built-in extensions from a list baked into the build,
// so a pruned extension keeps its manifest and static data (grammars for code
// blocks in Markdown, language configurations, snippets) but not its code.
// Otherwise every start asks the server for files that do not exist.
const KEEP_IN_PRUNED = new Set([
  'package.json', 'package.nls.json', 'language-configuration.json', 'syntaxes', 'snippets', 'themes',
]);
copy(path.join(inputs.vscode, 'extensions'), path.join(vscodeOut, 'extensions'), (r) => {
  if (!prune || r === '') return true;
  const parts = r.split('/');
  if (KEEP_BUILTIN_EXTENSIONS.has(parts[0])) return true;
  return parts.length === 1 || KEEP_IN_PRUNED.has(parts[1]);
});
for (const f of ['favicon.ico', 'version']) {
  if (fs.existsSync(path.join(inputs.vscode, f))) fs.copyFileSync(path.join(inputs.vscode, f), path.join(vscodeOut, f));
}

console.log('• extensions');
const ext = path.join(out, 'extensions');
copy(inputs.agdaMode, path.join(ext, 'agda-mode'), (r) =>
  !r.startsWith('.github') && !r.startsWith('docs') && !r.endsWith('.map') && !/^dist\/app\.bundle\.js/.test(r));
copy(inputs.alsLoader, path.join(ext, 'als-wasm-loader'), (r) =>
  !r.endsWith('.map') && !/(^|\/)dist\/desktop\//.test(r));
copy(path.join(root, 'src', 'fs-extension'), path.join(ext, 'lets-play-agda-fs'));
// the exercise conventions are shared with the site build: paste them into the extension
const exerciseLib = fs.readFileSync(path.join(repoRoot, 'site', 'scripts', 'lib', 'exercises.cjs'), 'utf8');
{
  const file = path.join(ext, 'lets-play-agda-fs', 'extension.js');
  const code = fs.readFileSync(file, 'utf8');
  if (!code.includes('/*__EXERCISE_LIB__*/')) { console.error('extension.js has no exercise library placeholder'); process.exit(1); }
  fs.writeFileSync(file, code.replace('/*__EXERCISE_LIB__*/', () => exerciseLib));
}
// VS Code asks for package.nls.json of every extension; an empty one avoids a 404 per start.
for (const name of fs.readdirSync(ext)) {
  const nls = path.join(ext, name, 'package.nls.json');
  if (!fs.existsSync(nls)) fs.writeFileSync(nls, '{}\n');
}

console.log('• workspace');
const ws = path.join(out, 'workspace');
copy(path.join(repoRoot, 'Padova2025'), path.join(ws, 'Padova2025'), (r) => !r.endsWith('.agdai'));
fs.copyFileSync(path.join(repoRoot, 'padova2025.agda-lib'), path.join(ws, 'padova2025.agda-lib'));
copy(inputs.cubical, path.join(ws, 'cubical'), (r) =>
  r === '' || r === 'cubical.agda-lib' || r === 'LICENSE' || r === 'Cubical' || (r.startsWith('Cubical/') && !r.endsWith('.agdai')));
fs.mkdirSync(path.join(ws, '.vscode'), { recursive: true });
fs.writeFileSync(path.join(ws, '.vscode', 'settings.json'), JSON.stringify({
  'alsWasmLoader.libraryFilePaths': ['cubical/cubical.agda-lib'],
  // The tutorial's own modules and the library are needed by Agda, but are not
  // for browsing (they contain the solutions); exercises live in Exercise/.
  'files.exclude': { Padova2025: true, cubical: true, '.vscode': true, 'padova2025.agda-lib': true },
  'files.autoSave': 'afterDelay',
  'files.autoSaveDelay': 800,
}, null, 2) + '\n');

const manifestFiles = [];
walk(ws, (f, r) => manifestFiles.push([r, fs.statSync(f).size]));
manifestFiles.sort((a, b) => (a[0] < b[0] ? -1 : 1));
fs.writeFileSync(path.join(out, 'workspace-manifest.json'), JSON.stringify({ files: manifestFiles }));

// ---------------------------------------------------------------------------
// service workers and page
// ---------------------------------------------------------------------------
const hash = crypto.createHash('sha256');
for (const f of ['sw-common.js', 'sw.js', 'webview-sw.js', 'bootstrap.js', 'index.html']) {
  hash.update(fs.readFileSync(path.join(root, 'src', f)));
}
hash.update(exerciseLib);
hash.update(fs.readFileSync(path.join(root, 'src', 'fs-extension', 'extension.js')));
hash.update(fs.readFileSync(path.join(out, 'workspace-manifest.json')));
const versionFile = path.join(vscodeOut, 'version');
if (fs.existsSync(versionFile)) hash.update(fs.readFileSync(versionFile));
const buildId = option('build-id', process.env.GITHUB_SHA?.slice(0, 12) ?? hash.digest('hex').slice(0, 12));

const withBuildId = (text) => text.replaceAll('__BUILD_ID__', buildId);
const read = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');

const pre = path.join(vscodeOut, 'out', 'vs', 'workbench', 'contrib', 'webview', 'browser', 'pre');

// Webview host page: VS Code insists that it runs on a host name derived from a
// hash of the parent's origin (one sub-domain per webview). Static hosting such
// as GitHub Pages has no wildcard sub-domains, so webviews run on the editor's
// own origin. Skip the check only in that case (parent and webview same-origin).
// Safe here because the only extensions are the bundled, trusted ones.
// The page's Content-Security-Policy pins its one inline script by hash, so the
// hash has to be updated together with the patch.
{
  const fail = (what) => {
    console.error(`Cannot patch the webview host page: ${what} (VS Code version changed?).`);
    process.exit(1);
  };
  const file = path.join(pre, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const sha = (text) => 'sha256-' + crypto.createHash('sha256').update(text, 'utf8').digest('base64');

  const script = html.match(/(<script async type="module">)([\s\S]*?)(<\/script>)/);
  if (!script) fail('inline script not found');
  const oldHash = sha(script[2]);
  if (!html.includes(`'${oldHash}'`)) fail('inline script does not match the hash in the CSP');

  const edits = [
    // 1. same-origin webviews (see above)
    [
      'throw new Error(`Expected \'${parentOriginHash}\' as hostname or subdomain!`);',
      (needle) => 'if (parentOrigin === window.origin) { return start(parentOrigin); } // lets-play-agda: same-origin webviews\n\t\t\t\t' + needle,
    ],
    // 2. When a service worker is already registered, VS Code forces an update
    //    check, which needs the network. Offline, keep using the registered one.
    [
      'registration = await registration.update();',
      () => 'registration = await registration.update().catch(() => registration); // lets-play-agda: works offline',
    ],
  ];
  let patched = script[2];
  for (const [needle, replacement] of edits) {
    if (!patched.includes(needle)) fail(`"${needle.slice(0, 40)}…" not found`);
    patched = patched.replace(needle, () => replacement(needle));
  }

  fs.writeFileSync(file, html
    .replace(script[0], () => script[1] + patched + script[3])
    .replace(`'${oldHash}'`, () => `'${sha(patched)}'`));
}

// Webview service worker: keep VS Code's, wrap it.
fs.renameSync(path.join(pre, 'service-worker.js'), path.join(pre, 'service-worker-orig.js'));
fs.writeFileSync(path.join(pre, 'service-worker.js'), read('webview-sw.js'));
fs.writeFileSync(path.join(pre, 'sw-common.js'), withBuildId(read('sw-common.js')));

const precache = [
  './',
  'index.html',
  'bootstrap.js',
  'sw-common.js',
  'workspace-manifest.json',
  'vscode/out/nls.messages.js',
  'vscode/out/vs/workbench/workbench.web.main.internal.js',
  'vscode/out/vs/workbench/workbench.web.main.internal.css',
  'vscode/out/vs/workbench/api/worker/extensionHostWorkerMain.js',
  'vscode/out/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html',
  'vscode/out/vs/workbench/contrib/webview/browser/pre/index.html',
  'vscode/out/vs/workbench/contrib/webview/browser/pre/fake.html',
  'extensions/agda-mode/package.json',
  'extensions/agda-mode/dist/web.bundle.js',
  'extensions/agda-mode/dist/bundled-view.js',
  'extensions/agda-mode/dist/style.css',
  'extensions/als-wasm-loader/package.json',
  'extensions/als-wasm-loader/dist/web/extension.js',
  'extensions/als-wasm-loader/vscode-wasm/wasm-wasi-core/package.json',
  'extensions/als-wasm-loader/vscode-wasm/wasm-wasi-core/dist/web/mainWorker.js',
  'extensions/als-wasm-loader/vscode-wasm/wasm-wasi-core/dist/web/threadWorker.js',
  'extensions/lets-play-agda-fs/package.json',
  'extensions/lets-play-agda-fs/extension.js',
  'workspace/.vscode/settings.json',
].filter((p) => p === './' || fs.existsSync(path.join(out, p)));

if (ownSw) {
  fs.writeFileSync(path.join(out, 'sw-common.js'), withBuildId(read('sw-common.js')));
  fs.writeFileSync(path.join(out, 'sw.js'), withBuildId(read('sw.js')).replaceAll('__PRECACHE__', () => JSON.stringify(precache, null, 2)));
}
fs.writeFileSync(path.join(out, 'index.html'), read('index.html')
  .replace('__SW_URL__', () => swUrl)
  .replace('__SW_SCOPE__', () => swScope));
fs.writeFileSync(path.join(out, 'bootstrap.js'), read('bootstrap.js'));

if (isMicrosoftBuild) {
  fs.writeFileSync(path.join(out, 'DEV-BUILD-DO-NOT-PUBLISH.txt'),
    'This directory contains the VS Code for the Web build that Microsoft distributes\n' +
    'under the "Microsoft Visual Studio Code" license terms, which do not allow\n' +
    'redistribution on a public site. Use it for local development only.\n' +
    'For publishing, build VS Code for the Web from the MIT-licensed sources\n' +
    '(microsoft/vscode, `gulp vscode-web-min`) and pass that build with --vscode.\n');
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const info = {
  buildId,
  precacheFiles: precache.length,
  sizes: {
    vscode: dirSize(vscodeOut),
    extensions: dirSize(ext),
    workspace: dirSize(ws),
    total: dirSize(out),
  },
  microsoftBuild: isMicrosoftBuild,
};
fs.writeFileSync(path.join(out, 'build-info.json'), JSON.stringify(info, null, 2) + '\n');

console.log(`\nBuilt ${out}`);
console.log(`  build id:   ${buildId}`);
console.log(`  precache:   ${precache.length} files`);
console.log(`  vscode:     ${MB(info.sizes.vscode)}   extensions: ${MB(info.sizes.extensions)}   workspace: ${MB(info.sizes.workspace)} (${manifestFiles.length} files)`);
console.log(`  total:      ${MB(info.sizes.total)}`);
if (isMicrosoftBuild) {
  console.log('\n  !! The VS Code build in dist/vscode is Microsoft-licensed: DEV ONLY, do not publish it.');
}
