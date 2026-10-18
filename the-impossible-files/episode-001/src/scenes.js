// scenes.js — THE IMPOSSIBLE FILES EP.001: eight deterministic scenes.
// Software-3D quads (mini3d) + screen-space cinematic overlays. Pure draw(t).
import * as M from './lib/mini3d.js';
import { beats, ev as evObj, prog as eprog } from './beats.js';
const ev = (id) => evObj(id).t;   // scenes use event TIMES as numbers

const { PAL, css, mixc, shade, quad, boxQuads, renderScene, projectPoint,
        glow, kf, clamp01, clamp, lerp, ease, easeIn, easeOut, easeQuint,
        rng, hash01 } = M;

export let W = 1080, H = 1920;
export function setSize(w, h) { W = w; H = h; }
const TAU = Math.PI * 2;

// piecewise linear (velocity-continuous enough with well-chosen keys)
function pw(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const [a, va] = ks[i - 1], [b, vb] = ks[i];
      return va + (vb - va) * (t - a) / (b - a || 1e-6);
    }
  }
  return ks[ks.length - 1][1];
}
const prog = (t, id, dur) => eprog(t, id, dur);

// ═══════════════════════════════════════════ shared LAB geometry
export const CUBE = [0.55, 1.03, 5.4];          // lab cube centre (0.10 m)
const MON = {                                     // monitor screen quad (faces +x)
  p: [[-1.62, 1.60, 5.30], [-1.62, 1.60, 5.92], [-1.62, 1.10, 5.92], [-1.62, 1.10, 5.30]],
};
const FIG0 = { x: -1.05, z: 4.72, h: 1.74 };
const FIG1 = { x: -0.42, z: 5.02, h: 1.66 };

const STEEL = [84, 96, 114];
const CONCRETE = [40, 46, 58];
const CONCRETE_D = [28, 33, 43];
const FLOOR_C = [20, 24, 31];

/**
 * Full lab. a = {walls, strips, table, cube, mon, seams} alphas (0..1).
 * scaleK: shrink whole room about pivot (ending collapse). skipFront: omit front wall.
 */
function labQuads(a = {}, opts = {}) {
  const A = (k, d = 1) => (a[k] !== undefined ? a[k] : d) * (opts.a ?? 1);
  const k = opts.scaleK ?? 1;
  const pivot = opts.pivot || [0, 1.6, 4.5];
  const map = (p) => (k === 1 ? p : [
    pivot[0] + (p[0] - pivot[0]) * k,
    pivot[1] + (p[1] - pivot[1]) * k,
    pivot[2] + (p[2] - pivot[2]) * k,
  ]);
  const wrap = (q) => ({ ...q, p: q.p.map(map), a: q.a * (q._gate ?? 1) });
  const out = [];
  const add = (q) => {
    if (Array.isArray(q)) for (const x of q) out.push(wrap(x));
    else out.push(wrap(q));
  };

  // floor (sheen gradient back→front)
  add(quad([[-4, 0, -2], [4, 0, -2], [4, 0, 9], [-4, 0, 9]],
    FLOOR_C, { grad: [[13, 15, 20], [34, 39, 50]], a: A('walls'), fogK: 0.5 }));
  // ceiling
  add(quad([[-4, 3.2, 9], [4, 3.2, 9], [4, 3.2, -2], [-4, 3.2, -2]],
    [14, 16, 21], { a: A('walls') * 0.9 }));
  // back wall
  add(quad([[-4, 3.2, 9], [4, 3.2, 9], [4, 0, 9], [-4, 0, 9]],
    CONCRETE, { grad: [[34, 39, 50], [16, 18, 24]], a: A('walls'), fogK: 0.35 }));
  // side walls
  add(quad([[-4, 3.2, -2], [-4, 3.2, 9], [-4, 0, 9], [-4, 0, -2]],
    CONCRETE_D, { a: A('walls'), fogK: 0.35 }));
  add(quad([[4, 0, -2], [4, 0, 9], [4, 3.2, 9], [4, 3.2, -2]],
    CONCRETE_D, { a: A('walls'), fogK: 0.35 }));
  // front wall (skipped for seventh/ending approaches)
  if (!opts.skipFront) {
    add(quad([[-4, 3.2, -2], [4, 3.2, -2], [4, 0, -2], [-4, 0, -2]],
      [17, 20, 26], { a: A('walls') }));
  }
  // wall seams
  if (A('seams', 1) > 0.02) {
    for (const sx of [-2.4, -0.8, 0.8, 2.4]) {
      add(quad([[sx, 3.2, 8.97], [sx + 0.015, 3.2, 8.97], [sx + 0.015, 0, 8.97], [sx, 0, 8.97]],
        [8, 9, 12], { a: A('seams') * 0.8 }));
    }
  }
  // light strips (cold practicals)
  const stripsA = A('strips');
  if (stripsA > 0.02) {
    const mkStrip = (x, y, z, w, h) =>
      add(quad([[x - w / 2, y + h, z], [x + w / 2, y + h, z], [x + w / 2, y, z], [x - w / 2, y, z]],
        PAL.white, { a: stripsA, emis: 1, fogK: 0.15 }));
    mkStrip(-2.55, 0.35, 8.95, 0.07, 2.5);
    mkStrip(2.95, 0.35, 8.95, 0.07, 2.5);
    mkStrip(3.97, 0.5, 6.6, 0.001, 2.2); // right wall strip (edge-on)
    // low baseboard line back wall
    add(quad([[-3.9, 0.10, 8.94], [3.9, 0.10, 8.94], [3.9, 0.06, 8.94], [-3.9, 0.06, 8.94]],
      mixc(PAL.cyan, PAL.white, 0.4), { a: stripsA * 0.7, emis: 1, fogK: 0.2 }));
  }
  // door light-rectangle (seventh-cube beacon) — gated by opts.door
  if (opts.doorA > 0.02) {
    add(quad([[-0.5, 2.5, 8.9], [0.5, 2.5, 8.9], [0.5, 0.1, 8.9], [-0.5, 0.1, 8.9]],
      PAL.white, { a: opts.doorA * 0.85, emis: 1, fogK: 0 }));
  }
  // table
  const tb = A('table');
  if (tb > 0.02) {
    add(quad([[-0.65, 0.98, 4.8], [1.75, 0.98, 4.8], [1.75, 0.98, 6.0], [-0.65, 0.98, 6.0]],
      STEEL, { grad: [[104, 118, 140], [54, 63, 78]], a: tb, fogK: 0.3 }));
    for (const [a0, b0] of [
      [[-0.65, 0.98, 6.0], [1.75, 0.98, 6.0]],
      [[-0.65, 0.98, 4.8], [1.75, 0.98, 4.8]],
    ]) {
      // front/back edges of slab
      const z = a0[2];
      add(quad([[a0[0], 0.98, z], [b0[0], 0.98, z], [b0[0], 0.92, z], [a0[0], 0.92, z]],
        shade(STEEL, 0.55), { a: tb, stroke: [120, 135, 155] }));
    }
    add(quad([[1.75, 0.98, 6.0], [-0.65, 0.98, 6.0], [-0.65, 0.98, 4.8], [1.75, 0.98, 4.8]],
      shade(STEEL, 0.4), { a: tb })); // hidden-ish end cap safety
    if (tb > 0.6) {
      for (const [sx, sz0, sz1, al] of [[-0.35, 4.9, 5.9, 0.5], [0.35, 4.86, 5.95, 0.4], [1.15, 4.92, 5.88, 0.45]]) {
        add(quad([[sx, 0.9801, sz1], [sx + 0.006, 0.9801, sz1], [sx + 0.006, 0.9801, sz0], [sx, 0.9801, sz0]],
          [44, 51, 63], { a: tb * al, fogK: 0.2 }));
      }
    }
    // apron
    add(boxQuads(0.55, 0.52, 5.4, 2.2, 0.86, 1.0, [18, 21, 27], { a: tb })); // legs/apron block
  }
  // console + monitor (left)
  const mon = A('mon');
  if (mon > 0.02) {
    add(boxQuads(-2.3, 0.45, 5.6, 1.7, 0.9, 1.0, [22, 26, 33], { a: mon }));
    add(boxQuads(-2.06, 1.28, 5.61, 0.62, 0.72, 0.78, [15, 17, 22], { a: mon })); // monitor body
    // screen (content drawn separately in screen space)
    add(quad(MON.p, [10, 16, 22], { a: mon, emis: 0.6, fogK: 0 }));
    // bezel
    add(quad(MON.p.map((p, i) => (i < 2 ? [p[0], p[1] + 0.02, p[2] + (i ? -0.02 : 0.02)] : [p[0], p[1] - 0.02, p[2] + (i === 2 ? -0.02 : 0.02)])),
      [40, 46, 56], { a: mon * 0.001 })); // (bezel drawn in screen pass)
  }
  // shelf instruments (right)
  if (A('table') > 0.02) {
    add(boxQuads(3.2, 1.35, 6.4, 1.3, 0.05, 0.5, [40, 47, 58], { a: tb }));  // shelf
    add(boxQuads(3.0, 1.5, 6.4, 0.34, 0.24, 0.3, [24, 28, 35], { a: tb }));
    add(boxQuads(3.5, 1.47, 6.35, 0.22, 0.18, 0.22, [24, 28, 35], { a: tb }));
    if (tb > 0.7) {
      // indicator dots (emissive micro quads)
      add(quad([[3.06, 1.6, 6.56], [3.1, 1.6, 6.56], [3.1, 1.56, 6.56], [3.06, 1.56, 6.56]],
        PAL.cyan, { a: tb, emis: 1, fogK: 0 }));
      add(quad([[3.52, 1.57, 6.47], [3.56, 1.57, 6.47], [3.56, 1.53, 6.47], [3.52, 1.53, 6.47]],
        PAL.amber, { a: tb, emis: 1, fogK: 0 }));
    }
  }
  // THE CUBE (0.10 m) — near-black, faint bevel strokes, edge highlights
  const cb = A('cube');
  if (cb > 0.02) {
    for (const q of boxQuads(CUBE[0], CUBE[1], CUBE[2], 0.10, 0.10, 0.10, [9, 11, 14], { a: cb })) {
      q.stroke = [233, 242, 255];
      q.strokeA = 0.5;
      q.fogK = 0.2;
      add(q);
    }
    // faint vertical room-reflection on the front face (per spec: near-black but not featureless)
    if (cb > 0.6) {
      add(quad([[CUBE[0] - 0.05, CUBE[1] + 0.05, CUBE[2] - 0.051],
                [CUBE[0] + 0.05, CUBE[1] + 0.05, CUBE[2] - 0.051],
                [CUBE[0] + 0.05, CUBE[1] - 0.05, CUBE[2] - 0.051],
                [CUBE[0] - 0.05, CUBE[1] - 0.05, CUBE[2] - 0.051]],
        [10, 13, 17], { a: cb * 0.9, emis: 1, grad: [[16, 20, 27], [5, 6, 8]], fogK: 0.2 }));
    }
  }
  return out;
}

