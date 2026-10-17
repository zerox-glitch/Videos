// WIGGLE & GIGGLE — episode 1, "The Morning Wiggle"
import { W, H, P, SONG, BEATS, LYRICS } from './data.js';
import {
  TAU, clamp, lerp, seg, smooth, smoother, easeOutCubic, easeInCubic,
  easeInOutSine, easeOutBack, easeOutElastic, easeOutBounce, wobble,
  fillRR, fillEllipse, fillCircle, vgrad, rgrad, drawText, starPath, notePath,
  heartPath, sparklePath, contactShadow, rrPath,
} from './lib/draw.js';
import { drawRoom } from './room.js';
import { drawMilo, drawPip } from './characters.js';

/* --------------------------------------------------------------- helpers */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20240517);

function blinkAt(t, period = 3.6, phase = 0) {
  const u = ((t + phase) % period) / period;
  if (u > 0.955) return smooth(clamp((u - 0.955) / 0.0225)) * (1 - smooth(clamp((u - 0.9775) / 0.0225)));
  return 0;
}

const NOTES = Array.from({ length: 46 }, () => ({
  t0: 0, x: rnd() * W, y0: 0, sp: 0.5 + rnd(),
  hue: rnd(), size: 0.7 + rnd() * 0.8, drift: (rnd() - 0.5) * 90,
  rot: (rnd() - 0.5) * 0.5, kind: rnd() > 0.55 ? 'note' : 'star',
}));
const CONFETTI = Array.from({ length: 130 }, () => ({
  x: rnd() * W, y: -rnd() * 900, sp: 120 + rnd() * 260,
  size: 8 + rnd() * 12, rot: rnd() * TAU, vr: (rnd() - 0.5) * 6,
  col: [P.coral, P.yellow, P.mint, P.lavender, P.blue, P.pink][Math.floor(rnd() * 6)],
}));

