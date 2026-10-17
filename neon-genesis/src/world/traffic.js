// Air traffic: distant hover-lanes that give the skyline scale and motion.
import { C } from '../data.js';
import { mulberry32, clamp, rgba, glow } from '../lib/gfx.js';

const rnd = mulberry32(5150);
const COLS = [C.cyanSoft, C.cyan, '#FFD9A0', C.magentaSoft, C.purpleSoft];

export const CARS = Array.from({ length: 90 }, (_, i) => {
  const laneY = 120 + Math.floor(rnd() * 7) * 46;
  const laneZ = -2300 + rnd() * 3000;
  return {
    y: laneY + rnd() * 10,
    z: laneZ,
    x0: (rnd() - 0.5) * 4200,
    speed: (40 + rnd() * 90) * (rnd() > 0.5 ? 1 : -1),
    len: 22 + rnd() * 90,
    col: COLS[Math.floor(rnd() * COLS.length)],
    size: 1.2 + rnd() * 2.6,
    ph: rnd() * 6.28,
  };
});

export function drawTraffic(ctx, cam, t, { alpha = 1, zMin = -2600, zMax = 1200 } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const c of CARS) {
    if (c.z < zMin || c.z > zMax) continue;
    const span = 4600;
    let x = ((c.x0 + c.speed * t + span / 2) % span + span) % span - span / 2;
    const p1 = cam.project([x, c.y, c.z]);
    const p2 = cam.project([x - Math.sign(c.speed) * c.len, c.y, c.z]);
    if (!p1 || !p2) continue;
    if (p1.d > 3200) continue;
    const fade = clamp(1 - p1.d / 3200);
    const a = fade * alpha * (0.5 + 0.5 * Math.sin(t * 3 + c.ph));
    if (a < 0.01) continue;
    const g = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    g.addColorStop(0, rgba(c.col, 0.85 * a));
    g.addColorStop(1, rgba(c.col, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = clamp(1.6 - p1.d / 2600, 0.6, 2.2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    glow(ctx, p1.x, p1.y, c.size * (0.6 + fade), c.col, 0.65 * a);
  }
  ctx.restore();
}
