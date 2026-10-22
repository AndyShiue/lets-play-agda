#!/usr/bin/env node
/*
 * Static file server that behaves like GitHub Pages:
 *   - no COOP/COEP headers (unless --coi is given, to simulate a host that can set them),
 *   - Cache-Control: max-age=600, ETag, 304 responses,
 *   - gzip for text files (no brotli),
 *   - served under a sub-path, like a project site (default /lets-play-agda/editor/).
 *
 * GET /__stats           -> {"total": n, "paths": [...]} of the requests seen
 * GET /__stats?reset=1   -> same, then resets the counters
 *
 *   node scripts/serve.mjs [--dir dist] [--port 8080] [--base /lets-play-agda/editor/] [--coi]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : fallback;
};

const dir = path.resolve(process.cwd(), option('dir', path.join(root, 'dist')));
const port = Number(option('port', '8080'));
let base = option('base', '/lets-play-agda/editor/');
if (!base.startsWith('/')) base = '/' + base;
if (!base.endsWith('/')) base += '/';
const coi = argv.includes('--coi');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.md': 'text/markdown; charset=utf-8',
  '.agda': 'text/plain; charset=utf-8',
  '.agda-lib': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};
const COMPRESSIBLE = /^(text\/|application\/json|image\/svg)/;

let stats = { total: 0, paths: [] };
const gzipCache = new Map();

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/__stats') {
    const body = JSON.stringify(stats);
    if (url.searchParams.get('reset')) stats = { total: 0, paths: [] };
    return send(res, 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body);
  }

  stats.total++;
  if (stats.paths.length < 50000) stats.paths.push(pathname + (url.search ? '?…' : ''));

  const common = { 'Access-Control-Allow-Origin': '*', Server: 'pages-sim' };
  if (coi) {
    common['Cross-Origin-Opener-Policy'] = 'same-origin';
    common['Cross-Origin-Embedder-Policy'] = 'require-corp';
    common['Cross-Origin-Resource-Policy'] = 'cross-origin';
  }

  if (pathname + '/' === base) {
    return send(res, 301, { ...common, Location: base + url.search }, '');
  }
  if (!pathname.startsWith(base)) {
    return send(res, 404, { ...common, 'Content-Type': 'text/plain' }, 'Not found');
  }

  let relative = pathname.slice(base.length);
  if (relative === '' || relative.endsWith('/')) relative += 'index.html';
  const file = path.resolve(dir, relative);
  if (file !== dir && !file.startsWith(dir + path.sep)) {
    return send(res, 403, common, 'Forbidden');
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      return send(res, 404, { ...common, 'Content-Type': 'text/plain' }, 'Not found');
    }
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const headers = {
      ...common,
      'Content-Type': type,
      'Cache-Control': 'max-age=600',
      ETag: etag,
      'Last-Modified': st.mtime.toUTCString(),
      Vary: 'Accept-Encoding',
    };
    if (req.headers['if-none-match'] === etag) return send(res, 304, headers, '');

    const wantsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '') && COMPRESSIBLE.test(type) && st.size > 1024;
    fs.readFile(file, (readErr, data) => {
      if (readErr) return send(res, 500, common, 'Error');
      if (wantsGzip) {
        const key = file + etag;
        let gz = gzipCache.get(key);
        if (!gz) gzipCache.set(key, (gz = zlib.gzipSync(data, { level: 6 })));
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = gz.length;
        return send(res, 200, headers, req.method === 'HEAD' ? '' : gz);
      }
      headers['Content-Length'] = data.length;
      send(res, 200, headers, req.method === 'HEAD' ? '' : data);
    });
  });
});

server.listen(port, () => {
  console.log(`Serving ${dir}`);
  console.log(`  http://localhost:${port}${base}${coi ? '   (with COOP/COEP headers)' : '   (GitHub-Pages-like: no COOP/COEP)'}`);
});
