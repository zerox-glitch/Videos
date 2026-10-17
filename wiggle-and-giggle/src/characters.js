// Milo the toddler and Pip the puppy — chunky, soft-shaded vector puppets.
import { P } from './data.js';
import {
  TAU, clamp, lerp, fillCircle, fillEllipse, fillRR, rrPath, vgrad,
  starPath, limb, contactShadow,
} from './lib/draw.js';

const SKIN = '#F9C9A6';
const SKIN_SH = '#E8A886';
const HAIR = '#6B4A3A';
const HAIR_HI = '#8A6350';

function star(ctx, x, y, r, fill, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  starPath(ctx, 0, 0, r, 0.46, 5);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawArm(ctx, sx, sy, ang, len, opts, side = 1) {
  const { sleeve, skin, w = 27, hand = 15 } = opts;
  const hx = sx + side * Math.sin(ang) * len;
  const hy = sy + Math.cos(ang) * len;
  // sleeve covers the upper 55%
  const mx = sx + side * Math.sin(ang) * len * 0.58;
  const my = sy + Math.cos(ang) * len * 0.58;
  limb(ctx, sx, sy, mx, my, w + 2, sleeve, 'rgba(120,90,70,0.14)');
  limb(ctx, mx, my, hx, hy, w, skin, 'rgba(120,90,70,0.14)');
  fillCircle(ctx, hx, hy, hand, skin);
  fillCircle(ctx, hx - hand * 0.2, hy - hand * 0.25, hand * 0.45, 'rgba(255,255,255,0.35)');
}

function drawLeg(ctx, hx, hy, ang, len, opts, side = 1) {
  const { pant, foot = '#F2B48D' } = opts;
  const fx = hx + side * Math.sin(ang) * len;
  const fy = hy + Math.cos(ang) * len;
  limb(ctx, hx, hy, fx, fy, 31, pant, 'rgba(120,90,70,0.14)');
  // cuff
  fillCircle(ctx, fx, fy, 17, pant);
  // foot
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(side * ang * 0.55);
  fillEllipse(ctx, side * 4, 11, 28, 16, foot);
  fillEllipse(ctx, side * 5, 6, 17, 9, 'rgba(255,255,255,0.22)');
  ctx.restore();
}

function drawMiloHead(ctx, t, pose) {
  const hy = -262;
  ctx.save();
  ctx.translate(0, hy);
  ctx.rotate(pose.headTilt || 0);

  // ears
  fillCircle(ctx, -88, 4, 20, SKIN_SH);
  fillCircle(ctx, 88, 4, 20, SKIN_SH);
  fillCircle(ctx, -88, 4, 14, SKIN);
  fillCircle(ctx, 88, 4, 14, SKIN);

  // head
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, TAU);
  ctx.fillStyle = vgrad(ctx, -92, 0, 92, [[0, '#FFD8B8'], [0.55, SKIN], [1, '#F0B98F']]);
  ctx.fill();

  // hair cap
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 92, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.clip();
  ctx.beginPath();
  ctx.arc(0, -8, 96, Math.PI * 1.02, Math.PI * 1.98);
  ctx.lineTo(-96, -30);
  ctx.quadraticCurveTo(-40, -66, 10, -52);
  ctx.quadraticCurveTo(60, -42, 96, -18);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -92, -92, 0, [[0, HAIR_HI], [1, HAIR]]);
  ctx.fill();
  ctx.restore();
  // curl
  ctx.beginPath();
  ctx.moveTo(-6, -88);
  ctx.bezierCurveTo(-4, -122, 36, -128, 34, -100);
  ctx.bezierCurveTo(33, -86, 16, -84, 12, -92);
  ctx.bezierCurveTo(10, -78, -6, -76, -6, -88);
  ctx.fillStyle = HAIR;
  ctx.fill();

  const blink = pose.blink || 0;
  const eyeY = -6 + (pose.eyeY || 0);
  const open = (1 - blink) * (pose.eyes ?? 1);

  // brows
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const brow = pose.brow || 0;
  ctx.beginPath();
  ctx.moveTo(-52, eyeY - 34 - brow);
  ctx.quadraticCurveTo(-34, eyeY - 44 - brow, -16, eyeY - 36 - brow);
  ctx.moveTo(16, eyeY - 36 - brow);
  ctx.quadraticCurveTo(34, eyeY - 44 - brow, 52, eyeY - 34 - brow);
  ctx.stroke();

  // eyes
  for (const sx of [-1, 1]) {
    const ex = sx * 34;
    if (open < 0.12) {
      ctx.strokeStyle = '#4A3B32';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(ex, eyeY, 17, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else {
      fillEllipse(ctx, ex, eyeY, 21, 25 * open, '#FFFFFF');
      const look = pose.look || 0;
      fillEllipse(ctx, ex + look * 6, eyeY + 3, 13, 15 * open, '#5A3A28');
      fillCircle(ctx, ex + look * 6, eyeY + 6, 7 * open, '#2E1D14');
      fillCircle(ctx, ex + look * 6 - 5, eyeY - 4, 5.2 * open, '#FFFFFF');
      fillCircle(ctx, ex + look * 6 + 5, eyeY + 9, 2.4 * open, 'rgba(255,255,255,0.85)');
    }
  }

  // cheeks
  const blush = pose.blush ?? 1;
  fillEllipse(ctx, -62, 30, 19, 13, `rgba(255,150,140,${0.42 * blush})`);
  fillEllipse(ctx, 62, 30, 19, 13, `rgba(255,150,140,${0.42 * blush})`);

  // nose
  fillEllipse(ctx, 0, 20, 8, 5.5, 'rgba(220,150,120,0.55)');

  // mouth
  const m = pose.mouth ?? 0;
  if (m > 0.55) {
    // open singing mouth
    ctx.beginPath();
    ctx.ellipse(0, 42, 17, 7 + m * 9, 0, 0, TAU);
    ctx.fillStyle = '#8C3A40';
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 42, 17, 7 + m * 9, 0, 0, TAU);
    ctx.clip();
    fillEllipse(ctx, 0, 50 + m * 4, 11, 7, '#FF9CAE');
    fillEllipse(ctx, 0, 34, 12, 4, 'rgba(255,255,255,0.9)');
    ctx.restore();
  } else {
    ctx.strokeStyle = '#8A5A4A';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 30, 24, Math.PI * 0.22, Math.PI * 0.78);
    ctx.stroke();
  }

  // tiny tooth for open smiles
  ctx.restore();
}

