#!/usr/bin/env node
/*
 * End-to-end check of the static editor, against a GitHub-Pages-like server
 * (no COOP/COEP headers), in a real Chromium-based browser:
 *
 *   visit 1  empty profile: service worker installs, page reloads, becomes
 *            cross-origin isolated, VS Code starts, Agda loads a file that
 *            imports the cubical library
 *   visit 2  same profile: everything should come from the cache
 *   visit 3  server stopped: the editor must still start and check Agda
 *
 * Needs Playwright (`npm i` in this directory, or NODE_PATH) and an installed
 * Chromium-based browser (default: Microsoft Edge; set E2E_CHANNEL=chrome
 * for Chrome). Run `npm run build` first.
 *
 *   node scripts/e2e.mjs [--headed]
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright-core')); } catch { ({ chromium } = require('playwright')); }

const PORT = Number(process.env.E2E_PORT ?? 8099);
const BASE = '/lets-play-agda/editor/';
const URL_ = `http://localhost:${PORT}${BASE}`;
const CHANNEL = process.env.E2E_CHANNEL ?? 'msedge';
const HEADED = process.argv.includes('--headed');
const OUT = path.join(root, '.cache', 'e2e');
fs.mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's', ...a);
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

// ---------------------------------------------------------------------------
// server
// ---------------------------------------------------------------------------
let server;
async function startServer() {
  server = spawn(process.execPath, [path.join(root, 'scripts', 'serve.mjs'), '--port', String(PORT), '--base', BASE], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://localhost:${PORT}/__stats`); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
}
const stats = async (reset = false) => (await fetch(`http://localhost:${PORT}/__stats${reset ? '?reset=1' : ''}`)).json();
const stopServer = () => new Promise((resolve) => { server.once('exit', resolve); server.kill(); });

// ---------------------------------------------------------------------------
// page helpers
// ---------------------------------------------------------------------------
async function panelText(page) {
  const out = [];
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    try {
      const t = await f.evaluate(() => document.body?.innerText?.trim() ?? '');
      if (t && !/vscodeWebWorkerExtHostId/.test(t)) out.push(t.replace(/\s+/g, ' ').slice(0, 300));
    } catch {}
  }
  return out.join(' || ');
}

async function runCommand(page, text) {
  await page.keyboard.press('F1');
  await page.waitForSelector('.quick-input-widget', { state: 'visible' });
  await page.keyboard.type(text, { delay: 15 });
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
}

async function expandPath(page, folders) {
  for (const f of folders) {
    const row = page.getByRole('treeitem', { name: f, exact: true });
    if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
  }
}

async function openFirstSteps(page) {
  if (await page.locator('.monaco-editor[data-uri*="FirstSteps"]').count()) return;
  await runCommand(page, 'Collapse Folders in Explorer');
  await page.waitForTimeout(1000);
  await expandPath(page, ['Padova2025', 'Cubical']);
  await page.getByRole('treeitem', { name: 'FirstSteps.lagda.md', exact: true }).click();
  await page.waitForSelector('.monaco-editor[data-uri*="FirstSteps"] .view-lines');
}

async function agdaLoad(page, timeoutS = Number(process.env.E2E_AGDA_TIMEOUT ?? 240)) {
  await openFirstSteps(page);
  await page.waitForTimeout(800);
  const t = Date.now();
  await runCommand(page, 'Agda: Load');
  let text = '';
  for (let i = 0; i < timeoutS; i++) {
    await page.waitForTimeout(1000);
    text = await panelText(page);
    if (/All Done|All Goals|Error|Warnings/i.test(text) && !/Loading|Type-checking/.test(text)) break;
  }
  return { seconds: (Date.now() - t) / 1000, text };
}

function attachNetworkRecorder(context, origin) {
  const record = { external: [], failed: [] };
  context.on('requestfinished', async (req) => {
    const url = req.url();
    if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith(origin)) return;
    let fromSW = false;
    try { fromSW = (await req.response())?.fromServiceWorker() ?? false; } catch {}
    record.external.push({ url: url.slice(0, 140), viaSWNetwork: !!req.serviceWorker(), answeredBySW: fromSW });
  });
  context.on('requestfailed', (req) => {
    const url = req.url();
    if (url.startsWith('blob:') || url.startsWith('data:')) return;
    record.failed.push(url.slice(0, 140) + ' ' + (req.failure()?.errorText ?? ''));
  });
  return record;
}

const summarizePaths = (paths) => {
  const groups = new Map();
  for (const p of paths) {
    const r = p.slice(BASE.length);
    const key = r.split('/').slice(0, r.startsWith('vscode/out') ? 3 : 2).join('/') || '/';
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${v}× ${k}`).join(', ');
};

async function visit(context, name, { expectOffline = false } = {}) {
  log(`--- ${name}`);
  await stats(true).catch(() => {});
  const net = attachNetworkRecorder(context, `http://localhost:${PORT}`);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

  const t = Date.now();
  await page.goto(URL_, { waitUntil: 'commit' }).catch(() => {});
  await page.waitForSelector('.monaco-workbench', { timeout: 150000 });
  const readyS = (Date.now() - t) / 1000;
  const isolated = await page.evaluate(() => crossOriginIsolated);
  log(`${name}: workbench ready after ${readyS.toFixed(1)}s, crossOriginIsolated=${isolated}`);
  check(`${name}: page is cross-origin isolated`, isolated === true);

  const load = await agdaLoad(page);
  log(`${name}: Agda: Load -> ${load.seconds.toFixed(1)}s: ${load.text.slice(0, 120)}`);
  check(`${name}: Agda type-checks FirstSteps (imports Cubical.Foundations.Prelude)`, /All Done|All Goals/.test(load.text), load.text.slice(0, 100));
  await page.screenshot({ path: path.join(OUT, `${name.replace(/\W+/g, '-')}.png`) });

  const storage = await page.evaluate(async () => {
    let entries = 0;
    let bytes = 0;
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        bytes += (await response.clone().blob()).size;
        entries++;
      }
    }
    const estimate = await navigator.storage.estimate();
    return { entries, bytes, usage: estimate.usage, quota: estimate.quota };
  });
  log(`${name}: Cache Storage holds ${storage.entries} entries, ${(storage.bytes / 1048576).toFixed(1)} MB; ` +
    `origin storage in use ${(storage.usage / 1048576).toFixed(0)} MB of ${(storage.quota / 1073741824).toFixed(1)} GB`);

  let serverStats = null;
  if (!expectOffline) {
    serverStats = await stats();
    log(`${name}: server saw ${serverStats.total} requests: ${summarizePaths(serverStats.paths)}`);
  }
  const external = net.external.filter((e) => e.viaSWNetwork || !e.answeredBySW);
  log(`${name}: external requests that hit the network: ${external.length}${external.length ? '\n      ' + external.map((e) => e.url).join('\n      ') : ''}`);
  if (net.failed.length) log(`${name}: failed requests:\n      ${[...new Set(net.failed)].slice(0, 10).join('\n      ')}`);
  if (errors.length) log(`${name}: page errors: ${errors.slice(0, 3).join(' | ')}`);
  await page.close();
  return { readyS, load, serverStats, external, failed: net.failed };
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('dist/ is missing: run `npm run build` first.');
  process.exit(2);
}

await startServer();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lpa-e2e-'));
const context = await chromium.launchPersistentContext(profile, {
  channel: CHANNEL,
  headless: !HEADED,
  viewport: { width: 1280, height: 820 },
});

let exitCode = 0;
try {
  const v1 = await visit(context, 'visit 1 (cold)');

  const v2 = await visit(context, 'visit 2 (warm)');
  check('visit 2: far fewer requests reach the server than on visit 1',
    v2.serverStats.total < v1.serverStats.total * 0.2,
    `${v2.serverStats.total} vs ${v1.serverStats.total}`);
  check('visit 2: no external request hits the network', v2.external.length === 0, v2.external.map((e) => e.url).join(', '));

  await stopServer();
  const v3 = await visit(context, 'visit 3 (server stopped)', { expectOffline: true });
  check('visit 3: works with the server stopped', /All Done|All Goals/.test(v3.load.text));
} catch (err) {
  exitCode = 1;
  console.error(err);
  check('e2e run completed', false, String(err).slice(0, 200));
} finally {
  await context.close().catch(() => {});
  if (server && server.exitCode === null) server.kill();
  fs.rmSync(profile, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(exitCode || (failed.length ? 1 : 0));
