// Ground plane, emissive street grid, wet-road reflections and street haze.
import { C } from '../data.js';
import { clamp, seg, smooth, rgba, glow, lerp, outCubic } from '../lib/gfx.js';

function projectPoly(ctx, cam, pts, fill) {
  const s = cam.poly(pts);
  if (!s) return false;
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  return true;
}

/** Big dark plane with atmospheric falloff. */
export function drawGround(ctx, cam, W, H, { tint = C.fog, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const S = 14000;
  projectPoly(ctx, cam, [[-S, 0, S], [S, 0, S], [S, 0, -S], [-S, 0, -S]], '#050810');
  // horizon haze band (world-space quad just above the plane)
  const g = cam.poly([[-S, 0, -S], [S, 0, -S], [S, 900, -S], [-S, 900, -S]]);
  ctx.restore();
  return g;
}

/** Screen y of the true horizon (vanishing point of the horizontal forward). */
export function horizonY(cam) {
  const fx = cam.target[0] - cam.eye[0];
  const fz = cam.target[2] - cam.eye[2];
  const L = Math.hypot(fx, fz) || 1;
  const p = cam.project([cam.eye[0] + (fx / L) * 100000, cam.eye[1], cam.eye[2] + (fz / L) * 100000]);
  return p ? p.y : cam.H * 0.45;
}

/** Emissive grid; `reveal` (0..1) is a radius multiplier, `front` draws a wave line. */
export function drawGrid(ctx, cam, W, H, {
  t = 0,
  spacing = 190,
  reach = 5200,
  alpha = 0.5,
  color = C.cyan,
  reveal = 1,
  front = null,
  gap = 0,
  y = 1.5,
  major = 3,
} = {}) {
  const n = Math.floor(reach / spacing);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'butt';

  for (let axis = 0; axis < 2; axis++) {
    for (let i = -n; i <= n; i++) {
      const c = i * spacing;
      const isMajor = i % major === 0;
      let pts;
      if (axis === 0) {
        if (gap && Math.abs(c) < gap) continue;
        pts = [[c, y, -reach], [c, y, reach]];
      } else {
        pts = [[-reach, y, c], [reach, y, c]];
      }
      // split the line into segments so the reveal front can clip it
      const segs = front ? 12 : 1;
      for (let k = 0; k < segs; k++) {
        const t0 = k / segs, t1 = (k + 1) / segs;
        const a = [
          lerp(pts[0][0], pts[1][0], t0),
          y,
          lerp(pts[0][2], pts[1][2], t0),
        ];
        const b = [
          lerp(pts[0][0], pts[1][0], t1),
          y,
          lerp(pts[0][2], pts[1][2], t1),
        ];
        const mid = [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2];
        const dist = Math.hypot(mid[0], mid[1]);
        if (dist > reach * reveal) continue;
        const s = cam.segment(a, b);
        if (!s) continue;
        const dd = Math.min(s.d1, s.d2);
        const fog = Math.pow(clamp(1 - dd / reach), 1.5);
        let aa = alpha * fog * (isMajor ? 1 : 0.5);
        if (front) {
          const w = Math.abs(dist - front.r);
          aa *= 0.35 + 1.8 * Math.exp(-Math.pow(w / 120, 2));
        }
        if (aa < 0.004) continue;
        ctx.strokeStyle = rgba(isMajor ? color : '#2C86A8', aa);
        ctx.lineWidth = isMajor ? 1.6 : 0.9;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Road ribbon for street level: dark asphalt, center dashes, side light strips. */
export function drawRoad(ctx, cam, t, { z0 = 400, z1 = -1600, half = 26, wet = 1 } = {}) {
  const y = 0.5;
  // asphalt
  const quad = [[-half, y, z0], [half, y, z0], [half, y, z1], [-half, y, z1]];
  const s = cam.poly(quad);
  if (s) {
    const g = ctx.createLinearGradient(0, s[0].y, 0, s[2].y);
    g.addColorStop(0, 'rgba(10,14,24,0.98)');
    g.addColorStop(1, 'rgba(6,8,16,0.98)');
    ctx.beginPath();
    ctx.moveTo(s[0].x, s[0].y);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
  }
  // center dashes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let z = z0; z > z1; z -= 46) {
    const a = cam.segment([0, y + 0.6, z], [0, y + 0.6, z - 18]);
    if (!a) continue;
    const fog = clamp(1 - a.d1 / 1200);
    ctx.strokeStyle = rgba('#9FE8FF', 0.22 * fog * wet);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.lineTo(a.x2, a.y2);
    ctx.stroke();
  }
  // side strips
  for (const sx of [-half + 1.2, half - 1.2]) {
    for (let z = z0; z > z1; z -= 120) {
      const a = cam.segment([sx, y + 0.8, z], [sx, y + 0.8, z - 118]);
      if (!a) continue;
      const fog = clamp(1 - a.d1 / 1500);
      ctx.strokeStyle = rgba(sx < 0 ? C.magenta : C.cyan, 0.55 * fog);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x2, a.y2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Vertical smears under bright sources — fake wet reflections. */
export function reflection(ctx, cam, x, z, y0, height, color, alpha = 0.5) {
  const a = cam.project([x, y0, z]);
  const b = cam.project([x, y0 + height, z]);
  if (!a || !b) return;
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.35, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  const w = clamp(1200 / Math.max(60, a.d), 2, 40);
  ctx.fillRect(a.x - w * 0.35, b.y, w * 0.7, a.y - b.y);
  ctx.globalAlpha = 0.5;
  ctx.fillRect(a.x - w * 1.1, b.y, w * 2.2, (a.y - b.y) * 0.35);
  ctx.restore();
}

/** City haze: additive gradient slabs at increasing depth. */
export function drawHaze(ctx, cam, W, H, { t = 0, color = C.fog, strength = 1, y = 0 } = {}) {
  const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.62, rgba('#0A1830', 0.34 * strength));
  g.addColorStop(1, rgba('#132A4A', 0.18 * strength));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
