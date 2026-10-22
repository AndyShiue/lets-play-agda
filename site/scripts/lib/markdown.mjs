/*
 * A small Markdown renderer for exactly the dialect the tutorial is written in
 * (pandoc-style): headings, paragraphs, nested lists, tables, block quotes,
 * fenced divs (`::: Name :::`), raw HTML blocks, inline code, emphasis, links,
 * inline math, and "smart" punctuation (-- and --- become dashes, quotes become
 * typographic). Fenced code blocks have already been replaced by placeholder
 * lines (see exercises.cjs); `env.renderCode(n)` turns them into HTML.
 *
 * Deliberately not CommonMark: lists, headings and block quotes need a blank
 * line before them, as in pandoc, because that is how the sources are written.
 */
import { texToHtml } from './math.mjs';
import { createRequire } from 'node:module';

const { splitTitle } = createRequire(import.meta.url)('./exercises.cjs');

const ENTITY = /&(?!(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);)/g;
const esc = (s) => s.replace(ENTITY, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escCode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

export function slugify(text) {
  let s = text.toLowerCase().replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, '');
  s = s.replace(/[^\p{L}\p{N}_\-. ]+/gu, '').trim().replace(/\s+/g, '-');
  s = s.replace(/^[^\p{L}]+/u, '');
  return s || 'section';
}

export function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// inline
// ---------------------------------------------------------------------------

function matchBracket(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '[') depth++;
    else if (s[i] === ']' && --depth === 0) return i;
  }
  return -1;
}

function matchParen(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')' && --depth === 0) return i;
  }
  return -1;
}

function smart(text) {
  return text
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/\.\.\./g, '…')
    .replace(/(^|[\s(\[—–])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s(\[—–“])'/g, '$1‘')
    .replace(/'/g, '’');
}

export function inline(src, env) {
  const stash = [];
  const keep = (html) => {
    stash.push(html);
    return '\u0002' + (stash.length - 1) + '\u0002';
  };

  function emphasis(s) {
    return s
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/g, '<strong>$1</strong>')
      .replace(/(?<![\w])__(?=\S)([\s\S]*?\S)__(?![\w])/g, '<strong>$1</strong>')
      .replace(/\*(?=[^\s*])([\s\S]*?[^\s*])\*/g, '<em>$1</em>')
      .replace(/(?<![\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?![\w])/g, '<em>$1</em>');
  }

  // text pieces between stash tokens get typographic treatment
  function finish(s) {
    return emphasis(esc(s)).split(/(\u0002\d+\u0002)/).map((part) => (part.startsWith('\u0002') ? part : smart(part))).join('');
  }

  function links(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
      if (s[i] === '[') {
        const close = matchBracket(s, i);
        if (close > 0 && s[close + 1] === '(') {
          const end = matchParen(s, close + 1);
          if (end > 0) {
            const label = s.slice(i + 1, close);
            const m = /^\s*(\S+?)(?:\s+"([^"]*)")?\s*$/.exec(s.slice(close + 2, end));
            if (m) {
              const { href, external } = env.rewriteUrl(m[1]);
              const attrs = (m[2] ? ` title="${escAttr(m[2])}"` : '') + (external ? ' target="_blank" rel="noopener"' : '');
              out += keep(`<a href="${escAttr(href)}"${attrs}>${finish(label)}</a>`);
              i = end + 1;
              continue;
            }
          }
        }
      }
      out += s[i++];
    }
    return out;
  }

  let s = src;
  // inline code
  s = s.replace(/(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, _t, code) => {
    let c = code.replace(/\n/g, ' ');
    if (/^ .* $/.test(c) && c.trim() !== '') c = c.slice(1, -1);
    return keep(`<code>${escCode(c)}</code>`);
  });
  // hard line breaks
  s = s.replace(/( {2,}|\\)\n/g, () => keep('<br>') + '\n');
  // backslash escapes
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|<>$:~&"'])/g, (_, ch) => keep(escCode(ch)));
  // inline math
  s = s.replace(/(?<![\\$\w])\$(?=[^\s$])((?:[^$\\]|\\[\s\S])*?[^\s\\$])\$(?!\d)/g, (_, tex) =>
    keep(`<span class="math">${texToHtml(tex, env.unknownTex)}</span>`));
  // HTML comments, autolinks and inline tags
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<((?:https?|mailto):[^\s<>]+)>/g, (_, url) => keep(`<a href="${escAttr(url)}" target="_blank" rel="noopener">${escCode(url)}</a>`));
  s = s.replace(/<\/?[a-zA-Z][^<>]*>/g, (tag) => keep(tag));
  s = links(s);
  s = finish(s);

  for (let guard = 0; guard < 6 && /\u0002\d+\u0002/.test(s); guard++) {
    s = s.replace(/\u0002(\d+)\u0002/g, (_, k) => stash[Number(k)]);
  }
  return s;
}

