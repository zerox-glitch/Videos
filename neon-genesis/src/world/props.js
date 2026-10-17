// Street furniture: overhead bridges, support pylons, cables, light rigs.
import { C } from '../data.js';
import { mulberry32, clamp, rgba, glow, lerp } from '../lib/gfx.js';

const rnd = mulberry32(8080);

export const BRIDGES = [];
for (let z = 260; z > -3600; z -= 360) {
  BRIDGES.push({
    z: z + (rnd() - 0.5) * 60,
    y: 26 + rnd() * 22,
    w: 5 + rnd() * 3,
    col: rnd() > 0.5 ? C.cyan : C.magenta,
  });
}

export const PYLONS = [];
for (let z = 300; z > -3600; z -= 130) {
  const side = rnd() > 0.5 ? 1 : -1;
  PYLONS.push({
    z: z + (rnd() - 0.5) * 40,
    x: side * (30 + rnd() * 10),
    h: 7 + rnd() * 26,
    w: 1.2 + rnd() * 1.8,
    col: rnd() > 0.6 ? C.magenta : C.cyan,
    neon: rnd() > 0.4,
  });
}

const box = (ctx, cam, x0, x1, y0, y1, z0, z1, col, alpha = 1) => {
  const faces = [
    [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]],
    [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]],
    [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]],
    [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]],
  ];
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  for (const f of faces) {
    const s = cam.poly(f);
    if (!s) continue;
    ctx.beginPath();
    ctx.moveTo(s[0].x, s[0].y);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

export function drawBridges(ctx, cam, t, { zNear = 500, zFar = -2800 } = {}) {
  for (const b of BRIDGES) {
    if (b.z > zNear || b.z < zFar) continue;
    const d = -cam.toView([0, b.y, b.z])[2];
    if (d < -40) continue;
    // deck
    box(ctx, cam, -62, 62, b.y, b.y + b.w, b.z - 9, b.z + 9, '#070C14');
    // neon underside edge
    const a = cam.segment([-62, b.y - 0.4, b.z + 9.2], [62, b.y - 0.4, b.z + 9.2]);
    if (a) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(b.col, clamp(1 - d / 1600) * 0.85);
      ctx.lineWidth = clamp(260 / Math.max(d, 40), 1, 5);
      ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.lineTo(a.x2, a.y2); ctx.stroke();
      ctx.globalAlpha = 0.14;
      ctx.lineWidth = clamp(1800 / Math.max(d, 40), 8, 60);
      ctx.stroke();
      ctx.restore();
    }
    // supports
    for (const sx of [-58, 58]) {
      box(ctx, cam, sx - 2.4, sx + 2.4, 0, b.y, b.z - 3, b.z + 3, '#05080E');
    }
    // hanging lamps under the deck
    for (let i = -2; i <= 2; i++) {
      const p = cam.project([i * 22, b.y - 2, b.z + 6]);
      if (!p) continue;
      glow(ctx, p.x, p.y, clamp(700 / Math.max(d, 40), 2, 12), b.col, 0.5 * clamp(1 - d / 1400));
    }
  }
}

export function drawPylons(ctx, cam, t, { zNear = 500, zFar = -2800 } = {}) {
  for (const p of PYLONS) {
    if (p.z > zNear || p.z < zFar) continue;
    const d = -cam.toView([p.x, p.h * 0.5, p.z])[2];
    if (d < -20) continue;
    box(ctx, cam, p.x - p.w, p.x + p.w, 0, p.h, p.z - p.w, p.z + p.w, '#060A12');
    if (!p.neon) continue;
    const a = cam.segment([p.x, p.h, p.z], [p.x, p.h + 14, p.z]);
    if (a) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(p.col, clamp(1 - d / 900) * 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.lineTo(a.x2, a.y2); ctx.stroke();
      ctx.restore();
    }
    const top = cam.project([p.x, p.h, p.z]);
    if (top) glow(ctx, top.x, top.y, clamp(500 / Math.max(d, 30), 1.5, 9), p.col, 0.55 * clamp(1 - d / 900));
  }
}

/* floating dust / embers close to the camera */
const MOTES = Array.from({ length: 260 }, () => ({
  x: (rnd() - 0.5) * 80,
  y: rnd() * 34,
  z: rnd() * 320,
  s: 0.35 + rnd() * 1.5,
  ph: rnd() * 6.28,
  col: rnd() > 0.7 ? C.magentaSoft : rnd() > 0.4 ? C.cyanSoft : '#FFFFFF',
}));

export function drawMotes(ctx, cam, t, { originZ = 0, alpha = 1, speed = 0 } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    const z = originZ - (((m.z + t * (34 + speed * 5)) % 320) + 320) % 320;
    const p = cam.project([m.x + Math.sin(t * 0.6 + m.ph) * 2, m.y + Math.cos(t * 0.4 + m.ph) * 1.2, z]);
    if (!p) continue;
    const fade = clamp(1 - p.d / 300) * alpha;
    if (fade <= 0.01) continue;
    glow(ctx, p.x, p.y, m.s * 3, m.col, 0.3 * fade);
  }
  ctx.restore();
}