/* -------------------------------------------------------------- the song */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function miloPose(t) {
  const wake = easeOutBack(seg(t, BEATS.wake, BEATS.wake + 1.5));
  const lying = t < BEATS.wake + 0.1;

  // base idle: gentle breathing and sway
  let bodyY = Math.sin(t * 2.1) * 3.2;
  let squash = 1 + Math.sin(t * 2.1 + 0.6) * 0.012;
  let armL = 0.34 + Math.sin(t * 1.7) * 0.08;
  let armR = 0.34 + Math.sin(t * 1.7 + 0.4) * 0.08;
  let headTilt = Math.sin(t * 1.3) * 0.035;
  let mouth = 0.12 + 0.1 * Math.sin(t * 2.4);
  let legL = 0.09, legR = -0.09;
  let rot = 0, x = 905, y = 902, s = 1.12;
  let eyes = 1, brow = 0, blush = 1;
  let noShadow = false;

  /* --- asleep on the mat ------------------------------------------- */
  if (t < BEATS.wake + 0.2) {
    const ly = easeInOutSine(seg(t, 0, 0.6));
    x = lerp(1000, 1002, ly);
    y = 884;
    rot = -1.45;
    s = 1.06;
    eyes = 0;
    mouth = 0.02;
    armL = 0.1; armR = 0.1;
    legL = 0.02; legR = -0.06;
    bodyY = Math.sin(t * 1.3) * 2;
    squash = 1 + Math.sin(t * 1.3) * 0.02;
    headTilt = 0.06;
    noShadow = false;
  }

  if (t >= BEATS.wake && t < BEATS.wake + 1.7) {
    const u = seg(t, BEATS.wake, BEATS.wake + 0.9);
    const e = easeOutBack(u, 1.3);
    x = lerp(1002, 905, e);
    y = lerp(884, 902, e);
    rot = lerp(-1.45, 0, e);
    s = lerp(1.06, 1.12, e);
    eyes = clamp01((u - 0.25) * 3);
    mouth = 0.55 * u;
    // big stretch
    const st = smooth(seg(t, BEATS.wake + 0.55, BEATS.wake + 1.25));
    armL = lerp(0.2, 2.28, st) - Math.sin(t * 6) * 0.02;
    armR = lerp(0.2, 2.28, st);
    headTilt = lerp(0.1, -0.12, st);
    bodyY = Math.sin(t * 2.2) * 2 + st * 6;
    squash = 1 + st * 0.05;
  }

  /* --- verse 1: standing, pointing at the sun ------------------------ */
  if (t > BEATS.wake + 1.7 && t < BEATS.chorus1) {
    const u = seg(t, BEATS.wake + 1.7, BEATS.chorus1);
    const point = smooth(seg(t, BEATS.pointsUp, BEATS.pointsUp + 0.7)) * (1 - smooth(seg(t, 19.6, 20.6)));
    // right arm reaches up toward the window
    armR = lerp(0.34, 2.3, point) + Math.sin(t * 3) * 0.05;
    armL = 0.34 + Math.sin(t * 2.2) * 0.12;
    headTilt = lerp(0, -0.18, point) + Math.sin(t * 1.4) * 0.03;
    mouth = 0.35 + 0.2 * Math.sin(t * 3.1);
    bodyY += Math.abs(Math.sin(t * 3.0)) * 5;
    squash = 1 + Math.sin(t * 3.0) * 0.02;
    // little side sway
    rot = Math.sin(t * 1.5) * 0.02;
  }

  /* --- chorus 1: toes, clap, nose, dance --------------------------- */
  if (t >= BEATS.chorus1 && t < SONG.chorus2[0]) {
    const c = t - BEATS.chorus1;
    const beat = (t % 0.5) / 0.5;
    const bounce = Math.abs(Math.sin(t * Math.PI * 2));
    bodyY += bounce * 8;
    squash = 1 + bounce * 0.045;

    const toes = smooth(seg(t, 21.2, 21.8)) * (1 - smooth(seg(t, 23.2, 23.6)));
    const clap = smooth(seg(t, 23.4, 23.8)) * (1 - smooth(seg(t, 25.2, 25.6)));
    const nose = smooth(seg(t, 25.4, 25.9)) * (1 - smooth(seg(t, 27.2, 27.6)));
    const dance = smooth(seg(t, 27.3, 27.8));

    legL = 0.1 + Math.sin(t * 18) * 0.32 * toes;
    legR = -0.1 - Math.sin(t * 18 + 1.4) * 0.32 * toes;
    if (toes > 0.1) bodyY += Math.abs(Math.sin(t * 9)) * 4;

    if (clap > 0.05) {
      const cl = Math.abs(Math.sin((t - 23.4) * Math.PI * 5.2));
      armL = lerp(0.34, -0.5, clap) - cl * 0.28;
      armR = lerp(0.34, -0.5, clap) - cl * 0.28;
      headTilt = 0.03;
    }
    if (nose > 0.05) {
      const w = Math.sin((t - 25.4) * 12) * 0.2;
      armL = lerp(armL, 2.35 + w, nose * 0.8);
      armR = lerp(armR, 2.35 + w, nose * 0.8);
      headTilt = w * 0.6;
    }
    if (dance > 0.05) {
      const sw = Math.sin((t - 27.3) * Math.PI * 2);
      armL = lerp(armL, 2.28 + sw * 0.4, dance);
      armR = lerp(armR, 2.28 - sw * 0.4, dance);
      rot = sw * 0.13 * dance;
      legL = 0.1 + Math.max(0, sw) * 0.3 * dance;
      legR = -0.1 - Math.max(0, -sw) * 0.3 * dance;
      bodyY += Math.abs(sw) * 10 * dance;
      headTilt = sw * 0.12 * dance;
    }
    mouth = 0.55 + 0.4 * Math.abs(Math.sin(t * 2.4));
    eyes = 1 - 0.0 * beat;
  }

  /* --- verse 2: greet Pip ----------------------------------------- */
  if (t >= SONG.chorus2[0] - 9 && t < BEATS.hitChorus) {
    const greet = smooth(seg(t, 33.6, 34.4));
    armR = lerp(0.34, 2.28, greet) + Math.sin(t * 2.4) * 0.06;
    armL = 0.34 + Math.sin(t * 2.1) * 0.1;
    headTilt = lerp(0, -0.2, greet);
    mouth = 0.4 + 0.3 * Math.sin(t * 2.8);
    const up = smooth(seg(t, 36.6, 37.2));
    bodyY += up * 14;
    squash = 1 + up * 0.03 + Math.sin(t * 3) * 0.015;
  }

  /* --- chorus 2 --------------------------------------------------- */
  if (t >= BEATS.hitChorus && t < SONG.bridge[0]) {
    const sw = Math.sin((t - BEATS.hitChorus) * Math.PI * 2 * 1.0);
    const bounce = Math.abs(Math.sin(t * Math.PI * 2));
    bodyY += bounce * 10;
    armL = 2.28 + sw * 0.3;
    armR = 2.28 - sw * 0.3;
    rot = Math.sin(t * 2) * 0.07;
    headTilt = Math.sin(t * 2) * 0.1;
    legL = 0.12 + Math.max(0, sw) * 0.25;
    legR = -0.12 - Math.max(0, -sw) * 0.25;
    mouth = 0.62 + 0.3 * Math.abs(Math.sin(t * 3));
    squash = 1 + bounce * 0.04;
  }

  /* --- bridge: jump, reach, spin, ground, hooray ------------------- */
  if (t >= SONG.bridge[0] && t < SONG.outro[0]) {
    const jumps = [54.55, 55.15, 55.75, 56.35];
    let jumpY = 0, jsq = 1;
    for (const j of jumps) {
      const u = seg(t, j - 0.35, j + 0.02);
      if (u > 0 && u < 1) {
        const a = Math.sin(u * Math.PI);
        jumpY = Math.max(jumpY, a * 82);
        jsq = 1 + Math.cos(u * Math.PI) * 0.09;
      }
      const land = seg(t, j + 0.02, j + 0.22);
      if (land > 0 && land < 1) jsq = 1 - Math.sin(land * Math.PI) * 0.08;
    }
    bodyY += jumpY;
    squash = jsq;

    const reach = smooth(seg(t, 57.1, 57.45)) * (1 - smooth(seg(t, 59.3, 59.7)));
    const spin = smoother(seg(t, 59.55, 61.05));
    const groundUp = smooth(seg(t, 61.2, 61.7));
    const hooray = smooth(seg(t, 63.0, 63.6));

    armL = lerp(0.34, 2.3, Math.max(reach, hooray));
    armR = lerp(0.34, 2.3, Math.max(reach, hooray));
    rot = spin * TAU;
    bodyY += Math.sin(spin * Math.PI) * 58;
    squash = 1 + Math.sin(spin * Math.PI) * 0.05;
    // crouch to touch the ground
    if (t > 59.8 && t < 61.4) {
      const d = Math.sin(seg(t, 60.0, 61.25) * Math.PI);
      bodyY -= d * 46;
      squash = 1 - d * 0.16;
      armL = lerp(armL, 0.55, d);
      armR = lerp(armR, 0.55, d);
      legL = 0.2 + d * 0.2; legR = -0.2 - d * 0.2;
    }
    if (hooray > 0.1) {
      bodyY += Math.abs(Math.sin(t * 8)) * 14 * hooray;
      squash = 1 + Math.sin(t * 8) * 0.03;
      headTilt = Math.sin(t * 4) * 0.08;
    }
    mouth = 0.6 + 0.35 * Math.abs(Math.sin(t * 3.2));
  }

  /* --- outro ------------------------------------------------------- */
  if (t >= SONG.outro[0]) {
    const wave = smooth(seg(t, 66.4, 67.2));
    const bounce = Math.abs(Math.sin(t * Math.PI * 1.6));
    bodyY += bounce * 6;
    armR = lerp(0.34, 2.28, wave) + Math.sin(t * 7) * 0.22 * wave;
    armL = 0.34 + Math.sin(t * 2.3) * 0.12;
    headTilt = Math.sin(t * 1.6) * 0.05;
    mouth = 0.5 + 0.3 * Math.sin(t * 2.6);
    rot = Math.sin(t * 0.9) * 0.02;
  }

  // blinking
  const blink = Math.max(blinkAt(t, 3.7, 0.4), blinkAt(t, 5.3, 2.1));
  eyes = Math.min(eyes, 1 - blink * 0.95);

  const spinPivot = t >= 59.4 && t < 61.3;
  return {
    x, y, s, rot, bodyY, squash, armL, armR, legL, legR, headTilt,
    mouth, eyes, blink: 0, brow, blush, noShadow, look: 0, spinPivot,
  };
}

