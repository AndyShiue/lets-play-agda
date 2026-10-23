/*
 * Starts the editor.
 *
 *  1. Makes the page cross-origin isolated. GitHub Pages cannot send the
 *     COOP/COEP headers, so we register a service worker that adds them and
 *     reload once the worker controls the page.
 *  2. Boots the VS Code workbench from the static build in ./vscode.
 *
 * The workbench part follows the browser entry point of microsoft/vscode-test-web
 * (MIT License, Copyright (c) Microsoft Corporation).
 */

const status = document.getElementById('lpa-status');
const say = (text, isError = false) => {
  if (!status) return;
  status.textContent = text;
  status.className = isError ? 'error' : '';
};

const base = new URL('./', document.baseURI);
const params = new URLSearchParams(location.search);
// the service worker that makes the page isolated: the editor's own, or the one of the site around it
const swMeta = document.querySelector('meta[name="lpa-sw"]');
const swUrl = new URL(swMeta?.content || 'sw.js', base);
const swScope = new URL(swMeta?.dataset.scope || './', base).href;

// ---------------------------------------------------------------------------
// 1. Cross-origin isolation through the service worker
// ---------------------------------------------------------------------------

const RELOAD_FLAG = 'lpa-coi-reload';

async function ensureIsolation() {
  if (globalThis.crossOriginIsolated) {
    sessionStorage.removeItem(RELOAD_FLAG);
    return true;
  }

  if (params.has('embedded')) {
    // In a page of the site, only that page can make this frame isolated, and it does
    // so before it shows the editor. Registering a worker here would not help.
    say(
      'The editor needs the page around it to be cross-origin isolated.\n' +
      'Reload the page. If this stays, open the site in a normal (not private) window.', true);
    return false;
  }

  if (!('serviceWorker' in navigator) || !globalThis.isSecureContext) {
    say('This editor needs service workers (HTTPS or localhost, and not a private window in some browsers).', true);
    return false;
  }

  if (sessionStorage.getItem(RELOAD_FLAG)) {
    say(
      'The page is still not cross-origin isolated after the service worker took over.\n' +
      'Try reloading, or clear this site\'s data and reload.', true);
    return false;
  }

  say('Preparing the editor (first visit only)…');
  const registration = await navigator.serviceWorker.register(swUrl, { scope: swScope, updateViaCache: 'none' });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  }
  void registration;
  sessionStorage.setItem(RELOAD_FLAG, '1');
  location.reload();
  return false;
}

// ---------------------------------------------------------------------------
// 2. Workbench
// ---------------------------------------------------------------------------

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error('Could not load ' + src));
    document.head.appendChild(el);
  });
}

class WorkspaceProvider {
  constructor(workspace) {
    this.workspace = workspace;
    this.trusted = true;
  }
  async open() {
    // The editor shows exactly one workspace; opening others is not supported.
    return false;
  }
}

async function bootWorkbench() {
  const vscodeBase = new URL('vscode/', base);
  globalThis._VSCODE_FILE_ROOT = new URL('out/', vscodeBase).href;

  await loadScript(new URL('out/nls.messages.js', vscodeBase).href);
  const { create, URI } = await import(new URL('out/vs/workbench/workbench.web.main.internal.js', vscodeBase).href);

  const scheme = base.protocol.replace(/:$/, '');
  const extension = (name) => ({ scheme, authority: base.host, path: `${base.pathname}extensions/${name}` });
  const folderUri = URI.from({ scheme: 'lpa', path: '/' });

  const config = {
    productConfiguration: {
      enableTelemetry: false,
      // Empty: run the extension host iframe from the same origin (supported by VS Code).
      webEndpointUrlTemplate: '',
      // No {{uuid}} placeholder: webviews are served from the same origin, too.
      webviewContentExternalBaseUrlTemplate: new URL('out/vs/workbench/contrib/webview/browser/pre/', vscodeBase).href,
    },
    additionalBuiltinExtensions: [
      extension('agda-mode'),
      extension('als-wasm-loader'),
      extension('lets-play-agda-fs'),
    ],
    configurationDefaults: {
      'workbench.startupEditor': 'none',
      'workbench.tips.enabled': false,
      'workbench.colorTheme': params.get('theme') === 'dark' ? 'Default Dark Modern' : 'Default Light Modern',
      // a lean window: the editor is one panel of the tutorial page
      'workbench.activityBar.location': 'hidden',
      'workbench.editor.showTabs': 'single',
      'workbench.layoutControl.enabled': false,
      'window.commandCenter': false,
      'breadcrumbs.enabled': false,
      'editor.minimap.enabled': false,
      'editor.wordWrap': 'on',
      'editor.fontSize': 15,
      'editor.fontFamily': "'JuliaMono', 'Cascadia Code', 'Cascadia Mono', 'DejaVu Sans Mono', Consolas, monospace",
      'editor.fontLigatures': false,
      'files.autoSave': 'afterDelay',
      'files.autoSaveDelay': 800,
    },
    folderUri,
    workspaceProvider: new WorkspaceProvider({ folderUri }),
  };

  document.getElementById('lpa-status')?.remove();
  create(document.body, config);
}

try {
  if (await ensureIsolation()) await bootWorkbench();
} catch (err) {
  console.error(err);
  say(String(err && err.stack || err), true);
}
