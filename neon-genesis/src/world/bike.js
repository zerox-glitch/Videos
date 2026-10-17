// A low-poly hover-sport bike with a rider, drawn as real 3D geometry.
import { C } from '../data.js';
import { clamp, rgba, glow, mixHex, TAU } from '../lib/gfx.js';
import { norm, cross } from '../lib/math3d.js';

// profile in (z, y), front at -z
const PROFILE = [
  [-8.4, 5.0], [-7.0, 6.1], [-4.6, 6.9], [-1.2, 7.0],
  [1.6, 6.4], [6.0, 6.5], [6.9, 5.4], [5.6, 4.3],
  [1.4, 3.3], [-2.2, 3.5], [-5.6, 4.1],
];
const HW = 1.7;

function makeTransform(pos, yaw, lean) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cl = Math.cos(lean), sl = Math.sin(lean);
  return p => {
    // lean about z, then yaw about y, then translate
    const x0 = p[0] * cl - p[1] * sl;
    const y0 = p[0] * sl + p[1] * cl;
    const x1 = x0 * cy - p[2] * sy;
    const z1 = x0 * sy + p[2] * cy;
    return [pos[0] + x1, pos[1] + y0, pos[2] + z1];
  };
}

function fillPoly(ctx, cam, pts, col, alpha = 1) {
  const s = cam.poly(pts);
  if (!s) return null;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.globalAlpha = 1;
  return s;
}

