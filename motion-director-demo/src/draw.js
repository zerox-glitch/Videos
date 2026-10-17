// Shared drawing toolkit: fonts, easing, type, HUD and post effects.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { W, H, C, F, FPS } from './data.js';

const FONT_FILES = [
  ['SpaceGrotesk-700.ttf', F.display],
  ['SpaceGrotesk-500.ttf', F.displayMed],
  ['Inter-400.ttf', F.text],
  ['Inter-500.ttf', F.textMed],
  ['Inter-600.ttf', F.textSemi],
  ['JetBrainsMono-400.ttf', F.mono],
  ['JetBrainsMono-700.ttf', F.monoBold],
];

export function initFonts(fontDir) {
  for (const [file, alias] of FONT_FILES) {
    const ok = GlobalFonts.registerFromPath(`${fontDir}/${file}`, alias);
    if (!ok) throw new Error(`Could not register font ${file}`);
  }
}

/* ---------- math ---------- */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const outExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const outQuint = t => 1 - Math.pow(1 - t, 5);
export const outCubic = t => 1 - Math.pow(1 - t, 3);
export const inCubic = t => t * t * t;
export const inOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const sine = (t, freq = 1, phase = 0) => Math.sin((t * freq + phase) * Math.PI * 2);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- type ---------- */
const FAMILY = {
  [F.display]: 'Display',
  [F.displayMed]: 'Display Medium',
  [F.text]: 'Text',
  [F.textMed]: 'Text Medium',
  [F.textSemi]: 'Text Semi',
  [F.mono]: 'Mono',
  [F.monoBold]: 'Mono Bold',
};

export function setFont(ctx, size, family = F.text) {
  ctx.font = `${Math.round(size)}px "${FAMILY[family] || family}"`;
}

/**
 * Draw a single line. `y` is the alphabetic baseline unless `center` is true.
 * `track` is letter spacing in px; alignment compensates for the trailing space.
 */
export function text(ctx, str, x, y, {
  size = 40, family = F.text, color = C.cream, align = 'left',
  alpha = 1, track = 0, center = false, baseline = 'alphabetic',
} = {}) {
  setFont(ctx, size, family);
  ctx.letterSpacing = `${track}px`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const dx = align === 'center' ? track / 2 : align === 'right' ? track : 0;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  ctx.fillText(str, x + dx, y);
  ctx.globalAlpha = a0;
  ctx.letterSpacing = '0px';
}

export function textWidth(ctx, str, { size = 40, family = F.text, track = 0 } = {}) {
  setFont(ctx, size, family);
  ctx.letterSpacing = `${track}px`;
  const w = ctx.measureText(str).width;
  ctx.letterSpacing = '0px';
  return w;
}

/** Visual vertical centre → baseline. Space Grotesk / Inter cap-height ≈ 0.72 em. */
export const capY = (cy, size) => cy + size * 0.355;

/** Per-character layout with an animation hook. */
export function chars(ctx, str, x, y, opts, each) {
  const { size = 100, family = F.display, track = 0, align = 'left', color = C.cream } = opts;
  setFont(ctx, size, family);
  const widths = [...str].map(ch => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (str.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch !== ' ') {
      const s = each(i, ch, cx, widths[i], total);
      if (s) {
        ctx.save();
        ctx.translate(cx + widths[i] / 2, y);
        if (s.rotate) ctx.rotate(s.rotate);
        if (s.scale) ctx.scale(s.scale, s.scale);
        if (s.skew) ctx.transform(1, 0, s.skew, 1, 0, 0);
        ctx.globalAlpha *= s.alpha ?? 1;
        ctx.fillStyle = s.color || color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(ch, 0, s.dy || 0);
        ctx.restore();
      }
    }
    cx += widths[i] + track;
  }
  return total;
}

