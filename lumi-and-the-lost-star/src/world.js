// The night world: sky, stars, moon, hills, grass, clouds, ambient fireflies.
// Everything is deterministic and driven by absolute scene time.
import { W, H, C } from './data.js';
import {
  clamp, lerp, seg, sine, smooth, rgba, mix, mulberry32, glow, spark,
} from './draw.js';

export const GROUND = 900;
export const MOON = { x: 1490, y: 250, r: 96 };

/* ------------------------------------------------------------------ sky */
export function sky(ctx, t, { dawn = 0 } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix(C.skyTop, '#1A1030', dawn));
  g.addColorStop(0.42, mix(C.skyMid, '#2A1B4A', dawn * 0.8));
  g.addColorStop(0.76, mix(C.skyLow, C.dawn, dawn));
  g.addColorStop(1, mix(C.horizon, C.dawnLow, dawn * 0.9));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // horizon bloom
  const bloom = ctx.createRadialGradient(W * 0.5, 790, 40, W * 0.5, 800, 1000);
  bloom.addColorStop(0, rgba(dawn > 0.2 ? '#E7A07A' : '#4C86A0', 0.20 + dawn * 0.18));
  bloom.addColorStop(0.6, rgba('#2E5A70', 0.08));
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 300, W, H - 300);

  // milky way band
  ctx.save();
  ctx.translate(W * 0.5, H * 0.32);
  ctx.rotate(-0.42);
  const band = ctx.createLinearGradient(0, -220, 0, 220);
  band.addColorStop(0, 'rgba(120,140,220,0)');
  band.addColorStop(0.5, rgba('#8E9CD8', 0.085));
  band.addColorStop(1, 'rgba(120,140,220,0)');
  ctx.fillStyle = band;
  ctx.fillRect(-1200, -220, 2400, 440);
  ctx.restore();

  // drifting nebula wisps
  for (let i = 0; i < 3; i++) {
    const x = W * (0.18 + i * 0.3) + Math.sin(t * 0.05 + i * 2) * 60;
    const y = 160 + i * 120 + Math.cos(t * 0.04 + i) * 30;
    const r = 380 + i * 120;
    const col = i % 2 ? '#3E6E8E' : '#4A3A82';
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, rgba(col, 0.10 - dawn * 0.05));
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/* ---------------------------------------------------------------- stars */
export function stars(ctx, t, { camY = 0, dawn = 0, density = 1 } = {}) {
  const rnd = mulberry32(77);
  const n = Math.round(150 * density);
  const shift = camY * 0.045;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * 720;
    const sz = 0.7 + rnd() * 1.7;
    const ph = rnd() * 6.28;
    const sp = 0.35 + rnd() * 1.5;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * sp + ph));
    const a = tw * (1 - dawn * 0.55) * clamp(1 - y / 780);
    if (a <= 0.02) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 9 === 0 ? '#FFE7B8' : i % 7 === 0 ? '#CFE2FF' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y + shift, sz, 0, 6.283);
    ctx.fill();
    if (i % 23 === 0 && dawn < 0.4) {
      spark(ctx, x, y + shift, 9 + tw * 6, '#FFF6DE', a * 0.55, t * 0.1 + i);
    }
  }
  ctx.restore();
}

/* ----------------------------------------------------------------- moon */
export function moon(ctx, x, y, r, t, { face = 0, dawn = 0 } = {}) {
  glow(ctx, x, y, r * 1.5, '#FFE9B0', 0.34 * (1 - dawn * 0.4));
  glow(ctx, x, y, r * 0.8, '#FFF6DE', 0.28);

  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
  g.addColorStop(0, '#FFFDF3');
  g.addColorStop(0.55, C.moon);
  g.addColorStop(1, C.moonShade);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.283);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.283);
  ctx.clip();
  const craters = [[-0.33, -0.18, 0.17], [0.22, 0.12, 0.12], [-0.02, 0.42, 0.085], [0.44, -0.3, 0.07]];
  for (const [cx, cy, cr] of craters) {
    ctx.beginPath();
    ctx.arc(x + cx * r, y + cy * r, cr * r, 0, 6.283);
    ctx.fillStyle = 'rgba(216,199,161,0.55)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + cx * r - cr * r * 0.18, y + cy * r - cr * r * 0.2, cr * r * 0.82, 0, 6.283);
    ctx.fillStyle = 'rgba(255,250,232,0.35)';
    ctx.fill();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, r + 5, 0, 6.283);
  ctx.strokeStyle = 'rgba(255,246,222,0.22)';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (face > 0.01) {
    ctx.save();
    ctx.globalAlpha *= face;
    ctx.strokeStyle = 'rgba(120,98,66,0.75)';
    ctx.lineWidth = r * 0.055;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.04, r * 0.14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.24, y - r * 0.04, r * 0.14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + r * 0.2, r * 0.2, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------------------------------------------------------------- hills */
function hillPath(ctx, baseY, amp, seed, phase) {
  const rnd = mulberry32(seed);
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const x = -120 + (i * (W + 240)) / n;
    const y = baseY - Math.sin(i * 0.9 + phase) * amp - rnd() * amp * 0.5;
    pts.push([x, y]);
  }
  ctx.beginPath();
  ctx.moveTo(-120, H + 200);
  ctx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const mx = (x0 + x1) / 2;
    ctx.bezierCurveTo(mx, y0, mx, y1, x1, y1);
  }
  ctx.lineTo(W + 120, H + 200);
  ctx.closePath();
  return pts;
}

