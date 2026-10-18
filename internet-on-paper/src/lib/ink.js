// ink.js — paper-cyberpunk toolkit for THE INTERNET ON PAPER.
// Black-paper substrate, riso-neon misregistered strokes, halftone, HUD chrome,
// scramble text, glitch noise. Everything deterministic in t (no ctx.filter,
// no shadowBlur bloom, no external state).

// ---------- math -----------------------------------------------------------
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const ease = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
export const easeOut = (u) => { u = clamp01(u); return 1 - (1 - u) * (1 - u); };
export const easeIn = (u) => { u = clamp01(u); return u * u; };
export const easeBack = (u) => { u = clamp01(u); const c = 1.70158 + 1; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
export const pop = (u) => { u = clamp01(u); return u === 0 ? 0 : 1 + Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI / 3)); };

// mulberry32
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash01 = (n) => {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// 12 Hz boil index
export const boil = (t) => Math.floor(t * 12);
// small deterministic jitter in [-1,1] that changes at boil rate
export const jit = (seed, t) => hash01(seed * 91.7 + boil(t) * 13.37) * 2 - 1;

// ---------- palette --------------------------------------------------------
export const P = {
  paper:   '#0B0E14',
  ink:     '#E9EDF6',
  inkDim:  '#8C93A8',
  inkFaint:'#3A4156',
  cyan:    '#2BE8E8',
  magenta: '#FF3D8C',
  amber:   '#FFC24A',
  gold:    '#FFD34E',
  green:   '#45FFA1',
  crimson: '#FF4B3E',
  card:    '#151A26',
  cardHi:  '#1C2333',
  term:    '#0A0F0C',
  navy:    '#0C1220',
};

// ---------- substrate ------------------------------------------------------
// Extended black paper: fibre flecks + faint grid + vignette. Fills far past
// frame so cameras never expose an edge.
export function paper(ctx, opts = {}) {
  const W = 1920, H = 1080;
  const base = opts.base || P.paper;
  const grid = opts.grid !== false;
  const gridColor = opts.gridColor || '#1A2236';
  const gridStep = opts.gridStep || 64;
  ctx.save();
  ctx.fillStyle = base;
  ctx.fillRect(-420, -420, W + 840, H + 840);

  // fibre flecks (construction-paper texture)
  const r = rng(opts.seed || 7);
  ctx.fillStyle = opts.fleck || 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 420; i++) {
    const x = -400 + r() * (W + 800), y = -400 + r() * (H + 800);
    const s = 1 + r() * 2.4;
    ctx.fillRect(x, y, s, s * (0.4 + r() * 0.6));
  }
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (let i = 0; i < 240; i++) {
    const x = -400 + r() * (W + 800), y = -400 + r() * (H + 800);
    ctx.fillRect(x, y, 1 + r() * 3, 1 + r() * 2);
  }

  // engineering grid
  if (grid) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.85;
    for (let x = -384; x < W + 384; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, -400); ctx.lineTo(x + 0.5, H + 400); ctx.stroke();
    }
    for (let y = -384; y < H + 384; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(-400, y + 0.5); ctx.lineTo(W + 400, y + 0.5); ctx.stroke();
    }
    // heavier every 4th
    ctx.globalAlpha = 1;
    ctx.strokeStyle = opts.gridMajor || gridColor;
    for (let x = -384; x < W + 384; x += gridStep * 4) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, -400); ctx.lineTo(x + 0.5, H + 400); ctx.stroke();
    }
  }
  ctx.restore();
}

export function vignette(ctx, strength = 0.34) {
  const W = 1920, H = 1080;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.94);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// halftone dot field (riso screentone), clipped to rect
