/*
 * Syntax highlighting for Agda code without running Agda.
 *
 * Lexical highlighting (keywords, comments, holes, strings, numbers) plus a
 * light semantic layer: the build collects the names that the tutorial's
 * modules declare (data types, constructors, functions, record fields) and
 * colours uses of those names the way Agda's own highlighting does, and links
 * every use to its declaration. Names are resolved by their spelling, not by
 * Agda's scoping: the nearest module (its own, then what it imports) that
 * declares the name wins, the parts of a mixfix name (`+` of `_+_`) count as
 * the name, and a name that the declaration around the use binds itself
 * (parameters, lambda variables, the variables of a clause's patterns) is not
 * linked. Not linked either: names of libraries (not declared by the tutorial).
 * The `using`, `hiding` and `renaming` of an import are not taken into account.
 * A local variable that shares its name with a declared function is still
 * coloured like the function (it is only not linked). Declarations get an anchor
 * (<a id="name">) so that links such as Page.html#name keep working.
 */

const KEYWORDS = new Set((
  'abstract constructor data do eta-equality field forall hiding import in inductive infix infixl infixr ' +
  'instance interleaved let macro module mutual no-eta-equality open overlap pattern postulate primitive ' +
  'private public quote quoteTerm record renaming rewrite syntax tactic unquote unquoteDecl unquoteDef ' +
  'using variable where with opaque unfolding coinductive'
).split(' '));

const SORTS = /^(Set|Prop|Type|SSet|Setω|Set[₀-₉]+|Prop[₀-₉]+)$/;
const DOCS = 'https://agda.readthedocs.io/en/latest/language/';
const SORT_DOCS = [[/^Prop[₀-₉]*$/, `${DOCS}prop.html`], [/^(Set[₀-₉]*|Setω)$/, `${DOCS}universe-levels.html`]];

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
    // `variable A B : Set`: generalized variables, not definitions to link to
    if (indent === 0 && (m = /^variable\s+(.*?)\s*:(\s|$)/.exec(line))) {
      for (const name of m[1].split(/\s+/)) add(name, 'variable');
      continue;
    }
    if ((m = /^\s*(?:private\s+)?data\s+(\S+)/.exec(line))) {
      add(m[1], 'datatype');
      mode = 'data';
      modeIndent = indent;
      continue;
    }
    if ((m = /^\s*(?:private\s+)?record\s+(\S+)/.exec(line))) {
      add(m[1], 'record');
      mode = 'record';
      modeIndent = indent;
      continue;
    }
    // `constructor _,_` of a record
    if (mode === 'record' && (m = /^\s+constructor\s+(\S+)/.exec(line))) { add(m[1], 'constructor'); continue; }
    if (mode === 'record' && /^\s*field\s*$/.test(line)) { mode = 'fields'; modeIndent = indent; continue; }
    // postulate A B : Set   |   postulate, then the names indented below it
    if ((m = /^\s*postulate\b\s*(.*)$/.exec(line))) {
      const inline = /^(.+?)\s*:(\s|$)/.exec(m[1]);
      if (inline) for (const name of inline[1].split(/\s+/)) add(name, 'function');
      else { mode = 'postulate'; modeIndent = indent; }
      continue;
    }
    if (mode === 'postulate') {
      if ((m = /^\s+([^\s:]+(?:\s+[^\s:]+)*)\s*:(\s|$)/.exec(line))) for (const name of m[1].split(/\s+/)) add(name, 'function');
      continue;
    }
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
 * A mixfix name is used with its parts spread over the expression: `_≡⟨_⟩_` as
 * `x ≡⟨ p ⟩ y`, `_+_` as `a + b`. Adds each part (`≡⟨`, `⟩`, `+`) as a name of its
 * own, pointing at the entry of the whole name (unless the part is a name already).
 */
export function addOperatorParts(names) {
  for (const [name, entry] of [...names]) {
    if (name === '_' || !name.includes('_')) continue;
    for (const part of name.split('_')) {
      if (part && !names.has(part)) names.set(part, { ...entry, part: true });
    }
  }
  return names;
}

const NOT_A_BINDER = /^([:=→←∀λ\\|.]+|_|\d.*)$/;