function pipPose(t) {
  const sleep = t < BEATS.pipWake;
  let x = 1138, y = 900, s = 1.02, rot = 0, bodyY = Math.sin(t * 1.4) * 2;
  let eyes = 1, blink = sleep ? 1 : 0, wag = 0.2, earLift = 0, mouth = 0.1, headTilt = 0.1;
  let squash = 1;

  if (sleep) {
    eyes = 0; blink = 1; headTilt = 0.22; wag = 0; bodyY = Math.sin(t * 1.2) * 1.5;
    squash = 1 + Math.sin(t * 1.2) * 0.02;
  } else if (t < BEATS.pipUp + 1.2) {
    const u = easeOutBack(seg(t, BEATS.pipWake, BEATS.pipWake + 1.0));
    eyes = clamp01((u - 0.2) * 2);
    earLift = Math.sin(t * 3) * 0.3;
    headTilt = lerp(0.22, 0.02, u);
    bodyY = Math.sin(t * 2.2) * 2 + Math.sin(seg(t, BEATS.pipUp, BEATS.pipUp + 1.1) * Math.PI) * 40;
    wag = 1;
    mouth = 0.6;
    squash = 1 + Math.sin(seg(t, BEATS.pipUp, BEATS.pipUp + 1.1) * Math.PI) * 0.06;
  } else if (t < BEATS.hitChorus) {
    bodyY += Math.abs(Math.sin(t * 5)) * 4;
    wag = 1; mouth = 0.4 + 0.3 * Math.abs(Math.sin(t * 3));
  } else if (t < SONG.bridge[0]) {
    const hop = Math.abs(Math.sin((t - BEATS.hitChorus) * Math.PI * 2));
    bodyY += hop * 26;
    rot = Math.sin(t * 3) * 0.06;
    wag = 1; mouth = 0.6; earLift = hop * 0.4;
    squash = 1 + hop * 0.05;
  } else {
    const hop = Math.abs(Math.sin((t - SONG.bridge[0]) * Math.PI * 2 * 0.9));
    bodyY += hop * 34;
    rot = Math.sin(t * 3.4) * 0.08;
    wag = 1; mouth = 0.7; earLift = hop * 0.5;
    squash = 1 + hop * 0.06;
    if (t > SONG.outro[0]) { bodyY = Math.sin(t * 2) * 2; wag = 0.7; }
  }
  const blink2 = blinkAt(t + 1.2, 4.1, 1.1);
  return { x, y, s, rot, bodyY, squash, eyes, blink: Math.max(blink, blink2), wag, earLift, mouth, headTilt };
}

