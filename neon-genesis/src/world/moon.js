// The artificial moon: a machine world of panels and circuit seams inside
// three gyroscopic rings that align to reveal a geometric sigil.
import { C } from '../data.js';
import { mulberry32, clamp, lerp, rgba, glow, mixHex, TAU, smooth } from '../lib/gfx.js';

const rnd = mulberry32(2024);

export const MOON = { c: [0, 980, -3900], r: 470 };

/* ring plane rotations: [tiltX, tiltZ], target plane [0.42, 0] */
export const RINGS = [
  { r: 1300, tube: 70, a: [0.9, 0.35], b: [0.42, 0.0], spin: 0.09, col: '#8FE9FF', phase: 0.0, bright: 1 },
  { r: 1580, tube: 46, a: [-0.65, 1.15], b: [0.42, 0.0], spin: -0.06, col: '#B58CFF', phase: 1.4, bright: 0.8 },
  { r: 1860, tube: 26, a: [0.15, -0.95], b: [0.42, 0.0], spin: 0.045, col: '#FF6FBE', phase: 2.7, bright: 0.65 },
];

export function rotXZ(p, ax, az) {
  let y = p[1] * Math.cos(ax) - p[2] * Math.sin(ax);
  let z = p[1] * Math.sin(ax) + p[2] * Math.cos(ax);
  let x = p[0] * Math.cos(az) - y * Math.sin(az);
  let y2 = p[0] * Math.sin(az) + y * Math.cos(az);
  return [x, y2, z];
}

/* pre-computed surface detail */
const SEAMS = Array.from({ length: 26 }, () => ({
  th: rnd() * TAU,
  lat: -0.5 + rnd() * 1.0,
  len: 0.25 + rnd() * 0.7,
  w: 0.4 + rnd() * 1.2,
  glow: rnd(),
}));
const PANELS = Array.from({ length: 120 }, () => ({
  th: rnd() * TAU, lat: Math.acos(2 * rnd() - 1) - Math.PI / 2, s: 0.4 + rnd() * 1.4, a: 0.05 + rnd() * 0.2,
}));

