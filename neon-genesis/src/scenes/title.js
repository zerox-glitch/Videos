// CHAPTER 5 — TITLE. 27.0–30.0 s (local 0–3)
import { Camera } from '../lib/math3d.js';
import { C } from '../data.js';
import { clamp, lerp, seg, smooth, outCubic, inCubic, rgba, glow, bloom, anamorphic, grain, vignette, black, TAU } from '../lib/gfx.js';
import { drawDie, DIE } from '../world/die.js';

const cam = new Camera();

const TITLE = 'NEON GENESIS';
const TAG = 'REALITY IS JUST ANOTHER SIMULATION.';
const TITLE_START = 0.32;
const TAG_START = 1.12;

function drawTracked(ctx, text, cx, y, {
  font = '100px Michroma', tracking = 20, fill = '#EAF6FF',
  alphaFor = () => 1, yFor = () => 0, scale = 1, shadow = null,
} = {}) {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const widths = chars.map(c => ctx.measureText(c).width * scale);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    const a = alphaFor(i, chars[i]);
    if (a > 0.002 && chars[i] !== ' ') {
      ctx.globalAlpha = a;
      if (shadow) {
        ctx.shadowColor = shadow.color;
        ctx.shadowBlur = shadow.blur;
      }
      ctx.fillStyle = fill;
      ctx.save();
      ctx.translate(x + widths[i] / 2, y + yFor(i));
      ctx.scale(scale, scale);
      ctx.fillText(chars[i], -widths[i] / (2 * scale), 0);
      ctx.restore();
      ctx.shadowBlur = 0;
    }
    x += widths[i] + tracking;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function draw(ctx, T, { W, H }) {
  const t = T;
  const u = smooth(seg(t, 0, 3));

  /* camera: slow orbit continuing from the collapse */
  const eye = [
    lerp(3000, 2700, u),
    lerp(4000, 3800, u),
    lerp(5500, 5200, u),
  ];
  cam.set(eye, [0, 900, -800], { fov: lerp(34, 33, u), roll: Math.sin(t * 0.25) * 0.006, near: 2, far: 26000 });
  cam.update(W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010105');
  sky.addColorStop(0.55, '#03070F');
  sky.addColorStop(1, '#02060C');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const pulse = t > 2.3 ? Math.exp(-(t - 2.3) * 3.2) : 0;
  const chase = smooth(seg(t, 0, 1.4));

  drawDie(ctx, cam, t + 5, {
    rise: 1, alpha: 0.9, chase: 0.75 + pulse,
    yaw: lerp(0, 0.16, u),
    circuitScale: 2.2,
  });

  // chip underglow
  const cp = cam.project([DIE.c[0], -20, DIE.c[2]]);
  if (cp) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, W * 0.5);
    g.addColorStop(0, `rgba(40,130,190,${0.2 + pulse * 0.35})`);
    g.addColorStop(1, 'rgba(6,16,32,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ------------------------------- atmosphere post (before the type) */
  bloom(ctx, W, H, { strength: 0.42, threshold: 0.6, radius: 12 });
  anamorphic(ctx, W, H, { strength: 0.3, color: '#6BEFFF', threshold: 0.8 });
  grain(ctx, W, H, t, 0.028);
  vignette(ctx, W, H, 0.55);

  /* ------------------------------------------------------------- scrim */
  const scrim = ctx.createLinearGradient(0, 0, 0, H);
  scrim.addColorStop(0, 'rgba(1,2,6,0.82)');
  scrim.addColorStop(0.42, 'rgba(1,2,6,0.55)');
  scrim.addColorStop(0.62, 'rgba(1,2,6,0)');
  scrim.addColorStop(1, 'rgba(1,2,6,0.25)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);

  /* ------------------------------------------------------------- title */
  const ty = H * 0.285;
  ctx.save();
  ctx.font = '112px Michroma';
  const titleW = ctx.measureText(TITLE).width + 24 * (TITLE.length - 1);
  ctx.font = '25px Chakra Light';
  const tagW = ctx.measureText(TAG).width + 9.5 * (TAG.length - 1);
  ctx.restore();
  const fit = Math.min(1, (W * 0.78) / titleW, (W * 0.72) / tagW * 2.6);
  const tf = 112 * fit;
  const tt = 24 * fit;
  const tagF = Math.round(27 * Math.min(1, fit * 1.12));
  const tagY = ty + tf * 0.8;
  const revealWipe = smooth(seg(t, 0.32, 1.35));

  // chromatic ghosts
  const ghostA = smooth(seg(t, TITLE_START + 0.05, TITLE_START + 0.9));
  if (ghostA > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawTracked(ctx, TITLE, W / 2 - 3, ty, {
      font: `${tf}px Michroma`, tracking: tt, fill: 'rgba(255,46,154,0.45)',
      alphaFor: (i) => clamp((t - TITLE_START - i * 0.042) / 0.32) * ghostA,
    });
    drawTracked(ctx, TITLE, W / 2 + 3, ty, {
      font: `${tf}px Michroma`, tracking: tt, fill: 'rgba(55,242,255,0.45)',
      alphaFor: (i) => clamp((t - TITLE_START - i * 0.042) / 0.32) * ghostA,
    });
    ctx.restore();
  }

  // main title with a glow pass
  drawTracked(ctx, TITLE, W / 2, ty, {
    font: `${tf}px Michroma`, tracking: tt, fill: 'rgba(160,235,255,0.5)',
    alphaFor: (i) => clamp((t - TITLE_START - i * 0.042) / 0.34) * 0.9,
    yFor: (i) => (1 - clamp((t - TITLE_START - i * 0.042) / 0.34)) * 8,

  });
  drawTracked(ctx, TITLE, W / 2, ty, {
    font: `${tf}px Michroma`, tracking: tt, fill: '#F2FDFF',
    alphaFor: (i) => clamp((t - TITLE_START - i * 0.042) / 0.34),
    yFor: (i) => (1 - clamp((t - TITLE_START - i * 0.042) / 0.34)) * 8,
  });

  // light sweep across the title glyphs only
  const sweepT = seg(t, 1.15, 1.85);
  if (sweepT > 0 && sweepT < 1) {
    const x = lerp(W * 0.1, W * 0.9, sweepT);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 300, 0, x + 300, 0);
    g.addColorStop(0, 'rgba(120,240,255,0)');
    g.addColorStop(0.45, 'rgba(180,250,255,0.55)');
    g.addColorStop(0.55, 'rgba(230,255,255,0.85)');
    g.addColorStop(1, 'rgba(120,240,255,0)');
    drawTracked(ctx, TITLE, W / 2, ty, {
      font: `${tf}px Michroma`, tracking: tt, fill: g,
      alphaFor: () => 1,
    });
    ctx.restore();
  }

  /* ------------------------------------------------------------- rule */
  const ruleW = smooth(seg(t, 0.95, 1.6)) * 420;
  if (ruleW > 0.5) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(W / 2 - ruleW, 0, W / 2 + ruleW, 0);
    g.addColorStop(0, 'rgba(55,242,255,0)');
    g.addColorStop(0.5, 'rgba(180,240,255,0.85)');
    g.addColorStop(1, 'rgba(55,242,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - ruleW, ty + tf * 0.58, ruleW * 2, 1.2);
    ctx.fillStyle = 'rgba(255,46,154,0.5)';
    ctx.fillRect(W / 2 - ruleW * 0.55, ty + tf * 0.58 + 4, ruleW * 1.1, 0.8);
    ctx.restore();
  }

  /* ----------------------------------------------------------- tagline */
  drawTracked(ctx, TAG, W / 2, tagY, {
    font: `${tagF}px Chakra Light`, tracking: 9.5, fill: 'rgba(190,230,255,0.92)',
    alphaFor: (i) => clamp((t - TAG_START - i * 0.012) / 0.4) * 0.9,
    shadow: { color: 'rgba(80,200,255,0.6)', blur: 12 },
  });

  // side ticks framing the tagline
  const tick = smooth(seg(t, 1.25, 1.9));
  if (tick > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(120,220,255,${0.5 * tick})`;
    ctx.lineWidth = 1;
    const len = 70 * tick;
    for (const s of [-1, 1]) {
      const x0 = W / 2 + s * 430;
      ctx.beginPath();
      ctx.moveTo(x0, tagY);
      ctx.lineTo(x0 + s * len, tagY);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ----------------------------------------------------- final pulses */
  if (pulse > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(W * 0.5, H * 0.66, 0, W * 0.5, H * 0.66, W * 0.5);
    g.addColorStop(0, `rgba(190,250,255,${pulse * 0.55})`);
    g.addColorStop(0.4, `rgba(60,170,230,${pulse * 0.18})`);
    g.addColorStop(1, 'rgba(10,30,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }


  grain(ctx, W, H, t + 7, 0.016);

  // hard cut to black on the final beat
  if (t >= 2.78) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
}