/* --------------------------------------------------------------- camera */
function camera(t) {
  let z = 1.0, cx = W / 2, cy = H / 2;
  const v1 = smooth(seg(t, 9.0, 10.0)) * (1 - smooth(seg(t, 20.4, 21.2)));
  const ch = smooth(seg(t, 21.0, 21.8)) * (1 - smooth(seg(t, 32.6, 33.4)));
  const v2 = smooth(seg(t, 33.2, 34.2)) * (1 - smooth(seg(t, 41.4, 42.2)));
  const br = smooth(seg(t, 54.0, 55.0)) * (1 - smooth(seg(t, 65.4, 66.4)));

  z = 1.0 + v1 * 0.085 + ch * 0.06 + v2 * 0.075 + br * 0.045;
  cx = lerp(cx, 905, v1 * 0.55) + ch * 0 + v2 * (1080 - W / 2) * 0.35;
  cy = lerp(cy, 760, v1 * 0.4 + ch * 0.18 + br * 0.3);

  // gentle beat bounce in choruses
  const beat = Math.abs(Math.sin(t * Math.PI * 2));
  const bounceAmt = (ch + smooth(seg(t, 42, 43)) * (1 - smooth(seg(t, 53.4, 54.2)))) * 3.2;
  const yoff = -beat * bounceAmt;

  return { z, cx, cy, yoff };
}

