// Procedural megacity: deterministic layout, staggered construction, glass
// facades, cascading floor lights, neon trim, antennas, holograms, far skyline.
import { CITY, C } from '../data.js';
import { mulberry32, clamp, lerp, rgba, mixHex, glow, outCubic, seg, smooth } from '../lib/gfx.js';
import { camDist } from '../lib/math3d.js';

const NEON = [C.cyan, C.magenta, C.purple, C.cyan, C.cyanSoft, C.magenta];

function makeBuilding(rnd, x, z, idx) {
  const distC = Math.hypot(x, z);
  const downtown = Math.exp(-Math.pow(distC / 760, 2));
  const baseH = 24 + rnd() * 55;
  const h = baseH + downtown * (140 + rnd() * 330) + Math.pow(rnd(), 3) * 90;
  const w = 24 + rnd() * 30 + downtown * 16;
  const d = 24 + rnd() * 30 + downtown * 16;
  const tiers = h > 170 ? 3 : h > 90 ? 2 : 1;
  const neon = NEON[Math.floor(rnd() * NEON.length)];
  const neon2 = NEON[Math.floor(rnd() * NEON.length)];
  const rise = -0.35 + (distC / 2600) * 2.5 + rnd() * 0.95;
  return {
    id: idx, x, z, w, d, h, tiers, neon, neon2, rise,
    seed: (rnd() * 1e9) | 0,
    hasWire: rnd() > 0.18,
    topNeon: rnd() > 0.4,
    antenna: h > 100 && rnd() > 0.4,
    holo: rnd() > 0.84,
    signColor: rnd() > 0.5 ? C.magenta : C.cyan,
    style: rnd(),          // glass / concrete variation
    crown: rnd() > 0.7,
  };
}

export function buildCity() {
  const rnd = mulberry32(90210);
  const buildings = [];
  let idx = 0;
  for (let z = 900; z > CITY.zMin; z -= CITY.block) {
    for (let x = CITY.xMin; x < CITY.xMax; x += CITY.block) {
      const jx = x + (rnd() - 0.5) * 24;
      const jz = z + (rnd() - 0.5) * 24;
      const inAvenue = Math.abs(jx) < 66 && jz > -3800 && jz < 470;
      const inCross = Math.abs(jz + 470) < 46 || Math.abs(jz + 1290) < 40;
      if (inAvenue || inCross) continue;
      if (rnd() < 0.07) continue;
      buildings.push(makeBuilding(rnd, jx, jz, idx++));
    }
  }
  const HEROES = [
    [-430, -880, 760, 74], [404, -1320, 880, 84], [-190, -1680, 660, 70],
    [712, -640, 590, 66], [-830, -1210, 540, 86], [196, -300, 640, 62],
    [-268, 120, 560, 64], [566, -1980, 720, 76], [-660, -260, 480, 70],
    [880, -1560, 620, 72], [-1120, -1750, 700, 80], [120, -2180, 820, 78],
  ];
  for (const [x, z, h, w] of HEROES) {
    const b = makeBuilding(rnd, x, z, idx++);
    b.h = h; b.w = w; b.d = w * 1.15; b.tiers = 3; b.hero = true;
    b.antenna = true; b.topNeon = true; b.hasWire = true;
    b.rise = -0.15 + (Math.hypot(x, z) / 2600) * 2.1;
    buildings.push(b);
  }
  return buildings;
}

/** Distant skyline: coarse boxes that fill the horizon with depth. */
export function buildFarCity() {
  const rnd = mulberry32(31337);
  const out = [];
  for (let i = 0; i < 520; i++) {
    const a = rnd() * Math.PI * 2;
    const dist = 2400 + Math.pow(rnd(), 0.7) * 5200;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist - 400;
    if (z > 700) continue;
    const h = 70 + Math.pow(rnd(), 1.7) * 520 * Math.exp(-Math.pow(dist / 4000, 2)) + rnd() * 200;
    out.push({
      x, z, h, w: 60 + rnd() * 160, d: 60 + rnd() * 160,
      seed: (rnd() * 1e9) | 0, neon: NEON[Math.floor(rnd() * NEON.length)],
      rise: 1.5 + rnd() * 2.5,
    });
  }
  return out;
}

