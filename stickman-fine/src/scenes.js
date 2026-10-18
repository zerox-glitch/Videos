// scenes.js — the seven sets of "Stickman's Fine." Each scene is a pure
// function of global time via the `sc` helper (events, progress, blink).
// Scenes paint their own paper wash, props, and cast.

import { stroke, ring, blob, dot, line, paper, halftone, shadow, speedLines, whoosh, stampText, Ink, J, boil, hash } from './lib/ink.js';
import { POSES, poseMix, lerpPose, drawStick, drawDuck, pencilArm } from './rig.js';

export const G = 880; // floor line
const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
export const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeOut = (u) => 1 - Math.pow(1 - clamp01(u), 3);
export const easeIn = (u) => clamp01(u) ** 3;
const lerp = (a, b, u) => a + (b - a) * clamp01(u);
const prog = (sc, id, dur, off = 0) => clamp01((sc.T - (sc.at[id] + off)) / dur);
const vis = (sc, id) => sc.T >= sc.at[id];
const blinkOf = (T) => (T % 3.13) < 0.11;

function text(ctx, txt, x, y, size, font, opt = {}) {
  stampText(ctx, txt, x, y, size, font, opt);
}

// =========================================================== INTRO (0–6)
export function scene_intro(ctx, W, H, sc) {
  const T = sc.T, s = boil(T);
  Ink.ink = '#1B1A1F';
  paper(ctx, W, H, '#FAF4E7', '#F1E8D5', s, 0.09);

  // world: wall + floor
  ctx.save();
  line(ctx, 0, 760, W, 760, 6, s + 1, { alpha: 0.6 });
  // leaning plant (left)
  ctx.save(); ctx.translate(230, G);
  stroke(ctx, [{ x: 0, y: 0 }, { x: -8, y: -70 }, { x: -34, y: -130 }], 7, 5, s + 2);
  stroke(ctx, [{ x: -8, y: -70 }, { x: 26, y: -120 }], 6, 4, s + 3);
  blob(ctx, [{ x: -46, y: -78 }, { x: -18, y: -96 }, { x: 10, y: -78 }, { x: 6, y: -140 }, { x: -30, y: -150 }, { x: -52, y: -118 }], s + 4,
    { color: '#8AC926', edge: true, edgeW: 5 });
  blob(ctx, [{ x: -34, y: 0 }, { x: 34, y: 0 }, { x: 26, y: -64 }, { x: -26, y: -64 }], s + 5, { color: '#E76F51', edge: true, edgeW: 5 });
  ctx.restore();

  // crooked picture frame (the wall is *fine*)
  ctx.save(); ctx.translate(1545, 300); ctx.rotate(0.13);
  ctx.strokeStyle = Ink.ink; ctx.lineWidth = 7;
  ctx.strokeRect(-70, -52, 140, 104);
  ctx.fillStyle = '#CFE8F7'; ctx.fillRect(-58, -40, 116, 80);
  blob(ctx, [{ x: -30, y: 22 }, { x: -8, y: -14 }, { x: 14, y: 6 }, { x: 34, y: -18 }, { x: 44, y: 24 }], s + 6, { color: '#8AC926' });
  dot(ctx, 30, -26, 9, '#F4A261');
  ctx.restore();
  // wall crack
  stroke(ctx, [{ x: 470, y: 160 }, { x: 496, y: 240 }, { x: 474, y: 300 }, { x: 500, y: 380 }], 4, 2, s + 7, { alpha: 0.55 });

  // Stickman: waves from hook_wave, then grins
  const waveU = prog(sc, 'hook_wave', 0.5);
  let pose = POSES.stand;
  if (T >= 1.0 && T < 3.4) {
    const bob = Math.sin(T * 9) * 10 * Math.max(0, Math.min(1, (3.4 - T)));
    pose = lerpPose(POSES.stand, POSES.wave, Math.min(1, waveU * 2));
    pose = { ...pose, haA: [pose.haA[0], pose.haA[1] + bob], elA: [pose.elA[0], pose.elA[1] + bob * 0.4] };
  } else if (T >= 3.4) pose = POSES.stand;
  shadow(ctx, 1240, G + 6, 78, 16, 0.34, s);
  const face = T < 2.0 ? { eyes: 'open', brow: 'raise', mouth: 'smile' }
    : { eyes: 'happy', brow: 'flat', mouth: 'grin' };
  face.blink = blinkOf(T);
  drawStick(ctx, pose, face, { x: 1240, y: G - 96, seed: s, headR: 46 });

  // coffee mug (his emotional support)
  ctx.save(); ctx.translate(1390, G);
  blob(ctx, [{ x: -40, y: -6 }, { x: 40, y: -6 }, { x: 34, y: -74 }, { x: -34, y: -74 }], s + 8, { color: '#D62828', edge: true, edgeW: 6 });
  ring(ctx, 44, -42, 22, 6, s + 9);
  for (let i = 0; i < 2; i++) {
    const wob = Math.sin(T * 2.2 + i * 2) * 6;
    stroke(ctx, [{ x: -14 + i * 24, y: -84 }, { x: -6 + i * 24 + wob, y: -118 }, { x: -16 + i * 24, y: -150 }], 5, 2.5, s + 10 + i, { alpha: 0.5 });
  }
  ctx.restore();

  // title stamp
  if (vis(sc, 'hook_stamp')) {
    const u = prog(sc, 'hook_stamp', 0.22);
    const k = u < 1 ? lerp(2.6, 1, easeOut(u)) : 1 + Math.sin(Math.max(0, T - sc.at.hook_stamp - 0.22) * 18) * 0.008 * Math.exp(-(T - sc.at.hook_stamp - 0.22) * 3);
    ctx.save(); ctx.translate(760, 250); ctx.rotate(-0.055); ctx.scale(k, k);
    ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = Ink.red; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.roundRect(-430, -95, 860, 190, 18); ctx.fill(); ctx.stroke();
    text(ctx, "STICKMAN'S FINE.", 0, -22, 96, 'Bangers-Regular', { color: Ink.red, rot: 0 });
    text(ctx, 'a stickman comedy · ep.1', 0, 62, 34, 'PatrickHand-Regular', { color: '#55505E' });
    ctx.restore();
  }
  ctx.restore();
}

