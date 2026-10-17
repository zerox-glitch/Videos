// 60–72 s · Goodnight, little star.
import { W, C, BEATS } from '../data.js';
import { drawWorld, camera, ambientFireflies } from '../world.js';
import { lumi, heartConstellation } from '../characters.js';
import {
  clamp, lerp, seg, sine, smooth, outCubic, outBack, outExpo, rgba, glow, spark, text, window01,
} from '../draw.js';

const T = s => s - 60;
const MUSH = [430, 948];

function mushroom(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // stalk
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.bezierCurveTo(-24, -40, -20, -84, -14, -104);
  ctx.lineTo(14, -104);
  ctx.bezierCurveTo(20, -84, 24, -40, 16, 0);
  ctx.closePath();
  ctx.fillStyle = '#D9C6A6';
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,30,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // cap
  ctx.beginPath();
  ctx.moveTo(-96, -100);
  ctx.bezierCurveTo(-96, -176, 96, -176, 96, -100);
  ctx.bezierCurveTo(60, -84, -60, -84, -92, -100);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -168, 0, -88);
  g.addColorStop(0, '#E86A5C');
  g.addColorStop(1, '#B8413F');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,25,0.35)';
  ctx.stroke();
  // spots
  for (const [dx, dy, r] of [[-52, -130, 13], [-4, -140, 8], [38, -124, 10]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, 6.283);
    ctx.fillStyle = 'rgba(255,244,226,0.85)';
    ctx.fill();
  }
  // grass at the base
  ctx.strokeStyle = '#060B1E';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const gx = -60 + i * 20;
    const h = 26 + (i % 3) * 14;
    ctx.beginPath();
    ctx.moveTo(gx, 6);
    ctx.quadraticCurveTo(gx + 6, -h * 0.5, gx + 14 + Math.sin(t * 1.3 + i) * 3, -h);
    ctx.stroke();
  }
  ctx.restore();
}

export function draw(ctx, t) {
  const dawn = smooth(seg(t, 0, 12)) * 0.42;
  ctx.save();
  camera(ctx, lerp(1.02, 1.0, smooth(seg(t, 0, 6))), 960, 560);
  drawWorld(ctx, t, { camY: 0, dawn, moonFace: 1, cloudAlpha: 1 });
  ambientFireflies(ctx, t, { count: 7, seed: 33, alpha: 0.65 });

  // a faint echo of the constellation she made
  if (t > T(63)) heartConstellation(ctx, 1500, 190, 4.4, smooth(seg(t, T(63), T(66))), t, 0.35);

  mushroom(ctx, MUSH[0], MUSH[1], 1.95, t);

  // ---------- Lumi's landing and bedtime
  const land = smooth(seg(t, T(60.2), T(61.5)));
  const settle = smooth(seg(t, T(62.0), T(63.2)));
  const x = lerp(1080, MUSH[0], land);
  const y = lerp(430, MUSH[1] - 228, land) + Math.sin(t * 2) * (1 - settle) * 6;
  const yawn = window01(t, T(61.65), T(62.65), 0.25);
  const asleep = smooth(seg(t, T(63.4), T(64.4)));

  if (t < T(63.4)) {
    lumi(ctx, x, y, lerp(1.3, 1.15, land), {
      pose: yawn > 0.3 ? 'sit' : 'fly',
      tilt: lerp(0.1, -0.05, land),
      flutter: t * lerp(1.6, 0.5, land),
      look: [0, 0.3],
      eyes: yawn > 0.35 ? 'sleep' : 'open',
      mouth: yawn > 0.35 ? 'yawn' : 'smile',
      glowAmt: 1,
      blink: window01(t, T(63.1), T(63.3)) > 0.4 ? 1 : 0,
    });
  } else {
    // curled up, wings folded
    const breath = 0.5 + 0.5 * Math.sin(t * 1.1);
    glow(ctx, x + 20, y + 22, 34, C.lumiGlow, 0.24 + breath * 0.24);
    ctx.save();
    ctx.translate(x, y + 6);
    ctx.rotate(-0.12);
    ctx.scale(1.12, 0.7);
    lumi(ctx, 0, 0, 1, {
      pose: 'sleep', eyes: 'sleep', mouth: 'smile', glowAmt: 0.45,
      flutter: t * 0.4, wingSpread: 0.35,
    });
    ctx.restore();
    // zzz
    for (let i = 0; i < 3; i++) {
      const p = ((t - T(64)) * 0.34 + i * 0.33) % 1;
      if (p <= 0) continue;
      const a = Math.sin(p * Math.PI) * 1.0 * (1 - smooth(seg(t, T(70), T(71))));
      text(ctx, 'z', x + 58 + p * 40 + i * 8, y - 48 - p * 80, {
        size: 24 + i * 8, family: 'Baloo', color: C.cream, alpha: a * 0.65,
      });
    }
  }

  // ---------- title
  const titleIn = seg(t, T(65.9), T(67.2));
  if (titleIn > 0) {
    const veil = smooth(seg(t, T(65.7), T(66.6)));
    ctx.save();
    ctx.globalAlpha = veil * 0.55;
    const g = ctx.createRadialGradient(W / 2, 400, 60, W / 2, 400, 860);
    g.addColorStop(0, 'rgba(6,8,28,0.92)');
    g.addColorStop(1, 'rgba(6,8,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 1080);
    ctx.restore();

    // little star above the title
    const sp = outBack(seg(t, T(66.0), T(66.8)), 2.2);
    if (sp > 0) {
      spark(ctx, W / 2, 236, 30 * sp, '#FFF3C4', 0.9 * clamp(sp), t * 0.3);
      glow(ctx, W / 2, 236, 60 * sp, '#FFE7A8', 0.5);
    }

    // LUMI
    const l1 = outExpo(seg(t, T(66.1), T(67.1)));
    const dy1 = (1 - l1) * 40;
    text(ctx, 'LUMI', W / 2, 452 + dy1, {
      size: 168, family: 'Baloo Bold', color: C.cream, align: 'center',
      alpha: clamp(l1 * 1.2), track: lerp(28, 8, l1), shadow: 30, shadowColor: 'rgba(255,220,150,0.35)',
    });

    // & the lost star
    const l2 = outExpo(seg(t, T(66.6), T(67.6)));
    const dy2 = (1 - l2) * 30;
    const w1 = 210;
    ctx.save();
    ctx.globalAlpha = clamp(l2);
    ctx.strokeStyle = 'rgba(255,246,229,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - w1 - 140, 528);
    ctx.lineTo(W / 2 - 150, 528);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 + 150, 528);
    ctx.lineTo(W / 2 + w1 + 140, 528);
    ctx.stroke();
    ctx.restore();
    text(ctx, '& THE LOST STAR', W / 2, 546 + dy2, {
      size: 62, family: 'Baloo', color: C.lime, align: 'center',
      alpha: clamp(l2), track: 10, shadow: 16, shadowColor: 'rgba(0,0,0,0.5)',
    });

    const l3 = smooth(seg(t, T(67.6), T(68.4)));
    text(ctx, 'a little story about one small light', W / 2, 626, {
      size: 34, family: 'Nunito', color: 'rgba(255,246,229,0.75)', align: 'center', alpha: l3, track: 1.5,
    });
    const l4 = smooth(seg(t, T(68.6), T(69.4)));
    text(ctx, 'the end', W / 2, 700, {
      size: 30, family: 'Baloo', color: 'rgba(201,247,111,0.8)', align: 'center', alpha: l4, track: 8,
    });
  }
  ctx.restore();
}
