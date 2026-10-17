// CHAPTER 1 — GENESIS. 4.0–10.0 s (local 0–6)
// The blast-wave grid ignites to the horizon and a megacity builds itself.
import { Camera } from '../lib/math3d.js';
import { C } from '../data.js';
import { clamp, lerp, seg, smooth, outCubic, mulberry32, rgba, glow, bloom, anamorphic, grain, vignette, black, mixHex } from '../lib/gfx.js';
import { buildCity, buildFarCity, drawCity, drawFarCity } from '../world/city.js';
import { drawGround, drawGrid, drawHaze, horizonY } from '../world/ground.js';
import { drawTraffic } from '../world/traffic.js';

export const CITY_NEAR = buildCity();
export const CITY_FAR = buildFarCity();

const cam = new Camera();
const rnd = mulberry32(777);
const STARS = Array.from({ length: 300 }, () => [rnd() * 1920, rnd() * 480, 0.04 + rnd() * 0.3, rnd() * 6.28]);

const BEAMS = [
  { x: -520, z: -1250, len: 1900, a: 0.5, sp: 0.10, ph: 0, base: 380 },
  { x: 760, z: -1750, len: 2200, a: 0.42, sp: -0.07, ph: 1.7, base: 420 },
  { x: -1240, z: -780, len: 1600, a: 0.34, sp: 0.13, ph: 3.1, base: 300 },
  { x: 320, z: -2150, len: 2000, a: 0.3, sp: 0.09, ph: 4.4, base: 460 },
];

