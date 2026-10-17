// CHAPTER 2 — VELOCITY. 10.0–16.0 s (local 0–6)
// Dive from the skyline into a neon canyon; a bike chases the light.
import { Camera } from '../lib/math3d.js';
import { C } from '../data.js';
import { clamp, lerp, seg, smooth, smoother, outCubic, inCubic, mulberry32, rgba, glow, bloom, anamorphic, grain, vignette, black, mixHex } from '../lib/gfx.js';
import { drawCity, drawFarCity } from '../world/city.js';
import { CITY_NEAR, CITY_FAR } from './genesis.js';
import { drawGround, drawRoad, drawHaze, reflection } from '../world/ground.js';
import { drawBridges, drawPylons, drawMotes } from '../world/props.js';
import { drawBike, drawTrail } from '../world/bike.js';

const cam = new Camera();
const rnd = mulberry32(606);

const Z0 = -470;
const bikeAt = lt => {
  const z = Z0 - (260 * lt + 18 * lt * lt);
  const lane = Math.sin(lt * 0.85) * 7.5 + Math.sin(lt * 2.1) * 1.6;
  const swerve = -14 * Math.exp(-Math.pow((lt - 4.95) / 0.42, 2));
  return { x: lane + swerve, y: 0, z };
};

const STREAKS = Array.from({ length: 90 }, () => ({
  x: (rnd() - 0.5) * 120,
  y: 0.4 + rnd() * 34,
  z: -rnd() * 400,
  len: 12 + rnd() * 44,
  a: 0.05 + rnd() * 0.25,
  col: rnd() > 0.6 ? C.magentaSoft : C.cyanSoft,
}));

