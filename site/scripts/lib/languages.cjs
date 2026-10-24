'use strict';

/*
 * The languages of the site, from ../../languages.json (the list is the order of the language menu).
 *
 * One of them is the base, the language of the tutorial's own files (Padova2025/, modules `Padova2025.…`, the
 * pages at the root of the site). Every other language is a translation, by convention:
 *
 *   folder and module prefix   Padova2025-<code>        (Padova2025-zh-TW/, `Padova2025-zh-TW.Booleans`)
 *   exercise modules           Exercise-<code>.…        (the files `Exercise-zh-TW/…/Ex1.agda` of the editor)
 *   its pages                  <code>/ in the site      (…/zh-TW/Padova2025-zh-TW.Booleans.html)
 *
 * so that a language needs one entry in languages.json, its words in ../../i18n/<code>.json and its folder.
 */
const fs = require('node:fs');
const path = require('node:path');
const registry = require('../../languages.json');

function describe(entry) {
  const base = !!entry.base;
  return {
    ...entry,
    base,
    prefix: base ? 'Padova2025' : `Padova2025-${entry.code}`,
    exercisePrefix: base ? 'Exercise' : `Exercise-${entry.code}`,
    dir: base ? '' : entry.code, // the directory of its pages in the site
  };
}

const all = registry.languages.map(describe);
const bases = all.filter((language) => language.base);
if (bases.length !== 1) throw new Error('languages.json needs exactly one base language');
const codes = new Set(all.map((language) => language.code));
if (codes.size !== all.length) throw new Error('languages.json: a language code is there twice');

module.exports = {
  all,
  base: bases[0],
  translations: all.filter((language) => !language.base),
  byCode(code) {
    const found = all.find((language) => language.code === code);
    if (!found) throw new Error(`unknown language "${code}" (languages.json has: ${all.map((language) => language.code).join(', ')})`);
    return found;
  },
  /** The languages whose files are in the repository (the base one always), in the order of the menu. */
  present(repoDir) {
    return all.filter((language) => language.base || fs.existsSync(path.join(repoDir, language.prefix)));
  },
};
