#!/usr/bin/env node
// Deterministic renderer for Lumi & the Lost Star.
//   node src/render.mjs --stills 1,5,13.5 --out cache/stills --scale 0.5
//   node src/render.mjs --sheet --from 0 --to 12 --fps 6 --scale 0.22 --out cache/sheets --name meadow
//   node src/render.mjs --from 0 --to 72 --fps 24 --scale 1 --out renders/final --name "Lumi and the Lost Star v1" [--audio assets/mix.wav]
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, DURATION, scenes } from './data.js';
import { initFonts, grain, vignette, black, smooth, seg, text, clamp, caption } from './draw.js';
import { transitions, fades, captions } from './timing.js';

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

if (![from, to, fps, scale].every(Number.isFinite) || from < 0 || to > DURATION || to <= from || fps <= 0 || scale <= 0 || scale > 1) {
  throw new Error('Invalid --from/--to/--fps/--scale');
}
if (/[\\/:*?"<>|]/.test(name)) throw new Error('Use a plain --name');

initFonts(path.join(root, 'assets/fonts'));

const cw = Math.max(2, 2 * Math.round((W * scale) / 2));
const ch = Math.max(2, 2 * Math.round((H * scale) / 2));
const canvas = createCanvas(cw, ch);
const ctx = canvas.getContext('2d');

const modules = await Promise.all(scenes.map(s => import(`./scenes/${s.id}.js`)));
const dissAt = t0 => transitions.find(x => Math.abs(x.t - t0) < 0.001);

function alphaFor(i, t) {
  const s = scenes[i];
  let a = 1;
  const tin = dissAt(s.start), tout = dissAt(s.end);
  if (tin) a *= smooth(seg(t, s.start - tin.dur / 2, s.start + tin.dur / 2));
  if (tout) a *= 1 - smooth(seg(t, s.end - tout.dur / 2, s.end + tout.dur / 2));
  return a;
}

function drawAt(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#040617';
  ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(cw / W, 0, 0, ch / H, 0, 0);

  for (let i = 0; i < scenes.length; i++) {
    const a = alphaFor(i, t);
    if (a <= 0.001) continue;
    ctx.save();
    ctx.globalAlpha = a;
    modules[i].draw(ctx, t - scenes[i].start, t);
    ctx.restore();
  }

  // captions sit in screen space, never inside a scene's camera
  for (const c of captions) {
    if (t < c.start || t > c.end) continue;
    const a = smooth(seg(t, c.start, c.start + 0.55)) * (1 - smooth(seg(t, c.end - 0.5, c.end)));
    caption(ctx, c.text, a);
  }

  // film finish
  grain(ctx, t, 0.05);
  vignette(ctx, 0.4);

  const fin = fades.in;
  if (t < fin.from + fin.dur) black(ctx, 1 - smooth(seg(t, fin.from, fin.from + fin.dur)));
  const fo = fades.out;
  if (t > fo.at) black(ctx, smooth(seg(t, fo.at, fo.at + fo.dur)));
}

await mkdir(outDir, { recursive: true });

if (has('stills')) {
  const times = String(arg('stills', '')).split(',').map(Number);
  if (!times.length || times.some(n => !Number.isFinite(n))) throw new Error('--stills needs seconds');
  for (const t of times) {
    drawAt(t);
    const file = path.join(outDir, `still-${t.toFixed(2).padStart(6, '0')}s.jpg`);
    await writeFile(file, await canvas.encode('jpeg', 92));
    console.log(file);
  }
  process.exit(0);
}

if (has('sheet')) {
  const count = Math.ceil((to - from) * fps - 1e-8);
  const cols = 5;
  const cellW = 360;
  const cellH = Math.round((cellW * H) / W);
  const pad = 10, labelH = 30;
  const rows = Math.ceil(count / cols);
  const sheet = createCanvas(cols * (cellW + pad) + pad, rows * (cellH + labelH + pad) + pad + 44);
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#12141c';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  text(sctx, `${name} · ${from}s–${to}s · ${fps}fps`, pad + 4, 28, { size: 18, family: 'Nunito', color: '#FFF6E5' });
  const img = createCanvas(cw, ch);
  const ictx = img.getContext('2d');
  for (let i = 0; i < count; i++) {
    const t = from + i / fps;
    drawAt(t);
    ictx.drawImage(canvas, 0, 0);
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * (cellW + pad);
    const y = 44 + row * (cellH + labelH + pad);
    sctx.drawImage(img, x, y, cellW, cellH);
    text(sctx, `${t.toFixed(2)}s`, x + 4, y + cellH + 21, { size: 15, family: 'Nunito', color: '#C9F76F' });
  }
  const file = path.join(outDir, `${name}-sheet.jpg`);
  await writeFile(file, await sheet.encode('jpeg', 88));
  console.log(file);
  process.exit(0);
}

/* ---------- video ---------- */
const count = Math.ceil((to - from) * fps - 1e-8);
const dest = path.join(outDir, `${name}.mp4`);
if (existsSync(dest) && !has('force')) throw new Error(`Output exists: ${dest}`);
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

const t0 = Date.now();
for (let i = 0; i < count; i++) {
  drawAt(from + i / fps);
  if (!enc.stdin.write(canvas.data())) await once(enc.stdin, 'drain');
  if (i % 48 === 0) process.stdout.write(`\r  frame ${i}/${count}`);
}
enc.stdin.end();
await encDone;
const kb = (await stat(dest)).size / 1024;
console.log(`\nRendered ${count} frames @ ${fps} fps · ${cw}×${ch}${audio ? ' + audio' : ' (silent)'} in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${dest} (${kb.toFixed(0)} KB)`);
