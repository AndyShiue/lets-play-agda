/*
 * Let's play Agda — client side.
 *
 *   - page navigation without reloading (the editor keeps running while you read),
 *   - progress (kept in localStorage, nothing leaves the browser),
 *   - the embedded editor (VS Code for the Web, see ../editor) and its bridge,
 *   - search, theme, small conveniences.
 *
 * The service worker (sw.js) makes the site cross-origin isolated, which the
 * editor's Agda needs; see the README for the details.
 */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const config = JSON.parse($('#lpa-config')?.textContent || '{}');
  const app = $('#app');
  const main = $('#main');

  // The words of what this script shows come with the page, in its language (config.words, from i18n/<code>.json;
  // see scripts/build.mjs). {name} stands for a value; a word can have a form per plural category (Intl.PluralRules,
  // the key is `count`), as the languages differ in what they have.
  const plural = new Intl.PluralRules(config.htmlLang || 'en');
  const t = (key, values = {}) => {
    let word = config.words?.[key];
    if (word && typeof word === 'object') word = word[plural.select(values.count ?? 0)] ?? word.other;
    return String(word ?? key).replace(/\{(\w+)\}/g, (match, name) => (name in values ? values[name] : match));
  };
  const dateLabel = (ms) => new Date(ms).toLocaleDateString(config.htmlLang || undefined, { dateStyle: 'full' });

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
    keys() { try { return Object.keys(localStorage).filter((k) => k.startsWith('lpa:')); } catch { return []; } },
  };

  // ---------------------------------------------------------------------------
  // progress
  // ---------------------------------------------------------------------------
  const solvedKey = (module, ordinal) => `lpa:solved:${module}/${ordinal}`;
  function readSolved(module, ordinal) {
    const raw = store.get(solvedKey(module, ordinal));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return { at: 0 }; }
  }

  function refreshProgress() {
    for (const a of $$('.toc li.page a')) {
      const module = a.dataset.module;
      const total = Number(a.dataset.ex);
      let solved = 0;
      for (let i = 1; i <= total; i++) if (store.get(solvedKey(module, i))) solved++;
      a.parentElement.dataset.status = total
        ? (solved === total ? 'all' : solved ? 'some' : '')
        : (store.get(`lpa:visited:${module}`) ? 'visited' : '');
    }
  }

  function exportProgress() {
    const data = {};
    for (const key of store.keys()) data[key] = store.get(key);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `lets-play-agda-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importProgress() {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
    input.onchange = async () => {
      try {
        const data = JSON.parse(await input.files[0].text());
        let n = 0;
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('lpa:') && typeof value === 'string' && store.get(key) !== value) { store.set(key, value); n++; }
        }
        refreshProgress();
        $$('.exercise').forEach(renderExercise);
        toast(n ? t('restored', { n }) : t('nothingNew'));
      } catch (err) {
        toast(t('notBackup'));
      }
    };
    input.click();
  }
  // used by a few pages of the tutorial
  window.downloadLocalStorage = exportProgress;
  window.importIntoLocalStorage = importProgress;
  window.showConfetti = () => confetti();

  // ---------------------------------------------------------------------------
  // small UI helpers
  // ---------------------------------------------------------------------------
  function toast(text) {
    const el = Object.assign(document.createElement('div'), { className: 'toast', textContent: text, role: 'status' });
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3800);
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = Object.assign(document.createElement('canvas'), { width: innerWidth, height: innerHeight });
    Object.assign(canvas.style, { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 });
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    const colors = ['#4f46e5', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * .4, r: 4 + Math.random() * 5,
      vx: -2 + Math.random() * 4, vy: 2 + Math.random() * 4, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 6,
    }));
    const start = performance.now();
    (function frame(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx; p.y += p.vy; p.a += .1;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
      }
      if (now - start < 2200) requestAnimationFrame(frame); else canvas.remove();
    })(start);
  }

  // ---------------------------------------------------------------------------
  // theme, mobile navigation
  // ---------------------------------------------------------------------------
  const effectiveTheme = () => {
    const t = document.documentElement.dataset.theme;
    return t === 'dark' || t === 'light' ? t : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  };
  $('#theme-toggle').addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('lpa:theme', next);
  });

  // the language menu (only where there is a translation): a globe that opens a list of the languages
  const langToggle = $('#lang-toggle');
  const langList = $('#lang-list');
  if (langToggle && langList) {
    const setLangOpen = (open) => {
      langList.hidden = !open;
      langToggle.setAttribute('aria-expanded', String(open));
    };
    langToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      setLangOpen(langList.hidden);
    });
    document.addEventListener('click', (event) => {
      if (langList.hidden) return;
      // the language that is shown already: nothing to load, the list just closes
      const current = event.target.closest?.('#lang-list a[aria-current="true"]');
      if (current) event.preventDefault();
      if (current || !event.target.closest?.('.lang-menu')) setLangOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || langList.hidden) return;
      setLangOpen(false);
      langToggle.focus();
    });
  }

  const closeNav = () => { app.classList.remove('nav-open'); $('#scrim').hidden = true; };
  $('.nav-toggle').addEventListener('click', () => {
    const open = app.classList.toggle('nav-open');
    $('#scrim').hidden = !open;
  });
  $('#scrim').addEventListener('click', closeNav);

  // ---------------------------------------------------------------------------
  // page content
  // ---------------------------------------------------------------------------
  function markCurrent(module) {
    $$('.toc a[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
    const a = $(`.toc a[data-module="${CSS.escape(module)}"]`);
    if (!a) return;
    a.setAttribute('aria-current', 'page');
    for (let d = a.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    a.scrollIntoView({ block: 'nearest' });
  }

  function renderExercise(section) {
    const saved = readSolved(section.dataset.module, section.dataset.ordinal);
    section.classList.toggle('solved', !!saved);
    $('[data-status]', section).textContent = saved ? t('solvedMark') + (saved.at ? ` · ${new Date(saved.at).toLocaleDateString()}` : '') : '';
    const mine = $('.your-code', section);
    if (saved?.code) {
      mine.hidden = false;
      $('code', mine).textContent = saved.code;
    } else {
      mine.hidden = true;
    }
  }

  function enhance(content) {
    const module = content.dataset.module;
    if (!Number(content.dataset.exercises)) store.set(`lpa:visited:${module}`, '1');

    for (const pre of $$('pre.agda:not(.header), pre.code', content)) {
      // The button is on a box around the block, not in it: a long line scrolls the block sideways,
      // and a button inside would go with the text instead of staying in the corner of the frame
      // (nor would it be part of what is copied, which is the text of the block).
      const wrap = Object.assign(document.createElement('div'), { className: 'code-wrap' });
      pre.replaceWith(wrap);
      const button = Object.assign(document.createElement('button'), { type: 'button', className: 'copy-btn', textContent: t('copy') });
      button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(pre.innerText); button.textContent = t('copied'); } catch { button.textContent = t('pressCtrlC'); }
        setTimeout(() => { button.textContent = t('copy'); }, 1500);
      });
      wrap.append(pre, button);
    }

    // hints and "more" sections start folded, as in a textbook's answer section
    for (const box of $$('.Hint, .More', content)) {
      if (box.querySelector(':target') || (location.hash && box.querySelector(`[id="${CSS.escape(decodeURIComponent(location.hash.slice(1)))}"]`))) continue;
      box.hidden = true;
      const toggle = Object.assign(document.createElement('button'), {
        type: 'button', className: 'collapse-toggle', textContent: box.classList.contains('Hint') ? t('showHint') : t('showMore'),
      });
      toggle.addEventListener('click', () => { box.hidden = false; toggle.remove(); });
      box.before(toggle);
    }

    for (const section of $$('.exercise', content)) {
      renderExercise(section);
      const details = $('details.solution', section);
      const agreed = () => section.classList.contains('solved') || details.dataset.confirmed;
      const ask = () => confirm(t('peek'));
      // Ask BEFORE the answer is shown: stop the summary from opening the box by itself
      // and open it by hand once the reader has agreed.
      $('summary', details).addEventListener('click', (event) => {
        if (details.open || agreed()) return;
        event.preventDefault();
        if (ask()) { details.dataset.confirmed = '1'; details.open = true; }
      });
      // anything else that opens the box (find in page, a link into it) is asked, too
      details.addEventListener('toggle', () => {
        if (details.open && !agreed()) {
          if (ask()) details.dataset.confirmed = '1'; else details.open = false;
        }
      });
    }
    refreshProgress();
    fillSymbolTable(content);
  }

  // ---------------------------------------------------------------------------
  // navigation without reloading
  // ---------------------------------------------------------------------------
  const isPageLink = (a) => {
    // (a link to a language is a page load of its own: other styles, other index)
    if (a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin || a.classList.contains('lang-link')) return false;
    const path = a.pathname;
    return (path.endsWith('.html') || path.endsWith('/')) && !path.includes('/editor/');
  };

  async function navigate(href, push) {
    const url = new URL(href, location.href);
    try {
      const response = await fetch(url.pathname + url.search);
      if (!response.ok) throw new Error(String(response.status));
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const next = doc.getElementById('content');
      if (!next) throw new Error('no content');
      $('#content').replaceWith(next);
      // the links of the language menu are to this page, in each language
      const languages = doc.getElementById('lang-list');
      if (languages && langList) langList.replaceChildren(...languages.children);
      document.title = doc.title;
      if (push) history.pushState(null, '', url.href);
      markCurrent(next.dataset.module);
      enhance(next);
      closeNav();
      const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) target.scrollIntoView(); else main.scrollTop = 0;
    } catch {
      location.href = url.href; // anything unexpected: a normal page load
    }
  }

  document.addEventListener('click', (event) => {
    // a name the reference solution uses: the first click shows it, the next goes to its declaration
    const hint = event.target.closest('a.hint');
    if (hint && !hint.classList.contains('shown') && event.button === 0) {
      event.preventDefault();
      hint.classList.add('shown');
      hint.title = t('toDeclaration');
      return;
    }
    const a = event.target.closest('a[href]');
    if (a && !event.defaultPrevented && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
      if (a.dataset.action) {
        event.preventDefault();
        if (a.dataset.action === 'export-progress') exportProgress();
        if (a.dataset.action === 'import-progress') importProgress();
        return;
      }
      if (isPageLink(a)) {
        const url = new URL(a.href);
        if (url.pathname === location.pathname && url.hash) { closeNav(); return; } // plain in-page anchor
        event.preventDefault();
        navigate(a.href, true);
        return;
      }
    }
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'edit') editExercise(button.closest('.exercise'));
    if (button.dataset.action === 'editor-close') closeEditor();
    if (button.dataset.action === 'editor-reload') restartEditor();
    if (button.dataset.action === 'symbols') toggleSymbolBar();
  });
  window.addEventListener('popstate', () => navigate(location.href, false));

  // ---------------------------------------------------------------------------
  // search
  // ---------------------------------------------------------------------------
  const searchInput = $('#search');
  const results = $('#search-results');
  let index = null;
  let selected = -1;

  async function loadIndex() {
    if (index) return index;
    try {
      index = await (await fetch(config.searchUrl)).json();
    } catch {
      index = [];
    }
    return index;
  }

  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function search(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const hits = [];
    for (const page of index) {
      let score = 0;
      let heading = null;
      const title = page.t.toLowerCase();
      const text = page.x.toLowerCase();
      for (const w of words) {
        let s = 0;
        if (title.includes(w)) s += 10;
        const h = page.h.find(([t]) => t.toLowerCase().includes(w));
        if (h) { s += 4; heading ??= h; }
        if (text.includes(w)) s += 1;
        if (!s) { score = 0; break; }
        score += s;
      }
      if (score) hits.push({ page, score, heading, snippet: snippetFor(page.x, words[0]) });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 8);
  }

  function snippetFor(text, word) {
    const i = text.toLowerCase().indexOf(word);
    if (i < 0) return '';
    return (i > 40 ? '…' : '') + text.slice(Math.max(0, i - 40), i + 80) + '…';
  }

  function showResults(hits, words) {
    selected = -1;
    results.hidden = !hits.length && !words.length;
    const mark = (s) => words.reduce((html, w) => html.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>'), escapeHtml(s));
    results.innerHTML = hits.length
      ? hits.map((h) => `<a href="${h.page.u}${h.heading ? '#' + h.heading[1] : ''}"><strong>${mark(h.page.t)}</strong>${h.heading ? ` › ${mark(h.heading[0])}` : ''}<small>${mark(h.snippet)}</small></a>`).join('')
      : `<a href="#" tabindex="-1">${t('searchNone')}</a>`;
  }

  searchInput.addEventListener('focus', loadIndex);
  searchInput.addEventListener('input', async () => {
    await loadIndex();
    const words = searchInput.value.toLowerCase().split(/\s+/).filter(Boolean);
    showResults(search(searchInput.value), words);
  });
  searchInput.addEventListener('keydown', (event) => {
    const links = $$('a', results);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % Math.max(links.length, 1);
      links.forEach((a, i) => a.classList.toggle('active', i === selected));
    } else if (event.key === 'Enter' && links[Math.max(selected, 0)]) {
      event.preventDefault();
      links[Math.max(selected, 0)].click();
    } else if (event.key === 'Escape') {
      results.hidden = true;
      searchInput.blur();
    }
  });
  results.addEventListener('click', (event) => {
    if (event.target.closest('a')) { results.hidden = true; searchInput.value = ''; }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      event.preventDefault();
      searchInput.focus();
    }
  });
  document.addEventListener('click', (event) => { if (!event.target.closest('.search')) results.hidden = true; });

  // ---------------------------------------------------------------------------
  // the editor
  // ---------------------------------------------------------------------------
  const panel = $('#editor-panel');
  const statusBox = $('#editor-status');
  const toggle = $('#editor-toggle');
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('lpa-editor') : null;
  let frame = null;
  let editorReady = false;
  let pending = null; // { module, ordinal, section }
  let active = null; // the exercise currently open in the editor
  let retryTimer = null;
  let watchTimer = null;
  let lastDone = false;

  const setStatus = (text) => { statusBox.textContent = text; };

  // where the main site is, from this page: a translation lives in a directory of it and
  // shares its editor and its service worker
  const siteRoot = config.root ?? './';

  function editorUrl() {
    return `${siteRoot}editor/?embedded=1&theme=${effectiveTheme()}`;
  }

  // What survives reloading the page: whether the editor was open, and with which exercise.
  const EDITOR_STATE = 'lpa:editor';
  const readEditorState = () => { try { return JSON.parse(store.get(EDITOR_STATE) || '{}'); } catch { return {}; } };
  const saveEditorState = (patch) => store.set(EDITOR_STATE, JSON.stringify({ ...readEditorState(), ...patch }));

  // The panel without the editor in it: shown while the page prepares itself for the
  // editor, or to say why it cannot run.
  function showPanel() {
    app.classList.add('editor-open');
    panel.hidden = false;
    toggle.setAttribute('aria-pressed', 'true');
  }

  // Only for an isolated page: the editor inside the frame can only be isolated if the
  // page around it is (see ensureIsolated).
  function showEditor() {
    showPanel();
    saveEditorState({ open: true });
    if (!frame) {
      frame = Object.assign(document.createElement('iframe'), { title: t('editorFrame'), src: editorUrl() });
      frame.allow = 'cross-origin-isolated; clipboard-read; clipboard-write';
      panel.append(frame);
    }
  }

  function closeEditor() {
    app.classList.remove('editor-open');
    panel.hidden = true;
    toggle.setAttribute('aria-pressed', 'false');
    saveEditorState({ open: false });
  }

  // Opens the editor, with the exercise it had last if there was one.
  function openEditorAgain() {
    showEditor();
    const { module, ordinal, title } = readEditorState();
    if (!module || !channel) return;
    pending = { module, ordinal };
    $('#editor-title').textContent = title || t('editor');
    setStatus(editorReady ? t('opening') : t('starting'));
    startRetry();
  }

  function restartEditor() {
    // the new editor has forgotten which exercise it was showing: say it again
    const again = pending ?? (active ? { module: active.module, ordinal: active.ordinal } : null);
    if (frame) { frame.remove(); frame = null; }
    editorReady = false;
    active = null;
    pending = again;
    clearInterval(watchTimer);
    showEditor();
    if (pending) { setStatus(t('restarting')); startRetry(); }
  }

  toggle.addEventListener('click', async () => {
    if (!panel.hidden) { closeEditor(); return; }
    if (await ensureIsolated({ open: true })) openEditorAgain();
  });

  function startRetry() {
    clearInterval(retryTimer);
    const started = Date.now();
    retryTimer = setInterval(() => {
      if (!pending) { clearInterval(retryTimer); return; }
      if (Date.now() - started > 240000) {
        clearInterval(retryTimer);
        setStatus(t('didNotStart'));
        return;
      }
      channel?.postMessage({ t: 'open', module: pending.module, ordinal: Number(pending.ordinal) });
    }, 1500);
  }

  async function ensureIsolated(intent) {
    if (self.crossOriginIsolated) return true;
    if (!('serviceWorker' in navigator) || !isSecureContext) {
      showPanel();
      setStatus(t('needsWorker'));
      return false;
    }
    showPanel(); // not the editor itself: a frame in a page that is not isolated yet could not be isolated either
    setStatus(t('preparing'));
    await registerWorker();
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
    sessionStorage.setItem('lpa:resume', JSON.stringify(intent));
    location.reload(); // the page now gets the isolation headers
    return false;
  }

  async function editExercise(section) {
    if (!section) return;
    const intent = { module: section.dataset.module, ordinal: section.dataset.ordinal, path: location.pathname + location.search };
    if (!channel) { toast(t('noChannel')); return; }
    if (!(await ensureIsolated(intent))) return;
    pending = { ...intent };
    recordActivity();
    showEditor();
    const title = `${section.dataset.id || t('exercise')} — ${section.closest('#content').dataset.title}`;
    $('#editor-title').textContent = title;
    saveEditorState({ module: intent.module, ordinal: intent.ordinal, title });
    setStatus(editorReady ? t('opening') : t('starting'));
    startRetry();
    channel.postMessage({ t: 'open', module: intent.module, ordinal: Number(intent.ordinal) });
  }

  // ---------------------------------------------------------------------------
  // the symbol bar: candidates for what has been typed after a backslash (`\to` → →, …).
  // The editor's extension works them out from the text before the cursor and puts the
  // tapped symbol in; this is the bar. agda-mode's own input method needs key presses and
  // does not survive a phone, so where the screen is touched the bar is the way in.
  // ---------------------------------------------------------------------------
  const symbolBar = $('#symbol-bar');
  const symbolToggle = $('[data-action="symbols"]');
  const SYMBOL_BAR = 'lpa:symbol-bar';
  const barWanted = () => {
    const saved = store.get(SYMBOL_BAR);
    return saved === null ? matchMedia('(pointer: coarse)').matches : saved === '1';
  };

  function symbolButtonFor(text, label, message) {
    const button = Object.assign(document.createElement('button'), { type: 'button', title: label ? `${text}  (${label})` : text });
    button.dataset.text = text;
    button.dataset.message = message;
    button.append(
      Object.assign(document.createElement('span'), { className: 'sym-c', textContent: text }),
      Object.assign(document.createElement('span'), { className: 'sym-s', textContent: label }),
    );
    return button;
  }

  // typed: null (no backslash before the cursor), or what follows the backslash there
  function renderSymbolBar({ typed, items }) {
    const buttons = typed === null ? [symbolButtonFor('\\', 'start', 'im-insert')] : []; // a backslash is hidden away on a phone's keyboard
    for (const [symbol, sequence] of items) buttons.push(symbolButtonFor(symbol, sequence, typed === null ? 'im-insert' : 'im-pick'));
    symbolBar.replaceChildren(...buttons);
    symbolBar.scrollLeft = 0;
  }
  renderSymbolBar({ typed: null, items: [] });

  function applySymbolBar() {
    const on = barWanted();
    symbolBar.hidden = !on;
    symbolToggle.setAttribute('aria-pressed', String(on));
    channel?.postMessage({ t: 'im-mode', bar: on });
    if (on) channel?.postMessage({ t: 'im-sync' });
  }

  function toggleSymbolBar() {
    store.set(SYMBOL_BAR, barWanted() ? '0' : '1');
    applySymbolBar();
  }

  // tapping a button must not take the focus from the editor (a phone would put its keyboard away)
  for (const bar of [symbolBar, $('#command-bar')]) {
    bar.addEventListener('mousedown', (event) => event.preventDefault());
    bar.addEventListener('pointerdown', (event) => event.preventDefault());
  }
  symbolBar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-text]');
    if (button) channel?.postMessage({ t: button.dataset.message, text: button.dataset.text });
  });
  applySymbolBar();

  // ---------------------------------------------------------------------------
  // the command bar: agda-mode's commands (Load, Case split, Give, …) as buttons, for a
  // screen without a keyboard; they are key chords (C-c C-l, …). The editor's extension
  // says which there are (agda-commands.json) and runs the one that is tapped.
  // ---------------------------------------------------------------------------
  const commandBar = $('#command-bar');
  const commandToggle = $('[data-action="commands"]');
  const COMMAND_BAR = 'lpa:command-bar';
  const commandsWanted = () => {
    const saved = store.get(COMMAND_BAR);
    return saved === null ? matchMedia('(pointer: coarse)').matches : saved === '1';
  };

  function renderCommandBar(items) {
    commandBar.replaceChildren(...items.map(({ key, label, hint }) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', title: `${label}  (${hint})` });
      button.dataset.key = key;
      button.append(
        Object.assign(document.createElement('span'), { className: 'cmd-l', textContent: label }),
        Object.assign(document.createElement('span'), { className: 'cmd-s', textContent: hint }),
      );
      return button;
    }));
    commandBar.hidden = !commandsWanted() || items.length === 0;
  }

  function applyCommandBar() {
    const on = commandsWanted();
    commandToggle.setAttribute('aria-pressed', String(on));
    if (!on) commandBar.hidden = true;
    else channel?.postMessage({ t: 'cmd-sync' }); // the list comes back as `cmds`
  }

  // A prompt of the Agda panel (Evaluate, Case split asking for a variable) goes away when
  // Esc is pressed in its input; agda-mode's command for Esc does not do that here. So the
  // page presses it: the Agda panel is a same-origin frame in the editor (like the text the
  // page reads from it to see "All Done"), two frames down.
  function pressEscapeInPrompt() {
    let pressed = false;
    const visit = (win, depth) => {
      try {
        const doc = win.document;
        if (depth >= 1) {
          for (const input of $$('input[placeholder]', doc)) {
            for (const type of ['keydown', 'keyup']) {
              input.dispatchEvent(new win.KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
            }
            pressed = true;
          }
        }
        for (const f of $$('iframe', doc)) visit(f.contentWindow, depth + 1);
      } catch { /* not accessible */ }
    };
    if (frame) visit(frame.contentWindow, 0);
    return pressed;
  }

  // A phone puts its keyboard up when an editable element takes the focus, and when a script calls
  // focus() on one that has it already (the reader put the keyboard away, the element still has the
  // focus). Most commands of the bar make agda-mode do that to the editor (Load, Cancel, …): the keyboard
  // would come up for nothing, or come back. So a touch on the bar makes the editor's text input inert
  // (it cannot take the focus, so no keyboard comes up for it; if it has the focus, it lets go of it and
  // the keyboard goes away) until the reader touches anything else (the symbol bar, the editor, …: each
  // then behaves as it always did). The editor is a same-origin frame, like for pressEscapeInPrompt. The
  // questions of the Agda panel (Evaluate asks for an expression) are left alone: they need the keyboard.
  const TEXT_INPUT = '.native-edit-context, textarea.inputarea'; // what Monaco types into: an EditContext, or a textarea
  let hushed = null; // { doc, saved: Map(element → was it inert), onFocus }

  function releaseKeyboard() {
    if (!hushed) return;
    const { doc, saved, onFocus } = hushed;
    hushed = null;
    try {
      doc.removeEventListener('focusin', onFocus, true);
      doc.removeEventListener('pointerdown', releaseKeyboard, true);
      for (const [element, wasInert] of saved) element.inert = wasInert;
    } catch { /* the editor is gone */ }
  }

  function holdKeyboardBack(event) {
    let doc = null;
    try { doc = frame?.contentDocument ?? null; } catch { /* not accessible */ }
    if (hushed && hushed.doc !== doc) releaseKeyboard(); // a new editor
    // a mouse has no keyboard to hold back (and lets go of what a finger held); some browsers do not say what touched (a click without a pointerType)
    const touched = event.pointerType ? event.pointerType !== 'mouse' : matchMedia('(pointer: coarse)').matches;
    if (!touched) releaseKeyboard();
    if (!doc || hushed || !touched) return;
    const saved = new Map();
    const hush = (element) => {
      if (!saved.has(element)) saved.set(element, element.inert);
      element.inert = true;
      if (doc.activeElement === element) element.blur();
    };
    const onFocus = (focusEvent) => { if (focusEvent.target.matches?.(TEXT_INPUT)) hush(focusEvent.target); }; // an input that is made later
    hushed = { doc, saved, onFocus };
    for (const element of doc.querySelectorAll(TEXT_INPUT)) hush(element);
    doc.addEventListener('focusin', onFocus, true);
    doc.addEventListener('pointerdown', releaseKeyboard, true); // the reader touches the editor
  }
  document.addEventListener('pointerdown', (event) => { if (!commandBar.contains(event.target)) releaseKeyboard(); }, true); // …or anything else of the page

  commandBar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-key]');
    if (!button) return;
    holdKeyboardBack(event);
    if (button.dataset.key === 'cancel' && pressEscapeInPrompt()) return;
    channel?.postMessage({ t: 'agda', key: button.dataset.key });
  });
  commandToggle.addEventListener('click', () => {
    store.set(COMMAND_BAR, commandsWanted() ? '0' : '1');
    applyCommandBar();
  });
  applyCommandBar();

  // The bars are wider than the editor panel, and a swipe scrolls them. A mouse's wheel scrolls up and
  // down, so over a bar it scrolls sideways (the CSS shows a thin scrollbar for a mouse). A sideways
  // wheel or trackpad swipe is left alone, and so is a bar that has nothing more in that direction.
  for (const bar of [symbolBar, commandBar]) {
    bar.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.ctrlKey) return; // ctrl: a pinch or a zoom
      const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? bar.clientWidth : 1; // lines, pages, pixels
      const by = event.deltaY * unit;
      const room = by < 0 ? bar.scrollLeft : bar.scrollWidth - bar.clientWidth - bar.scrollLeft;
      if (room < 1) return;
      bar.scrollLeft += by;
      event.preventDefault();
    }, { passive: false });
  }

  channel?.addEventListener('message', ({ data }) => {
    switch (data?.t) {
      case 'ready':
        editorReady = true;
        applySymbolBar(); // a new editor: tell it which input method to use, and ask for the bars
        applyCommandBar();
        if (pending) channel.postMessage({ t: 'open', module: pending.module, ordinal: Number(pending.ordinal) });
        break;
      case 'im':
        renderSymbolBar(data);
        break;
      case 'cmds':
        renderCommandBar(data.items);
        break;
      case 'opened':
        if (pending && data.module === pending.module && Number(data.ordinal) === Number(pending.ordinal)) {
          active = { module: pending.module, ordinal: String(pending.ordinal), path: data.path };
          pending = null;
          clearInterval(retryTimer);
          setStatus('');
          lastDone = false;
          clearInterval(watchTimer);
          watchTimer = setInterval(watchAgda, 1200);
        }
        break;
      case 'code':
        if (active && data.module === active.module && String(data.ordinal) === active.ordinal) solved(data.text);
        break;
      case 'error':
        setStatus(data.message || t('editorError'));
        break;
      default:
    }
  });

  // The Agda panel of the editor is a webview (nested same-origin iframes), so
  // the page can read what Agda says. "All Done" means: type-checks, no holes.
  function framesText(win, depth = 0) {
    const texts = [];
    try {
      const doc = win.document;
      if (depth > 0) texts.push(doc.body?.innerText?.trim() ?? '');
      for (const f of $$('iframe', doc)) texts.push(...framesText(f.contentWindow, depth + 1));
    } catch { /* not accessible */ }
    return texts;
  }

  function visibleEditorIs(path) {
    try {
      return $$('.monaco-editor[data-uri]', frame.contentDocument).some((e) => e.dataset.uri.endsWith(path) && e.offsetParent !== null);
    } catch { return false; }
  }

  function watchAgda() {
    if (!active || !frame) return;
    const done = framesText(frame.contentWindow).some((t) => /^\*All Done\*/.test(t));
    if (done && !lastDone && visibleEditorIs(active.path)) {
      channel.postMessage({ t: 'get-code', module: active.module, ordinal: Number(active.ordinal) });
    }
    lastDone = done;
  }

  function solved(code) {
    const { module, ordinal } = active;
    const first = !readSolved(module, ordinal);
    store.set(solvedKey(module, ordinal), JSON.stringify({ at: Date.now(), code: code.trim() }));
    $$('.exercise').filter((s) => s.dataset.module === module && s.dataset.ordinal === ordinal).forEach(renderExercise);
    refreshProgress();
    recordActivity();
    if (first) {
      confetti();
      toast(t('solvedToast'));
    }
  }

  // drag to resize
  const resizer = $('#editor-resizer');
  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    resizer.setPointerCapture(event.pointerId);
    app.classList.add('resizing');
    const move = (e) => {
      const width = Math.min(Math.max(innerWidth - e.clientX, 320), innerWidth - 360);
      app.style.setProperty('--editor-size', width + 'px');
      store.set('lpa:editor-size', String(width));
    };
    const up = () => { app.classList.remove('resizing'); resizer.removeEventListener('pointermove', move); resizer.removeEventListener('pointerup', up); };
    resizer.addEventListener('pointermove', move);
    resizer.addEventListener('pointerup', up);
  });
  const savedWidth = Number(store.get('lpa:editor-size'));
  if (savedWidth) app.style.setProperty('--editor-size', Math.min(savedWidth, innerWidth - 360) + 'px');

  // The on-screen keyboard. Chrome makes the page smaller for it (interactive-widget=resizes-content in the viewport
  // meta); Safari does not: the keyboard covers the bottom of the page, and with it the bars under the editor. What is
  // left above the keyboard is the visual viewport: the page is made as high as that (--kb-bottom, see app.css), and the
  // panel of a small screen starts where the visual viewport does when the browser has moved it to show the cursor
  // (--vv-top). Nothing happens while the page is zoomed in: a pinch makes the visual viewport smaller, too.
  const viewport = window.visualViewport;
  function fitToKeyboard() {
    const zoomed = Math.abs(viewport.scale - 1) > 0.01;
    const covered = zoomed ? 0 : Math.round(window.innerHeight - viewport.offsetTop - viewport.height);
    const keyboard = covered > 40 ? covered : 0; // the bar of a hardware keyboard on an iPad is some 55px; a smaller difference is no keyboard
    const root = document.documentElement.style;
    root.setProperty('--kb-bottom', `${keyboard}px`);
    root.setProperty('--vv-top', `${keyboard ? Math.round(viewport.offsetTop) : 0}px`);
  }
  if (viewport) {
    viewport.addEventListener('resize', fitToKeyboard);
    viewport.addEventListener('scroll', fitToKeyboard);
    fitToKeyboard();
  }

  // ---------------------------------------------------------------------------
  // service worker
  // ---------------------------------------------------------------------------
  async function registerWorker() {
    // updateViaCache: 'none' also fetches the scripts the worker imports (sw-common.js,
    // which carries the build id) past the HTTP cache, so that a new build is noticed at once
    return navigator.serviceWorker.register(`${siteRoot}sw.js`, { scope: siteRoot, updateViaCache: 'none' });
  }

  // A new build's worker takes over at once (see sw.js); the files this page was
  // loaded with may then be older than the ones it asks for next, so a reload is due.
  function updateAvailable() {
    if (document.visibilityState === 'hidden') { location.reload(); return; } // nobody is looking
    if ($('.update-bar')) return;
    const bar = Object.assign(document.createElement('div'), { className: 'update-bar', role: 'status' });
    const text = Object.assign(document.createElement('span'), { textContent: t('newVersion') });
    const reload = Object.assign(document.createElement('button'), { type: 'button', className: 'btn primary', textContent: t('reload') });
    reload.addEventListener('click', () => location.reload());
    bar.append(text, reload);
    document.body.append(bar);
  }

  async function removeWorker() {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
  }

  async function setupWorker() {
    if (!('serviceWorker' in navigator) || !isSecureContext) return;
    // escape hatch: ?nosw removes the service worker and its caches
    if (new URLSearchParams(location.search).has('nosw')) {
      await removeWorker();
      toast(t('workerRemoved'));
      setTimeout(() => { location.replace(location.pathname); }, 800);
      return;
    }
    const hadWorker = !!navigator.serviceWorker.controller;
    // a controller change on a page that already had one is an update (a first install is not)
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadWorker) updateAvailable(); });
    try {
      const registration = await registerWorker();
      // a page that stays open for hours should still notice new deployments
      const look = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') look(); });
      setInterval(look, 30 * 60 * 1000);
    } catch (err) {
      console.warn('Service worker unavailable:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Unicode input hints: hover a symbol to learn how to type it in the editor
  // ---------------------------------------------------------------------------
  let unicode = null;
  let unicodePending = null;
  function loadUnicode() {
    if (!config.unicodeUrl) return Promise.resolve({});
    unicodePending ??= fetch(config.unicodeUrl).then((r) => r.json()).catch(() => ({})).then((table) => { unicode = table; window.characterDescriptions = table; return table; });
    return unicodePending;
  }

  function symbolAt(x, y) {
    let node;
    let offset;
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      node = p?.offsetNode; offset = p?.offset;
    } else if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      node = r?.startContainer; offset = r?.startOffset;
    }
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    for (const at of [offset, offset - 1]) {
      const ch = at >= 0 ? String.fromCodePoint(node.data.codePointAt(at) ?? 32) : '';
      if (!ch || !unicode[ch]) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + ch.length);
      const box = range.getBoundingClientRect();
      if (x >= box.left - 1 && x <= box.right + 1 && y >= box.top - 1 && y <= box.bottom + 1) return ch;
    }
    return null;
  }

  main.addEventListener('mouseover', loadUnicode, { once: true });
  main.addEventListener('mousemove', (event) => {
    if (!unicode) return;
    const holder = event.target.closest?.('pre.agda, pre.code, code');
    if (!holder) return;
    const ch = symbolAt(event.clientX, event.clientY);
    const hint = ch ? t('typeHint', { symbol: ch, keys: unicode[ch] }) : '';
    if (holder.title !== hint) holder.title = hint;
  });

  // the table of symbols on the "About" page
  async function fillSymbolTable(content) {
    const table = $('#char-table', content);
    if (!table) return;
    const symbols = await loadUnicode();
    table.replaceChildren(...Object.keys(symbols).sort().map((symbol) => {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = symbol;
      const how = document.createElement('td');
      const code = document.createElement('code');
      code.textContent = symbols[symbol];
      how.append(code);
      row.append(cell, how);
      return row;
    }));
  }

  // ---------------------------------------------------------------------------
  // activity: a small calendar of the days on which you worked on exercises
  // ---------------------------------------------------------------------------
  // A day ends at 5 am, so that night owls keep their streak. Up to two resting
  // days in any seven days do not interrupt a streak.
  const startOfDay = (ms) => { const d = new Date(ms - 5 * 3600000); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const activityLog = () => new Set((store.get('lpa:activity') || '').split(',').filter(Boolean).map(Number));

  function recordActivity() {
    const log = activityLog();
    log.add(startOfDay(Date.now()));
    store.set('lpa:activity', [...log].sort((a, b) => a - b).join(','));
    renderActivity();
  }

  function renderActivity() {
    const box = $('#activity');
    const log = activityLog();
    if (!box || !log.size) return;
    const today = startOfDay(Date.now());
    const days = [];
    const recent = [];
    let current = 0;
    let longest = 0;
    for (const d = new Date(Math.min(...log)); d.getTime() <= today; d.setDate(d.getDate() + 1)) {
      const ms = d.getTime();
      const active = log.has(ms);
      recent.push(!active);
      if (recent.length > 7) recent.shift();
      const status = active ? 'active' : recent.filter(Boolean).length <= 2 ? 'resting' : 'inactive';
      days.push({ ms, status });
      current = status === 'inactive' ? 0 : current + 1;
      longest = Math.max(longest, current);
    }
    // whole weeks, Monday first, the last 12
    const shown = days.slice(-84);
    const lead = (new Date(shown[0].ms).getDay() + 6) % 7;
    const cells = [...Array(lead).fill(null), ...shown];
    box.hidden = false;
    box.innerHTML = `<div class="activity-title">${t('streak', { count: current, current, longest })}</div>` +
      `<div class="activity-grid">${cells.map((c) => (c ? `<i class="daybox ${c.status}" title="${dateLabel(c.ms)}"></i>` : '<i></i>')).join('')}</div>`;
  }

  // ---------------------------------------------------------------------------
  // start
  // ---------------------------------------------------------------------------
  const current = $('#content');
  markCurrent(current.dataset.module);
  enhance(current);
  renderActivity();
  setupWorker();

  const resume = sessionStorage.getItem('lpa:resume');
  if (resume && self.crossOriginIsolated) {
    sessionStorage.removeItem('lpa:resume');
    try {
      const intent = JSON.parse(resume);
      if (intent.module) {
        const section = $$('.exercise').find((s) => s.dataset.module === intent.module && s.dataset.ordinal === String(intent.ordinal));
        if (section) { section.scrollIntoView({ block: 'center' }); editExercise(section); }
      } else if (intent.open) {
        openEditorAgain();
      }
    } catch { /* ignore */ }
  } else if (self.crossOriginIsolated && readEditorState().open && matchMedia('(min-width: 901px)').matches) {
    // the page was reloaded with the editor open: bring it back (not on a phone, where it would cover the page)
    openEditorAgain();
  }
})();
