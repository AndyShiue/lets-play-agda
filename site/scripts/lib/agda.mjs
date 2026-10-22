/*
 * Syntax highlighting for Agda code without running Agda.
 *
 * Lexical highlighting (keywords, comments, holes, strings, numbers) plus a
 * light semantic layer: the build collects the names that the tutorial's
 * modules declare (data types, constructors, functions, record fields) and
 * colours uses of those names the way Agda's own highlighting does. Names are
 * not resolved, so a local variable that happens to share its name with a
 * declared function is coloured like that function; that is an accepted
 * approximation. Declarations get an anchor (<a id="name">) so that links such
 * as Page.html#name keep working.
 */

const KEYWORDS = new Set((
  'abstract constructor data do eta-equality field forall hiding import in inductive infix infixl infixr ' +
  'instance interleaved let macro module mutual no-eta-equality open overlap pattern postulate primitive ' +
  'private public quote quoteTerm record renaming rewrite syntax tactic unquote unquoteDecl unquoteDef ' +
  'using variable where with opaque unfolding coinductive'
).split(' '));

const SORTS = /^(Set|Prop|Type|SSet|Setω|Set[₀-₉]+|Prop[₀-₉]+)$/;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls, text) => `<span class="${cls}">${esc(text)}</span>`;

/** Names declared by a block of Agda code, by kind. */
export function collectDeclarations(code, into = new Map()) {
  const add = (name, kind) => {
    if (!name || /^[(){}.;"@]/.test(name) || KEYWORDS.has(name)) return;
    if (!into.has(name)) into.set(name, kind);
  };
  const lines = code.split('\n');
  let mode = null; // 'data' | 'record-fields' | null, for indented declarations
  let modeIndent = 0;
  for (const line of lines) {
    if (/^\s*(--|$)/.test(line)) continue;
    const indent = line.length - line.trimStart().length;
    if (mode && indent <= modeIndent) mode = null;

    let m;
    if ((m = /^(?:private\s+)?data\s+(\S+)/.exec(line))) {
      add(m[1], 'datatype');
      mode = 'data';
      modeIndent = indent;
      continue;
    }
    if ((m = /^(?:private\s+)?record\s+(\S+)/.exec(line))) {
      add(m[1], 'record');
      mode = 'record';
      modeIndent = indent;
      continue;
    }
    if (mode === 'record' && /^\s*field\s*$/.test(line)) { mode = 'fields'; modeIndent = indent; continue; }
    if (mode === 'data' || mode === 'fields') {
      if ((m = /^\s+([^\s:]+(?:\s+[^\s:]+)*)\s*:/.exec(line))) {
        for (const name of m[1].split(/\s+/)) add(name, mode === 'data' ? 'constructor' : 'field');
      }
      continue;
    }
    if (indent === 0 && (m = /^([^\s:=(){}"@.;]+)\s*:(\s|$)/.exec(line))) add(m[1], 'function');
    // `a b c : T` declares several names at once
    else if (indent === 0 && (m = /^([^\s:=(){}"@.;]+(?:\s+[^\s:=(){}"@.;]+)+)\s+:(\s|$)/.exec(line))) {
      for (const name of m[1].split(/\s+/)) add(name, 'function');
    }
  }
  return into;
}

/**
 * @param {string} code
 * @param {{names?: Map<string,string>, anchors?: Set<string>, plain?: boolean}} options
 *   names: declared names that are in scope; anchors: ids already used on the page
 */
export function highlight(code, options = {}) {
  const names = options.names ?? new Map();
  const anchors = options.anchors ?? new Set();
  const lines = code.replace(/\n$/, '').split('\n');
  let out = '';
  let inBlockComment = 0;
  let mode = null; // declaration context, as in collectDeclarations
  let modeIndent = 0;
  let currentType = null;

  const kindClass = { datatype: 'dt', record: 'dt', constructor: 'ct', function: 'fn', field: 'fd' };

  // Agda also names constructors and fields after their type: `_≡_.refl`
  function anchor(id) {
    if (options.noAnchors || anchors.has(id)) return '';
    anchors.add(id);
    return `<a id="${esc(id).replace(/"/g, '&quot;')}" class="decl"></a>`;
  }

  function identifier(tok, declaration, owner) {
    const kind = names.get(tok);
    const cls = kind ? kindClass[kind] : '';
    let html = cls ? `<span class="${cls}">${esc(tok)}</span>` : esc(tok);
    if (declaration && kind) {
      html = anchor(tok) + (owner ? anchor(`${owner}.${tok}`) : '') + html;
    }
    return html;
  }

  lines.forEach((line, lineNo) => {
    const indent = line.length - line.trimStart().length;
    if (!inBlockComment && line.trim() !== '') {
      if (mode && indent <= modeIndent && !/^\s*field\s*$/.test(line)) mode = null;
      if (/^(?:private\s+)?data\s/.test(line)) { mode = 'data'; modeIndent = indent; }
      else if (/^(?:private\s+)?record\s/.test(line)) { mode = 'record'; modeIndent = indent; }
      else if (mode === 'record' && /^\s*field\s*$/.test(line)) { mode = 'fields'; modeIndent = indent; }
    }

    // the identifiers a line declares (for anchors)
    const declared = new Set();
    let owner = null;
    if (!inBlockComment) {
      let m;
      if ((mode === 'data' || mode === 'fields') && currentType) owner = currentType;
      if ((m = /^(?:private\s+)?(?:data|record)\s+(\S+)/.exec(line))) { declared.add(m[1]); currentType = m[1]; owner = null; }
      else if ((mode === 'data' || mode === 'fields') && (m = /^\s+([^\s:]+(?:\s+[^\s:]+)*)\s*:/.exec(line))) m[1].split(/\s+/).forEach((x) => declared.add(x));
      else if (indent === 0 && (m = /^([^\s:=(){}"@.;]+(?:\s+[^\s:=(){}"@.;]+)*)\s+:(\s|$)/.exec(line) || /^([^\s:=(){}"@.;]+):(\s|$)/.exec(line))) m[1].split(/\s+/).forEach((x) => declared.add(x));
    }

    let i = 0;
    let html = '';
    while (i < line.length) {
      const rest = line.slice(i);
      if (inBlockComment) {
        let j = i;
        while (j < line.length) {
          if (line.startsWith('{-', j)) { inBlockComment++; j += 2; }
          else if (line.startsWith('-}', j)) { inBlockComment--; j += 2; if (!inBlockComment) break; }
          else j++;
        }
        html += span('cm', line.slice(i, j));
        i = j;
        continue;
      }
      let m;
      if (rest.startsWith('{-#')) {
        const end = rest.indexOf('#-}');
        const len = end < 0 ? rest.length : end + 3;
        html += span('pg', rest.slice(0, len));
        i += len;
      } else if (rest.startsWith('{-') && !rest.startsWith('{--}')) {
        inBlockComment = 1;
        let j = i + 2;
        while (j < line.length && inBlockComment) {
          if (line.startsWith('{-', j)) { inBlockComment++; j += 2; }
          else if (line.startsWith('-}', j)) { inBlockComment--; j += 2; }
          else j++;
        }
        html += span('cm', line.slice(i, j));
        i = j;
      } else if (rest.startsWith('{--}')) {
        html += span('cm', '{--}');
        i += 4;
      } else if (rest.startsWith('{!')) {
        const end = rest.indexOf('!}');
        const len = end < 0 ? rest.length : end + 2;
        html += span('hole', rest.slice(0, len));
        i += len;
      } else if ((m = /^--(?=\s|$)/.exec(rest)) && (i === 0 || /\s/.test(line[i - 1]))) {
        html += span('cm', rest);
        i = line.length;
      } else if ((m = /^"(?:[^"\\]|\\.)*"?/.exec(rest))) {
        html += span('st', m[0]);
        i += m[0].length;
      } else if ((m = /^\d+(?![^\s.;{}()@"])/.exec(rest)) && (i === 0 || /[\s({]/.test(line[i - 1]))) {
        html += span('nu', m[0]);
        i += m[0].length;
      } else if ((m = /^[^\s.;{}()@"]+/.exec(rest))) {
        const tok = m[0];
        if (KEYWORDS.has(tok)) html += span('kw', tok);
        else if (SORTS.test(tok)) html += span('so', tok);
        else if (tok === '?') html += span('hole', tok);
        else if (/^(=|:|→|->|←|∀|λ|\\|∷|\||_|\.\.\.)$/.test(tok)) html += span('sy', tok);
        else html += identifier(tok, declared.has(tok), owner);
        i += tok.length;
        // qualified names: A.B.name
        while (line[i] === '.' && /[^\s.;{}()@"]/.test(line[i + 1] ?? ' ')) {
          html += '.';
          const q = /^[^\s.;{}()@"]+/.exec(line.slice(i + 1));
          html += identifier(q[0], false);
          i += 1 + q[0].length;
        }
      } else {
        html += esc(line[i]);
        i++;
      }
    }
    out += html + (lineNo < lines.length - 1 ? '\n' : '');
  });
  return out;
}
