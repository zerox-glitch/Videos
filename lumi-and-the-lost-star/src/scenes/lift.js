// 36–48 s · Together they lift it — up past the clouds.
import { W, C, BEATS } from '../data.js';
import { drawWorld, camera, ambientFireflies } from '../world.js';
import { lumi, fallenStar, friend } from '../characters.js';
import {
  clamp, lerp, seg, sine, smooth, outCubic, inOut, rgba, glow, spark, window01,
} from '../draw.js';

const T = s => s - 36;
const RING = [-2.7, -2.15, -1.57, -1.0, -0.44];
const COLORS = C.friend;

export function draw(ctx, t) {
  const up = inOut(seg(t, T(38.0), T(47.6)));
  const camY = -1250 * up;
  const shake = window01(t, T(37.7), T(38.5), 0.12) * Math.sin(t * 50) * 4;

  ctx.save();
  ctx.translate(shake, 0);
  camera(ctx, lerp(1.0, 1.06, smooth(seg(t, 36, 48))), 960, 560);
  drawWorld(ctx, t, { camY, density: 1, cloudAlpha: 1 });
  ambientFireflies(ctx, t, { camY, count: 6, seed: 17, alpha: 0.5 });

  // star and its ring rise together; the screen keeps them near the centre
  const rise = smooth(seg(t, T(38.0), T(38.7)));
  const starY = lerp(760, 470, rise) + (t > T(38.6) ? Math.sin(t * 1.4) * 4 : 0);
  const starX = lerp(1210, 960, smooth(seg(t, T(36.2), T(38.2))));
  const starSize = 78;
  const glowAmt = clamp(0.3 + seg(t, T(38), T(47)) * 0.6);

  // ---------- glowing threads from friends to the star
  const threads = smooth(seg(t, T(36.3), T(37.8)));
  if (threads > 0) {
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const ang = RING[i];
      const fx = starX + Math.cos(ang) * 190;
      const fy = starY + Math.sin(ang) * 150 + 20;
      const grad = ctx.createLinearGradient(fx, fy, starX, starY);
      grad.addColorStop(0, rgba(COLORS[i], 0.0));
      grad.addColorStop(0.5, rgba(COLORS[i], 0.35 * threads));
      grad.addColorStop(1, rgba('#FFF3C4', 0.75 * threads));
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo((fx + starX) / 2, (fy + starY) / 2 + 26, starX, starY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.2;
      ctx.stroke();
    }
    // woven light under the star
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = RING[i];
      const fx = starX + Math.cos(ang) * 190;
      const fy = starY + Math.sin(ang) * 150 + 20;
      if (i === 0) ctx.moveTo(fx, fy);
      else ctx.quadraticCurveTo(starX + Math.cos(ang + 0.3) * 120, starY + 190, fx, fy);
    }
    ctx.closePath();
    ctx.fillStyle = rgba('#FFF3C4', 0.06 * threads);
    ctx.fill();
    ctx.restore();
  }

  // ---------- friends
  for (let i = 0; i < 5; i++) {
    const ang = RING[i];
    const fx = starX + Math.cos(ang) * 190 + Math.sin(t * 1.3 + i) * 4;
    const fy = starY + Math.sin(ang) * 150 + 20 + Math.cos(t * 1.7 + i) * 5;
    friend(ctx, fx, fy, 1.85, COLORS[i], {
      flutter: t * (1.4 + up * 0.8),
      look: [0, -0.8],
    });
  }

  // ---------- Lumi below the star, guiding it
  const lumiY = starY + 158 + Math.sin(t * 1.8) * 5;
  lumi(ctx, starX, lumiY, 1.35, {
    pose: 'pull',
    tilt: 0.06,
    flutter: t * 1.7,
    look: [0, -0.85],
    eyes: t < T(43) ? 'strain' : 'happy',
    mouth: t < T(43) ? 'o' : 'grin',
    glowAmt: 1,
    arms: 1,
  });

  // ---------- the star
  fallenStar(ctx, starX, starY, starSize, {
    glowAmt,
    expr: t > T(44.5) ? 'wonder' : 'sleep',
    spin: Math.sin(t * 0.6) * 0.06,
    tilt: Math.sin(t * 1.1) * 0.04,
    sparkle: seg(t, T(43.5), T(46)),
    t,
  });

  // ---------- wind streaks while climbing
  const windA = window01(t, T(38.4), T(47.5), 1.0) * 0.7;
  if (windA > 0.01) {
    for (let i = 0; i < 13; i++) {
      const sx = (i * 197 + t * 260) % (W + 300) - 150;
      const sy = (i * 271) % 900 + 60 + ((t * 420) % 300);
      const len = 60 + ((i * 37) % 110);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + len, sy + len * 0.35);
      ctx.strokeStyle = rgba('#BFD8EA', 0.13 * windA);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // cloud pass: a bright puff sweeps the camera at 41.4 s
  const cp = window01(t, T(41.0), T(42.4), 0.45);
  if (cp > 0.01) {
    // a soft veil of mist sweeping past the lens — no hard blobs over the heroes
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(170,200,232,0)');
    g.addColorStop(0.35, `rgba(180,208,238,${0.20 * cp})`);
    g.addColorStop(0.6, `rgba(205,226,246,${0.26 * cp})`);
    g.addColorStop(0.85, 'rgba(170,200,232,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 1080);
    for (let i = 0; i < 4; i++) {
      const x = W * 0.15 + i * 480 - ((t * 340) % 520);
      const y = 780 + Math.sin(i * 2.4) * 80;
      const r = 260;
      const rg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
      rg.addColorStop(0, `rgba(214,234,250,${0.22 * cp})`);
      rg.addColorStop(1, 'rgba(214,234,250,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }

  // tiny sparks drifting off the star as it brightens
  if (t > T(42)) {
    for (let i = 0; i < 10; i++) {
      const p = ((t - T(42)) * 0.35 + i * 0.31) % 1;
      const a = i * 2.4 + t * 0.4;
      const r = 70 + p * 130;
      const x = starX + Math.cos(a) * r;
      const y = starY + Math.sin(a) * r * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, 6.283);
      ctx.fillStyle = rgba('#FFF3C4', (1 - p) * 0.6);
      ctx.fill();
      if (i % 3 === 0) glow(ctx, x, y, 8, '#FFE7A8', (1 - p) * 0.35);
    }
  }
  ctx.restore();
}