export function draw(ctx, T, { W, H }) {
  const t = T;
  const b = bikeAt(t);

  /* ---------------------------------------------------------- camera */
  const dive = smooth(seg(t, 0, 1.02));
  const diveE = 1 - Math.pow(1 - dive, 2.4);

  const drift = smooth(seg(t, 1.0, 5.6));
  const side = lerp(31, 24, drift);
  const trackEye = [b.x + side, 7.4 + Math.sin(t * 2.3) * 0.16, b.z + 44];
  const trackTgt = [b.x - 4, 3.8, b.z - 70];

  const eye = [
    lerp(0, trackEye[0], diveE),
    lerp(172, trackEye[1], diveE),
    lerp(-400, trackEye[2], diveE),
  ];
  const target = [
    lerp(0, trackTgt[0], diveE),
    lerp(268, trackTgt[1], Math.pow(dive, 1.4)),
    lerp(-1650, trackTgt[2], diveE),
  ];

  // speed ramp: the camera drops back, then snaps forward again
  const ramp = smooth(seg(t, 3.9, 4.5)) * (1 - smooth(seg(t, 5.15, 5.75)));
  eye[2] += ramp * 26;
  eye[1] += ramp * 3.4;

  const lean = Math.sin(t * 1.1) * 0.16 + Math.sin(t * 2.4) * 0.05;
  cam.set(eye, target, {
    fov: lerp(74, 62, diveE) + ramp * 7,
    roll: -lean * 0.35 + Math.sin(t * 0.7) * 0.012,
    near: 0.4, far: 8000,
  });
  cam.update(W, H);

  /* ------------------------------------------------------------ sky */
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010206');
  sky.addColorStop(0.45, '#050A18');
  sky.addColorStop(1, '#0A1428');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const hz = ctx.createRadialGradient(W * 0.5, H * 0.34, 0, W * 0.5, H * 0.34, W * 0.6);
  hz.addColorStop(0, 'rgba(40,110,180,0.26)');
  hz.addColorStop(0.4, 'rgba(26,60,110,0.12)');
  hz.addColorStop(1, 'rgba(6,10,26,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = hz;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* ----------------------------------------------------------- ground */
  drawGround(ctx, cam, W, H);
  drawRoad(ctx, cam, t, { z0: 400, z1: -3200, half: 26, wet: 1 });

  // wet reflections: long soft smears on the asphalt
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillStyle = rgba(i < 0 ? C.magenta : C.cyan, 0.05);
    const s = cam.poly([[-26, 0.4, b.z + 60], [26, 0.4, b.z + 60], [26, 0.4, b.z - 420], [-26, 0.4, b.z - 420]]);
    if (s) {
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      for (let k = 1; k < s.length; k++) ctx.lineTo(s[k].x, s[k].y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  /* --------------------------------------------------------- motorway */
  drawBridges(ctx, cam, t, { zNear: 500, zFar: -3400 });
  drawPylons(ctx, cam, t, { zNear: 500, zFar: -3400 });

  /* ------------------------------------------------------------ city */
  drawFarCity(ctx, cam, t + 8, CITY_FAR, { maxDist: 6000 });
  drawCity(ctx, cam, t + 8, CITY_NEAR, { maxDist: 1500, windowBoost: 1.35 });

  /* ---------------------------------------------------------- traffic */
  drawMotes(ctx, cam, t, { originZ: b.z + 60, alpha: 0.9, speed: 1 });

  /* ------------------------------------------------------- speed lines */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sp = clamp(0.25 + t * 0.14);
  for (const s of STREAKS) {
    const z = s.z + ((t * 260) % 400);
    const zz = -(((-z) % 400) + 400) % 400;
    const p1 = cam.project([s.x, s.y, b.z + 30 + zz]);
    const p2 = cam.project([s.x, s.y, b.z + 30 + zz + s.len]);
    if (!p1 || !p2) continue;
    const fade = clamp(1 - Math.abs(p1.d - 60) / 120);
    ctx.strokeStyle = rgba(s.col, s.a * fade * sp);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  ctx.restore();

  /* ------------------------------------------------------------- bike */
  const trailLen = 26;
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i < trailLen; i++) {
      const u = i / (trailLen - 1);
      const bt = bikeAt(t - u * 0.28);
      pts.push([bt.x + side * 1.9, 2.4 + u * 4.2 + Math.sin(u * 3 + t * 6) * 0.14, bt.z + 7.0 + u * 3.0]);
    }
    drawTrail(ctx, cam, pts, side < 0 ? C.magenta : C.cyan, 13, 1);
    // wet-road reflection of the trail
    const mir = pts.map(p => [p[0], -p[1] * 0.5, p[2]]);
    drawTrail(ctx, cam, mir, side < 0 ? C.magenta : C.cyan, 9, 0.2);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pool = cam.project([b.x, 0.4, b.z + 2]);
  if (pool) {
    const g = ctx.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, 120);
    g.addColorStop(0, 'rgba(90,230,255,0.28)');
    g.addColorStop(0.5, 'rgba(40,120,200,0.1)');
    g.addColorStop(1, 'rgba(10,30,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(pool.x - 120, pool.y - 50, 240, 100);
  }
  ctx.restore();

  drawBike(ctx, cam, [b.x, 0, b.z], {
    yaw: Math.cos(t * 0.85) * 0.05,
    lean: lean * 0.9,
    t, speed: 1,
  });

  // headlight cone
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hp = cam.project([b.x, 3.4, b.z - 40]);
  if (hp) glow(ctx, hp.x, hp.y, 90, '#BFEFFF', 0.22);
  ctx.restore();

  /* ---------------------------------------------------------- fog/haze */
  drawHaze(ctx, cam, W, H, { t, strength: 0.55 });

  // ground fog drifting through the canyon
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const z = b.z - 60 - i * 120;
    const p = cam.project([Math.sin(t * 0.5 + i) * 20, 3 + i * 2, z]);
    if (!p) continue;
    const r = 160 + i * 70;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, 'rgba(60,120,180,0.07)');
    g.addColorStop(1, 'rgba(20,40,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r, p.y - r * 0.6, r * 2, r * 1.2);
  }
  ctx.restore();

  /* --------------------------------------------------------------- post */
  bloom(ctx, W, H, { strength: 0.4, threshold: 0.6, radius: 11 });
  anamorphic(ctx, W, H, { strength: 0.4, color: '#5FE8FF', threshold: 0.72 });
  grain(ctx, W, H, t, 0.045);
  vignette(ctx, W, H, 0.85);

}