export function drawMilo(ctx, t, pose) {
  const {
    x, y, s = 1, flip = 1, bodyY = 0, squash = 1, rot = 0,
    armL = 0.35, armR = -0.35, legL = 0.1, legR = -0.1,
  } = pose;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * flip, s);

  // soft ground shadow does not rotate with the body
  if (!pose.noShadow) {
    const lift = clamp(1 - bodyY / 160, 0.45, 1);
    contactShadow(ctx, 0, 4, 92 * lift, 20 * lift, 0.22);
  }

  ctx.translate(0, -bodyY);
  if (pose.spinPivot) {
    ctx.translate(0, -178);
    ctx.rotate(rot);
    ctx.translate(0, 178);
  } else {
    ctx.rotate(rot);
  }
  ctx.scale(1 / squash, squash);

  const shirt = vgrad(ctx, 0, -180, -30, [[0, '#A8DDF8'], [0.55, P.blue], [1, '#5FA9D4']]);
  const pant = '#5B9BC9';

  // back arm
  drawArm(ctx, -62, -150, armL, 98, { sleeve: '#7FC2E8', skin: SKIN_SH, w: 26, hand: 14 }, -1);

  // legs
  drawLeg(ctx, -30, -44, legL, 44, { pant, foot: '#EFB089' }, -1);
  drawLeg(ctx, 30, -44, legR, 44, { pant, foot: '#F6BE97' }, 1);

  // neck
  fillRR(ctx, -24, -196, 48, 40, 18, '#E8A886');

  // torso
  ctx.beginPath();
  rrPath(ctx, -66, -188, 132, 152, 46);
  ctx.fillStyle = shirt;
  ctx.fill();
  // belly highlight
  fillEllipse(ctx, -8, -110, 40, 52, 'rgba(255,255,255,0.16)');
  // collar
  ctx.beginPath();
  ctx.moveTo(-26, -184);
  ctx.quadraticCurveTo(0, -166, 26, -184);
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  ctx.stroke();
  // star print
  star(ctx, -34, -96, 13, 'rgba(255,209,102,0.95)', 0.1);
  star(ctx, 26, -136, 10, 'rgba(255,209,102,0.9)', -0.3);
  star(ctx, 34, -74, 8, 'rgba(255,255,255,0.7)', 0.4);
  star(ctx, -20, -150, 7, 'rgba(255,255,255,0.6)', 0.2);

  // front arm
  drawArm(ctx, 62, -150, armR, 98, { sleeve: '#8FCBEF', skin: SKIN, w: 28, hand: 15 }, 1);

  // head
  drawMiloHead(ctx, t, pose);
  ctx.restore();
}