/** A tall ridge of skyline towers that frames the moon chapter. */
export function buildRidge() {
  const r = mulberry32(515151);
  const out = [];
  for (let i = 0; i < 54; i++) {
    const a = -Math.PI * 0.92 + (i / 53) * Math.PI * 1.84;
    const dist = 2300 + r() * 800;
    const x = Math.sin(a) * dist;
    const z = -Math.cos(a) * dist - 300;
    out.push({
      x, z, h: 150 + Math.pow(r(), 1.5) * 330,
      w: 90 + r() * 170, d: 90 + r() * 170,
      seed: (r() * 1e9) | 0,
      neon: NEON[Math.floor(r() * NEON.length)],
      neon2: NEON[Math.floor(r() * NEON.length)],
      rise: -20,
      tiers: r() > 0.6 ? 2 : 1,
      topNeon: r() > 0.5,
      antenna: r() > 0.55,
      holo: false, signColor: C.cyan, hero: true,
    });
  }
  return out;
}

export function buildProgress(b, t) {
  return clamp((t - b.rise) / 1.7);
}

/* --------------------------------------------------------------- helpers */
function polyPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
  ctx.closePath();
}

/** Distance fog colour: cold blue-black that warms slightly near the ground. */
function fogMix(base, d, amount = 1) {
  const f = clamp(1 - Math.exp(-Math.pow(d / 1500, 1.35))) * amount;
  return mixHex(base, '#0E1E38', f * 0.95);
}

/* ------------------------------------------------------------- far city */
export function drawFarCity(ctx, cam, t, far, { maxDist = 9000 } = {}) {
  const list = [];
  for (const b of far) {
    const d = camDist(cam, [b.x, b.h * 0.4, b.z]);
    if (d > maxDist || d < 0) continue;
    const p = cam.project([b.x, b.h * 0.5, b.z]);
    if (!p || p.x < -300 || p.x > ctx.canvas.width + 300) continue;
    list.push([b, d]);
  }
  list.sort((a, b) => b[1] - a[1]);
  for (const [b, d] of list) {
    const p = buildProgress(b, t);
    if (p <= 0) continue;
    const h = b.h * outCubic(p);
    const w = b.w;
    const near = cam.toView([b.x, h * 0.5, b.z + b.d / 2]);
    if (near[2] > -60) continue;
    const s = cam.poly([
      [b.x - w / 2, 0, b.z + b.d / 2], [b.x + w / 2, 0, b.z + b.d / 2],
      [b.x + w / 2, h, b.z + b.d / 2], [b.x - w / 2, h, b.z + b.d / 2],
    ]);
    if (!s) continue;
    const area = Math.abs((s[1].x - s[0].x) * (s[3].y - s[0].y));
    if (area < 12) continue;
    const fog = clamp(1 - Math.exp(-Math.pow(d / 2300, 1.0)));
    const col = mixHex('#0A1526', '#123A63', 0.25 + 0.4 * (1 - fog));
    ctx.fillStyle = mixHex(col, '#16406B', fog * 0.75);
    polyPath(ctx, s);
    ctx.fill();
    // sparse lights
    if (area > 500 && d < 6000) {
      const rnd = mulberry32(b.seed);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const u = rnd(), v = rnd();
        const x = s[0].x + (s[1].x - s[0].x) * u;
        const y = s[0].y + (s[3].y - s[0].y) * v;
        ctx.globalAlpha = 0.12 + rnd() * 0.25;
        ctx.fillStyle = rnd() > 0.85 ? C.amber : '#A5DFFF';
        ctx.fillRect(x, y, 1.4, 1.2);
      }
      ctx.restore();
    }
    // crown accent
    if (b.neon && area > 240) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28 * (1 - fog * 0.6);
      ctx.strokeStyle = b.neon;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s[3].x, s[3].y);
      ctx.lineTo(s[2].x, s[2].y);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------- near city */
