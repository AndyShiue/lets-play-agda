#!/usr/bin/env node
/*
 * Builds the whole site: the editor (../editor) into .cache/editor-dist, then the
 * tutorial pages with the editor published under editor/. Both get the same build
 * id, which names the service worker's cache.
 *
 *   node scripts/build-all.mjs [--vscode <dir>] [--agda-mode <dir>] [--als-loader <dir>] [--cubical <dir>] [--strict]
 *
 * The four input options are passed on to the editor build (default: editor/.cache,
 * filled by `npm run fetch` in ../editor).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '..');
const languages = createRequire(import.meta.url)('./lib/languages.cjs');
const argv = process.argv.slice(2);

const forwarded = [];
for (const name of ['vscode', 'agda-mode', 'als-loader', 'cubical']) {
  const i = argv.indexOf('--' + name);
  if (i >= 0) forwarded.push('--' + name, path.resolve(process.cwd(), argv[i + 1]));
}
const strict = argv.includes('--strict');

// build id: everything that ends up in the site, except the (large) inputs of the editor
const hash = crypto.createHash('sha256');
function add(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.cache'].includes(entry.name)) add(full);
    } else if (/\.(md|mjs|cjs|js|css|html|json)$/.test(entry.name)) {
      hash.update(entry.name).update(fs.readFileSync(full));
    }
  }
}
for (const dir of [...languages.present(repo).map((l) => l.prefix), 'site', 'editor']) add(path.join(repo, dir));
const buildId = argv.includes('--build-id') ? argv[argv.indexOf('--build-id') + 1] : (process.env.GITHUB_SHA?.slice(0, 12) ?? hash.digest('hex').slice(0, 12));

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const editorDist = path.join(root, '.cache', 'editor-dist');
console.log(`== editor (build id ${buildId})`);
run(path.join(repo, 'editor', 'scripts', 'build-site.mjs'), [
  '--out', editorDist, '--no-own-sw', '--sw', '../sw.js', '--sw-scope', '../', '--build-id', buildId, ...forwarded,
]);

console.log('\n== site');
const agdaModeArg = forwarded.indexOf('--agda-mode');
const siteArgs = [
  '--build-id', buildId,
  ...(agdaModeArg >= 0 ? ['--agda-mode', forwarded[agdaModeArg + 1]] : []),
  ...(strict ? ['--strict'] : []),
];
run(path.join(root, 'scripts', 'build.mjs'), ['--editor-dist', editorDist, ...siteArgs]);

// The translations (languages.json says which languages there are, the folders in the repository which of them
// are there): each a site of its own in a directory of the main one (/<code>/), with the editor and the service
// worker of the main site (the pages are the same, so is the Agda code). The language menu lists them all.
for (const language of languages.present(repo).filter((l) => !l.base)) {
  console.log(`\n== site, ${language.code}`);
  run(path.join(root, 'scripts', 'build.mjs'), ['--lang', language.code, '--out', path.join(root, 'dist', language.dir), '--with-editor', ...siteArgs]);
}
