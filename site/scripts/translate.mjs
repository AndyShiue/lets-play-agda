#!/usr/bin/env node
/*
 * Tools for the translations of the tutorial: ../Padova2025-<code>/ is the translation of ../Padova2025/ into the
 * language <code> of languages.json, file for file.
 *
 *   node scripts/translate.mjs [--lang <code>] skeleton          create the files that are missing (original text, code ready)
 *   node scripts/translate.mjs [--lang <code>] extract [files…]  print the paragraphs that are not translated yet
 *   node scripts/translate.mjs [--lang <code>] apply <file…>     put translated paragraphs (the same format) into the files
 *   node scripts/translate.mjs [--lang <code>] status            how much is translated
 *   node scripts/translate.mjs [--lang <code>] check             does the translation keep the structure of the original
 *
 * (Without --lang: the translation, if there is one language besides the base.)
 *
 * A file is cut into blocks: blank lines, fenced code, HTML comments (hidden code) and
 * runs of text. Only runs of text are translated; the rest is copied as it is, except that
 * the modules of the translation are named after its folder: `module Padova2025.A.B` is
 * `module Padova2025-<code>.A.B` (and the imports with it). So the folder is an Agda module
 * tree of its own, next to the original's, and its modules cannot clash with the original's.
 * The comments of the code are translated, too (what the build reads is not: `-- Holify`,
 * `-- Tests`, `-- EX:`). The links between the pages are to the pages of the translation:
 * `Padova2025-<code>.A.B.html`; one to Wikipedia may be to the article in the language.
 *
 * The format of `extract` and `apply`: a line `@@ Path/Of/File.lagda.md #<block>`, then the text.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const languages = createRequire(import.meta.url)('./lib/languages.cjs');

const SRC = path.join(repo, languages.base.prefix);
// the language that is worked on: --lang, or the one translation there is
const argv = process.argv.slice(2);
const langAt = argv.indexOf('--lang');
const given = langAt >= 0 ? argv.splice(langAt, 2)[1] : null;
const language = given ? languages.byCode(given) : languages.translations.length === 1 ? languages.translations[0] : null;
if (language?.base) throw new Error('the base language is not a translation');
const DST = path.join(repo, language?.prefix ?? 'Padova2025-<code>');
const PREFIX = language?.prefix ?? 'Padova2025-<code>';

// ---------------------------------------------------------------------------
// blocks
// ---------------------------------------------------------------------------
const FENCE = /^\s*```/;
const COMMENT = /^\s*<!--/;

/** @returns {{kind: 'blank' | 'fence' | 'comment' | 'html' | 'text', lines: string[]}[]} */
export function parse(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { blocks.push({ kind: 'blank', lines: [line] }); i++; continue; }
    if (FENCE.test(line)) {
      let j = i + 1;
      while (j < lines.length && !FENCE.test(lines[j])) j++;
      blocks.push({ kind: 'fence', lines: lines.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (COMMENT.test(line)) {
      let j = i;
      while (j < lines.length && !lines[j].includes('-->')) j++;
      blocks.push({ kind: 'comment', lines: lines.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // scripts, styles and <pre> listings are code, not text
    const raw = /^\s*<(script|style|pre)\b/.exec(line);
    if (raw) {
      let j = i;
      while (j < lines.length && !lines[j].includes(`</${raw[1]}>`)) j++;
      blocks.push({ kind: 'html', lines: lines.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < lines.length && lines[j].trim() !== '' && !FENCE.test(lines[j]) && !COMMENT.test(lines[j])) j++;
    blocks.push({ kind: 'text', lines: lines.slice(i, j) });
    i = j;
  }
  return blocks;
}

const unparse = (blocks) => blocks.flatMap((b) => b.lines).join('\n');

/** Code is copied, with the modules of the translation named after its folder. */
export const renameModules = (line) => line.replace(/(^|[\s(])Padova2025\.(?=[A-Z])/g, `$1${PREFIX}.`);
/** A link to a page (or to the archive) of the tutorial is to the same page of the translation: `](Padova2025.A.html)` → `](Padova2025-<code>.A.html)`. */
export const localizeLinks = (line) => line.replace(/\]\(Padova2025\./g, `](${PREFIX}.`);
/** The text of an original, ready to be translated: its code with the modules of the translation, its links to the translation's pages. */
const codeOf = (text) => unparse(parse(text).map((b) => {
  if (b.kind === 'fence' || b.kind === 'comment') return { ...b, lines: b.lines.map(renameModules) };
  if (b.kind === 'text') return { ...b, lines: b.lines.map(localizeLinks) };
  return b;
}));

/** What is left of a run of text without the things that are not translated. */
function prose(lines) {
  return lines.join('\n')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/`+[^`]*`+/g, ' ')
    .replace(/\$[^$\n]*\$/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/^:::.*$/gm, ' ');
}
// a list of names (the credits) is not translated
const NAME_ITEM = /^\s*[-*]\s+(@\w+|\p{Lu}[\p{L}'’.-]*(\s+[\p{L}'’.-]+){0,4})\s*$/u;
const needsTranslation = (block) => block.kind === 'text' && /[A-Za-z]{3,}/.test(prose(block.lines)) && !block.lines.every((l) => NAME_ITEM.test(l));

// ---------------------------------------------------------------------------
// files
// ---------------------------------------------------------------------------
function listFiles(dir) {
  const result = [];
  (function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.lagda.md')) result.push(path.relative(dir, full).split(path.sep).join('/'));
    }
  })(dir);
  return result.sort();
}

const read = (file) => {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('\r')) throw new Error(`${file} has CRLF line endings`);
  return text;
};

function skeleton() {
  fs.mkdirSync(DST, { recursive: true });
  let created = 0;
  for (const rel of listFiles(SRC)) {
    const dst = path.join(DST, rel);
    if (fs.existsSync(dst)) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, codeOf(read(path.join(SRC, rel)))); // the original's text, to be translated, and its code
    created++;
  }
  console.log(`${created} files created in ${path.relative(repo, DST)}`);
  // its words: the base language's, to be translated, and the "sample" of the pages that the end-to-end test looks for
  const words = path.join(here, '..', 'i18n', `${language.code}.json`);
  if (!fs.existsSync(words)) {
    const base = JSON.parse(fs.readFileSync(path.join(here, '..', 'i18n', `${languages.base.code}.json`), 'utf8'));
    const sample = { title: '', constantsHeading: '', codeComment: '', hintToggle: '' };
    fs.writeFileSync(words, JSON.stringify({ ...base, sample }, null, 2) + '\n');
    console.log(`${path.relative(repo, words)} created: its words are the base language's, to be translated, and the sample is to be filled in (see i18n/zh-TW.json)`);
  }
}

// ---------------------------------------------------------------------------
// extract and apply
// ---------------------------------------------------------------------------
function pairs(rel) {
  const en = parse(read(path.join(SRC, rel)));
  const zh = parse(read(path.join(DST, rel)));
  if (en.length !== zh.length) throw new Error(`${rel}: ${en.length} blocks in the original, ${zh.length} in the translation`);
  return { en, zh };
}

function extract(files, all) {
  let count = 0;
  for (const rel of files.length ? files : listFiles(SRC)) {
    const { en, zh } = pairs(rel);
    en.forEach((block, idx) => {
      if (!needsTranslation(block)) return;
      if (!all && zh[idx].lines.join('\n') !== block.lines.join('\n')) return; // translated already
      console.log(`@@ ${rel} #${idx}\n${block.lines.join('\n')}`);
      count++;
    });
  }
  console.error(`${count} paragraphs`);
}

function readSections(file) {
  const sections = [];
  let current = null;
  for (const line of fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n')) {
    const m = /^@@ (\S+) #(\d+)\s*$/.exec(line);
    if (m) { current = { rel: m[1], idx: Number(m[2]), lines: [] }; sections.push(current); } else if (current) current.lines.push(line);
  }
  for (const s of sections) while (s.lines.length && s.lines.at(-1).trim() === '') s.lines.pop();
  return sections;
}

function apply(inputs) {
  const byFile = new Map();
  for (const input of inputs) for (const s of readSections(input)) {
    if (!byFile.has(s.rel)) byFile.set(s.rel, []);
    byFile.get(s.rel).push(s);
  }
  let applied = 0;
  const problems = [];
  for (const [rel, sections] of byFile) {
    const { en, zh } = pairs(rel);
    for (const s of sections) {
      if (!needsTranslation(en[s.idx] ?? { kind: '' })) { problems.push(`${rel} #${s.idx}: not a paragraph to translate`); continue; }
      if (s.lines.length === 0 || s.lines.some((l) => l.trim() === '')) { problems.push(`${rel} #${s.idx}: empty, or a blank line inside`); continue; }
      zh[s.idx] = { kind: 'text', lines: s.lines };
      applied++;
    }
    fs.writeFileSync(path.join(DST, rel), unparse(zh));
  }
  console.log(`${applied} paragraphs applied in ${byFile.size} files`);
  for (const p of problems) console.log('  problem: ' + p);
  if (problems.length) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// status and check
// ---------------------------------------------------------------------------
function status(verbose) {
  let total = 0;
  let todo = 0;
  const rows = [];
  for (const rel of listFiles(SRC)) {
    if (!fs.existsSync(path.join(DST, rel))) { rows.push([rel, 'missing']); continue; }
    const { en, zh } = pairs(rel);
    let t = 0;
    let u = 0;
    en.forEach((b, i) => { if (needsTranslation(b)) { t++; if (zh[i].lines.join('\n') === b.lines.join('\n')) u++; } });
    total += t;
    todo += u;
    rows.push([rel, `${t - u}/${t}`]);
  }
  if (verbose) for (const [rel, s] of rows) console.log(`${s.padStart(8)}  ${rel}`);
  console.log(`translated: ${total - todo} of ${total} paragraphs (${total ? Math.round(((total - todo) / total) * 100) : 0}%), ${rows.filter(([, s]) => s === 'missing').length} files missing`);
}

/**
 * What a translation of a line of code keeps: all of it, but the words of a comment (`-- …`) are
 * the translation's. The markers the build looks for (`-- Holify`, `-- Tests`, `-- EX: …`,
 * `-- EXERCISE STARTS`, `-- EXERCISE ENDS`) are code and stay as they are.
 */
export function withoutCommentWords(line) {
  const m = /(^|\s)--(\s.*|)$/.exec(line);
  if (!m || /^(Holify|Tests|EX:|EXERCISE (STARTS|ENDS))/.test(m[2].trim())) return line;
  return line.slice(0, m.index + m[1].length) + '--';
}

/** What a translation must keep of a run of text, whatever the words around it. */
function structure(lines) {
  const text = lines.join('\n');
  const take = (re, group = 0) => [...text.matchAll(re)].map((m) => m[group]).sort();
  return {
    code: take(/(`+)[^`]+\1/g).map((m) => m.replace(/\s+/g, ' ').replace(new RegExp(PREFIX + '\\.', 'g'), 'Padova2025.')).sort(), // (a line break inside a span is a space; a module may be named by either prefix)
    math: take(/\$\$[\s\S]*?\$\$|\$[^$]+\$/g).map((m) => m.replace(/\s+/g, ' ')).sort(), // (a formula may be broken over lines)
    // (a link to another page is to the translation's page, one to Wikipedia may be to the article in its language)
    urls: take(/\]\(([^)\s]*)[^)]*\)|\b(?:href|src)="([^"]*)"/g, 0).map((m) => m.replace(/^.*?(\]\(|href="|src=")/, '')
      .replace(new RegExp('^' + PREFIX + '([.-])'), 'Padova2025$1').replace(/^https:\/\/[\w-]+\.wikipedia\.org\/.*$/, 'wikipedia')).sort(),
    tags: take(/<\/?[a-zA-Z][^>]*>/g),
    fences: lines.filter((l) => /^\s*:::/.test(l)),
    headings: lines.filter((l) => /^#+\s/.test(l)).map((l) => /^#+/.exec(l)[0]),
    items: lines.filter((l) => /^\s*([-*+]|\d+\.)\s/.test(l)).length,
  };
}

function check() {
  const problems = [];
  const english = new Set(listFiles(SRC));
  const chinese = new Set(fs.existsSync(DST) ? listFiles(DST) : []);
  for (const f of english) if (!chinese.has(f)) problems.push(`${f}: missing in the translation`);
  for (const f of chinese) if (!english.has(f)) problems.push(`${f}: no such file in the original`);
  // The library file is the one at the root of the repository, which serves both trees (their modules are named
  // `Padova2025.…` and `Padova2025-<code>.…`). A file below the root, in the folder of a tree, is an error in Agda
  // (LibTooFarDown), and a second one at the root is one, too (several .agda-lib files in one directory).
  for (const dir of [SRC, DST]) {
    (function look(d) {
      for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
        if (e.isDirectory()) look(path.join(d, e.name));
        else if (e.name.endsWith('.agda-lib')) problems.push(`${path.relative(repo, path.join(d, e.name))}: an .agda-lib file below the root of the modules; Agda refuses to load the files under it (LibTooFarDown)`);
      }
    })(dir);
  }
  for (const rel of [...english].filter((f) => chinese.has(f))) {
    let en;
    let zh;
    try { ({ en, zh } = pairs(rel)); } catch (e) { problems.push(e.message); continue; }
    en.forEach((b, i) => {
      const z = zh[i];
      if (z.kind !== b.kind) { problems.push(`${rel} #${i}: ${b.kind} became ${z.kind}`); return; }
      if (b.kind !== 'text') {
        const want = b.lines.map((l) => withoutCommentWords(renameModules(l))).join('\n');
        if (want !== z.lines.map(withoutCommentWords).join('\n')) problems.push(`${rel} #${i}: ${b.kind} differs from the original (apart from the words of comments)`);
        return;
      }
      const a = structure(b.lines);
      const c = structure(z.lines);
      for (const key of Object.keys(a)) {
        if (JSON.stringify(a[key]) !== JSON.stringify(c[key])) {
          problems.push(`${rel} #${i}: ${key} differ: ${JSON.stringify(a[key]).slice(0, 90)} → ${JSON.stringify(c[key]).slice(0, 90)}`);
          break;
        }
      }
    });
  }
  console.log(problems.length ? problems.slice(0, 60).join('\n') + (problems.length > 60 ? `\n… and ${problems.length - 60} more` : '') : 'the translation keeps the structure of the original');
  console.log(`${problems.length} problem(s)`);
  process.exitCode = problems.length ? 1 : 0;
}

// ---------------------------------------------------------------------------
const [command, ...rest] = argv; // (what is left of the arguments, without --lang)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!language && ['skeleton', 'extract', 'apply', 'status', 'check'].includes(command)) {
    console.error(`which language? --lang <code>: one of ${languages.translations.map((l) => l.code).join(', ') || '(none in languages.json)'}`);
    process.exitCode = 2;
  } else if (command === 'skeleton') skeleton();
  else if (command === 'extract') extract(rest.filter((a) => !a.startsWith('--')), rest.includes('--all'));
  else if (command === 'apply') apply(rest);
  else if (command === 'status') status(rest.includes('-v'));
  else if (command === 'check') check();
  else { console.error('usage: translate.mjs [--lang <code>] skeleton | extract [files…] [--all] | apply <file…> | status [-v] | check'); process.exitCode = 2; }
}
