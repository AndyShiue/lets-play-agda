/*
 * Minimal zip extractor (store + deflate, no zip64), enough for .vsix files and
 * GitHub source archives. Avoids a dependency and works the same on every OS.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * @param {string} zipPath
 * @param {string} destDir
 * @param {{ prefix?: string, strip?: number }} [options]
 *   prefix: only extract entries below it and drop it from the path
 *   strip:  drop this many leading path segments (after the prefix)
 * @returns {number} number of extracted files
 */
export function unzip(zipPath, destDir, { prefix = '', strip = 0 } = {}) {
  const buf = fs.readFileSync(zipPath);

  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(`${zipPath} is not a zip file`);

  const entries = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  const dest = path.resolve(destDir);
  let extracted = 0;

  for (let i = 0; i < entries; i++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) throw new Error('corrupt zip central directory');
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith('/') || !name.startsWith(prefix)) continue;
    const parts = name.slice(prefix.length).split('/').slice(strip);
    if (parts.length === 0 || parts.some((p) => p === '' )) continue;

    const localNameLength = buf.readUInt16LE(localOffset + 26);
    const localExtraLength = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buf.subarray(start, start + compressedSize);

    let content;
    if (method === 0) content = data;
    else if (method === 8) content = zlib.inflateRawSync(data);
    else throw new Error(`unsupported zip compression method ${method} for ${name}`);

    const target = path.resolve(dest, ...parts);
    if (!target.startsWith(dest + path.sep)) throw new Error(`unsafe path in zip: ${name}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    extracted++;
  }
  return extracted;
}