function drawLabExtras(ctx, cam, T, opts = {}) {
  // cube contact shadow on the tabletop (grounding)
  if ((opts.spot ?? 1) > 0.05) {
    const cb = projectPoint([CUBE[0], 0.981, CUBE[2]], cam, W, H);
    const ce = projectPoint([CUBE[0] + 0.05, 0.981, CUBE[2]], cam, W, H);
    if (cb && ce) {
      const rr = Math.max(8, Math.abs(ce[0] - cb[0]) * 1.9);
      ctx.save();
      ctx.globalAlpha = 0.5 * Math.min(1, opts.spot);
      ctx.fillStyle = 'rgba(3,4,6,1)';
      ctx.beginPath();
      ctx.ellipse(cb[0], cb[1] + rr * 0.10, rr * 1.05, rr * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // overhead spot pool + cone (screen space, motivated practical)
  if ((opts.spot ?? 1) > 0.01) {
    const p = projectPoint([CUBE[0], 0.02, CUBE[2]], cam, W, H);
    if (p) {
      glow(ctx, p[0], p[1], 430 * (W / 1080), [40, 56, 78], 0.5 * opts.spot);
      // floor light pool ellipse
      ctx.save();
      ctx.globalAlpha = 0.30 * opts.spot;
      const g = ctx.createRadialGradient(p[0], p[1], 10, p[0], p[1], 300);
      g.addColorStop(0, 'rgba(150,175,210,0.35)');
      g.addColorStop(1, 'rgba(150,175,210,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], 300 * (W / 1080), 90 * (W / 1080), 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    const t = projectPoint([CUBE[0], 3.1, CUBE[2]], cam, W, H);
    if (t && p) {
      ctx.save();
      ctx.globalAlpha = 0.05 * opts.spot;
      ctx.fillStyle = 'rgba(220,235,255,1)';
      const w1 = 40 * (W / 1080), w2 = 330 * (W / 1080);
      ctx.beginPath();
      ctx.moveTo(t[0] - w1, t[1]); ctx.lineTo(t[0] + w1, t[1]);
      ctx.lineTo(p[0] + w2, p[1]); ctx.lineTo(p[0] - w2, p[1]);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  // strip glows
  if ((opts.stripGlow ?? 1) > 0.01) {
    for (const [x, y] of [[-2.55, 1.7], [2.95, 1.7]]) {
      const p = projectPoint([x, y, 8.9], cam, W, H);
      if (p) glow(ctx, p[0], p[1], 130 * (W / 1080), PAL.white, 0.30 * opts.stripGlow);
    }
  }
}

// figure silhouette (researchers) — returns nothing; screen-space billboard
function drawFigure(ctx, cam, fig, T, turnU, alpha) {
  const feet = projectPoint([fig.x, 0, fig.z], cam, W, H);
  const head = projectPoint([fig.x, fig.h, fig.z], cam, W, H);
  if (!feet || !head) return;
  const px = feet[0], top = head[1], bot = feet[1];
  const hpx = bot - top;
  if (hpx < 24 || hpx > 4200) return;
  const turn = clamp01(turnU);
  const sx = Math.max(0.24, Math.abs(Math.cos(turn * 1.35)));
  const w = hpx * 0.24 * sx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(4,5,7,0.97)';
  const cx = px;
  const headR = hpx * 0.058;
  const headY = top + headR;
  const shY = top + hpx * 0.105;         // shoulder line (head overlaps, no gap)
  // head
  ctx.beginPath();
  ctx.arc(cx + Math.sin(turn * 1.35) * headR * 0.5, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  // torso + legs
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, bot);
  ctx.lineTo(cx - w / 2, shY + hpx * 0.04);
  ctx.quadraticCurveTo(cx - w / 2, shY, cx - w * 0.34, shY - hpx * 0.010);
  ctx.lineTo(cx - w * 0.16, shY - hpx * 0.004);
  ctx.lineTo(cx + w * 0.16, shY - hpx * 0.004);
  ctx.lineTo(cx + w * 0.34, shY - hpx * 0.002);
  ctx.quadraticCurveTo(cx + w / 2, shY, cx + w / 2, shY + hpx * 0.04);
  ctx.lineTo(cx + w / 2, bot);
  ctx.closePath();
  ctx.fill();
  // faint rim (screen right edge)
  ctx.strokeStyle = 'rgba(140,170,210,0.35)';
  ctx.lineWidth = Math.max(1, hpx * 0.004);
  ctx.stroke();
  ctx.restore();
}

// probe silhouette with cyan lens ring — the film's key prop
function drawProbe(ctx, cam, pos, T, opts = {}) {
  const p = projectPoint(pos, cam, W, H);
  if (!p) return;
  const p2 = projectPoint([pos[0], pos[1] - 0.1, pos[2]], cam, W, H);
  if (!p2) return;
  const r = Math.abs(p2[1] - p[1]) * 0.62;          // body radius from 0.1 m depth cue
  if (r < 4 || r > 900) return;
  const face = clamp01(opts.face ?? 1);             // 1 = lens toward us, 0 = toward monitor
  const wSquash = Math.max(0.18, face);
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  // hover bob (deterministic, tiny)
  const bob = Math.sin(T * 1.7) * r * 0.06;
  ctx.translate(p[0], p[1] + bob);
  // body disc (dark, slightly faceted)
  ctx.beginPath();
  ctx.ellipse(0, 0, r * wSquash, r, 0, 0, TAU);
  ctx.fillStyle = 'rgba(7,9,12,0.98)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,190,225,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.stroke();
  // lens barrel
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.55 * wSquash, r * 0.55, 0, 0, TAU);
  ctx.strokeStyle = 'rgba(30,40,52,0.9)';
  ctx.lineWidth = Math.max(1, r * 0.10);
  ctx.stroke();
  // THE cyan ring (recognisable signature)
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42 * wSquash, r * 0.42, 0, 0, TAU);
  ctx.strokeStyle = css(PAL.cyan, 0.95);
  ctx.lineWidth = Math.max(2, r * 0.13) * (1 + 0.6 * (opts.sharp ?? 0));
  ctx.stroke();
  // lens core
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.18 * wSquash, r * 0.18, 0, 0, TAU);
  ctx.fillStyle = `rgba(112,214,247,${0.25 + 0.65 * face})`;
  ctx.fill();
  ctx.restore();
  // ring glow
  glow(ctx, p[0], p[1] + bob, r * 2.1, PAL.cyan, 0.30 * (opts.alpha ?? 1) * (0.4 + 0.6 * face) * (1 + 0.7 * (opts.sharp ?? 0)));
}

// ═══════════════════════════════════════════ hall generator (recursion)
function hallQuads(kind, cfg) {
  const out = [];
  const { len = 150, halfW = 6, pillarGap = 9, pillarW = 1.7, pillarH = 26, seed = 7 } = cfg;
  // floor slabs
  out.push(quad([[-halfW - 2, 0, -6], [halfW + 2, 0, -6], [halfW + 2, 0, len], [-halfW - 2, 0, len]],
    [15, 18, 24], { grad: [[11, 13, 17], [30, 35, 45]], fogK: 0.7 }));
  // walls
  out.push(quad([[-halfW - 2, pillarH + 6, len], [-halfW - 2, pillarH + 6, -6], [-halfW - 2, 0, -6], [-halfW - 2, 0, len]],
    CONCRETE_D, { fogK: 0.9 }));
  out.push(quad([[halfW + 2, 0, len], [halfW + 2, 0, -6], [halfW + 2, pillarH + 6, -6], [halfW + 2, pillarH + 6, len]],
    CONCRETE_D, { fogK: 0.9 }));
  // ceiling suggestion (upper dark slab, fades via fog)
  out.push(quad([[-halfW - 2, pillarH + 6, len], [halfW + 2, pillarH + 6, len], [halfW + 2, pillarH + 6, -6], [-halfW - 2, pillarH + 6, -6]],
    [10, 12, 16], { fogK: 1.15 }));
  // base light strips along walls (cold white)
  out.push(quad([[-halfW - 1.9, 1.15, len], [-halfW - 1.9, 1.15, -6], [-halfW - 1.9, 1.02, -6], [-halfW - 1.9, 1.02, len]],
    PAL.white, { emis: 1, a: 1.0, fogK: 0.55 }));
  out.push(quad([[-halfW - 1.9, 1.02, len], [-halfW - 1.9, 1.02, -6], [-halfW - 1.9, 1.15, -6], [-halfW - 1.9, 1.15, len]],
    PAL.white, { emis: 1, a: 1.0, fogK: 0.55 }));
  out.push(quad([[halfW + 1.9, 1.02, len], [halfW + 1.9, 1.02, -6], [halfW + 1.9, 1.15, -6], [halfW + 1.9, 1.15, len]],
    PAL.white, { emis: 1, a: 1.0, fogK: 0.55 }));

  const r = rng(seed);
  if (kind === 'cathedral' || kind === 'chamber') {
    for (let z = 4; z < len - 8; z += pillarGap) {
      for (const sx of [-1, 1]) {
        const x = sx * (halfW - pillarW * 0.7);
        out.push(...boxQuads(x, pillarH / 2, z, pillarW, pillarH, pillarW, CONCRETE, { fogK: 0.92, stroke: [86, 102, 130], strokeA: 0.30 }));
        // stepped capital
        out.push(...boxQuads(x, pillarH + 1.1, z, pillarW + 1.4, 2.2, pillarW + 1.4, CONCRETE_D, { fogK: 1 }));
      }
    }
  } else if (kind === 'city') {
    for (let z = 4; z < len - 6; z += 7) {
      for (const sx of [-1, 1]) {
        const n = 2 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          const bw = 2.2 + r() * 4.5;
          const bh = 8 + r() * 46;
          const x = sx * (halfW + 1 + r() * 9);
          out.push(...boxQuads(x, bh / 2, z + r() * 5, bw, bh, bw * (0.7 + r() * 0.7),
            r() > 0.5 ? [30, 35, 45] : [24, 29, 38], { fogK: 0.95, stroke: [96, 116, 150], strokeA: 0.28 }));
        }
        // sparse lit windows
        if (r() > 0.45) {
          const x = sx * (halfW + 3 + r() * 6);
          out.push(quad([[x - 0.5, 6 + r() * 20, z + 2], [x + 0.5, 6 + r() * 20, z + 2],
          [x + 0.5, 5 + r() * 20, z + 2], [x - 0.5, 5 + r() * 20, z + 2]],
            PAL.cyan, { emis: 1, a: 0.5, fogK: 0.6 }));
        }
      }
    }
  } else if (kind === 'float') {
    for (let z = 6; z < len - 8; z += 11) {
      const cx = (r() - 0.5) * halfW * 1.4;
      const cy = 7 + r() * 22;
      const s = 3 + r() * 9;
      // floating slab / monolith
      out.push(...boxQuads(cx, cy, z, s, s * (0.4 + r() * 1.6), s,
        [36, 42, 55], { fogK: 0.85, stroke: [120, 145, 185], strokeA: 0.45 }));
      // cold rim edge
      out.push(quad([[cx - s / 2, cy + s * 0.5, z - s / 2], [cx + s / 2, cy + s * 0.5, z - s / 2],
      [cx + s / 2, cy + s * 0.5 - 0.12, z - s / 2], [cx - s / 2, cy + s * 0.5 - 0.12, z - s / 2]],
        mixc(PAL.white, PAL.cyan, 0.4), { emis: 1, a: 0.5, fogK: 0.5 }));
      if (r() > 0.5) {
        out.push(...boxQuads(cx + (r() - 0.5) * 8, cy - 4 - r() * 8, z + 4, s * 0.5, s * 2, s * 0.5,
          [26, 31, 41], { fogK: 0.9, stroke: [110, 132, 168], strokeA: 0.35 }));
      }
    }
  } else if (kind === 'frames') {
    for (let z = 8; z < len - 6; z += 16) {
      const fw = halfW * 2.4, fh = pillarH * 1.05, th = 1.1;
      const c = [30, 35, 44];
      out.push(...boxQuads(0, fh, z, fw, th, th * 1.6, c, { fogK: 0.8, stroke: [110, 132, 168], strokeA: 0.30 }));           // top
      out.push(...boxQuads(0, th / 2, z, fw, th, th * 1.6, c, { fogK: 0.8, stroke: [110, 132, 168], strokeA: 0.30 }));       // bottom
      out.push(...boxQuads(-fw / 2, fh / 2, z, th, fh, th * 1.6, c, { fogK: 0.8, stroke: [110, 132, 168], strokeA: 0.30 })); // L
      out.push(...boxQuads(fw / 2, fh / 2, z, th, fh, th * 1.6, c, { fogK: 0.8, stroke: [110, 132, 168], strokeA: 0.30 }));  // R
      // inner emissive rim
      out.push(quad([[-fw / 2 + th, fh, z - th], [fw / 2 - th, fh, z - th],
      [fw / 2 - th, fh - 0.16, z - th], [-fw / 2 + th, fh - 0.16, z - th]],
        mixc(PAL.white, PAL.cyan, 0.5), { emis: 1, a: 0.65, fogK: 0.4 }));
      out.push(quad([[-fw / 2 + th, 0.16, z - th], [fw / 2 - th, 0.16, z - th],
      [fw / 2 - th, 0, z - th], [-fw / 2 + th, 0, z - th]],
        mixc(PAL.white, PAL.cyan, 0.5), { emis: 1, a: 0.65, fogK: 0.4 }));
    }
  }
  // far pedestal + cube (identical black cube, edge-lit)
  const cubeZ = len - 4;
  const cs = cfg.cubeSize ?? 1.6;
  out.push(...boxQuads(0, 0.7, cubeZ, cs * 2.2, 1.4, cs * 2.2, [17, 20, 26], { fogK: 0.75 })); // pedestal
  for (const q of boxQuads(0, 1.4 + cs / 2, cubeZ, cs, cs, cs, [8, 9, 12], { fogK: 0.5 })) {
    q.stroke = [233, 242, 255];
    q.strokeA = 0.8;
    out.push(q);
  }
  return out;
}

// ═══════════════════════════════════════════ caption + HUD type
const F_SEMI = '"ChakraPetch-SemiBold"', F_BOLD = '"ChakraPetch-Bold"', F_MONO = '"ShareTechMono-Regular"';
function hudText(ctx, s, x, y, size, color, opts = {}) {
  ctx.save();
  const k = W / 1080;
  ctx.font = `${opts.weight || ''} ${Math.round(size * k)}px ${opts.fam || F_MONO}`.trim();
  ctx.fillStyle = color;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.base || 'alphabetic';
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fillText(s, x, y);
  ctx.restore();
}

function brackets(ctx, x, y, w, h, color, a = 1, L) {
  L = L ?? 26 * (W / 1080);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
  ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
  ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
  ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
  ctx.stroke();
  ctx.restore();
}

// ═══════════════════════════════════════════ SCENE: OBJECT (0–11.48)
export function scene_object(ctx, sec, T) {
  const s = T;
  const u = clamp01((T - 0) / 11.48);
  // slow orbit −10°→+8° with dolly-in (85 mm macro)
  const ang = lerp(-0.17, 0.145, ease(u));
  const rad = lerp(1.12, 0.90, ease(u));
  const cam = {
    x: CUBE[0] + Math.sin(ang) * rad,
    y: lerp(1.010, 1.024, u),
    z: CUBE[2] - Math.cos(ang) * rad,
    yaw: Math.atan2(CUBE[0] + Math.sin(ang) * 0 - (CUBE[0]), 1) + Math.atan2((CUBE[0] - (CUBE[0] + Math.sin(ang) * rad)), (CUBE[2] - (CUBE[2] - Math.cos(ang) * rad)) * -1),
    pitch: 0.055,
    f: (2 * Math.atan(24 / (2 * 85))),
  };
  // aim exactly at cube
  cam.yaw = Math.atan2(CUBE[0] - cam.x, CUBE[2] - cam.z);
  cam.pitch = Math.atan2(CUBE[1] - cam.y, CUBE[2] - cam.z);

  const q = labQuads({ seams: 1, strips: 1, table: 1, cube: 1, mon: 1 });
  if (process.env.DBG === '1') {
    const pts = { cubeC: CUBE, cubeBL: [0.50, 0.98, 5.35], cubeTL: [0.50, 1.08, 5.35],
      tblFront: [-0.65, 0.98, 4.8], tblBack: [1.75, 0.98, 6.0], base: [0, 0.08, 8.94],
      monScreen: [-1.62, 1.35, 5.6] };
    const out = {};
    for (const [k, v] of Object.entries(pts)) out[k] = projectPoint(v, cam, W, H);
    console.error('OBJCAM', JSON.stringify({ cam, W, H, out, nf: q.length }));
  }
  renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.045 });
  drawLabExtras(ctx, cam, T, { spot: 1, stripGlow: 1 });

  // ★ retention hook: something moves in the cube reflection (1.95–2.5)
  if (T > 1.85 && T < 2.6) {
    const cp = projectPoint(CUBE, cam, W, H);
    const cf = projectPoint([CUBE[0], CUBE[1], CUBE[2] - 0.05], cam, W, H);
    if (cp && cf) {
      const rp = projectPoint([CUBE[0] + 0.05, CUBE[1], CUBE[2] - 0.05], cam, W, H);
      const rp2 = projectPoint([CUBE[0] - 0.05, CUBE[1], CUBE[2] - 0.05], cam, W, H);
      const w = Math.abs(rp[0] - rp2[0]);
      const gu = clamp01((T - 1.9) / 0.55);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cp[0], cp[1], w * 1.1, 0, TAU);
      ctx.clip();
      const gx = cp[0] - w + w * 2 * gu;
      const g = ctx.createLinearGradient(gx - w * 0.5, 0, gx + w * 0.5, 0);
      g.addColorStop(0, 'rgba(150,190,240,0)');
      g.addColorStop(0.5, `rgba(170,210,255,${0.5 * Math.sin(gu * Math.PI)})`);
      g.addColorStop(1, 'rgba(150,190,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cp[0] - w * 2, cp[1] - w * 2, w * 4, w * 4);
      ctx.restore();
    }
  }

  // measurement line + 10 CM (2.55 → 6.8)
  if (T > ev('measure_line')) {
    const mu = clamp01((T - ev('measure_line')) / 1.1);
    const a = Math.min(mu * 2, 1) * (T > 8.5 ? Math.max(0, 1 - (T - 8.5) / 1.4) : 1);
    const A = projectPoint([CUBE[0] - 0.05, CUBE[1] - 0.05, CUBE[2] - 0.05], cam, W, H);
    const B = projectPoint([CUBE[0] + 0.05, CUBE[1] - 0.05, CUBE[2] - 0.05], cam, W, H);
    const C = projectPoint([CUBE[0] - 0.05, CUBE[1] + 0.05, CUBE[2] - 0.05], cam, W, H);
    if (A && B && C) {
      const lerpP = (p, q, t0) => [lerp(p[0], q[0], t0), lerp(p[1], q[1], t0)];
      const p1 = A, p2 = lerpP(A, B, mu), p3 = lerpP(A, C, Math.min(1, mu * 0.8));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = css(PAL.white, 0.95);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
      ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p3[0], p3[1]);
      ctx.stroke();
      // ticks
      ctx.beginPath();
      ctx.moveTo(p2[0], p2[1] - 8); ctx.lineTo(p2[0], p2[1] + 8);
      ctx.stroke();
      if (mu > 0.5) {
        const flip = p2[0] > W - 230;
        const lx = flip ? p2[0] - 18 : p2[0] + 18;
        const al = flip ? 'right' : 'left';
        hudText(ctx, '10 CM', lx, p2[1] - 16, 40, css(PAL.white, 0.98), { fam: F_SEMI, align: al });
        hudText(ctx, 'EDGE REFERENCE', lx, p2[1] + 14, 17, 'rgba(200,215,235,0.65)', { fam: F_MONO, align: al });
      }
      // cyan scan dot (blinks from 3.6)
      if (T > ev('scan_dot')) {
        const bl = hash01(Math.floor(T * 3)) > 0.35 ? 1 : 0.25;
        ctx.globalAlpha = a * bl;
        ctx.fillStyle = css(PAL.cyan);
        ctx.beginPath();
        ctx.arc(p3[0], p3[1], 5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

// ═══════════════════════════════════════════ SCENE: SCAN (11.48–23.61)
export function scene_scan(ctx, sec, T) {
  const u = clamp01((T - 11.48) / (23.61 - 11.48));
  // medium → aligned → through-the-face
  const dist = pw(T, [[11.48, 1.55], [20.6, 1.05], [23.1, 0.55], [23.61, 0.30]]);
  const yawDrift = lerp(0.10, 0, ease(clamp01((T - 11.48) / 6)));
  const cam = {
    x: CUBE[0] + Math.sin(yawDrift) * dist,
    y: lerp(1.16, 1.03, ease(u)),
    z: CUBE[2] - Math.cos(yawDrift) * dist,
    yaw: 0, pitch: 0, f: (2 * Math.atan(24 / (2 * 60))),
  };
  cam.yaw = Math.atan2(CUBE[0] - cam.x, CUBE[2] - cam.z);
  cam.pitch = Math.atan2(CUBE[1] - cam.y, CUBE[2] - cam.z);

  const wireU = clamp01((T - ev('wire_on')) / 0.7);
  // cube front translucent during scan
  const trans = clamp01((T - ev('wire_on')) / 1.2) * 0.92;
  const q = labQuads({ seams: 1, strips: 1, table: 1, cube: 1, mon: 1 });
  // soften cube front face alpha
  for (const qq of q) {
    if (Math.abs(qq.p[0][2] - (CUBE[2] - 0.05)) < 0.001 && qq.p.every((p) => Math.abs(p[2] - (CUBE[2] - 0.05)) < 0.001)) {
      qq.a = (1 - trans) * (qq.a ?? 1);
    }
  }
  renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.045 });
  drawLabExtras(ctx, cam, T, { spot: 1 - 0.4 * u, stripGlow: 1 });

  const facePts = [
    [CUBE[0] - 0.05, CUBE[1] + 0.05, CUBE[2] - 0.05],
    [CUBE[0] + 0.05, CUBE[1] + 0.05, CUBE[2] - 0.05],
    [CUBE[0] + 0.05, CUBE[1] - 0.05, CUBE[2] - 0.05],
    [CUBE[0] - 0.05, CUBE[1] - 0.05, CUBE[2] - 0.05],
  ].map((p) => projectPoint(p, cam, W, H));

  // procedural perspective tunnel INTO the cube face (from 13.4)
  if (T > ev('tunnel_on') && facePts.every(Boolean)) {
    const tU = clamp01((T - ev('tunnel_on')) / 1.0);
    const cx0 = facePts.reduce((a, p) => a + p[0], 0) / 4;
    const cy0 = facePts.reduce((a, p) => a + p[1], 0) / 4;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(facePts[0][0], facePts[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(facePts[i][0], facePts[i][1]);
    ctx.closePath();
    ctx.clip();
    // depth gradient (dark hole)
    const wF = Math.abs(facePts[1][0] - facePts[0][0]);
    const hF = Math.abs(facePts[3][1] - facePts[0][1]);
    const g = ctx.createLinearGradient(0, cy0 - hF / 2, 0, cy0 + hF / 2);
    g.addColorStop(0, '#05070A');
    g.addColorStop(0.5, '#0A0F16');
    g.addColorStop(1, '#05070A');
    ctx.globalAlpha = tU;
    ctx.fillStyle = g;
    ctx.fillRect(cx0 - wF, cy0 - hF, wF * 2, hF * 2);
    // nested structural frames racing to vanishing point
    const frames = 16;
    for (let i = frames - 1; i >= 0; i--) {
      const d = (i + 1) / frames;
      const sc = Math.pow(d, 0.42);
      const fw = wF * 1.0 * sc, fh = hF * 1.0 * sc;
      const dim = 0.14 + 0.5 * (1 - d);
      ctx.strokeStyle = `rgba(150,215,245,${dim * tU})`;
      ctx.lineWidth = Math.max(1, 3 * sc);
      ctx.strokeRect(cx0 - fw / 2, cy0 - fh / 2, fw, fh);
      // side wall convergers
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(cx0 - wF / 2, cy0 - hF / 2);
        ctx.lineTo(cx0 - fw / 2, cy0 - fh / 2);
        ctx.moveTo(cx0 + wF / 2, cy0 - hF / 2);
        ctx.lineTo(cx0 + fw / 2, cy0 - fh / 2);
        ctx.moveTo(cx0 - wF / 2, cy0 + hF / 2);
        ctx.lineTo(cx0 - fw / 2, cy0 + fh / 2);
        ctx.moveTo(cx0 + wF / 2, cy0 + hF / 2);
        ctx.lineTo(cx0 + fw / 2, cy0 + fh / 2);
        ctx.strokeStyle = `rgba(120,190,225,${0.10 * tU})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    // vanishing glint
    glow(ctx, cx0, cy0, wF * 0.2, PAL.cyan, 0.35 * tU);
    ctx.restore();
  }

  // wireframe cage
  if (wireU > 0 && facePts.every(Boolean)) {
    ctx.save();
    ctx.globalAlpha = wireU;
    ctx.strokeStyle = css(PAL.cyan, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(facePts[0][0], facePts[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(facePts[i][0], facePts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // scan beam sweeping down the face (11.6 → 19.8)
  if (T > ev('beam_start') && T < 20.6 && facePts.every(Boolean)) {
    const bu = clamp01((T - ev('beam_start')) / 8.2);
    const yTop = Math.min(...facePts.map((p) => p[1]));
    const yBot = Math.max(...facePts.map((p) => p[1]));
    const xL = Math.min(...facePts.map((p) => p[0]));
    const xR = Math.max(...facePts.map((p) => p[0]));
    const by = lerp(yTop, yBot, easeOut(bu) * 0.96 + 0.02);
    const bkk = W / 1080;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, by - 26, 0, by + 26);
    g.addColorStop(0, 'rgba(112,214,247,0)');
    g.addColorStop(0.5, 'rgba(112,214,247,0.85)');
    g.addColorStop(1, 'rgba(112,214,247,0)');
    ctx.fillStyle = g;
    ctx.fillRect(xL - 8, by - 26 * bkk, (xR - xL) + 16, 52 * bkk);
    ctx.restore();
    glow(ctx, (xL + xR) / 2, by, 90 * bkk, PAL.cyan, 0.4);
  }

  // HUD: brackets + ruler + counter + warning (anchored right of cube)
  if (T > ev('wire_on') && T < 21.4 && facePts.every(Boolean)) {
    const xR = Math.max(...facePts.map((p) => p[0]));
    const xL = Math.min(...facePts.map((p) => p[0]));
    const yT = Math.min(...facePts.map((p) => p[1]));
    const yB = Math.max(...facePts.map((p) => p[1]));
    const hudA = Math.min(1, (T - ev('wire_on')) / 0.6) * (T > 20.6 ? Math.max(0, 1 - (T - 20.6) / 0.8) : 1);
    brackets(ctx, xL - 34, yT - 34, (xR - xL) + 68, (yB - yT) + 68, css(PAL.cyan, 0.85), hudA);
    // left readouts
    const lx = 64, ly = H * 0.30;
    hudText(ctx, 'INTERNAL DEPTH', lx, ly, 24, 'rgba(180,215,235,0.75)', { fam: F_MONO, alpha: hudA });
    let val = '—';
    if (T >= ev('count_987')) val = '987';
    else if (T >= ev('count_500')) val = String(Math.round(500 + (T - ev('count_500')) / (ev('count_987') - ev('count_500')) * 487));
    else if (T >= ev('count_100')) val = String(Math.round(100 + (T - ev('count_100')) / (ev('count_500') - ev('count_100')) * 400));
    else if (T >= ev('count_10')) val = String(Math.round(10 + (T - ev('count_10')) / (ev('count_100') - ev('count_10')) * 90));
    else if (T > ev('wire_on')) val = '10';
    hudText(ctx, val, lx, ly + 96, 96, val === '987' ? css(PAL.white, 1) : 'rgba(233,242,255,0.92)',
      { fam: F_MONO, weight: 'bold', alpha: hudA });
    hudText(ctx, 'METERS', lx + (val.length * 56) + 14, ly + 96, 30, css(PAL.cyan, 0.9), { fam: F_MONO, alpha: hudA });
    hudText(ctx, 'SCAN 04 · TOMOGRAPHIC', lx, ly + 138, 20, 'rgba(140,175,200,0.6)', { fam: F_MONO, alpha: hudA });
    // progress ticks
    const kk = W / 1080;
    for (let i = 0; i < 14; i++) {
      const on = i / 14 < clamp01((T - ev('wire_on')) / 7.4);
      ctx.globalAlpha = hudA;
      ctx.fillStyle = on ? css(PAL.cyan, 0.9) : 'rgba(255,255,255,0.14)';
      ctx.fillRect(lx + i * 30 * kk, ly + 168, 22 * kk, 6 * kk);
      ctx.globalAlpha = 1;
    }
    // warning chip
    if (T > ev('warning')) {
      const blink = hash01(Math.floor(T * 4)) > 0.3 ? 1 : 0.45;
      const wu = clamp01((T - ev('warning')) / 0.3);
      const kk2 = W / 1080;
      ctx.save();
      ctx.globalAlpha = hudA * blink * wu;
      ctx.strokeStyle = css(PAL.cyan, 0.95);
      ctx.lineWidth = Math.max(1, 2 * kk2);
      const wx = 64 * kk2, wy = ly + 236, ww = 470 * kk2, wh = 64 * kk2;
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(8,16,22,0.8)';
      ctx.fillRect(wx, wy, ww, wh);
      hudText(ctx, 'SPATIAL DISCREPANCY', wx + 24 * kk2, wy + 43 * kk2, 30, css(PAL.cyan, 1), { fam: F_MONO });
      ctx.restore();
      glow(ctx, wx + ww / 2, wy + wh / 2, 260 * kk2, PAL.cyan, 0.16);
    }
  }

  // portal: face fills frame → darkness (23.1 → 23.61)
  if (T > ev('face_fills')) {
    const bu = clamp01((T - ev('face_fills')) / 0.5);
    ctx.fillStyle = `rgba(3,4,6,${ease(bu)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ═══════════════════════════════════════════ SCENE: CHAMBER (23.61–43.33)
export function scene_chamber(ctx, sec, T) {
  const u = easeQuint(clamp01((T - 23.61) / (43.33 - 23.61)));
  const q = hallQuads('chamber', { len: 158, halfW: 7, pillarGap: 10, pillarW: 1.9, pillarH: 30, cubeSize: 1.5 });
  const cam = {
    x: lerp(0.3, 0, u),
    y: lerp(1.7, 2.3, u),
    z: lerp(0, 148.5, u),
    yaw: 0,
    pitch: lerp(-0.01, -0.045, u),
    f: (2 * Math.atan(24 / (2 * 24))),
  };
  renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.0095 });
  // wall strip glows
  for (const sx of [-(7 + 1.9), 7 + 1.9]) {
    for (let z = 14; z < 150; z += 30) {
      const p = projectPoint([sx, 1.08, z], cam, W, H);
      if (p) glow(ctx, p[0], p[1], 70, PAL.white, 0.20);
    }
  }
  // far cube emphasis ramp (recognition)
  const emph = clamp01((T - ev('cube_recognize')) / 3.2);
  const fp = projectPoint([0, 3.0, 154], cam, W, H);
  if (fp && emph > 0) glow(ctx, fp[0], fp[1], 90 + 40 * emph, [180, 210, 245], 0.10 + 0.22 * emph);

  // portal into recursion (43.33): dark cover over final 0.35s
  if (T > 42.98) {
    ctx.fillStyle = `rgba(3,4,6,${clamp01((T - 42.98) / 0.33)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ═══════════════════════════════════════════ SCENE: RECURSION (43.33–63.20)
const SEGS = [
  { a: 43.33, b: 47.30, kind: 'cathedral', len: 120, hw: 9, ph: 44, gap: 13, cw: 2.6, mm: 19 },
  { a: 47.30, b: 52.60, kind: 'city', len: 150, hw: 11, ph: 54, gap: 13, cw: 3.4, mm: 18 },
  { a: 52.60, b: 57.40, kind: 'float', len: 175, hw: 12, ph: 58, gap: 13, cw: 4.2, mm: 18 },
  { a: 57.40, b: 61.60, kind: 'frames', len: 150, hw: 11, ph: 52, gap: 13, cw: 5.0, mm: 17 },
  { a: 61.60, b: 63.20, kind: 'frames', len: 64, hw: 9, ph: 46, gap: 13, cw: 6.5, mm: 17 },
];
export function scene_recursion(ctx, sec, T) {
  let seg = SEGS[0];
  for (const s of SEGS) if (T >= s.a) seg = s;
  const u = easeIn(clamp01((T - seg.a) / (seg.b - seg.a)));   // accelerating dolly
  const q = hallQuads(seg.kind, {
    len: seg.len, halfW: seg.hw, pillarGap: seg.gap, pillarW: seg.cw,
    pillarH: seg.ph, cubeSize: 2.0, seed: 11 + SEGS.indexOf(seg) * 7,
  });
  const cubeZ = seg.len - 4;
  const cam = {
    x: lerp(-0.6, 0, u), y: lerp(2.2, 3.0, u),
    z: lerp(-4, cubeZ - 2.35, u),           // ends just short of face-fill
    yaw: Math.atan2(0 - lerp(-0.6, 0, u), (cubeZ) - lerp(-4, cubeZ - 2.35, u)) * 0.25,
    pitch: lerp(-0.03, -0.02, u),
    f: (2 * Math.atan(24 / (2 * seg.mm))),
  };
  renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.0075 + 0.001 * SEGS.indexOf(seg) });
  // rim glows on frames / floating edges
  const gp = projectPoint([0, seg.ph * 0.9, cubeZ - 8], cam, W, H);
  if (gp) glow(ctx, gp[0], gp[1], 240, PAL.cyan, 0.12);
  // portal pass: face fills + dark cover at segment end
  const endU = clamp01((T - (seg.b - 0.28)) / 0.30);
  if (endU > 0 && T > 47.0) {
    ctx.fillStyle = `rgba(3,4,6,${ease(endU)})`;
    ctx.fillRect(0, 0, W, H);
  }
  // first recursion segment emerges from darkness (continuing portal_2)
  const inn = clamp01((T - seg.a) / 0.22);
  if (inn < 1 && seg.a >= 43.33) {
    ctx.fillStyle = `rgba(3,4,6,${1 - inn})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ═══════════════════════════════════════════ SCENE: SEVENTH (63.20–78.36)
export function scene_seventh(ctx, sec, T) {
  // near-silence darkness → door light → the laboratory emerges
  const aStrips = clamp01((T - ev('light_rect')) / 1.6);
  const aWalls = ease(clamp01((T - ev('room_emerge')) / 4.2));
  const aTable = ease(clamp01((T - ev('table_seen')) / 2.8));
  const aCube = ease(clamp01((T - ev('recognize')) / 1.8));
  const aMon = aCube;
  const doorA = clamp01((T - ev('light_rect')) / 1.0) * (1 - clamp01((T - 74) / 2.5));
  const cam = {
    x: pw(T, [[63.2, -0.25], [71, -0.1], [78.36, 0.05]]),
    y: pw(T, [[63.2, 1.62], [78.36, 1.40]]),
    z: pw(T, [[63.2, -16], [69, -8.5], [74.5, -1.5], [78.36, 3.1]]),
    yaw: 0, pitch: pw(T, [[63.2, 0.0], [78.36, -0.035]]),
    f: (2 * Math.atan(24 / (2 * 35))),
  };
  cam.yaw = Math.atan2(CUBE[0] - cam.x, (CUBE[2]) - cam.z) * 0.85;
  cam.pitch += Math.atan2(1.15 - cam.y, CUBE[2] - cam.z);
  const q = labQuads({ walls: aWalls, strips: aStrips, table: aTable, cube: aCube, mon: aMon, seams: aWalls },
    { skipFront: true, doorA });
  renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.030 + 0.06 * (1 - aWalls) });
  if (aStrips > 0.05) drawLabExtras(ctx, cam, T, { spot: aCube, stripGlow: aStrips });
  // door beacon glow before room emerges
  if (doorA > 0.03) {
    const dp = projectPoint([0, 1.3, 8.9], cam, W, H);
    if (dp) glow(ctx, dp[0], dp[1], 210 * doorA, PAL.white, 0.5 * doorA);
  }
  // deep darkness veil until recognition
  const veil = (1 - aWalls) * 0.55;
  if (veil > 0.02) {
    ctx.fillStyle = `rgba(3,4,6,${veil})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ═══════════════════════════════════════════ SCENE: LAB + monitor (78.36–90.45)
export function scene_lab(ctx, sec, T, feedCam = null) {
  // camera: acknowledge cube → slow turn to monitor → hold
  const turnU = ease(clamp01((T - 79.6) / 6.6));
  const cam = {
    x: pw(T, [[78.36, 0.35], [86, -0.05], [90.45, -0.1]]),
    y: 1.42,
    z: pw(T, [[78.36, 3.55], [86, 3.95], [90.45, 4.0]]),
    yaw: 0, pitch: -0.02,
    f: (2 * Math.atan(24 / (2 * 35))),
  };
  const aim = [
    lerp(CUBE[0], -2.0, turnU),
    lerp(1.05, 1.35, turnU),
    lerp(CUBE[2], 5.6, turnU),
  ];
  cam.yaw = Math.atan2(aim[0] - cam.x, aim[2] - cam.z);
  cam.pitch = Math.atan2(aim[1] - cam.y, aim[2] - cam.z);

  const q = labQuads({ seams: 1, strips: 1, table: 1, cube: 1, mon: 1 });
  renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.042 });
  drawLabExtras(ctx, cam, T, { spot: 1, stripGlow: 1 });
  return cam;
}

// monitor feed renderer target: draw the FEED image onto the monitor screen
export function drawMonitorFeed(ctx, cam, feedImgCanv, T, opts = {}) {
  const sp = MON.p.map((p) => projectPoint(p, cam, W, H));
  if (!sp.every(Boolean)) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sp[0][0], sp[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(sp[i][0], sp[i][1]);
  ctx.closePath();
  ctx.clip();
  // affine map from feed canvas (its own w/h) onto 3 projected corners
  const [p0, p1, p3] = [sp[0], sp[1], sp[3]];     // TL, TR, BL of screen quad
  const fw = feedImgCanv.width, fh = feedImgCanv.height;
  const x0 = p0[0], y0 = p0[1];
  const x1 = p1[0], y1 = p1[1];
  const x2 = p3[0], y2 = p3[1];
  const a = (x1 - x0) / fw, b = (y1 - y0) / fw;
  const c = (x2 - x0) / fh, d = (y2 - y0) / fh;
  ctx.setTransform(a, b, c, d, x0, y0);
  // slight feed flicker (deterministic)
  const flick = 0.94 + hash01(Math.floor(T * 24)) * 0.06;
  ctx.globalAlpha = (opts.alpha ?? 1) * flick;
  ctx.drawImage(feedImgCanv, 0, 0);
  // scanlines on glass
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < fh; y += 4) ctx.fillRect(0, y, fw, 1.6);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.restore();
  // glass sheen + bezel
  ctx.save();
  ctx.strokeStyle = 'rgba(150,180,210,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sp[0][0], sp[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(sp[i][0], sp[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  glow(ctx, (sp[0][0] + sp[2][0]) / 2, (sp[0][1] + sp[2][1]) / 2, 220, [90, 150, 210], 0.30 * (opts.alpha ?? 1));
}

// ═══════════════════════════════════════════ SCENE: PARADOX (90.45–103.62)
export function scene_paradox(ctx, sec, T) {
  const cam = {
    x: pw(T, [[90.45, 0.55], [97, 0.42], [103.62, 0.30]]),
    y: 1.55,
    z: pw(T, [[90.45, 1.75], [103.62, 2.55]]),
    yaw: 0, pitch: -0.035,
    f: (2 * Math.atan(24 / (2 * 35))),
  };
  cam.yaw = Math.atan2(-1.15 - cam.x, 5.5 - cam.z);
  cam.pitch = Math.atan2(1.32 - cam.y, 5.5 - cam.z);

  const q = labQuads({ seams: 1, strips: 1, table: 1, cube: 1, mon: 1 });
  renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.040 });
  drawLabExtras(ctx, cam, T, { spot: 1, stripGlow: 1 });

  // figures (turn from 100.6)
  const turnU = clamp01((T - ev('they_turn')) / 1.5);
  const figA = ease(clamp01((T - ev('researchers')) / 0.8));
  if (figA > 0) {
    drawFigure(ctx, cam, FIG0, T, turnU, figA);
    drawFigure(ctx, cam, FIG1, T + 0.4, Math.max(0, turnU - 0.14), figA);
  }
  return cam;
}

export function scene_paradox_probe(ctx, sec, T, cam) {
  // probe hovering behind the researchers (must be projected through the scene camera)
  const a = ease(clamp01((T - ev('probe_behind')) / 0.9));
  if (a <= 0 || !cam) return;
  const turnU = clamp01((T - ev('probe_turn')) / 1.3);
  const PP = [-0.08, 1.56, 3.30];
  const sharp = prog(T, 'ring_clear', 0.7);
  drawProbe(ctx, cam, PP, T, { alpha: a, face: 1 - 0.85 * ease(turnU), sharp });
}

// ═══════════════════════════════════════════ SCENE: ENDING (103.62–109.0)
export function scene_ending(ctx, sec, T) {
  // Phase A (103.66–105.4): pull back through the wall as the room collapses
  // Phase B (105.4–106.4): from cube-face darkness, pull out — cube on table
  // Phase C (106.4–109.0): settle into the OPENING composition (seamless loop)
  if (T < 105.4) {
    const u = easeIn(clamp01((T - 103.66) / (105.4 - 103.66)));
    const k = lerp(1, 0.05, clamp01((T - 104.75) / 0.65));    // collapse morph
    const cam = {
      x: lerp(0.30, 0.1, u),
      y: lerp(1.55, 1.45, u),
      z: lerp(2.55, -6.5, u),
      yaw: 0, pitch: Math.atan2(1.35 - lerp(1.55, 1.45, u), CUBE[2] - lerp(2.55, -6.5, u)) * 0.6,
      f: (2 * Math.atan(24 / (2 * 35))),
    };
    cam.yaw = Math.atan2(CUBE[0] - cam.x, CUBE[2] - cam.z) * 0.7;
    const q = labQuads({ seams: 1, strips: 1, table: 1, cube: 1, mon: 1, walls: 1 },
      { scaleK: k, skipFront: false });
    // outer shell glow: as it shrinks, edge it
    renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.05 });
    drawLabExtras(ctx, cam, T, { spot: 0.5, stripGlow: 0.5 });
    // darkness as the collapsed box face fills frame
    const fill = clamp01((T - 105.12) / 0.30);
    if (fill > 0) {
      ctx.fillStyle = `rgba(3,4,6,${ease(fill)})`;
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    // Phase B/C: extreme close on the cube face → opening pose
    const u = easeOut(clamp01((T - 105.4) / (107.55 - 105.4)));
    const hold = clamp01((T - 107.55) / 1.45);
    // opening camera pose at t≈0.45+: ang −0.17, rad 1.12, y 0.865
    const ang = lerp(0.02, -0.17, u);   // final pose == opening pose (seamless loop)
    const rad = lerp(0.34, 1.12, u);
    const cam = {
      x: CUBE[0] + Math.sin(ang) * rad,
      y: lerp(1.06, 1.010, u),
      z: CUBE[2] - Math.cos(ang) * rad,
      yaw: 0, pitch: 0,
      f: (2 * Math.atan(24 / (2 * 85))),
    };
    cam.yaw = Math.atan2(CUBE[0] - cam.x, CUBE[2] - cam.z);
    cam.pitch = Math.atan2(CUBE[1] - cam.y, CUBE[2] - cam.z);
    const q = labQuads({ seams: 1, strips: 1, table: 1, cube: 1, mon: 1 });
    if (process.env.DBG === '1') {
      console.error('ENDCAM', JSON.stringify({ T, u, cam,
        cubeC: projectPoint(CUBE, cam, W, H),
        cubeBL: projectPoint([0.5, 0.98, 5.35], cam, W, H),
        cubeTL: projectPoint([0.5, 1.08, 5.35], cam, W, H),
        tbl: projectPoint([0.55, 0.98, 5.4], cam, W, H),
        nf: q.length, ncube: q.filter(x => x.stroke && x.strokeA === 0.5).length }));
    }
    renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.045 });
    drawLabExtras(ctx, cam, T, { spot: u, stripGlow: 1 });
    // emerge from the face darkness
    if (T < 105.75) {
      ctx.fillStyle = `rgba(3,4,6,${1 - clamp01((T - 105.4) / 0.34)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

export const PROBE_POS = [-0.08, 1.56, 3.30];

export const SCENES = {
  object: scene_object,
  scan: scene_scan,
  chamber: scene_chamber,
  recursion: scene_recursion,
  seventh: scene_seventh,
  lab: scene_lab,
  paradox: scene_paradox,
  ending: scene_ending,
};

// monitor glass reflection of the probe (event probe_reflect)
export function drawProbeReflection(ctx, cam, T) {
  const u = clamp01((T - ev('probe_reflect')) / 0.8);
  if (u <= 0) return;
  const fade = T < 90.45 ? 0.95 : 0.35;
  const sp = MON.p.map((p) => projectPoint(p, cam, W, H));
  if (!sp.every(Boolean)) return;
  const cx = (sp[0][0] + sp[1][0] + sp[2][0] + sp[3][0]) / 4 + Math.sin(T * 0.9) * 6;
  const cy = (sp[0][1] + sp[1][1] + sp[2][1] + sp[3][1]) / 4;
  const hh = Math.hypot(sp[1][0] - sp[0][0], sp[1][1] - sp[0][1]);
  const r = hh * 0.30;
  ctx.save();
  ctx.globalAlpha = fade * u;
  ctx.fillStyle = 'rgba(4,5,8,0.92)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(112,214,247,${0.55 * u})`;
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,180,215,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  glow(ctx, cx, cy, r * 2.2, PAL.cyan, 0.22 * u * fade);
}

// feed-side exports (monitor's own viewpoint)
export { labQuads as labQuadsPub };
export function drawFigureForFeed(ctx, cam, t, turnU) {
  drawFigure(ctx, cam, FIG0, t, turnU, 1);
  drawFigure(ctx, cam, FIG1, t + 0.4, Math.max(0, turnU - 0.14), 1);
}