export function drawPip(ctx, t, pose) {
  const {
    x, y, s = 1, flip = 1, bodyY = 0, rot = 0,
    wag = 0, earLift = 0, mouth = 0, eyes = 1, blink = 0, headTilt = 0,
  } = pose;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * flip, s);
  if (!pose.noShadow) contactShadow(ctx, 0, 2, 70, 15, 0.2);
  ctx.translate(0, -bodyY);
  ctx.rotate(rot);

  // tail
  ctx.save();
  ctx.translate(-54, -88);
  ctx.rotate(-0.5 + Math.sin(t * 12) * 0.5 * wag);
  limb(ctx, 0, 0, -26, -30, 13, '#FFF3E0', 'rgba(120,90,70,0.14)');
  fillCircle(ctx, -26, -30, 10, '#FFF3E0');
  ctx.restore();

  // back legs
  fillRR(ctx, -42, -40, 22, 40, 10, '#EBD2B2');
  fillRR(ctx, 20, -40, 22, 40, 10, '#EBD2B2');

  // body
  ctx.beginPath();
  ctx.ellipse(0, -76, 62, 46, 0, 0, TAU);
  ctx.fillStyle = vgrad(ctx, 0, -112, -20, [[0, '#FFFCF2'], [1, '#F2DBBE']]);
  ctx.fill();
  // patch
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -76, 62, 46, 0, 0, TAU);
  ctx.clip();
  fillEllipse(ctx, 30, -92, 30, 22, '#E7C9A4');
  ctx.restore();

  // front legs
  fillRR(ctx, -32, -34, 24, 36, 11, '#FFF6E6');
  fillRR(ctx, 10, -34, 24, 36, 11, '#FFF6E6');

  // head
  ctx.save();
  ctx.translate(40, -140);
  ctx.rotate(headTilt);
  // ears
  for (const [ex, er] of [[-30, -0.5], [34, 0.5]]) {
    ctx.save();
    ctx.translate(ex, -22);
    ctx.rotate(er + (ex < 0 ? -earLift : earLift));
    fillEllipse(ctx, 0, 22, 17, 30, '#E7C9A4');
    fillEllipse(ctx, 0, 24, 10, 21, '#D8B086');
    ctx.restore();
  }
  // head shape
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, TAU);
  ctx.fillStyle = vgrad(ctx, 0, -52, 52, [[0, '#FFFDF4'], [1, '#F4DFC4']]);
  ctx.fill();
  // snout
  fillEllipse(ctx, 4, 22, 34, 25, '#FFF8EA');
  fillEllipse(ctx, 4, 12, 12, 8.5, '#4A3B32');
  fillCircle(ctx, 0, 10, 3, 'rgba(255,255,255,0.6)');
  // mouth
  if (mouth > 0.4) {
    ctx.beginPath();
    ctx.ellipse(4, 30, 13, 8, 0, 0, TAU);
    ctx.fillStyle = '#7A2E36';
    ctx.fill();
    fillEllipse(ctx, 4, 34, 8, 5, '#FF8FA3');
  } else {
    ctx.strokeStyle = '#4A3B32';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-4, 28); ctx.quadraticCurveTo(4, 36, 14, 28);
    ctx.stroke();
  }
  // eyes
  for (const sx of [-1, 1]) {
    const ex = sx * 22 - 2;
    if (blink > 0.5) {
      ctx.strokeStyle = '#4A3B32';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ex, 2, 10, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else {
      fillEllipse(ctx, ex, 0, 10, 12 * eyes, '#FFFFFF');
      fillCircle(ctx, ex, 2, 7 * eyes, '#4A3B32');
      fillCircle(ctx, ex - 2.5, -1, 2.8 * eyes, '#FFFFFF');
    }
  }
  // brow patch
  ctx.restore();
  ctx.restore();
}

/* a little speech blob used for the lyrics */
export function drawLyric(ctx, text, x, y, { scale = 1, alpha = 1, pop = 0 } = {}) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale * (1 + pop * 0.02), scale * (1 + pop * 0.02));
  ctx.restore();
}
