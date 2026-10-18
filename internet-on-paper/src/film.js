// film.js — timeline, camera, glitch compositor, post for THE INTERNET ON PAPER.
import { createCanvas } from '@napi-rs/canvas';
import { beats, sectionAt, prog } from './beats.js';
import { clamp01, ease, easeOut, hash01, boil, noiseBars, rng } from './lib/ink.js';
import { SCENES } from './scenes.js';

const W = 1920, H = 1080;
export { beats };

// ---------- offscreens -----------------------------------------------------
const fx = createCanvas(W, H);
const fctx = fx.getContext('2d');
const chA = createCanvas(W, H);              // sliced buffer for glitch
const cA = chA.getContext('2d');
const chB = createCanvas(W, H);              // channel-tint scratch
const cB = chB.getContext('2d');

// scanline pattern (screen-space, cheap)
const scan = createCanvas(2, 4);
{
  const s = scan.getContext('2d');
  s.fillStyle = 'rgba(0,0,0,0.30)';
  s.fillRect(0, 2, 2, 1);
}
const scanPat = fctx.createPattern(scan, 'repeat');

// grain tiles (deterministic, cycled at boil rate)
const grains = [];
for (let k = 0; k < 4; k++) {
  const g = createCanvas(360, 360);
  const gc = g.getContext('2d');
  const img = gc.createImageData(360, 360);
  const r = rng(500 + k);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 26;
  }
  gc.putImageData(img, 0, 0);
  grains.push(g);
}
const grainPat = grains.map((g) => fctx.createPattern(g, 'repeat'));

// ---------- camera ---------------------------------------------------------
const CAM = {
  intro:      [[960, 540, 1.00], [960, 528, 1.035]],
  packets:    [[700, 545, 1.02], [1150, 560, 1.03]],
  dns:        [[960, 520, 1.00], [960, 545, 1.04]],
  speed:      [[760, 505, 1.02], [1140, 545, 1.04]],
  datacenter: [[600, 600, 1.05], [1330, 560, 1.03]],
  crypto:     [[960, 540, 1.00], [880, 565, 1.05]],
  threat:     [[960, 530, 1.00], [1015, 550, 1.045]],
  outro:      [[960, 565, 1.05], [960, 535, 1.00]],
};
// event-tied snap zooms (impact bumps — never shake)
const BUMPS = [[5.4, 0.05], [23.6, 0.045], [34.0, 0.05], [73.0, 0.03],
  [96.6, 0.06], [103.3, 0.03], [122.8, 0.07]];

function camAt(T, sec) {
  const keys = CAM[sec.id] || CAM.intro;
  const u = ease(clamp01((T - sec.t0) / (sec.t1 - sec.t0)));
  let cx = keys[0][0] + (keys[1][0] - keys[0][0]) * u;
  let cy = keys[0][1] + (keys[1][1] - keys[0][1]) * u;
  let z = keys[0][2] + (keys[1][2] - keys[0][2]) * u;
  for (const [t, dz] of BUMPS) {
    if (T >= t) z += dz * (1 - easeOut(clamp01((T - t) / 0.32)));
  }
  return [cx, cy, z];
}

// ---------- glitch amount --------------------------------------------------
function gAt(T) {
  let g = 0;
  for (const c of beats.glitch_cuts) {
    const e = T - c;
    if (e >= 0 && e < 0.18) {
      g = Math.max(g, e < 0.04 ? e / 0.04 : 1 - (e - 0.04) / 0.14);
    }
  }
  for (const x of beats.glitch_extra) {
    const e = T - x.t;
    if (e >= 0 && e < x.dur) {
      const r = x.dur * 0.3;
      g = Math.max(g, e < r ? e / r : 1 - (e - r) / (x.dur - r));
    }
  }
  return clamp01(g);
}