export function drawMoon(ctx, cam, t, { align = 0, sym = 0, reveal = 1, energy = 1 } = {}) {
  const C0 = MOON.c, R = MOON.r;
  const dir = [cam.eye[0] - C0[0], cam.eye[1] - C0[1], cam.eye[2] - C0[2]];
  const dl = Math.hypot(...dir) || 1;
  const toward = [dir[0] / dl, dir[1] / dl, dir[2] / dl];

  /* ---------------------------------------------------------- back rings */
  const ringPts = (ring, seg = 220) => {
    const out = [];
    const ax = lerp(ring.a[0], ring.b[0], align);
    const az = lerp(ring.a[1], ring.b[1], align);
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * TAU + ring.phase + t * ring.spin;
      const p0 = [Math.cos(th) * ring.r * R / 950, 0, Math.sin(th) * ring.r * R / 950];
      const p = rotXZ(p0, ax, az);
      out.push([C0[0] + p[0], C0[1] + p[1], C0[2] + p[2]]);
    }
    return out;
  };

  const rings = RINGS.map(r => ringPts(r));
  const isFront = p => (p[0] - C0[0]) * toward[0] + (p[1] - C0[1]) * toward[1] + (p[2] - C0[2]) * toward[2] > 0;

  const drawRing = (ring, pts, frontOnly) => {
    ctx.save();
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (isFront(a) !== frontOnly) continue;
      const s = cam.segment(a, b);
      if (!s) continue;
      const depth = clamp(1 - s.d1 / 9000);
      const aa = ring.bright * (frontOnly ? 1 : 0.28) * depth;
      // body of the ring — solid metal that occludes the sphere behind it
      const tw = clamp(ring.tube * 900 / s.d1, 1, 26);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(26,46,66,${0.96 * aa})`;
      ctx.lineWidth = tw;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      ctx.strokeStyle = `rgba(58,96,126,${0.5 * aa})`;
      ctx.lineWidth = Math.max(1, tw * 0.34);
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      // lit edge
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(ring.col, 0.6 * aa);
      ctx.lineWidth = clamp(ring.tube * 300 / s.d1, 0.6, 8);
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      ctx.strokeStyle = rgba('#FFFFFF', 0.4 * aa);
      ctx.lineWidth = clamp(ring.tube * 90 / s.d1, 0.4, 2.6);
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    }
    ctx.restore();
  };

  rings.forEach((pts, i) => drawRing(RINGS[i], pts, false));

  /* ------------------------------------------------------------- sphere */
  const pc = cam.project(C0);
  if (!pc) return;
  const edge = cam.project([C0[0] + R, C0[1], C0[2]]);
  const rs = edge ? Math.abs(edge.x - pc.x) : 100;
  if (rs < 2) return;

  // body
  const g = ctx.createRadialGradient(pc.x - rs * 0.42, pc.y - rs * 0.46, rs * 0.04, pc.x, pc.y, rs * 1.1);
  g.addColorStop(0, '#6E9BB8');
  g.addColorStop(0.2, '#33536C');
  g.addColorStop(0.45, '#152534');
  g.addColorStop(0.72, '#0A131E');
  g.addColorStop(0.92, '#04080F');
  g.addColorStop(1, '#010307');
  ctx.beginPath();
  ctx.arc(pc.x, pc.y, rs, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();

  // surface meridian / parallel grid, clipped to the disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(pc.x, pc.y, rs * 0.995, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';

  const sph = (th, ph) => [
    C0[0] + R * Math.sin(ph) * Math.cos(th),
    C0[1] + R * Math.cos(ph),
    C0[2] + R * Math.sin(ph) * Math.sin(th),
  ];
  const facing = p => {
    const n = [(p[0] - C0[0]) / R, (p[1] - C0[1]) / R, (p[2] - C0[2]) / R];
    return n[0] * toward[0] + n[1] * toward[1] + n[2] * toward[2];
  };

  // latitudes (the machine's "bands")
  for (let i = 1; i < 14; i++) {
    const ph = Math.PI * (i / 14);
    ctx.beginPath();
    let started = false;
    for (let k = 0; k <= 90; k++) {
      const th = (k / 90) * TAU;
      const p = sph(th, ph);
      if (facing(p) < 0.04) { started = false; continue; }
      const s = cam.project(p);
      if (!s) { started = false; continue; }
      if (!started) { ctx.moveTo(s.x, s.y); started = true; } else ctx.lineTo(s.x, s.y);
    }
    ctx.strokeStyle = rgba('#6FD8FF', 0.22 + (i % 4 === 0 ? 0.22 : 0));
    ctx.lineWidth = i % 4 === 0 ? 1.4 : 0.7;
    ctx.stroke();
  }
  // meridians
  for (let i = 0; i < 18; i++) {
    const th = (i / 18) * TAU;
    ctx.beginPath();
    let started = false;
    for (let k = 0; k <= 70; k++) {
      const ph = -Math.PI / 2 + Math.PI * (k / 70);
      const p = sph(th, ph);
      if (facing(p) < 0.04) { started = false; continue; }
      const s = cam.project(p);
      if (!s) { started = false; continue; }
      if (!started) { ctx.moveTo(s.x, s.y); started = true; } else ctx.lineTo(s.x, s.y);
    }
    ctx.strokeStyle = rgba('#4FB8E0', 0.17);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  // glowing seams
  for (const sm of SEAMS) {
    const ph0 = sm.lat * Math.PI * 0.8;
    ctx.beginPath();
    let started = false;
    for (let k = 0; k <= 24; k++) {
      const a = sm.th + (k / 24) * sm.len * TAU * 0.15;
      const p = sph(a, ph0 + Math.sin((k / 24) * Math.PI) * 0.12);
      if (facing(p) < 0.02) { started = false; continue; }
      const s = cam.project(p);
      if (!s) { started = false; continue; }
      if (!started) { ctx.moveTo(s.x, s.y); started = true; } else ctx.lineTo(s.x, s.y);
    }
    ctx.strokeStyle = rgba(sm.glow > 0.6 ? C.magenta : C.cyan, 0.3 + sm.glow * 0.4);
    ctx.lineWidth = 1 + sm.w;
    ctx.stroke();
  }

  // panel speckle
  for (const pn of PANELS) {
    const p = sph(pn.th, pn.lat);
    if (facing(p) < 0.1) continue;
    const s = cam.project(p);
    if (!s) continue;
    ctx.fillStyle = rgba('#8FE4FF', Math.min(1, pn.a * 1.5));
    ctx.fillRect(s.x, s.y, pn.s * 1.6, pn.s * 1.1);
  }

  // terminator: darken the lower-right limb
  const term = ctx.createLinearGradient(pc.x + rs * 0.2, pc.y - rs * 0.6, pc.x + rs * 0.9, pc.y + rs * 0.8);
  term.addColorStop(0, 'rgba(0,0,0,0)');
  term.addColorStop(0.55, 'rgba(2,4,10,0.45)');
  term.addColorStop(1, 'rgba(1,2,6,0.96)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = term;
  ctx.fillRect(pc.x - rs, pc.y - rs, rs * 2, rs * 2);
  ctx.restore();

  // limb light
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#9BE9FF', 0.5 * reveal);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(pc.x, pc.y, rs * 0.995, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = rgba('#BFEFFF', 0.1 * reveal);
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.restore();

  /* --------------------------------------------------------- energy core */
  const coreR = rs * 0.19;
  const pulse = 0.86 + 0.14 * Math.sin(t * 1.6) + 0.06 * Math.sin(t * 4.3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(pc.x, pc.y, 0, pc.x, pc.y, coreR * 2.1 * pulse);
  cg.addColorStop(0, `rgba(255,255,255,${0.95 * energy})`);
  cg.addColorStop(0.12, `rgba(180,250,255,${0.7 * energy})`);
  cg.addColorStop(0.35, `rgba(60,170,255,${0.25 * energy})`);
  cg.addColorStop(1, 'rgba(20,60,140,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(pc.x, pc.y, coreR * 2.1 * pulse, 0, TAU);
  ctx.fill();
  glow(ctx, pc.x, pc.y, coreR * 0.7, '#EAFEFF', 0.85 * energy);
  // iris rings
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = rgba(i === 1 ? C.magenta : C.cyanSoft, 0.5 - i * 0.12);
    ctx.lineWidth = i === 0 ? 2.4 : 1.1;
    ctx.beginPath();
    ctx.arc(pc.x, pc.y, coreR * (1.35 + i * 0.42) * pulse, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  /* --------------------------------------------------------- sigil */
  if (sym > 0.001) {
    const ax = lerp(0.42, 0.42, align), az = 0;
    const S = R * 1.45;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const put = (p) => {
      const q = rotXZ([p[0], p[1], 0], ax, az);
      return [C0[0] + q[0], C0[1] + q[1], C0[2] + q[2]];
    };
    const line = (p, q, col, w, a) => {
      const s = cam.segment(put(p), put(q));
      if (!s) return;
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    };
    const A = smooth(clamp(sym)) ;
    // outer rings
    for (const rr of [1.0, 0.92, 0.55]) {
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const th = (i / 90) * TAU;
        const s = cam.project(put([Math.cos(th) * S * rr, Math.sin(th) * S * rr, 0]));
        if (!s) continue;
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      }
      ctx.strokeStyle = rgba(C.cyanSoft, 0.5 * A);
      ctx.lineWidth = rr === 0.92 ? 1 : 1.6;
      ctx.stroke();
    }
    // hexagram
    const hex = [];
    for (let i = 0; i < 6; i++) hex.push([Math.cos((i / 6) * TAU + Math.PI / 2) * S * 0.78, Math.sin((i / 6) * TAU + Math.PI / 2) * S * 0.78]);
    for (let i = 0; i < 6; i++) {
      line(hex[i], hex[(i + 2) % 6], C.magenta, 1.2, 0.42 * A);
      line([0, 0], hex[i], C.cyan, 0.9, 0.22 * A);
    }
    // ticks
    for (let i = 0; i < 48; i++) {
      const th = (i / 48) * TAU;
      const r0 = S * (i % 4 === 0 ? 0.86 : 0.9), r1 = S * 0.96;
      line([Math.cos(th) * r0, Math.sin(th) * r0], [Math.cos(th) * r1, Math.sin(th) * r1], '#DFF9FF', 1, 0.5 * A);
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------- front rings */
  rings.forEach((pts, i) => drawRing(RINGS[i], pts, true));

  return { pc, rs };
}
