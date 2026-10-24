#!/usr/bin/env node
/*
 * Sanity checks on the generated pages: leftovers of Markdown syntax or
 * placeholders in the prose, unbalanced tags, duplicate ids.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const languages = createRequire(import.meta.url)('./lib/languages.cjs');
const problems = [];
const stripCode = (html) => html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '');
const count = (text, re) => (text.match(re) || []).length;

const LEFTOVERS = [
  [/\*\*[^*\s][^*]*\*\*/, 'bold markers'],
  [/(^|\s)\*[^*\s][^*]*\*(\s|$)/, 'emphasis markers'],
  [/^:::/m, 'fenced div'],
  [/<!--/, 'html comment'],
  [/\$[^$\s][^$]*\$/, 'math'],
  [/\]\([^)]*\)/, 'link syntax'],
];

// the pages of the main site and of its translations (a directory each)
const pageDirs = languages.all.map((language) => path.join(dist, language.dir)).filter((d) => fs.existsSync(d));
for (const [dir, file] of pageDirs.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.html') && f !== '404.html').map((f) => [d, f]))) {
  const html = fs.readFileSync(path.join(dir, file), 'utf8');
  const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
  const text = stripCode(article).replace(/<[^>]*>/g, ' ');
  const report = (what, sample = '') => problems.push(`${file}: ${what}${sample ? ': ' + sample.replace(/\s+/g, ' ').slice(0, 90) : ''}`);

  if (/[\u0001\u0002]/.test(article)) report('placeholder leaked');
  for (const [re, name] of LEFTOVERS) {
    const m = re.exec(text);
    if (m) report(`leftover ${name}`, text.slice(Math.max(0, m.index - 30), m.index + 60));
  }
  for (const tag of ['div', 'section', 'details', 'ul', 'ol', 'table', 'blockquote', 'pre']) {
    const open = count(article, new RegExp(`<${tag}[\\s>]`, 'g'));
    const close = count(article, new RegExp(`</${tag}>`, 'g'));
    if (open !== close) report(`unbalanced <${tag}>`, `${open} open, ${close} close`);
  }
  const ids = [...article.matchAll(/(?<![\w-])id="([^"]+)"/g)].map((m) => m[1]);
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicates.length) report('duplicate ids', duplicates.join(', '));
}

// GitHub's upload-pages-artifact leaves hidden files (names starting with a dot) out
// of the deployment, so nothing the site needs may be one. Third-party trees
// (the VS Code build and the extensions) are not ours to police.
(function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(dist, full).split(path.sep).join('/');
    if (relative === 'editor/vscode' || relative === 'editor/extensions') continue;
    if (entry.name.startsWith('.') && entry.name !== '.nojekyll') {
      problems.push(`hidden file or directory, not published by upload-pages-artifact: ${relative}`);
    }
    if (entry.isDirectory()) scan(full);
  }
})(dist);

// The end-to-end test fakes a new deployment (a build id of its own, a marker in the
// extension) in a copy of the build; none of that may be in what gets deployed: with the
// same build id in every deployment, the readers' service workers never update.
for (const [file, leftover] of [
  ['sw-common.js', 'e2e0update00'],
  ['editor/extensions/lets-play-agda-fs/extension.js', 'lpa-e2e-new-deployment'],
]) {
  const full = path.join(dist, file);
  if (fs.existsSync(full) && fs.readFileSync(full, 'utf8').includes(leftover)) problems.push(`${file}: contains "${leftover}", left by the end-to-end test`);
}

console.log(problems.length ? problems.join('\n') : 'no problems found');
console.log(`${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