// ---------------------------------------------------------------------------
// blocks
// ---------------------------------------------------------------------------

const LIST = /^(\s{0,3})([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const PLACEHOLDER = /^\s*\u0001B(\d+)\u0001\s*$/;
const DIV_OPEN = /^:{3,}\s+([\w-]+)(?:\s+:{2,})?\s*$/;
const DIV_CLOSE = /^:{3,}\s*$/;
const RAW_BLOCK = /^\s{0,3}<(div|pre|table|script|style|details|summary|ul|ol|iframe|center|h[1-6]|p|hr|video|blockquote)(\s|>|\/|$)/i;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const isBlank = (l) => /^\s*$/.test(l);
const indentOf = (l) => l.length - l.trimStart().length;

function splitRow(line) {
  const cells = [];
  let cur = '';
  let ticks = 0;
  const t = line.trim();
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '\\' && t[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '`') {
      let run = 1;
      while (t[i + run] === '`') run++;
      cur += t.slice(i, i + run);
      i += run - 1;
      ticks = ticks === 0 ? run : ticks === run ? 0 : ticks;
      continue;
    }
    if (c === '|' && ticks === 0) { cells.push(cur); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur);
  if (t.startsWith('|')) cells.shift();
  if (t.endsWith('|') && !t.endsWith('\\|')) cells.pop();
  return cells.map((c) => c.trim());
}

function heading(level, raw, env) {
  const title = level === 1 ? splitTitle(raw).heading : raw;
  const html = inline(title, env);
  const plain = plainText(html);
  let id = slugify(plain);
  for (let k = 1; env.usedIds.has(id); k++) id = slugify(plain) + '-' + k;
  env.usedIds.add(id);
  env.headings.push({ level, text: plain, id });
  return `<h${level} id="${id}">${html}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>\n`;
}

function table(lines, i, env) {
  const head = splitRow(lines[i]);
  const aligns = splitRow(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : /^:-/.test(c) ? 'left' : ''));
  let j = i + 2;
  const rows = [];
  while (j < lines.length && /^\s*\|/.test(lines[j])) rows.push(splitRow(lines[j++]));
  const cell = (tag, text, k) => `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(text, env)}</${tag}>`;
  let html = '<div class="table-wrap"><table>\n<thead><tr>' + head.map((c, k) => cell('th', c, k)).join('') + '</tr></thead>\n<tbody>\n';
  for (const r of rows) html += '<tr>' + head.map((_, k) => cell('td', r[k] ?? '', k)).join('') + '</tr>\n';
  return { html: html + '</tbody>\n</table></div>\n', next: j };
}

function list(lines, i, env) {
  const first = LIST.exec(lines[i]);
  const ordered = /\d/.test(first[2]);
  const marker = ordered ? first[2].slice(-1) : first[2];
  const items = [];
  let loose = false;
  let j = i;

  while (j < lines.length) {
    const m = LIST.exec(lines[j]);
    if (!m || /\d/.test(m[2]) !== ordered || (ordered ? m[2].slice(-1) : m[2]) !== marker) break;
    const contentIndent = m[1].length + m[2].length + Math.min(m[3].length, 4);
    const item = [m[4]];
    let k = j + 1;
    for (; k < lines.length; k++) {
      const l = lines[k];
      if (isBlank(l)) {
        let p = k + 1;
        while (p < lines.length && isBlank(lines[p])) p++;
        if (p < lines.length && indentOf(lines[p]) >= contentIndent) {
          for (let q = k; q < p; q++) item.push('');
          k = p - 1;
          continue;
        }
        break;
      }
      if (indentOf(l) >= contentIndent) { item.push(l.slice(contentIndent)); continue; }
      const prev = item[item.length - 1];
      if (prev !== '' && !LIST.test(l) && !PLACEHOLDER.test(l) && !DIV_OPEN.test(l) && !DIV_CLOSE.test(l) && !/^\s*(#|>)/.test(l)) {
        item.push(l.trim());
        continue;
      }
      break;
    }
    items.push(item);
    j = k;
    let p = j;
    while (p < lines.length && isBlank(lines[p])) p++;
    const next = p < lines.length ? LIST.exec(lines[p]) : null;
    if (next && /\d/.test(next[2]) === ordered && (ordered ? next[2].slice(-1) : next[2]) === marker && next[1].length === m[1].length) {
      if (p > j) loose = true;
      j = p;
    } else {
      break;
    }
  }

  const tag = ordered ? 'ol' : 'ul';
  const start = ordered && parseInt(first[2], 10) !== 1 ? ` start="${parseInt(first[2], 10)}"` : '';
  let html = `<${tag}${start}>\n`;
  for (const item of items) {
    let inner = blocks(item, env, { listInterrupts: true });
    if (!loose) inner = inner.replace(/^<p>([\s\S]*?)<\/p>\n/, '$1\n');
    html += `<li>${inner}</li>\n`;
  }
  return { html: html + `</${tag}>\n`, next: j };
}

/**
 * Raw HTML is passed through untouched. Containers (div, pre, ...) run until
 * their closing tag, everything else until the next blank line.
 */
function rawBlock(lines, i, tag) {
  const t = tag.toLowerCase();
  const balanced = /^(div|pre|script|style|details|table)$/.test(t);
  const open = new RegExp(`<${t}[\\s>/]`, 'gi');
  const close = new RegExp(`</${t}>`, 'gi');
  let depth = 0;
  let j = i;
  const out = [];
  for (; j < lines.length; j++) {
    const l = lines[j];
    if (!balanced && isBlank(l)) break;
    out.push(l);
    depth += (l.match(open) || []).length - (l.match(close) || []).length;
    if (balanced && depth <= 0) { j++; break; }
  }
  return { html: out.join('\n') + '\n', next: j };
}

function startsBlock(line, ctx) {
  return PLACEHOLDER.test(line) || DIV_OPEN.test(line) || DIV_CLOSE.test(line) || (ctx.listInterrupts && LIST.test(line));
}

export function blocks(lines, env, ctx = {}) {
  let html = '';
  let i = 0;
  const n = lines.length;

  while (i < n) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    let m = PLACEHOLDER.exec(line);
    if (m) { html += env.renderCode(Number(m[1])); i++; continue; }

    if (/^\s*<!--/.test(line)) {
      let j = i;
      while (j < n && !lines[j].includes('-->')) j++;
      i = j + 1;
      continue;
    }

    if ((m = DIV_OPEN.exec(line))) {
      let depth = 1;
      let j = i + 1;
      for (; j < n; j++) {
        if (DIV_OPEN.test(lines[j])) depth++;
        else if (DIV_CLOSE.test(lines[j]) && --depth === 0) break;
      }
      html += `<div class="${m[1]}">\n${blocks(lines.slice(i + 1, j), env, ctx)}</div>\n`;
      i = j + 1;
      continue;
    }

    if ((m = /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(line))) {
      html += heading(m[1].length, m[2], env);
      i++;
      continue;
    }

    if (/^\s*\|/.test(line) && i + 1 < n && TABLE_SEP.test(lines[i + 1])) {
      const t = table(lines, i, env);
      html += t.html;
      i = t.next;
      continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      const inner = [];
      while (i < n && /^\s{0,3}>/.test(lines[i])) inner.push(lines[i++].replace(/^\s{0,3}> ?/, ''));
      html += `<blockquote>\n${blocks(inner, env, ctx)}</blockquote>\n`;
      continue;
    }

    if (LIST.test(line)) {
      const l = list(lines, i, env);
      html += l.html;
      i = l.next;
      continue;
    }

    if ((m = RAW_BLOCK.exec(line))) {
      const r = rawBlock(lines, i, m[1]);
      html += r.html;
      i = r.next;
      continue;
    }

    const para = [line];
    i++;
    while (i < n && !isBlank(lines[i]) && !startsBlock(lines[i], ctx)) para.push(lines[i++]);
    html += `<p>${inline(para.map((l) => l.trim()).join('\n'), env)}</p>\n`;
  }
  return html;
}

export function renderMarkdown(text, env) {
  env.headings ??= [];
  env.usedIds ??= new Set();
  env.unknownTex ??= new Set();
  return blocks(text.replace(/\r\n?/g, '\n').split('\n'), env);
}
