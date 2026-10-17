// CLI renderer: stills, contact sheet or video.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { W, H } from './data.js';
import { draw } from './film.js';

const args = process.argv.slice(2);
const get = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const has = (k) => args.includes(`--${k}`);

const scale = parseFloat(get('scale', '1'));
const outDir = get('out', 'renders/previews');
const name = get('name', 'wiggle');
const fps = parseFloat(get('fps', '30'));
const from = parseFloat(get('from', '0'));
const to = parseFloat(get('to', '75'));
const audio = get('audio', null);
const crf = get('crf', '17');
const preset = get('preset', 'medium');

fs.mkdirSync(outDir, { recursive: true });

const FONT_DIR = 'assets/fonts';
const FONTS = [
  ['Baloo2_700Bold.ttf', 'Baloo2'],
  ['Baloo2_800ExtraBold.ttf', 'Baloo2Extra'],
  ['Fredoka_600SemiBold.ttf', 'Fredoka'],
  ['Nunito_700Bold.ttf', 'Nunito'],
];
for (const [file, fam] of FONTS) {
  const p = path.join(FONT_DIR, file);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, fam);
}
// Baloo registers both weights under 'Baloo2'; 800 maps to the same family name,
// so we register the extra-bold as its own family and alias via font strings.

const cw = Math.round(W * scale);
const ch = Math.round(H * scale);
const canvas = createCanvas(cw, ch);
const ctx = canvas.getContext('2d');

function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.scale(scale, scale);
  draw(ctx, t, { W, H, scale });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const mode = has('stills') ? 'stills' : has('sheet') ? 'sheet' : 'video';

if (mode === 'stills') {
  const times = get('stills', '1,6,12').split(',').map(Number);
  for (const t of times) {
    renderFrame(t);
    const p = path.join(outDir, `still-${t.toFixed(2)}.png`);
    fs.writeFileSync(p, canvas.toBuffer('image/png'));
    console.log(p);
  }
} else if (mode === 'sheet') {
  const out = path.join(outDir, `${name}-frames`);
  fs.mkdirSync(out, { recursive: true });
  const step = 1 / parseFloat(get('sheetFps', '1'));
  let i = 0;
  for (let t = from; t < to; t += step, i++) {
    renderFrame(t);
    fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}.jpg`), canvas.toBuffer('image/jpeg', 88));
  }
  console.log(out);
} else {
  const total = Math.max(1, Math.round((to - from) * fps));
  const outFile = path.join(outDir, `${name}.mp4`);
  const ffArgs = ['-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${cw}x${ch}`, '-r', `${fps}`, '-i', '-'];
  if (audio) ffArgs.push('-i', audio);
  ffArgs.push(
    '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
  );
  if (audio) ffArgs.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  ffArgs.push(outFile);

  const ff = spawn(process.env.FFMPEG || 'ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const buf = Buffer.alloc(cw * ch * 4);
  let frame = 0;
  const t0 = Date.now();

  for (let i = 0; i < total; i++) {
    const t = from + i / fps;
    renderFrame(t);
    const data = ctx.getImageData(0, 0, cw, ch).data;
    // convert RGBA -> BGRA
    for (let p = 0; p < data.length; p += 4) {
      buf[p] = data[p + 2];
      buf[p + 1] = data[p + 1];
      buf[p + 2] = data[p];
      buf[p + 3] = data[p + 3];
    }
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    frame++;
    if (frame % 30 === 0) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r${frame}/${total}  ${(el / frame).toFixed(2)} s/frame  eta ${Math.round((total - frame) * el / frame)}s   `);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  console.log(`\n${outFile}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