// ======================================================= JOKE 1 (6–17.5)
function alarmClock(ctx, x, y, ring_, T, s, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (ring_) { ctx.translate(J(s, 40) * 5, J(s, 41) * 3); ctx.rotate(J(s, 42) * 0.05); }
  // bells + legs
  ring(ctx, -44, -58, 24, 7, s + 20); ring(ctx, 44, -58, 24, 7, s + 21);
  stroke(ctx, [{ x: -30, y: 54 }, { x: -44, y: 78 }], 7, 6, s + 22);
  stroke(ctx, [{ x: 30, y: 54 }, { x: 44, y: 78 }], 7, 6, s + 23);
  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(0, 0, 56, 0, 7); ctx.fill(); ctx.stroke();
  text(ctx, '6:00', 0, -4, 30, 'Fredoka_600SemiBold', { color: '#1B1A1F' });
  if (ring_) {
    text(ctx, 'MONDAY', 0, 26, 17, 'PermanentMarker-Regular', { color: Ink.red });
    for (let i = 0; i < 3; i++) {
      const a = -0.5 + i * 0.5, rr = 86 + Math.sin(T * 14 - i) * 6;
      ctx.strokeStyle = '#FFFDF6'; ctx.globalAlpha = 0.8 - i * 0.22; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, -10, rr, a - 0.3, a + 0.3); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

export function scene_joke1(ctx, W, H, sc) {
  const T = sc.T, s = boil(T);
  Ink.ink = '#F3EEE2'; // chalk-on-night throughout
  const night = ['#333F8F', '#4A57A8'];
  paper(ctx, W, H, night[0], night[1], s, 0.16);
  { // night stars
    // subtle stars
    for (let i = 0; i < 26; i++) {
      const x = hash(i * 3.1) * W, y = hash(i * 7.7) * 460;
      dot(ctx, x, y, 1.6 + hash(i) * 1.8, '#FFFDF6', 0.5 + 0.4 * Math.sin(T * 2 + i));
    }
  }
  ctx.save();
  // window with day/night strobe during days
  const wx = 1520, wy = 250, ww = 300, wh = 230;
  ctx.fillStyle = '#F6F0E4'; ctx.fillRect(wx - 14, wy - 14, ww + 28, wh + 28);
  const strobing = T >= sc.at.days_start && T < sc.at.days_end;
  const dayIdx = strobing ? Math.floor((T - sc.at.days_start) / 0.34) : 0;
  const isDay = strobing ? dayIdx % 2 === 1 : false;
  ctx.fillStyle = isDay ? '#9FD1F3' : '#232C63';
  ctx.fillRect(wx, wy, ww, wh);
  if (isDay) { // sun
    dot(ctx, wx + 220, wy + 60, 34, '#FFD166');
    speedLines(ctx, wx + 220, wy + 60, 200, 200, s + 30, 8, 0.5, 0.3);
  } else dot(ctx, wx + 90, wy + 70, 30, '#F6F0E4', 0.95); // moon
  line(ctx, wx + ww / 2, wy, wx + ww / 2, wy + wh, 6, s + 31, { color: '#F6F0E4' });
  line(ctx, wx, wy + wh / 2, wx + ww, wy + wh / 2, 6, s + 32, { color: '#F6F0E4' });
  ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 10; ctx.strokeRect(wx - 8, wy - 8, ww + 16, wh + 16);

  // calendar on wall
  ctx.save(); ctx.translate(1180, 240);
  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.roundRect(-78, -60, 156, 132, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#D62828'; ctx.fillRect(-78, -60, 156, 34);
  text(ctx, 'MONDAY', 0, 8, 30, 'PermanentMarker-Regular', { color: '#1B1A1F' });
  text(ctx, '13', 0, 52, 26, 'Fredoka_600SemiBold', { color: '#88808F' });
  ctx.restore();
  // flying pages after days_start
  if (T >= sc.at.days_start && T < sc.at.days_end + 0.4) {
    for (let i = 0; i < 9; i++) {
      const t0 = sc.at.days_start + i * 0.30, u = (T - t0) / 1.1;
      if (u < 0 || u > 1) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - u) * 3);
      ctx.translate(1180 + u * 660, 240 + u * 260 + Math.sin(u * 9 + i) * 40);
      ctx.rotate(u * 6 + i);
      ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.rect(-26, -32, 52, 64); ctx.fill(); ctx.stroke();
      ctx.restore();
      whoosh(ctx, 1180 + u * 560, 250 + u * 230, 90, 0.45, s + 40 + i, 0.5, 4);
    }
  }

  // nightstand + alarm clock
  ctx.fillStyle = '#8A6FBF'; ctx.strokeStyle = '#F3EEE2'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.roundRect(1180, 700, 250, 180, 10); ctx.fill(); ctx.stroke();
  const ringing = T >= sc.at.alarm_ring && T < sc.at.snooze_slap + 0.5;
  alarmClock(ctx, 1305, 660, ringing && T < sc.at.snooze_slap + 0.3, T, s, 1);

  // bed
  ctx.save();
  ctx.fillStyle = '#8A6FBF'; ctx.strokeStyle = '#F3EEE2'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(380, 690, 740, 150, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#EDE9FC'; ctx.strokeStyle = '#333F8F'; ctx.beginPath(); ctx.roundRect(360, 640, 200, 110, 16); ctx.fill(); ctx.stroke(); // pillow
  ctx.fillStyle = '#D62828'; ctx.strokeStyle = '#F3EEE2'; ctx.beginPath(); ctx.roundRect(540, 700, 600, 118, 20); ctx.fill(); ctx.stroke();   // blanket
  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#D62828'; ctx.beginPath(); ctx.roundRect(540, 700, 600, 34, 14); ctx.fill(); ctx.stroke();
  line(ctx, 380, 840, 380, 880, 10, s + 50); line(ctx, 1100, 840, 1100, 880, 10, s + 51);
  ctx.restore();

  // Stickman asleep (arm slaps the clock at snooze)
  let pose = POSES.sleep;
  if (T >= sc.at.snooze_slap - 0.4 && T < sc.at.snooze_slap + 0.3) {
    const u = prog(sc, 'snooze_slap', 0.2, -0.4);
    const up = u < 0.55 ? u / 0.55 : (1 - (u - 0.55) / 0.45);
    pose = lerpPose(POSES.sleep, {
      ...POSES.sleep,
      shA: [20, -86], elA: [240, -140], haA: [470, -158],
    }, easeOut(up));
    if (up > 0.55) whoosh(ctx, 1090, 560, 190, 0.35, s + 44, 0.75, 6);
  }
  const face = { eyes: 'sleep', brow: T >= 10.5 ? 'flat' : 'none', mouth: 'flat' };
  drawStick(ctx, pose, face, { x: 700, y: 690, seed: s, headR: 44, tilt: -1.25 });
  if (T >= sc.at.days_start && T < sc.at.days_end + 0.7) {
    for (let i = 0; i < 3; i++) {
      const zu = ((T - sc.at.days_start) * 0.55 + i / 3) % 1;
      text(ctx, 'z', 560 + i * 36 + zu * 70, 620 - zu * 190, 24 + i * 15,
        'PatrickHand-Regular', { color: '#F3EEE2', alpha: (1 - zu) * 0.9, rot: 0.18 });
    }
  }

  // cobwebs as days pile on
  if (T > sc.at.days_start + 1.4) {
    const a = clamp01((T - sc.at.days_start - 1.4) / 1.2) * 0.7;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#F3EEE2'; ctx.lineWidth = 3;
    for (const [cx, cy, sx, sy] of [[80, 80, 1, 1], [1840, 90, -1, 1]]) {
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * 70 * i / 3, cy + sy * 54 * i / 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + sx * 24 * i / 3, cy); ctx.lineTo(cx + sx * 70 * i / 3, cy + sy * 54 * i / 3); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---- museum reveal
  if (vis(sc, 'museum_case')) {
    const u = prog(sc, 'museum_case', 0.62);
    const easeInU = easeIn(u);
    const yTop = lerp(-720, 470, easeInU);
    const x0 = 330, x1 = 1240, y1 = 900;
    if (u >= 0.98) { // dust burst already played; glass sits
      // plaque
      ctx.save(); ctx.translate(785, 862);
      ctx.fillStyle = '#FFD166'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.roundRect(-230, -40, 460, 84, 10); ctx.fill(); ctx.stroke();
      text(ctx, 'STICKMAN · c. MONDAY', 0, 2, 40, 'PatrickHand-Regular', { color: '#1B1A1F' });
      ctx.restore();
    }
    // exhibit spotlight
    ctx.save();
    const sp = ctx.createLinearGradient(785, 120, 785, 900);
    sp.addColorStop(0, 'rgba(255,244,214,0.55)'); sp.addColorStop(1, 'rgba(255,244,214,0.02)');
    ctx.fillStyle = sp;
    ctx.beginPath(); ctx.moveTo(720, 90); ctx.lineTo(850, 90);
    ctx.lineTo(1330, 900); ctx.lineTo(240, 900); ctx.closePath(); ctx.fill();
    ctx.restore();
    // glass box
    ctx.save();
    ctx.fillStyle = 'rgba(178,220,255,0.16)'; ctx.strokeStyle = '#DFF3FF'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.roundRect(x0, yTop, x1 - x0, y1 - yTop, 6); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.5;
    stroke(ctx, [{ x: x0 + 60, y: yTop + 30 }, { x: x0 + 150, y: y1 - 20 }], 14, 6, s + 60, { color: '#FFFFFF', alpha: 0.55, flat: true });
    stroke(ctx, [{ x: x0 + 150, y: yTop + 30 }, { x: x0 + 230, y: y1 - 20 }], 8, 4, s + 61, { color: '#FFFFFF', alpha: 0.4, flat: true });
    ctx.restore();
    if (u < 0.99) speedLines(ctx, 785, 200, 900, 700, s + 62, 10, 0.5, 0.55);
    else if (T - sc.at.museum_case < 0.5) { // landing dust
      const d = (T - sc.at.museum_case - 0.62) / 0.4;
      if (d > 0) for (let i = 0; i < 8; i++) {
        dot(ctx, 340 + i * 126, 896 - Math.abs(J(s, 70 + i)) * 26, 10 * d, '#F3EEE2', 0.8 * (1 - d));
      }
    }
  }

  // tourists (appear once case lands)
  if (T > sc.at.museum_case + 0.55) {
    const spots = [[220, 1], [1470, -1], [1700, -1]];
    spots.forEach(([tx, dir], i) => {
      const app = clamp01((T - sc.at.museum_case - 0.55 - i * 0.18) / 0.35);
      const k = 0.52 * easeOut(app);
      if (k < 0.02) return;
      const face = { eyes: 'open', brow: 'raise', mouth: 'o' };
      ctx.save(); ctx.translate(tx, G); ctx.scale(k * dir, k);
      drawStick(ctx, POSES.watchLook, face, { x: 0, y: 0, seed: s + i * 7, headR: 46 });
      // camera
      ctx.fillStyle = '#1B1A1F'; ctx.beginPath(); ctx.roundRect(64, -140, 56, 40, 6); ctx.fill();
      dot(ctx, 92, -120, 10, '#8AC926');
      ctx.restore();
      // flash stars at flash ids
      const fid = ['flash1', 'flash2', 'flash3'][i % 3];
      if (Math.abs(T - sc.at[fid]) < 0.14) {
        const fx = tx + (dir > 0 ? 40 : -40), fy = G - 68;
        const fu = 1 - Math.abs(T - sc.at[fid]) / 0.14;
        ctx.save(); ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = 6; ctx.globalAlpha = fu;
        speedLines(ctx, fx, fy, 160, 160, s + 80 + i, 10, 0.9, 0.12);
        ctx.restore();
      }
    });
  }
  ctx.restore();
}

// ======================================================= JOKE 2 (17.5–29.5)
export function scene_joke2(ctx, W, H, sc) {
  const T = sc.T, s = boil(T);
  Ink.ink = '#1B1A1F';
  paper(ctx, W, H, '#E9F6EF', '#CFEBDF', s, 0.10);
  ctx.save();
  halftone(ctx, 0, 700, W, H - 700, { gap: 11, r: 2.2, alpha: 0.13, color: '#2E6F63' });
  line(ctx, 0, 880, W, 880, 6, s + 1, { alpha: 0.5 });

  // doctor (right, with mirror + coat)
  ctx.save(); ctx.translate(1530, G - 96);
  const dface = { eyes: 'squint', brow: 'flat', mouth: 'flat' };
  drawStick(ctx, POSES.lean, dface, { x: 0, y: 0, seed: s + 3, headR: 46 });
  blob(ctx, [{ x: -26, y: -130 }, { x: 34, y: -128 }, { x: 44, y: -40 }, { x: -34, y: -40 }], s + 4,
    { color: '#FFFDF6', edge: true, edgeW: 6 });
  ring(ctx, 16, -238, 18, 6, s + 5, { color: '#9BD8C7' });
  ctx.restore();
  // doctor's chart on easel
  if (vis(sc, 'chart_pop')) {
    const u = prog(sc, 'chart_pop', 0.32);
    const k = u < 1 ? lerp(1.7, 1, easeOut(u)) : 1;
    ctx.save(); ctx.translate(1210, 470); ctx.scale(k, k); ctx.rotate(-0.02);
    stroke(ctx, [{ x: -80, y: 160 }, { x: -40, y: -170 }], 9, 8, s + 6, {});
    stroke(ctx, [{ x: 80, y: 160 }, { x: 40, y: -170 }], 9, 8, s + 7, {});
    ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.roundRect(-150, -180, 300, 300, 12); ctx.fill(); ctx.stroke();
    text(ctx, 'DAILY CUP LIMIT', 0, -134, 34, 'PatrickHand-Regular', { color: '#55505E' });
    text(ctx, '1 CUP', 0, -46, 92, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, '/ DAY', 0, 34, 58, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, 'doctor’s orders', 0, 94, 34, 'PatrickHand-Regular', { color: '#88808F' });
    ctx.restore();
    // espresso stamp lands on it
    if (vis(sc, 'stamp_espresso')) {
      const su = prog(sc, 'stamp_espresso', 0.16);
      const sk = su < 1 ? lerp(2.4, 1, easeOut(su)) : 1;
      ctx.save(); ctx.translate(1215, 520); ctx.rotate(-0.20); ctx.scale(sk, sk);
      ctx.fillStyle = '#D62828'; ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.roundRect(-185, -52, 370, 104, 10); ctx.fill(); ctx.stroke();
      text(ctx, 'TYPE: ESPRESSO', 0, 2, 54, 'Bangers-Regular', { color: '#FFFDF6' });
      ctx.restore();
    }
  }

  // IV stand with espresso bag
  const ix = 860;
  stroke(ctx, [{ x: ix, y: 880 }, { x: ix, y: 300 }], 10, 8, s + 10, {});
  stroke(ctx, [{ x: ix - 60, y: 300 }, { x: ix + 40, y: 300 }], 8, 7, s + 11, {});
  stroke(ctx, [{ x: ix - 70, y: 880 }, { x: ix + 70, y: 880 }], 10, 10, s + 12, {});
  const dripU = vis(sc, 'drip_start') ? clamp01((T - sc.at.drip_start) / 6) : 0;
  if (dripU > 0 || vis(sc, 'chart_pop')) {
    // bag
    ctx.save(); ctx.translate(ix - 20, 350);
    blob(ctx, [{ x: -56, y: 0 }, { x: 56, y: 0 }, { x: 48, y: 120 }, { x: -48, y: 120 }], s + 13,
      { color: '#FFFDF6', edge: true, edgeW: 7 });
    ctx.fillStyle = '#6F4E37';
    const lvl = 1 - dripU * 0.55;
    ctx.beginPath(); ctx.rect(-46, 20 + 96 * (1 - lvl), 92, 96 * lvl - 8); ctx.fill();
    text(ctx, 'ESPRESSO', 0, 62, 24, 'Fredoka_600SemiBold', { color: dripU > 0.5 ? '#FFFDF6' : '#6F4E37' });
    ctx.restore();
    // tube to his arm (to seated stickman’s hand ~ (690, 640))
    stroke(ctx, [{ x: ix - 20, y: 476 }, { x: ix + 40, y: 570 }, { x: 750, y: 632 }, { x: 786, y: 664 }], 6, 5, s + 14, { color: '#6F4E37' });
    if (dripU > 0) { // falling droplets
      for (let i = 0; i < 3; i++) {
        const du = ((T - sc.at.drip_start) * 1.6 + i / 3) % 1;
        dot(ctx, ix - 20, 486 + du * 60, 7 - du * 2, '#6F4E37', 0.95);
      }
    }
  }

  // ECG cart (left)
  ctx.save(); ctx.translate(300, 620);
  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(-150, -200, 300, 230, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#14312C'; ctx.beginPath(); ctx.roundRect(-126, -176, 252, 150, 8); ctx.fill();
  // ECG line: normal pulse → wave after ecg_wave
  const waveU = vis(sc, 'ecg_wave') ? prog(sc, 'ecg_wave', 1.2) : 0;
  ctx.save(); ctx.beginPath(); ctx.rect(-126, -176, 252, 150); ctx.clip();
  ctx.strokeStyle = '#7CFFB2'; ctx.lineWidth = 5; ctx.globalAlpha = 0.95;
  ctx.beginPath();
  for (let px = -124; px <= 124; px += 3) {
    const cyc = ((px + 124) / 42 + T * 1.5) % 1;
    let y = -101;
    if (cyc < 0.12) y -= 18 * Math.sin(cyc / 0.12 * Math.PI);
    else if (cyc > 0.2 && cyc < 0.26) y -= 46;
    else if (cyc > 0.26 && cyc < 0.32) y += 26;
    // morph toward steamy wave
    const wy = -101 + Math.sin((px + 124) / 26 + T * 3) * 34;
    const y2 = y * (1 - waveU) + wy * waveU;
    px === -124 ? ctx.moveTo(px, y2) : ctx.lineTo(px, y2);
  }
  ctx.stroke(); ctx.restore();
  text(ctx, 'HEART™', 0, 78, 30, 'Fredoka_600SemiBold', { color: '#55505E' });
  dot(ctx, 118, 78, 10, waveU > 0.5 ? '#D62828' : '#8AC926');
  ctx.restore();

  // exam stool + Stickman (seated, IV in arm)
  ctx.save(); ctx.fillStyle = '#8A6FBF'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(560, 780, 240, 46, 10); ctx.fill(); ctx.stroke();
  stroke(ctx, [{ x: 680, y: 826 }, { x: 680, y: 880 }], 12, 10, s + 15);
  ctx.restore();
  let pose = POSES.sitArmOut;
  let face = { eyes: 'open', brow: 'flat', mouth: 'flat' };
  if (T >= sc.at.sip) {
    const u = prog(sc, 'sip', 0.5);
    pose = lerpPose(POSES.sitArmOut, POSES.sip, easeOut(u) < 0.5 ? 0 : 1);
    pose = { ...POSES.sitArmOut, haA: [lerp(106, 40, easeOut(u)), lerp(-96, -150, easeOut(u))], elA: [lerp(56, 48, easeOut(u)), lerp(-92, -60, easeOut(u))] };
    face = { eyes: u > 0.5 ? 'happy' : 'open', brow: 'raise', mouth: u > 0.5 ? 'smile' : 'o' };
    // little mug at his lips
    if (u > 0.4) {
      ctx.save(); ctx.translate(726, 610 - u * 8);
      blob(ctx, [{ x: -24, y: -4 }, { x: 24, y: -4 }, { x: 20, y: -46 }, { x: -20, y: -46 }], s + 16, { color: '#D62828', edge: true, edgeW: 5 });
      ctx.restore();
    }
  } else if (vis(sc, 'drip_start')) {
    face = { eyes: 'open', brow: 'sad', mouth: 'flat', sweat: T > sc.at.ecg_wave && T < sc.at.nurse_faint };
  }
  face.blink = blinkOf(T) && !vis(sc, 'nurse_faint') ? blinkOf(T) : false;
  shadow(ctx, 680, 886, 74, 15, 0.3, s);
  drawStick(ctx, pose, face, { x: 680, y: 760, seed: s, headR: 46 });

  // nurse faints
  if (vis(sc, 'nurse_faint')) {
    const u = prog(sc, 'nurse_faint', 0.5);
    const fall = easeIn(u);
    ctx.save();
    ctx.translate(1120, G); ctx.rotate(lerp(0, 1.45, fall)); ctx.translate(0, 0);
    // stays standing pivot at feet
    const nf = { eyes: 'dead', brow: 'none', mouth: 'o' };
    drawStick(ctx, POSES.deadpan, nf, { x: 0, y: -96, seed: s + 9, headR: 44 });
    // nurse cap
    const hd = POSES.deadpan.head;
    blob(ctx, [{ x: hd[0] - 26, y: hd[1] - 52 }, { x: hd[0] + 26, y: hd[1] - 52 }, { x: hd[0] + 20, y: hd[1] - 76 }, { x: hd[0] - 20, y: hd[1] - 76 }], s + 17, { color: '#FFFDF6', edge: true, edgeW: 5 });
    ctx.restore();
    if (u < 0.4) speedLines(ctx, 1120, 600, 500, 700, s + 18, 6, 0.4, 0.5);
  }
  ctx.restore();
}

// ======================================================= JOKE 3 (29.5–42.5)
export function scene_joke3(ctx, W, H, sc) {
  const T = sc.T, s = boil(T);
  Ink.ink = '#1B1A1F';
  paper(ctx, W, H, '#E8EEF6', '#D3DEEC', s, 0.11);
  const foldU = vis(sc, 'room_fold') ? ease(prog(sc, 'room_fold', 0.55)) : 0;

  ctx.save();
  if (foldU > 0) { // the room folds into itself toward the desk
    ctx.translate(960, 700);
    ctx.transform(lerp(1, 0.07, foldU), 0.10 * foldU, -0.05 * foldU, lerp(1, 0.09, foldU), 0, 0);
    ctx.translate(-960, -700);
    ctx.globalAlpha = 1 - foldU;
  }
  // wall + floor
  line(ctx, 0, 740, W, 740, 6, s + 1, { alpha: 0.45 });
  // window with sweeping light
  ctx.save(); ctx.translate(170, 240);
  ctx.fillStyle = '#FFFDF6'; ctx.fillRect(-14, -14, 320, 260);
  ctx.fillStyle = '#BFD9EE'; ctx.fillRect(0, 0, 292, 232);
  line(ctx, 146, 0, 146, 232, 7, s + 2, { color: '#1B1A1F' });
  line(ctx, 0, 116, 292, 116, 7, s + 3, { color: '#1B1A1F' });
  ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 10; ctx.strokeRect(-8, -8, 308, 248);
  ctx.restore();
  // sweeping sun stripes on floor (time-lapse)
  const sweep = vis(sc, 'clock_spin') ? clamp01((T - sc.at.clock_spin) / 5.4) : 0;
  ctx.save(); ctx.globalAlpha = 0.28;
  for (let i = 0; i < 3; i++) {
    const x = lerp(120, 1500, sweep) + i * 150;
    ctx.fillStyle = '#FFD98A';
    ctx.beginPath();
    ctx.moveTo(x, 745); ctx.lineTo(x + 120, 745); ctx.lineTo(x + 320, 900); ctx.lineTo(x + 150, 900);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // wall clock
  ctx.save(); ctx.translate(470, 300);
  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(0, 0, 86, 0, 7); ctx.fill(); ctx.stroke();
  const spin = vis(sc, 'clock_spin') ? clamp01((T - sc.at.clock_spin) / 5.2) : 0;
  const minA = spin * Math.PI * 2 * 11, hrA = spin * Math.PI * 2 * 0.9;
  ctx.strokeStyle = '#1B1A1F'; ctx.lineCap = 'round';
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(Math.sin(minA) * 62, -Math.cos(minA) * 62); ctx.stroke();
  ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(Math.sin(hrA) * 40, -Math.cos(hrA) * 40); ctx.stroke();
  dot(ctx, 0, 0, 8, '#D62828');
  ctx.restore();

  // Stickman at desk (sitting) — before the desk so legs tuck underneath
  let face = { eyes: 'open', brow: 'flat', mouth: 'flat' };
  if (T > sc.at.clock_spin + 2) { face = { eyes: 'dead', brow: 'sad', mouth: 'flat' }; }
  if (T > sc.at.clock_spin + 4.2) { face = { eyes: 'dead', brow: 'sad', mouth: 'tremble' }; }
  face.blink = blinkOf(T);
  shadow(ctx, 880, 906, 70, 14, 0.28, s);
  drawStick(ctx, POSES.sit, face, { x: 880, y: 768, seed: s, headR: 46 });

  // desk + paperwork
  ctx.save();
  ctx.fillStyle = '#B98E5E'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(620, 720, 760, 44, 8); ctx.fill(); ctx.stroke();
  ctx.fillRect(660, 764, 40, 160); ctx.fillRect(1300, 764, 40, 160);
  ctx.strokeRect(660, 764, 40, 160); ctx.strokeRect(1300, 764, 40, 160);
  ctx.restore();
  // paper pile grows
  if (vis(sc, 'paper_pile')) {
    const n = Math.floor(prog(sc, 'paper_pile', 2.4) * 9);
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.translate(1150, 716 - i * 14); ctx.rotate(J(s, 90 + i) * 0.14);
      ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.rect(-58, -8, 116, 16); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const cups = Math.floor(prog(sc, 'paper_pile', 2.4) * 3);
    for (let i = 0; i < cups; i++) {
      ctx.save(); ctx.translate(760 + i * 66, 704 - i * 4); ctx.rotate(J(s, 95 + i) * 0.1);
      blob(ctx, [{ x: -26, y: 0 }, { x: 26, y: 0 }, { x: 20, y: -56 }, { x: -20, y: -56 }], s + 96 + i, { color: '#E0B87A', edge: true, edgeW: 5 });
      ctx.restore();
    }
  }

  // easel: 5 MIN MEETING
  ctx.save(); ctx.translate(1330, 520);
  stroke(ctx, [{ x: -50, y: 220 }, { x: -20, y: -140 }], 9, 8, s + 20);
  stroke(ctx, [{ x: 50, y: 220 }, { x: 20, y: -140 }], 9, 8, s + 21);
  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(-130, -150, 260, 210, 10); ctx.fill(); ctx.stroke();
  text(ctx, 'QUICK', 0, -96, 54, 'Bangers-Regular', { color: '#1B1A1F' });
  text(ctx, '5 MIN', 0, -36, 54, 'Bangers-Regular', { color: '#D62828' });
  text(ctx, 'MEETING', 0, 24, 44, 'Bangers-Regular', { color: '#1B1A1F' });
  ctx.restore();

  // boss (enters right, talks, leaves when room folds)
  const bEnter = ease(prog(sc, 'boss_enter', 0.7));
  const bLeave = vis(sc, 'room_fold') ? ease(prog(sc, 'room_fold', 0.5, -0.55)) : 0;
  if (bEnter > 0.02 && bLeave < 0.98) {
    const bx = lerp(2150, 1560, bEnter) + bLeave * 620;
    const bob = Math.sin((T - sc.at.boss_enter) * 14) * 8 * (bEnter < 1 ? 1 : 0) * (1 - bLeave);
    const bface = { eyes: 'squint', brow: T < sc.at.clock_spin ? 'angry' : 'raise', mouth: T < sc.at.boss_enter + 1.4 ? 'open' : 'flat' };
    ctx.save(); ctx.translate(bx, G - 96 + Math.abs(bob));
    drawStick(ctx, POSES.talk, bface, { x: 0, y: 0, seed: s + 40, headR: 48, weight: 1.12 });
    blob(ctx, [{ x: 6, y: -132 }, { x: 30, y: -132 }, { x: 22, y: -70 }, { x: 4, y: -70 }], s + 41, { color: '#D62828', edge: true, edgeW: 4 });
    ctx.restore();
  }

  // paper fluttering after everything vanished
  if (vis(sc, 'paper_flutter') && !foldU) {
    const u = clamp01((T - sc.at.paper_flutter) / 1.4);
    ctx.save();
    ctx.translate(960 + Math.sin(u * 7) * 90, lerp(220, 840, easeIn(u)));
    ctx.rotate(u * 3.4);
    ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.rect(-46, -60, 92, 120); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore(); // fold group

  // ---- envelope / thought bubble layer (not folded)
  if (vis(sc, 'envelope_clunk')) {
    const envU = prog(sc, 'envelope_clunk', 0.18);
    const bubU = vis(sc, 'bubble_shrink') ? prog(sc, 'bubble_shrink', 0.45) : 0;
    const popU = vis(sc, 'bubble_pop') ? prog(sc, 'bubble_pop', 0.3) : 0;
    if (bubU < 1 && popU <= 0) {
      const k = envU < 1 ? lerp(2.1, 1, easeOut(envU)) : 1;
      const shrink = bubU > 0 ? lerp(1, 0.24, ease(bubU)) : 1;
      ctx.save(); ctx.translate(960, 560); ctx.scale(k * shrink, k * shrink); ctx.rotate(-0.04);
      ctx.fillStyle = '#E0B87A'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.roundRect(-260, -160, 520, 320, 10); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-260, -160); ctx.lineTo(0, 20); ctx.lineTo(260, -160); ctx.stroke();
      if (bubU < 0.2) text(ctx, 'Q3 REVIEW', 0, 110, 44, 'Fredoka_600SemiBold', { color: '#1B1A1F', alpha: 1 - bubU * 4 });
      ctx.restore();
    }
    if (bubU >= 1 && popU <= 0) {
      // thought bubble
      const bw = 300;
      ctx.save(); ctx.translate(960, 520);
      ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(-bw * 0.5, 0, 92, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -40, 120, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bw * 0.5, 10, 88, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 60, 95, 0, 7); ctx.fill(); ctx.stroke();
      dot(ctx, -130, 160, 22, '#FFFDF6'); ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(-130, 160, 22, 0, 7); ctx.stroke();
      dot(ctx, -185, 218, 13, '#FFFDF6'); ctx.beginPath(); ctx.arc(-185, 218, 13, 0, 7); ctx.stroke();
      ctx.restore();
    }
    if (popU > 0 && popU < 1) {
      speedLines(ctx, 960, 520, 1000, 800, s + 120, 16, 1 - popU, 0.16);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * 6.28, r = 60 + popU * 300;
        dot(ctx, 960 + Math.cos(a) * r, 520 + Math.sin(a) * r * 0.7, 8 * (1 - popU), '#1B1A1F', 1 - popU);
      }
    }
  }
}

// ======================================================= JOKE 4 (42.5–55.5)
export function scene_joke4(ctx, W, H, sc) {
  const T = sc.T, s = boil(T);
  Ink.ink = '#1B1A1F';
  paper(ctx, W, H, '#FDEBDD', '#F7D9C2', s, 0.10);
  ctx.save();
  // dawn window
  ctx.save(); ctx.translate(1560, 250);
  ctx.fillStyle = '#FFFDF6'; ctx.fillRect(-14, -14, 300, 240);
  const g = ctx.createLinearGradient(0, 0, 0, 212);
  g.addColorStop(0, '#FFC6A1'); g.addColorStop(1, '#FFE6B8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 272, 212);
  dot(ctx, 70, 150, 40, '#FF9E6D');
  ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 10; ctx.strokeRect(-8, -8, 288, 228);
  line(ctx, 136, 0, 136, 212, 6, s + 2, { color: '#1B1A1F' });
  ctx.restore();

  // bed
  ctx.save();
  ctx.fillStyle = '#C98B72'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(540, 700, 760, 140, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF6EA'; ctx.beginPath(); ctx.roundRect(540, 646, 220, 110, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7A9AE0'; ctx.beginPath(); ctx.roundRect(760, 706, 540, 116, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF6EA'; ctx.beginPath(); ctx.roundRect(760, 706, 540, 30, 12); ctx.fill(); ctx.stroke();
  line(ctx, 560, 840, 560, 880, 10, s + 3); line(ctx, 1280, 840, 1280, 880, 10, s + 4);
  ctx.restore();
  // nightstand + phone
  ctx.save(); ctx.translate(1400, 760);
  ctx.fillStyle = '#C98B72'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.roundRect(-90, -20, 220, 140, 10); ctx.fill(); ctx.stroke();
  const gu = vis(sc, 'watch_goal') ? prog(sc, 'watch_goal', 0.3) : 0;
  if (gu > 0) {
    ctx.save(); ctx.translate(20, -60); ctx.rotate(0.06);
    const k = lerp(1.4, 1, easeOut(gu));
    ctx.scale(k, k);
    ctx.fillStyle = '#14312C'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.roundRect(-64, -110, 128, 200, 14); ctx.fill(); ctx.stroke();
    // step counter
    const steps = Math.floor(clamp01((T - sc.at.watch_goal) / 3.6) * 10000);
    text(ctx, String(steps), 0, -40, 34, 'Fredoka_600SemiBold', { color: '#8AC926' });
    text(ctx, 'STEPS', 0, -4, 22, 'Fredoka_600SemiBold', { color: '#CFEBDF' });
    if (vis(sc, 'stamp_proud')) {
      const su = prog(sc, 'stamp_proud', 0.18);
      const sk = lerp(2.6, 1, easeOut(su));
      ctx.save(); ctx.scale(sk, sk);
      ctx.fillStyle = '#8AC926'; ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.roundRect(-70, 24, 140, 54, 8); ctx.fill(); ctx.stroke();
      text(ctx, "I'M PROUD!", 0, 52, 30, 'Bangers-Regular', { color: '#14312C' });
      ctx.restore();
    }
    if (vis(sc, 'badge')) {
      const bu = prog(sc, 'badge', 0.3);
      const sk = lerp(1.9, 1, easeOut(bu));
      ctx.save(); ctx.translate(0, -84); ctx.scale(sk, sk); ctx.rotate(-0.1);
      // starburst
      blob(ctx, starPts(0, 0, 78, 46, 10, 0.3), s + 60, { color: '#FFD166', edge: true, edgeW: 6 });
      text(ctx, 'EVEREST', 0, -4, 26, 'Bangers-Regular', { color: '#14312C' });
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();

  // stickman horizontal, arm shaking
  const shakeT = T - sc.at.shake_start;
  const shaking = T >= sc.at.shake_start && T < sc.at.shake_end;
  let pose = POSES.sleep;
  const ha0 = [60, -150];
  if (T >= sc.at.shake_start - 0.3 && T < sc.at.shake_end + 0.4) {
    const amt = shaking ? Math.sin((T - sc.at.shake_start) * 34) : 0;
    const fade = shaking ? clamp01((T - sc.at.shake_start) * 4) * clamp01((sc.at.shake_end - T) * 3 + 0.3) : (T >= sc.at.shake_end + 0.4 ? 0 : 1);
    pose = {
      ...POSES.sleep,
      shA: [-40, -130], elA: [10, -190], haA: [ha0[0] + amt * 26 * fade, ha0[1] + amt * 14 * fade],
    };
    if (T >= sc.at.deadpan_zoom) pose = { ...pose, elA: [36, -156], haA: [-30, -110] };
  }
  // smear when shaking
  if (shaking) {
    for (let i = 1; i <= 2; i++) {
      ctx.globalAlpha = 0.14;
      drawStick(ctx, pose, { eyes: 'sleep', mouth: 'flat' },
        { x: 800 - i * 12, y: 700, seed: s - i, headR: 44, flat: true });
    }
    ctx.globalAlpha = 1;
  }
  const deadpan = T >= sc.at.deadpan_zoom && T < sc.at.split_panel;
  const face = deadpan
    ? { eyes: 'open', brow: 'flat', mouth: 'flat' }
    : shaking ? { eyes: 'squint', brow: 'angry', mouth: 'tremble', sweat: true }
      : { eyes: 'sleep', brow: 'none', mouth: 'flat' };
  face.blink = false;
  shadow(ctx, 800, 848, 90, 15, 0.3, s);
  drawStick(ctx, pose, face, { x: 800, y: 700, seed: s, headR: 44, tilt: -1.3 });

  // watch on the raised wrist
  if (T >= sc.at.watch_goal) {
    const wp = pose.haA;
    ctx.save(); ctx.translate(800 + wp[0] + 14, 700 + wp[1] + 8); ctx.rotate(shaking ? J(s, 81) * 0.3 : 0.4);
    ctx.fillStyle = '#14312C'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(-26, -20, 52, 40, 8); ctx.fill(); ctx.stroke();
    dot(ctx, 0, 0, 6, vis(sc, 'badge') ? '#8AC926' : '#5AA9E6');
    ctx.restore();
  }

  // cricket at crickets
  if (vis(sc, 'crickets') && T < sc.at.split_panel + 0.6) {
    const u = clamp01((T - sc.at.crickets) / 1.4);
    const cx = lerp(1500, 700, u), cy = 940;
    const hop = Math.abs(Math.sin(u * 18)) * 26 * (1 - u * 0.4);
    stroke(ctx, [{ x: cx - 22, y: cy - hop }, { x: cx, y: cy - 8 - hop }, { x: cx + 20, y: cy - 2 - hop }], 6, 5, s + 82, {});
    stroke(ctx, [{ x: cx - 8, y: cy - hop }, { x: cx - 16, y: cy - 24 - hop }], 4, 3, s + 83, {});
    dot(ctx, cx + 16, cy - 14 - hop, 4, '#1B1A1F');
    // chirp marks
    for (let i = 0; i < 2; i++) {
      const a = (T * 6 + i) % 1;
      ctx.strokeStyle = '#1B1A1F'; ctx.globalAlpha = 1 - a; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx + 34, cy - 26 - hop, 12 + a * 18, -0.7, 0.7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // split panels (expectation vs reality)
  if (vis(sc, 'split_panel')) {
    const u = prog(sc, 'split_panel', 0.3);
    const gap = 18, pw = (W - gap * 3) / 2, ph = H - gap * 2;
    // left: THE APP
    const lx = lerp(-pw - gap, gap, easeOut(u));
    drawPanel(ctx, lx, gap, pw, ph, 'THE APP:', () => {
      const g2 = ctx.createLinearGradient(0, gap, 0, gap + ph);
      g2.addColorStop(0, '#BFD9EE'); g2.addColorStop(1, '#E9F6EF');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, pw, ph);
      halftone(ctx, 0, ph * 0.6, pw, ph * 0.4, { gap: 10, r: 2.2, alpha: 0.16 });
      // mountain
      blob(ctx, [{ x: pw * 0.16, y: ph * 0.78 }, { x: pw * 0.5, y: ph * 0.24 }, { x: pw * 0.86, y: ph * 0.78 }], s + 90,
        { color: '#5B7B9A', edge: true, edgeW: 8 });
      blob(ctx, [{ x: pw * 0.5, y: ph * 0.24 }, { x: pw * 0.42, y: ph * 0.37 }, { x: pw * 0.58, y: ph * 0.37 }], s + 91, { color: '#FFFDF6' });
      // flag
      line(ctx, pw * 0.5, ph * 0.24, pw * 0.5, ph * 0.14, 6, s + 92, {});
      blob(ctx, [{ x: pw * 0.5, y: ph * 0.14 }, { x: pw * 0.6, y: ph * 0.17 }, { x: pw * 0.5, y: ph * 0.21 }], s + 93, { color: '#D62828' });
      text(ctx, '10,000 STEPS', pw / 2 + 26, ph * 0.88, 46, 'Fredoka_600SemiBold', { color: '#1B1A1F' });
      stroke(ctx, [{ x: pw / 2 - 132, y: ph * 0.88 + 2 }, { x: pw / 2 - 116, y: ph * 0.88 + 20 }, { x: pw / 2 - 78, y: ph * 0.88 - 24 }], 11, 13, s + 97, { color: '#4CAF50' });
      text(ctx, '11:42 · DONE', pw / 2, ph * 0.95, 30, 'Fredoka_600SemiBold', { color: '#55505E' });
    }, s);
    // right: REALITY
    const rx = lerp(W + gap, W - pw - gap, easeOut(u));
    drawPanel(ctx, rx, gap, pw, ph, 'REALITY:', () => {
      const g3 = ctx.createLinearGradient(0, gap, 0, gap + ph);
      g3.addColorStop(0, '#FDEBDD'); g3.addColorStop(1, '#F7D9C2');
      ctx.fillStyle = g3; ctx.fillRect(0, 0, pw, ph);
      halftone(ctx, 0, ph * 0.6, pw, ph * 0.4, { gap: 10, r: 2.2, alpha: 0.14 });
      // bed + flat stickman
      ctx.save(); ctx.translate(pw / 2, ph * 0.66);
      ctx.fillStyle = '#C98B72'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.roundRect(-330, -30, 660, 150, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7A9AE0'; ctx.beginPath(); ctx.roundRect(-40, -40, 380, 130, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF6EA'; ctx.beginPath(); ctx.roundRect(-320, -80, 170, 90, 14); ctx.fill(); ctx.stroke();
      ctx.restore();
      drawStick(ctx, POSES.sleep, { eyes: 'sleep', mouth: 'flat' },
        { x: pw / 2 - 40, y: ph * 0.66 - 44, seed: s + 94, headR: 40, tilt: -1.9 });
      text(ctx, '…', pw / 2 + 60, ph * 0.5, 90, 'Bangers-Regular', { color: '#55505E' });
      text(ctx, 'still horizontal', pw / 2, ph * 0.88, 46, 'Fredoka_600SemiBold', { color: '#1B1A1F' });
      text(ctx, '11:42 · FOREVER', pw / 2, ph * 0.95, 30, 'Fredoka_600SemiBold', { color: '#55505E' });
    }, s);
  }
  ctx.restore();
}

function starPts(cx, cy, rOut, rIn, n, rot = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? rIn : rOut;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function drawPanel(ctx, x, y, w, h, title, inner, s) {
  ctx.save();
  ctx.translate(x, y);
  // clip contents
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  inner();
  ctx.restore();
  ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 12;
  ctx.strokeRect(0, 0, w, h);
  // title tab
  ctx.fillStyle = '#1B1A1F';
  ctx.beginPath(); ctx.roundRect(24, 24, 300, 74, 8); ctx.fill();
  stampText(ctx, title, 40, 62, 46, 'Bangers-Regular', { color: '#FFFDF6', align: 'left' });
  ctx.restore();
}

// ======================================================= JOKE 5 (55.5–66.5)
export function scene_joke5(ctx, W, H, sc) {
  const T = sc.T, s = boil(T);
  Ink.ink = '#1B1A1F';
  paper(ctx, W, H, '#F7EDE4', '#EFDCCF', s, 0.11);
  ctx.save();
  line(ctx, 0, 880, W, 880, 6, s + 1, { alpha: 0.45 });
  // wall art: "breathe" cross-stitch (generic therapy decor)
  ctx.save(); ctx.translate(560, 250);
  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.roundRect(-130, -70, 260, 140, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'breathe', 0, 0, 60, 'PatrickHand-Regular', { color: '#55505E' });
  ctx.restore();

  // couch (left)
  ctx.save(); ctx.translate(430, 880);
  // back
  blob(ctx, [{ x: -320, y: -70 }, { x: -330, y: -196 }, { x: -296, y: -230 },
  { x: 300, y: -230 }, { x: 330, y: -196 }, { x: 322, y: -70 }], s + 2,
    { color: '#D98489', edge: true, edgeW: 9 });
  // seat
  blob(ctx, [{ x: -356, y: -78 }, { x: 356, y: -78 }, { x: 348, y: -6 }, { x: -348, y: -6 }], s + 3,
    { color: '#E5989B', edge: true, edgeW: 9 });
  // armrests
  blob(ctx, [{ x: -356, y: -8 }, { x: -356, y: -150 }, { x: -312, y: -164 },
  { x: -300, y: -140 }, { x: -300, y: -8 }], s + 4, { color: '#C9757B', edge: true, edgeW: 8 });
  blob(ctx, [{ x: 356, y: -8 }, { x: 356, y: -150 }, { x: 312, y: -164 },
  { x: 300, y: -140 }, { x: 300, y: -8 }], s + 5, { color: '#C9757B', edge: true, edgeW: 8 });
  // legs
  stroke(ctx, [{ x: -320, y: -6 }, { x: -330, y: 44 }], 16, 14, s + 6, {});
  stroke(ctx, [{ x: 320, y: -6 }, { x: 330, y: 44 }], 16, 14, s + 7, {});
  ctx.restore();

  // Stickman lying on couch (head left on pillow)
  const talkU = vis(sc, 'talk_scribble') ? (Math.sin((T - sc.at.talk_scribble) * 5.5) * 0.5 + 0.5) : 0;
  let pose = { ...POSES.sleep, haA: [-30, -40 - talkU * 50], elA: [-46, -78 - talkU * 26] };
  if (vis(sc, 'tear')) pose = { ...pose, haA: [-70, -140], elA: [-46, -110] };
  const face = vis(sc, 'tear')
    ? { eyes: 'open', brow: 'sad', mouth: 'tremble', tear: prog(sc, 'tear', 1.1) }
    : { eyes: 'open', brow: 'flat', mouth: talkU > 0.4 ? 'o' : 'flat' };
  face.blink = blinkOf(T);
  if (T > sc.at.duck_squeak && T < sc.at.tear) { face.brow = 'sad'; face.mouth = 'flat'; }
  ctx.save(); ctx.translate(340, 706); ctx.rotate(0.06);
  blob(ctx, [{ x: -40, y: -10 }, { x: 60, y: -30 }, { x: 80, y: 30 }, { x: -40, y: 40 }], s + 6, { color: '#FFF6EA', edge: true, edgeW: 6 });
  ctx.restore();
  drawStick(ctx, pose, face, { x: 480, y: 790, seed: s, headR: 44, tilt: -1.25 });
  // speech scribble
  if (vis(sc, 'talk_scribble') && !vis(sc, 'tear')) {
    const u = clamp01((T - sc.at.talk_scribble) / 0.4) * (1 - clamp01((T - sc.at.duck_reveal) / 0.5));
    if (u > 0.05) {
      ctx.save(); ctx.globalAlpha = u;
      stroke(ctx, [
        { x: 545, y: 690 }, { x: 596, y: 660 }, { x: 566, y: 628 }, { x: 612, y: 602 },
        { x: 585, y: 572 }, { x: 630, y: 552 },
      ], 6, 4, s + 7, { alpha: u });
      ctx.restore();
    }
  }

  // duck therapist on big chair (revealed by camera pan; drawn always)
  const dx = 1430, dy = 740; // dy = duck origin (pad center = dx-99, dy-10)
  const squeakHit = Math.abs(T - sc.at.duck_squeak) < 0.3;
  if (vis(sc, 'duck_reveal')) {
    const ru = prog(sc, 'duck_reveal', 0.3);
    const rk = ru < 1 ? lerp(1.6, 1, easeOut(ru)) : 1;
    ctx.save();
    ctx.translate(dx, dy + 40); ctx.scale(rk, rk); ctx.translate(-dx, -(dy + 40));
  // chair
  ctx.fillStyle = '#7A9AE0'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.roundRect(dx - 200, dy - 170, 440, 320, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6686CE'; ctx.beginPath(); ctx.roundRect(dx - 168, dy - 140, 170, 260, 18); ctx.fill(); ctx.stroke();
  drawDuck(ctx, dx, dy, 1.7, {
    seed: s, glasses: true, notepad: true,
    color: '#FFD166',
  });
  // duck writing
  if (vis(sc, 'duck_write') && T < sc.at.duck_write + 1.6) {
    const w = Math.sin((T - sc.at.duck_write) * 16) * 26;
    pencilArm(ctx, dx + 44, dy - 6, dx - 20 + w, dy + 40, s + 10);
    // scribbles on pad
    for (let i = 0; i < 3; i++) {
      const y = dy - 46 + i * 24;
      line(ctx, dx - 130, y, dx - 60 + i * 12, y + 4, 5, s + 11 + i, { alpha: 0.8 });
    }
  }
  // $80/hr appears on the pad
  if (vis(sc, 'notepad_80')) {
    const u = prog(sc, 'notepad_80', 0.3);
    ctx.save(); ctx.globalAlpha = easeOut(u);
    text(ctx, '$80', dx - 99, dy - 16, 46, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, '/ hr', dx - 97, dy + 26, 34, 'PatrickHand-Regular', { color: '#55505E' });
    ctx.restore();
  }
  // squeak motion
  if (squeakHit || (T > sc.at.duck_reveal && T < sc.at.duck_reveal + 0.5)) {
    const a = Math.sin(T * 30) * 6;
    ctx.save(); ctx.translate(0, a * 0.4);
    ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 5; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(dx + 196, dy - 76, 26, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(dx + 206, dy - 76, 44, -0.6, 0.6); ctx.stroke();
    ctx.restore();
  }
  ctx.restore(); // pop transform
  } // end duck_reveal gate
  // tear drop falling
  if (vis(sc, 'tear')) {
    const u = prog(sc, 'tear', 1.3);
    if (u < 0.92) {
      const tx = 480 + POSES.sleep.head[0] - 30, ty = 790 + POSES.sleep.head[1] + 34;
      const fy = ty + u * 76;
      ctx.fillStyle = '#5AA9E6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tx, fy - 14);
      ctx.quadraticCurveTo(tx + 10, fy, tx, fy + 12);
      ctx.quadraticCurveTo(tx - 10, fy, tx, fy - 14);
      ctx.fill(); ctx.stroke();
    } else if (u < 1) {
      dot(ctx, 318, 806, 8 * (1 - u), '#5AA9E6', 1 - u);
    }
  }
  ctx.restore();
}

// ======================================================= OUTRO (66.5–72)
export function scene_outro(ctx, W, H, sc) {
  const T = sc.T, s = boil(T);
  Ink.ink = '#2A2237';
  paper(ctx, W, H, '#FFB36B', '#4A3358', s, 0.18);
  // sky extras
  ctx.save();
  const sunY = lerp(560, 700, clamp01((T - 66.5) / 5.5));
  dot(ctx, 470, sunY, 130, '#FFE3B3');
  ctx.globalAlpha = 0.5; dot(ctx, 470, sunY, 172, '#FFD9A0', 0.4); ctx.globalAlpha = 1;
  for (let i = 0; i < 40; i++) {
    const x = hash(i * 5.3) * W, y = hash(i * 9.1) * 420;
    dot(ctx, x, y, 1.8 + hash(i) * 1.6, '#FFF3E0', 0.35 + 0.35 * Math.sin(T * 2 + i));
  }
  // skyline, two parallax layers
  const layers = [[0.6, '#5E4670', 0], [1, '#3A2B4E', 1]];
  layers.forEach(([k, col, li]) => {
    ctx.fillStyle = col;
    let x = -60 - li * 40;
    let i = li * 3;
    ctx.beginPath(); ctx.moveTo(x, H);
    while (x < W + 60) {
      const bw = 90 + hash(i * 7.7) * 150, bh = 260 * k + hash(i * 3.3) * 300 * k;
      ctx.lineTo(x, 880 - bh); ctx.lineTo(x + bw, 880 - bh); x += bw; i++;
    }
    ctx.lineTo(W + 60, H); ctx.closePath(); ctx.fill();
    // lit windows
    for (let j = 0; j < 26; j++) {
      const wx = hash(j * 11 + li) * W, wy = 880 - 34 - hash(j * 3 + li) * 150 * k;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 1.4 + j * 2);
      ctx.fillStyle = '#FFD166'; ctx.fillRect(wx, wy, 12, 14);
      ctx.globalAlpha = 1;
    }
  });
  ctx.fillStyle = '#241B33'; ctx.fillRect(0, 880, W, H - 880);
  ctx.restore();

  ctx.save();
  // Stickman on the roof ledge with coffee (clear of the endcard)
  const SX = 1660;
  const sipping = T >= sc.at.sip_outro && T < sc.at.sip_outro + 0.9;
  const twitch = Math.abs(T - sc.at.alarm_callback) < 0.35;
  let pose = POSES.stand;
  if (sipping) {
    const u = prog(sc, 'sip_outro', 0.9);
    const up = u < 0.5 ? easeOut(u * 2) : 1 - easeOut((u - 0.5) * 2);
    pose = { ...POSES.stand, haA: [lerp(-14, 36, up), lerp(6, -140, up)], elA: [lerp(-6, 52, up), lerp(-52, -76, up)] };
  }
  const face = twitch
    ? { eyes: 'open', brow: 'angry', mouth: 'flat' }
    : { eyes: sipping ? 'happy' : 'open', brow: 'flat', mouth: 'smile' };
  face.blink = !twitch && blinkOf(T);
  shadow(ctx, SX, 886, 74, 14, 0.4, s);
  drawStick(ctx, pose, face, { x: SX, y: 886 - 96, seed: s, headR: 46, color: '#FFF3E0' });
  // mug
  ctx.save(); ctx.translate(SX + pose.haA[0] + 6, 790 + pose.haA[1]);
  blob(ctx, [{ x: -30, y: -6 }, { x: 30, y: -6 }, { x: 26, y: -58 }, { x: -26, y: -58 }], s + 20, { color: '#D62828', edge: true, edgeW: 6 });
  ring(ctx, 34, -34, 18, 6, s + 22, { color: '#FFF3E0' });
  for (let i = 0; i < 2; i++) {
    const wob = Math.sin(T * 2.4 + i * 2) * 7;
    stroke(ctx, [{ x: -8 + i * 18, y: -68 }, { x: 0 + i * 18 + wob, y: -100 }, { x: -10 + i * 18, y: -134 }], 5, 2.5, s + 21 + i, { color: '#FFF3E0', alpha: 0.65 });
  }
  ctx.restore();
  // wrist alarm buzz ticks at callback
  if (twitch) {
    for (let i = 0; i < 4; i++) {
      const a = -1.2 + i * 0.35;
      line(ctx, SX + 8 + Math.cos(a) * 60, 790 - 60 + Math.sin(a) * 60,
        SX + 8 + Math.cos(a) * 86, 790 - 60 + Math.sin(a) * 86, 5, s + 30 + i,
        { alpha: 0.9, color: '#FFF3E0' });
    }
  }
  ctx.restore();

  // endcard stamp
  if (vis(sc, 'endcard')) {
    const u = prog(sc, 'endcard', 0.16);
    const k = u < 1 ? lerp(3, 1, easeOut(u)) : 1;
    ctx.save(); ctx.translate(960, 470); ctx.rotate(-0.04); ctx.scale(k, k);
    ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#D62828'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.roundRect(-480, -140, 960, 280, 20); ctx.fill(); ctx.stroke();
    text(ctx, "EVERYTHING'S FINE.", 0, -40, 118, 'Bangers-Regular', { color: '#D62828' });
    text(ctx, 'see you monday.', 0, 74, 54, 'PatrickHand-Regular', { color: '#55505E' });
    ctx.restore();
  }
}
