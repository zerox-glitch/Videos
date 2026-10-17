// CHAPTER 0 — IGNITION. 0.0–4.0 s
// A cyan seed ignites in the void; dust spirals into three orbital rings,
// snaps into a geometric mandala, implodes, and detonates.
import { Camera } from '../lib/math3d.js';
import { C } from '../data.js';
import {
  TAU, clamp, lerp, seg, smooth, smoother, outCubic, inCubic, inExpo, outExpo,
  mulberry32, rgba, glow, bloom, anamorphic, grain, vignette, black, sine, hexRgb,
} from '../lib/gfx.js';

const cam = new Camera();
const rnd = mulberry32(4242);

/* ------------------------------------------------------------ structure */
const PHI = 1.618;

function circle3(n, r, tiltX, tiltY, phase) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + phase;
    let x = Math.cos(a) * r, y = Math.sin(a) * r, z = 0;
    let x1 = x * Math.cos(tiltY) + z * Math.sin(tiltY);
    let z1 = -x * Math.sin(tiltY) + z * Math.cos(tiltY);
    let y1 = y * Math.cos(tiltX) - z1 * Math.sin(tiltX);
    let z2 = y * Math.sin(tiltX) + z1 * Math.cos(tiltX);
    out.push([x1, y1, z2]);
  }
  return out;
}

const SC = 0.6;
const RINGS = [
  { pts: circle3(260, 300 * SC, 0.42, 0.0, 0), col: C.cyan },
  { pts: circle3(240, 262 * SC, 1.42, 0.55, 0.7), col: C.magenta },
  { pts: circle3(220, 330 * SC, -0.75, 1.15, 1.9), col: C.purple },
];

/* mandala: hexagon + hexagram + spokes + tick ring */
const V = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
const hexA = Array.from({ length: 6 }, (_, i) => V((i / 6) * TAU + Math.PI / 6, 330 * SC));
const hexB = Array.from({ length: 6 }, (_, i) => V((i / 6) * TAU + Math.PI / 2, 178 * SC));
const star = Array.from({ length: 6 }, (_, i) => V((i / 6) * TAU + Math.PI / 2, 250 * SC));

const GLYPH_LINES = [];
const push = (a, b) => GLYPH_LINES.push([a, b]);
for (let i = 0; i < 6; i++) {
  push(hexA[i], hexA[(i + 1) % 6]);
  push(hexB[i], hexB[(i + 2) % 6]);
  push(hexA[i], star[i]);
  push(hexA[i], hexB[i]);
}
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * TAU;
  push(V(a, 372 * SC), V(a, 392 * SC));
}
for (let i = 0; i < 48; i++) {
  const a = (i / 48) * TAU;
  push(V(a, 402 * SC), V(a, 414 * SC));
}

function glyphPts(n) {
  const pts = [];
  for (const [a, b] of GLYPH_LINES) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(2, Math.round(L / 9));
    for (let i = 0; i < k; i++) {
      const t = i / k;
      pts.push([lerp(a[0], b[0], t) + (rnd() - 0.5) * 3, lerp(a[1], b[1], t) + (rnd() - 0.5) * 3, (rnd() - 0.5) * 10]);
    }
  }
  return pts;
}
const GLYPH = glyphPts(1400);

const PARTS = [];
RINGS.forEach((ring, ri) => {
  ring.pts.forEach((p, i) => {
    const g = GLYPH[(i * 7 + ri * 113) % GLYPH.length];
    PARTS.push({
      ring: p, glyph: g,
      sw: 0.6 + rnd() * 0.9,
      delay: 0.55 + rnd() * 1.35,
      size: 0.9 + Math.pow(rnd(), 2.2) * 3.2,
      col: rnd(),
      ang: rnd() * TAU,
      speed: 0.7 + rnd() * 0.7,
    });
  });
});

const DUST = Array.from({ length: 220 }, () => ({
  p: [(rnd() - 0.5) * 3000, (rnd() - 0.5) * 1800, -1200 + rnd() * 2400],
  s: 0.5 + rnd() * 1.6, a: 0.05 + rnd() * 0.18, ph: rnd() * TAU,
}));

const STARS = Array.from({ length: 380 }, () => [rnd() * 1920, rnd() * 1080, 0.05 + rnd() * 0.35, rnd() * TAU]);

/* blast shell */
const SHELL = Array.from({ length: 340 }, () => {
  const th = rnd() * TAU, ph = Math.acos(2 * rnd() - 1);
  return {
    dir: [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)],
    sp: 0.55 + rnd() * 0.8, size: 0.8 + rnd() * 2.6, ph: rnd() * TAU,
  };
});

