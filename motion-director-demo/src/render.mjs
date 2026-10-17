#!/usr/bin/env node
// Deterministic renderer: every frame is a pure function of time.
//   node src/render.mjs --stills 0,2.5,7 --out cache/stills --scale 0.5
//   node src/render.mjs --sheet --from 0 --to 3 --fps 8 --scale 0.3 --out cache/sheets --name hook
//   node src/render.mjs --from 0 --to 26 --fps 30 --scale 1 --out renders/final --name "Demo v1" [--audio mix.wav]
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, DURATION, scenes } from './data.js';
import { initFonts, makeGrain, grain, vignetteAuto, hud, cutMask, text } from './draw.js';
import { cuts } from './timing.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = k => argv.includes(`--${k}`);

const from = Number(arg('from', 0));
const to = Number(arg('to', DURATION));
const fps = Number(arg('fps', FPS));
const scale = Number(arg('scale', 1));
const outDir = path.resolve(root, arg('out', 'cache/out'));
const name = String(arg('name', 'render'));
const audio = arg('audio', null);
const ffmpeg = process.env.MVD_FFMPEG || 'ffmpeg';

if (![from, to, fps, scale].every(Number.isFinite) || from < 0 || to <= from || fps <= 0 || scale <= 0 || scale > 1) {
  throw new Error('Invalid --from/--to/--fps/--scale');
}
if (/[\\/:*?"<>|]/.test(name)) throw new Error('Use a plain --name without path separators');

initFonts(path.join(root, 'assets/fonts'));
makeGrain();

const cw = Math.max(2, 2 * Math.round((W * scale) / 2));
const ch = Math.max(2, 2 * Math.round((H * scale) / 2));
const canvas = createCanvas(cw, ch);
const ctx = canvas.getContext('2d');

const modules = await Promise.all(scenes.map(s => import(`./scenes/${s.id}.js`)));

function drawAt(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(cw / W, 0, 0, ch / H, 0, 0);
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (t < s.start || t >= s.end) continue;
    ctx.save();
    modules[i].draw(ctx, t - s.start, t);
    ctx.restore();
  }
  hud(ctx, t, { color: t >= 22 ? 'rgba(10,12,15,0.55)' : 'rgba(139,147,158,0.85)' });
  cutMask(ctx, t, cuts);
  grain(ctx, t, { alpha: 0.055 });
  vignetteAuto(ctx, 0.28, 0.1);
}

await mkdir(outDir, { recursive: true });

/* ---------- stills ---------- */
if (has('stills')) {
  const times = String(arg('stills', '')).split(',').map(Number);
  if (!times.length || times.some(n => !Number.isFinite(n))) throw new Error('--stills needs comma-separated seconds');
  for (const t of times) {
    drawAt(t);
    const file = path.join(outDir, `still-${t.toFixed(2).padStart(6, '0')}s.jpg`);
    await writeFile(file, await canvas.encode('jpeg', 90));
    console.log(file);
  }
  process.exit(0);
}

/* ---------- contact sheet ---------- */
if (has('sheet')) {
  const count = Math.ceil((to - from) * fps - 1e-8);
  const cols = 6;
  const cellW = 260;
  const cellH = Math.round(cellW * H / W);
  const pad = 10;
  const labelH = 30;
  const rows = Math.ceil(count / cols);
  const sheet = createCanvas(cols * (cellW + pad) + pad, rows * (cellH + labelH + pad) + pad + 46);
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#171a1f';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  text(sctx, `${name} · ${from}s–${to}s · ${fps}fps`, pad + 4, 30, { size: 20, family: 'Mono', color: '#F2EEE4' });

  const img = createCanvas(cw, ch);
  const ictx = img.getContext('2d');
  for (let i = 0; i < count; i++) {
    const t = from + i / fps;
    drawAt(t);
    ictx.drawImage(canvas, 0, 0);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cellW + pad);
    const y = 46 + row * (cellH + labelH + pad);
    sctx.drawImage(img, x, y, cellW, cellH);
    text(sctx, `${t.toFixed(2)}s`, x + 4, y + cellH + 21, { size: 16, family: 'Mono', color: '#C7FF3E' });
  }
  const file = path.join(outDir, `${name}-sheet.jpg`);
  await writeFile(file, await sheet.encode('jpeg', 88));
  console.log(file);
  process.exit(0);
}

/* ---------- video ---------- */
const count = Math.ceil((to - from) * fps - 1e-8);
const dest = path.join(outDir, `${name}.mp4`);
if (existsSync(dest) && !has('force')) throw new Error(`Output exists: ${dest} (use --force or a new --name)`);
if (audio && !existsSync(path.resolve(root, audio))) throw new Error(`Audio not found: ${audio}`);

const args = ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${cw}x${ch}`, '-framerate', String(fps), '-i', 'pipe:0'];
if (audio) args.push('-ss', String(from), '-t', String(to - from), '-i', path.resolve(root, audio));
args.push('-map', '0:v:0');
if (audio) args.push('-map', '1:a:0', '-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-frames:v', String(count), '-t', String(count / fps), '-movflags', '+faststart', dest);

const enc = spawn(ffmpeg, args, { stdio: ['pipe', 'inherit', 'inherit'] });
const encDone = new Promise((resolve, reject) => {
  enc.once('error', reject);
  enc.once('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
});
encDone.catch(() => {});
enc.stdin.on('error', () => {});

let decodeErrors = 0;
for (let i = 0; i < count; i++) {
  drawAt(from + i / fps);
  const raw = canvas.data();
  if (!enc.stdin.write(raw)) await once(enc.stdin, 'drain');
  if (i % 60 === 0) process.stdout.write(`\r  frame ${i}/${count}`);
}
enc.stdin.end();
await encDone;
const kb = (await stat(dest)).size / 1024;
console.log(`\nRendered ${count} frames @ ${fps} fps · ${cw}×${ch}${audio ? ' with audio' : ' (silent)'} → ${dest} (${kb.toFixed(0)} KB)`);
