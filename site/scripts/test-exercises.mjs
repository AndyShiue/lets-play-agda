/*
 * Unit tests for the exercise conventions (scripts/lib/exercises.cjs). They
 * include the cases of the original project's extraction tests.
 *
 *   node --test scripts/test-exercises.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const ex = createRequire(import.meta.url)('./lib/exercises.cjs');

/** The exercise file for the (only / first) exercise of a source, as text. */
function exerciseFile(source, moduleName = 'Padova2025.Test') {
  const { blocks } = ex.splitModule(source);
  const [first] = ex.listExercises(blocks);
  return ex.buildExerciseFile(blocks, first.block, moduleName, first.ordinal).text;
}

test('Holify: the solution after the marker becomes `name = {!!}`', () => {
  const { shown } = ex.holeify('return : {A : Set} → A → ¬ ¬ A\n-- Holify\nreturn x = λ k → k x\n');
  assert.equal(shown, 'return : {A : Set} → A → ¬ ¬ A\nreturn = {!!}\n');
});

test('a name on its own line is an identifier without the newline (regression)', () => {
  const code = 'take-drop\n  : {A : Set} (k : ℕ) → P\n-- Holify\ntake-drop zero xs = refl\n';
  assert.equal(ex.blockId(code), 'take-drop');
  assert.equal(ex.holeify(code).shown, 'take-drop\n  : {A : Set} (k : ℕ) → P\ntake-drop = {!!}\n');
});

test('fixity declarations are skipped when looking for the identifier', () => {
  const code = 'infixl 4 _<_\n_<_ : ℕ → ℕ → Set\n_<_ = {--}?{--}\n';
  assert.equal(ex.blockId(code), '_<_');
  assert.equal(ex.holeify(code).shown, 'infixl 4 _<_\n_<_ : ℕ → ℕ → Set\n_<_ = {!!}\n');
});

test('inline holes: {--}solution{--} becomes {!!}, also across lines', () => {
  assert.equal(ex.holeify('f = {--}a\n  + b{--}\n').shown, 'f = {!!}\n');
});

test('tests are split off and `-- EX:` lines become refl checks', () => {
  const code = 'double : ℕ → ℕ\n-- Holify\ndouble n = n + n\n\n-- Tests\n-- EX: double 3 ≡ 6\n';
  const { shown, tests } = ex.holeify(code);
  assert.equal(shown, 'double : ℕ → ℕ\ndouble = {!!}\n');
  assert.equal(ex.expandTests(tests), '-- Tests\nmodule _ where private\n  open import Padova2025.ProvingBasics.Equality.Base\n  exercise-test : double 3 ≡ 6\n  exercise-test = refl\n\n');
});

test('only blocks with {--} or -- Holify are exercises; ```sh and ```code blocks are not Agda', () => {
  const source = '```sh\necho this is shell, not agda\n```\n\n```\nfoo : Set\nfoo = {--}?{--}\n```\n\n```code\nbar : Set\nbar = {--}?{--}\n```\n\n```\nplain : Set\n```\n';
  const { blocks } = ex.splitModule(source);
  assert.deepEqual(blocks.map((b) => b.kind), ['other', 'agda', 'other', 'agda']);
  assert.deepEqual(ex.listExercises(blocks).map((e) => e.id), ['foo']);
});

test('the exercise file: earlier code blocks verbatim, then the exercise between markers', () => {
  const source = '```\nmodule Padova2025.Test where\n```\n\ntext\n\n```\ntarget : Set\ntarget = {--}?{--}\n```\n';
  assert.equal(exerciseFile(source),
    'module Exercise.Test.Ex1 where\n\n-- EXERCISE STARTS\ntarget : Set\ntarget = {!!}\n-- EXERCISE ENDS\n');
});

test('later blocks are not part of an exercise file', () => {
  const source = '```\nmodule Padova2025.Test where\n```\n```\na : Set\na = {--}?{--}\n```\n```\nb : Set\nb = {--}?{--}\n```\n';
  assert.ok(!exerciseFile(source).includes('b : Set'));
});

test('a module with parameters keeps them when its header is renamed', () => {
  const source = '```\nmodule Padova2025.Test (⊥ : Set) where\n```\n```\nx : Set\nx = {--}?{--}\n```\n';
  assert.match(exerciseFile(source), /^module Exercise\.Test\.Ex1 \(⊥ : Set\) where/);
});

test('code in HTML comments is Agda but hidden, and never an exercise by itself being shown', () => {
  const source = '<!--\n```\nmodule Padova2025.Test where\n```\n-->\n\n# Title\n';
  const { blocks, text } = ex.splitModule(source);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].hidden, true);
  assert.equal(blocks[0].kind, 'agda');
  assert.ok(text.includes('# Title'));
});

test('the solved variant keeps the solution (as Agda comments around it) and the tests', () => {
  const source = '```\nmodule Padova2025.Test where\n```\n```\nid : Set → Set\nid X = {--}X{--}\n\n-- Tests\n-- EX: id ⊤ ≡ ⊤\n```\n';
  const { blocks } = ex.splitModule(source);
  const [first] = ex.listExercises(blocks);
  const solved = ex.buildExerciseFile(blocks, first.block, 'Padova2025.Test', 1, { solved: true });
  assert.match(solved.text, /id X = \{--\}X\{--\}/);
  assert.match(solved.text, /exercise-test : id ⊤ ≡ ⊤/);
  assert.equal(solved.path, '/Exercise/Test/Ex1.agda');
});

test('titles: "Navigation title // Page heading"', () => {
  assert.deepEqual(ex.splitTitle('Common pitfalls // Things to watch out for'), { nav: 'Common pitfalls', heading: 'Things to watch out for' });
  assert.deepEqual(ex.splitTitle('Booleans'), { nav: 'Booleans', heading: 'Booleans' });
});

test('the reference solution display drops the markers and the tests', () => {
  const code = 'f : ℕ\nf = {--}zero{--}\n\n-- Tests\n-- EX: f ≡ zero\n';
  assert.equal(ex.solutionDisplay(code), 'f : ℕ\nf = zero\n');
});
