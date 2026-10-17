// Characters: Lumi the firefly, the fallen star, her friends, and sky details.
// All poses are pure functions of the given state (no timers, no randomness per frame).
import { C, W } from './data.js';
import {
  clamp, lerp, seg, sine, rgba, mix, mulberry32, glow, spark, outBack, outCubic,
} from './draw.js';

const INK = '#3A2A44';

/* ------------------------------------------------------------------ Lumi */
/**
 * x,y = body centre. s = scale (1 → ~68 px tall).
 * opts: pose 'fly'|'hover'|'pull'|'cheer'|'sleep'|'sit'|'wave'
 *       look [lx,ly], blink 0..1, tilt, squash, flutter, glowAmt, wingSpread, mouth, eyes
 */
export function lumi(ctx, x, y, s = 1, opts = {}) {
  const {
    pose = 'hover', look = [0, 0], blink = 0, tilt = 0, squash = 0,
    flutter = 1, glowAmt = 1, wingSpread = 1, mouth = 'smile', eyes = 'open',
    facing = 1, arms = 0, bulb = C.lumiGlow,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const sx = (1 + squash) * facing;
  const sy = 1 - squash * 0.8;
  ctx.scale(s * sx, s * sy);
  ctx.scale(facing < 0 ? 1 : 1, 1);

  // ---- glowing tail
  glow(ctx, 0, 30, 20, bulb, 0.34 * glowAmt);
  glow(ctx, 0, 30, 9, '#F2FFD0', 0.5 * glowAmt);

  // ---- wings
  const flap = pose === 'pull' ? Math.sin(flutter * 34) * 0.39 : Math.sin(flutter * 22) * 0.26;
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(dir * 8, -26);
    ctx.rotate(dir * (0.62 + flap * 0.9) * wingSpread);
    ctx.beginPath();
    ctx.ellipse(dir * 17, -6, 26, 11, dir * -0.18, 0, 6.283);
    ctx.fillStyle = rgba(C.lumiWing, 0.34);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,246,255,0.42)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dir * 2, -6);
    ctx.quadraticCurveTo(dir * 20, -12, dir * 38, -4);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // ---- little legs
  ctx.strokeStyle = mix(INK, '#000000', 0.1);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  const legSwing = pose === 'pull' ? 0.5 : pose === 'sit' ? 0.9 : 0;
  for (let i = 0; i < 3; i++) {
    const lx = -16 + i * 16;
    ctx.beginPath();
    ctx.moveTo(lx, 22);
    ctx.quadraticCurveTo(lx + (i - 1) * 4, 32, lx + (i - 1) * 8, 36 + Math.sin(flutter * 3 + i) * 1.5 * legSwing);
    ctx.stroke();
  }
  if (arms > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * 26, 2);
      ctx.quadraticCurveTo(dir * (38 + arms * 6), 12, dir * (34 + arms * 10), 24);
      ctx.stroke();
    }
  }

  // ---- body
  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.bezierCurveTo(23, -38, 33, -16, 31, 3);
  ctx.bezierCurveTo(29, 24, 17, 35, 0, 35);
  ctx.bezierCurveTo(-17, 35, -29, 24, -31, 3);
  ctx.bezierCurveTo(-33, -16, -23, -38, 0, -38);
  const bg = ctx.createLinearGradient(-20, -38, 14, 36);
  bg.addColorStop(0, '#FFEDB8');
  bg.addColorStop(0.38, '#FFD166');
  bg.addColorStop(1, '#F2A93B');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,20,0.28)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // belly
  ctx.beginPath();
  ctx.ellipse(0, 14, 19, 16, 0, 0, 6.283);
  ctx.fillStyle = rgba(C.lumiBelly, 0.8);
  ctx.fill();

  // tail lantern apertures
  ctx.beginPath();
  ctx.ellipse(0, 29, 11, 8.5, 0, 0, 6.283);
  ctx.fillStyle = rgba(bulb, 0.95);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,30,0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 29, 5, 4, 0, 0, 6.283);
  ctx.fillStyle = 'rgba(255,255,240,0.75)';
  ctx.fill();

  // cheeks
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(dir * 19, 7, 6.4, 0, 6.283);
    ctx.fillStyle = rgba(C.cheek, 0.55);
    ctx.fill();
  }

  // ---- antennae
  const wob = pose === 'pull' ? 0.5 : 0.2;
  for (const dir of [-1, 1]) {
    const tipX = dir * (20 + Math.sin(flutter * 2.4 + dir) * 3 * wob);
    const tipY = -62 - Math.cos(flutter * 2.1 + dir) * 2;
    ctx.beginPath();
    ctx.moveTo(dir * 8, -33);
    ctx.quadraticCurveTo(dir * 17, -50, tipX, tipY);
    ctx.strokeStyle = 'rgba(58,42,68,0.85)';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    glow(ctx, tipX, tipY, 8, bulb, 0.5 * glowAmt);
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3.4, 0, 6.283);
    ctx.fillStyle = '#F4FFD6';
    ctx.fill();
  }

  // ---- face
  const eyeY = -9;
  const eyeDX = 11.5;
  if (eyes === 'happy' || pose === 'cheer') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * eyeDX, eyeY + 2, 7, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
  } else if (eyes === 'strain') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * (eyeDX - 5), eyeY - 4);
      ctx.lineTo(dir * (eyeDX + 4), eyeY + 1);
      ctx.lineTo(dir * (eyeDX - 5), eyeY + 5);
      ctx.stroke();
    }
  } else if (eyes === 'sleep') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * eyeDX, eyeY - 1, 7, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else {
    const wide = eyes === 'wide' ? 1.16 : 1;
    const openK = clamp(1 - blink);
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(dir * eyeDX, eyeY, 8 * wide, 10 * wide * openK, 0, 0, 6.283);
      ctx.fillStyle = '#FFFDF6';
      ctx.fill();
      ctx.clip();
      ctx.beginPath();
      ctx.arc(dir * eyeDX + look[0] * 4, eyeY + look[1] * 4 + (1 - openK) * 8, eyes === 'wide' ? 3.4 : 4.6, 0, 6.283);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dir * eyeDX + look[0] * 4 - 1.8, eyeY + look[1] * 4 - 2.2, 1.7, 0, 6.283);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(dir * eyeDX, eyeY, 8 * wide, 10 * wide * openK, 0, 0, 6.283);
      ctx.strokeStyle = 'rgba(58,42,68,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // brows for determination
  if (pose === 'pull' || eyes === 'strain') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * (eyeDX - 7), eyeY - 13);
      ctx.lineTo(dir * (eyeDX + 6), eyeY - 9);
      ctx.stroke();
    }
  }

  // mouth
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  if (mouth === 'smile' || mouth === 'grin') {
    ctx.beginPath();
    ctx.arc(0, 4, mouth === 'grin' ? 9 : 7, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
    if (mouth === 'grin') {
      ctx.beginPath();
      ctx.arc(0, 4, 7.5, Math.PI * 0.18, Math.PI * 0.82);
      ctx.fillStyle = 'rgba(90,40,50,0.55)';
      ctx.fill();
    }
  } else if (mouth === 'o') {
    ctx.beginPath();
    ctx.ellipse(0, 9, 4.2, 5.4, 0, 0, 6.283);
    ctx.fillStyle = 'rgba(90,40,50,0.7)';
    ctx.fill();
  } else if (mouth === 'frown') {
    ctx.beginPath();
    ctx.arc(0, 16, 7, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  } else if (mouth === 'yawn') {
    ctx.beginPath();
    ctx.ellipse(0, 11, 7, 9, 0, 0, 6.283);
    ctx.fillStyle = 'rgba(90,40,50,0.72)';
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ star */
function starPath(ctx, s, points = 5, inner = 0.47) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? s : s * inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * opts: glow 0..1, spin, expr 'sleep'|'dizzy'|'sad'|'happy'|'wink'|'wonder',
 *       squash, bandaid, tilt
 */
export function fallenStar(ctx, x, y, s = 60, opts = {}) {
  const {
    glowAmt = 0.45, spin = 0, expr = 'sleep', squash = 0, bandaid = true,
    tilt = 0, sparkle = 0, t = 0,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(1 + squash, 1 - squash * 0.85);

  if (glowAmt > 0.02) {
    glow(ctx, 0, 0, s * 1.25, '#FFD98A', 0.42 * glowAmt);
    glow(ctx, 0, 0, s * 0.62, '#FFF3C4', 0.35 * glowAmt);
  }

  ctx.save();
  ctx.rotate(spin);
  starPath(ctx, s);
  const g = ctx.createRadialGradient(-s * 0.25, -s * 0.32, s * 0.1, 0, 0, s * 1.05);
  g.addColorStop(0, mix('#8E7C58', '#FFE7A8', glowAmt));
  g.addColorStop(0.45, mix(C.starDim, C.star, glowAmt));
  g.addColorStop(1, mix('#6E6044', C.starDeep, glowAmt));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(mix('#6E6044', '#FFE7A8', glowAmt), 0.9);
  ctx.lineWidth = s * 0.13;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // face
  const E = s * 0.2;
  ctx.save();
  ctx.rotate(spin * 0.15);
  if (expr === 'dizzy') {
    ctx.strokeStyle = 'rgba(70,52,32,0.85)';
    ctx.lineWidth = s * 0.045;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI * 3.2;
        const r = (i / 20) * E * 0.55;
        const px = dir * E * 0.9 + Math.cos(a) * r;
        const py = -s * 0.02 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (expr === 'sleep') {
    ctx.strokeStyle = 'rgba(70,52,32,0.8)';
    ctx.lineWidth = s * 0.05;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * E * 0.72, -s * 0.02, s * 0.1, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else if (expr === 'sad') {
    ctx.fillStyle = 'rgba(70,52,32,0.9)';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(dir * E * 0.72, 0, s * 0.075, s * 0.095, 0, 0, 6.283);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70,52,32,0.8)';
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.arc(0, s * 0.3, s * 0.13, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
  } else if (expr === 'wink') {
    ctx.fillStyle = 'rgba(70,52,32,0.9)';
    ctx.beginPath();
    ctx.ellipse(-E * 0.72, 0, s * 0.075, s * 0.1, 0, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,52,32,0.85)';
    ctx.lineWidth = s * 0.045;
    ctx.beginPath();
    ctx.arc(E * 0.72, s * 0.01, s * 0.09, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, s * 0.22, s * 0.14, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } else {
    // happy / wonder — big sparkly eyes
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(dir * E * 0.72, -s * 0.01, s * 0.085, s * 0.11, 0, 0, 6.283);
      ctx.fillStyle = 'rgba(255,252,240,0.95)';
      ctx.fill();
      const pr = expr === 'wonder' ? s * 0.062 : s * 0.05;
      ctx.beginPath();
      ctx.arc(dir * E * 0.72, -s * 0.005, pr, 0, 6.283);
      ctx.fillStyle = 'rgba(70,52,32,0.95)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dir * E * 0.72 - pr * 0.4, -s * 0.03, pr * 0.38, 0, 6.283);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70,52,32,0.8)';
    ctx.lineWidth = s * 0.042;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, s * 0.2, s * 0.13, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  // cheeks
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(dir * s * 0.33, s * 0.14, s * 0.075, 0, 6.283);
    ctx.fillStyle = rgba(C.cheek, 0.35 * glowAmt);
    ctx.fill();
  }

  if (bandaid) {
    ctx.save();
    ctx.translate(s * 0.36, s * 0.34);
    ctx.rotate(0.42);
    ctx.beginPath();
    ctx.roundRect(-s * 0.17, -s * 0.065, s * 0.34, s * 0.13, s * 0.06);
    ctx.fillStyle = '#F4DDB4';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,110,60,0.35)';
    ctx.lineWidth = s * 0.012;
    ctx.stroke();
    ctx.fillStyle = 'rgba(150,110,60,0.4)';
    for (const dx of [-0.06, 0.06]) {
      ctx.beginPath();
      ctx.arc(s * dx, 0, s * 0.012, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();

  if (sparkle > 0) {
    spark(ctx, s * 1.1, -s * 1.0, 14 * sparkle, C.starLight, 0.8 * sparkle, t * 0.5);
    spark(ctx, -s * 1.2, -s * 0.7, 9 * sparkle, C.starLight, 0.6 * sparkle, -t * 0.4);
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- friend */
export function friend(ctx, x, y, s = 1, color = C.friend[0], opts = {}) {
  const { flutter = 0, look = [0, 0], smile = 1, blink = 0 } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  glow(ctx, 0, 16, 16, color, 0.32);
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(dir * 5, -12);
    ctx.rotate(dir * (0.7 + Math.sin(flutter * 30) * 0.4));
    ctx.beginPath();
    ctx.ellipse(dir * 10, -3, 15, 6.5, dir * -0.2, 0, 6.283);
    ctx.fillStyle = rgba(C.lumiWing, 0.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,246,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 17, 0, 0, 6.283);
  const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 20);
  g.addColorStop(0, mix(color, '#FFFFFF', 0.45));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,50,40,0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 9, 8, 6, 0, 0, 6.283);
  ctx.fillStyle = rgba(color, 0.55);
  ctx.fill();
  // antennae
  ctx.strokeStyle = 'rgba(50,50,60,0.7)';
  ctx.lineWidth = 1.6;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * 4, -15);
    ctx.quadraticCurveTo(dir * 9, -24, dir * 12, -28);
    ctx.stroke();
    glow(ctx, dir * 12, -28, 5, color, 0.45);
    ctx.beginPath();
    ctx.arc(dir * 12, -28, 2, 0, 6.283);
    ctx.fillStyle = '#F4FFD6';
    ctx.fill();
  }
  // face
  const open = clamp(1 - blink);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(dir * 5.4, -2, 3.4, 4.4 * open, 0, 0, 6.283);
    ctx.fillStyle = '#FFFDF6';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dir * 5.4 + look[0] * 1.5, -2 + look[1] * 1.5 + (1 - open) * 3, 2.1, 0, 6.283);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  if (smile > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 4, 3.2, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(dir * 10, 4, 2.6, 0, 6.283);
    ctx.fillStyle = rgba(C.cheek, 0.45);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------- star trail */
export function trail(ctx, pts, width = 10, color = '#FFE7A8', alpha = 1) {
  if (pts.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const u = i / (pts.length - 1);
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = rgba(color, 0.05 + u * 0.5);
    ctx.lineWidth = width * (0.15 + u * 0.95);
    ctx.stroke();
  }
  const [hx, hy] = pts[pts.length - 1];
  glow(ctx, hx, hy, width * 1.6, color, 0.85);
  ctx.restore();
}

/* ----------------------------------------------------- constellation */
export function heartConstellation(ctx, cx, cy, scale, progress, t, alpha = 1) {
  const pts = [];
  const N = 26;
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(th), 3);
    const y = -(13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th));
    pts.push([cx + x * scale, cy + y * scale]);
  }
  const shown = clamp(progress) * (N + 1);
  ctx.save();
  ctx.globalAlpha *= alpha;
  // connecting light
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < shown; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = rgba('#BFE8FF', 0.5);
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = rgba('#8FD4FF', 0.16);
  ctx.lineWidth = 8;
  ctx.stroke();

  for (let i = 0; i < Math.min(pts.length, shown + 0.001); i++) {
    const [x, y] = pts[i];
    const pulse = 0.6 + 0.4 * Math.sin(t * 2 + i * 0.7);
    glow(ctx, x, y, 12, '#FFF3C4', 0.6 * pulse);
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, 6.283);
    ctx.fillStyle = '#FFFDF4';
    ctx.fill();
    if (i % 4 === 0) spark(ctx, x, y, 13 + pulse * 7, '#FFF6DE', 0.5 * pulse, t * 0.2 + i);
  }
  ctx.restore();
  return pts;
}
