// ink.js — hand-drawn ink toolkit: tapered strokes with line-boil, halftone
// screentones, paper grain, impact frames, speed lines. Everything is a pure
// function of (t, seed): no frame-to-frame state.

import { createCanvas } from '@napi-rs/canvas';

export function hash(n) {
  n = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}
export function n1(x) { // value noise 1d
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}
export const J = (seed, k = 1) => (hash(seed * 7.13 + k * 19.7) - 0.5) * 2; // [-1,1]

// boil seed: re-jitters ~12×/s so every outline wobbles like hand-drawn cels
export const boil = (t) => Math.floor(t * 12);

// ---- strokes ------------------------------------------------------------
// variable-width polyline: per-segment lineWidth + round caps (self-joining)
export function stroke(ctx, pts, w0, w1 = w0, seed = 0, opt = {}) {
  const b = opt.flat ? 0 : 0.9;
  const p = pts.map((q, i) => ({
    x: q.x + J(seed + i, 1) * b + (opt.dx || 0),
    y: q.y + J(seed + i, 2) * b + (opt.dy || 0),
  }));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = opt.color || Ink.ink;
  if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
  const n = p.length - 1;
  for (let i = 0; i < n; i++) {
    ctx.lineWidth = w0 + (w1 - w0) * ((i + 0.5) / n);
    ctx.beginPath();
    ctx.moveTo(p[i].x, p[i].y);
    ctx.lineTo(p[i + 1].x, p[i + 1].y);
    ctx.stroke();
  }
  ctx.restore();
}

export function line(ctx, x1, y1, x2, y2, w, seed = 0, opt) {
  stroke(ctx, [{ x: x1, y: y1 }, { x: x2, y: y2 }], w, w, seed, opt);
}

// hand-drawn circle (boiled polyline)
export function ring(ctx, cx, cy, r, w, seed = 0, opt = {}) {
  const seg = Math.max(10, Math.round(r / 3));
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2 + (opt.a0 || 0);
    const rr = r + J(seed + i, 3) * (opt.flat ? 0 : 0.8);
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  stroke(ctx, pts, w, w, seed, opt);
}

// filled blob w/ boiled edge
export function blob(ctx, pts, seed = 0, opt = {}) {
  const b = opt.flat ? 0 : 0.9;
  ctx.save();
  ctx.beginPath();
  pts.forEach((q, i) => {
    const x = q.x + J(seed + i, 4) * b, y = q.y + J(seed + i, 5) * b;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = opt.color || Ink.paper;
  if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
  ctx.fill();
  if (opt.edge) { // outline it too
    ctx.strokeStyle = Ink.ink; ctx.lineWidth = opt.edgeW || 5; ctx.stroke();
  }
  ctx.restore();
}

export function dot(ctx, x, y, r, color = Ink.ink, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
}

// ---- paper / tone -------------------------------------------------------
export const Ink = {
  ink: '#1B1A1F', paper: '#F6F0E4', paperDeep: '#EFE7D6',
  red: '#D62828', alarm: '#E63946', espresso: '#6F4E37',
};

let grainCv = null;
function grain() {
  if (grainCv) return grainCv;
  const c = createCanvas(320, 180);
  const g = c.getContext('2d');
  const im = g.createImageData(320, 180);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = 118 + hash(i * 0.618) * 96;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
    im.data[i + 3] = 26;
  }
  g.putImageData(im, 0, 0);
  grainCv = c; return c;
}

// paper base: vertical spot wash + fibre grain + gentle vignette
const M = 460; // camera-proof margin around the world rect
export function paper(ctx, W, H, top, bot, seed = 0, vignette = 0.10) {
  const g = ctx.createLinearGradient(0, -M, 0, H + M);
  g.addColorStop(0, top); g.addColorStop(1, bot || top);
  ctx.fillStyle = g; ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
  ctx.save();
  ctx.globalAlpha = 0.5;
  const ox = -(Math.floor(hash(seed) * 6) * 37) % 320, oy = -(Math.floor(hash(seed + 9) * 6) * 29) % 180;
  for (let x = ox - M; x < W + M; x += 320) for (let y = oy - M; y < H + M; y += 180)
    ctx.drawImage(grain(), x, y, 320, 180);
  ctx.restore();
  if (vignette > 0) {
    const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
    rg.addColorStop(0, 'rgba(30,26,40,0)');
    rg.addColorStop(1, `rgba(30,26,40,${vignette})`);
    ctx.fillStyle = rg; ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
  }
}

// halftone screentone inside a rect (rotated grid)
export function halftone(ctx, x, y, w, h, opt = {}) {
  const gap = opt.gap || 9, r = opt.r || 2.6, a = opt.alpha || 0.5;
  const ang = opt.angle || -0.7;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = opt.color || Ink.ink; ctx.globalAlpha = a;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const diag = Math.hypot(w, h);
  const cx = x + w / 2, cy = y + h / 2;
  for (let u = -diag; u < diag; u += gap)
    for (let v = -diag; v < diag; v += gap) {
      const px = cx + u * dx - v * dy, py = cy + u * dy + v * dx;
      if (px < x - 2 || px > x + w + 2 || py < y - 2 || py > y + h + 2) continue;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
    }
  ctx.restore();
}

// elliptical halftone shadow under characters
export function shadow(ctx, cx, cy, rx, ry, alpha = 0.30, seed = 0) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(-0.7); ctx.translate(-cx, -cy);
  halftone(ctx, cx - rx - 4, cy - ry - 4, rx * 2 + 8, ry * 2 + 8,
    { gap: 8, r: 2.4, color: Ink.ink, alpha });
  ctx.restore();
}

