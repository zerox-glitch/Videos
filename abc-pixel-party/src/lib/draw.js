// Drawing helpers: easing, deterministic noise, pixel sprite/glyph caches, pills.
import { createCanvas } from '@napi-rs/canvas';
import { SPRITES, PALETTE } from '../sprites.js';
import { GLYPHS, GW, GH } from '../pixelfont.js';

// ---------------------------------------------------------------- math
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (t) => t * t * (3 - 2 * t);

// t in [0,1] progress helpers
export const outCubic = (u) => 1 - Math.pow(1 - u, 3);
export const inOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const outBack = (u, s = 2.2) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
export const inQuad = (u) => u * u;

// normalised local time
export const ph = (t, t0, dur) => clamp((t - t0) / dur, 0, 1);
// pop-in scale 0→1 with overshoot
export const pop = (t, t0, dur = 0.32) => (t < t0 ? 0 : outBack(ph(t, t0, dur)));
// fade in/out envelope
export function env(t, t0, t1, atk = 0.12, rel = 0.18) {
  if (t < t0 || t > t1) return 0;
  if (t < t0 + atk) return (t - t0) / atk;
  if (t > t1 - rel) return clamp((t1 - t) / rel, 0, 1);
  return 1;
}

// seeded rng (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
// stable per-cell hash 0..1
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- primitives
export function rrect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// crisp pixel rounded box: rows grouped into runs of equal inset so that the
// fractional camera scale never leaves AA seams inside same-colour areas.
export function pxBox(ctx, x, y, w, h, r, fill) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const rr = Math.max(0, Math.min(Math.floor(r), Math.floor(w / 2), Math.floor(h / 2)));
  ctx.fillStyle = fill;
  if (rr === 0) { ctx.fillRect(x, y, w, h); return; }
  const inset = (dy) => Math.round(rr - Math.sqrt(Math.max(0, rr * rr - (rr - dy) * (rr - dy))));
  const rowInset = (yy) => (yy < rr ? inset(yy) : yy >= h - rr ? inset(h - 1 - yy) : 0);
  let runStart = 0, runInset = rowInset(0);
  for (let yy = 1; yy <= h; yy++) {
    const ins = yy < h ? rowInset(yy) : -1;
    if (ins !== runInset) {
      ctx.fillRect(x + runInset, y + runStart, w - 2 * runInset, yy - runStart);
      runStart = yy; runInset = ins;
    }
  }
}

// full pixel circle (odd diameter)
export function pxCircle(ctx, cx, cy, r0, fill) {
  ctx.fillStyle = fill;
  const R = Math.max(1, Math.round(r0));
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, R * R - dy * dy)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

// pill with a solid 1px ink outline (two stacked pixel boxes)
export function pill(ctx, x, y, w, h, { fill = '#FFFFFF', stroke = '#26243B' } = {}) {
  if (stroke) pxBox(ctx, x - 1, y - 1, w + 2, h + 2, h / 2 + 1, stroke);
  pxBox(ctx, x, y, w, h, h / 2, fill);
}

// text with integer position; optional chunky shadow instead of stroke
export function text(ctx, str, x, y, {
  font = '700 14px Baloo2', fill = '#26243B', align = 'center', baseline = 'middle',
  shadow = null, shadowOff = 1,
} = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const px = Math.round(x), py = Math.round(y);
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(str, px + shadowOff, py + shadowOff);
  }
  ctx.fillStyle = fill;
  ctx.fillText(str, px, py);
}

export function measure(ctx, str, font) {
  ctx.font = font;
  return ctx.measureText(str).width;
}

// ---------------------------------------------------------------- sprites
const spriteCache = new Map();
export function spriteCanvas(name, s) {
  const key = `${name}@${s}`;
  let c = spriteCache.get(key);
  if (c) return c;
  const grid = SPRITES[name];
  if (!grid) throw new Error('no sprite ' + name);
  const w = grid[0].length, h = grid.length;
  c = createCanvas(w * s, h * s);
  const cx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = PALETTE[grid[y][x]];
      if (!col) continue;
      cx.fillStyle = col;
      cx.fillRect(x * s, y * s, s, s);
    }
  }
  spriteCache.set(key, c);
  return c;
}
export function drawSprite(ctx, name, x, y, s, alpha = 1) {
  const c = spriteCanvas(name, s);
  ctx.globalAlpha = alpha;
  ctx.drawImage(c, Math.round(x), Math.round(y));
  ctx.globalAlpha = 1;
  return { w: c.width, h: c.height };
}

// pixel glyph with 1px blocky drop shadow (fill + shadow colours)
const glyphCache = new Map();
export function glyphCanvas(ch, s, fill, shadow) {
  const key = `${ch}@${s}@${fill}@${shadow || ''}`;
  let c = glyphCache.get(key);
  if (c) return c;
  const rows = GLYPHS[ch];
  if (!rows) return null;
  c = createCanvas((GW + 1) * s, (GH + 1) * s); // +1 row/col for shadow
  const cx = c.getContext('2d');
  const put = (ox, oy, col) => {
    cx.fillStyle = col;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        if (rows[y][x] === '#') cx.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }
  };
  if (shadow) put(s, s, shadow);
  put(0, 0, fill);
  glyphCache.set(key, c);
  return c;
}
// centred glyph draw — returns drawn size
export function drawGlyph(ctx, ch, cx, cy, s, fill = '#FFFFFF', shadow = '#26243B') {
  const c = glyphCanvas(ch, s, fill, shadow);
  if (!c) return { w: 0, h: 0 };
  ctx.drawImage(c, Math.round(cx - c.width / 2), Math.round(cy - c.height / 2));
  return { w: c.width, h: c.height };
}
export const glyphSize = (s) => ({ w: (GW + 1) * s, h: (GH + 1) * s });

// ---------------------------------------------------------------- misc
export function sparkle(ctx, x, y, s, alpha) {
  // four-point pixel star centred at (x, y)
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(Math.round(x - s), Math.round(y - 1), s * 2 + 1, 3);
  ctx.fillRect(Math.round(x - 1), Math.round(y - s), 3, s * 2 + 1);
  ctx.globalAlpha = 1;
}

export function confettiPiece(ctx, x, y, s, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), s, s);
  ctx.globalAlpha = 1;
}
