// 48–60 s · She lets go, and the sky lights up like a smile.
import { W, H, C, BEATS } from '../data.js';
import { drawWorld, camera } from '../world.js';
import { lumi, fallenStar, friend, heartConstellation } from '../characters.js';
import {
  clamp, lerp, seg, sine, smooth, outCubic, outExpo, outBack, rgba, glow, spark, window01,
} from '../draw.js';

const T = s => s - 48;
const CEN = [960, 470];

export function draw(ctx, t) {
  const burst = seg(t, T(BEATS.burst), T(BEATS.burst) + 1.6);
  const preShake = window01(t, T(BEATS.burst) - 0.35, T(BEATS.burst), 0.2);
  const shake = (burst > 0 && burst < 1 ? Math.sin(t * 60) * 8 * (1 - burst) ** 2 : 0) + preShake * Math.sin(t * 90) * 2;

  ctx.save();
  ctx.translate(shake, shake * 0.7);
  camera(ctx, lerp(1.0, 1.04, smooth(seg(t, 48, 60))), 960, 480);

  // deep sky, with the moon lower than us now
  drawWorld(ctx, t, { camY: -1520, dawn: 0, density: 1.15, moonFace: smooth(seg(t, T(52.5), T(55))), cloudAlpha: 0.8 });

  // ---------- the star's ascent
  const up = smooth(seg(t, T(48), T(51.6)));
  const sx = CEN[0] + Math.sin(t * 0.5) * 10;
  const sy = lerp(CEN[1] - 30, 250, up);
  const spin = t < T(50.6) ? (t - T(48)) * 0.5 : 0.5 * 3.6 + (t - T(50.6)) * 0.12;
  const starScale = lerp(64, 74, up);

  if (t < T(50.6) + 0.05) {
    fallenStar(ctx, sx, sy, starScale, {
      glowAmt: clamp(0.7 + seg(t, T(48), T(50.4)) * 0.6),
      expr: 'wonder',
      spin,
      sparkle: 0.6 + 0.4 * Math.sin(t * 3),
      t,
    });
  }

  // ---------- burst
  if (burst > 0 && burst < 1) {
    const g = ctx.createRadialGradient(CEN[0], 250, 0, CEN[0], 250, 420 + burst * 900);
    g.addColorStop(0, rgba('#FFFDF2', 0.85 * (1 - burst) ** 1.5));
    g.addColorStop(0.3, rgba('#FFE7A8', 0.4 * (1 - burst)));
    g.addColorStop(1, 'rgba(255,231,168,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 1080);
    for (let i = 0; i < 3; i++) {
      const p = clamp((burst - i * 0.14) / (1 - i * 0.14));
      if (p <= 0 || p >= 1) continue;
      ctx.beginPath();
      ctx.arc(CEN[0], 250, 60 + p * (700 + i * 120), 0, 6.283);
      ctx.strokeStyle = rgba('#FFF3C4', 0.5 * (1 - p) ** 1.4);
      ctx.lineWidth = 10 * (1 - p) + 1;
      ctx.stroke();
    }
    // radial light rays
    ctx.save();
    ctx.translate(CEN[0], 250);
    ctx.rotate(t * 0.2);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      const len = 300 + burst * 700;
      const grad = ctx.createLinearGradient(0, 0, 0, -len);
      grad.addColorStop(0, rgba('#FFE7A8', 0.35 * (1 - burst)));
      grad.addColorStop(1, 'rgba(255,231,168,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.lineTo(0, -len); ctx.lineTo(10, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- constellation
  const constP = smooth(seg(t, T(51.0), T(53.3)));
  if (constP > 0) {
    heartConstellation(ctx, CEN[0], 318, 14.5, constP, t, 0.95);
  }

  // ---------- the returned star, brightest of all
  if (t > T(50.6)) {
    const settle = smooth(seg(t, T(50.6), T(53.5)));
    const bx = lerp(CEN[0], 1400, settle);
    const by = lerp(250, 170, settle);
    const tw = 0.75 + 0.25 * Math.sin(t * 2.2);
    glow(ctx, bx, by, 90, '#FFE7A8', 0.5 * tw);
    fallenStar(ctx, bx, by, 46, {
      glowAmt: 1, expr: t > T(56) ? 'wink' : 'happy', spin: t * 0.1, sparkle: tw, t,
    });
  }

  // ---------- fireflies celebrate
  const flyOut = smooth(seg(t, T(49.6), T(52.5)));
  for (let i = 0; i < 5; i++) {
    const base = -Math.PI / 2 + (i - 2) * 0.4;
    const orbit = t * (0.55 + i * 0.06) + i * 1.3;
    const r = 170 + flyOut * 210 + Math.sin(t * 1.4 + i) * 18;
    const fx = CEN[0] + Math.cos(orbit) * r * 1.5;
    const fy = 470 + Math.sin(orbit) * r * 0.85;
    friend(ctx, fx, fy, 1.55, C.friend[i], { flutter: t * 1.8, look: [0, -0.4] });
    if (i % 2 === 0) spark(ctx, fx, fy, 10, C.friend[i], 0.4 + 0.3 * Math.sin(t * 3 + i), t);
  }

  // ---------- Lumi
  const joy = smooth(seg(t, T(51.0), T(52.0)));
  const spinJoy = window01(t, T(51.3), T(54.5), 0.6);
  const lx = CEN[0] + Math.sin(t * 0.9) * 40 * (1 - joy * 0.4);
  const ly = 660 - joy * 70 + Math.sin(t * 2.2) * 8;
  lumi(ctx, lx, ly, 1.5, {
    pose: 'cheer',
    tilt: Math.sin(t * 3) * 0.2 * spinJoy,
    flutter: t * 1.6,
    look: [0, -0.7],
    eyes: 'happy',
    mouth: 'grin',
    glowAmt: 1,
    wingSpread: 1.1,
    arms: 0.6,
  });

  // drifting petals of light after the burst
  if (t > T(51)) {
    for (let i = 0; i < 26; i++) {
      const seedT = i * 0.73;
      const p = ((t - T(51)) * 0.16 + seedT) % 1;
      const x = ((i * 311) % W) + Math.sin(p * 6 + i) * 60 + p * 40;
      const y = -40 + p * (H + 80);
      const a = Math.sin(p * Math.PI) * 0.55;
      const s = 2 + (i % 4);
      ctx.beginPath();
      ctx.arc(x, y, s, 0, 6.283);
      ctx.fillStyle = rgba(i % 3 ? '#FFF3C4' : '#C9F76F', a);
      ctx.fill();
    }
  }
  ctx.restore();
}