/* ------------------------------------------------------------------ UI */
function drawLyrics(ctx, t) {
  if (t > 68.0) return;
  let cur = null;
  for (const l of LYRICS) {
    if (t >= l.t0 - 0.16 && t <= l.t1 + 0.16 && (!cur || l.t0 > cur.t0)) cur = l;
  }
  if (!cur) return;
  const inA = smooth(seg(t, cur.t0 - 0.16, cur.t0 + 0.08));
  const outA = 1 - smooth(seg(t, cur.t1, cur.t1 + 0.16));
  const a = Math.min(inA, outA);
  const pop = easeOutBack(seg(t, cur.t0 - 0.25, cur.t0 + 0.2));

  const y = 995;
  ctx.save();
  ctx.globalAlpha = a;
  // pill
  ctx.font = '700 54px Baloo2';
  const tw = ctx.measureText(cur.text).width;
  const pw = tw + 96;
  ctx.globalAlpha = a * 0.9;
  fillRR(ctx, W / 2 - pw / 2, y - 46, pw, 92, 46, 'rgba(255,255,255,0.86)');
  fillRR(ctx, W / 2 - pw / 2, y - 46, pw, 40, 46, 'rgba(255,255,255,0.5)');
  ctx.globalAlpha = a;

  // unsung text
  drawText(ctx, cur.text, W / 2, y + 2, {
    font: '700 54px Baloo2', fill: '#6B5548', align: 'center',
  });

  // sung portion in warm yellow, clipped progressively
  const p = clamp01(seg(t, cur.t0, cur.t0 + (cur.t1 - cur.t0) * 0.86));
  ctx.save();
  ctx.beginPath();
  ctx.rect(W / 2 - pw / 2, y - 50, pw * p, 100);
  ctx.clip();
  drawText(ctx, cur.text, W / 2, y + 2, {
    font: '700 54px Baloo2', fill: '#F4A62A', align: 'center',
  });
  ctx.restore();
  ctx.restore();
}

