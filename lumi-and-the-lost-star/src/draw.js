// Shared primitives for the film: fonts, easing, colour, glow sprites, captions, film finish.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { W, H, C, F, FPS } from './data.js';

const FONT_FILES = [
  ['Baloo2-800.ttf', F.displayBold],
  ['Baloo2-600.ttf', F.display],
  ['Nunito-600.ttf', F.text],
  ['Nunito-700.ttf', F.textBold],
  ['Fredoka-600.ttf', F.round],
];
const FAMILY = {
  [F.display]: 'Baloo', [F.displayBold]: 'Baloo Bold',
  [F.text]: 'Nunito', [F.textBold]: 'Nunito Bold',
  [F.round]: 'Fredoka',
};

export function initFonts(dir) {
  for (const [file, alias] of FONT_FILES) {
    if (!GlobalFonts.registerFromPath(`${dir}/${file}`, alias)) throw new Error(`font ${file}`);
  }
}

/* ---------------- math ---------------- */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
export const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outCubic = t => 1 - Math.pow(1 - t, 3);
export const outQuint = t => 1 - Math.pow(1 - t, 5);
export const inCubic = t => t * t * t;
export const outExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const outBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const sine = (t, f = 1, phase = 0) => Math.sin((t * f + phase) * Math.PI * 2);

/** Smooth window that rises at a then falls at b, with soft edges. */
export function window01(t, a, b, edge = 0.35) {
  return smooth(seg(t, a, a + edge)) * (1 - smooth(seg(t, b - edge, b)));
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- colour ---------------- */
export function hexRgb(hex) {
  const v = hex.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map(c => c + c).join('') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex, a = 1) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function mix(hexA, hexB, t, alpha = 1) {
  const A = hexRgb(hexA), B = hexRgb(hexB);
  const r = Math.round(lerp(A[0], B[0], t));
  const g = Math.round(lerp(A[1], B[1], t));
  const b = Math.round(lerp(A[2], B[2], t));
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/* ---------------- type ---------------- */
export function setFont(ctx, size, family = F.text) {
  ctx.font = `${Math.round(size)}px "${FAMILY[family] || family}"`;
}
export function text(ctx, str, x, y, {
  size = 40, family = F.text, color = C.cream, align = 'left', alpha = 1,
  track = 0, baseline = 'alphabetic', shadow = 0, shadowColor = 'rgba(0,0,0,0.45)',
} = {}) {
  setFont(ctx, size, family);
  if (track) ctx.letterSpacing = `${track}px`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  if (shadow) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadow;
    ctx.shadowOffsetY = shadow * 0.3;
  }
  const dx = align === 'center' ? track / 2 : align === 'right' ? track : 0;
  ctx.fillText(str, x + dx, y);
  if (shadow) { ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
  ctx.globalAlpha = a0;
  if (track) ctx.letterSpacing = '0px';
}
export function measure(ctx, str, size, family = F.text, track = 0) {
  setFont(ctx, size, family);
  if (track) ctx.letterSpacing = `${track}px`;
  const w = ctx.measureText(str).width;
  ctx.letterSpacing = '0px';
  return w;
}

/* ---------------- glow sprites ---------------- */
const glowCache = new Map();
function glowSprite(color) {
  if (glowCache.has(color)) return glowCache.get(color);
  const S = 256;
  const c = createCanvas(S, S);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, rgba(color, 1));
  grad.addColorStop(0.18, rgba(color, 0.75));
  grad.addColorStop(0.45, rgba(color, 0.26));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  glowCache.set(color, c);
  return c;
}

/** Soft additive light. r is the radius of the visible core. */
export function glow(ctx, x, y, r, color = C.starLight, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  const sprite = glowSprite(color);
  const a0 = ctx.globalAlpha;
  const op = ctx.globalCompositeOperation;
  ctx.globalAlpha = a0 * alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(sprite, x - r * 2, y - r * 2, r * 4, r * 4);
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = a0;
}

const sparkCache = new Map();
function sparkSprite(color) {
  if (sparkCache.has(color)) return sparkCache.get(color);
  const S = 128;
  const c = createCanvas(S, S);
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
  grad.addColorStop(0, rgba(color, 1));
  grad.addColorStop(0.55, rgba(color, 0.28));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  for (let i = 0; i < 4; i++) {
    g.save();
    g.rotate((i * Math.PI) / 2);
    g.beginPath();
    g.moveTo(0, -S / 2);
    g.quadraticCurveTo(8, -10, S / 2, 0);
    g.quadraticCurveTo(8, 10, 0, S / 2);
    g.quadraticCurveTo(-8, 10, -S / 2, 0);
    g.quadraticCurveTo(-8, -10, 0, -S / 2);
    g.fill();
    g.restore();
  }
  sparkCache.set(color, c);
  return c;
}

/** Four-point twinkle. */
export function spark(ctx, x, y, size, color = C.starLight, alpha = 1, rot = 0) {
  if (alpha <= 0) return;
  const sprite = sparkSprite(color);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(sprite, -size, -size, size * 2, size * 2);
  ctx.restore();
}

/** Small dust puff: deterministic, time-driven. */
export function dust(ctx, x, y, p, { count = 10, seed = 3, color = '#8FA3C0', spread = 1, size = 18 } = {}) {
  if (p <= 0 || p >= 1) return;
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha *= (1 - p) ** 1.6;
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const d = (14 + rnd() * 46) * p * spread;
    const r = (3 + rnd() * 7) * (0.5 + p) * (size / 18);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55 - p * 10, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.35 + rnd() * 0.3);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------------- captions ---------------- */
export function caption(ctx, str, alpha, y = 950) {
  if (alpha <= 0) return;
  const pad = 60;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(0, y - 130, 0, H);
  g.addColorStop(0, 'rgba(4,6,23,0)');
  g.addColorStop(1, 'rgba(4,6,23,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 130, W, H - (y - 130));
  text(ctx, str, W / 2, y, {
    size: 46, family: F.display, color: C.cream, align: 'center',
    alpha: 0.97, track: 0.6, shadow: 18,
  });
  ctx.restore();
}

/* ---------------- film finish ---------------- */
let noise = null;
function grainTile() {
  if (noise) return noise;
  const S = 180;
  noise = createCanvas(S, S);
  const g = noise.getContext('2d');
  const img = g.createImageData(S, S);
  const rnd = mulberry32(4242);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + rnd() * 145;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return noise;
}

export function grain(ctx, t, alpha = 0.045) {
  const tile = grainTile();
  const rnd = mulberry32(Math.floor(t * FPS) + 11);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'overlay';
  const ox = Math.floor(rnd() * 180), oy = Math.floor(rnd() * 180);
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, W + 180, H + 180);
  ctx.restore();
}

export function vignette(ctx, strength = 0.42) {
  const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.34, W / 2, H * 0.5, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(2,3,14,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function black(ctx, a) {
  if (a <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`;
  ctx.fillRect(0, 0, W, H);
}