/** Word-by-word reveal with an optional mask, used across statements. */
export function wordsMasked(ctx, str, x, y, {
  size = 100, family = F.display, color = C.cream, align = 'center',
  track = 0, t = 0, start = 0, stagger = 0.08, dur = 0.55, lineHeight = 1.05, rise = 1.15,
} = {}) {
  const ws = str.split(' ');
  setFont(ctx, size, family);
  ctx.letterSpacing = `${track}px`;
  const space = ctx.measureText(' ').width;
  const widths = ws.map(w => ctx.measureText(w).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (ws.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const cap = size * 0.72;
  for (let i = 0; i < ws.length; i++) {
    const p = outExpo(seg(t, start + i * stagger, start + i * stagger + dur));
    if (p > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 4, y - cap - 4, widths[i] + 8, cap + 12);
      ctx.clip();
      ctx.fillStyle = color;
      ctx.globalAlpha *= clamp(p * 1.6);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(ws[i], cx, y + (1 - p) * size * rise);
      ctx.restore();
    }
    cx += widths[i] + space;
  }
  ctx.letterSpacing = '0px';
}

/* ---------- layout ---------- */
export function bg(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function card(ctx, x, y, w, h, r, fill, { shadow = 0, stroke = null, strokeWidth = 1 } = {}) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = shadow;
    ctx.shadowOffsetY = shadow * 0.35;
  }
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  if (stroke) {
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

export function rule(ctx, x1, y, x2, color = C.line, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function hairlineGrid(ctx, { alpha = 0.05, color = C.cream, step = 90 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}

export function cornerMarks(ctx, { inset = 56, len = 26, color = C.line, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const pts = [
    [inset, inset, 1, 1], [W - inset, inset, -1, 1],
    [inset, H - inset, 1, -1], [W - inset, H - inset, -1, -1],
  ];
  for (const [x, y, sx, sy] of pts) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * len); ctx.lineTo(x, y); ctx.lineTo(x + sx * len, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function label(ctx, str, x, y, { color = C.muted, size = 24, align = 'left', alpha = 1, track = 4 } = {}) {
  text(ctx, str, x, y, { size, family: F.mono, color, align, alpha, track });
}

export function pill(ctx, str, x, y, {
  color = C.cream, border = C.line, size = 22, padX = 22, height = 46, align = 'left', fill = null, alpha = 1,
} = {}) {
  setFont(ctx, size, F.mono);
  ctx.letterSpacing = '1px';
  const w = ctx.measureText(str).width + padX * 2;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, left, y, w, height, height / 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1.2; ctx.stroke(); }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, left + w / 2, y + height / 2 + 1);
  ctx.restore();
  ctx.letterSpacing = '0px';
  return w;
}

/* ---------- icons ---------- */
export function check(ctx, cx, cy, size, progress, color = C.lime, width = 7) {
  const p = clamp(progress);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const pts = [[-0.32, 0.02], [-0.08, 0.26], [0.36, -0.24]];
  const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
  const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  const total = l1 + l2;
  const drawn = p * total;
  ctx.beginPath();
  ctx.moveTo(cx + pts[0][0] * size, cy + pts[0][1] * size);
  if (drawn <= l1) {
    const k = drawn / l1;
    ctx.lineTo(cx + lerp(pts[0][0], pts[1][0], k) * size, cy + lerp(pts[0][1], pts[1][1], k) * size);
  } else {
    ctx.lineTo(cx + pts[1][0] * size, cy + pts[1][1] * size);
    const k = (drawn - l1) / l2;
    ctx.lineTo(cx + lerp(pts[1][0], pts[2][0], k) * size, cy + lerp(pts[1][1], pts[2][1], k) * size);
  }
  ctx.stroke();
  ctx.restore();
}

export function cross(ctx, cx, cy, size, progress, color = C.ember, width = 6) {
  const p = outCubic(clamp(progress));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size / 2, cy - size / 2);
  ctx.lineTo(cx - size / 2 + size * clamp(p * 2), cy - size / 2 + size * clamp(p * 2));
  if (p > 0.5) {
    const k = (p - 0.5) * 2;
    ctx.moveTo(cx + size / 2, cy - size / 2);
    ctx.lineTo(cx + size / 2 - size * k, cy - size / 2 + size * k);
  }
  ctx.stroke();
  ctx.restore();
}

export function playMark(ctx, cx, cy, box, { plate = C.lime, mark = C.ink, progress = 1, ring = true } = {}) {
  const p = outBack(clamp(progress), 2.0);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(p, p);
  if (ring) {
    ctx.beginPath();
    ctx.arc(0, 0, box * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(199,255,62,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  roundRect(ctx, -box / 2, -box / 2, box, box, box * 0.28);
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-box * 0.13, -box * 0.21);
  ctx.lineTo(box * 0.23, 0);
  ctx.lineTo(-box * 0.13, box * 0.21);
  ctx.closePath();
  ctx.fillStyle = mark;
  ctx.fill();
  ctx.restore();
}

/* ---------- HUD ---------- */
export function hud(ctx, t, { color = 'rgba(139,147,158,0.85)' } = {}) {
  const frames = Math.floor(t * FPS);
  const tc = `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;
  text(ctx, tc, W - 90, 250, { size: 19, family: F.mono, color, align: 'right', alpha: 0.8, track: 2 });
  text(ctx, `${String(frames).padStart(4, '0')} / ${Math.round(26 * FPS)} F`, W - 90, 280, {
    size: 19, family: F.mono, color, align: 'right', alpha: 0.55, track: 2,
  });
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24.5, 24.5, W - 49, H - 49);
  ctx.restore();
}

export function ruler(ctx, t, total, { y = 1742, color = C.lime, dim = C.muted, x0 = 90, x1 = W - 90, alpha = 0.9 } = {}) {
  const w = x1 - x0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(242,238,228,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  for (let s = 0; s <= total; s += 1) {
    const x = x0 + (s / total) * w;
    const major = s % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - (major ? 16 : 8));
    ctx.strokeStyle = major ? 'rgba(242,238,228,0.5)' : 'rgba(242,238,228,0.22)';
    ctx.stroke();
  }
  const px = x0 + clamp(t / total) * w;
  ctx.fillStyle = color;
  ctx.fillRect(px - 1.5, y - 28, 3, 42);
  ctx.beginPath();
  ctx.arc(px, y - 30, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  label(ctx, '00:00', x0, y + 34, { color: dim, size: 18, alpha });
  label(ctx, `00:${String(total).padStart(2, '0')}`, x1, y + 34, { color: dim, size: 18, align: 'right', alpha });
}

/** Shared bottom band: rule, mono caption, page index. Keeps every scene's floor composed. */
export function footer(ctx, t, { text: str = '', page = '', dark = true, at = 1490, alpha = 1 } = {}) {
  const ink = dark ? C.cream : C.ink;
  rule(ctx, 90, at, W - 90, dark ? 'rgba(242,238,228,0.14)' : 'rgba(10,12,15,0.16)', 1);
  if (str) label(ctx, str, 90, at + 44, { color: ink, alpha: 0.45 * alpha, size: 18, track: 3 });
  if (page) label(ctx, page, W - 90, at + 44, { color: ink, alpha: 0.45 * alpha, size: 18, align: 'right', track: 3 });
}

/* ---------- post ---------- */
let noisePattern = null;
export function makeGrain() {
  const n = createCanvas(160, 160);
  const nx = n.getContext('2d');
  const img = nx.createImageData(160, 160);
  const rnd = mulberry32(9137);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + rnd() * 135;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  nx.putImageData(img, 0, 0);
  noisePattern = n;
}

export function grain(ctx, t, { alpha = 0.05 } = {}) {
  if (!noisePattern) makeGrain();
  const rnd = mulberry32(Math.floor(t * 60) + 7);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const ox = Math.floor(rnd() * 160);
  const oy = Math.floor(rnd() * 160);
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(noisePattern, 'repeat');
  ctx.fillRect(0, 0, W + 160, H + 160);
  ctx.restore();
}

/** Vignette that backs off on light scenes so cream stays clean. */
export function vignetteAuto(ctx, dark = 0.3, light = 0.1) {
  const d = ctx.getImageData(2, 2, 1, 1).data;
  const lum = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
  vignette(ctx, lum > 0.6 ? light : dark);
}

export function vignette(ctx, strength = 0.35) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.2, W / 2, H * 0.5, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ---------- transition mask ---------- */
export function cutMask(ctx, t, cuts) {
  for (const cut of cuts) {
    const p = (t - cut.t) / 0.34;
    if (p < 0 || p >= 1) continue;
    const e = outExpo(clamp(p));
    ctx.save();
    ctx.fillStyle = cut.color;
    if (cut.type === 'circle') {
      const r = lerp(0, Math.hypot(W, H) * 0.62, e);
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    } else {
      const panels = 5;
      const h = H / panels;
      for (let i = 0; i < panels; i++) {
        const w = W * (1 - clamp(e * 1.15 - i * 0.06));
        ctx.fillStyle = cut.color;
        ctx.fillRect(i % 2 ? W - w : 0, i * h, w, h + 1);
      }
    }
    ctx.restore();
  }
}
