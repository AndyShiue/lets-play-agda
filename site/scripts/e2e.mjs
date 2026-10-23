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
// The test changes files to simulate a new deployment (4b), so it runs on a copy of dist/:
// dist/ is what gets deployed, and a run once left its test build id in the live site.
const SERVED = path.join(root, '.cache', 'e2e-dist');

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
  server = spawn(process.execPath, [path.join(repo, 'editor', 'scripts', 'serve.mjs'), '--dir', SERVED, '--port', String(PORT), '--base', BASE], { stdio: 'ignore' });
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

// the input of agda-mode's prompt for an expression to evaluate, in the Agda panel
async function expressionPrompt(page) {
  for (const f of page.frames()) {
    if (!/\/webview\/browser\/pre\//.test(f.url())) continue;
    const input = f.locator('input[placeholder*="expression"]');
    if (await input.count().catch(() => 0)) return input.first();
  }
  return null;
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

const editorGroups = (page) => editorFrame(page).locator('.editor-group-container').count();

// the colour of a point of an element, at fractions of its width and height (the screenshot is decoded in the page)
async function pixelOf(page, locator, fx, fy) {
  const png = (await locator.screenshot()).toString('base64');
  return page.evaluate(async ([b64, x, y]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return [...ctx.getImageData(Math.min(bitmap.width - 1, Math.floor(bitmap.width * x)), Math.min(bitmap.height - 1, Math.floor(bitmap.height * y)), 1, 1).data].slice(0, 3);
  }, [png, fx, fy]);
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
fs.rmSync(SERVED, { recursive: true, force: true });
fs.cpSync(path.join(root, 'dist'), SERVED, { recursive: true });

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

  // the reference solution is asked for BEFORE it is shown
  await page.evaluate(() => {
    const box = document.querySelector('#exercise-2 details.solution');
    const ask = window.confirm;
    window.__asked = [];
    window.confirm = (message) => { window.__asked.push(box.open); return ask.call(window, message); };
  });
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.click('#exercise-2 details.solution > summary');
  check('declining the question keeps the reference solution closed', !(await page.$eval('#exercise-2 details.solution', (d) => d.open)));
  page.once('dialog', (dialog) => dialog.accept());
  await page.click('#exercise-2 details.solution > summary');
  check('agreeing opens it, and the question came while it was still closed',
    (await page.$eval('#exercise-2 details.solution', (d) => d.open)) && (await page.evaluate(() => window.__asked)).every((open) => open === false));

  // the notices that float above the page follow the theme: dark in dark mode, light in light mode
  const noticeBackgrounds = () => page.evaluate(() => ['update-bar', 'toast show'].map((className) => {
    const el = Object.assign(document.createElement('div'), { className });
    document.body.append(el);
    const rgb = getComputedStyle(el).backgroundColor.match(/\d+/g).slice(0, 3).map(Number);
    el.remove();
    return rgb;
  }));
  await page.emulateMedia({ colorScheme: 'dark' });
  const darkNotices = await noticeBackgrounds();
  await page.emulateMedia({ colorScheme: 'light' });
  const lightNotices = await noticeBackgrounds();
  await page.emulateMedia({ colorScheme: null });
  check('in dark mode the reload notice and the toast are dark, in light mode light',
    darkNotices.every((rgb) => Math.max(...rgb) < 80) && lightNotices.every((rgb) => Math.min(...rgb) > 200),
    `dark ${JSON.stringify(darkNotices)}, light ${JSON.stringify(lightNotices)}`);

  // ---- 1c. links from the code to the declarations, and the hints ---------
  log('--- 1c. links to declarations; the names a reference solution uses');
  const useOfTrue = page.locator('#content pre.agda a.ct[href="#true"]').first();
  check('a use of a name in the code is a link to its declaration (true → #true)', (await useOfTrue.count()) === 1);
  await useOfTrue.click();
  check('clicking it goes to the declaration on the page', new URL(page.url()).hash === '#true' && (await page.locator('[id="true"]').count()) === 1, page.url());

  // Set is built into Agda, so there is no declaration to go to: Agda's documentation, in a tab of its own
  const setLink = page.locator('#content pre.agda a.so').first();
  check('`Set` links to Agda\'s documentation, in a tab of its own',
    /agda\.readthedocs\.io\/en\/latest\/language\/universe-levels\.html$/.test((await setLink.getAttribute('href')) ?? '')
    && (await setLink.getAttribute('target')) === '_blank' && /noopener/.test((await setLink.getAttribute('rel')) ?? ''));

  // exercise 2's reference solution uses false and true: blurred until clicked
  const chips = page.locator('#exercise-2 .hints a.hint');
  check('exercise 2 lists the names its reference solution uses: false, true', (await chips.allInnerTexts()).join(',') === 'false,true');
  const filter = await chips.first().evaluate((a) => getComputedStyle(a).filter);
  check('the names are blurred until clicked', /blur/.test(filter), filter);
  const urlBeforeClick = page.url();
  await chips.first().click();
  // the blur goes away in a short transition
  const unblurred = await waitFor('the blur to go', () => chips.first().evaluate((a) => a.classList.contains('shown') && getComputedStyle(a).filter === 'none'), 5).catch(() => false);
  check('a click shows the name and stays on the page', !!unblurred && page.url() === urlBeforeClick);
  await chips.first().click();
  check('the next click goes to its declaration', new URL(page.url()).hash === '#false', page.url());
  check('an exercise with nothing to hint at has no list', (await page.locator('#exercise-1 .hints').count()) === 0);

  // the Operators page imports this one: the module name of the `open import` links to its page
  await page.click('a[data-module="Padova2025.ProgrammingBasics.Operators"]');
  await page.waitForFunction(() => document.querySelector('#content')?.dataset.module === 'Padova2025.ProgrammingBasics.Operators');
  const importLink = page.locator('#content pre.agda a.mo[href="Padova2025.ProgrammingBasics.Booleans.html"]').first();
  check('the module named by an `open import` is a link to its page', (await importLink.count()) === 1);
  await importLink.click();
  await page.waitForFunction((m) => document.querySelector('#content')?.dataset.module === m, MODULE);
  check('and the link goes to that page', page.url().endsWith('Padova2025.ProgrammingBasics.Booleans.html'), page.url());
  await page.click('a[data-module="Padova2025.ProgrammingBasics.Operators"]');
  await page.waitForFunction(() => document.querySelector('#content')?.dataset.module === 'Padova2025.ProgrammingBasics.Operators');

  // a use on another page of a name declared on this one goes there
  const across =page.locator('#content pre.agda a[href^="Padova2025.ProgrammingBasics.Booleans.html#"]').first();
  const acrossHref = await across.getAttribute('href');
  await across.click();
  await page.waitForFunction((m) => document.querySelector('#content')?.dataset.module === m, MODULE);
  check('a use of a name from another page goes to its declaration there', page.url().endsWith(acrossHref), `${acrossHref} → ${page.url()}`);

  await page.click('a[data-module="Padova2025.Welcome.About"]');
  await page.waitForFunction(() => document.querySelector('#content')?.dataset.module === 'Padova2025.Welcome.About');
  await page.waitForFunction(() => document.querySelectorAll('#char-table tr').length > 20, null, { timeout: 10000 });
  check('the About page lists the Unicode symbols with their key sequences', true);
  await page.click('a[data-module="' + MODULE + '"]');
  await page.waitForFunction((m) => document.querySelector('#content')?.dataset.module === m, MODULE);

  // ---- 1b. the editor button, before any exercise --------------------------
  log('--- 1b. open the editor without an exercise');
  await page.click('#editor-toggle');
  await page.waitForFunction(() => crossOriginIsolated, null, { timeout: 60000 });
  await waitFor('VS Code workbench', async () => editorFrame(page) && (await editorFrame(page).locator('.monaco-workbench').count()) > 0, 120);
  await sleep(1500);
  check('the editor opens by itself, with no error message', (await editorFrame(page).locator('#lpa-status.error').count()) === 0
    && (await page.locator('#app.editor-open').count()) === 1);

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
  // folded: what is left to see is the exercise as the page shows it, nothing above, no tests below
  const folds = () => editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"] .codicon-folding-collapsed').count();
  await waitFor('the code above and the tests below to be folded', async () => (await folds()) === 2, 30).catch(() => {});
  await sleep(500);
  // without whitespace: the editor wraps long lines, and the page's block has a "Copy" button
  const norm = (s) => s.replace(/\s+/g, '');
  const pageCode = norm(await page.locator('#exercise-1 > pre.agda').first().innerText()).replace(/Copy$/, '');
  // (besides the exercise, the two lines the folds hang on)
  const editorCode = norm((await editorText(page)).replace('-- EXERCISE STARTS', '').replace('-- EXERCISE ENDS', ''));
  const visibleLines = (await editorText(page)).split('\n').map((line) => line.trim()).filter(Boolean);
  check('the folds hang on `-- EXERCISE STARTS` above and `-- EXERCISE ENDS` below the exercise',
    visibleLines[0] === '-- EXERCISE STARTS' && visibleLines.at(-1) === '-- EXERCISE ENDS', JSON.stringify([visibleLines[0], visibleLines.at(-1)]));
  check('the code above the exercise and the tests below it are folded', (await folds()) === 2, `${await folds()} folds`);
  check('what the editor shows is exactly what the page shows for the exercise', editorCode === pageCode, `editor: ${editorCode.slice(0, 90)} | page: ${pageCode.slice(0, 90)}`);
  const goals = await waitAgda(page, /All Goals|Error/, 240);
  log('Agda says:', goals.slice(0, 100));
  check('Agda loads the exercise and shows 1 goal', /All Goals/.test(goals) && /\?0 : Bool/.test(goals), goals.slice(0, 100));
  await page.screenshot({ path: path.join(OUT, '2-editor.png') });

  // ---- 2b. the symbol bar ------------------------------------------------
  // Candidates for what is typed after a backslash, tapped into the text: for a phone,
  // where agda-mode's input method does not work. Switched on here by its button.
  log('--- 2b. the symbol bar');
  const BS = String.fromCharCode(92); // a backslash
  const bar = page.locator('#symbol-bar');
  const hasSymbol = (symbol) => bar.locator('button').evaluateAll((buttons, s) => buttons.some((b) => b.dataset.text === s), symbol);
  const holeText = async () => (await editorText(page)).split('\n').find((l) => l.includes('idBool x'));
  await page.click('[data-action="symbols"]');
  await waitFor('the idle bar: a backslash button and the common symbols', async () => (await bar.isVisible()) && (await hasSymbol(BS)) && (await hasSymbol('→')), 30);
  check('the button shows the symbol bar: a backslash button, then the symbols the tutorial uses most', true);

  const holeLineOfEditor = editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"] .view-line', { hasText: 'idBool x' }).first();
  await holeLineOfEditor.click();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); // idBool x = {!|!}
  await page.keyboard.type(BS + 'to', { delay: 60 });
  await waitFor('the candidates for the sequence', async () => (await bar.locator('button[data-message="im-pick"]').count()) > 0, 30);
  const first = await bar.locator('button[data-message="im-pick"]').first().evaluate((b) => b.dataset.text);
  check('typing a backslash and `to` in the hole lists candidates, the exact match first', first === '→', `first candidate: ${first}`);
  check('the typed text is left alone (the bar replaces it, agda-mode\'s input method is off)', (await holeText()).includes('{!' + BS + 'to!}'), await holeText());
  await bar.locator('button[data-text="→"]').first().click();
  await waitFor('the arrow in the hole', async () => (await holeText()).includes('{!→!}'), 15);
  check('tapping the candidate replaces the typed sequence, inside the hole', (await holeText()).includes('{!→!}'), await holeText());

  await bar.locator('button').filter({ has: page.locator('.sym-c', { hasText: BS }) }).first().click();
  await waitFor('the backslash', async () => (await holeText()).includes('{!→' + BS + '!}'), 15);
  await page.keyboard.type('bN', { delay: 60 });
  await waitFor('the candidate for bN', async () => (await bar.locator('button[data-message="im-pick"]').first().evaluate((b) => b.dataset.text).catch(() => null)) === 'ℕ', 30);
  await bar.locator('button[data-text="ℕ"]').first().click();
  await waitFor('ℕ in the hole', async () => (await holeText()).includes('{!→ℕ!}'), 15);
  check('the backslash button starts a sequence; `bN` offers ℕ', (await holeText()).includes('{!→ℕ!}'), await holeText());

  await waitFor('the idle bar again', async () => (await bar.locator('button[data-message="im-insert"]').count()) > 1, 15);
  await bar.locator('button[data-text="≡"]').first().click();
  await waitFor('≡ in the hole', async () => (await holeText()).includes('{!→ℕ≡!}'), 15);
  check('without a backslash before the cursor a symbol of the bar is put in at the cursor', (await holeText()).includes('{!→ℕ≡!}'), await holeText());
  await page.screenshot({ path: path.join(OUT, '2b-symbol-bar.png') });

  // ---- 2c. the command bar -------------------------------------------------
  // Agda's commands as buttons, for a screen without a keyboard (they are key chords).
  log('--- 2c. the command bar');
  const commandBar = page.locator('#command-bar');
  await page.click('[data-action="commands"]');
  await waitFor('the command bar', async () => (await commandBar.isVisible()) && (await commandBar.locator('button').count()) >= 10, 30);
  const labels = await commandBar.locator('.cmd-l').allInnerTexts();
  check('the λ button shows the commands as buttons: Load, Case split, Give, Evaluate, …',
    ['Load', 'Case split', 'Give', 'Refine', 'Evaluate', 'Goal & context'].every((l) => labels.includes(l)), labels.join(', '));

  // the cursor is still in the hole: the goal and its context
  await commandBar.locator('button[data-key="goal-context"]').click();
  const goalText = await waitFor('the goal and its context', async () => { const t = await agdaPanel(page); return /x : Bool/.test(t) ? t : null; }, 60).catch(() => null);
  check('"Goal & context" shows the goal at the cursor with its context', !!goalText, (goalText ?? await agdaPanel(page)).slice(0, 120));

  // "Evaluate" in a hole evaluates what is in the hole (as in Emacs: the tutorial says to put the
  // expression in the hole); the hole holds `→ℕ≡` by now, which Agda does not understand
  const inHole = await agdaPanel(page);
  await commandBar.locator('button[data-key="normalize"]').click();
  const evaluated = await waitFor('the hole to be evaluated', async () => { const t = await agdaPanel(page); return t !== inHole && /error|normal form/i.test(t) ? t : null; }, 30).catch(() => null);
  check('"Evaluate" in a hole evaluates the hole (no question asked)', !!evaluated && !(await expressionPrompt(page)), (evaluated ?? '').slice(0, 100));

  // out of the hole: it asks for an expression in the Agda panel, and "Cancel" (Esc) takes the question away
  await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"] .view-line', { hasText: 'idBool :' }).first().click();
  await commandBar.locator('button[data-key="normalize"]').click();
  const asked = await waitFor('the prompt of Evaluate', () => expressionPrompt(page), 30).catch(() => null);
  check('"Evaluate" outside a hole asks for an expression to evaluate', !!asked);
  await commandBar.locator('button[data-key="cancel"]').click();
  const gone = await waitFor('the prompt to go', async () => ((await expressionPrompt(page)) ? null : true), 15).catch(() => null);
  check('"Cancel" takes the question away', !!gone);
  await page.screenshot({ path: path.join(OUT, '2c-command-bar.png') });

  // ---- 3. solve -----------------------------------------------------------
  log('--- 3. solve it');
  await fillHole(page);
  await sleep(1500); // autosave
  const before = await agdaPanel(page);
  await page.locator('#command-bar button[data-key="load"]').click(); // the Load button of the command bar (2c)
  const done = await waitAgdaChange(page, before, /All Done|Error/, 240);
  check('Agda says "All Done" for the solved exercise (loaded by the command bar\'s Load button)', /All Done/.test(done), done.slice(0, 100));
  await waitFor('the page to record the exercise as solved', () => page.evaluate((k) => localStorage.getItem(k), SOLVED_KEY), 30);
  const saved = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), SOLVED_KEY));
  check('the page stored the reader\'s solution', /idBool x = x/.test(saved.code), JSON.stringify(saved.code).slice(0, 70));
  check('the activity calendar appears', (await page.locator('#activity:not([hidden]) .daybox.active').count()) >= 1);
  check('the exercise card shows "Solved" and the sidebar marks progress',
    (await page.locator('#exercise-1.solved').count()) === 1 && (await page.locator('.toc a[data-module="' + MODULE + '"]').evaluate((a) => a.parentElement.dataset.status)) === 'some');
  await page.screenshot({ path: path.join(OUT, '3-solved.png') });

  // C-c C-v evaluates an expression: the tutorial's shortcut for it, because in a browser
  // C-n (agda-mode's) opens a new window. Without a binding the keys copy and paste the line.
  const keysBefore = await editorText(page);
  await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"] .view-line', { hasText: 'idBool x' }).first().click();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  const prompt = await waitFor('the prompt of C-c C-v', () => expressionPrompt(page), 30).catch(() => null);
  check('C-c C-v asks for an expression to evaluate', !!prompt);
  if (prompt) {
    await prompt.fill('idBool false');
    await prompt.press('Enter');
    const value = await waitFor('the value', async () => {
      const t = await agdaPanel(page);
      return /normal form/i.test(t) && /\bfalse\b/.test(t) ? t : null;
    }, 60).catch(() => null);
    check('and shows the value: idBool false is false', !!value, (value ?? await agdaPanel(page)).slice(0, 200));
  }
  check('C-c C-v left the editor text alone (no copy and paste of the line)', (await editorText(page)) === keysBefore);
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
  // agda-mode opens a group for its panel on every start; the one of the last visit must not stay behind
  await sleep(1500);
  check('a new visit shows the file and the Agda panel, and no leftover empty group', (await editorGroups(page)) === 2, `${await editorGroups(page)} groups`);

  // restarting the editor (the button in its bar): the exercise must come back
  await page.click('[data-action="editor-reload"]');
  await waitFor('the exercise file after the restart', async () => editorFrame(page) && (await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"]').count()) > 0, 120);
  await sleep(1500);
  check('restarting the editor brings the exercise back, with the reader\'s code', /idBool x = x/.test(await editorText(page)));
  const restarted = await waitAgda(page, /All Done|All Goals|Error/, 240);
  check('and Agda checks it again', /All Done/.test(restarted), restarted.slice(0, 80));
  await sleep(1500);
  check('restarting the editor leaves no extra group behind', (await editorGroups(page)) === 2, `${await editorGroups(page)} groups`);

  // reloading the whole page with the editor open
  await page.reload();
  await page.waitForSelector('#exercise-1');
  await waitFor('the editor to come back', async () => (await page.locator('#app.editor-open').count()) === 1 && editorFrame(page), 30);
  await waitFor('the exercise file after reloading the page', async () => (await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"]').count()) > 0, 120);
  await sleep(1500);
  check('reloading the page brings the editor back with the exercise', /idBool x = x/.test(await editorText(page)));
  await waitAgda(page, /All Done|All Goals|Error/, 240);
  await sleep(1500);
  check('and still no extra group', (await editorGroups(page)) === 2, `${await editorGroups(page)} groups`);

  // dark mode: the Agda panel must not sit on a white backdrop
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await page.waitForSelector('#exercise-1');
  await waitFor('the editor to come back', async () => (await page.locator('#app.editor-open').count()) === 1 && editorFrame(page), 30);
  await waitAgda(page, /All Done|All Goals|Error/, 240);
  await sleep(1500);
  const webview = editorFrame(page).locator('iframe.webview:visible').first();
  const edges = [await pixelOf(page, webview, 0.003, 0.5), await pixelOf(page, webview, 0.5, 0.97)];
  check('in dark mode the Agda panel has a dark background, not white', edges.every((rgb) => Math.max(...rgb) < 100), JSON.stringify(edges));
  await page.screenshot({ path: path.join(OUT, '4-dark.png') });
  await page.emulateMedia({ colorScheme: null });
  await page.close();

  // ---- 4b. a new deployment reaches a returning visitor --------------------
  // Simulated by changing the files of the served copy the way a new build would: a new
  // build id (the name of the worker's caches) and a changed file of the editor.
  log('--- 4b. a new deployment');
  const served = (f) => path.join(SERVED, f);
  const MARKER = 'lpa-e2e-new-deployment';
  fs.appendFileSync(served('editor/extensions/lets-play-agda-fs/extension.js'), `\n// ${MARKER}\n`);
  for (const f of [served('sw-common.js'), served('editor/vscode/out/vs/workbench/contrib/webview/browser/pre/sw-common.js')]) {
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/(CACHE_PREFIX \+ '(?:site-)?)[0-9a-f]{12}/, '$1e2e0update00'));
  }
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(PAGE);
  await page.waitForSelector('#exercise-1', { timeout: 30000 });
  // the new worker takes over while the page is open: the page offers a reload
  const offered = await page.waitForSelector('.update-bar', { timeout: 60000 }).then(() => true, () => false);
  check('the page offers a reload once the new version has taken over', offered);
  if (offered) {
    // the notice is in the colours of the theme (looked at by eye: .cache/e2e/update-notice-dark.png)
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.locator('.update-bar').screenshot({ path: path.join(OUT, 'update-notice-dark.png') });
    await page.emulateMedia({ colorScheme: null });
  }
  const gotNew = await waitFor('the new version',
    () => page.evaluate(async (m) => (await (await fetch('editor/extensions/lets-play-agda-fs/extension.js')).text()).includes(m), MARKER), 60).then(() => true, () => false);
  check('a returning visitor gets the new version without closing every tab', gotNew);
  // The site's own files are cached per build, and the editor's when first used: the reload
  // that the notice asks for brings the editor up through the new worker, online.
  await Promise.all([page.waitForEvent('load', { timeout: 30000 }), page.click('.update-bar .btn')]);
  await page.waitForSelector('#exercise-1');
  await waitFor('the editor to come back', async () => (await page.locator('#app.editor-open').count()) === 1 && editorFrame(page), 30);
  await waitFor('exercise file', async () => (await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"]').count()) > 0, 120);
  const afterUpdate = await waitAgda(page, /All Done|All Goals|Error/, 240);
  check('the editor works after the update', /All Done/.test(afterUpdate), afterUpdate.slice(0, 80));
  const editorPageCachedIn = await page.evaluate(async () => {
    const found = [];
    for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) if (/\/editor\/(\?|index|$)/.test(r.url)) found.push(name);
    return found;
  });
  check('the new version has the editor page cached', editorPageCachedIn.length === 1 && editorPageCachedIn[0].startsWith('lpa-site-e2e0update00'), editorPageCachedIn.join(', ') || 'not cached');
  // both workers (the site's and the webview's) become the new ones; the webview's
  // takes a moment (it updates when a webview opens), so give it time
  const cacheDump = () => page.evaluate(async () => {
    const out = {};
    for (const name of await caches.keys()) out[name] = (await (await caches.open(name)).keys()).length;
    return out;
  }).catch(() => ({}));
  const cleaned = await waitFor('old caches to be removed', async () => {
    const names = Object.keys(await cacheDump());
    return names.some((n) => n.startsWith('lpa-static-')) && names.filter((n) => n.startsWith('lpa-site-')).length === 1;
  }, 60).then(() => true, () => false);
  const dump = await cacheDump();
  log('caches (name: entries):', JSON.stringify(dump));
  check('old caches are removed, the (unchanged) VS Code files stay cached', cleaned, Object.keys(dump).join(', '));

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
  await waitFor('editor iframe', async () => editorFrame(page), 20).catch(async (err) => {
    const info = await page.evaluate(async () => {
      const keys = [];
      for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) if (/\/editor\/(\?|index|$)/.test(r.url)) keys.push(`${name}: ${r.url}`);
      return { iframes: [...document.querySelectorAll('iframe')].map((f) => f.src), appClass: document.getElementById('app')?.className, keys };
    }).catch((e) => ({ error: String(e) }));
    log('no editor iframe offline:', JSON.stringify({ frames: page.frames().map((f) => f.url()), ...info }));
    throw err;
  });
  await waitFor('exercise file', async () => (await editorFrame(page).locator('.monaco-editor[data-uri*="Ex1.agda"]').count()) > 0, 120);
  const offline = await waitAgda(page, /All Done|All Goals|Error/, 240);
  check('the editor works offline: Agda checks the exercise', /All Done/.test(offline), offline.slice(0, 80));
  await page.screenshot({ path: path.join(OUT, '5-offline.png') });

  // what is in dist/ gets deployed: nothing of the simulated deployment may have got there
  const swCommon = fs.readFileSync(path.join(root, 'dist', 'sw-common.js'), 'utf8');
  const extension = fs.readFileSync(path.join(root, 'dist', 'editor', 'extensions', 'lets-play-agda-fs', 'extension.js'), 'utf8');
  check('the test left dist/ (what gets deployed) untouched', !swCommon.includes('e2e0update00') && !extension.includes(MARKER));
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
