// 12–24 s · A star slips out of the sky and lands with a bump.
import { W, C, BEATS } from '../data.js';
import { drawWorld, camera } from '../world.js';
import { lumi, fallenStar, trail } from '../characters.js';
import {
  clamp, lerp, seg, sine, smooth, outCubic, outExpo, inCubic, rgba, glow, spark,
  dust,
} from '../draw.js';

const LAND = [1240, 812];
const SKY_START = [1780, -180];
const T = s => s - 12;

function starPos(t) {
  if (t < T(BEATS.starFall)) return null;
  const u = clamp((t - T(BEATS.starFall)) / (T(BEATS.starLand) - T(BEATS.starFall)));
  const e = Math.pow(u, 2.2); // gravity
  const x = lerp(SKY_START[0], LAND[0], e);
  const y = lerp(SKY_START[1], LAND[1], e) - Math.sin(u * Math.PI) * 30;
  return { x, y, u };
}

export function draw(ctx, t) {
  const impact = seg(t, T(BEATS.starLand), T(BEATS.starLand) + 1.1);
  const shake = impact > 0 && impact < 1 ? Math.sin(t * 90) * 9 * (1 - impact) ** 2 : 0;

  ctx.save();
  ctx.translate(shake, shake * 0.6);
  camera(ctx, lerp(1.08, 1.16, smooth(seg(t, 12, 24))), 1160, 600);

  const dawn = 0;
  drawWorld(ctx, t, { camY: 0, dawn });

  // ---- falling star
  const sp = starPos(t);
  if (sp && sp.u < 1) {
    const pts = [];
    for (let i = 10; i >= 0; i--) {
      const tt = t - i * 0.024;
      const p = starPos(tt);
      if (p && p.u < 1) pts.push([p.x, p.y]);
    }
    trail(ctx, pts, 16 + sp.u * 16, '#FFE7A8', 0.9);
    glow(ctx, sp.x, sp.y, 60 + sp.u * 40, '#FFD98A', 0.7);
    fallenStar(ctx, sp.x, sp.y, 40 + sp.u * 8, {
      glowAmt: 1, expr: 'wonder', spin: sp.u * 4, sparkle: 0.6, t,
    });
  }

  // ---- impact flash + shock ring + dust
  if (impact > 0 && impact < 1) {
    const g = ctx.createRadialGradient(LAND[0], LAND[1], 0, LAND[0], LAND[1], 520 * impact + 60);
    g.addColorStop(0, rgba('#FFF8E0', 0.65 * (1 - impact) ** 2));
    g.addColorStop(0.45, rgba('#FFE7A8', 0.22 * (1 - impact)));
    g.addColorStop(1, 'rgba(255,231,168,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 1080);
    ctx.beginPath();
    ctx.arc(LAND[0], LAND[1], 30 + impact * 330, 0, 6.283);
    ctx.strokeStyle = rgba('#FFE7A8', 0.45 * (1 - impact));
    ctx.lineWidth = 6 * (1 - impact) + 1;
    ctx.stroke();
  }
  if (impact > 0) {
    dust(ctx, LAND[0], LAND[1] + 10, impact * 1.3, { count: 16, seed: 8, color: '#9FB4C8', spread: 2.2, size: 26 });
  }

  // ---- the star on the ground
  const restGlow = 0.26 + 0.1 * Math.sin(t * 1.6);
  const flicker = (a, b) => smooth(seg(t, T(a), T(a) + 0.08)) * (1 - smooth(seg(t, T(b) - 0.08, T(b))));
  const flick = Math.max(flicker(18.55, 18.95), flicker(19.1, 19.5) * 0.8);
  if (t >= T(BEATS.starLand)) {
    fallenStar(ctx, LAND[0], LAND[1], 74, {
      glowAmt: clamp(restGlow + flick * 0.9),
      expr: t < T(17.2) ? 'dizzy' : 'sad',
      spin: 0,
      tilt: -0.06,
      squash: t < T(14.5) ? (1 - seg(t, T(14.05), T(14.5))) * 0.18 : 0,
      sparkle: flick * 0.7,
      t,
    });
  }

  // ---- Lumi
  const startle = smooth(seg(t, T(13.35), T(13.6))) * (1 - smooth(seg(t, T(14.2), T(14.7))));
  const approach = smooth(seg(t, T(15.6), T(17.4)));
  const bobY = Math.sin(t * 2.4) * 5;
  let lx = lerp(880, 1078, approach);
  let ly = lerp(470, 742, approach) + bobY - startle * 46;
  if (t > T(18.4) && t < T(19.9)) {
    const k = smooth(seg(t, T(18.4), T(18.65))) * (1 - smooth(seg(t, T(19.2), T(19.9))));
    lx = lerp(lx, 1058, k);
    ly = lerp(ly, 730, k);
  }
  // the first lift attempt, at the end of the scene
  const grab = smooth(seg(t, T(20.7), T(21.2))) * (1 - smooth(seg(t, T(22.4), T(23))));
  const strain = smooth(seg(t, T(21.4), T(21.8))) * (1 - smooth(seg(t, T(22.5), T(22.9))));
  lx = lerp(lx, 1092, grab);
  ly = lerp(ly, 716 - strain * 26, grab);
  const lookX = t < T(15.6) ? 0.9 : t > T(18.3) ? -0.2 : 0.2;
  const lookY = t < T(15.6) ? -0.6 : 0.7;

  lumi(ctx, lx, ly, 1.42, {
    pose: t > T(20.7) ? 'pull' : 'fly',
    tilt: t < T(15.6) ? -0.12 : 0.06 + strain * 0.1,
    flutter: t * (1 + strain * 0.6),
    look: [lookX, lookY],
    blink: t > T(15.9) && t < T(16.05) ? 0.9 : 0,
    eyes: t > T(20.9) ? 'strain' : startle > 0.4 ? 'wide' : 'open',
    mouth: t > T(20.9) ? 'o' : startle > 0.4 ? 'o' : 'smile',
    squash: strain * 0.06,
    glowAmt: 0.9,
    arms: grab,
  });

  // poke sparkle
  if (t > T(18.5) && t < T(19.0)) {
    const p = seg(t, T(18.5), T(19.0));
    spark(ctx, 1112, 770, 16 * (1 - p), '#FFF6DE', 1 - p, t);
  }
  if (t > T(22.5) && t < T(23.4)) {
    dust(ctx, LAND[0], LAND[1] + 26, seg(t, T(22.55), T(23.4)), { count: 8, seed: 12, color: '#9FB4C8', spread: 1.4 });
  }
  ctx.restore();
}