// ---- action devices -----------------------------------------------------
// manga impact flash: 3 frames of white + expanding ring
export function impact(ctx, t, at, W, H, color = '#FFFDF6') {
  const dt = t - at, f = 1 / 30;
  if (dt < 0 || dt > f * 3) return false;
  ctx.save();
  ctx.globalAlpha = dt < f ? 0.85 : dt < f * 2 ? 0.45 : 0.18;
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  return true;
}

// radial action lines converging on (cx,cy)
export function speedLines(ctx, cx, cy, W, H, seed, n = 14, alpha = 0.5, inner = 0.34) {
  ctx.save();
  ctx.strokeStyle = Ink.ink; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + J(seed, i) * 0.14;
    const r0 = Math.hypot(W, H) * inner + J(seed + i, 7) * 60;
    const r1 = r0 + 240 + hash(seed + i * 3) * 260;
    ctx.globalAlpha *= alpha * (0.55 + hash(seed + i) * 0.45);
    ctx.lineWidth = 3 + hash(seed + i * 5) * 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

// short directional whoosh streaks
export function whoosh(ctx, x, y, len, ang, seed, alpha = 0.7, w = 5) {
  stroke(ctx, [
    { x: x - Math.cos(ang) * len, y: y - Math.sin(ang) * len },
    { x, y },
  ], 1.5, w, seed, { color: Ink.ink, alpha, flat: true });
}

export function flashFrames() { /* marker */ }

// text helpers ------------------------------------------------------------
export function stampText(ctx, txt, x, y, size, font, opt = {}) {
  ctx.save();
  ctx.font = `${size}px "${font}", sans-serif`;
  ctx.textAlign = opt.align || 'center';
  ctx.textBaseline = opt.baseline || 'middle';
  if (opt.rot) { ctx.translate(x, y); ctx.rotate(opt.rot); x = 0; y = 0; }
  if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
  ctx.fillStyle = opt.color || Ink.ink;
  if (opt.outline) { ctx.strokeStyle = opt.outline; ctx.lineWidth = opt.outlineW || 6; ctx.strokeText(txt, x, y); }
  ctx.fillText(txt, x, y);
  ctx.restore();
}
