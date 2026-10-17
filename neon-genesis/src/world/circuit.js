// The city-as-circuit: luminous traces, pads and a chip die.
import { C } from '../data.js';
import { mulberry32, clamp, lerp, rgba, glow, TAU } from '../lib/gfx.js';

const rnd = mulberry32(778899);

/* orthogonal traces on a [-1,1] plane */
export const TRACES = Array.from({ length: 190 }, () => {
  const pts = [];
  let x = (rnd() * 2 - 1) * 0.92;
  let y = (rnd() * 2 - 1) * 0.92;
  pts.push([x, y]);
  const steps = 3 + Math.floor(rnd() * 4);
  for (let i = 0; i < steps; i++) {
    const horiz = i % 2 === 0;
    const d = (rnd() * 2 - 1) * 0.42;
    if (horiz) x = clamp(x + d, -0.96, 0.96);
    else y = clamp(y + d, -0.96, 0.96);
    pts.push([x, y]);
  }
  return { pts, w: rnd() > 0.85 ? 1.6 : rnd() > 0.5 ? 1.0 : 0.65, col: rnd() > 0.8 ? C.magenta : rnd() > 0.45 ? C.cyan : '#9FE8FF', ph: rnd() * 6.28, sp: 0.4 + rnd() * 1.4 };
});

export const PADS = Array.from({ length: 70 }, () => ({
  x: (rnd() * 2 - 1) * 0.9, y: (rnd() * 2 - 1) * 0.9,
  r: 0.004 + rnd() * 0.012, col: rnd() > 0.7 ? C.magenta : C.cyanSoft,
}));

/**
 * Draw accumulated circuit traces on a planar die.
 * map(x,y) -> 3D point. `chase` (0..1) reveals energy travelling along traces.
 */
export function drawCircuit(ctx, cam, t, map, {
  alpha = 1, scale = 1, chase = 0, cell = 0.06, extra = 0,
} = {}) {
  const S = scale;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // base grid
  const n = Math.round(1 / cell);
  for (let i = -n; i <= n; i++) {
    const a = i * cell;
    const p1 = cam.project(map(a, -1)), p2 = cam.project(map(a, 1));
    if (p1 && p2) {
      ctx.strokeStyle = rgba('#1C6C8C', 0.28 * alpha);
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    const q1 = cam.project(map(-1, a)), q2 = cam.project(map(1, a));
    if (q1 && q2) {
      ctx.strokeStyle = rgba('#1C6C8C', 0.28 * alpha);
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
    }
  }

  // traces
  for (const tr of TRACES) {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < tr.pts.length; i++) {
      const p = cam.project(map(tr.pts[i][0], tr.pts[i][1]));
      if (!p) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    const pulse = chase > 0 ? 0.55 + 0.45 * Math.sin(t * tr.sp * 3 + tr.ph) * chase : 1;
    ctx.strokeStyle = rgba(tr.col, 0.55 * alpha * pulse);
    ctx.lineWidth = tr.w * S;
    ctx.stroke();

    // energy packet travelling the trace
    if (chase > 0.02) {
      const u = ((t * 0.25 * tr.sp + tr.ph / 6.28) % 1);
      const seg = u * (tr.pts.length - 1);
      const i0 = Math.floor(seg), f = seg - i0;
      const a = tr.pts[Math.min(i0, tr.pts.length - 1)];
      const b = tr.pts[Math.min(i0 + 1, tr.pts.length - 1)];
      const p = cam.project(map(lerp(a[0], b[0], f), lerp(a[1], b[1], f)));
      if (p) glow(ctx, p.x, p.y, 2.6 * S, tr.col, 0.55 * alpha * chase);
    }
  }

  // pads
  for (const pd of PADS) {
    const p = cam.project(map(pd.x, pd.y));
    if (!p) continue;
    glow(ctx, p.x, p.y, pd.r * 90 * S, pd.col, 0.5 * alpha);
    ctx.fillStyle = rgba('#EAFEFF', 0.6 * alpha);
    ctx.fillRect(p.x - pd.r * 18 * S, p.y - pd.r * 18 * S, pd.r * 36 * S, pd.r * 36 * S);
  }

  // central core pad
  const cp = cam.project(map(0, 0));
  if (cp) {
    glow(ctx, cp.x, cp.y, 5 * S * (1 + chase * 0.3), '#9FF0FF', 0.22 * alpha);
    glow(ctx, cp.x, cp.y, 1.7 * S, '#EAFEFF', 0.5 * alpha);
  }
  ctx.restore();
}
