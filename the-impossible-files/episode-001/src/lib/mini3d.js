// mini3d.js — software 3D: perspective projection, 3-light lambert quads,
// near-clip, painter sort, depth fog, additive pass. Deterministic, no deps.
export const PAL = {
  black: [8, 10, 14],
  charcoal: [23, 27, 35],
  white: [233, 242, 255],
  cyan: [112, 214, 247],
  steel: [52, 73, 94],
  amber: [231, 170, 96],
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const css = (c, a = 1) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const mixc = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const shade = (c, k) => [
  clamp(c[0] * k, 0, 255),
  clamp(c[1] * k, 0, 255),
  clamp(c[2] * k, 0, 255),
];

// easings
export const ease = (v) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
export const easeIn = (v) => Math.pow(v, 2.2);
export const easeOut = (v) => 1 - Math.pow(1 - v, 2.4);
export const easeQuint = (v) => (v < 0.5 ? 16 * v ** 5 : 1 - Math.pow(-2 * v + 2, 5) / 2);

// focal: vertical FOV for focal length on a 24 mm-tall reference sensor
export const fovMM = (mm) => 2 * Math.atan(12 / mm);

export function kf(t, keys, fn = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [ta, va] = keys[i - 1], [tb, vb] = keys[i];
      const u = (t - ta) / (tb - ta || 1e-6);
      return va + (vb - va) * fn(u);
    }
  }
  return keys[keys.length - 1][1];
}

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const NEAR = 0.02;

// ── camera space
function toCam(p, cam) {
  const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const x1 = dx * cy - dz * sy;
  const z1 = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const y2 = dy * cp - z1 * sp;
  const z2 = dy * sp + z1 * cp;
  return [x1, y2, z2];
}
function fpxOf(cam, H) {
  return (H / 2) / Math.tan(cam.f / 2);
}
export function projectV(vc, cam, W, H) {
  if (vc[2] < NEAR) return null;
  const f = fpxOf(cam, H);
  return [W / 2 + (vc[0] / vc[2]) * f, H / 2 - (vc[1] / vc[2]) * f];
}
export function projectPoint(p, cam, W, H) {
  return projectV(toCam(p, cam), cam, W, H);
}

// ── quad factory
export function quad(p, c, opts = {}) {
  return {
    p,
    c,
    a: opts.a ?? 1,
    emis: opts.emis ?? 0,
    fogK: opts.fogK ?? 0.35,
    grad: opts.grad ?? null,
    stroke: opts.stroke ?? null,
    strokeA: opts.strokeA ?? 1,
    add: opts.add ?? false,
  };
}

const FACES = {
  pz: (x0, y0, x1, y1, z) => [[x0, y1, z], [x0, y0, z], [x1, y0, z], [x1, y1, z]],
  nz: (x0, y0, x1, y1, z) => [[x1, y1, z], [x1, y0, z], [x0, y0, z], [x0, y1, z]],
  px: (y0, z0, y1, z1, x) => [[x, y1, z1], [x, y0, z1], [x, y0, z0], [x, y1, z0]],
  nx: (y0, z0, y1, z1, x) => [[x, y1, z0], [x, y0, z0], [x, y0, z1], [x, y1, z1]],
  py: (x0, z0, x1, z1, y) => [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]],
  ny: (x0, z0, x1, z1, y) => [[x0, y, z1], [x0, y, z0], [x1, y, z0], [x1, y, z1]],
};

export function boxQuads(cx, cy, cz, sx, sy, sz, c, opts = {}) {
  const x0 = cx - sx / 2, x1 = cx + sx / 2;
  const y0 = cy - sy / 2, y1 = cy + sy / 2;
  const z0 = cz - sz / 2, z1 = cz + sz / 2;
  return [
    quad(FACES.pz(x0, y0, x1, y1, z1), c, opts),
    quad(FACES.nz(x0, y0, x1, y1, z0), c, opts),
    quad(FACES.px(y0, z0, y1, z1, x1), c, opts),
    quad(FACES.nx(y0, z0, y1, z1, x0), c, opts),
    quad(FACES.py(x0, z0, x1, z1, y1), c, opts),
    quad(FACES.ny(x0, z0, x1, z1, y0), c, opts),
  ];
}

// ── lighting (3-light baked)
const L_KEY = (() => { const v = [-0.25, 0.72, -0.65], m = Math.hypot(...v); return v.map((x) => x / m); })();
const L_FILL = (() => { const v = [0.65, 0.30, -0.55], m = Math.hypot(...v); return v.map((x) => x / m); })();
const L_RIM = (() => { const v = [0.15, 0.35, 0.92], m = Math.hypot(...v); return v.map((x) => x / m); })();
const AMB = 0.24;

function faceNormal(p) {
  const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1], az = p[1][2] - p[0][2];
  const bx = p[2][0] - p[0][0], by = p[2][1] - p[0][1], bz = p[2][2] - p[0][2];
  const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const m = Math.hypot(nx, ny, nz) || 1;
  return [nx / m, ny / m, nz / m];
}
function lambert(c, n) {
  const d1 = Math.max(0, n[0] * L_KEY[0] + n[1] * L_KEY[1] + n[2] * L_KEY[2]);
  const d2 = Math.max(0, n[0] * L_FILL[0] + n[1] * L_FILL[1] + n[2] * L_FILL[2]);
  const d3 = Math.max(0, n[0] * L_RIM[0] + n[1] * L_RIM[1] + n[2] * L_RIM[2]);
  const k = AMB + d1 * 0.68 + d2 * 0.18 + d3 * 0.12;
  return [c[0] * k, c[1] * k, c[2] * k];
}

