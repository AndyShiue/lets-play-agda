#!/usr/bin/env node
/*
 * Opens exercises of the built site in the embedded editor and reports what Agda
 * says about each (goals = fine, an error before any edit = a problem in the
 * exercise file or the browser setup).
 *
 *   node scripts/smoke.mjs Padova2025.Cubical.FirstSteps:1 Padova2025.ProvingBasics.Equality.NaturalNumbers:1 ...
 *
 * Same requirements as e2e.mjs (Playwright, Edge/Chrome, a built dist/).
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

const targets = process.argv.slice(2).filter((a) => !a.startsWith('--')).map((a) => {
  const [module, ordinal] = a.split(':');
  return { module, ordinal: Number(ordinal ?? 1) };
});
if (!targets.length) {
  console.error('usage: node scripts/smoke.mjs <Module>:<exercise number> ...');
  process.exit(2);
}

const PORT = Number(process.env.E2E_PORT ?? 8095);
const BASE = '/lets-play-agda/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, [path.join(repo, 'editor', 'scripts', 'serve.mjs'), '--dir', path.join(root, 'dist'), '--port', String(PORT), '--base', BASE], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${PORT}/__stats`); break; } catch { await sleep(100); } }

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lpa-smoke-'));
const context = await chromium.launchPersistentContext(profile, { channel: process.env.E2E_CHANNEL ?? 'msedge', headless: !process.argv.includes('--headed'), viewport: { width: 1360, height: 900 } });
let failures = 0;

async function panel(page) {
  const texts = [];
  for (const f of page.frames()) {
    if (!/\/webview\/browser\/pre\//.test(f.url())) continue;
    try { const t = await f.evaluate(() => document.body?.innerText?.trim() ?? ''); if (t) texts.push(t.replace(/\s+/g, ' ')); } catch { /* going away */ }
  }
  return texts.join(' || ');
}

for (const { module, ordinal } of targets) {
  const page = await context.newPage();
  const started = Date.now();
  let verdict;
  try {
    const href = module === 'Padova2025.Welcome' ? 'index.html' : `${module}.html`;
    await page.goto(`http://localhost:${PORT}${BASE}${href}`);
    // an exercise inside a folded "More" section is in the page but not visible
    await page.waitForSelector(`#exercise-${ordinal}`, { state: 'attached', timeout: 30000 });
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 60000 });
    await page.$eval(`#exercise-${ordinal} [data-action="edit"]`, (button) => button.click());
    await page.waitForFunction(() => crossOriginIsolated, null, { timeout: 60000 });
    let text = '';
    for (let i = 0; i < 300; i++) {
      await sleep(1000);
      text = await panel(page);
      if (/All Goals|All Done|Error|Warnings/.test(text) && !/Loading|Type-checking/.test(text)) break;
    }
    const seconds = ((Date.now() - started) / 1000).toFixed(0);
    const goalsOnly = /All Goals/.test(text) && !/Error/.test(text.replace(/All Goals, Errors/, '')) ;
    const parseOrScope = /ParseError|NotInScope|ImportError|Cannot find|not found|LibraryError|Module .* not found/i.test(text);
    verdict = parseOrScope ? 'PROBLEM' : goalsOnly || /All Goals/.test(text) ? 'ok' : 'check';
    console.log(`${verdict.padEnd(8)} ${module}:${ordinal}  ${seconds}s  ${text.slice(0, 160)}`);
    if (verdict === 'PROBLEM') failures++;
  } catch (err) {
    failures++;
    console.log(`FAILED   ${module}:${ordinal}  ${String(err).slice(0, 120)}`);
  }
  await page.close();
}

await context.close();
server.kill();
fs.rmSync(profile, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