// ---------- composite ------------------------------------------------------
function drawGlitch(T, g) {
  // 1) sliced copy of fx
  cA.setTransform(1, 0, 0, 1, 0, 0);
  cA.globalAlpha = 1;
  cA.globalCompositeOperation = 'source-over';
  cA.drawImage(fx, 0, 0);
  const fr = Math.floor(T * 30);
  const r = rng(fr * 7 + 3);
  const bands = 3 + Math.floor(g * 6);
  for (let i = 0; i < bands; i++) {
    const by = Math.floor(r() * (H - 40));
    const bh = 24 + Math.floor(r() * (110 + 120 * g));
    const dx = Math.round((r() - 0.5) * 2 * (30 + 160 * g));
    cA.fillStyle = '#000';
    cA.fillRect(0, by, W, bh);
    cA.drawImage(fx, 0, by, W, bh, dx, by, W, bh);
  }
  // 2) true RGB channel split: red @ +o, cyan @ -o, additive
  const o = Math.round(4 + 18 * g);
  cB.globalCompositeOperation = 'source-over';
  cB.globalAlpha = 1;
  cB.clearRect(0, 0, W, H);
  cB.drawImage(chA, 0, 0);
  cB.globalCompositeOperation = 'multiply';
  cB.fillStyle = '#FF0000';
  cB.fillRect(0, 0, W, H);
  ctxBridge.globalCompositeOperation = 'source-over';
  ctxBridge.globalAlpha = 1;
  ctxBridge.fillStyle = '#000';
  ctxBridge.fillRect(0, 0, W, H);
  ctxBridge.globalCompositeOperation = 'lighter';
  ctxBridge.drawImage(chB, o, 0);

  cB.globalCompositeOperation = 'source-over';
  cB.clearRect(0, 0, W, H);
  cB.drawImage(chA, 0, 0);
  cB.globalCompositeOperation = 'multiply';
  cB.fillStyle = '#00FFFF';
  cB.fillRect(0, 0, W, H);
  ctxBridge.globalCompositeOperation = 'lighter';
  ctxBridge.drawImage(chB, -o, 0);
  ctxBridge.globalCompositeOperation = 'source-over';

  // 3) static bars
  noiseBars(ctxBridge, 0, 0, W, H, Math.round(6 + 14 * g), 77, T);
}
let ctxBridge = null; // set per-frame in drawFilm

// ---------- main -----------------------------------------------------------
export function drawFilm(ctx, T) {
  ctxBridge = ctx;
  const sec = sectionAt(T);
  const scene = SCENES[sec.id];

  // scene → fx with camera
  fctx.setTransform(1, 0, 0, 1, 0, 0);
  fctx.globalAlpha = 1;
  fctx.globalCompositeOperation = 'source-over';
  fctx.clearRect(0, 0, W, H);
  const [cx, cy, z] = camAt(T, sec);
  fctx.save();
  fctx.translate(960, 540);
  fctx.scale(z, z);
  fctx.translate(-cx, -cy);
  scene(fctx, sec, T);
  fctx.restore();

  // section scan-in wipe (except intro: fades instead)
  const sLocal = T - sec.t0;
  if (sec.id !== 'intro' && sLocal < 0.42) {
    const u = ease(sLocal / 0.42);
    const edge = H * u;
    fctx.fillStyle = '#000';
    fctx.fillRect(0, edge, W, H - edge);
    if (u > 0 && u < 1) {
      fctx.fillStyle = 'rgba(43,232,232,0.6)';
      fctx.fillRect(0, edge - 3, W, 5);
      noiseBars(fctx, 0, edge - 30, W, 60, 8, 90 + Math.floor(sec.t0), T);
    }
  }

  // composite (glitch or clean; CRT power-down at the tail)
  const g = gAt(T);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (T >= 126.6) {
    const sy = 1 - ease((T - 126.6) / 0.45);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (sy > 0.008) {
      ctx.save();
      ctx.translate(960, 540);
      ctx.scale(1, Math.max(0.004, sy));
      ctx.translate(-960, -540);
      ctx.drawImage(fx, 0, 0);
      ctx.restore();
      ctx.globalAlpha = (1 - sy) * 0.35;
      ctx.fillStyle = '#BFFFff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    } else if (T < 127.55) {
      const dr = Math.max(0, 7 * (1 - (T - 127.05) / 0.5));
      if (dr > 0) {
        ctx.fillStyle = '#2BE8E8';
        ctx.beginPath(); ctx.arc(960, 540, dr, 0, 7); ctx.fill();
      }
    }
  } else if (g > 0.012) {
    drawGlitch(T, g);
  } else {
    ctx.drawImage(fx, 0, 0);
  }

  // screen overlays
  ctx.globalAlpha = 1;
  if (scanPat) {
    ctx.fillStyle = scanPat;
    ctx.fillRect(0, 0, W, H);
  }
  const gp = grainPat[boil(T) % 4];
  if (gp) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = gp;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  // vignette (threat heavier)
  const vg = ctx.createRadialGradient(960, 540, 380, 960, 540, 1040);
  const vs = sec.id === 'threat' ? 0.46 : sec.id === 'outro' ? 0.26 : 0.34;
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${vs})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // 1-frame impact flashes
  for (const f of beats.flashes) {
    if (T >= f && T < f + 0.034) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
  for (const c of beats.glitch_cuts) {
    if (T >= c && T < c + 0.034) {
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#D8FFFF';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // fades
  const [fi0, fi1] = beats.fade.in, [fo0, fo1] = beats.fade.out;
  if (T < fi1) {
    ctx.globalAlpha = 1 - (T - fi0) / (fi1 - fi0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }
  if (T > fo0) {
    ctx.globalAlpha = clamp01((T - fo0) / (fo1 - fo0));
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalAlpha = 1;
}