const IMPLODE = 3.05;
const BLAST = 3.42;

function stroke3(ctx, a, b, color, w, alpha) {
  const s = cam.segment(a, b);
  if (!s) return;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(s.x1, s.y1);
  ctx.lineTo(s.x2, s.y2);
  ctx.stroke();
}

export function draw(ctx, T, { W, H }) {
  const t = T;

  /* camera orbit + slow push */
  const orbit = lerp(-0.32, 0.22, smoother(seg(t, 0.4, 3.6)));
  const push = smooth(seg(t, 0, 3.1));
  const kick = t > BLAST ? Math.exp(-(t - BLAST) * 5.5) * 26 : 0;
  const R = lerp(900, 700, push) + kick;
  const eye = [Math.sin(orbit) * R, 40 + Math.cos(t * 0.5) * 8, Math.cos(orbit) * R];
  cam.set(eye, [0, 0, 0], { fov: lerp(46, 40, push), roll: Math.sin(t * 0.45) * 0.018 });
  cam.update(W, H);

  /* ---------------------------------------------------------- backdrop */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#010103');
  bg.addColorStop(0.5, '#03050E');
  bg.addColorStop(1, '#010104');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const neb = ctx.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, W * 0.55);
  neb.addColorStop(0, 'rgba(20,60,100,0.22)');
  neb.addColorStop(0.45, 'rgba(14,30,66,0.12)');
  neb.addColorStop(1, 'rgba(4,8,20,0)');
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [sx, sy, a, ph] of STARS) {
    const tw = 0.55 + 0.45 * Math.sin(t * 1.2 + ph);
    ctx.globalAlpha = a * tw * 0.6;
    ctx.fillStyle = '#CBEFFF';
    ctx.fillRect(sx, sy, 1.3, 1.3);
  }
  ctx.restore();

  /* ------------------------------------------------------------ dust */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const d of DUST) {
    const p = cam.project([d.p[0] * (1 - push * 0.15) + Math.sin(t * 0.2 + d.ph) * 18, d.p[1] + Math.cos(t * 0.17 + d.ph) * 12, d.p[2]]);
    if (!p) continue;
    const fade = clamp(1 - p.d / 2600);
    glow(ctx, p.x, p.y, d.s * 3.2, '#6FCFFF', d.a * fade);
  }
  ctx.restore();

  /* --------------------------------------------------------- particles */
  const implode = t >= IMPLODE;
  const iscale = implode ? Math.max(0, Math.pow(1 - clamp((t - IMPLODE) / 0.24), 0.4)) : 1;

  const spin = t * 0.34 + smooth(seg(t, 2.5, IMPLODE)) * 2.4;
  const tilt = 0.12 + Math.sin(t * 0.4) * 0.06;
  const cs = Math.cos(spin), sn = Math.sin(spin);
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const XF = p => {
    const x = p[0] * cs + p[2] * sn;
    const z = -p[0] * sn + p[2] * cs;
    const y = p[1] * ct - z * st;
    const z2 = p[1] * st + z * ct;
    return [x, y, z2];
  };

  const ringPhase = seg(t, 1.45, 2.0);
  const glyphPhase = smooth(seg(t, 2.02, 2.62));

  /* energy filaments on the mandala */
  if (t > 2.42 && t < IMPLODE + 0.1) {
    const a = smooth(seg(t, 2.42, 2.72)) * (1 - smooth(seg(t, IMPLODE - 0.15, IMPLODE + 0.05)));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < GLYPH_LINES.length; i++) {
      const [p, q] = GLYPH_LINES[i];
      const A = XF([p[0] * iscale, p[1] * iscale, 0]);
      const B = XF([q[0] * iscale, q[1] * iscale, 0]);
      stroke3(ctx, A, B, i % 3 === 1 ? C.magenta : C.cyan, 8, 0.05 * a);
      stroke3(ctx, A, B, i % 3 === 1 ? C.magenta : C.cyanSoft, 1.4, 0.3 * a);
      stroke3(ctx, A, B, '#FFFFFF', 0.7, 0.22 * a);
    }
    ctx.restore();
  }

  /* particles */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < PARTS.length; i++) {
    const P = PARTS[i];
    const e1 = smooth(seg(t, P.delay, P.delay + 1.25));
    if (e1 <= 0) continue;

    // spiral in from a wide sphere to the ring
    const ang = (1 - e1) * 3.1 * P.speed + P.ang;
    const rad = lerp(2.1, 1.0, outCubic(e1));
    let p = [P.ring[0] * rad, P.ring[1] * rad, P.ring[2] * rad];
    const ca = Math.cos(ang), sa = Math.sin(ang);
    p = [p[0] * ca - p[1] * sa, p[0] * sa + p[1] * ca, p[2]];

    // settle into the mandala
    if (glyphPhase > 0) {
      const g = P.glyph;
      p = [lerp(p[0], g[0], glyphPhase), lerp(p[1], g[1], glyphPhase), lerp(p[2], g[2], glyphPhase)];
    }
    // micro orbit + implosion
    const orb = t < IMPLODE ? Math.sin(t * 2 + i) * 2.2 : 0;
    p = [(p[0] + orb) * iscale, (p[1] + orb) * iscale, p[2] * iscale];

    const w = XF(p);
    const s = cam.project(w);
    if (!s || s.d < 6) continue;

    const depth = clamp(1.35 - (s.d - 380) / 950, 0.3, 1.4);
    const col = P.col > 0.9 ? '#FF9AD5' : P.col > 0.68 ? '#B79CFF' : '#7DF4FF';
    const flick = 0.75 + 0.25 * Math.sin(t * 7 + i * 1.9);
    const a = e1 * depth * flick * (implode ? 0.55 : 1);
    const r = P.size * (0.9 + (1 - e1) * 2.2) * (0.65 + depth * 0.6);

    // motion streak
    if (e1 > 0.2 && e1 < 0.98) {
      const back = XF([p[0] * 0.985, p[1] * 0.985, p[2] * 0.985]);
      const s2 = cam.project(back);
      if (s2) {
        ctx.strokeStyle = rgba(col, 0.4 * a);
        ctx.lineWidth = Math.max(0.6, r * 0.3);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
      }
    }
    glow(ctx, s.x, s.y, r * 2.6, col, 0.42 * a);
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = col;
    ctx.fillRect(s.x - r * 0.3, s.y - r * 0.3, r * 0.6, r * 0.6);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  /* orbit trails during the ring phase */
  if (ringPhase > 0 && t < 2.8) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = smooth(seg(t, 1.4, 1.85)) * (1 - smooth(seg(t, 2.45, 2.8)));
    for (const ring of RINGS) {
      ctx.strokeStyle = rgba(ring.col, 0.1 * a);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= ring.pts.length; i++) {
        const p = XF(ring.pts[i % ring.pts.length]);
        const s = cam.project(p);
        if (!s) { break; }
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* core */
  if (t > 0.48) {
    const p = cam.project([0, 0, 0]);
    if (p) {
      const beat = 0.84 + 0.16 * Math.sin(t * 7.2);
      const flash = t < IMPLODE ? 1 : Math.max(0, 1 - (t - IMPLODE) * 1.1);
      const blastGlow = t > BLAST ? Math.exp(-(t - BLAST) * 3.4) : 0;
      const a = smooth(seg(t, 0.5, 0.85)) * Math.max(flash, blastGlow * 1.4);
      if (a > 0.002) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, p.x, p.y, 46 * beat * (1 + blastGlow * 3), C.cyan, 0.85 * a);
        glow(ctx, p.x, p.y, 12 * beat, '#F2FFFF', a);
        const len = 420 * (1 + blastGlow * 2.4);
        const hg = ctx.createLinearGradient(p.x - len, 0, p.x + len, 0);
        hg.addColorStop(0, 'rgba(70,200,255,0)');
        hg.addColorStop(0.42, `rgba(120,230,255,${0.28 * a})`);
        hg.addColorStop(0.5, `rgba(255,255,255,${0.75 * a})`);
        hg.addColorStop(0.58, `rgba(120,230,255,${0.28 * a})`);
        hg.addColorStop(1, 'rgba(70,200,255,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(p.x - len, p.y - 1.6, len * 2, 3.2);
        const vs = 90 * (1 + blastGlow);
        const vg = ctx.createLinearGradient(0, p.y - vs, 0, p.y + vs);
        vg.addColorStop(0, 'rgba(120,230,255,0)');
        vg.addColorStop(0.5, `rgba(210,250,255,${0.3 * a})`);
        vg.addColorStop(1, 'rgba(120,230,255,0)');
        ctx.fillStyle = vg;
        ctx.fillRect(p.x - 0.8, p.y - vs, 1.6, vs * 2);
        ctx.restore();
      }
    }
  }

  /* flash on detonation */
  if (t > IMPLODE && t < IMPLODE + 0.32) {
    const a = Math.pow(1 - smooth(seg(t, IMPLODE, IMPLODE + 0.26)), 2.2);
    const p = cam.project([0, 0, 0]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (p) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, W * 0.62);
      g.addColorStop(0, `rgba(235,255,255,${a})`);
      g.addColorStop(0.25, `rgba(160,240,255,${a * 0.75})`);
      g.addColorStop(0.6, `rgba(70,160,220,${a * 0.22})`);
      g.addColorStop(1, 'rgba(10,20,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  /* shockwave: tilted ring + particle shell */
  const wt = t - BLAST;
  if (wt > 0) {
    const R0 = 5200 * Math.pow(clamp(wt / 1.7), 0.92);
    const a = Math.pow(1 - clamp(wt / 1.9), 1.25);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // ring in a tilted plane
    const tiltR = 1.02;
    const ringAt = (rr, col, w, al) => {
      if (rr < 3) return;
      ctx.strokeStyle = rgba(col, al);
      ctx.lineWidth = w;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 150; i++) {
        const th = (i / 150) * TAU;
        const n = 1 + Math.sin(th * 7 + wt * 4) * 0.012 + Math.sin(th * 3 - wt * 3) * 0.008;
        const x = Math.cos(th) * rr * n;
        const y0 = Math.sin(th) * rr * n;
        const y = y0 * Math.cos(tiltR);
        const z = y0 * Math.sin(tiltR);
        const sp = cam.project([x, y, z]);
        if (!sp) { started = false; continue; }
        if (!started) { ctx.moveTo(sp.x, sp.y); started = true; } else ctx.lineTo(sp.x, sp.y);
      }
      ctx.stroke();
    };
    // hot leading edge with a trailing tail
    ringAt(R0, '#FFFFFF', 2.4, a * 0.95);
    for (let k = 1; k < 6; k++) {
      const off = k * (18 + R0 * 0.012);
      ringAt(R0 - off, k % 2 ? C.cyanSoft : '#7FD8FF', 2 + k * 2.2, a * 0.42 / k);
    }
    ringAt(R0 + 12, C.cyan, 40, a * 0.14);
    // radial shock streaks
    for (let i = 0; i < 72; i++) {
      const th = (i / 72) * TAU + Math.sin(i * 3.1) * 0.02;
      const r0 = R0 * (0.86 + (i % 5) * 0.02);
      const r1 = R0 * (1.02 + (i % 7) * 0.05);
      const A = cam.project([Math.cos(th) * r0, Math.sin(th) * r0 * Math.cos(tiltR), Math.sin(th) * r0 * Math.sin(tiltR)]);
      const B = cam.project([Math.cos(th) * r1, Math.sin(th) * r1 * Math.cos(tiltR), Math.sin(th) * r1 * Math.sin(tiltR)]);
      if (!A || !B) continue;
      ctx.strokeStyle = rgba(i % 3 ? C.cyanSoft : '#FFFFFF', a * 0.35);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    ctx.restore();

    // spherical debris shell
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of SHELL) {
      const rr = outCubic(clamp(wt / 1.3)) * 2500 * (0.35 + d.sp * 0.65);
      const s = cam.project([d.dir[0] * rr, d.dir[1] * rr, d.dir[2] * rr]);
      if (!s) continue;
      const aa = a * (0.35 + 0.5 * Math.sin(wt * 9 + d.ph));
      glow(ctx, s.x, s.y, d.size * (2.6 + wt * 3), d.col || '#9FF0FF', aa * 0.7);
    }
    ctx.restore();
  }

  /* ------------------------------------------------ blast-through whiteout */
  if (t > 3.66) {
    const a = Math.pow(smooth(seg(t, 3.66, 4.0)), 1.7);
    const p = cam.project([0, 0, 0]) || { x: W / 2, y: H / 2 };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, W * 0.85);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
    g.addColorStop(0.3, `rgba(190,245,255,${0.6 * a})`);
    g.addColorStop(0.7, `rgba(60,150,220,${0.22 * a})`);
    g.addColorStop(1, 'rgba(10,30,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* --------------------------------------------------------------- post */
  bloom(ctx, W, H, { strength: 0.5, threshold: 0.5, radius: 14 });
  anamorphic(ctx, W, H, { strength: t > 3.3 ? 0.75 * (1 - seg(t, 3.4, 3.95)) : 0.3, color: '#6BEFFF', threshold: 0.6 });
  grain(ctx, W, H, t, 0.03);
  vignette(ctx, W, H, 0.75);
  black(ctx, W, H, 1 - smooth(seg(t, 0, 0.8)));
}
