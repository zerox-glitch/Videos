// CHAPTER 4 — COLLAPSE. 22.0–27.0 s (local 0–5)
// The city freezes, shatters into light, and folds down into a chip die.
import { Camera } from '../lib/math3d.js';
import { C } from '../data.js';
import { clamp, lerp, seg, smooth, smoother, outCubic, inCubic, mulberry32, rgba, glow, bloom, anamorphic, grain, vignette, black, mixHex, TAU } from '../lib/gfx.js';
import { drawCity, buildRidge } from '../world/city.js';
import { CITY_NEAR } from './genesis.js';
import { drawDie, DIE } from '../world/die.js';
import { MOON } from '../world/moon.js';

const cam = new Camera();
const rnd = mulberry32(1212);



/* dust particles released by the towers */
const DUST = [];
for (let i = 0; i < 1100; i++) {
  const b = CITY_NEAR[Math.floor(rnd() * CITY_NEAR.length)];
  const hh = b.h * (0.25 + rnd() * 0.75);
  DUST.push({
    x: b.x + (rnd() - 0.5) * b.w, y: hh, z: b.z + (rnd() - 0.5) * b.d,
    d: rnd(), sp: 0.6 + rnd() * 0.9, ph: rnd() * TAU,
    col: rnd() > 0.86 ? C.magenta : rnd() > 0.55 ? C.cyanSoft : '#BFE4FF',
    size: 0.6 + rnd() * 2.2,
  });
}

