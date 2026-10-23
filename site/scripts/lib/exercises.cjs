'use strict';

/*
 * Understands the exercise conventions of the tutorial's literate Agda files
 * (Markdown with fenced code blocks). Pure string functions, no dependencies:
 * the site build (Node) and the editor's workspace extension (browser) both use
 * this file, so that both see the same blocks.
 *
 * Conventions in the .lagda.md sources:
 *   - A fenced block without info string (or "agda") is Agda code; blocks with
 *     another info string (```code, ```text) are only displayed.
 *   - Fenced blocks inside HTML comments (<!-- ... -->) are Agda code that is
 *     not displayed.
 *   - The source is the *solution*: `{--}x{--}` is a (valid) Agda comment around
 *     the solution `x`, and a line `-- Holify` marks that everything after it
 *     in the block is a solution.
 *   - A block is an exercise iff it contains `{--}` or `-- Holify`. Its
 *     exercise form replaces the solutions by holes `{!!}`.
 *   - A trailing `-- Tests` section lists `-- EX: <expr>` lines, claims of the
 *     form `<expr> ≡ <expr>` which are checked by `refl` in the exercise file.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LpaExercises = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const MARK = '\u0001';

  /** Placeholder line that stands for fenced block number n in the prose text. */
  function placeholder(n) {
    return MARK + 'B' + n + MARK;
  }

  function scanComment(line, inComment) {
    let pos = 0;
    for (;;) {
      if (!inComment) {
        const open = line.indexOf('<!--', pos);
        if (open < 0) return false;
        inComment = true;
        pos = open + 4;
      } else {
        const close = line.indexOf('-->', pos);
        if (close < 0) return true;
        inComment = false;
        pos = close + 3;
      }
    }
  }

  /**
   * Pulls the fenced code blocks out of a source file.
   * @returns {{ blocks: Array<{index:number, info:string, kind:'agda'|'other', text:string, hidden:boolean, line:number}>, text: string }}
   *   `text` is the source with every block replaced by a placeholder line.
   */
  function splitModule(source) {
    const lines = source.split('\n');
    const blocks = [];
    const out = [];
    let fence = null;
    let inComment = false;

    const finish = () => {
      const index = blocks.length;
      blocks.push({
        index,
        info: fence.info,
        kind: fence.info === '' || fence.info === 'agda' ? 'agda' : 'other',
        text: fence.lines.join('\n') + '\n',
        hidden: fence.hidden,
        line: fence.line,
      });
      out.push(fence.indent + placeholder(index));
      fence = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (fence) {
        if (/^\s*```\s*$/.test(line)) finish();
        else fence.lines.push(line.startsWith(fence.indent) ? line.slice(fence.indent.length) : line.trimStart());
        continue;
      }
      const open = /^(\s*)```([^\s`]*)\s*$/.exec(line);
      if (open) {
        fence = { indent: open[1], info: open[2], hidden: inComment, lines: [], line: i + 1 };
        continue;
      }
      inComment = scanComment(line, inComment);
      out.push(line);
    }
    if (fence) finish();
    return { blocks, text: out.join('\n') };
  }

  /** The first identifier of a block (skipping fixity declarations). */
  function blockId(code) {
    const m = /^(?:infix[lr]?\s+\d+\s+\S+\n)*(\S*)\s/m.exec(code);
    return m ? m[1] : '';
  }

  function isExercise(block) {
    return block.kind === 'agda' && (block.text.includes('{--}') || block.text.includes('-- Holify'));
  }

  /** @returns {Array<{ordinal:number, block:number, id:string}>} ordinals start at 1 */
  function listExercises(blocks) {
    const list = [];
    for (const b of blocks) {
      if (isExercise(b)) list.push({ ordinal: list.length + 1, block: b.index, id: blockId(b.text) });
    }
    return list;
  }

  /** Separates the trailing `-- Tests` section from a block. */
  function splitTests(code) {
    const m = /^-- Tests[\s\S]*$/m.exec(code);
    if (!m) return { code, tests: null };
    return { code: code.slice(0, m.index) + code.slice(m.index + m[0].length), tests: m[0] };
  }

  /** The exercise form of a block: solutions replaced by holes, tests split off. */
  function holeify(code) {
    const { code: withoutTests, tests } = splitTests(code);
    let shown = withoutTests.replace(/\{--\}[\s\S]*?\{--\}/g, '{!!}');
    shown = shown.replace(/\n-- Holify\n([^ ]*)[\s\S]*$/, (_, name) => `\n${name} = {!!}\n`);
    shown = shown.replace(/\n+$/, '\n');
    return { shown, tests };
  }

  /** What a reader sees as the reference solution of a block. */
  function solutionDisplay(code) {
    return splitTests(code).code
      .replace(/\{--\}/g, '')
      .replace(/-- Holify\n/g, '')
      .replace(/\n+$/, '\n');
  }

  /** `-- EX: <claim>` lines become checked-by-refl declarations. */
  function expandTests(tests) {
    return tests.replace(/^--\s*EX:\s*(.*)$/gm,
      'module _ where private\n  open import Padova2025.ProvingBasics.Equality.Base\n  exercise-test : $1\n  exercise-test = refl\n');
  }

  function exerciseModuleName(moduleName, ordinal) {
    return 'Exercise.' + moduleName.replace(/^Padova2025\./, '') + '.Ex' + ordinal;
  }

  function exercisePath(moduleName, ordinal) {
    return '/' + exerciseModuleName(moduleName, ordinal).replace(/\./g, '/') + '.agda';
  }

  /**
   * The file a reader edits for one exercise: all Agda blocks before the
   * exercise as they are in the source, then the exercise (with holes, or with
   * its solution when `solved`), then its tests. The module gets its own name
   * (Exercise.…) so that it never clashes with the solution module that other
   * modules import.
   *
   * The file starts with an empty line: the editor folds everything above the
   * exercise, and the first line of a fold stays visible. (Likewise the tests
   * fold into the `-- EXERCISE ENDS` line.)
   */
  function buildExerciseFile(blocks, blockIndex, moduleName, ordinal, options) {
    const solved = !!(options && options.solved);
    let text = '\n';
    for (const b of blocks) {
      if (b.kind !== 'agda' || b.index > blockIndex) continue;
      if (b.index < blockIndex) {
        text += b.text + '\n';
        continue;
      }
      let shown;
      let tests;
      if (solved) {
        const s = splitTests(b.text);
        shown = s.code;
        tests = s.tests;
      } else {
        ({ shown, tests } = holeify(b.text));
      }
      text += '-- EXERCISE STARTS\n' + shown + '-- EXERCISE ENDS\n';
      if (tests) text += '\n' + expandTests(tests);
    }
    // only the name: the module may have parameters, `module X (A : Set) where`
    text = text.replace(/^module\s+[\w.']+(?=[\s({])/m, 'module ' + exerciseModuleName(moduleName, ordinal));

    const lines = text.split('\n');
    return {
      text,
      path: exercisePath(moduleName, ordinal),
      moduleName: exerciseModuleName(moduleName, ordinal),
      startLine: lines.indexOf('-- EXERCISE STARTS') + 1, // 1-based, the marker line
      endLine: lines.indexOf('-- EXERCISE ENDS') + 1,
    };
  }

  /** `# Nav title // Page heading` -> both parts. */
  function splitTitle(heading) {
    const m = /^(.*?)\s*\/\/\s*(.*)$/.exec(heading);
    return m ? { nav: m[1], heading: m[2] } : { nav: heading, heading };
  }

  /** Title, module name and imports ("TOC children") of a source file. */
  function moduleInfo(source) {
    const { blocks, text } = splitModule(source);
    const heading = /^#\s+(.*?)\s*$/m.exec(text);
    const agda = blocks.filter((b) => b.kind === 'agda').map((b) => b.text).join('\n');
    const name = /^module\s+([\w.']+)(?=[\s({])/m.exec(agda);
    const imports = [];
    agda.replace(/^import\s+([\w.']+)/gm, (_, m) => imports.push(m));
    return {
      blocks,
      text,
      name: name ? name[1] : null,
      title: heading ? splitTitle(heading[1]) : null,
      imports,
      exercises: listExercises(blocks),
    };
  }

  return {
    placeholder,
    splitModule,
    blockId,
    isExercise,
    listExercises,
    splitTests,
    holeify,
    solutionDisplay,
    expandTests,
    exerciseModuleName,
    exercisePath,
    buildExerciseFile,
    splitTitle,
    moduleInfo,
  };
});