export function draw(ctx, T, { W, H }) {
  const t = T;
  const u = clamp(t / 6);
  const accel = u * u * (1.6 - 0.6 * u);
  const fwd = 1250 - 1650 * accel;

  const eye = [Math.sin(t * 0.33) * 6, lerp(430, 172, smooth(seg(t, 0, 5.4))), fwd];
  const target = [Math.sin(t * 0.22) * 12, lerp(238, 268, smooth(u)), fwd - lerp(900, 1250, smooth(u))];
  cam.set(eye, target, { fov: lerp(54, 48, smooth(u)), roll: Math.sin(t * 0.35) * 0.006 });
  cam.update(W, H);

  const hy = horizonY(cam);

  /* ---------------------------------------------------------------- sky */
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010208');
  sky.addColorStop(0.3, '#040715');
  sky.addColorStop(0.6, '#071026');
  sky.addColorStop(0.85, '#0A1730');
  sky.addColorStop(1, '#0C1B33');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [sx, sy, a, ph] of STARS) {
    ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 1.1 + ph));
    ctx.fillStyle = '#CFEEFF';
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
  ctx.restore();

  /* -------------------------------------------------------- horizon glow */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(W * 0.5, hy, 0, W * 0.5, hy, W * 0.72);
  g.addColorStop(0, 'rgba(44,118,180,0.3)');
  g.addColorStop(0.28, 'rgba(24,60,118,0.16)');
  g.addColorStop(0.6, 'rgba(12,26,62,0.07)');
  g.addColorStop(1, 'rgba(4,8,22,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W * 0.72, hy + 40, 0, W * 0.72, hy + 40, W * 0.34);
  g.addColorStop(0, 'rgba(168,36,128,0.2)');
  g.addColorStop(1, 'rgba(60,10,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* -------------------------------------------------------------- ground */
  drawGround(ctx, cam, W, H);

  const wave = 0.58 + t;
  const wR = outCubic(clamp(wave / 1.9)) * 5400;
  const wA = Math.pow(1 - clamp(wave / 1.9), 1.6);
  const reveal = clamp(wR / 5400);

  drawGrid(ctx, cam, W, H, {
    t, spacing: 180, reach: 3800, alpha: 0.2, color: C.cyan,
    reveal: reveal * 1.1, front: { r: wR }, gap: 66, major: 3,
  });

  // ground shock ring
  if (wA > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const steps = 120;
    for (let k = 0; k < 3; k++) {
      const rr = wR - k * 46;
      if (rr < 8) continue;
      ctx.strokeStyle = rgba(k === 1 ? C.magenta : C.cyanSoft, wA * (k === 0 ? 0.5 : 0.22));
      ctx.lineWidth = 2 + 9 * wA;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const p = cam.project([Math.cos(a) * rr, 3, Math.sin(a) * rr]);
        if (!p) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ----------------------------------------------------------- far city */
  drawFarCity(ctx, cam, t, CITY_FAR, { maxDist: 8400 });

  /* ----------------------------------------------------------- near city */
  drawCity(ctx, cam, t, CITY_NEAR, { maxDist: 3600 });

  drawTraffic(ctx, cam, t, { alpha: smooth(seg(t, 1.6, 3.2)) });

  /* ---------------------------------------------------------- searchlights */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of BEAMS) {
    const ang = b.ph + t * b.sp;
    const top = b.base;
    const tip = [b.x + Math.cos(ang) * b.len * 0.5, top + Math.sin(ang * 0.7) * 300, b.z + Math.sin(ang) * b.len * 0.5];
    const s1 = cam.project([b.x, top, b.z]);
    const s2 = cam.project(tip);
    const sPerp = cam.project([b.x + Math.cos(ang + 1.57) * 60, top - 60, b.z + Math.sin(ang + 1.57) * 60]);
    if (!s1 || !s2 || !sPerp) continue;
    const dx = sPerp.x - s1.x, dy = sPerp.y - s1.y;
    const len = Math.hypot(s2.x - s1.x, s2.y - s1.y) || 1;
    const px = -(s2.y - s1.y) / len, py = (s2.x - s1.x) / len;
    const spread = Math.hypot(dx, dy) * 1.1 + len * 0.012;
    ctx.beginPath();
    ctx.moveTo(s1.x - px * 4, s1.y - py * 4);
    ctx.lineTo(s1.x + px * 4, s1.y + py * 4);
    ctx.lineTo(s2.x + px * spread, s2.y + py * spread);
    ctx.lineTo(s2.x - px * spread, s2.y - py * spread);
    ctx.closePath();
    const gg = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
    gg.addColorStop(0, rgba('#BFE9FF', b.a * 0.12));
    gg.addColorStop(0.35, rgba('#7FC7FF', b.a * 0.045));
    gg.addColorStop(1, 'rgba(90,150,255,0)');
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = rgba('#DFF6FF', b.a * 0.16);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
  }
  ctx.restore();

  /* ------------------------------------------------------------- atmosphere */
  // skyline glow — silhouettes the towers and fakes volumetric city light
  if (hy > -H * 0.4) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createLinearGradient(0, hy - H * 0.22, 0, hy + H * 0.06);
    sg.addColorStop(0, 'rgba(20,50,100,0)');
    sg.addColorStop(0.55, 'rgba(36,96,150,0.34)');
    sg.addColorStop(1, 'rgba(10,26,54,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, hy - H * 0.24, W, H * 0.32);
    const mg = ctx.createRadialGradient(W * 0.78, hy + 10, 0, W * 0.78, hy + 10, W * 0.42);
    mg.addColorStop(0, 'rgba(180,40,150,0.16)');
    mg.addColorStop(1, 'rgba(60,10,70,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(W * 0.3, hy - H * 0.3, W * 0.7, H * 0.5);
    ctx.restore();
  }
  if (hy > -H * 0.4) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hz2 = ctx.createLinearGradient(0, hy - H * 0.16, 0, hy + H * 0.3);
    hz2.addColorStop(0, 'rgba(14,32,70,0)');
    hz2.addColorStop(0.42, 'rgba(30,68,120,0.32)');
    hz2.addColorStop(0.62, 'rgba(16,40,80,0.2)');
    hz2.addColorStop(1, 'rgba(6,16,36,0)');
    ctx.fillStyle = hz2;
    ctx.fillRect(0, Math.max(0, hy - H * 0.2), W, H * 0.6);
    ctx.restore();
  }

  // horizon fog band (hides the ground plane edge)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bandH = H * 0.16;
  const bg = ctx.createLinearGradient(0, hy - bandH * 1.4, 0, hy + bandH * 0.5);
  bg.addColorStop(0, 'rgba(30,80,140,0)');
  bg.addColorStop(0.55, 'rgba(36,90,150,0.22)');
  bg.addColorStop(0.8, 'rgba(26,60,110,0.28)');
  bg.addColorStop(1, 'rgba(14,30,60,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, hy - bandH * 1.4, W, bandH * 2);
  ctx.restore();

  /* ---------------------------------------------------------------- post */
  bloom(ctx, W, H, { strength: 0.3, threshold: 0.7, radius: 10 });
  anamorphic(ctx, W, H, { strength: 0.28, color: '#57D8FF', threshold: 0.82 });
  grain(ctx, W, H, t, 0.038);
  vignette(ctx, W, H, 0.7);
  // the blast blinds us, then the world resolves
  if (t < 0.5) {
    const a = Math.pow(1 - smooth(seg(t, 0, 0.46)), 2.0);
    const cw = ctx.canvas.width, chh = ctx.canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cw * 0.5, chh * 0.46, 0, cw * 0.5, chh * 0.46, cw * 0.62);
    g.addColorStop(0, `rgba(235,252,255,${a * 0.8})`);
    g.addColorStop(0.35, `rgba(150,230,255,${a * 0.36})`);
    g.addColorStop(1, 'rgba(40,120,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, chh);
    ctx.restore();
  }
}
