// CHAPTER 3 — ASCENSION. 16.0–22.0 s (local 0–6)
// A vertical launch past the towers; the artificial moon turns its rings.
import { Camera } from '../lib/math3d.js';
import { C } from '../data.js';
import { clamp, lerp, seg, smooth, smoother, outCubic, mulberry32, rgba, glow, bloom, anamorphic, grain, vignette, black, mixHex } from '../lib/gfx.js';
import { drawCity, drawFarCity, buildRidge } from '../world/city.js';
import { CITY_NEAR, CITY_FAR } from './genesis.js';
import { drawGround, drawHaze } from '../world/ground.js';
import { drawTraffic } from '../world/traffic.js';
import { drawMoon, MOON } from '../world/moon.js';

const cam = new Camera();
const rnd = mulberry32(3131);
const RIDGE = buildRidge();

const SHAFTS = Array.from({ length: 7 }, (_, i) => ({
  a: (i / 7) * Math.PI * 2 + rnd() * 0.4,
  len: 2600 + rnd() * 2200,
  w: 0.03 + rnd() * 0.05,
  col: rnd() > 0.5 ? '#8FE0FF' : '#B58CFF',
  ph: rnd() * 6.28,
}));

export function draw(ctx, T, { W, H }) {
  const t = T;

  /* launch → orbit */
  const launch = smooth(seg(t, 0, 1.6));
  const orbitA = lerp(-0.30, 0.34, smoother(seg(t, 1.45, 6)));
  const orbitR = 2150;
  const O = MOON.c;

  const orbEye = [
    O[0] + Math.sin(orbitA) * orbitR,
    O[1] - 440 + Math.sin(t * 0.5) * 22,
    O[2] + Math.cos(orbitA) * orbitR,
  ];
  const eye = [
    lerp(0, orbEye[0], launch),
    lerp(6, orbEye[1], Math.pow(launch, 0.85)),
    lerp(-2100, orbEye[2], launch),
  ];
  const target = [
    lerp(0, O[0], launch),
    lerp(lerp(40, 240, launch), O[1] - 160, launch),
    lerp(-3000, O[2] + 160, launch),
  ];
  cam.set(eye, target, {
    fov: lerp(58, 45, launch),
    roll: Math.sin(t * 0.32) * 0.02 + (1 - launch) * 0.05 * Math.sin(t * 7),
    near: 1, far: 20000,
  });
  cam.update(W, H);

  /* ---------------------------------------------------------------- sky */
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010106');
  sky.addColorStop(0.42, '#03050F');
  sky.addColorStop(0.75, '#061020');
  sky.addColorStop(1, '#0A1830');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // stars
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const st = mulberry32(999);
  for (let i = 0; i < 260; i++) {
    const x = st() * W, y = st() * H * 0.85, a = 0.05 + st() * 0.3, ph = st() * 6.28;
    ctx.globalAlpha = a * (0.45 + 0.55 * Math.sin(t * 1.1 + ph));
    ctx.fillStyle = '#CFEEFF';
    ctx.fillRect(x, y, 1.3, 1.3);
  }
  ctx.restore();

  /* halo behind the moon */
  const mc = cam.project(O);
  if (mc) {
    const rr = 2400;
    const g = ctx.createRadialGradient(mc.x, mc.y, 0, mc.x, mc.y, rr);
    g.addColorStop(0, 'rgba(40,120,190,0.22)');
    g.addColorStop(0.35, 'rgba(26,70,140,0.12)');
    g.addColorStop(1, 'rgba(6,14,34,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* light shafts from the core */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of SHAFTS) {
    const a0 = [O[0], O[1], O[2]];
    const tip = [
      O[0] + Math.cos(s.a + t * 0.05) * s.len,
      O[1] + Math.sin(s.a * 1.7 + t * 0.04) * s.len * 0.55,
      O[2] + 120,
    ];
    const p1 = cam.project(a0);
    const p2 = cam.project(tip);
    if (!p1 || !p2) continue;
    const g = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    g.addColorStop(0, rgba(s.col, 0.16));
    g.addColorStop(0.5, rgba(s.col, 0.05));
    g.addColorStop(1, rgba(s.col, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 90 * s.w * 20;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  /* --------------------------------------------------------------- city */
  // a sea of city light far below
  const hzY = H * 0.62;
  const sea = ctx.createLinearGradient(0, hzY - H * 0.1, 0, H);
  sea.addColorStop(0, 'rgba(10,26,48,0)');
  sea.addColorStop(0.35, 'rgba(12,30,54,0.55)');
  sea.addColorStop(0.7, 'rgba(8,20,38,0.9)');
  sea.addColorStop(1, 'rgba(4,10,22,1)');
  ctx.fillStyle = sea;
  ctx.fillRect(0, hzY - H * 0.1, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(W * 0.5, hzY, 0, W * 0.5, hzY, W * 0.62);
  lg.addColorStop(0, 'rgba(46,120,180,0.2)');
  lg.addColorStop(0.45, 'rgba(26,66,120,0.1)');
  lg.addColorStop(1, 'rgba(6,14,30,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // scattered ground lights
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = mulberry32(4242);
  for (let i = 0; i < 420; i++) {
    const a = gl() * Math.PI * 2, rr = 900 + gl() * 5200;
    const p = cam.project([Math.cos(a) * rr, 2, Math.sin(a) * rr * 0.7 - 1200]);
    if (!p) continue;
    ctx.globalAlpha = 0.1 + gl() * 0.4;
    ctx.fillStyle = gl() > 0.85 ? C.amber : gl() > 0.5 ? C.cyanSoft : '#9FD8FF';
    ctx.fillRect(p.x, p.y, 1.6, 1.4);
  }
  ctx.restore();
  drawCity(ctx, cam, 9, CITY_NEAR, { maxDist: 2400 });
  drawCity(ctx, cam, 60, RIDGE, { maxDist: 6000, fogMul: 0.45, windowDist: 4200, windowBoost: 0.75 });

  drawTraffic(ctx, cam, t, { alpha: 0.8 });

  // city glow on the cloud deck
  const cg = cam.project([0, 40, -1800]);
  if (cg) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cg.x, cg.y, 0, cg.x, cg.y, W * 0.5);
    g.addColorStop(0, 'rgba(60,130,180,0.16)');
    g.addColorStop(1, 'rgba(10,20,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* --------------------------------------------------------------- moon */
  const align = smooth(seg(t, 3.9, 4.9));
  const sym = smooth(seg(t, 4.65, 5.5));
  const energy = 1 + 0.25 * Math.sin(t * 2.2);
  const m = drawMoon(ctx, cam, t, { align, sym, reveal: launch, energy });

  /* debris drifting in front of the moon */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + t * 0.03;
    const rr = 1250 + (i % 7) * 130;
    const p = [O[0] + Math.cos(a) * rr, O[1] + Math.sin(a * 1.3) * 420, O[2] + Math.sin(a) * rr * 0.4 + 200];
    const s = cam.project(p);
    if (!s) continue;
    glow(ctx, s.x, s.y, 1.6 + (i % 3), i % 5 ? '#9FE8FF' : '#FF9AD5', 0.3);
  }
  ctx.restore();

  /* atmosphere / grade */
  drawHaze(ctx, cam, W, H, { t, strength: 0.28 });

  bloom(ctx, W, H, { strength: 0.34, threshold: 0.62, radius: 14 });
  anamorphic(ctx, W, H, { strength: 0.45, color: '#7FE8FF', threshold: 0.7 });
  grain(ctx, W, H, t, 0.035);
  vignette(ctx, W, H, 0.72);

}
