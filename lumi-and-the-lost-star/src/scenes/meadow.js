// 0–12 s · A quiet meadow, and Lumi.
import { W, C } from '../data.js';
import { mulberry32 } from '../draw.js';
import { drawWorld, camera, ambientFireflies, hills, grass } from '../world.js';
import { lumi, friend } from '../characters.js';
import {
  clamp, lerp, seg, sine, smooth, outCubic, spark, glow, window01,
} from '../draw.js';

const bez = (p0, p1, p2, p3, u) => {
  const v = 1 - u;
  return [
    v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
    v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
  ];
};

function flight(t) {
  // enter from the left
  if (t < 1.8) return { x: -160, y: 600, tilt: 0, flap: 1, glow: 1 };
  if (t < 4.3) {
    const u = outCubic(seg(t, 1.8, 4.3));
    const [x, y] = bez([-200, 620], [230, 300], [660, 180], [930, 300], u);
    const [x2, y2] = bez([-200, 620], [230, 300], [660, 180], [930, 300], Math.min(1, u + 0.02));
    return { x, y, tilt: Math.atan2(y2 - y, x2 - x) * 0.5, flap: 1, glow: 1 };
  }
  // one happy loop
  if (t < 5.15) {
    const a = seg(t, 4.3, 5.15) * Math.PI * 2 - Math.PI / 2;
    const cx = 985, cy = 268, r = 88;
    return {
      x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
      tilt: a + Math.PI / 2, flap: 1.25, glow: 1,
    };
  }
  if (t < 6.4) {
    const u = smooth(seg(t, 5.15, 6.4));
    const [x, y] = bez([975, 356], [900, 470], [800, 508], [742, 486], u);
    return { x, y, tilt: lerp(0.2, 0, u), flap: 1, glow: 1 };
  }
  // hover, then drift and look up
  const drift = smooth(seg(t, 8.4, 10.6));
  const x = lerp(742, 862, drift) + Math.sin(t * 1.3) * 9;
  const y = lerp(486, 444, drift) + Math.cos(t * 1.7) * 8;
  return { x, y, tilt: lerp(0, -0.12, drift) + Math.sin(t * 1.1) * 0.02, flap: 0.55, glow: 1 };
}

/** Storybook foliage: dark mass, clear leaf clusters, cool moonlit tips. */
function leafClump(ctx, x, y, r, rnd, t, palette = {}) {
  const deep = palette.deep || '#04070F';
  const mid = palette.base || '#0A1830';
  const lit = palette.crown || 'rgba(126,178,214,0.45)';
  const swayX = Math.sin(t * 0.7 + x * 0.01) * 2.2;
  ctx.save();
  ctx.translate(swayX, 0);

  const leaves = [];
  const N = 11;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rnd() * 0.25;
    const d = r * (0.18 + rnd() * 0.62);
    const lr = r * (0.24 + rnd() * 0.16);
    leaves.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.78, lr]);
  }
  leaves.sort((a, b) => a[1] - b[1]);

  // dark base
  for (const [lx, ly, lr] of leaves) {
    ctx.beginPath();
    ctx.ellipse(lx, ly + lr * 0.22, lr * 0.95, lr * 0.9, 0, 0, 6.283);
    ctx.fillStyle = deep;
    ctx.fill();
  }
  // lit leaf tops, lower half in shade
  for (const [lx, ly, lr] of leaves) {
    const g = ctx.createLinearGradient(lx, ly - lr, lx, ly + lr);
    g.addColorStop(0, mid);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, deep);
    ctx.beginPath();
    ctx.ellipse(lx, ly, lr * 0.9, lr * 0.86, 0, 0, 6.283);
    ctx.fillStyle = g;
    ctx.fill();
    // moonlit upper edge
    ctx.beginPath();
    ctx.ellipse(lx, ly - lr * 0.12, lr * 0.82, lr * 0.7, 0, Math.PI * 1.08, Math.PI * 1.72);
    ctx.strokeStyle = lit;
    ctx.lineWidth = Math.max(1.6, r * 0.018);
    ctx.stroke();
  }
  ctx.restore();
}

