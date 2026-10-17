// CLI renderer — 480×270 pixel canvas, nearest-neighbour upscale on the way out.
// Modes: --stills | video (default)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PW, PH } from './data.js';
import { draw, attachOffscreen } from './film.js';

const args = process.argv.slice(2);
const get = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const has = (k) => args.includes(`--${k}`);

const up = parseInt(get('up', '4'), 10);          // upscale factor (4 → 1920×1080)
const outDir = get('out', 'renders/previews');
const name = get('name', 'abc-pixel-party');
const fps = parseFloat(get('fps', '30'));
const from = parseFloat(get('from', '0'));
const to = parseFloat(get('to', '96'));
const audio = get('audio', null);
const crf = get('crf', '17');
const preset = get('preset', 'medium');

fs.mkdirSync(outDir, { recursive: true });

// fonts (static TTFs only — @napi-rs/canvas rejects CFF/OTF)
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

const canvas = createCanvas(PW, PH);
const ctx = canvas.getContext('2d');
const off = createCanvas(PW, PH);
attachOffscreen(off);

const FFMPEG = process.env.FFMPEG || 'ffmpeg';

function upscalePng(file) {
  if (up === 1) return;
  const tmp = file.replace(/\.png$/, '.up.png');
  const r = spawnSync(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', file, '-vf', `scale=${PW * up}:${PH * up}:flags=neighbor`,
    '-frames:v', '1', tmp,
  ], { stdio: 'inherit' });
  if (r.status === 0) fs.renameSync(tmp, file);
  else console.error('upscale failed', file);
}

function renderFrame(t) {
  draw(ctx, t);
}

const mode = has('stills') ? 'stills' : 'video';

if (mode === 'stills') {
  const times = get('stills', '1,6,12').split(',').map(Number);
  for (const t of times) {
    renderFrame(t);
    const p = path.join(outDir, `still-${t.toFixed(2)}.png`);
    fs.writeFileSync(p, canvas.toBuffer('image/png'));
    upscalePng(p);
    console.log(p);
  }
} else {
  const total = Math.max(1, Math.round((to - from) * fps));
  const outFile = path.join(outDir, `${name}.mp4`);
  const ow = PW * up, oh = PH * up;
  const ffArgs = [
    '-y', '-hide_banner',
    '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${PW}x${PH}`, '-r', `${fps}`, '-i', '-',
  ];
  if (audio) ffArgs.push('-i', audio);
  ffArgs.push(
    '-vf', `scale=${ow}:${oh}:flags=neighbor`,
    '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
  );
  if (audio) {
    // gentle LP before AAC: saturated chip transients otherwise overshoot
    // the codec by up to +4 dB (measured), clipping at the DAC
    ffArgs.push('-af', get('af', 'lowpass=f=14000'));
    ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  }
  ffArgs.push(outFile);

  const ff = spawn(FFMPEG, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const buf = Buffer.alloc(PW * PH * 4);
  let frame = 0;
  const t0 = Date.now();

  for (let i = 0; i < total; i++) {
    const t = from + i / fps;
    renderFrame(t);
    const data = ctx.getImageData(0, 0, PW, PH).data;
    for (let p = 0; p < data.length; p += 4) {          // RGBA → BGRA
      buf[p] = data[p + 2];
      buf[p + 1] = data[p + 1];
      buf[p + 2] = data[p];
      buf[p + 3] = data[p + 3];
    }
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    frame++;
    if (frame % 60 === 0) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r${frame}/${total}  ${(el / frame).toFixed(2)} s/frame  eta ${Math.round((total - frame) * el / frame)}s   `);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  console.log(`\n${outFile}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
