#!/usr/bin/env node
/*
 * End-to-end test of the built site (dist/) in a Chromium-based browser, against a
 * GitHub-Pages-like server (no COOP/COEP headers):
 *
 *   1. reading: navigation without reloads, sidebar, progress marks
 *   2. "Edit" on an exercise: the page becomes isolated (service worker + one
 *      reload), the editor iframe starts VS Code, the exercise file opens, Agda
 *      loads it and reports its goals
 *   3. solving: the reference solution is pasted into the editor; Agda says
 *      "All Done"; the page records the exercise as solved
 *   4. a new visit: the solved state and the reader's code are still there, and
 *      reopening the exercise restores the reader's code
 *   5. with the server stopped, the site and the editor still work
 *
 * Needs Playwright (`npm i`, or NODE_PATH) and an installed Chromium-based browser
 * (E2E_CHANNEL=msedge by default, or chrome). Run `npm run build` first.
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
const repo = path.resolve(root, '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright-core')); } catch { ({ chromium } = require('playwright')); }
const exercises = require('./lib/exercises.cjs');

const PORT = Number(process.env.E2E_PORT ?? 8096);
const BASE = '/lets-play-agda/';
const URL_ = `http://localhost:${PORT}${BASE}`;
const CHANNEL = process.env.E2E_CHANNEL ?? 'msedge';
const HEADED = process.argv.includes('--headed');
const OUT = path.join(root, '.cache', 'e2e');
fs.mkdirSync(OUT, { recursive: true });

const MODULE = 'Padova2025.ProgrammingBasics.Booleans';
const PAGE = `${URL_}Padova2025.ProgrammingBasics.Booleans.html`;
const SOLVED_KEY = `lpa:solved:${MODULE}/1`;

const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's', ...a);
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// server
// ---------------------------------------------------------------------------
let server;
async function startServer() {
  server = spawn(process.execPath, [path.join(repo, 'editor', 'scripts', 'serve.mjs'), '--dir', path.join(root, 'dist'), '--port', String(PORT), '--base', BASE], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://localhost:${PORT}/__stats`); return; } catch { await sleep(100); }
  }
  throw new Error('server did not start');
}
const stopServer = () => new Promise((resolve) => { server.once('exit', resolve); server.kill(); });

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const editorFrame = (page) => page.frames().find((f) => /\/editor\/\?/.test(f.url()));

async function agdaPanel(page) {
  const texts = [];
  for (const f of page.frames()) {
    if (!/\/webview\/browser\/pre\//.test(f.url())) continue;
    try {
      const t = await f.evaluate(() => document.body?.innerText?.trim() ?? '');
      if (t) texts.push(t.replace(/\s+/g, ' '));
    } catch { /* frame is going away */ }
  }
  return texts.join(' || ');
}

async function waitFor(what, fn, timeoutS, intervalMs = 1000) {
  const start = Date.now();
  let last;
  while ((Date.now() - start) / 1000 < timeoutS) {
    last = await fn().catch(() => undefined);
    if (last) return last;
    await sleep(intervalMs);
  }
  throw new Error(`timed out after ${timeoutS}s waiting for ${what}`);
}

async function waitAgda(page, pattern, timeoutS) {
  let text = '';
  await waitFor(`Agda panel ${pattern}`, async () => (pattern.test((text = await agdaPanel(page))) ? text : null), timeoutS);
  return text;
}

// like waitAgda, but ignores what the panel showed before the command was run
async function waitAgdaChange(page, previous, pattern, timeoutS) {
  let text = '';
  await waitFor(`a new Agda panel ${pattern}`, async () => ((text = await agdaPanel(page)) !== previous && pattern.test(text) ? text : null), timeoutS);
  return text;
}

async function runCommand(page, text) {
  await page.keyboard.press('F1');
  await editorFrame(page).waitForSelector('.quick-input-widget', { state: 'visible' });
  await page.keyboard.type(text, { delay: 15 });
  await sleep(600);
  await page.keyboard.press('Enter');
}

async function openExercise(page) {
  await page.click('#exercise-1 [data-action="edit"]');
}

async function editorText(page) {
  const frame = editorFrame(page);
  return (await frame.locator('.monaco-editor[data-uri*="Ex1.agda"] .view-lines').first().innerText()).replace(/ /g, ' ');
}

// the line of the hole in the exercise file the editor shows
const holeLine = (() => {
  const info = exercises.moduleInfo(fs.readFileSync(path.join(repo, 'Padova2025', 'ProgrammingBasics', 'Booleans.lagda.md'), 'utf8'));
  const file = exercises.buildExerciseFile(info.blocks, info.exercises[0].block, MODULE, 1);
  return file.text.split('\n').findIndex((l) => l === 'idBool x = {!!}') + 1;
})();

