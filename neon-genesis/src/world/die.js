// The chip die: a thick substrate with beveled rim, side walls, pins,
// and a live circuit printed on the top face.
import { clamp, rgba, glow } from '../lib/gfx.js';
import { drawCircuit } from './circuit.js';

export const DIE = { c: [0, 0, -800], half: 1600, h: 300 };

export function drawDie(ctx, cam, t, {
  rise = 1, alpha = 1, chase = 0, yaw = 0, circuitScale = 2.0, detail = 1,
} = {}) {
  if (alpha <= 0.002) return;
  const top = DIE.h * rise;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const map = (x, y, yOff = 0) => {
    const wx = x * DIE.half, wz = y * DIE.half;
    return [DIE.c[0] + wx * cy - wz * sy, top + yOff, DIE.c[2] + wx * sy + wz * cy];
  };

  const corners = [map(-1, -1), map(1, -1), map(1, 1), map(-1, 1)];

  ctx.save();
  ctx.globalAlpha = alpha;

  /* ------------------------------------------------------- side walls */
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    const wall = cam.poly([a, b, [b[0], b[1] - DIE.h, b[2]], [a[0], a[1] - DIE.h, a[2]]]);
    if (!wall || wall.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(wall[0].x, wall[0].y);
    for (let k = 1; k < wall.length; k++) ctx.lineTo(wall[k].x, wall[k].y);
    ctx.closePath();
    const g = ctx.createLinearGradient(wall[0].x, wall[0].y, wall[2].x, wall[2].y);
    g.addColorStop(0, '#0A1A24');
    g.addColorStop(0.35, '#061019');
    g.addColorStop(1, '#01060A');
    ctx.fillStyle = g;
    ctx.fill();
    // top bevel of the wall — a bright machined edge
    ctx.strokeStyle = rgba('#5FD8F0', 0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(wall[0].x, wall[0].y);
    ctx.lineTo(wall[1].x, wall[1].y);
    ctx.stroke();
    // faint vertical data ribs on the walls
    ctx.strokeStyle = rgba('#2C8FA8', 0.16);
    ctx.lineWidth = 1;
    for (let k = 1; k < 7; k++) {
      const f = k / 7;
      const x0 = wall[0].x + (wall[3].x - wall[0].x) * f;
      const y0 = wall[0].y + (wall[3].y - wall[0].y) * f;
      const x1 = wall[1].x + (wall[2].x - wall[1].x) * f;
      const y1 = wall[1].y + (wall[2].y - wall[1].y) * f;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }

  /* ---------------------------------------------------------- top face */
  const sTop = cam.poly(corners);
  if (sTop && sTop.length >= 4) {
    ctx.beginPath();
    ctx.moveTo(sTop[0].x, sTop[0].y);
    for (let i = 1; i < sTop.length; i++) ctx.lineTo(sTop[i].x, sTop[i].y);
    ctx.closePath();
    const g = ctx.createLinearGradient(sTop[0].x, sTop[0].y, sTop[2].x, sTop[2].y);
    g.addColorStop(0, '#081922');
    g.addColorStop(0.45, '#04121A');
    g.addColorStop(1, '#020A10');
    ctx.fillStyle = g;
    ctx.fill();

    // bevelled rim: inset ring, the "seal" band
    const rim = cam.poly([
      map(-0.93, -0.93), map(0.93, -0.93), map(0.93, 0.93), map(-0.93, 0.93),
    ]);
    if (rim && rim.length >= 4) {
      ctx.beginPath();
      ctx.moveTo(rim[0].x, rim[0].y);
      for (let i = 1; i < rim.length; i++) ctx.lineTo(rim[i].x, rim[i].y);
      ctx.closePath();
      ctx.strokeStyle = rgba('#2C8FA8', 0.4);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = rgba('#8FE8FF', 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sTop[0].x, sTop[0].y);
      for (let i = 1; i < sTop.length; i++) ctx.lineTo(sTop[i].x, sTop[i].y);
      ctx.closePath();
      ctx.stroke();
    }

    // corner notches
    ctx.strokeStyle = rgba('#7FE6FF', 0.55);
    ctx.lineWidth = 2;
    for (const [sx, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const c0 = map(sx * 0.955, sy2 * 0.955);
      const c1 = map(sx * 0.87, sy2 * 0.955);
      const c2 = map(sx * 0.955, sy2 * 0.87);
      const p0 = cam.project(c0), p1 = cam.project(c1), p2 = cam.project(c2);
      if (!p0 || !p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p0.x, p0.y); ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  /* -------------------------------------------------------------- pins */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pinA = clamp((rise - 0.35) / 0.5);
  const off = 70 / DIE.half;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 26; i++) {
      const f = (i / 25) * 2 - 1;
      if (Math.abs(f) > 0.93) continue;
      let a, b;
      if (side === 0) { a = map(f, -1); b = map(f, -1 - off); }
      else if (side === 1) { a = map(f, 1); b = map(f, 1 + off); }
      else if (side === 2) { a = map(-1, f); b = map(-1 - off, f); }
      else { a = map(1, f); b = map(1 + off, f); }
      const s = cam.segment(a, b);
      if (!s) continue;
      ctx.strokeStyle = rgba('#BFF6FF', 0.5 * pinA);
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      ctx.strokeStyle = rgba('#4FD0F0', 0.1 * pinA);
      ctx.lineWidth = 8;
      ctx.stroke();
    }
  }
  ctx.restore();

  /* ----------------------------------------------------------- circuit */
  drawCircuit(ctx, cam, t, (x, y) => map(x * 0.9, y * 0.9, 1.5), {
    alpha: alpha * (0.75 + 0.25 * rise) * (0.45 + 0.55 * detail),
    scale: circuitScale,
    chase,
  });

  /* -------------------------------------------------------- core + pad */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cp = cam.project(map(0, 0, 2));
  if (cp) {
    const core = 0.13 + 0.02 * Math.sin(t * 2.4);
    const q = cam.project(map(-core, -core, 2));
    const r2 = cam.project(map(core, core, 2));
    if (q && r2) {
      const w = Math.abs(r2.x - q.x);
      ctx.strokeStyle = rgba('#9FF6FF', 0.85 * alpha);
      ctx.lineWidth = 2.2;
      ctx.strokeRect(q.x, q.y, r2.x - q.x, r2.y - q.y);
      ctx.strokeStyle = rgba('#7FE8FF', 0.28 * alpha);
      ctx.lineWidth = 7;
      ctx.strokeRect(q.x, q.y, r2.x - q.x, r2.y - q.y);
      glow(ctx, cp.x, cp.y, w * 0.5, '#8FE8FF', 0.3 * alpha);
      glow(ctx, cp.x, cp.y, w * 0.16, '#FFFFFF', 0.55 * alpha);
    }
  }
  ctx.restore();

  ctx.restore();
}
