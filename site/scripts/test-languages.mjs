/*
 * Unit tests for the languages of the site: the registry (languages.json, lib/languages.cjs), what is derived from the
 * code of a language, and the words files of i18n/ (every language has one, and a translation's agree with the base's).
 *
 *   node --test scripts/test-languages.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const languages = require('./lib/languages.cjs');
const exercises = require('./lib/exercises.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const words = (code) => JSON.parse(fs.readFileSync(path.join(root, 'i18n', `${code}.json`), 'utf8'));

test('there is one base language, English first, and the names of a language follow from its code', () => {
  assert.equal(languages.base.code, 'en');
  assert.equal(languages.all[0], languages.base);
  assert.equal(languages.base.prefix, 'Padova2025');
  assert.equal(languages.base.dir, '');
  for (const language of languages.translations) {
    assert.equal(language.prefix, `Padova2025-${language.code}`);
    assert.equal(language.exercisePrefix, `Exercise-${language.code}`);
    assert.equal(language.dir, language.code);
    assert.ok(language.name && language.htmlLang, `${language.code} has a name and an html lang`);
  }
  assert.throws(() => languages.byCode('xx'), /unknown language "xx"/);
});

test('the languages that are there: the base always, a translation when its folder is', () => {
  const repo = path.resolve(root, '..');
  const present = languages.present(repo).map((language) => language.code);
  assert.equal(present[0], 'en');
  for (const language of languages.translations) assert.equal(present.includes(language.code), fs.existsSync(path.join(repo, language.prefix)));
  const empty = fs.mkdtempSync(path.join(root, '.cache-test-'));
  try { assert.deepEqual(languages.present(empty).map((language) => language.code), ['en']); } finally { fs.rmSync(empty, { recursive: true }); }
});

test('exercise names follow the code of any language (the extension has no list of languages)', () => {
  for (const code of ['zh-TW', 'ja', 'pt-BR']) {
    const module_ = `Padova2025-${code}.Chapter.Module`;
    assert.deepEqual(exercises.splitModuleName(module_), { prefix: `Padova2025-${code}`, rest: 'Chapter.Module', exercisePrefix: `Exercise-${code}` });
    assert.equal(exercises.exerciseModuleName(module_, 3), `Exercise-${code}.Chapter.Module.Ex3`);
    assert.equal(exercises.exercisePath(module_, 3), `/Exercise-${code}/Chapter/Module/Ex3.agda`);
    assert.deepEqual(exercises.exerciseSourceModule(`/Exercise-${code}/Chapter/Module/Ex3.agda`), { moduleName: module_, ordinal: 3 });
    assert.match(exercises.expandTests('-- EX: a ≡ b\n', module_), new RegExp(`open import Padova2025-${code}\\.ProvingBasics\\.Equality\\.Base\\n`));
  }
  assert.deepEqual(exercises.splitModuleName('Padova2025.A.B'), { prefix: 'Padova2025', rest: 'A.B', exercisePrefix: 'Exercise' });
});

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const texts = (word) => (typeof word === 'object' ? Object.values(word) : [word]);

test('every language has a words file; a translation has no word that the base language lacks, and the same placeholders', () => {
  const base = words(languages.base.code);
  for (const language of languages.all) {
    const own = words(language.code);
    for (const part of ['ui', 'script']) {
      for (const [key, word] of Object.entries(own[part] ?? {})) {
        assert.ok(key in base[part], `${language.code}: "${key}" is not a word of the base language`);
        // (the plural forms of a language have the placeholders that the base's has, or fewer: a language without "one" says it once)
        const wanted = new Set(texts(base[part][key]).flatMap(placeholders));
        for (const text of texts(word)) for (const name of placeholders(text)) assert.ok(wanted.has(name), `${language.code}: "${key}" has {${name}}, which the base language's does not`);
        if (typeof word === 'object') assert.ok('other' in word, `${language.code}: the plural forms of "${key}" need "other"`);
      }
    }
  }
});

test('a translation has the "sample" that the end-to-end test looks for in its pages', () => {
  for (const language of languages.translations) {
    const { sample } = words(language.code);
    for (const key of ['title', 'constantsHeading', 'codeComment', 'hintToggle']) assert.ok(sample?.[key], `${language.code}: sample.${key}`);
  }
});
