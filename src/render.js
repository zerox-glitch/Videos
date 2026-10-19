#!/usr/bin/env node
// Deterministic Canvas/WebGL → PNG pipe → H.264/AAC. CLI follows Motion Video Director's range contract.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, stat, mkdir, writeFile, readdir, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { brotliDecompressSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium as playwrightChromium } from 'playwright-core';
import sparticuzChromium from '@sparticuz/chromium';
import { DURATION, W, H, FPS } from './data.js';

const root = process.cwd();
const src = path.dirname(fileURLToPath(import.meta.url));
const argsIn = process.argv.slice(2);
const opt = (key, fallback) => {
  const i = argsIn.indexOf(`--${key}`);
  return i < 0 ? fallback : argsIn[i + 1];
};
const from = Number(opt('from', 0));
const to = Number(opt('to', DURATION));
const fps = Number(opt('fps', FPS));
const scale = Number(opt('scale', 1));
if (![from, to, fps, scale].every(Number.isFinite) || from < 0 || to <= from || fps <= 0 || scale <= 0 || scale > 1 || to > DURATION + 1e-6) {
  throw new Error(`Invalid render range/settings. Duration is ${DURATION}s.`);
}
const count = Math.ceil((to - from) * fps - 1e-8);
const out = path.resolve(opt('out', 'cache/render'));
const jpg = argsIn.includes('--jpg');
const name = String(opt('name', 'Preview v1'));
if (!name || /[\\/:*?"<>|]/.test(name)) throw new Error('Use a plain --name without path separators.');
const destination = path.join(out, `${name}.mp4`);
const audio = opt('audio', null);
if (audio && !existsSync(path.resolve(audio))) throw new Error(`Audio file not found: ${audio}`);
const ffmpeg = process.env.MVD_FFMPEG || path.join(root, 'node_modules/@ffmpeg-installer/linux-x64/ffmpeg');
if (!existsSync(ffmpeg)) throw new Error(`FFmpeg binary not found: ${ffmpeg}`);

async function prepareChromiumLibraries() {
  // @sparticuz/chromium ships these small NSS/NSPR libraries for Amazon Linux.
  // The sandbox's base image lacks them, so unpack that project-local archive to /tmp,
  // then expose only that directory to Chromium via LD_LIBRARY_PATH (no system install).
  const archive = path.join(root, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br');
  const libRoot = path.join(tmpdir(), 'mvd-chromium-extra-libs');
  const firstLib = path.join(libRoot, 'lib/libnspr4.so');
  if (!existsSync(firstLib)) {
    await mkdir(libRoot, { recursive: true });
    const tarBytes = brotliDecompressSync(await readFile(archive));
    let offset = 0;
    while (offset + 512 <= tarBytes.length) {
      const header = tarBytes.subarray(offset, offset + 512);
      if (header.every((byte) => byte === 0)) break;
      const rawName = header.subarray(0, 100).toString('utf8').split('\0', 1)[0];
      const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
      const modeText = header.subarray(100, 108).toString('ascii').replace(/\0.*$/, '').trim();
      const size = Number.parseInt(sizeText || '0', 8) || 0;
      const mode = Number.parseInt(modeText || '755', 8) || 0o755;
      const fileStart = offset + 512;
      if (rawName.startsWith('lib/') && size > 0) {
        const destinationPath = path.resolve(libRoot, rawName);
        if (!destinationPath.startsWith(`${libRoot}${path.sep}`)) throw new Error('Unsafe Chromium library archive path.');
        await mkdir(path.dirname(destinationPath), { recursive: true });
        await writeFile(destinationPath, tarBytes.subarray(fileStart, fileStart + size));
        await chmod(destinationPath, mode);
      }
      offset = fileStart + Math.ceil(size / 512) * 512;
    }
  }
  process.env.LD_LIBRARY_PATH = [path.join(libRoot, 'lib'), process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
}
await mkdir(out, { recursive: true });
if (jpg && (await readdir(out)).some((file) => /^\d{5}\.jpg$/.test(file))) {
  throw new Error('JPEG frames already exist in this folder. Choose a fresh --out directory.');
}
if (!jpg && existsSync(destination)) throw new Error(`Output exists; choose a new version/name: ${destination}`);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const allowedPrefixes = ['/src/', '/assets/', '/plan/'];
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname.split('/').some((part) => part.startsWith('.')) || !allowedPrefixes.some((prefix) => pathname.startsWith(prefix)) && pathname !== '/') {
      throw new Error('Forbidden path');
    }
    const file = path.resolve(root, `.${pathname === '/' ? '/src/index.html' : pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) || !(await stat(file)).isFile()) throw new Error('Not a project file');
    response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

let browser;
let encoder;
let encodeResult;
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  await prepareChromiumLibraries();
  sparticuzChromium.graphicsMode = true;
  browser = await playwrightChromium.launch({
    headless: true,
    executablePath: await sparticuzChromium.executablePath(),
    args: sparticuzChromium.args,
  });
  const page = await browser.newPage({
    viewport: { width: Math.max(2, Math.round(W * scale)), height: Math.max(2, Math.round(H * scale)) },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/src/index.html?scale=${scale}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, { timeout: 30000 });
  if (errors.length) throw new Error(errors.join('\n'));

  if (!jpg) {
    const command = [
      '-hide_banner', '-loglevel', 'warning', '-n',
      '-f', 'image2pipe', '-framerate', String(fps), '-i', 'pipe:0',
    ];
    if (audio) command.push('-ss', String(from), '-t', String(to - from), '-i', path.resolve(audio));
    command.push('-map', '0:v:0');
    if (audio) command.push('-map', '1:a:0', '-af', 'apad', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000');
    command.push(
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-r', String(fps), '-frames:v', String(count), '-t', String(count / fps),
      '-movflags', '+faststart', destination,
    );
    encoder = spawn(ffmpeg, command, { stdio: ['pipe', 'inherit', 'inherit'] });
    encodeResult = new Promise((resolve, reject) => {
      encoder.once('error', reject);
      encoder.once('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`)));
    });
    encodeResult.catch(() => {});
    encoder.stdin.on('error', () => {});
  }

  for (let i = 0; i < count; i++) {
    const time = from + i / fps;
    await page.evaluate((t) => window.renderFrame(t), time);
    if (errors.length) throw new Error(errors.join('\n'));
    const url = await page.evaluate((type) => window.grab(type), jpg ? 'image/jpeg' : 'image/png');
    const bytes = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (jpg) {
      await writeFile(path.join(out, `${String(i).padStart(5, '0')}.jpg`), bytes);
    } else if (!encoder.stdin.write(bytes)) {
      await Promise.race([
        once(encoder.stdin, 'drain'),
        encodeResult.then(() => { throw new Error('Encoder ended before all frames were sent.'); }),
      ]);
    }
  }
  if (encoder) {
    encoder.stdin.end();
    await encodeResult;
  }
  console.log(jpg
    ? `Rendered ${count} JPEG frames (${fps} fps, ${scale}×) to ${out}`
    : `Rendered ${count} frames (${fps} fps, ${scale}×)${audio ? ' with procedural SFX' : ' without audio'} → ${destination}`);
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill();
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