export function halftone(ctx, x, y, w, h, gap, r, color, alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let yy = y; yy < y + h; yy += gap) {
    for (let xx = x; xx < x + w; xx += gap) {
      const o = ((yy / gap) | 0) % 2 ? gap / 2 : 0;
      ctx.beginPath();
      ctx.arc(xx + o, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- strokes --------------------------------------------------------
function taperedPath(ctx, pts, w) {
  // variable-width ribbon along polyline: thin head/tail, fat middle
  const n = pts.length;
  if (n < 2) return;
  const up = [], dn = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const u = i / (n - 1);
    const wI = w * (0.42 + 0.58 * Math.sin(Math.PI * u) ** 0.7);
    up.push([p[0] - dy * wI / 2, p[1] + dx * wI / 2]);
    dn.push([p[0] + dy * wI / 2, p[1] - dx * wI / 2]);
  }
  ctx.beginPath();
  ctx.moveTo(up[0][0], up[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(up[i][0], up[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(dn[i][0], dn[i][1]);
  ctx.closePath();
  ctx.fill();
}

// hand-inked line with 12 Hz boil
export function inkLine(ctx, pts, w, color, t, seed = 1) {
  const b = jit(seed, t), b2 = jit(seed + 5, t);
  const j = pts.map(([x, y], i) => [x + b * 1.1 * ((i % 2) ? 1 : -0.6), y + b2 * 0.9]);
  ctx.save();
  ctx.fillStyle = color;
  taperedPath(ctx, j, w);
  ctx.restore();
}

// straight hand line
export function sline(ctx, x1, y1, x2, y2, w, color, t, seed = 1) {
  const N = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 42));
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push([lerp(x1, x2, i / N), lerp(y1, y2, i / N)]);
  inkLine(ctx, pts, w, color, t, seed);
}

// partial polyline (for draw-on), returns nothing
export function partial(pts, prog) {
  if (prog >= 1) return pts;
  if (prog <= 0) return [];
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d); total += d;
  }
  let want = total * clamp01(prog), out = [pts[0]];
  for (let i = 0; i < segs.length; i++) {
    if (want >= segs[i]) { out.push(pts[i + 1]); want -= segs[i]; }
    else {
      const u = want / segs[i];
      out.push([lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)]);
      break;
    }
  }
  return out;
}

// RISO NEON stroke: magenta/cyan misregistration ghosts + hot core.
// No shadowBlur — crisp multi-pass (keeps detail, dodges the bloom ban).
export function neon(ctx, pts, w, color, t, seed = 1, misreg = 1.6) {
  if (pts.length < 2) return;
  const b1 = jit(seed + 11, t), b2 = jit(seed + 23, t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // riso ghosts sit UNDER a full-width core so the base colour stays legible
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = P.magenta;
  ctx.lineWidth = Math.max(1.5, w * 0.72);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + b1 * misreg, pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + b1 * misreg, pts[i][1]);
  ctx.stroke();
  ctx.strokeStyle = P.cyan;
  ctx.beginPath();
  ctx.moveTo(pts[0][0] - b2 * misreg, pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] - b2 * misreg, pts[i][1]);
  ctx.stroke();
  // core
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, w);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();
}
export function neonLine(ctx, x1, y1, x2, y2, w, color, t, seed = 1) {
  neon(ctx, [[x1, y1], [x2, y2]], w, color, t, seed);
}
export function neonRect(ctx, x, y, w, h, lw, color, t, seed = 1) {
  neon(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], lw, color, t, seed);
}

// ---------- chrome / props -------------------------------------------------
export function hudFrame(ctx, x, y, w, h, color, t, seed = 3, L = 44) {
  sline(ctx, x, y, x + L, y, 3, color, t, seed);
  sline(ctx, x, y, x, y + L, 3, color, t, seed + 1);
  sline(ctx, x + w - L, y, x + w, y, 3, color, t, seed + 2);
  sline(ctx, x + w, y, x + w, y + L, 3, color, t, seed + 3);
  sline(ctx, x, y + h - L, x, y + h, 3, color, t, seed + 4);
  sline(ctx, x, y + h, x + L, y + h, 3, color, t, seed + 5);
  sline(ctx, x + w - L, y + h, x + w, y + h, 3, color, t, seed + 6);
  sline(ctx, x + w, y + h - L, x + w, y + h, 3, color, t, seed + 7);
}