export function draw(ctx, T, { W, H }) {
  const t = T;

  /* ---------------------------------------------------------- camera */
  let eye, target, fov = 48;
  if (t < 0.75) {
    const u = smooth(seg(t, 0, 0.75));
    eye = [0, lerp(760, 820, u), lerp(-1000, -1080, u)];
    target = [0, lerp(340, 300, u), -2500];
  } else if (t < 2.35) {
    const u = smoother(seg(t, 0.75, 2.35));
    eye = [0, lerp(820, 5600, u), lerp(-1080, 1700, u)];
    target = [0, lerp(300, 0, u), lerp(-2500, -800, u)];
    fov = lerp(48, 44, u);
  } else if (t < 3.3) {
    const u = smooth(seg(t, 2.35, 3.3));
    eye = [lerp(0, 1500, u), lerp(5600, 3700, u), lerp(1700, 2500, u)];
    target = [0, lerp(0, 120, u), -800];
    fov = lerp(44, 42, u);
  } else {
    const u = smooth(seg(t, 3.3, 5));
    eye = [lerp(2100, 3000, u), lerp(3900, 4000, u), lerp(3300, 5500, u)];
    target = [0, lerp(120, 900, u), -800];
    fov = lerp(42, 34, u);
  }
  cam.set(eye, target, { fov, roll: Math.sin(t * 0.4) * 0.01, near: 2, far: 22000 });
  cam.update(W, H);

  /* ------------------------------------------------------------ sky */
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010207');
  sky.addColorStop(1, '#050B18');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  /* ------------------------------------------------------ moon pulse */
  if (t < 1.1) {
    const mc = cam.project(MOON.c);
    if (mc) {
      const a = 1 - smooth(seg(t, 0.05, 0.85));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const rr = outCubic(clamp((t - k * 0.03) / 0.9)) * W * 1.1;
        ctx.strokeStyle = rgba(k ? C.magenta : C.cyanSoft, a * (k ? 0.25 : 0.6));
        ctx.lineWidth = 1 + 14 * a * (k ? 0.4 : 1);
        ctx.beginPath(); ctx.arc(mc.x, mc.y, rr, 0, TAU); ctx.stroke();
      }
      glow(ctx, mc.x, mc.y, 120 * a + 20, '#CFF9FF', a * 0.8);
      ctx.restore();
    }
  }

  /* -------------------------------------------------------- the city */
  const freeze = smooth(seg(t, 0.1, 0.45));
  const collapse = smooth(seg(t, 0.55, 2.5));
  const cityFade = 1 - smooth(seg(t, 2.1, 2.75));

  if (cityFade > 0.01) {
    ctx.save();
    ctx.globalAlpha = cityFade;
    drawCity(ctx, cam, 9, CITY_NEAR, {
      maxDist: 12000, collapse: clamp(collapse * 1.15), freeze,
      windowBoost: 1 + collapse * 1.5, fogMul: 0.6, windowDist: 2600,
    });
    ctx.restore();
  }

  /* -------------------------------------------------- disintegrating dust */
  if (t > 0.55 && t < 3.2) {
    const dc = smooth(seg(t, 0.55, 2.55));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of DUST) {
      const u = clamp(dc * 1.35 - p.d * 0.35);
      if (u <= 0) continue;
      const fall = inCubic(u);
      const swirl = u * 2.2 + p.ph;
      const x = lerp(p.x, p.x * 0.15, fall) + Math.sin(swirl) * 60 * (1 - u) * p.sp;
      const y = lerp(p.y, DIE.h + 12, fall) + Math.sin(u * Math.PI) * 40;
      const z = lerp(p.z, DIE.c[2] + (p.z - DIE.c[2]) * 0.1, fall) + Math.cos(swirl * 0.8) * 60 * (1 - u);
      const s = cam.project([x, y, z]);
      if (!s) continue;
      const a = (1 - smooth(seg(t, 2.6, 3.15))) * clamp(0.25 + 0.6 * (1 - u));
      glow(ctx, s.x, s.y, p.size * 2.6 * (1 + u), p.col, 0.3 * a);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      ctx.fillRect(s.x - p.size * 0.4, s.y - p.size * 0.4, p.size * 0.8, p.size * 0.8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------- die */
  const dieIn = smooth(seg(t, 1.95, 2.9));
  if (dieIn > 0.01) {
    const p0 = cam.project([DIE.c[0] - DIE.half, DIE.h, DIE.c[2] - DIE.half]);
    const p1 = cam.project([DIE.c[0] + DIE.half, DIE.h, DIE.c[2] + DIE.half]);
    const wpx = p0 && p1 ? Math.hypot(p1.x - p0.x, p1.y - p0.y) : 0;
    const detail = clamp((wpx / W - 0.16) / 0.34);
    ctx.save();
    ctx.globalAlpha = dieIn;
    drawDie(ctx, cam, t, { rise: dieIn, alpha: dieIn, chase: smooth(seg(t, 2.9, 4.2)), detail });
    ctx.restore();
  }

  /* --------------------------------------------------------- particles → circuit */
  if (t > 2.3 && t < 4.4) {
    const a = smooth(seg(t, 2.3, 3.0)) * (1 - smooth(seg(t, 3.8, 4.4)));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) {
      const ang = (i / 60) * TAU + t * 0.4;
      const rr = 2300 + Math.sin(i * 7.3) * 300;
      const p = cam.project([Math.cos(ang) * rr, DIE.h + 20, DIE.c[2] + Math.sin(ang) * rr]);
      if (!p) continue;
      glow(ctx, p.x, p.y, 3 + (i % 4), i % 3 ? C.cyanSoft : C.magentaSoft, 0.25 * a);
    }
    ctx.restore();
  }

  /* atmosphere */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hz = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, W * 0.6);
  hz.addColorStop(0, 'rgba(30,90,150,0.14)');
  hz.addColorStop(1, 'rgba(4,10,24,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  bloom(ctx, W, H, { strength: 0.45, threshold: 0.6, radius: 12 });
  anamorphic(ctx, W, H, { strength: 0.3, color: '#5FE8FF', threshold: 0.8 });
  grain(ctx, W, H, t, 0.035);
  vignette(ctx, W, H, 0.8);
  black(ctx, W, H, smooth(seg(t, 4.6, 5)) * 0.25);
}
