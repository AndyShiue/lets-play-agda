#!/usr/bin/env node
/*
 * Downloads the pinned inputs of the editor into .cache/:
 *
 *   vscode   VS Code for the Web, the build Microsoft distributes (~55 MB).
 *            DEV ONLY: its license does not allow publishing it. For publishing,
 *            build VS Code for the Web from the MIT sources instead.
 *   ext      agda-mode and ALS WASM loader (.vsix from Open VSX, ~2 MB, sha256-checked)
 *   cubical  the cubical library (GitHub source archive, ~2 MB)
 *
 *   node scripts/fetch-inputs.mjs [--only vscode|ext|cubical]... [--cache <dir>] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { unzip } from './unzip.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PINS = {
  vscodeCommit: '2d0b7506a36c1d6db9a466440131a8e01eab2289', // VS Code 1.143.0 (stable)
  agdaMode: {
    url: 'https://open-vsx.org/api/banacorn/agda-mode/0.10.9/file/banacorn.agda-mode-0.10.9.vsix',
    sha256: 'b920b97a070cd8b231530913d0c7372d78a7fe3dc459a1204944e03815a9a4b1',
  },
  alsLoader: {
    url: 'https://open-vsx.org/api/qbane/als-wasm-loader/0.8.5/file/qbane.als-wasm-loader-0.8.5.vsix',
    sha256: '79462a58bd6b80ed502677e514ad7b9a1b6e68743f1bae9f8f6ffc8cb61648d3',
  },
  cubical: {
    url: 'https://codeload.github.com/agda/cubical/zip/refs/tags/v0.9',
  },
};

const argv = process.argv.slice(2);
const only = argv.flatMap((a, i) => (a === '--only' ? [argv[i + 1]] : []));
const cacheArg = argv.indexOf('--cache');
const cache = cacheArg >= 0 ? path.resolve(argv[cacheArg + 1]) : path.join(root, '.cache');
const force = argv.includes('--force');
const wants = (name) => only.length === 0 || only.includes(name);

const downloads = path.join(cache, 'downloads');
fs.mkdirSync(downloads, { recursive: true });

async function download(url, file, expectedSha256) {
  console.log(`  GET ${url}`);
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(file);
  const body = Readable.fromWeb(response.body);
  body.on('data', (chunk) => hash.update(chunk));
  await pipeline(body, out);
  const digest = hash.digest('hex');
  const size = fs.statSync(file).size;
  console.log(`      ${(size / 1048576).toFixed(1)} MB, sha256 ${digest}`);
  if (expectedSha256 && digest !== expectedSha256) {
    fs.rmSync(file);
    throw new Error(`sha256 mismatch for ${url}: expected ${expectedSha256}, got ${digest}`);
  }
}

function fresh(dir, marker) {
  const stamp = path.join(dir, '.fetched');
  return !force && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === marker;
}
function reset(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
const stamp = (dir, marker) => fs.writeFileSync(path.join(dir, '.fetched'), marker);

if (wants('vscode')) {
  console.log('VS Code for the Web (Microsoft build, dev only)');
  const dir = path.join(cache, 'vscode-web');
  const marker = PINS.vscodeCommit;
  if (fresh(dir, marker)) {
    console.log('  up to date');
  } else {
    const file = path.join(downloads, `vscode-web-${PINS.vscodeCommit}.tar.gz`);
    await download(`https://update.code.visualstudio.com/commit:${PINS.vscodeCommit}/web-standalone/stable`, file);
    reset(dir);
    // bsdtar (Windows 10+, macOS) and GNU tar both understand these options
    const result = spawnSync('tar', ['-xzf', file, '-C', dir, '--strip-components=1'], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('tar failed');
    stamp(dir, marker);
  }
}

if (wants('ext')) {
  console.log('Extensions (Open VSX)');
  for (const [name, pin] of [['agda-mode', PINS.agdaMode], ['als-wasm-loader', PINS.alsLoader]]) {
    const dir = path.join(cache, 'ext', name);
    if (fresh(dir, pin.sha256)) {
      console.log(`  ${name}: up to date`);
      continue;
    }
    const file = path.join(downloads, `${name}.vsix`);
    await download(pin.url, file, pin.sha256);
    reset(dir);
    const n = unzip(file, dir, { prefix: 'extension/' });
    console.log(`      extracted ${n} files to ${dir}`);
    stamp(dir, pin.sha256);
  }
}

if (wants('cubical')) {
  console.log('cubical library');
  const dir = path.join(cache, 'cubical');
  const marker = PINS.cubical.url;
  if (fresh(dir, marker)) {
    console.log('  up to date');
  } else {
    const file = path.join(downloads, 'cubical.zip');
    await download(PINS.cubical.url, file);
    reset(dir);
    const n = unzip(file, dir, { strip: 1 });
    console.log(`      extracted ${n} files to ${dir}`);
    stamp(dir, marker);
  }
}

console.log('done');
