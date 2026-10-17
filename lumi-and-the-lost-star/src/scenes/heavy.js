// 24–36 s · Far too heavy for one little bug — so she calls her friends.
import { W, C, BEATS } from '../data.js';
import { drawWorld, camera, ambientFireflies } from '../world.js';
import { lumi, fallenStar, friend } from '../characters.js';
import {
  clamp, lerp, seg, sine, smooth, outCubic, outBack, rgba, glow, spark, dust, window01,
} from '../draw.js';

const T = s => s - 24;
const STAR = [1215, 700];
const FRIEND_ANGLES = [-2.65, -2.1, -1.57, -1.05, -0.5];
const FRIEND_COLORS = C.friend;

export function draw(ctx, t) {
  const zoom = 1.5;
  const shake = (() => {
    const a = window01(t, T(26.5), T(26.95), 0.1);
    const b = window01(t, T(29.8), T(30.3), 0.1);
    return Math.sin(t * 70) * (a * 5 + b * 9);
  })();

  ctx.save();
  ctx.translate(shake, shake * 0.5);
  camera(ctx, zoom, 1090, 690);

  drawWorld(ctx, t, { camY: 0, density: 1, fg: 1 });
  ambientFireflies(ctx, t, { count: 6, seed: 91, alpha: 0.8 });

  // ---------- lift physics
  const l1 = smooth(seg(t, T(25.3), T(25.75))) * (1 - smooth(seg(t, T(26.35), T(26.55))));
  const l2 = smooth(seg(t, T(28.45), T(29.2))) * (1 - smooth(seg(t, T(29.55), T(29.85))));
  const lift = l1 * 26 + l2 * 86 + Math.sin(t * 16) * l2 * 5;
  const dropBounce = (() => {
    const a = window01(t, T(26.5), T(27.0), 0.08);
    const b = window01(t, T(29.8), T(30.35), 0.08);
    return Math.sin((t - T(26.5)) * 38) * a * 0.12 + Math.sin((t - T(29.8)) * 38) * b * 0.18;
  })();
  const strainAmt = Math.max(l1, l2);

  // ---------- star
  const sy = STAR[1] - lift;
  const dim = 0.3 + strainAmt * 0.06;
  fallenStar(ctx, STAR[0], sy, 78, {
    glowAmt: dim,
    expr: t < T(30.6) ? (strainAmt > 0.2 ? 'wonder' : 'sad') : 'sleep',
    spin: 0,
    tilt: -0.05 + Math.sin(t * 3) * 0.01,
    squash: clamp(dropBounce),
    sparkle: 0,
    t,
  });

  // dust on each drop
  if (t > T(26.5)) dust(ctx, STAR[0], STAR[1] + 30, seg(t, T(26.5), T(27.4)), { count: 10, seed: 21, color: '#9FB4C8', spread: 1.6 });
  if (t > T(29.8)) dust(ctx, STAR[0], STAR[1] + 30, seg(t, T(29.8), T(30.9)), { count: 16, seed: 22, color: '#9FB4C8', spread: 2.2, size: 24 });

  // ---------- Lumi
  const grab = smooth(seg(t, T(25.0), T(25.35))) * (1 - smooth(seg(t, T(30.4), T(31.0))));
  const deflate = smooth(seg(t, T(30.35), T(31.0))) * (1 - smooth(seg(t, T(31.2), T(31.6))));
  const idea = smooth(seg(t, T(31.15), T(31.5)));
  const pulse = window01(t, T(31.8), T(32.9), 0.15);
  const lx = lerp(1076, 1106, grab);
  const ly = lerp(560, sy + 80, grab) + deflate * 24 - idea * 26 + Math.sin(t * 2) * 4;
  const bob = Math.sin(t * 2.1) * 4;

  lumi(ctx, lx, lerp(ly, ly + bob, 0.4), 1.35, {
    pose: grab > 0.4 ? 'pull' : idea > 0.5 ? 'cheer' : 'sit',
    tilt: grab > 0.4 ? 0.18 : deflate * 0.16,
    flutter: t * (1 + strainAmt * 0.9),
    look: [grab > 0.4 ? -0.1 : 0.2, grab > 0.4 ? -0.6 : 0.5],
    blink: window01(t, T(30.7), T(30.9)) > 0.5 ? 0.9 : 0,
    eyes: strainAmt > 0.25 ? 'strain' : idea > 0.5 ? 'happy' : deflate > 0.3 ? 'sleep' : 'open',
    mouth: strainAmt > 0.25 ? 'o' : idea > 0.5 ? 'grin' : deflate > 0.3 ? 'frown' : 'smile',
    squash: strainAmt * 0.05,
    glowAmt: 0.55 + idea * 0.45,
    arms: grab,
  });

  // the idea: a bright bulb and a little burst
  if (t > T(31.1) && t < T(32.6)) {
    const p = seg(t, T(31.1), T(31.5));
    glow(ctx, lx + 20, ly - 68, 30 * (0.6 + 0.4 * Math.sin(t * 8)), '#F2FFD0', 0.9 * (1 - seg(t, T(32.0), T(32.6))));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const d = 34 + p * 26;
      spark(ctx, lx + 20 + Math.cos(a) * d, ly - 68 + Math.sin(a) * d, 9 * p, '#FFF6DE', (1 - p) * 0.9, t + i);
    }
  }

  // calling pulse
  if (pulse > 0.01 && pulse < 1) {
    const r = 40 + easeRing(t, T(31.8), T(32.9)) * 620;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, 6.283);
    ctx.strokeStyle = rgba('#C9F76F', 0.55 * (1 - pulse));
    ctx.lineWidth = 5 * (1 - pulse) + 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(lx, ly, r * 0.72, 0, 6.283);
    ctx.strokeStyle = rgba('#F2FFD0', 0.28 * (1 - pulse));
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ---------- friends arrive
  for (let i = 0; i < 5; i++) {
    const arrive = T(32.2) + i * 0.62;
    const p = outBack(seg(t, arrive, arrive + 0.75), 1.4);
    if (p <= 0) continue;
    const ang = FRIEND_ANGLES[i];
    const radius = 235;
    const tx = STAR[0] + Math.cos(ang) * radius;
    const ty = sy + Math.sin(ang) * radius * 0.62 + 6;
    const fromX = i % 2 ? W + 200 : -200;
    const fromY = 300 + i * 90;
    const x = lerp(fromX, tx, p) + Math.sin(t * 1.7 + i) * 6;
    const y = lerp(fromY, ty, p) + Math.cos(t * 2.1 + i * 1.4) * 7;
    friend(ctx, x, y, 1.8, FRIEND_COLORS[i], {
      flutter: t * 1.2,
      look: [-0.6, 0.4],
    });
    // arrival sparkle
    const ap = seg(t, arrive, arrive + 0.5);
    if (ap < 1) {
      spark(ctx, tx, ty, 22 * (1 - ap) + 6, FRIEND_COLORS[i], 1 - ap, t);
      glow(ctx, tx, ty, 40 * (1 - ap), FRIEND_COLORS[i], 0.6 * (1 - ap));
    }
  }

  // determined nod before the cut
  const nod = window01(t, 35.3, 35.9, 0.15);
  if (nod > 0) {
    for (let i = 0; i < 5; i++) {
      const ang = FRIEND_ANGLES[i];
      const radius = 235;
      const tx = STAR[0] + Math.cos(ang) * radius;
      const ty = sy + Math.sin(ang) * radius * 0.62 + 6;
      spark(ctx, tx, ty - 34, 7, '#FFF6DE', nod * 0.7, t * 0.4 + i);
    }
  }
  ctx.restore();
}

// smooth expanding ease for the pulse ring
function easeRing(t, a, b) {
  return 1 - Math.pow(1 - clamp((t - a) / (b - a)), 2.4);
}