function drawTitleCard(ctx, t) {
  const inA = smooth(seg(t, 1.25, 1.7));
  const outA = 1 - smooth(seg(t, 4.4, 5.0));
  const a = inA * outA;
  if (a <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = a;
  // soft plate
  const g = rgrad(ctx, W / 2, 420, 40, 620, [
    [0, 'rgba(255,248,236,0.94)'], [0.62, 'rgba(255,244,226,0.86)'], [1, 'rgba(255,240,220,0)'],
  ]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(W / 2, 400, 700, 270, 0, 0, TAU);
  ctx.fill();

  const title = 'Wiggle & Giggle';
  ctx.font = '800 148px Baloo2';
  const total = ctx.measureText(title).width;
  let x = W / 2 - total / 2;
  const chars = [...title];
  for (let i = 0; i < chars.length; i++) {
    const w = ctx.measureText(chars[i]).width;
    const st = clamp01((t - 1.25 - i * 0.045) / 0.5);
    const e = easeOutBack(st, 2.2);
    if (st > 0) {
      const bob = Math.sin(t * 3 + i * 0.5) * 6;
      ctx.save();
      ctx.translate(x + w / 2, 360 + bob - (1 - e) * 90);
      ctx.rotate((1 - e) * (i % 2 ? 0.25 : -0.25));
      ctx.scale(e, e);
      drawText(ctx, chars[i], 0, 0, {
        font: '800 148px Baloo2',
        fill: i % 2 ? '#FF8B7B' : '#FFC93C',
        stroke: '#FFFFFF', lw: 22,
        shadow: { color: 'rgba(160,110,60,0.35)', blur: 18, y: 8 },
      });
      ctx.restore();
    }
    x += w;
  }
  // subtitle
  const subA = smooth(seg(t, 2.2, 2.7));
  drawText(ctx, 'A  Morning  Wiggle  Song', W / 2, 492, {
    font: '600 48px Fredoka', fill: '#7A6357', alpha: subA, letter: 2,
  });
  // sparkles
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * TAU + t * 0.5;
    const rr = 430 + Math.sin(t * 2 + i) * 18;
    const sx = W / 2 + Math.cos(ang) * rr * 1.25;
    const sy = 380 + Math.sin(ang) * rr * 0.5;
    const a2 = (0.45 + 0.55 * Math.sin(t * 4 + i * 1.7)) * subA;
    ctx.save();
    ctx.globalAlpha = a * a2 * 0.9;
    ctx.fillStyle = i % 2 ? '#FFD166' : '#FFFFFF';
    sparklePath(ctx, sx, sy, 16 + 8 * Math.sin(t * 3 + i));
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawEndCard(ctx, t) {
  const a = smooth(seg(t, 68.2, 68.9));
  if (a <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = rgrad(ctx, W / 2, 306, 40, 330, [
    [0, 'rgba(255,250,240,0.38)'], [0.55, 'rgba(255,246,232,0.16)'], [1, 'rgba(255,240,220,0)'],
  ]);
  ctx.beginPath();
  ctx.ellipse(W / 2, 306, 620, 150, 0, 0, TAU);
  ctx.fill();

  const e = easeOutElastic(seg(t, 68.2, 69.2));
  drawText(ctx, 'The End', W / 2, 316, {
    font: '800 168px Baloo2', fill: '#FFC93C', stroke: '#FFFFFF', lw: 24,
    shadow: { color: 'rgba(160,110,60,0.35)', blur: 22, y: 10 },
    alpha: clamp01(e * 1.2),
  });
  drawText(ctx, 'Sing it again!', W / 2, 434, {
    font: '700 66px Baloo2', fill: '#7A6357', stroke: '#FFFFFF', lw: 10,
    alpha: smooth(seg(t, 69.2, 69.8)),
  });
  ctx.restore();
}

/* --------------------------------------------------------------- extras */
function drawMat(ctx, t) {
  const a = 1 - smooth(seg(t, 9.2, 10.4));
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  const x = 596, y = 832, w = 500, h = 74;
  fillRR(ctx, x, y, w, h, 37, '#FFD98F');
  fillRR(ctx, x + 9, y + 7, w - 18, h - 18, 31, '#FFF1D2');
  for (let i = 0; i < 7; i++) {
    fillCircle(ctx, x + 52 + i * 66, y + 38, 5, 'rgba(255,200,110,0.45)');
  }
  // blanket while asleep
  const bl = 1 - smooth(seg(t, 8.9, 9.8));
  if (bl > 0.01) {
    ctx.save();
    ctx.globalAlpha = bl;
    ctx.translate(700, 800);
    ctx.rotate(-0.04);
    ctx.beginPath();
    rrPath(ctx, 0, 0, 300, 104, 42);
    ctx.fillStyle = vgrad(ctx, 0, 0, 104, [[0, '#BFE7FF'], [1, '#8FCFEF']]);
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 5; i++) {
      fillCircle(ctx, 34 + i * 66, 34, 13, 'rgba(255,255,255,0.55)');
      fillCircle(ctx, 66 + i * 66, 74, 13, 'rgba(255,255,255,0.4)');
    }
    ctx.restore();
    fillRR(ctx, 0, 0, 300, 26, 20, 'rgba(255,255,255,0.6)');
    ctx.restore();
  }
  ctx.restore();
}

function drawNotes(ctx, t) {
  const active = (t > 21 && t < 33.2) || (t > 42 && t < 54.2) || (t > 54.4 && t < 66);
  if (!active) return;
  const period = 1.9;
  for (let i = 0; i < NOTES.length; i++) {
    const n = NOTES[i];
    const phase = (t * 0.62 + i * 0.137) % 1;
    const seedT = Math.floor(t * 0.62 + i * 0.137);
    const r2 = mulberry32(i * 97 + seedT * 13)();
    const x0 = 420 + r2 * 1080;
    const y0 = 760 + mulberry32(i * 31 + 7)() * 60;
    const u = phase;
    if (u > 0.94) continue;
    const y = y0 - u * (420 + r2 * 220);
    const x = x0 + Math.sin(u * 4 + i) * 46 + n.drift * u;
    const a = Math.sin(u * Math.PI) * 0.9;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(u * 5 + i) * 0.25 + n.rot);
    const col = n.hue > 0.66 ? P.coral : n.hue > 0.33 ? P.yellow : P.lavender;
    ctx.fillStyle = col;
    if (n.kind === 'note') notePath(ctx, 0, 0, 1.1 * n.size, 0);
    else { starPath(ctx, 0, 0, 13 * n.size, 0.45, 5); ctx.fill(); }
    ctx.restore();
  }
}

function drawConfetti(ctx, t) {
  const start = 63.4;
  if (t < start) return;
  const dt = t - start;
  for (const c of CONFETTI) {
    const y = ((c.y + dt * c.sp) % 1250) - 60;
    if (y < -40) continue;
    const x = c.x + Math.sin(dt * 1.6 + c.rot) * 30;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.rot + dt * c.vr);
    ctx.fillStyle = c.col;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
    ctx.restore();
  }
}

function drawSparkles(ctx, t, x, y, n, spread, seed) {
  for (let i = 0; i < n; i++) {
    const r2 = mulberry32(seed + i * 13)();
    const a2 = (Math.sin(t * 6 + i * 1.4 + seed) + 1) / 2;
    const ang = (i / n) * TAU + seed;
    const rr = spread * (0.6 + 0.4 * r2);
    const px = x + Math.cos(ang) * rr;
    const py = y + Math.sin(ang) * rr * 0.8;
    ctx.save();
    ctx.globalAlpha = a2 * 0.85;
    ctx.fillStyle = i % 3 ? '#FFF3C4' : '#FFFFFF';
    sparklePath(ctx, px, py, 9 + 10 * a2);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------------------------------------------------------------- draw */
export function draw(ctx, t, { W: CW, H: CH, scale = 1 }) {
  const cam = camera(t);

  // sky/backdrop behind the room (in case of zoom-out)
  ctx.fillStyle = P.wallTop;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.cx, -cam.cy + cam.yoff);

  // dawn light rises over the first seconds
  const rise = smooth(seg(t, 0.4, 6.0));
  drawRoom(ctx, t, { rise, warm: 0.6 + rise * 0.4 });
  drawMat(ctx, t);

  const mp = miloPose(t);
  const pp = pipPose(t);

  // characters (Pip behind Milo)
  drawPip(ctx, t, pp);
  drawMilo(ctx, t, mp);

  // blink sparkles around the sleeper
  if (t < BEATS.wake + 0.4) drawSparkles(ctx, t, 830, 820, 5, 60, 3);

  drawNotes(ctx, t);
  drawConfetti(ctx, t);

  // dust motes in the sunbeam
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const u = ((t * 0.08 + i * 0.037) % 1);
    const x = 1180 + Math.sin(i * 2.3 + t * 0.3) * 210;
    const y = 300 + u * 700;
    const a = Math.sin(u * Math.PI) * 0.5;
    fillCircle(ctx, x, y, 3 + (i % 3), `rgba(255,244,200,${a * 0.5})`);
  }
  ctx.restore();

  ctx.restore(); // camera

  drawTitleCard(ctx, t);
  drawLyrics(ctx, t);
  drawEndCard(ctx, t);

  /* ------------------------------------------------------------ grade */
  // warm edge vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.45, W / 2, H * 0.55, H * 1.05);
  v.addColorStop(0, 'rgba(70,40,20,0)');
  v.addColorStop(1, 'rgba(70,40,20,0.16)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // fade in / out
  const fadeIn = 1 - smooth(seg(t, 0, 0.9));
  const fadeOut = smooth(seg(t, 74.2, 75));
  const blk = Math.max(fadeIn, fadeOut);
  if (blk > 0.002) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(255,247,236,${blk})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
}