export function drawCity(ctx, cam, t, buildings, opts = {}) {
  const {
    collapse = 0, collapseCenter = [0, 420, -100],
    particles = null, maxDist = 4200, windowBoost = 1, freeze = 0, skipFar = 0, fogMul = 1, windowDist = 1300,
  } = opts;

  const items = [];
  for (const b of buildings) {
    const d = camDist(cam, [b.x, Math.min(b.h * 0.5, 320), b.z]);
    if (d > maxDist || d < -30) continue;
    const p = cam.project([b.x, Math.min(b.h, 600) * 0.55, b.z]);
    if (!p) continue;
    const margin = 1200 + d * 0.55;
    if (p.x < -margin || p.x > ctx.canvas.width + margin) continue;
    if (p.y < -margin * 1.4 || p.y > ctx.canvas.height + margin) continue;
    items.push({ b, d });
  }
  items.sort((a, b) => b.d - a.d);

  // street-level light pools under nearby towers
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const { b, d } of items) {
    if (d > 900 || collapse > 0.3) continue;
    const pr = clamp(b.w * 1.9, 20, 110);
    const c = cam.project([b.x, 1, b.z]);
    if (!c) continue;
    const a = clamp(1 - d / 900) * 0.5;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, pr + d * 0.06);
    g.addColorStop(0, rgba(b.neon, 0.28 * a));
    g.addColorStop(0.5, rgba(b.neon2, 0.12 * a));
    g.addColorStop(1, rgba(b.neon, 0));
    ctx.fillStyle = g;
    ctx.fillRect(c.x - pr - d * 0.06, c.y - (pr + d * 0.06) * 0.5, (pr + d * 0.06) * 2, (pr + d * 0.06));
  }
  ctx.restore();

  for (const { b, d } of items) {
    drawTower(ctx, cam, b, t, d, { collapse, collapseCenter, windowBoost, freeze, fogMul, windowDist });
  }
  if (particles) particles(ctx, cam, t, collapse);
}

