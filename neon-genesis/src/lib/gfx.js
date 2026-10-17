// Small canvas helpers shared by every chapter: easing, glow sprites, fog,
// bloom + anamorphic streaks, grain and vignette.
import { createCanvas } from '@napi-rs/canvas';

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
export const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
export const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outCubic = t => 1 - Math.pow(1 - t, 3);
export const outQuint = t => 1 - Math.pow(1 - t, 5);
export const inCubic = t => t * t * t;
export const outExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const inExpo = t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const outBack = (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const sine = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexRgb(hex) {
  const v = hex.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map(c => c + c).join('') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex, a = 1) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function mixHex(a, b, t, alpha = 1) {
  const A = hexRgb(a), B = hexRgb(b);
  const r = Math.round(lerp(A[0], B[0], t));
  const g = Math.round(lerp(A[1], B[1], t));
  const bl = Math.round(lerp(A[2], B[2], t));
  return alpha >= 1 ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alpha})`;
}

/* ---------------------------------------------------------- glow sprites */
const glowCache = new Map();
export function glowSprite(color, softness = 0.45) {
  const key = `${color}|${softness}`;
  if (glowCache.has(key)) return glowCache.get(key);
  const S = 128;
  const c = createCanvas(S, S);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, rgba(color, 1));
  grad.addColorStop(softness * 0.35, rgba(color, 0.55));
  grad.addColorStop(softness, rgba(color, 0.16));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  glowCache.set(key, c);
  return c;
}

/** Additive soft light. r = visible core radius. */
export function glow(ctx, x, y, r, color = '#7DF9FF', alpha = 1) {
  if (r <= 0.2 || alpha <= 0.002) return;
  const s = glowSprite(color);
  const a0 = ctx.globalAlpha;
  const op = ctx.globalCompositeOperation;
  ctx.globalAlpha = a0 * Math.min(1, alpha);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(s, x - r * 2, y - r * 2, r * 4, r * 4);
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = a0;
}

/* -------------------------------------------------------------- post FX */
const bufs = new Map();
function buf(w, h, key) {
  const k = `${key}:${w}x${h}`;
  let c = bufs.get(k);
  if (!c) { c = createCanvas(w, h); bufs.set(k, c); }
  return c;
}

/** Bloom: additive accumulation at half res, then a multi-tap blur. */
export function bloom(ctx, Wd, Hd, { strength = 0.7, threshold = 0.55, radius = 14, tint = null } = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const bw = Math.max(8, Math.round(W / 2));
  const bh = Math.max(8, Math.round(H / 2));
  const mid = buf(bw, bh, 'blm');
  const core = buf(Math.max(4, bw >> 1), Math.max(4, bh >> 1), 'blc');
  const m = mid.getContext('2d');
  const c = core.getContext('2d');
  for (const x of [m, c]) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    x.clearRect(0, 0, x.canvas.width, x.canvas.height);
  }

  // accumulate the frame additively so thin emissive lines survive
  m.globalCompositeOperation = 'lighter';
  m.globalAlpha = 0.85;
  m.drawImage(ctx.canvas, 0, 0, bw, bh);
  m.globalAlpha = 1;
  m.globalCompositeOperation = 'source-over';

  // core: quarter res, additively squeezed
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = 0.9;
  c.drawImage(mid, 0, 0, c.canvas.width, c.canvas.height);
  c.globalAlpha = 0.6;
  c.drawImage(mid, 0, 0, c.canvas.width, c.canvas.height);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';

  const taps = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]];
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  const off = radius * 1.6;
  ctx.globalAlpha = clamp(strength) * 0.16;
  ctx.globalAlpha = clamp(strength) * 0.075;
  for (const [dx, dy] of taps) ctx.drawImage(mid, dx * off, dy * off, W, H);
  ctx.globalAlpha = clamp(strength) * 0.34;
  ctx.drawImage(core, 0, 0, W, H);
  ctx.restore();
}

/** Anamorphic horizontal streaks from the brightest pixels. */
export function anamorphic(ctx, Wd, Hd, { strength = 0.5, color = '#5FE8FF', threshold = 0.72 } = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const sw = Math.max(8, Math.round(W / 6));
  const sh = Math.max(4, Math.round(H / 24));
  const a = buf(sw, sh, 'ana').getContext('2d');
  const s = buf(Math.max(4, sw >> 2), sh, 'anas').getContext('2d');
  for (const c of [a, s]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, c.canvas.width, c.canvas.height); }

  a.drawImage(ctx.canvas, 0, 0, sw, sh);
  // bright pass by squaring
  a.globalCompositeOperation = 'multiply';
  a.drawImage(a.canvas, 0, 0, sw, sh);
  a.globalCompositeOperation = 'source-over';
  // tint
  a.globalCompositeOperation = 'multiply';
  a.fillStyle = color;
  a.fillRect(0, 0, sw, sh);
  a.globalCompositeOperation = 'source-over';
  // horizontal smear
  s.drawImage(a.canvas, 0, 0, s.canvas.width, sh);
  a.clearRect(0, 0, sw, sh);
  a.globalAlpha = 0.85;
  a.drawImage(s.canvas, 0, 0, sw, sh);
  a.globalAlpha = 0.55;
  a.drawImage(s.canvas, -sw * 0.5, 0, sw, sh);
  a.globalAlpha = 0.55;
  a.drawImage(s.canvas, sw * 0.5, 0, sw, sh);
  a.globalAlpha = 1;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = strength;
  ctx.drawImage(a.canvas, 0, 0, W, H);
  ctx.restore();
}

let grainTile = null;
export function grain(ctx, Wd, Hd, t, alpha = 0.05) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (!grainTile) {
    const S = 200;
    grainTile = createCanvas(S, S);
    const g = grainTile.getContext('2d');
    const img = g.createImageData(S, S);
    const rnd = mulberry32(1337);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 100 + rnd() * 155;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  const rnd = mulberry32(Math.floor(t * 60) + 7);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const ox = Math.floor(rnd() * 200), oy = Math.floor(rnd() * 200);
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, W + 200, H + 200);
  ctx.restore();
}

export function vignette(ctx, Wd, Hd, s = 0.55) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.28, W / 2, H * 0.5, H * 0.98);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${s})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function black(ctx, Wd, Hd, a) {
  if (a <= 0) return;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Horizontal scanline overlay for holo/UI surfaces. */
export function scanlines(ctx, x, y, w, h, alpha = 0.12, gap = 4) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#000';
  for (let i = 0; i < h; i += gap) ctx.fillRect(x, y + i, w, 1);
  ctx.restore();
}
