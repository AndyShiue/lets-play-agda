'use strict';

/*
 * The editor's workspace extension.
 *
 *  1. File system provider for the `lpa:` scheme. The files of the tutorial are
 *     static files of the site (../../workspace, listed in
 *     ../../workspace-manifest.json); edits are kept in memory. The workspace's
 *     settings come from ../../workspace-settings.json.
 *  2. Exercises. For an exercise of a tutorial page it builds the file the
 *     reader edits (see exercises.cjs), under Exercise/…, restores the reader's
 *     earlier work from IndexedDB, opens it and asks agda-mode to load it.
 *  3. A bridge to the tutorial page over a BroadcastChannel ("lpa-editor"):
 *       page -> editor  {t:'open', module, ordinal}   open an exercise
 *                       {t:'get-code', module, ordinal} send the reader's solution
 *                       {t:'ping'}
 *       editor -> page  {t:'ready'} {t:'opened', module, ordinal, path}
 *                       {t:'code', module, ordinal, text} {t:'error', message}
 */

const vscode = require('vscode');

// The exercise conventions, shared with the site build (inserted by the build).
const Exercises = (function () {
  const module = { exports: {} };
  /*__EXERCISE_LIB__*/
  return module.exports;
})();

const FILE = vscode.FileType.File;
const DIRECTORY = vscode.FileType.Directory;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function parentOf(path) {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}
function nameOf(path) {
  return path.slice(path.lastIndexOf('/') + 1);
}
function normalize(path) {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

// ---------------------------------------------------------------------------
// the reader's work, kept in IndexedDB (the extension host is a worker, which has it)
// ---------------------------------------------------------------------------
let dbPromise;
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lets-play-agda', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('work');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const db = () => (dbPromise ??= openDb());

async function dbGet(key) {
  try {
    const d = await db();
    return await new Promise((resolve, reject) => {
      const request = d.transaction('work').objectStore('work').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return undefined;
  }
}

async function dbPut(key, value) {
  try {
    const d = await db();
    await new Promise((resolve, reject) => {
      const tx = d.transaction('work', 'readwrite');
      tx.objectStore('work').put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // private browsing: work is simply not kept across reloads
  }
}

// What the reader edits is the part between these markers; the rest of the
// file is regenerated from the tutorial source whenever the exercise is opened.
const START = '-- EXERCISE STARTS HERE\n'; // not '-- EXERCISE STARTS': that is the first line of the file
const END = '-- EXERCISE ENDS';
function regionOf(text) {
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  return a < 0 || b < a ? null : { from: a + START.length, to: b, text: text.slice(a + START.length, b) };
}
function withRegion(template, regionText) {
  const r = regionOf(template);
  return r ? template.slice(0, r.from) + regionText + template.slice(r.to) : template;
}

// ---------------------------------------------------------------------------
// file system
// ---------------------------------------------------------------------------
class WorkspaceFileSystem {
  /**
   * @param {vscode.Uri} filesBase  where the static files live
   * @param {vscode.Uri} manifestUri
   */
  constructor(filesBase, manifestUri, settingsUri) {
    this.filesBase = filesBase;
    this.manifestUri = manifestUri;
    this.settingsUri = settingsUri;
    this._emitter = new vscode.EventEmitter();
    this.onDidChangeFile = this._emitter.event;
    /** @type {Map<string, {type: number, size: number, mtime: number, src?: string, data?: Uint8Array, exercise?: {key: string}}>} */
    this.nodes = new Map();
    /** @type {Map<string, Set<string>>} */
    this.children = new Map();
    this.saveTimers = new Map();
    /** @type {Map<string, Array>} module name -> code blocks of its tutorial source */
    this.sources = new Map();
    /** @type {Map<string, Promise<void>>} exercise files being built, by path */
    this.materializing = new Map();
    this.ready = this._load();
  }

  async _load() {
    const response = await fetch(this.manifestUri.toString(true));
    if (!response.ok) throw new Error(`Could not load ${this.manifestUri}: ${response.status}`);
    const manifest = await response.json();
    const now = Date.now();
    this._ensureDirectory('/', now);
    for (const [relative, size] of manifest.files) {
      const path = '/' + relative;
      this._ensureDirectory(parentOf(path), now);
      this._setNode(path, { type: FILE, size, mtime: now, src: relative });
    }

    // The workspace's settings (where Agda finds the cubical library, ...). They are
    // served as a plain file and shown as /.vscode/settings.json, because hidden
    // files do not survive every way of publishing the site (GitHub's
    // upload-pages-artifact drops them). Without them Agda fails with
    // "Library 'cubical' not found", so a failure here must be loud.
    const settings = await fetch(this.settingsUri.toString(true));
    if (!settings.ok) throw new Error(`Could not load ${this.settingsUri}: ${settings.status}`);
    const data = new Uint8Array(await settings.arrayBuffer());
    this._ensureDirectory('/.vscode', now);
    this._setNode('/.vscode/settings.json', { type: FILE, size: data.byteLength, mtime: now, data });
  }

  _ensureDirectory(path, mtime) {
    if (this.nodes.has(path)) return;
    if (path !== '/') this._ensureDirectory(parentOf(path), mtime);
    this._setNode(path, { type: DIRECTORY, size: 0, mtime });
    this.children.set(path, new Set());
  }

  _setNode(path, node) {
    this.nodes.set(path, node);
    if (path !== '/') {
      let siblings = this.children.get(parentOf(path));
      if (!siblings) this.children.set(parentOf(path), (siblings = new Set()));
      siblings.add(nameOf(path));
    }
  }

  _removeNode(path) {
    this.nodes.delete(path);
    this.children.delete(path);
    this.children.get(parentOf(path))?.delete(nameOf(path));
  }

  async _node(uri) {
    await this.ready;
    const path = normalize(uri.path);
    let node = this.nodes.get(path);
    if (!node) {
      // An exercise file that does not exist yet: the path says which one it is.
      // VS Code asks for such a file when it restores the tabs of a previous
      // session (after the editor was restarted or the page reloaded), before the
      // page has asked for the exercise.
      const exercise = /^\/Exercise\/(.+)\/Ex(\d+)\.agda$/.exec(path);
      if (exercise) {
        await this.materializeExercise('Padova2025.' + exercise[1].replace(/\//g, '.'), Number(exercise[2])).catch(() => {});
        node = this.nodes.get(path);
      }
    }
    if (!node) throw vscode.FileSystemError.FileNotFound(uri);
    return { path, node };
  }

  /** Creates (or replaces) the file of an exercise. */
  async setExerciseFile(path, text, key) {
    await this.ready;
    this._ensureDirectory(parentOf(path), Date.now());
    const data = encoder.encode(text);
    const existing = this.nodes.get(path);
    this._setNode(path, { type: FILE, size: data.byteLength, mtime: Date.now(), data, exercise: { key } });
    this._emitter.fire([{ type: existing ? vscode.FileChangeType.Changed : vscode.FileChangeType.Created, uri: vscode.Uri.from({ scheme: 'lpa', path }) }]);
  }

  /** The code blocks of a tutorial module's source. */
  async blocksOf(moduleName) {
    if (!this.sources.has(moduleName)) {
      const relative = moduleName.replace(/\./g, '/') + '.lagda.md';
      const response = await fetch(vscode.Uri.joinPath(this.filesBase, ...relative.split('/')).toString(true));
      if (!response.ok) throw new Error(`No tutorial source for ${moduleName}`);
      this.sources.set(moduleName, Exercises.splitModule(await response.text()).blocks);
    }
    return this.sources.get(moduleName);
  }

  /**
   * Builds the file of an exercise from the tutorial source, puts the reader's
   * earlier work (kept in IndexedDB) into it, and stores it. Does nothing, and
   * keeps what the reader has typed, if the file exists already.
   * @returns the path of the file
   */
  async materializeExercise(moduleName, ordinal) {
    const path = Exercises.exercisePath(moduleName, ordinal);
    await this.ready;
    if (this.nodes.has(path)) return path;
    if (!this.materializing.has(path)) {
      const job = (async () => {
        const blocks = await this.blocksOf(moduleName);
        const exercise = Exercises.listExercises(blocks).find((e) => e.ordinal === ordinal);
        if (!exercise) throw new Error(`${moduleName} has no exercise ${ordinal}`);
        const built = Exercises.buildExerciseFile(blocks, exercise.block, moduleName, ordinal);
        const key = `${moduleName}/${ordinal}`;
        const saved = await dbGet(key);
        await this.setExerciseFile(path, typeof saved === 'string' ? withRegion(built.text, saved) : built.text, key);
      })().finally(() => this.materializing.delete(path));
      this.materializing.set(path, job);
    }
    await this.materializing.get(path);
    return path;
  }

  _persist(key, text) {
    clearTimeout(this.saveTimers.get(key));
    this.saveTimers.set(key, setTimeout(() => {
      const region = regionOf(text);
      if (region) dbPut(key, region.text);
    }, 400));
  }

  // --- vscode.FileSystemProvider ------------------------------------------

  watch() {
    return new vscode.Disposable(() => {});
  }

  async stat(uri) {
    const { node } = await this._node(uri);
    return { type: node.type, ctime: node.mtime, mtime: node.mtime, size: node.size };
  }

  async readDirectory(uri) {
    const { path, node } = await this._node(uri);
    if (node.type !== DIRECTORY) throw vscode.FileSystemError.FileNotADirectory(uri);
    const result = [];
    for (const name of this.children.get(path) ?? []) {
      const child = this.nodes.get(path === '/' ? '/' + name : `${path}/${name}`);
      if (child) result.push([name, child.type]);
    }
    return result;
  }

  async readFile(uri) {
    const { node } = await this._node(uri);
    if (node.type !== FILE) throw vscode.FileSystemError.FileIsADirectory(uri);
    if (node.data) return node.data;
    const url = vscode.Uri.joinPath(this.filesBase, ...node.src.split('/')).toString(true);
    const response = await fetch(url);
    if (!response.ok) throw vscode.FileSystemError.Unavailable(`${url}: ${response.status}`);
    // Not stored in node.data: the service worker already caches the bytes.
    return new Uint8Array(await response.arrayBuffer());
  }

  async writeFile(uri, content, options) {
    await this.ready;
    const path = normalize(uri.path);
    const existing = this.nodes.get(path);
    if (existing?.type === DIRECTORY) throw vscode.FileSystemError.FileIsADirectory(uri);
    if (!existing && !options.create) throw vscode.FileSystemError.FileNotFound(uri);
    if (existing && options.create && !options.overwrite) throw vscode.FileSystemError.FileExists(uri);
    if (!this.nodes.has(parentOf(path))) throw vscode.FileSystemError.FileNotFound(vscode.Uri.from({ scheme: uri.scheme, path: parentOf(path) }));
    this._setNode(path, { type: FILE, size: content.byteLength, mtime: Date.now(), data: content, exercise: existing?.exercise });
    if (existing?.exercise) this._persist(existing.exercise.key, decoder.decode(content));
    this._emitter.fire([{ type: existing ? vscode.FileChangeType.Changed : vscode.FileChangeType.Created, uri }]);
  }

  async createDirectory(uri) {
    await this.ready;
    const path = normalize(uri.path);
    if (this.nodes.has(path)) throw vscode.FileSystemError.FileExists(uri);
    if (!this.nodes.has(parentOf(path))) throw vscode.FileSystemError.FileNotFound(vscode.Uri.from({ scheme: uri.scheme, path: parentOf(path) }));
    this._ensureDirectory(path, Date.now());
    this._emitter.fire([{ type: vscode.FileChangeType.Created, uri }]);
  }

  async delete(uri, options) {
    const { path, node } = await this._node(uri);
    if (node.type === DIRECTORY) {
      const names = this.children.get(path) ?? new Set();
      if (names.size > 0 && !options.recursive) throw vscode.FileSystemError.NoPermissions(uri);
      for (const name of [...names]) await this.delete(uri.with({ path: `${path}/${name}` }), options);
    }
    this._removeNode(path);
    this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
  }

  async rename(oldUri, newUri, options) {
    const { path: from, node } = await this._node(oldUri);
    await this.ready;
    const to = normalize(newUri.path);
    if (this.nodes.has(to) && !options.overwrite) throw vscode.FileSystemError.FileExists(newUri);
    if (!this.nodes.has(parentOf(to))) throw vscode.FileSystemError.FileNotFound(vscode.Uri.from({ scheme: newUri.scheme, path: parentOf(to) }));
    if (node.type === DIRECTORY) {
      this._ensureDirectory(to, Date.now());
      for (const name of [...(this.children.get(from) ?? [])]) {
        await this.rename(oldUri.with({ path: `${from}/${name}` }), newUri.with({ path: `${to}/${name}` }), options);
      }
    } else {
      const data = node.data ?? (await this.readFile(oldUri));
      this._setNode(to, { type: FILE, size: node.size, mtime: Date.now(), data });
    }
    this._removeNode(from);
    this._emitter.fire([
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri },
    ]);
  }
}

// ---------------------------------------------------------------------------
// exercises and the bridge to the page
// ---------------------------------------------------------------------------
function activate(context) {
  // <site>/extensions/lets-play-agda-fs  ->  <site>/workspace, workspace-manifest.json, workspace-settings.json
  const filesBase = vscode.Uri.joinPath(context.extensionUri, '..', '..', 'workspace');
  const manifestUri = vscode.Uri.joinPath(context.extensionUri, '..', '..', 'workspace-manifest.json');
  const settingsUri = vscode.Uri.joinPath(context.extensionUri, '..', '..', 'workspace-settings.json');
  const fileSystem = new WorkspaceFileSystem(filesBase, manifestUri, settingsUri);
  context.subscriptions.push(vscode.workspace.registerFileSystemProvider('lpa', fileSystem, { isCaseSensitive: true }));

  const channel = new BroadcastChannel('lpa-editor');
  context.subscriptions.push({ dispose: () => channel.close() });

  let current = null; // { key, module, ordinal, path } of the exercise being edited
  let opening = null; // key of the exercise being opened right now

  // agda-mode puts its panel into a group of its own (workbench.action.newGroupBelow) each
  // time it starts, and VS Code restores that group, now empty, with the layout of the
  // previous visit: left alone, every visit would add one more. Until Agda has started
  // nothing of ours creates a group, so the empty ones are leftovers.
  let agdaStarted = false;
  async function closeEmptyGroups() {
    if (agdaStarted) return;
    const groups = vscode.window.tabGroups.all;
    const empty = groups.filter((group) => group.tabs.length === 0);
    if (empty.length === groups.length) empty.pop(); // the last group cannot be closed
    if (empty.length) await vscode.window.tabGroups.close(empty, true);
  }
  context.subscriptions.push(vscode.window.tabGroups.onDidChangeTabGroups(() => { closeEmptyGroups().catch(() => {}); }));
  closeEmptyGroups().catch(() => {});

  // The reader sees the exercise as the page shows it (the text between the markers): the
  // earlier code of the module above it and the tests below it are folded away, and a click
  // on the fold shows them. The first line of a fold stays visible: for the code above that
  // is the first line of the file, `-- EXERCISE STARTS` (see buildExerciseFile), for the
  // tests the END marker.
  const FOLD_START = START.trimEnd();
  context.subscriptions.push(vscode.languages.registerFoldingRangeProvider({ scheme: 'lpa' }, {
    provideFoldingRanges(document) {
      const lines = document.getText().split('\n').map((line) => line.replace(/\r$/, ''));
      const start = lines.indexOf(FOLD_START);
      const end = lines.indexOf(END);
      if (start < 0 || end < start) return [];
      const ranges = [];
      if (start > 1) ranges.push(new vscode.FoldingRange(0, start, vscode.FoldingRangeKind.Region));
      if (lines.slice(end + 1).some((line) => line.trim())) ranges.push(new vscode.FoldingRange(end, lines.length - 1, vscode.FoldingRangeKind.Region));
      return ranges;
    },
  }));

  async function foldAroundExercise(editor) {
    const lines = editor.document.getText().split('\n');
    if (lines.indexOf(FOLD_START) <= 1) return; // nothing above the exercise
    const hidden = (line) => !editor.visibleRanges.some((range) => range.start.line <= line && line <= range.end.line);
    // the editor asks the provider for the ranges a moment after the document is shown
    for (let attempt = 0; attempt < 30; attempt++) {
      await vscode.commands.executeCommand('editor.foldAll');
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (editor.visibleRanges.length > 0 && hidden(1)) return;
    }
  }

  async function loadWithAgda() {
    agdaStarted = true;
    // agda-mode activates when the first Agda file is opened; its commands appear a moment later
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        await vscode.commands.executeCommand('agda-mode.load');
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  async function openExercise(moduleName, ordinal) {
    const key = `${moduleName}/${ordinal}`;
    if (current?.key === key || opening === key) {
      if (current?.key === key) channel.postMessage({ t: 'opened', module: moduleName, ordinal, path: current.path });
      return;
    }
    opening = key;
    try {
      // The file may exist already: VS Code restores the tabs of the previous session.
      const path = await fileSystem.materializeExercise(moduleName, ordinal);
      await closeEmptyGroups().catch(() => {});

      const uri = vscode.Uri.from({ scheme: 'lpa', path });
      const editor = await vscode.window.showTextDocument(uri, { preview: false });
      await foldAroundExercise(editor);
      // show the exercise (between the markers), wherever the reader has scrolled to
      const text = editor.document.getText();
      const startMark = text.indexOf(START);
      if (startMark >= 0) {
        const start = text.slice(0, startMark).split('\n').length; // the line after the marker
        const end = text.slice(0, Math.max(startMark, text.indexOf(END))).split('\n').length;
        editor.selection = new vscode.Selection(start, 0, start, 0);
        editor.revealRange(new vscode.Range(start, 0, Math.max(start, end - 1), 0), vscode.TextEditorRevealType.AtTop);
      }
      vscode.commands.executeCommand('workbench.action.closeSidebar').then(undefined, () => {});

      current = { key, module: moduleName, ordinal, path };
      channel.postMessage({ t: 'opened', module: moduleName, ordinal, path });
      loadWithAgda();
    } finally {
      opening = null;
    }
  }

  function solutionOf(moduleName, ordinal) {
    if (!current || current.module !== moduleName || current.ordinal !== ordinal) return null;
    const doc = vscode.workspace.textDocuments.find((d) => d.uri.path === current.path);
    const region = doc && regionOf(doc.getText());
    return region ? region.text : null;
  }

  // ---------------------------------------------------------------------------
  // the symbol bar
  //
  // The page shows a bar with candidates for what has been typed after a backslash
  // (`\to` → → …), and the symbol that is tapped replaces it. agda-mode's own input method
  // starts from a key press and keeps its state from one key to the next, which does not
  // survive a phone (no key presses, input in bursts). This one has no state: it only looks
  // at the text before the cursor, wherever that is, in a hole too.
  // ---------------------------------------------------------------------------
  const COMMON = [...'→←ℕ≡≢∷≤≥λ¬∀∃Σ×⊎⊥⊤∈⇒₀₁₂⟨⟩∘']; // what the tutorial uses most, in this order
  const SEQUENCE = /\\([^\s\\]*)$/; // a backslash and what follows it, up to the cursor
  const MOST = 40; // candidates shown
  let symbolTable = null; // [[symbol, [sequence, …]], …] of agda-mode's input method

  function loadSymbols() {
    symbolTable ??= vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'symbols.json'))
      .then((bytes) => JSON.parse(new TextDecoder().decode(bytes)), () => []);
    return symbolTable;
  }

  /** [[symbol, shortest sequence that goes with what was typed], …], the best first. */
  function candidatesFor(table, typed) {
    const found = [];
    for (const [symbol, sequences] of table) {
      const exact = sequences.includes(typed);
      let shortest = null;
      for (const s of sequences) if (s.startsWith(typed) && (shortest === null || s.length < shortest.length)) shortest = s;
      if (shortest === null) continue;
      const rank = COMMON.indexOf(symbol);
      found.push({ symbol, sequence: exact ? typed : shortest, exact, rank: rank < 0 ? COMMON.length : rank });
    }
    found.sort((a, b) => (b.exact - a.exact) || (a.rank - b.rank) || (a.sequence.length - b.sequence.length) || (a.sequence < b.sequence ? -1 : 1));
    return found.slice(0, MOST).map((c) => [c.symbol, c.sequence]);
  }

  let lastBar = '';
  async function sendBar() {
    const table = await loadSymbols();
    const editor = vscode.window.activeTextEditor;
    let typed = null; // null: no backslash before the cursor
    if (editor && editor.document.uri.scheme === 'lpa' && editor.selection.isEmpty) {
      const { line, character } = editor.selection.active;
      typed = SEQUENCE.exec(editor.document.lineAt(line).text.slice(0, character))?.[1] ?? null;
    }
    // without anything typed yet: the symbols the tutorial uses most
    const items = typed ? candidatesFor(table, typed) : COMMON.map((symbol) => [symbol, table.find(([s]) => s === symbol)?.[1].reduce((a, b) => (b.length < a.length ? b : a)) ?? '']);
    const message = { t: 'im', typed, items };
    const json = JSON.stringify(message);
    if (json !== lastBar) { lastBar = json; channel.postMessage(message); }
  }
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(() => { sendBar().catch(() => {}); }),
    vscode.window.onDidChangeActiveTextEditor(() => { sendBar().catch(() => {}); }),
  );

  /** Puts `text` at the cursor; with `replace`, in place of the backslash sequence before it. */
  async function placeText(text, replace) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.scheme !== 'lpa') return;
    let range = editor.selection;
    if (replace && range.isEmpty) {
      const { line, character } = range.active;
      const m = SEQUENCE.exec(editor.document.lineAt(line).text.slice(0, character));
      if (m) range = new vscode.Range(line, character - m[0].length, line, character);
    }
    if (!(await editor.edit((builder) => builder.replace(range, text)))) return;
    const after = range.start.translate(0, text.length);
    editor.selection = new vscode.Selection(after, after);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  }

  // ---------------------------------------------------------------------------
  // the command bar: agda-mode's commands as buttons. They are key chords (C-c C-l, …),
  // which a phone cannot press. agda-commands.json lists them: what the page shows, and
  // which command of agda-mode a button runs (the build checks that those exist).
  // ---------------------------------------------------------------------------
  let agdaCommands = null;
  function loadAgdaCommands() {
    agdaCommands ??= vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'agda-commands.json'))
      .then((bytes) => JSON.parse(new TextDecoder().decode(bytes)), () => []);
    return agdaCommands;
  }

  async function runAgdaCommand(key) {
    const entry = (await loadAgdaCommands()).find((command) => command.key === key); // only what the list names
    if (!entry || !vscode.window.activeTextEditor) return;
    await vscode.commands.executeCommand(entry.id);
  }

  // With the bar, agda-mode's input method would work on the same text: only one of them.
  async function useBarInsteadOfInputMethod(bar) {
    const configuration = vscode.workspace.getConfiguration('agdaMode');
    if (configuration.get('inputMethod.enabled') !== !bar) await configuration.update('inputMethod.enabled', !bar, vscode.ConfigurationTarget.Global);
  }

  channel.onmessage = async ({ data }) => {
    try {
      if (data?.t === 'ping') channel.postMessage({ t: 'ready' });
      else if (data?.t === 'open') await openExercise(data.module, Number(data.ordinal));
      else if (data?.t === 'get-code') {
        const text = solutionOf(data.module, Number(data.ordinal));
        if (text !== null) channel.postMessage({ t: 'code', module: data.module, ordinal: Number(data.ordinal), text });
      }
      else if (data?.t === 'im-sync') { lastBar = ''; await sendBar(); }
      else if (data?.t === 'im-mode') await useBarInsteadOfInputMethod(!!data.bar);
      else if (data?.t === 'im-pick') await placeText(String(data.text), true);
      else if (data?.t === 'im-insert') await placeText(String(data.text), false);
      else if (data?.t === 'cmd-sync') channel.postMessage({ t: 'cmds', items: (await loadAgdaCommands()).map(({ key, label, hint }) => ({ key, label, hint })) });
      else if (data?.t === 'agda') await runAgdaCommand(String(data.key));
    } catch (err) {
      channel.postMessage({ t: 'error', message: String(err && err.message || err) });
    }
  };
  channel.postMessage({ t: 'ready' });
}

function deactivate() {}

module.exports = { activate, deactivate };