/**
 * The names that a chunk of code (a declaration with its clauses) binds itself:
 * the parameters of a telescope `(x y : A)`, of a lambda or ∀, and the variables of the
 * patterns on the left of a clause (constructors are not variables). A use of such a
 * name is the local one, not the declared function that happens to be called the same.
 * Not Agda's scoping, but near enough for a tutorial's code.
 */
function bindersOf(text, isConstructor) {
  const code = text
    .replace(/\{-[\s\S]*?-\}/g, ' ')
    .replace(/\{![\s\S]*?!\}/g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"/g, ' ')
    .replace(/(^|\s)--(?=\s|$).*$/gm, '$1');
  const bound = new Set();
  const addTokens = (s, skipConstructors) => {
    for (const t of s.split(/[\s(){};@]+/)) {
      if (!t || KEYWORDS.has(t) || NOT_A_BINDER.test(t) || t.startsWith('.')) continue;
      if (skipConstructors && isConstructor(t)) continue;
      bound.add(t);
    }
  };
  // typed binders: (x y : A)  {x : A}  ⦃ x : A ⦄
  for (const m of code.matchAll(/[({⦃]\s*([^(){}⦃⦄:]+?)\s+:\s/g)) addTokens(m[1], false);
  // λ x y →   \x →   ∀ x y →   ∀ {x}   (typed groups were taken above)
  for (const m of code.matchAll(/(?:λ|\\|∀)\s*([^→\n]*?)\s*(?:→|->)/g)) {
    addTokens(m[1].replace(/[({⦃][^(){}⦃⦄]*:[^(){}⦃⦄]*[)}⦄]/g, ' '), false);
  }
  // Σ[ x ∈ A ] B   ∃[ x ] B
  for (const m of code.matchAll(/\[\s*([^\][∈:]+?)\s*(?:∈|:|\])/g)) addTokens(m[1], false);
  // the left of a clause: f x (suc n) = …
  for (const line of code.split('\n')) {
    const eq = line.search(/(^|\s)=(\s|$)/);
    if (eq < 0) continue;
    const lhs = line.slice(0, eq);
    if (/(^|\s):(\s|$)/.test(lhs) || /^\s*(module|open|import|data|record|infix[lr]?|postulate|field|private)\b/.test(lhs)) continue;
    addTokens(lhs, true);
  }
  return bound;
}

/** For every line, the binders of the chunk (a declaration starting at column 0) it is in. */
function bindersByLine(lines, isConstructor) {
  const result = new Array(lines.length);
  let start = 0;
  const flush = (end) => {
    const set = bindersOf(lines.slice(start, end).join('\n'), isConstructor);
    for (let i = start; i < end; i++) result[i] = set;
  };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() !== '' && lines[i][0] !== ' ' && lines[i][0] !== '\t' && !lines[i].startsWith('--')) { flush(i); start = i; }
  }
  flush(lines.length);
  return result;
}

/**
 * @param {string} code
 * @param {{
 *   names?: Map<string, string | {kind: string, module?: string, name?: string}>,
 *   anchors?: Set<string>,
 *   noAnchors?: boolean,
 *   href?: (entry: object, token: string) => string | null,
 *   collect?: Map<string, {token: string, entry: object, href: string}>,
 *   stats?: {known: number, linked: number, unresolved: Map<string, number>},
 * }} options
 *   names: declared names that are in scope; anchors: ids already used on the page;
 *   href: where a use of a declared name links to (null: nowhere); collect: receives
 *   every name the code links to, by the place it is declared in; stats: for the build's report
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
  const entryOf = (tok) => {
    const v = names.get(tok);
    return v === undefined ? undefined : typeof v === 'string' ? { kind: v, name: tok } : v;
  };
  const binders = bindersByLine(lines, (tok) => entryOf(tok)?.kind === 'constructor');
  let lineNo = 0;
  let inBinderBracket = false;

  // `Set` is built into Agda: there is no declaration of it to link to, so where the code links
  // (options.href is there) it links to Agda's documentation, in a tab of its own
  const sort = (tok) => {
    const doc = options.href ? SORT_DOCS.find(([re]) => re.test(tok))?.[1] : undefined;
    return doc ? `<a class="so" href="${doc}" target="_blank" rel="noopener" title="Agda's documentation">${esc(tok)}</a>` : span('so', tok);
  };

  // Agda also names constructors and fields after their type: `_≡_.refl`
  function anchor(id) {
    if (options.noAnchors || anchors.has(id)) return '';
    anchors.add(id);
    return `<a id="${esc(id).replace(/"/g, '&quot;')}" class="decl"></a>`;
  }

  function identifier(tok, declaration, owner) {
    const entry = entryOf(tok);
    const kind = entry?.kind;
    const cls = kind ? kindClass[kind] : '';
    let html = cls ? `<span class="${cls}">${esc(tok)}</span>` : esc(tok);
    if (declaration && kind) {
      html = anchor(tok) + (owner ? anchor(`${owner}.${tok}`) : '') + html;
    } else if (cls && !binders[lineNo].has(tok)) {
      // a use of a declared name: a link to its declaration
      const href = options.href?.(entry, tok) ?? null;
      if (options.stats) options.stats.known++;
      if (href !== null) {
        html = `<a class="${cls}" href="${esc(href).replace(/"/g, '&quot;')}">${esc(tok)}</a>`;
        options.collect?.set(`${entry.module}#${entry.name}`, { token: tok, entry, href });
        if (options.stats) options.stats.linked++;
      }
    } else if (!cls && options.stats && !declaration && /[^\s\d]/.test(tok)) {
      const unresolved = options.stats.unresolved;
      unresolved.set(tok, (unresolved.get(tok) ?? 0) + 1);
    }
    return html;
  }

  lines.forEach((line, n) => {
    lineNo = n;
    inBinderBracket = false;
    const indent = line.length - line.trimStart().length;
    if (!inBlockComment && line.trim() !== '') {
      if (mode && indent <= modeIndent && !/^\s*field\s*$/.test(line)) mode = null;
      if (/^\s*(?:private\s+)?data\s/.test(line)) { mode = 'data'; modeIndent = indent; }
      else if (/^\s*(?:private\s+)?record\s/.test(line)) { mode = 'record'; modeIndent = indent; }
      else if (mode === 'record' && /^\s*field\s*$/.test(line)) { mode = 'fields'; modeIndent = indent; }
      else if (/^\s*postulate\s*$/.test(line)) { mode = 'postulate'; modeIndent = indent; }
    }

    // the identifiers a line declares (for anchors)
    const declared = new Set();
    let owner = null;
    if (!inBlockComment) {
      let m;
      if ((mode === 'data' || mode === 'fields') && currentType) owner = currentType;
      if ((m = /^\s*(?:private\s+)?(?:data|record)\s+(\S+)/.exec(line))) { declared.add(m[1]); currentType = m[1]; owner = null; }
      else if (mode === 'record' && currentType && (m = /^\s+constructor\s+(\S+)/.exec(line))) { declared.add(m[1]); owner = currentType; }
      else if ((mode === 'data' || mode === 'fields' || mode === 'postulate') && (m = /^\s+([^\s:]+(?:\s+[^\s:]+)*)\s*:/.exec(line))) m[1].split(/\s+/).forEach((x) => declared.add(x));
      else if ((m = /^\s*postulate\s+(.+?)\s*:(\s|$)/.exec(line))) m[1].split(/\s+/).forEach((x) => declared.add(x));
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
        // Σ[ x ∈ A ] B: the brackets are notation, and the ∈ in them is not the operator `_∈_`
        if (/\[$/.test(tok) && !entryOf(tok)) inBinderBracket = true;
        else if (tok === ']') inBinderBracket = false;
        if (KEYWORDS.has(tok)) html += span('kw', tok);
        else if (SORTS.test(tok)) html += sort(tok);
        else if (tok === '?') html += span('hole', tok);
        else if (/^(=|:|→|->|←|∀|λ|\\|\||_|\.\.\.)$/.test(tok) || (tok === '∷' && !entryOf(tok)) || (tok === '∈' && inBinderBracket)) html += span('sy', tok);
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
