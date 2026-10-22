#!/usr/bin/env node
/*
 * Sanity checks on the generated pages: leftovers of Markdown syntax or
 * placeholders in the prose, unbalanced tags, duplicate ids.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
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

for (const file of fs.readdirSync(dist).filter((f) => f.endsWith('.html') && f !== '404.html')) {
  const html = fs.readFileSync(path.join(dist, file), 'utf8');
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

console.log(problems.length ? problems.join('\n') : 'no problems found');
console.log(`${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