// Typing in Monaco re-indents multi-line input, so only the hole's line is replaced.
async function fillHole(page) {
  await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"] .view-lines').first().click();
  await page.keyboard.press('Control+g');
  await page.keyboard.type(String(holeLine));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.keyboard.insertText('idBool x = x');
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('dist/ is missing: run `npm run build` first.');
  process.exit(2);
}

await startServer();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lpa-site-e2e-'));
const context = await chromium.launchPersistentContext(profile, { channel: CHANNEL, headless: !HEADED, viewport: { width: 1360, height: 900 } });
const errors = [];
let exitCode = 0;

try {
  // ---- 1. reading ---------------------------------------------------------
  log('--- 1. reading');
  let page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(URL_);
  await page.waitForSelector('#content');
  check('welcome page renders with the table of contents', (await page.locator('.toc li.page a').count()) > 50);

  await page.click('a[data-module="' + MODULE + '"]');
  await page.waitForFunction((m) => document.querySelector('#content')?.dataset.module === m, MODULE);
  check('navigation without reload (URL changed, sidebar follows)', page.url().endsWith('Padova2025.ProgrammingBasics.Booleans.html') && (await page.getAttribute('.toc a[aria-current="page"]', 'data-module')) === MODULE);
  check('page has its 3 exercises', (await page.locator('.exercise').count()) === 3);
  await page.screenshot({ path: path.join(OUT, '1-reading.png') });

  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 60000 });
  check('service worker controls the page', true);

  await page.click('a[data-module="Padova2025.Welcome.About"]');
  await page.waitForFunction(() => document.querySelector('#content')?.dataset.module === 'Padova2025.Welcome.About');
  await page.waitForFunction(() => document.querySelectorAll('#char-table tr').length > 20, null, { timeout: 10000 });
  check('the About page lists the Unicode symbols with their key sequences', true);
  await page.click('a[data-module="' + MODULE + '"]');
  await page.waitForFunction((m) => document.querySelector('#content')?.dataset.module === m, MODULE);

  // ---- 2. open the exercise ----------------------------------------------
  log('--- 2. open the exercise (isolation reload, VS Code, Agda)');
  await openExercise(page);
  await page.waitForFunction(() => crossOriginIsolated, null, { timeout: 60000 });
  check('the page became cross-origin isolated', true);
  await waitFor('editor iframe', async () => editorFrame(page), 60);
  await waitFor('VS Code workbench', async () => (await editorFrame(page).locator('.monaco-workbench').count()) > 0, 120);
  log('VS Code is up');
  const opened = await waitFor('exercise file in the editor', async () => (await editorFrame(page).locator('.monaco-editor[data-uri*="/Exercise/ProgrammingBasics/Booleans/Ex1.agda"]').count()) > 0, 120);
  check('the exercise file is open (lpa:/Exercise/ProgrammingBasics/Booleans/Ex1.agda)', !!opened);
  const text = await editorText(page);
  check('it contains the exercise with a hole', /idBool/.test(text) && /\{!/.test(text), text.replace(/\s+/g, ' ').slice(0, 80));
  const goals = await waitAgda(page, /All Goals|Error/, 240);
  log('Agda says:', goals.slice(0, 100));
  check('Agda loads the exercise and shows 1 goal', /All Goals/.test(goals) && /\?0 : Bool/.test(goals), goals.slice(0, 100));
  await page.screenshot({ path: path.join(OUT, '2-editor.png') });

  // ---- 3. solve -----------------------------------------------------------
  log('--- 3. solve it');
  await fillHole(page);
  await sleep(1500); // autosave
  const before = await agdaPanel(page);
  await runCommand(page, 'Agda: Load');
  const done = await waitAgdaChange(page, before, /All Done|Error/, 240);
  check('Agda says "All Done" for the solved exercise', /All Done/.test(done), done.slice(0, 100));
  await waitFor('the page to record the exercise as solved', () => page.evaluate((k) => localStorage.getItem(k), SOLVED_KEY), 30);
  const saved = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), SOLVED_KEY));
  check('the page stored the reader\'s solution', /idBool x = x/.test(saved.code), JSON.stringify(saved.code).slice(0, 70));
  check('the activity calendar appears', (await page.locator('#activity:not([hidden]) .daybox.active').count()) >= 1);
  check('the exercise card shows "Solved" and the sidebar marks progress',
    (await page.locator('#exercise-1.solved').count()) === 1 && (await page.locator('.toc a[data-module="' + MODULE + '"]').evaluate((a) => a.parentElement.dataset.status)) === 'some');
  await page.screenshot({ path: path.join(OUT, '3-solved.png') });
  await page.close();

  // ---- 4. a new visit -----------------------------------------------------
  log('--- 4. a new visit');
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(PAGE);
  await page.waitForSelector('#exercise-1');
  check('solved state and code are still there', (await page.locator('#exercise-1.solved .your-code code').innerText()).includes('idBool x = x'));
  await openExercise(page);
  await waitFor('editor iframe', async () => editorFrame(page), 60);
  await waitFor('exercise file', async () => (await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"]').count()) > 0, 120);
  await sleep(1500);
  check('reopening the exercise restores the reader\'s code', /idBool x = x/.test(await editorText(page)));
  const again = await waitAgda(page, /All Done|All Goals|Error/, 240);
  check('Agda checks the restored file: All Done', /All Done/.test(again), again.slice(0, 80));
  await page.close();

  // ---- 4b. a new deployment reaches a returning visitor --------------------
  // Simulated by changing the files of dist/ the way a new build would: a new build id
  // (the name of the worker's caches) and a changed file of the editor.
  log('--- 4b. a new deployment');
  const dist = (f) => path.join(root, 'dist', f);
  const MARKER = 'lpa-e2e-new-deployment';
  fs.appendFileSync(dist('editor/extensions/lets-play-agda-fs/extension.js'), `\n// ${MARKER}\n`);
  for (const f of [dist('sw-common.js'), dist('editor/vscode/out/vs/workbench/contrib/webview/browser/pre/sw-common.js')]) {
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/(CACHE_PREFIX \+ '(?:site-)?)[0-9a-f]{12}/, '$1e2e0update00'));
  }
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(PAGE);
  await page.waitForSelector('#exercise-1', { timeout: 30000 });
  const gotNew = await waitFor('the new version',
    () => page.evaluate(async (m) => (await (await fetch('editor/extensions/lets-play-agda-fs/extension.js')).text()).includes(m), MARKER), 60).then(() => true, () => false);
  check('a returning visitor gets the new version without closing every tab', gotNew);
  // the site's own files are cached per build, so the editor refills that cache once, online
  await openExercise(page);
  await waitFor('exercise file', async () => (await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"]').count()) > 0, 120);
  const afterUpdate = await waitAgda(page, /All Done|All Goals|Error/, 240);
  check('the editor works after the update', /All Done/.test(afterUpdate), afterUpdate.slice(0, 80));
  // by now both workers (the site's and the webview's) are the new ones
  const cacheNames = await page.evaluate(() => caches.keys()).catch(() => []);
  check('old caches are removed, the (unchanged) VS Code files stay cached',
    cacheNames.some((n) => n.startsWith('lpa-static-')) && cacheNames.filter((n) => n.startsWith('lpa-site-')).length === 1, cacheNames.join(', '));

  // ---- 5. offline ---------------------------------------------------------
  log('--- 5. server stopped');
  await page.close();
  await stopServer();
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(PAGE);
  await page.waitForSelector('#exercise-1', { timeout: 30000 });
  check('with the server stopped the page still loads (service worker cache)', true);
  await page.click('a[data-module="Padova2025.ProgrammingBasics.Operators"]');
  await page.waitForFunction(() => document.querySelector('#content')?.dataset.module === 'Padova2025.ProgrammingBasics.Operators', null, { timeout: 15000 });
  check('and other pages work offline, too', true);
  await page.goto(PAGE);
  await page.waitForSelector('#exercise-1');
  await openExercise(page);
  await waitFor('editor iframe', async () => editorFrame(page), 60);
  await waitFor('exercise file', async () => (await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"]').count()) > 0, 120);
  const offline = await waitAgda(page, /All Done|All Goals|Error/, 240);
  check('the editor works offline: Agda checks the exercise', /All Done/.test(offline), offline.slice(0, 80));
  await page.screenshot({ path: path.join(OUT, '5-offline.png') });
} catch (err) {
  exitCode = 1;
  console.error(err);
  check('e2e run completed', false, String(err).slice(0, 200));
} finally {
  if (errors.length) log('page errors:', [...new Set(errors)].slice(0, 5).join(' | '));
  await context.close().catch(() => {});
  if (server && server.exitCode === null) server.kill();
  fs.rmSync(profile, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(exitCode || (failed.length ? 1 : 0));