// paper card with print-offset shadow (+ optional tape)
export function card(ctx, x, y, w, h, opts = {}) {
  const fill = opts.fill || P.card;
  const edge = opts.edge || '#000';
  const rot = opts.rot || 0;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);
  if (opts.shadow !== false) {
    ctx.fillStyle = opts.shadowColor || 'rgba(0,0,0,0.55)';
    ctx.fillRect(5, 6, w, h);
  }
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  if (opts.border !== false) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = opts.bw || 3;
    ctx.strokeRect(0, 0, w, h);
  }
  if (opts.tape) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = opts.tapeColor || 'rgba(255,255,255,0.16)';
    ctx.translate(opts.tape === 'l' ? 6 : w - 6, opts.tapeY || -8);
    ctx.rotate(opts.tape === 'l' ? -0.5 : 0.5);
    ctx.fillRect(-44, -14, 88, 28);
    ctx.restore();
  }
  ctx.restore();
}

// terminal window chrome (title bar + traffic dots + border); content by scene
export function windowFrame(ctx, x, y, w, h, title, accent, t, opts = {}) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x + 7, y + 8, w, h);
  ctx.fillStyle = opts.fill || '#0A0E16';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(x, y, w, 44);
  // traffic dots
  const dots = [P.crimson, P.amber, P.green];
  dots.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(x + 26 + i * 26, y + 22, 7, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.font = '18px "ChakraPetch-SemiBold"';
  ctx.fillStyle = accent;
  ctx.textAlign = 'right';
  ctx.fillText(title, x + w - 18, y + 29);
  ctx.textAlign = 'left';
  neonRect(ctx, x, y, w, h, 2.5, accent, t, opts.seed || 4);
  ctx.restore();
}

// HUD chip (small labelled pill)
export function chip(ctx, x, y, text, color, t, opts = {}) {
  const size = opts.size || 20;
  ctx.save();
  ctx.font = `${size}px "ChakraPetch-SemiBold"`;
  const w = ctx.measureText(text).width + (opts.px || 34);
  const h = size + 16;
  ctx.fillStyle = opts.fill || 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  neonRect(ctx, x, y, w, h, 2, color, t, opts.seed || 9);
  ctx.fillStyle = color;
  ctx.fillText(text, x + (opts.px || 34) / 2, y + h - 9);
  ctx.restore();
  return w;
}

// ---------- type -----------------------------------------------------------
export const FAM = {
  display: '"Michroma-Regular"',
  head: '"ChakraPetch-Bold"',
  semi: '"ChakraPetch-SemiBold"',
  body: '"ChakraPetch-Regular"',
  mono: '"ShareTechMono-Regular"',
};

export function text(ctx, str, x, y, opts = {}) {
  const fam = opts.fam || FAM.head;
  const size = opts.size || 40;
  ctx.save();
  ctx.font = opts.weight ? `${opts.weight} ${size}px ${fam}` : `${size}px ${fam}`;
  ctx.fillStyle = opts.color || P.ink;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.base || 'alphabetic';
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  ctx.fillText(str, x, y);
  ctx.restore();
  return ctx.measureText(str).width;
}

// manual letter-spaced text (canvas has no tracking)
export function tracked(ctx, str, x, y, size, color, track, fam = FAM.display, align = 'left') {
  ctx.save();
  ctx.font = `${size}px ${fam}`;
  ctx.fillStyle = color;
  const chars = [...str];
  let total = 0;
  for (const c of chars) total += ctx.measureText(c).width + track;
  total -= track;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + track;
  }
  ctx.restore();
  return total;
}

