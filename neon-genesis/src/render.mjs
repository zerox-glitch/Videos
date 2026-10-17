#!/usr/bin/env node
// Render harness: stills, contact sheets, and MP4 via an ffmpeg raw pipe.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { W, H, FPS, DURATION } from './data.js';
import { drawFrame } from './film.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = process.env.FFMPEG || '/home/user/.local/bin/ffmpeg';

/* ---------------------------------------------------------------- fonts */
const FONT_DIR = path.join(ROOT, 'assets/fonts');
const fonts = [
  ['ChakraPetch-300.ttf', 'Chakra Light'],
  ['ChakraPetch-400.ttf', 'Chakra'],
  ['ChakraPetch-700.ttf', 'Chakra Bold'],
  ['Michroma-400.ttf', 'Michroma'],
  ['Orbitron-700.ttf', 'Orbitron'],
  ['Orbitron-900.ttf', 'Orbitron Black'],
  ['SpaceGrotesk-500.ttf', 'Grotesk'],
  ['SpaceGrotesk-700.ttf', 'Grotesk Bold'],
  ['JetBrainsMono-400.ttf', 'Mono'],
];
for (const [file, name] of fonts) {
  const p = path.join(FONT_DIR, file);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, name);
}

/* ------------------------------------------------------------------ cli */
const args = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
const has = k => args.includes(`--${k}`);

const scale = parseFloat(arg('scale', '1'));
const fps = parseInt(arg('fps', String(FPS)), 10);
const from = parseFloat(arg('from', '0'));
const to = parseFloat(arg('to', String(DURATION)));
const outDir = path.resolve(ROOT, arg('out', 'renders/previews'));
const name = arg('name', 'neon-genesis');
const audio = arg('audio', null);
const crf = arg('crf', '16');
const preset = arg('preset', 'medium');

const CW = Math.round(W * scale);
const CH = Math.round(H * scale);
const canvas = createCanvas(CW, CH);
const ctx = canvas.getContext('2d');

function drawAt(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CW, CH);
  // scenes work in "design pixels" (1920x1080); scale the whole frame
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawFrame(ctx, t, W, H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }
function slug(s) { return String(s).replace(/[^a-z0-9._-]+/gi, '_'); }

/* --------------------------------------------------------------- stills */
if (has('stills')) {
  const times = (arg('stills', '1')).split(',').map(Number);
  ensure(outDir);
  for (const t of times) {
    const t0 = Date.now();
    drawAt(t);
    const f = path.join(outDir, `still-${slug(t)}.png`);
    fs.writeFileSync(f, await canvas.encode('png'));
    console.log(`${f}  (${Date.now() - t0} ms)`);
  }
  process.exit(0);
}

/* ---------------------------------------------------------------- sheet */
if (has('sheet')) {
  const step = parseFloat(arg('step', String(1 / fps)));
  const cols = parseInt(arg('cols', '4'), 10);
  const n = Math.max(1, Math.round((to - from) / step));
  const tw = CW, th = CH;
  const pad = 8;
  const rows = Math.ceil(n / cols);
  const sheet = createCanvas(cols * (tw + pad) + pad, rows * (th + pad + 20) + pad);
  const s = sheet.getContext('2d');
  s.fillStyle = '#0b0b0f';
  s.fillRect(0, 0, sheet.width, sheet.height);
  ensure(outDir);
  for (let i = 0; i < n; i++) {
    const t = from + i * step;
    drawAt(t);
    const x = pad + (i % cols) * (tw + pad);
    const y = pad + Math.floor(i / cols) * (th + pad + 20);
    s.drawImage(canvas, x, y);
    s.fillStyle = '#8fa';
    s.font = '13px "Mono"';
    s.fillText(`${t.toFixed(2)}s`, x + 3, y + th + 15);
  }
  const f = path.join(outDir, `sheet-${slug(arg('name', `${from}-${to}`))}.jpg`);
  fs.writeFileSync(f, await sheet.encode('jpeg', 88));
  console.log(`${f}  ${n} frames`);
  process.exit(0);
}

/* ---------------------------------------------------------------- video */
ensure(outDir);
const outFile = path.join(outDir, `${name}.mp4`);
if (fs.existsSync(outFile)) fs.unlinkSync(outFile);

const ffArgs = [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${CW}x${CH}`, '-r', String(fps), '-i', '-',
];
if (audio) ffArgs.push('-i', audio);
ffArgs.push(
  '-c:v', 'libx264', '-preset', preset, '-crf', crf,
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-r', String(fps),
);
if (audio) ffArgs.push('-c:a', 'aac', '-b:a', '320k', '-ac', '2', '-shortest');
ffArgs.push(outFile);

const ff = spawn(FFMPEG, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
const total = Math.round((to - from) * fps);
const t0 = Date.now();
let last = 0;

for (let i = 0; i < total; i++) {
  const t = from + i / fps;
  drawAt(t);
  const buf = canvas.data();
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 15 === 0 || i === total - 1) {
    const el = (Date.now() - t0) / 1000;
    const per = el / (i + 1);
    const eta = per * (total - i - 1);
    process.stdout.write(`\r${i + 1}/${total}  ${per.toFixed(2)} s/frame  eta ${Math.round(eta)}s   `);
  }
}
ff.stdin.end();
await done;
console.log(`\n${outFile}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
