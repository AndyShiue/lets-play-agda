/*
 * Unit tests for the links of the highlighter (scripts/lib/agda.mjs): which uses of a
 * declared name link to its declaration, and which do not.
 *
 *   node --test scripts/test-links.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { highlight, collectDeclarations, addOperatorParts } from './lib/agda.mjs';

const entry = (name, kind = 'function', module = 'M') => [name, { kind, module, name }];
const names = (...entries) => addOperatorParts(new Map(entries));
const href = (e) => `${e.module}.html#${e.name}`;
const links = (html) => [...html.matchAll(/<a class="(\w+)" href="([^"]*)">([^<]*)<\/a>/g)].map((m) => `${m[3]}→${m[2]}`);

test('a use of a declared name links to its declaration, coloured like it', () => {
  const html = highlight('x : ℕ\nx = double zero\n', { names: names(entry('double'), entry('zero', 'constructor')), href });
  assert.deepEqual(links(html), ['double→M.html#double', 'zero→M.html#zero']);
  assert.match(html, /<a class="fn" href="M\.html#double">double<\/a>/);
  assert.match(html, /<a class="ct" href="M\.html#zero">zero<\/a>/);
});

test('the declaration itself is not a link, it carries the anchor', () => {
  const html = highlight('double : ℕ → ℕ\n', { names: names(entry('double')), href });
  assert.deepEqual(links(html), []);
  assert.match(html, /<a id="double" class="decl"><\/a><span class="fn">double<\/span>/);
});

test('without an href nothing links (code blocks that are not Agda)', () => {
  assert.deepEqual(links(highlight('x = double\n', { names: names(entry('double')) })), []);
});

test('a name that a lambda or a telescope binds is the local one: not linked', () => {
  const n = names(entry('g'));
  assert.deepEqual(links(highlight('h = λ g → g\n', { names: n, href })), []);
  assert.deepEqual(links(highlight('h : (g : ℕ) → ℕ\n', { names: n, href })), []);
  assert.deepEqual(links(highlight('h : {g : ℕ} → ∀ g → ℕ\n', { names: n, href })), []);
  assert.deepEqual(links(highlight('h = λ (g : ℕ) → g\n', { names: n, href })), []);
});

test('the variables of the patterns of a clause are local, its constructors are not', () => {
  const n = names(entry('g'), entry('zero', 'constructor'), entry('suc', 'constructor'));
  const html = highlight('f : ℕ → ℕ\nf (suc g) = g\nf zero = zero\n', { names: n, href });
  assert.deepEqual(links(html), ['suc→M.html#suc', 'zero→M.html#zero', 'zero→M.html#zero']);
});

test('the binders of one declaration do not hide the name in the next one', () => {
  const n = names(entry('g'));
  const html = highlight('h = λ g → g\n\nk = g\n', { names: n, href });
  assert.deepEqual(links(html), ['g→M.html#g']);
});

test('the parts of a mixfix name link to the whole name', () => {
  const n = names(entry('_+_'), entry('_≡⟨_⟩_'), entry('if_then_else_'));
  const html = highlight('p = a + b\nq = x ≡⟨ r ⟩ y\nr = if c then d else e\n', { names: n, href });
  assert.deepEqual(links(html), [
    '+→M.html#_+_', '≡⟨→M.html#_≡⟨_⟩_', '⟩→M.html#_≡⟨_⟩_', 'if→M.html#if_then_else_', 'then→M.html#if_then_else_', 'else→M.html#if_then_else_',
  ]);
});

test('a part never replaces a name that is declared itself', () => {
  const n = names(entry('+'), entry('_+_'));
  assert.deepEqual(links(highlight('p = a + b\n', { names: n, href })), ['+→M.html#+']);
});

test('generalized variables are not names to link to', () => {
  const declared = collectDeclarations('variable A B : Set\nid : A → A\n');
  assert.equal(declared.get('A'), 'variable');
  assert.equal(declared.get('id'), 'function');
  const html = highlight('k : A → A\n', { names: new Map([...declared].map(([name, kind]) => entry(name, kind))), href });
  assert.deepEqual(links(html), []);
});

test('comments, strings and holes are left alone', () => {
  const html = highlight('x = f -- double\ny = "double" {! double !}\n{- double -}\n', { names: names(entry('f'), entry('double')), href });
  assert.deepEqual(links(html), ['f→M.html#f']);
});

test('what a link collects: the declaration, once, with the token as written', () => {
  const collect = new Map();
  highlight('a = a + a\n', { names: names(entry('_+_')), href, collect });
  assert.deepEqual([...collect.keys()], ['M#_+_']);
  assert.equal(collect.get('M#_+_').token, '+');
  assert.equal(collect.get('M#_+_').href, 'M.html#_+_');
});

test('an href that says null leaves the name unlinked (its declaration has no anchor)', () => {
  assert.deepEqual(links(highlight('x = f\n', { names: names(entry('f')), href: () => null })), []);
});

test('Set, Set₁, Setω and Prop link to Agda\'s documentation where the code links, and only there', () => {
  const linked = highlight('X : Set → Set₁\nY : Prop\nZ : Setω\n', { names: new Map(), href });
  const docs = 'https://agda\\.readthedocs\\.io/en/latest/language/';
  assert.match(linked, new RegExp(`<a class="so" href="${docs}universe-levels\\.html" target="_blank" rel="noopener"[^>]*>Set</a>`));
  assert.match(linked, new RegExp(`universe-levels\\.html"[^>]*>Set₁</a>`));
  assert.match(linked, new RegExp(`universe-levels\\.html"[^>]*>Setω</a>`));
  assert.match(linked, new RegExp(`prop\\.html"[^>]*>Prop</a>`));
  assert.match(highlight('X : Set\n', { names: new Map() }), /<span class="so">Set<\/span>/);
});

test('the ∈ of Σ[ x ∈ A ] is notation, not the operator _∈_', () => {
  const html = highlight('f : Σ[ x ∈ A ] B\ng = a ∈ b\n', { names: names(entry('_∈_')), href });
  assert.deepEqual(links(html), ['∈→M.html#_∈_']); // only the one of the second line
});

test('a declared ∷ links, an undeclared one stays a symbol', () => {
  assert.deepEqual(links(highlight('x = a ∷ b\n', { names: names(entry('_∷_', 'constructor')), href })), ['∷→M.html#_∷_']);
  assert.match(highlight('x = a ∷ b\n', { names: new Map(), href }), /<span class="sy">∷<\/span>/);
});

test('postulated names, record constructors and indented data types are declarations', () => {
  const declared = collectDeclarations('postulate\n  P Q : Set\n  R : Set\n\nmodule M where\n  data Acc : Set where\n    acc : Acc\n\nrecord Σ : Set where\n  constructor _,_\n  field\n    fst : A\n');
  for (const name of ['P', 'Q', 'R']) assert.equal(declared.get(name), 'function');
  assert.equal(declared.get('Acc'), 'datatype');
  assert.equal(declared.get('acc'), 'constructor');
  assert.equal(declared.get('_,_'), 'constructor');
  assert.equal(declared.get('fst'), 'field');
  const inline = collectDeclarations('postulate A B : Set\n');
  assert.equal(inline.get('A'), 'function');
  assert.equal(inline.get('B'), 'function');
});
