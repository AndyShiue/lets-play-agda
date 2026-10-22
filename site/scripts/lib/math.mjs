/*
 * A tiny converter from the TeX that appears in the tutorial's inline math
 * ($x^y$, $\forall(x \in A).\ P(x)$, ...) to HTML. Anything it does not know is
 * reported, so that the macro table below can grow with the content.
 */

const SYMBOLS = {
  cdot: '·', times: '×', in: '∈', notin: '∉', Rightarrow: '⇒', Leftrightarrow: '⇔', rightarrow: '→', to: '→',
  leftarrow: '←', wedge: '∧', vee: '∨', neg: '¬', forall: '∀', exists: '∃', neq: '≠', leq: '≤', geq: '≥',
  le: '≤', ge: '≥', infty: '∞', subseteq: '⊆', subset: '⊂', cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅',
  mathbb: '', sqrt: '√', log: 'log', ln: 'ln', sum: '∑', prod: '∏', ldots: '…', dots: '…', cdots: '⋯',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', lambda: 'λ', mu: 'μ', pi: 'π',
  sigma: 'σ', omega: 'ω', Omega: 'Ω', phi: 'φ', psi: 'ψ', theta: 'θ', equiv: '≡', approx: '≈', simeq: '≃',
  cong: '≅', mid: '∣', bot: '⊥', top: '⊤', circ: '∘', langle: '⟨', rangle: '⟩', lor: '∨', land: '∧',
  implies: '⟹', iff: '⟺', mapsto: '↦', setminus: '∖', ',': ' ', ';': ' ', ' ': ' ', '!': '', quad: '  ',
};

const BLACKBOARD = { N: 'ℕ', Z: 'ℤ', Q: 'ℚ', R: 'ℝ', C: 'ℂ', P: 'ℙ' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** @param {string} tex @param {Set<string>} unknown collects macros that are not handled */
export function texToHtml(tex, unknown = new Set()) {
  let pos = 0;

  function group() {
    // after '{': read until the matching '}'
    let depth = 1;
    const start = pos;
    while (pos < tex.length && depth > 0) {
      if (tex[pos] === '{') depth++;
      else if (tex[pos] === '}') depth--;
      pos++;
    }
    const inner = tex.slice(start, pos - 1);
    return texToHtml(inner, unknown);
  }

  function atom() {
    if (pos >= tex.length) return '';
    if (tex[pos] === '{') {
      pos++;
      return group();
    }
    if (tex[pos] === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(tex.slice(pos));
      pos += m[0].length;
      return macro(m[1]);
    }
    return esc(tex[pos++]);
  }

  function macro(name) {
    if (['mathbb', 'mathbf', 'mathrm', 'mathfrak', 'mathsf', 'mathcal', 'mathit', 'text', 'operatorname'].includes(name)) {
      const arg = atom();
      return name === 'mathbb' ? (BLACKBOARD[arg] ?? arg) : name === 'mathbf' ? `<b>${arg}</b>` : arg;
    }
    if (name === 'frac') return `${atom()}/${atom()}`;
    if (name === 'sqrt') return `√${atom()}`;
    if (name in SYMBOLS) return SYMBOLS[name];
    unknown.add('\\' + name);
    return `<span class="tex-unknown">\\${esc(name)}</span>`;
  }

  let out = '';
  while (pos < tex.length) {
    const c = tex[pos];
    if (c === '^' || c === '_') {
      pos++;
      const tag = c === '^' ? 'sup' : 'sub';
      out += `<${tag}>${atom()}</${tag}>`;
    } else if (/\s/.test(c)) {
      pos++;
      if (!out.endsWith(' ')) out += ' ';
    } else {
      out += atom();
    }
  }
  return out;
}
