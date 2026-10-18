// render.mjs — deterministic frame renderer → H.264 MP4 (or --stills PNGs).
// node src/render.mjs --from 0 --to 109 --fps 30 --crf 22 --preset slow \
//   --width 1080 --audio assets/mix.wav --out renders/previews --name "Cube Infinite Space"
// node src/render.mjs --stills 0.5,14,26,45,66,84,96,107.9 --width 540
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFilm } from './film.js';
import { beats } from './beats.js';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FFMPEG = path.join(process.env.HOME || '/root', '.local/bin/ffmpeg');

// ── args
const A = process.argv.slice(2);
const arg = (k, d) => {
  const i = A.indexOf('--' + k);
  return i >= 0 ? A[i + 1] : d;
};
const has = (k) => A.includes('--' + k);

const STILL_S = arg('stills', null);
const FROM = parseFloat(arg('from', '0'));
const TO = parseFloat(arg('to', String(beats.meta.dur)));
const FPS = parseInt(arg('fps', '30'), 10);
const W = parseInt(arg('width', '1080'), 10);
const Hh = Math.round((W * 16 / 9) / 2) * 2;
const CRF = arg('crf', '22');
const PRESET = arg('preset', 'slow');
const AUDIO = arg('audio', null);
const OUTDIR = path.resolve(ROOT, arg('out', 'renders/previews'));
const NAME = arg('name', 'Cube Infinite Space');
const SEGS = arg('segments', '1');

// ── fonts
const FONT_DIR = path.resolve(ROOT, 'assets/fonts');
for (const f of ['ChakraPetch-SemiBold.ttf', 'ChakraPetch-Bold.ttf', 'ShareTechMono-Regular.ttf']) {
  const p = path.join(FONT_DIR, f);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, f.replace('.ttf', ''));
}
fs.mkdirSync(OUTDIR, { recursive: true });

const canvas = createCanvas(W, Hh);
const film = createFilm(canvas);

function frameBuf(t) {
  film.draw(t);
  const data = new Uint8Array(canvas.data());
  return Buffer.from(data);
}

// ── stills mode (smoke QA)
if (STILL_S) {
  const qaDir = path.resolve(ROOT, 'renders/qa');
  fs.mkdirSync(qaDir, { recursive: true });
  const times = STILL_S.split(',').map(Number);
  for (const t of times) {
    const buf = frameBuf(t);
    const out = path.join(qaDir, `still_${String(t).replace('.', 'p')}.png`);
    // encode raw → png via ffmpeg
    await new Promise((res, rej) => {
      const p = spawn(FFMPEG, ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${Hh}`,
        '-i', 'pipe:0', '-frames:v', '1', out], { stdio: ['pipe', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.on('close', (c) => (c === 0 ? res() : rej(new Error(err))));
      p.stdin.write(buf);
      p.stdin.end();
    });
    console.log('still', t, '→', path.relative(ROOT, out));
  }
  process.exit(0);
}

// ── video mode
const nFrames = Math.round((TO - FROM) * FPS);
console.log(`render ${W}x${Hh} ${FPS}fps frames=${nFrames} crf=${CRF} preset=${PRESET} segs=${SEGS}`);

async function renderRange(f0, f1, outFile) {
  const n = f1 - f0;
  const ffArgs = [
    '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${Hh}`, '-r', String(FPS), '-i', 'pipe:0',
  ];
  if (AUDIO) {
    ffArgs.push('-ss', String(f0 / FPS), '-i', path.resolve(ROOT, AUDIO),
      '-map', '0:v', '-map', '1:a',
      '-af', 'aresample=48000',
      '-c:a', 'aac', '-b:a', '320k', '-shortest');
  } else ffArgs.push('-an');
  ffArgs.push('-c:v', 'libx264', '-preset', PRESET, '-crf', String(CRF),
    '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', outFile);
  const p = spawn(FFMPEG, ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  const t0 = Date.now();
  await new Promise((res, rej) => {
    let i = 0;
    let writing = false;
    const writeNext = () => {
      while (i < n) {
        const t = (f0 + i) / FPS;
        const buf = frameBuf(t);
        i++;
        if (i % 90 === 0 || i === n) {
          const el = (Date.now() - t0) / 1000;
          console.log(`  frame ${i}/${n}  t=${t.toFixed(2)}s  ${(i / Math.max(0.001, el)).toFixed(1)} fps`);
        }
        if (!p.stdin.write(buf)) {
          p.stdin.once('drain', writeNext);
          return;
        }
      }
      p.stdin.end();
      writing = true;
      res();
    };
    writeNext();
    p.on('close', (c) => { if (c !== 0) rej(new Error('ffmpeg: ' + err.slice(-800))); });
  });
  await new Promise((r) => p.on('close', r));
  console.log('  done', path.relative(ROOT, outFile));
}

const segN = Math.max(1, parseInt(SEGS, 10));
if (segN <= 1) {
  const outFile = path.join(OUTDIR, `${NAME}.mp4`);
  await renderRange(0, nFrames, outFile);
} else {
  const tmpDir = path.join(OUTDIR, '_seg');
  fs.mkdirSync(tmpDir, { recursive: true });
  const per = Math.ceil(nFrames / segN);
  const files = [];
  for (let s = 0; s < segN; s++) {
    const f0 = s * per, f1 = Math.min(nFrames, (s + 1) * per);
    if (f0 >= f1) break;
    const f = path.join(tmpDir, `seg${s}.mp4`);
    await renderRange(f0, f1, f);
    files.push(f);
  }
  const lst = path.join(tmpDir, 'list.txt');
  fs.writeFileSync(lst, files.map((f) => `file '${f}'`).join('\n'));
  const outFile = path.join(OUTDIR, `${Name0(NAME)}.mp4`);
  await new Promise((res, rej) => {
    const p = spawn(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', outFile],
      { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(err))));
  });
  console.log('concat →', path.relative(ROOT, outFile));
}
function Name0(s) { return s; }