function drawTower(ctx, cam, b, t, dist, o) {
  const p = buildProgress(b, t);
  if (p <= 0) return;
  const { collapse, collapseCenter, windowBoost, freeze, fogMul = 1, windowDist = 1300 } = o;
  const e = outCubic(clamp(p));
  const h = b.h * e;
  const w = b.w, d = b.d, x = b.x, z = b.z;
  const shatter = collapse > 0 ? smooth(clamp(collapse * 1.3 - (1 - Math.min(dist / 2200, 1)) * 0.25)) : 0;
  if (shatter >= 1) return;

  const slabs = [];
  if (b.tiers === 1) slabs.push([0, h, 1]);
  else if (b.tiers === 2) { slabs.push([0, h * 0.6, 1]); slabs.push([h * 0.6, h, 0.76]); }
  else { slabs.push([0, h * 0.48, 1]); slabs.push([h * 0.48, h * 0.8, 0.82]); slabs.push([h * 0.8, h, 0.6]); }

  const near = dist < 1100;
  const veryNear = dist < 520;
  const fog = clamp(1 - Math.exp(-Math.pow(dist / 1750, 1.5))) * fogMul;

  for (let si = 0; si < slabs.length; si++) {
    const [y0, y1, wr] = slabs[si];
    const sw = w * wr, sd = d * wr;
    const cx = x, cz = z;
    let ox = 0, oy = 0, oz = 0, fade = 1;
    if (shatter > 0) {
      const dx = cx - collapseCenter[0], dz = cz - collapseCenter[2];
      const pull = 0.3 + shatter * 2.2;
      ox = dx * 0.05 * pull + Math.sin(b.seed + si) * 18 * shatter;
      oz = dz * 0.05 * pull + Math.cos(b.seed * 1.3 + si) * 18 * shatter;
      oy = -shatter * shatter * (80 + si * 40);
      fade = 1 - shatter * 0.96;
    }

    const x0 = cx - sw / 2 + ox, x1 = cx + sw / 2 + ox;
    const z0 = cz - sd / 2 + oz, z1 = cz + sd / 2 + oz;
    const yb = y0 + oy, yt = y1 + oy;
    if (yt - yb < 0.5) continue;

    const camZ = cam.toView([cx, (yb + yt) / 2, cz])[2];
    if (camZ > -2) continue;

    const faces = [
      { q: [[x0, yb, z1], [x1, yb, z1], [x1, yt, z1], [x0, yt, z1]], n: [0, 0, 1], w: sw, side: 1 },
      { q: [[x1, yb, z0], [x0, yb, z0], [x0, yt, z0], [x1, yt, z0]], n: [0, 0, -1], w: sw, side: -1 },
      { q: [[x1, yb, z1], [x1, yb, z0], [x1, yt, z0], [x1, yt, z1]], n: [1, 0, 0], w: sd, side: 1 },
      { q: [[x0, yb, z0], [x0, yb, z1], [x0, yt, z1], [x0, yt, z0]], n: [-1, 0, 0], w: sd, side: -1 },
    ];

    for (const f of faces) {
      const fc = [(f.q[0][0] + f.q[2][0]) / 2, (f.q[0][1] + f.q[2][1]) / 2, (f.q[0][2] + f.q[2][2]) / 2];
      const v = cam.toView(fc);
      const camN = cam.toView([fc[0] + f.n[0], fc[1] + f.n[1], fc[2] + f.n[2]]);
      const nx = camN[0] - v[0], ny = camN[1] - v[1], nz = camN[2] - v[2];
      if (nx * v[0] + ny * v[1] + nz * v[2] > 0) continue;

      const scr = cam.poly(f.q);
      if (!scr || scr.length < 3) continue;
      let area = 0;
      let minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < scr.length; i++) {
        const a = scr[i], b = scr[(i + 1) % scr.length];
        area += a.x * b.y - b.x * a.y;
        if (a.y < minY) minY = a.y;
        if (a.y > maxY) maxY = a.y;
      }
      area = Math.abs(area / 2);
      if (area < 1.5) continue;
      const quad = scr.length === 4 ? scr : null;

      // ---- glass facade
      const facing = clamp(-(f.n[0] * 0.5) + f.n[2] * 0.7 + 0.45);
      const key = clamp(0.22 + 0.62 * facing);
      // glass: dark at street level, sky reflection towards the crown
      const g = ctx.createLinearGradient(0, minY, 0, maxY);
      g.addColorStop(0, mixHex(mixHex('#05080F', '#16273D', key * 0.55), '#0B1A30', fog * 0.8));
      g.addColorStop(0.42, mixHex(mixHex('#03050A', '#0A1422', key * 0.5), '#081528', fog * 0.85));
      g.addColorStop(1, mixHex('#03050B', '#050B15', fog * 0.9));
      ctx.globalAlpha = fade;
      polyPath(ctx, scr);
      ctx.fillStyle = g;
      ctx.fill();

      // ---- sky reflection on the upper glass
      if (area > 700) {
        const rg = ctx.createLinearGradient(0, minY, 0, minY + (maxY - minY) * 0.55);
        rg.addColorStop(0, rgba('#9FD4FF', 0.2 * key * (1 - fog)));
        rg.addColorStop(0.5, rgba('#3D7CB0', 0.045 * key * (1 - fog)));
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fill();

        // diagonal reflection sheen
        const sh = (b.seed % 100) / 100;
        if (sh > 0.42) {
          const x0 = scr[0].x + ((quad ? scr[1].x : scr[0].x) - scr[0].x) * sh * 0.6;
          const x1 = scr[0].x + ((quad ? scr[2].x : scr[scr.length - 1].x) - scr[0].x) * sh;
          const gg = ctx.createLinearGradient(x0, minY, x1, maxY);
          gg.addColorStop(0, 'rgba(150,215,255,0)');
          gg.addColorStop(0.35, rgba('#AFE4FF', 0.055 * (1 - fog)));
          gg.addColorStop(0.55, rgba('#6FB6E8', 0.03 * (1 - fog)));
          gg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gg;
          ctx.fill();
        }

        // faint neon bounce at the very bottom
        const bg = ctx.createLinearGradient(0, minY + (maxY - minY) * 0.72, 0, maxY);
        bg.addColorStop(0, 'rgba(0,0,0,0)');
        bg.addColorStop(1, rgba(b.neon2, 0.055 * (1 - fog)));
        ctx.fillStyle = bg;
        ctx.fill();
      }

      // ---- floor lights
      if (area > 1500 && dist < windowDist && quad) {
        drawFloors(ctx, quad, b, f, h, fade * windowBoost, fog, t);
      }

      // ---- edge highlight
      if (area > 900 && scr.length >= 4) {
        // rim only on the silhouette edge facing the key light
        const ra = f.side > 0 ? scr[0] : scr[1];
        const rb = f.side > 0 ? scr[scr.length - 1] : scr[2];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * (1 - fog * 0.6) * 0.42;
        ctx.strokeStyle = mixHex('#8FD8FF', b.neon, 0.35);
        ctx.lineWidth = clamp(220 / dist, 0.5, 1.8);
        ctx.beginPath();
        ctx.moveTo(ra.x, ra.y);
        ctx.lineTo(rb.x, rb.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    }

    // roof
    const roof = cam.poly([[x0, yt, z0], [x0, yt, z1], [x1, yt, z1], [x1, yt, z0]]);
    if (roof) {
      const vc = cam.toView([cx, yt, cz]);
      if (vc[1] > 0) {
        ctx.globalAlpha = fade;
        polyPath(ctx, roof);
        ctx.fillStyle = mixHex('#0C1728', '#20405F', (1 - fog) * 0.5);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // crown neon band at the top slab
    if (si === slabs.length - 1 && b.topNeon && e > 0.2) {
      const top = cam.segment([x0, yt + 0.4, z1], [x1, yt + 0.4, z1]);
      const top2 = cam.segment([x1, yt + 0.4, z1], [x1, yt + 0.4, z0]);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (0.5 + 0.5 * Math.sin(t * 1.4 + b.seed)) * (1 - fog * 0.5);
      ctx.strokeStyle = b.neon;
      ctx.lineWidth = clamp(300 / dist, 1, 3.4);
      for (const s of [top, top2]) {
        if (!s) continue;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      }
      ctx.restore();
    }

    // wireframe scaffold during construction (near only, brief)
    if (b.hasWire && p < 0.32 && dist > 70 && dist < 1400 && cam.toView([cx, yt, cz])[2] < -2) {
      drawWire(ctx, cam, x0, x1, z0, z1, yb, yt, b.neon, (1 - p / 0.32) * 0.45 * (1 - dist / 1400));
    }
  }

  // construction tip
  if (p > 0.15 && p < 0.88 && dist < 900) {
    const top = b.h * e;
    const tp = cam.project([x, top, z]);
    const bp = cam.project([x, Math.max(0, top - 120), z]);
    if (tp) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (bp) {
        const g = ctx.createLinearGradient(tp.x, tp.y, bp.x, bp.y);
        g.addColorStop(0, 'rgba(170,250,255,0.3)');
        g.addColorStop(1, 'rgba(170,250,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = clamp(500 / dist, 1, 4);
        ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(bp.x, bp.y); ctx.stroke();
      }
      glow(ctx, tp.x, tp.y, clamp(2200 / dist, 2.5, 14), C.cyanSoft, 0.55);
      ctx.restore();
    }
  }

  // street-level neon storefront band + corner strip
  if (dist < 1100 && p > 0.35 && e > 0.06) {
    const yb2 = Math.min(10, b.h * e * 0.06);
    const yt2 = Math.min(58, b.h * e * 0.5);
    const s1 = cam.segment([x - w / 2, yb2, z + d / 2], [x + w / 2, yb2, z + d / 2]);
    const s2 = cam.segment([x + w / 2 - 1.2, yb2, z + d / 2 + 0.6], [x + w / 2 - 1.2, yt2, z + d / 2 + 0.6]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aa = clamp(1 - dist / 1100) * 0.95 * (1 - shatter);
    if (s1) {
      ctx.globalAlpha = aa;
      ctx.strokeStyle = b.neon;
      ctx.lineWidth = clamp(260 / dist, 1.2, 4);
      ctx.beginPath(); ctx.moveTo(s1.x1, s1.y1); ctx.lineTo(s1.x2, s1.y2); ctx.stroke();
      ctx.globalAlpha = aa * 0.25;
      ctx.lineWidth = clamp(1400 / dist, 6, 30);
      ctx.stroke();
      const mid = cam.project([x, yb2 + 1, z + d / 2 + 1]);
      if (mid) glow(ctx, mid.x, mid.y, clamp(900 / dist, 4, 26), b.neon, aa * 0.6);
    }
    if (s2) {
      ctx.globalAlpha = aa * 0.55;
      ctx.strokeStyle = b.neon2;
      ctx.lineWidth = clamp(220 / dist, 1, 3);
      ctx.beginPath(); ctx.moveTo(s2.x1, s2.y1); ctx.lineTo(s2.x2, s2.y2); ctx.stroke();
    }
    ctx.restore();
  }

  // antenna + beacon
  if (b.antenna && p > 0.9 && dist < 1600) {
    const top = b.h * e;
    const a = cam.project([x, top, z]);
    const b2 = cam.project([x, top + 22 + (b.seed % 28), z]);
    if (a && b2) {
      ctx.save();
      ctx.strokeStyle = 'rgba(110,150,185,0.45)';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
      const blink = 0.5 + 0.5 * Math.sin(t * 4 + b.seed);
      glow(ctx, b2.x, b2.y, 6 + blink * 6, '#FF3B5C', 0.75 * blink);
      ctx.restore();
    }
  }

  if (b.holo && p > 0.92 && dist < 720) drawHolo(ctx, cam, b, t, dist);
  if (p > 0.75 && dist < 900) drawSigns(ctx, cam, b, t, dist, e);
}

function drawFloors(ctx, scr, b, face, h, alpha, fog, t) {
  const [p0, p1, p2, p3] = scr;
  const cols = Math.max(2, Math.round(face.w / 14));
  const rows = Math.max(5, Math.round(h / 11));
  const rnd = mulberry32(b.seed);
  const P = (u, v) => {
    const ax = p0.x + (p1.x - p0.x) * u, ay = p0.y + (p1.y - p0.y) * u;
    const bx = p3.x + (p2.x - p3.x) * u, by = p3.y + (p2.y - p3.y) * u;
    return [ax + (bx - ax) * v, ay + (by - ay) * v];
  };
  const cellW = Math.abs(P(1 / cols, 0)[0] - P(0, 0)[0]);
  if (cellW < 1.6) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let r = 0; r < rows; r++) {
    const v = 1 - (r + 0.66) / rows;
    const v2 = 1 - (r + 0.88) / rows;
    // cascade: lower floors light first
    const onT = b.rise + 1.15 + (r / rows) * 1.25 + (b.seed % 100) * 0.004;
    const lit = clamp((t - onT) / 0.18);
    if (lit <= 0) continue;
    // pick a run of lit windows
    const mode = rnd();
    if (mode > 0.5) continue;
    const full = mode < 0.12;
    const start = full ? 0 : Math.floor(rnd() * cols * 0.6);
    const len = full ? cols : 1 + Math.floor(rnd() * Math.min(cols * 0.55, 5));
    const warm = rnd() > 0.88;
    const mag = rnd() > 0.955;
    const col = warm ? '#FFCB92' : mag ? '#FF7AC4' : rnd() > 0.7 ? '#7FE3FF' : '#BFE4FF';
    ctx.fillStyle = rgba(col, (full ? 0.24 : 0.36) * alpha * (1 - fog * 0.55) * lit);
    const a0 = P(start / cols, v), a1 = P(Math.min(1, (start + len) / cols), v);
    const b1 = P(Math.min(1, (start + len) / cols), v2), b0 = P(start / cols, v2);
    ctx.beginPath();
    ctx.moveTo(a0[0], a0[1]);
    ctx.lineTo(a1[0], a1[1]);
    ctx.lineTo(b1[0], b1[1]);
    ctx.lineTo(b0[0], b0[1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawWire(ctx, cam, x0, x1, z0, z1, yb, yt, color, alpha) {
  if (alpha <= 0.01) return;
  const edges = [
    [[x0, yb, z0], [x0, yt, z0]], [[x1, yb, z0], [x1, yt, z0]],
    [[x0, yb, z1], [x0, yt, z1]], [[x1, yb, z1], [x1, yt, z1]],
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * 0.7;
  for (const [a, b] of edges) {
    const s = cam.segment(a, b);
    if (!s) continue;
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  }
  const rungs = 8;
  for (let i = 0; i <= rungs; i++) {
    const y = yb + ((yt - yb) * i) / rungs;
    const s = cam.segment([x0, y, z1], [x1, y, z1]);
    if (!s) continue;
    ctx.globalAlpha = alpha * (i / rungs) * 0.35;
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  }
  ctx.restore();
}

/* Big emissive ad panels bolted to the street facade — the main source of
   colour in the canyon. */
function drawSigns(ctx, cam, b, t, dist, e) {
  const front = cam.eye[2] > b.z;
  const side = cam.eye[0] > b.x ? 1 : -1;
  const planeZ = b.z + (front ? b.d / 2 : -b.d / 2) + (front ? 0.6 : -0.6);
  const planeX = b.x + side * (b.w / 2 + 0.6);
  const useX = Math.abs(cam.eye[0] - b.x) > b.w * 0.7 && dist < 500;

  const rnd = mulberry32(b.seed ^ 0x9e37);
  const panels = 1 + (rnd() > 0.3 ? 1 : 0) + (rnd() > 0.75 ? 1 : 0);
  const col = rnd() > 0.5 ? C.magenta : C.cyan;
  const col2 = col === C.magenta ? C.cyan : C.magenta;
  for (let k = 0; k < panels; k++) {
    const pw = (useX ? b.d : b.w) * (0.5 + rnd() * 0.3);
    const ph = 16 + rnd() * 42;
    const py = 24 + rnd() * 120;
    if (py + ph > b.h * e) continue;
    const u = (rnd() - 0.5) * 0.5;
    let q;
    if (useX) {
      const cx = planeX;
      q = [
        [cx, py, b.z + u * b.d], [cx, py, b.z + u * b.d + pw],
        [cx, py + ph, b.z + u * b.d + pw], [cx, py + ph, b.z + u * b.d],
      ];
    } else {
      const cz = planeZ;
      q = [
        [b.x + u * b.w - pw / 2, py, cz], [b.x + u * b.w + pw / 2, py, cz],
        [b.x + u * b.w + pw / 2, py + ph, cz], [b.x + u * b.w - pw / 2, py + ph, cz],
      ];
    }
    const scr = cam.poly(q);
    if (!scr || scr.length < 4) continue;
    const fade = clamp(1 - dist / 900);
    const flick = 0.82 + 0.18 * Math.sin(t * 17 + b.seed + k);
    const a = fade * flick;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // panel body
    polyPath(ctx, scr);
    const g = ctx.createLinearGradient(scr[0].x, scr[0].y, scr[2].x, scr[2].y);
    g.addColorStop(0, rgba(col, 0.75 * a));
    g.addColorStop(0.5, rgba(col2, 0.45 * a));
    g.addColorStop(1, rgba(col, 0.62 * a));
    ctx.fillStyle = g;
    ctx.fill();
    // border
    ctx.strokeStyle = rgba('#EAFDFF', 0.7 * a);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // glyph rows
    const cx = (scr[0].x + scr[2].x) / 2, cy = (scr[0].y + scr[2].y) / 2;
    const sw = Math.hypot(scr[1].x - scr[0].x, scr[1].y - scr[0].y);
    const sh = Math.hypot(scr[3].x - scr[0].x, scr[3].y - scr[0].y);
    if (sw > 12) {
      ctx.fillStyle = rgba('#FFFFFF', 0.75 * a);
      for (let i = 0; i < 4; i++) {
        const ww = sw * (0.22 + 0.2 * Math.abs(Math.sin(t * 0.8 + i * 2.1 + b.seed)));
        ctx.globalAlpha = (0.45 + 0.4 * Math.abs(Math.sin(t * 3 + i))) * a;
        ctx.fillRect(cx - ww / 2, cy - sh * 0.3 + i * sh * 0.2, ww, Math.max(1, sh * 0.07));
      }
      ctx.globalAlpha = 1;
    }
    glow(ctx, cx, cy, Math.max(sw, sh) * 0.55, col, 0.35 * a);
    ctx.restore();
  }
}

function drawHolo(ctx, cam, b, t, dist) {
  const w = 30, hgt = 20;
  const y = b.h * 0.55;
  const faceZ = b.z + b.d / 2 + 0.4;
  const v = cam.toView([b.x, y, faceZ]);
  if (v[2] > -2) return;
  const scr = cam.poly([
    [b.x - w / 2, y - hgt / 2, faceZ], [b.x + w / 2, y - hgt / 2, faceZ],
    [b.x + w / 2, y + hgt / 2, faceZ], [b.x - w / 2, y + hgt / 2, faceZ],
  ]);
  if (!scr || scr.length < 4) return;
  const flick = 0.72 + 0.28 * Math.sin(t * 11 + b.seed) * Math.sin(t * 2.7);
  const a = clamp(1 - dist / 720);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * 0.4 * flick;
  polyPath(ctx, scr);
  ctx.fillStyle = rgba(b.signColor, 0.3);
  ctx.fill();
  ctx.globalAlpha = a * 0.7 * flick;
  ctx.strokeStyle = rgba(b.signColor, 0.9);
  ctx.lineWidth = 1;
  ctx.stroke();
  const cx = (scr[0].x + scr[2].x) / 2, cy = (scr[0].y + scr[2].y) / 2;
  const sw = Math.abs(scr[1].x - scr[0].x), sh = Math.abs(scr[3].y - scr[0].y);
  ctx.fillStyle = rgba('#CFF9FF', 0.8 * flick);
  for (let i = 0; i < 3; i++) {
    const ww = sw * (0.3 + 0.16 * Math.sin(t * 2 + i + b.seed));
    ctx.fillRect(cx - ww / 2, cy - sh * 0.24 + i * sh * 0.23, ww, Math.max(1, sh * 0.07));
  }
  ctx.restore();
}