// chromatic-aberration text (magenta/cyan offsets) — in-scene glitch type
export function chromaText(ctx, str, x, y, opts = {}) {
  const off = opts.off ?? 4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.font = `${opts.size || 40}px ${opts.fam || FAM.head}`;
  ctx.textAlign = opts.align || 'left';
  ctx.fillStyle = P.magenta;
  ctx.globalAlpha = 0.85;
  ctx.fillText(str, x - off, y);
  ctx.fillStyle = P.cyan;
  ctx.fillText(str, x + off, y);
  ctx.restore();
  ctx.save();
  ctx.font = `${opts.size || 40}px ${opts.fam || FAM.head}`;
  ctx.textAlign = opts.align || 'left';
  ctx.fillStyle = opts.color || P.ink;
  ctx.fillText(str, x, y);
  ctx.restore();
}

const SCR = '▓▒░█<>/\\|=+*#@$%&0123456789ABCDEF';
// scramble→resolve string; prog 0..1; deterministic in (seed, frame)
export function scrambleStr(target, prog, seed, t) {
  const n = target.length;
  const k = clamp01(prog);
  const shown = Math.floor(k * (n + 4));
  const fr = Math.floor(t * 15);
  let out = '';
  for (let i = 0; i < n; i++) {
    const c = target[i];
    if (i < shown - 3 || k >= 1 || c === ' ') out += c;
    else out += SCR[Math.floor(hash01(seed * 17.3 + i * 7.7 + fr * 3.1) * SCR.length)];
  }
  return out;
}

// static-noise bars (glitch burst interior) — deterministic
export function noiseBars(ctx, x, y, w, h, n, seed, t) {
  const fr = Math.floor(t * 30);
  const r = rng(seed * 1000 + fr);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const by = y + r() * h;
    const bh = 3 + r() * 18;
    const bx = x + r() * w * 0.4;
    const bw = w * (0.3 + r() * 0.7);
    const pick = r();
    ctx.globalAlpha = 0.16 + r() * 0.4;
    ctx.fillStyle = pick < 0.33 ? P.magenta : pick < 0.66 ? P.cyan : '#FFFFFF';
    ctx.fillRect(bx, by, bw, bh);
  }
  ctx.restore();
}

// block-scramble cells (cipher grid content etc.)
export function hexCells(ctx, x, y, cw, ch, cols, rows, seed, t, color, gap = 4) {
  ctx.save();
  const fr = Math.floor(t * 8);
  const r = rng(seed + fr);
  ctx.font = `${Math.floor(ch * 0.62)}px ${FAM.mono}`;
  ctx.fillStyle = color;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const hex = Math.floor(r() * 0xffff).toString(16).padStart(4, '0');
      ctx.fillText(hex, x + i * (cw + gap), y + ch * (j + 0.75));
    }
  }
  ctx.restore();
}

// ---------- motion props ---------------------------------------------------
export function arrow(ctx, x1, y1, x2, y2, w, color, t, seed = 1) {
  sline(ctx, x1, y1, x2, y2, w, color, t, seed);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 16;
  sline(ctx, x2, y2, x2 - Math.cos(a - 0.5) * s, y2 - Math.sin(a - 0.5) * s, w, color, t, seed + 1);
  sline(ctx, x2, y2, x2 - Math.cos(a + 0.5) * s, y2 - Math.sin(a + 0.5) * s, w, color, t, seed + 2);
}

export function led(ctx, x, y, r, color, on, t, seed = 0) {
  ctx.save();
  if (on) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = on ? color : 'rgba(255,255,255,0.14)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function wavy(ctx, x1, y1, x2, y2, amp, color, t, seed = 1, w = 3) {
  const N = 26, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = lerp(x1, x2, u);
    const y = lerp(y1, y2, u) + Math.sin(u * 7 + t * 5 + seed) * amp;
    pts.push([x, y]);
  }
  inkLine(ctx, pts, w, color, t, seed);
}

// torn zigzag edge polyline (for ripped packets)
export function zig(x1, x2, y, teeth, amp) {
  const pts = [];
  const n = teeth * 2;
  for (let i = 0; i <= n; i++) pts.push([lerp(x1, x2, i / n), y + (i % 2 ? amp : -amp)]);
  return pts;
}
