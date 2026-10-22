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
const START = '-- EXERCISE STARTS\n';
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
    const node = this.nodes.get(path);
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

  const sources = new Map(); // module name -> blocks of its tutorial source
  let current = null; // { key, module, ordinal, path } of the exercise being edited
  let opening = null; // key of the exercise being opened right now

  async function sourceOf(moduleName) {
    if (!sources.has(moduleName)) {
      const relative = moduleName.replace(/\./g, '/') + '.lagda.md';
      const response = await fetch(vscode.Uri.joinPath(filesBase, ...relative.split('/')).toString(true));
      if (!response.ok) throw new Error(`No tutorial source for ${moduleName}`);
      sources.set(moduleName, Exercises.splitModule(await response.text()).blocks);
    }
    return sources.get(moduleName);
  }

  async function loadWithAgda() {
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
      const blocks = await sourceOf(moduleName);
      const exercise = Exercises.listExercises(blocks).find((e) => e.ordinal === ordinal);
      if (!exercise) throw new Error(`${moduleName} has no exercise ${ordinal}`);
      const built = Exercises.buildExerciseFile(blocks, exercise.block, moduleName, ordinal);
      const saved = await dbGet(key);
      const text = typeof saved === 'string' ? withRegion(built.text, saved) : built.text;
      await fileSystem.setExerciseFile(built.path, text, key);

      const uri = vscode.Uri.from({ scheme: 'lpa', path: built.path });
      const editor = await vscode.window.showTextDocument(uri, { preview: false });
      const start = Math.max(0, built.startLine);
      editor.selection = new vscode.Selection(start, 0, start, 0);
      editor.revealRange(new vscode.Range(start, 0, Math.max(start, built.endLine - 1), 0), vscode.TextEditorRevealType.AtTop);
      vscode.commands.executeCommand('workbench.action.closeSidebar').then(undefined, () => {});

      current = { key, module: moduleName, ordinal, path: built.path };
      channel.postMessage({ t: 'opened', module: moduleName, ordinal, path: built.path });
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

  channel.onmessage = async ({ data }) => {
    try {
      if (data?.t === 'ping') channel.postMessage({ t: 'ready' });
      else if (data?.t === 'open') await openExercise(data.module, Number(data.ordinal));
      else if (data?.t === 'get-code') {
        const text = solutionOf(data.module, Number(data.ordinal));
        if (text !== null) channel.postMessage({ t: 'code', module: data.module, ordinal: Number(data.ordinal), text });
      }
    } catch (err) {
      channel.postMessage({ t: 'error', message: String(err && err.message || err) });
    }
  };
  channel.postMessage({ t: 'ready' });
}

function deactivate() {}

module.exports = { activate, deactivate };