export function drawBike(ctx, cam, pos, { yaw = 0, lean = 0, t = 0, speed = 0, scale = 1 } = {}) {
  const T = makeTransform(pos, yaw, lean);
  const W = HW * scale;

  // hover underglow on the asphalt
  const gp = cam.project([pos[0], 0.35, pos[2]]);
  if (gp) {
    const gr = clamp(900 / Math.max(gp.d, 20), 8, 120) * scale;
    const g = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, gr);
    g.addColorStop(0, rgba(C.cyan, 0.5));
    g.addColorStop(0.4, rgba(C.purple, 0.22));
    g.addColorStop(1, rgba(C.cyan, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(gp.x - gr, gp.y - gr * 0.5, gr * 2, gr);
    ctx.restore();
  }

  /* ---- wheels */
  for (const wz of [-6.4, 6.2]) {
    const R = 2.9 * scale;
    const cy = 2.9 * scale;
    const pts = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU;
      pts.push(T([0, cy + Math.sin(a) * R, wz + Math.cos(a) * R]));
    }
    const s = cam.poly(pts);
    if (s) {
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
      ctx.closePath();
      ctx.fillStyle = '#05070C';
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(C.cyan, 0.95);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = rgba(C.cyan, 0.18);
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.restore();
    }
    const c = cam.project(T([0, cy, wz]));
    if (c) {
      const rr = clamp((2.9 * scale) * (cam.H / (2 * Math.tan((cam.fov * Math.PI) / 360))) / Math.max(c.d, 1), 0.6, 40);
      glow(ctx, c.x, c.y, rr * 1.2, C.cyanSoft, 0.35);
      glow(ctx, c.x, c.y, rr * 0.4, '#DFFEFF', 0.5);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(C.magentaSoft, 0.45);
      ctx.lineWidth = Math.max(1, rr * 0.1);
      for (let k = 0; k < 4; k++) {
        const an = t * 14 + (k * TAU) / 4;
        ctx.beginPath();
        ctx.moveTo(c.x - Math.cos(an) * rr * 0.82, c.y - Math.sin(an) * rr * 0.82);
        ctx.lineTo(c.x + Math.cos(an) * rr * 0.82, c.y + Math.sin(an) * rr * 0.82);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ---- body: extruded profile */
  const parts = [];
  const left = PROFILE.map(([z, y]) => T([-W, y * scale, z * scale]));
  const right = PROFILE.map(([z, y]) => T([W, y * scale, z * scale]));
  // side faces
  const lc = cam.toView(left[0]);
  const rc = cam.toView(right[0]);
  const eyeX = cam.eye[0];
  const bodyCol = '#0A1018';
  const lit = mixHex('#0C1522', '#1B2E46', 0.6);

  // top/bottom skin between the two profiles
  const n = PROFILE.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const q = [left[i], left[j], right[j], right[i]];
    const mid = [(left[i][0] + right[j][0]) / 2, (left[i][1] + right[j][1]) / 2, (left[i][2] + right[j][2]) / 2];
    const d = -cam.toView(mid)[2];
    parts.push({ q, d, col: i < 6 ? lit : bodyCol });
  }
  // rear face
  parts.push({
    q: [T([-W, 4.3 * scale, 6.9 * scale]), T([W, 4.3 * scale, 6.9 * scale]), T([W, 6.5 * scale, 6.9 * scale]), T([-W, 6.5 * scale, 6.9 * scale])],
    d: -cam.toView(T([0, 5.4 * scale, 6.9 * scale]))[2],
    col: '#070B12',
  });
  // side plates
  parts.push({ q: left, d: -cam.toView(T([-W, 5 * scale, 0]))[2], col: '#060A11' });
  parts.push({ q: right.reverse(), d: -cam.toView(T([W, 5 * scale, 0]))[2], col: '#060A11' });

  parts.sort((a, b) => b.d - a.d);
  for (const p of parts) fillPoly(ctx, cam, p.q, p.col);

  /* ---- neon strips along the fairing */
  const strips = [
    [T([0, 6.98 * scale, -1.2 * scale]), T([0, 6.45 * scale, 1.6 * scale])],
    [T([0, 5.9 * scale, -6.9 * scale]), T([0, 6.85 * scale, -4.4 * scale])],
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [a, b] of strips) {
    const s = cam.segment(a, b);
    if (!s) continue;
    ctx.strokeStyle = rgba(C.cyan, 0.9);
    ctx.lineWidth = 2.4 * scale;
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    ctx.strokeStyle = rgba(C.cyanSoft, 0.25);
    ctx.lineWidth = 9 * scale;
    ctx.stroke();
  }
  // tail light
  const tl = cam.project(T([0, 6.1 * scale, 7.2 * scale]));
  if (tl) {
    glow(ctx, tl.x, tl.y, 9 * scale, C.magenta, 0.95);
    glow(ctx, tl.x, tl.y, 24 * scale, C.magenta, 0.35);
  }
  // headlight
  const hl = cam.project(T([0, 5.9 * scale, -8.9 * scale]));
  if (hl) glow(ctx, hl.x, hl.y, 14 * scale, '#DFFFFF', 0.9);
  ctx.restore();

  /* ---- rider */
  const seat = T([0, 6.6 * scale, 1.4 * scale]);
  const shoulder = T([0, 9.1 * scale, -0.9 * scale]);
  const hipL = T([-1.1 * scale, 6.7 * scale, 1.6 * scale]);
  const hipR = T([1.1 * scale, 6.7 * scale, 1.6 * scale]);
  const head = T([0, 9.9 * scale, -2.2 * scale]);
  // legs
  ctx.strokeStyle = '#080C14';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.4 * scale;
  for (const hip of [hipL, hipR]) {
    const knee = T([hip[0] < pos[0] ? -2.8 : 2.8, 6.4 * scale, 2.6 * scale]);
    const s1 = cam.segment(hip, knee);
    if (s1) { ctx.beginPath(); ctx.moveTo(s1.x1, s1.y1); ctx.lineTo(s1.x2, s1.y2); ctx.stroke(); }
  }
  // torso
  const torso = fillPoly(ctx, cam, [
    T([-1.1 * scale, 6.3 * scale, 1.5 * scale]), T([1.1 * scale, 6.3 * scale, 1.5 * scale]),
    T([1.9 * scale, 8.6 * scale, -0.9 * scale]), T([-1.9 * scale, 8.6 * scale, -0.9 * scale]),
  ], '#0B111B');
  // arms
  ctx.strokeStyle = '#0A0F18';
  ctx.lineWidth = 2.2 * scale;
  for (const sx of [-1, 1]) {
    const sh = T([sx * 1.9 * scale, 8.9 * scale, -0.6 * scale]);
    const hand = T([sx * 2.9 * scale, 7.3 * scale, -5.6 * scale]);
    const s = cam.segment(sh, hand);
    if (s) { ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); }
  }
  // helmet
  const hp = cam.project(head);
  if (hp) {
    const r = clamp((1.5 * scale) * (cam.H / (2 * Math.tan((cam.fov * Math.PI) / 360))) / Math.max(hp.d, 1), 1, 30);
    ctx.fillStyle = '#070B12';
    ctx.beginPath();
    ctx.ellipse(hp.x, hp.y, r, r * 1.05, 0, 0, TAU);
    ctx.fill();
    // visor
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(C.magenta, 0.85);
    ctx.beginPath();
    ctx.ellipse(hp.x + r * 0.15, hp.y - r * 0.1, r * 0.55, r * 0.22, 0.15, 0, TAU);
    ctx.fill();
    glow(ctx, hp.x, hp.y, r * 2.2, C.magenta, 0.25);
    ctx.restore();
  }
  // shoulder rim light
  if (torso) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(C.purpleSoft, 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(torso[0].x, torso[0].y);
    ctx.lineTo(torso[3].x, torso[3].y);
    ctx.stroke();
    ctx.restore();
  }
  return { seat, shoulder, head, T };
}

/** Light ribbon trailing the bike: two offset curves fading into the dark. */
export function drawTrail(ctx, cam, points, color, width, alpha = 1) {
  if (points.length < 3) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const u = i / (points.length - 1);
      const s = cam.segment(a, b);
      if (!s) continue;
      const fade = Math.pow(1 - u, 1.6) * alpha;
      ctx.strokeStyle = rgba(color, (pass ? 0.12 : 0.85) * fade);
      ctx.lineWidth = (pass ? width * 5 : width) * (1 - u * 0.75);
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
