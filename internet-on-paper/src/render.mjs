#!/usr/bin/env node
// render.mjs — deterministic renderer for THE INTERNET ON PAPER.
//   node src/render.mjs --stills 3,10,20 --out cache/smoke1
//   node src/render.mjs --from 0 --to 128 --fps 30 --crf 18 --preset slow \
//     --out renders/final --name "Internet On Paper" --audio assets/mix.wav

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { drawFilm, beats } from './film.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const args = process.argv.slice(2);
const get = (k, d) => {
  const i = args.indexOf('--' + k);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const has = (k) => args.includes('--' + k);

const FONT_DIR = join(root, 'assets', 'fonts');
for (const f of ['ChakraPetch-Bold.ttf', 'ChakraPetch-SemiBold.ttf', 'ChakraPetch-Regular.ttf',
  'Michroma-Regular.ttf', 'ShareTechMono-Regular.ttf', 'JetBrainsMono[wght].ttf']) {
  GlobalFonts.registerFromPath(join(FONT_DIR, f), f.replace(/\.ttf$/, ''));
}

const W = 1920, H = 1080;
const FPS = Number(get('fps', 30));
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const ffmpegBin = process.env.MVD_FFMPEG || join(process.env.HOME, '.local', 'bin', 'ffmpeg');

function drawAt(t) {
  drawFilm(ctx, t);
  return Buffer.from(new Uint8Array(canvas.data())); // copy: napi may reuse the buffer
}
const ensure = (p) => mkdirSync(dirname(p), { recursive: true });

// ---- stills --------------------------------------------------------------
if (has('stills')) {
  const outDir = get('out', join(root, 'cache', 'stills'));
  ensure(join(outDir, 'x'));
  const list = get('stills', '').split(',').map(Number).filter((n) => !Number.isNaN(n));
  for (const t of list) {
    drawAt(t);
    const f = join(outDir, `still-${t.toFixed(2).replace('.', '_')}.png`);
    writeFileSync(f, canvas.toBuffer('image/png'));
    console.log(f);
  }
  process.exit(0);
}

// ---- video ---------------------------------------------------------------
const from = Number(get('from', 0));
const to = Number(get('to', beats.meta.dur));
const outDir = get('out', join(root, 'renders', 'previews'));
const name = get('name', 'Internet On Paper');
const audio = get('audio', '');
const width = Number(get('width', 0));
const crf = get('crf', '18');
const preset = get('preset', 'slow');
ensure(join(outDir, 'x'));
const outFile = join(outDir, `${name}.mp4`);

const ff = spawn(ffmpegBin, [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  ...(audio ? ['-i', resolve(audio)] : []),
  ...(width && width !== W ? ['-vf', `scale=${width}:-2:flags=bicubic`] : []),
  ...(audio ? ['-map', '0:v:0', '-map', '1:a:0', '-af', 'lowpass=f=14000',
    '-c:a', 'aac', '-b:a', '320k', '-shortest'] : []),
  '-c:v', 'libx264', '-crf', crf, '-preset', preset, '-pix_fmt', 'yuv420p',
  outFile,
], { stdio: ['pipe', 'inherit', 'inherit'] });

let sent = 0;
const total = Math.round((to - from) * FPS);
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = from + i / FPS;
  if (!ff.stdin.write(drawAt(t))) await new Promise((r) => ff.stdin.once('drain', r));
  sent++;
  if (i % 300 === 0) process.write;
  if (i % 300 === 0) process.stdout.write(`\r${i}/${total} frames`);
}
ff.stdin.end();
await new Promise((res) => ff.on('exit', res));
console.log(`\n${outFile}  ${(Date.now() - t0) / 1000} s  (${sent} frames)`);