function bigTree(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const tg = ctx.createLinearGradient(-46, 0, 44, 0);
  tg.addColorStop(0, '#0B0C1A');
  tg.addColorStop(0.5, '#141326');
  tg.addColorStop(1, '#05060F');
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.bezierCurveTo(-40, -170, -44, -300, -26, -430);
  ctx.bezierCurveTo(-70, -520, -110, -570, -150, -600);
  ctx.bezierCurveTo(-120, -640, -60, -620, -12, -540);
  ctx.bezierCurveTo(20, -600, 70, -640, 120, -650);
  ctx.bezierCurveTo(96, -590, 46, -540, 16, -450);
  ctx.bezierCurveTo(34, -300, 34, -150, 56, 0);
  ctx.closePath();
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.bezierCurveTo(-40, -170, -44, -300, -26, -430);
  ctx.strokeStyle = 'rgba(150,196,220,0.16)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const rnd = mulberry32(4242);
  ctx.fillStyle = '#050B18';
  ctx.beginPath(); ctx.ellipse(0, -570, 250, 170, 0, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-170, -500, 150, 120, 0, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(180, -520, 155, 125, 0, 0, 6.283); ctx.fill();
  const spots = [[-250, -500, 132], [-110, -630, 150], [60, -700, 158], [230, -620, 140], [300, -500, 120], [-30, -470, 140], [150, -500, 128]];
  for (const [bx, by, br] of spots) leafClump(ctx, bx, by, br, rnd, t, { base: '#0A1A34', deep: '#04070F', crown: 'rgba(140,190,224,0.5)' });
  ctx.restore();
}

function bush(ctx, x, y, s, t) {
  const rnd = mulberry32(Math.round(x));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  for (let i = 0; i < 3; i++) {
    leafClump(ctx, (i - 1) * 54 + rnd() * 14, -34 - rnd() * 10, 44 + rnd() * 10, rnd, t, { base: '#081527', deep: '#03060F', crown: 'rgba(140,190,224,0.42)' });
  }
  ctx.restore();
}

export function draw(ctx, t) {
  const zoom = lerp(1.02, 1.14, smooth(seg(t, 0, 12)));
  ctx.save();
  camera(ctx, zoom, 860, 520);

  drawWorld(ctx, t, { camY: 0, fg: 0.9 });

  // a big storybook tree anchors the left third
  bigTree(ctx, 250, 905, 1, t);

  // bushes along the back of the meadow
  for (const [bx, bs] of [[120, 0.9], [1350, 0.8], [1760, 1.0]]) {
    bush(ctx, bx, 908, bs, t);
  }
  ambientFireflies(ctx, t, { count: 12, alpha: 1 });

  // two friends already live in this meadow — they return in act 3
  const peek = smooth(seg(t, 6.6, 7.6));
  if (peek > 0) {
    friend(ctx, 1480, 760 + Math.sin(t * 1.6) * 8, 1.15, C.friend[1], { flutter: t * 1.1, look: [-0.7, 0.1] });
    friend(ctx, 1608, 812 + Math.cos(t * 1.4) * 7, 0.95, C.friend[2], { flutter: t * 1.3, look: [-0.5, 0.2] });
  }

  const f = flight(t);
  const hover = Math.sin(t * 2.2) * 3;
  const blink = seg((t % 3.4), 3.1, 3.35) > 0 && seg((t % 3.4), 3.1, 3.35) < 1 ? 1 : 0;
  const looking = t > 6.2 && t < 8.6 ? [-0.6, 0.2] : t >= 8.6 ? [0.9, -0.9] : [0.1, 0];
  const cheer = t > 4.3 && t < 5.2;

  lumi(ctx, f.x, f.y + hover, 1.72, {
    pose: cheer ? 'cheer' : 'fly',
    tilt: f.tilt,
    flutter: t * f.flap,
    look: looking,
    blink: blink ? 0.85 : 0,
    eyes: cheer ? 'happy' : 'open',
    mouth: cheer ? 'grin' : 'smile',
    glowAmt: 1,
  });

  // sparkle trail behind her while she is moving fast
  if (t > 1.8 && t < 6.5) {
    for (let i = 0; i < 7; i++) {
      const tt = t - i * 0.055;
      if (tt < 1.8) continue;
      const p = flight(tt);
      const a = (1 - i / 7) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x - 14, p.y + 16, (1 - i / 7) * 3.6, 0, 6.283);
      ctx.fillStyle = `rgba(213,255,150,${a})`;
      ctx.fill();
      if (i % 2 === 0) glow(ctx, p.x - 14, p.y + 16, 7, '#D5FF96', a * 0.5);
    }
  }

  // first glint of the star, high in the sky, just before it falls
  if (t > 10.4) {
    const p = seg(t, 10.4, 11.6);
    spark(ctx, 1690, 150, 12 + p * 20, '#FFF6DE', p * 0.9, t);
    glow(ctx, 1690, 150, 30 * p, '#FFF6DE', 0.6 * p);
    // a sparkle lands on her double-take
    const land = window01(t, 11.0, 11.4, 0.12);
    if (land > 0) spark(ctx, f.x + 26, f.y - 30, 26 * land, '#FFF3C4', land, t * 0.6);
  }
  ctx.restore();
}