function tree(ctx, x, y, h, kind, color, rim) {
  ctx.fillStyle = color;
  if (kind === 'pine') {
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + h * 0.34, y);
    ctx.lineTo(x - h * 0.34, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - h * 1.25);
    ctx.lineTo(x + h * 0.26, y - h * 0.55);
    ctx.lineTo(x - h * 0.26, y - h * 0.55);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y - h * 0.7, h * 0.42, 0, 6.283);
    ctx.fill();
    ctx.fillRect(x - h * 0.05, y - h * 0.7, h * 0.1, h * 0.7);
  }
  if (rim) {
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function hills(ctx, camY, { dawn = 0 } = {}) {
  const layers = [
    { base: 700, amp: 42, seed: 12, phase: 0.4, color: C.hillFar, rimA: 0.16 },
    { base: 800, amp: 54, seed: 31, phase: 2.1, color: C.hillMid, rimA: 0.22 },
    { base: 884, amp: 34, seed: 8, phase: 4.0, color: C.hillNear, rimA: 0.14 },
  ];
  layers.forEach((L, li) => {
    const y = L.base - camY;
    if (y < -400) return;
    ctx.save();
    ctx.translate(0, 0);
    const pts = hillPath(ctx, y, L.amp, L.seed, L.phase);
    ctx.fillStyle = mix(L.color, '#2A2018', dawn * 0.25);
    ctx.fill();
    // rim light along the crest
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const mx = (x0 + x1) / 2;
      ctx.bezierCurveTo(mx, y0, mx, y1, x1, y1);
    }
    ctx.strokeStyle = rgba('#7ECEE0', L.rimA);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // a few trees on the far and mid hills
    if (li < 2) {
      const rnd = mulberry32(L.seed * 7 + 3);
      const count = li === 0 ? 14 : 9;
      for (let i = 0; i < count; i++) {
        const tx = 60 + rnd() * (W - 120);
        const idx = clamp(Math.round(((tx + 120) / (W + 240)) * (pts.length - 1)), 0, pts.length - 1);
        const ty = pts[idx][1] + 18 + rnd() * 26;
        const th = (li === 0 ? 26 : 40) + rnd() * (li === 0 ? 26 : 46);
        tree(ctx, tx, ty, th, rnd() > 0.45 ? 'pine' : 'round',
          mix(li === 0 ? '#0F1738' : '#0A1030', '#241A16', dawn * 0.3), rgba('#7ECEE0', 0.1));
      }
    }
    ctx.restore();
  });
}