// clip polygon in cam space against z >= NEAR (Sutherland–Hodgman)
function clipNear(poly) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return out;
}

export function renderScene(ctx, quads, cam, W, H, opts = {}) {
  const fogColor = opts.fogColor || PAL.black;
  const fogDensity = opts.fogDensity ?? 0.05;
  const opaque = [];
  const additive = [];
  const camPos = [cam.x, cam.y, cam.z];
  const f = fpxOf(cam, H);

  for (const q of quads) {
    if ((q.a ?? 1) <= 0.004) continue;
    const world = q.p;
    let poly = world.map((p) => toCam(p, cam));
    const zc = poly.reduce((s, v) => s + v[2], 0) / poly.length;
    // backface cull (in world, against camera)
    const n = faceNormal(world);
    const cent = [
      (world[0][0] + world[1][0] + world[2][0] + world[3][0]) / 4,
      (world[0][1] + world[1][1] + world[2][1] + world[3][1]) / 4,
      (world[0][2] + world[1][2] + world[2][2] + world[3][2]) / 4,
    ];
    const vx = camPos[0] - cent[0], vy = camPos[1] - cent[1], vz = camPos[2] - cent[2];
    if (n[0] * vx + n[1] * vy + n[2] * vz <= 0) continue;
    poly = clipNear(poly);
    if (poly.length < 3) continue;
    const scr = poly.map((v) => [W / 2 + (v[0] / v[2]) * f, H / 2 - (v[1] / v[2]) * f]);
    const zs = poly.map((v) => v[2]);
    const zMin = Math.min(...zs), zMax = Math.max(...zs);
    const zAvg = zs.reduce((s, v) => s + v, 0) / zs.length;
    if (!Number.isFinite(zAvg) || !Number.isFinite(scr[0][0]) || !Number.isFinite(scr[0][1])) {
      if (!globalThis.__nanWarn) {
        globalThis.__nanWarn = 1;
        console.error('NaN-quad', JSON.stringify({ p: q.p, c: q.c, grad: q.grad, cam, zs, scr: scr.slice(0, 2) }));
      }
      continue;
    }
    let fogF = 1 - Math.exp(-fogDensity * zAvg * (q.fogK ?? 1));
    fogF = clamp01(fogF);
    const item = { q, scr, zMin, zMax, zAvg, fogF, world, n };
    if (q.add) additive.push(item);
    else opaque.push(item);
  }
  opaque.sort((a, b) => b.zAvg - a.zAvg);

  const paint = (it) => {
    const { q, scr, zMin, zMax, fogF } = it;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(scr[0][0], scr[0][1]);
      for (let i = 1; i < scr.length; i++) ctx.lineTo(scr[i][0], scr[i][1]);
      ctx.closePath();
    };
    const base = q.emis ? q.c : lambert(q.c, it.n);
    ctx.globalAlpha = (q.a ?? 1) * (1 - fogF * 0.45);
    if (q.grad) {
      // vertical screen gradient with per-stop fog
      let minY = 1e9, maxY = -1e9;
      for (const s of scr) { if (s[1] < minY) minY = s[1]; if (s[1] > maxY) maxY = s[1]; }
      const g = ctx.createLinearGradient(0, minY, 0, maxY || minY + 1);
      const c0 = q.emis ? q.grad[0] : mixc(q.grad[0], fogColor, fogF * 0.85);
      const c1 = q.emis ? q.grad[1] : mixc(q.grad[1], fogColor, fogF * 0.95);
      if (!(Number.isFinite(c0[0]) && Number.isFinite(c0[1]) && Number.isFinite(c0[2]))) {
        if (!globalThis.__badGrad) { globalThis.__badGrad = 1; console.error('BADGRAD', JSON.stringify({ grad: q.grad, c: q.c, fogF, fogColor, emis: q.emis, fogK: q.fogK, fogDensity, zAvg: it.zAvg })); }
        return;
      }
      g.addColorStop(0, css(c0, 1));
      g.addColorStop(1, css(c1, 1));
      ctx.fillStyle = g;
    } else {
      const c = mixc(base, fogColor, fogF * 0.9);
      ctx.fillStyle = css(c, 1);
    }
    path();
    ctx.fill();
    if (q.stroke) {
      ctx.strokeStyle = css(q.stroke, (q.strokeA ?? 1) * (1 - fogF * 0.6));
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  for (const it of opaque) paint(it);

  if (additive.length) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const it of additive) {
      const { q, scr, fogF } = it;
      ctx.beginPath();
      ctx.moveTo(scr[0][0], scr[0][1]);
      for (let i = 1; i < scr.length; i++) ctx.lineTo(scr[i][0], scr[i][1]);
      ctx.closePath();
      ctx.fillStyle = css(q.c, 1);
      ctx.globalAlpha = clamp01((q.a ?? 1) * (1 - fogF));
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

export function glow(ctx, x, y, r, color, a) {
  if (a <= 0.004 || r <= 0.5) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(color, 1));
  g.addColorStop(0.45, css(color, 0.35));
  g.addColorStop(1, css(color, 0));
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