/* ---------------------------------------------------------------- grass */
export function grass(ctx, t, camY, { dawn = 0, sway = 1 } = {}) {
  const baseY = GROUND + 30 - camY;
  if (baseY < -160) return;
  const rnd = mulberry32(303);
  ctx.save();
  const n = 92;
  for (let i = 0; i < n; i++) {
    const x = -40 + (i / n) * (W + 80) + rnd() * 12;
    const h = 40 + rnd() * 96;
    const lean = (rnd() - 0.5) * 30;
    const bend = Math.sin(t * 1.05 + i * 0.55 + x * 0.004) * (3 + h * 0.07) * sway;
    const y0 = baseY + rnd() * 54;
    const tipX = x + lean + bend;
    const tipY = y0 - h;
    const wBase = 4.2 + rnd() * 4.4;
    // tapered blade
    ctx.beginPath();
    ctx.moveTo(x - wBase, y0 + 90);
    ctx.quadraticCurveTo(x - wBase * 0.5, y0 - h * 0.45, tipX, tipY);
    ctx.quadraticCurveTo(x + wBase * 0.7, y0 - h * 0.4, x + wBase, y0 + 90);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y0, 0, tipY);
    g.addColorStop(0, mix('#03060F', '#1B120C', dawn * 0.35));
    g.addColorStop(1, mix('#0A1230', '#33210E', dawn * 0.4));
    ctx.fillStyle = g;
    ctx.fill();
    // moonlit edge
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.moveTo(x - wBase * 0.35, y0 + 40);
      ctx.quadraticCurveTo(x - wBase * 0.2, y0 - h * 0.45, tipX, tipY);
      ctx.strokeStyle = rgba('#8FD4E8', 0.2);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Big, soft, out-of-focus blades at the very bottom of frame. */
export function foregroundGrass(ctx, t, { alpha = 1 } = {}) {
  const rnd = mulberry32(808);
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < 14; i++) {
    const x = -60 + rnd() * (W + 120);
    const h = 150 + rnd() * 190;
    const lean = (rnd() - 0.5) * 90;
    const bend = Math.sin(t * 0.9 + i * 0.8 + x * 0.003) * 12;
    ctx.beginPath();
    ctx.moveTo(x - 16, H + 60);
    ctx.quadraticCurveTo(x - 6, H - h * 0.55, x + lean + bend, H - h);
    ctx.quadraticCurveTo(x + 14, H - h * 0.5, x + 18, H + 60);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, H, 0, H - h);
    g.addColorStop(0, 'rgba(3,6,18,0.96)');
    g.addColorStop(1, 'rgba(8,14,32,0.55)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

/* --------------------------------------------------------------- clouds */
function puffShape(ctx, x, y, w, h) {
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const cx = x - w / 2 + u * w;
    const bulge = Math.sin(u * Math.PI);
    const r = h * (0.22 + bulge * 0.44);
    ctx.moveTo(cx + r, y - bulge * h * 0.16);
    ctx.arc(cx, y - bulge * h * 0.2, r, 0, 6.283);
  }
}

function puff(ctx, x, y, w, h, tones) {
  // body
  const g = ctx.createLinearGradient(0, y - h * 0.9, 0, y + h * 0.45);
  g.addColorStop(0, tones.top);
  g.addColorStop(0.55, tones.mid);
  g.addColorStop(1, tones.bottom);
  ctx.fillStyle = g;
  puffShape(ctx, x, y, w, h);
  ctx.fill();
  // moonlit crown
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= tones.crownA;
  const cg = ctx.createLinearGradient(0, y - h * 1.1, 0, y - h * 0.15);
  cg.addColorStop(0, tones.crown);
  cg.addColorStop(1, 'rgba(150,190,220,0)');
  ctx.fillStyle = cg;
  puffShape(ctx, x, y - h * 0.06, w * 0.97, h * 0.92);
  ctx.fill();
  ctx.restore();
}

export function clouds(ctx, t, camY, { dawn = 0, alpha = 1, parallax = 1 } = {}) {
  const rows = [
    { wy: 720, scale: 1.0, speed: 7, a: 0.5 },
    { wy: 300, scale: 1.35, speed: 4.5, a: 0.62 },
    { wy: -220, scale: 1.7, speed: 3.2, a: 0.72 },
    { wy: -760, scale: 2.1, speed: 2.2, a: 0.8 },
    { wy: -1240, scale: 2.5, speed: 1.4, a: 0.86 },
  ];
  rows.forEach((row, ri) => {
    const sy = row.wy - camY * parallax;
    if (sy < -320 || sy > H + 260) return;
    const rnd = mulberry32(900 + ri * 17);
    const count = 4;
    for (let i = 0; i < count; i++) {
      const w = (300 + rnd() * 260) * row.scale;
      const h = (90 + rnd() * 60) * row.scale;
      const drift = ((t * row.speed + i * 700 + rnd() * 900) % (W + w + 400)) - w / 2 - 200;
      const x = drift;
      const y = sy + (rnd() - 0.5) * 70 * row.scale;
      const a = 0.42 * row.a * alpha;
      puff(ctx, x, y, w, h, {
        top: rgba(mix('#4A5E92', '#9B6878', dawn), a * 0.95),
        mid: rgba(mix('#2C3E64', '#B07A6E', dawn), a * 0.72),
        bottom: rgba(mix('#16233F', '#6E4A55', dawn), a * 0.5),
        crown: rgba(mix('#9FC4E0', '#FFD9B8', dawn), 0.5),
        crownA: 0.55,
      });
    }
  });
}

/* ------------------------------------------------------ ambient bugs */
export function ambientFireflies(ctx, t, { camY = 0, count = 9, seed = 51, alpha = 1 } = {}) {
  const rnd = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const bx = rnd() * W;
    const by = 600 + rnd() * 300 - camY;
    if (by < -60 || by > H + 60) continue;
    const x = bx + Math.sin(t * (0.22 + rnd() * 0.2) + i) * 70;
    const y = by + Math.cos(t * (0.3 + rnd() * 0.2) + i * 1.7) * 34;
    const pulse = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * (1 + rnd()) + i * 2.2), 2);
    glow(ctx, x, y, 7, '#C9F76F', 0.55 * pulse * alpha);
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 6.283);
    ctx.fillStyle = rgba('#EAFFB8', 0.9 * alpha * pulse);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------- camera */
export function camera(ctx, zoom = 1, cx = W / 2, cy = H / 2) {
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);
}

/* ------------------------------------------------------------- world */
export function drawWorld(ctx, t, opts = {}) {
  const { camY = 0, dawn = 0, density = 1, moonFace = 0, cloudAlpha = 1, fg = 0 } = opts;
  sky(ctx, t, { dawn });
  stars(ctx, t, { camY, dawn, density });
  const my = MOON.y - camY * 0.35;
  if (my > -260) moon(ctx, MOON.x, my, MOON.r, t, { face: moonFace, dawn });
  clouds(ctx, t, camY, { dawn, alpha: cloudAlpha });
  hills(ctx, camY, { dawn });
  grass(ctx, t, camY, { dawn });
  if (fg > 0) foregroundGrass(ctx, t, { alpha: fg });
}
