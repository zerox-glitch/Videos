// rig.js — articulated stickman + rubber duck. Poses are pelvis-local joint
// maps; scenes position the pelvis. All drawing boils with the ink seed.

import { stroke, ring, blob, dot, line, Ink, J } from './lib/ink.js';

// ---- pose library (pelvis-local, facing +x) -----------------------------
const P = (chest, neck, head, shA, elA, haA, shB, elB, haB, knA, ftA, knB, ftB) =>
  ({ chest, neck, head, shA, elA, haA, shB, elB, haB, knA, ftA, knB, ftB });

export const POSES = {
  stand: P([0,-118],[8,-166],[16,-214], [4,-110],[-6,-52],[-14,6], [0,-108],[10,-52],[16,8],
            [-8,42],[-14,96],[14,44],[26,96]),
  wave: P([0,-118],[8,-166],[16,-214], [4,-110],[50,-170],[64,-276], [0,-108],[12,-50],[20,10],
            [-6,42],[-12,96],[16,44],[30,96]),
  sleep: P([-40,-70],[-86,-86],[-132,-96], [-40,-74],[-76,-44],[-104,-18], [-36,-70],[-70,-96],[-96,-118],
            [-8,10],[24,18],[16,6],[44,2]),
  slap: P([6,-124],[16,-170],[22,-218], [8,-114],[62,-96],[110,-80], [2,-108],[12,-48],[20,12],
            [-4,44],[-8,98],[18,46],[32,98]),
  sit: P([-4,-108],[6,-156],[14,-204], [4,-100],[30,-76],[62,-74], [-2,-98],[26,-70],[72,-66],
          [62,44],[64,104],[58,52],[60,106]),
  sitArmOut: P([-4,-108],[8,-158],[18,-206], [6,-102],[56,-92],[106,-96], [-2,-98],[8,-40],[16,8],
                [62,44],[64,104],[58,52],[60,106]),
  sip: P([0,-116],[8,-164],[14,-212], [6,-106],[44,-74],[30,-156], [0,-106],[10,-48],[18,12],
          [-6,42],[-12,96],[16,44],[28,96]),
  deadpan: P([0,-120],[6,-168],[10,-218], [2,-112],[0,-50],[-2,10], [2,-112],[0,-50],[2,10],
              [-4,44],[-6,98],[4,44],[6,98]),
  watchLook: P([2,-118],[10,-166],[16,-214], [6,-110],[50,-96],[24,-138], [0,-108],[12,-48],[20,12],
                [-6,42],[-12,96],[16,44],[30,96]),
  cry: P([4,-112],[14,-160],[20,-210], [8,-104],[34,-66],[6,-174], [4,-104],[36,-70],[2,-178],
          [-6,42],[-10,96],[14,46],[26,96]),
  talk: P([0,-116],[10,-164],[18,-212], [4,-108],[46,-84],[88,-96], [0,-106],[10,-48],[16,14],
           [-6,42],[-10,96],[16,44],[30,96]),
  lean: P([14,-112],[26,-158],[36,-204], [16,-104],[50,-64],[78,-24], [8,-104],[18,-46],[26,14],
           [-6,44],[-4,98],[16,48],[24,98]),
};

export function lerpPose(a, b, u) {
  const e = u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
  const o = {};
  for (const k in a) o[k] = [a[k][0] + (b[k][0] - a[k][0]) * e, a[k][1] + (b[k][1] - a[k][1]) * e];
  return o;
}
export function poseMix(list, u) { // list: [[poseName,atNorm]...] piecewise
  if (u <= list[0][1]) return POSES[list[0][0]];
  for (let i = 1; i < list.length; i++)
    if (u <= list[i][1]) {
      const [p0, u0] = list[i - 1], [p1, u1] = list[i];
      return lerpPose(POSES[p0], POSES[p1], (u - u0) / (u1 - u0 || 1));
    }
  return POSES[list[list.length - 1][0]];
}

// ---- stickman -----------------------------------------------------------
export function drawStick(ctx, pose, face, opt = {}) {
  const s = opt.seed || 0, w = opt.weight || 1;
  const px = opt.x || 0, py = opt.y || 0;
  const col = { color: opt.color || Ink.ink, flat: opt.flat };
  ctx.save(); ctx.translate(px, py);
  if (opt.squash) ctx.scale(1 / opt.squash, opt.squash);

  const g = (k) => ({ x: pose[k][0], y: pose[k][1] });
  // far limbs (lighter)
  const far = { alpha: 0.35 };
  stroke(ctx, [g('shB'), g('elB'), g('haB')], 8 * w, 6 * w, s + 11, { ...col, ...far });
  stroke(ctx, [{ x: 0, y: 0 }, g('knB'), g('ftB')], 9 * w, 7 * w, s + 12, { ...col, ...far });
  // near limbs + body
  stroke(ctx, [g('knA'), g('ftA')], 9.5 * w, 7.5 * w, s + 7, col);
  stroke(ctx, [{ x: 0, y: 0 }, g('knA')], 10.5 * w, 9 * w, s + 6, col);
  stroke(ctx, [{ x: 0, y: 0 }, g('chest'), g('neck')], 12.5 * w, 10.5 * w, s + 2, col);
  stroke(ctx, [g('chest'), g('shA'), g('elA'), g('haA')], 10 * w, 7 * w, s + 3, col);
  // feet
  stroke(ctx, [g('ftA'), { x: g('ftA').x + 22 * w, y: g('ftA').y + 2 }], 7 * w, 5.5 * w, s + 8, col);
  stroke(ctx, [g('ftB'), { x: g('ftB').x + 20 * w, y: g('ftB').y + 2 }], 6.5 * w, 5 * w, s + 9, { ...col, ...far });
  // head
  const h = g('head'), hr = opt.headR || 46;
  ring(ctx, h.x, h.y, hr, 10 * w, s + 4, col);
  drawFace(ctx, h.x, h.y, hr, face, s, opt);
  ctx.restore();
}

// ---- face ---------------------------------------------------------------
// face: {eyes:'open|happy|sleep|wide|dead|x|squint|lookR|lookL', blink?:bool,
//         brow:'flat|sad|angry|raise|none', mouth:'smile|flat|o|frown|grin|tremble|open|none', tear?:0..1, sweat?:bool}
export function drawFace(ctx, cx, cy, r, f = {}, s = 0, opt = {}) {
  const ex = r * 0.34, ey = -r * 0.10, pr = opt.faceScale || 1;
  const ink = opt.color || Ink.ink;
  const blinkAuto = f.blink;
  let eyes = f.eyes || 'open';
  if (blinkAuto) eyes = 'sleep';
  ctx.save();
  ctx.translate(cx, cy);
  if (opt.tilt) ctx.rotate(opt.tilt);
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round';
  const P1 = (x, y) => ({ x, y });

  if (eyes === 'open' || eyes === 'lookR' || eyes === 'lookL' || eyes === 'wide') {
    const rr = eyes === 'wide' ? 7 : 5.4 * pr;
    const off = eyes === 'lookR' ? 3.5 : eyes === 'lookL' ? -3.5 : 0;
    dot(ctx, -ex + off, ey, rr, ink); dot(ctx, ex + off, ey, rr, ink);
  } else if (eyes === 'happy') {
    ctx.lineWidth = 5 * pr;
    ctx.beginPath(); ctx.arc(-ex, ey + 4, 9, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey + 4, 9, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  } else if (eyes === 'sleep') {
    ctx.lineWidth = 5 * pr;
    ctx.beginPath(); ctx.moveTo(-ex - 8, ey); ctx.quadraticCurveTo(-ex, ey + 6, -ex + 8, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - 8, ey); ctx.quadraticCurveTo(ex, ey + 6, ex + 8, ey); ctx.stroke();
  } else if (eyes === 'squint') {
    ctx.lineWidth = 5 * pr;
    line(ctx, -ex - 8, ey, -ex + 8, ey, 5 * pr, s + 21, { color: ink, flat: true });
    line(ctx, ex - 8, ey, ex + 8, ey, 5 * pr, s + 22, { color: ink, flat: true });
  } else if (eyes === 'dead') {
    ctx.lineWidth = 4.6 * pr;
    ctx.beginPath(); ctx.moveTo(-ex - 8, ey - 6); ctx.lineTo(-ex + 6, ey + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - 6, ey - 6); ctx.lineTo(ex + 8, ey + 4); ctx.stroke();
  }
  // brows
  const br = f.brow;
  if (br && br !== 'none') {
    ctx.lineWidth = 5.4 * pr;
    const B = (x, a, dy) => { ctx.save(); ctx.translate(x, ey - 16 + (dy || 0)); ctx.rotate(a); line(ctx, -9, 0, 9, 0, 5.4 * pr, s + (x < 0 ? 31 : 32), { color: ink, flat: true }); ctx.restore(); };
    if (br === 'flat') { B(-ex, 0.06); B(ex, -0.06); }
    if (br === 'sad') { B(-ex, -0.42); B(ex, 0.42); }
    if (br === 'angry') { B(-ex, 0.5); B(ex, -0.5); }
    if (br === 'raise') { B(-ex, -0.2, -7); B(ex, 0.18, -5); }
  }
  // mouth
  const m = f.mouth, my = r * 0.42;
  ctx.lineWidth = 5.4 * pr;
  if (m === 'smile') { ctx.beginPath(); ctx.arc(0, my - 5, 12, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  if (m === 'flat') line(ctx, -9, my, 9, my, 5.4 * pr, s + 41, { color: ink, flat: true });
  if (m === 'grin') {
    ctx.save(); ctx.beginPath(); ctx.arc(0, my - 3, 13, 0.15, Math.PI - 0.15); ctx.closePath();
    ctx.fillStyle = ink; ctx.fill(); ctx.restore();
  }
  if (m === 'o') { ctx.beginPath(); ctx.arc(0, my, 7.5, 0, 7); ctx.stroke(); }
  if (m === 'frown') { ctx.beginPath(); ctx.arc(0, my + 9, 12, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  if (m === 'tremble') { // squiggle
    ctx.beginPath(); ctx.moveTo(-11, my);
    for (let i = -11; i <= 11; i += 5.5) ctx.quadraticCurveTo(i + 2.75, my + (i % 11 ? -6 : 6), i + 5.5, my);
    ctx.stroke();
  }
  if (m === 'open') { ctx.beginPath(); ctx.ellipse(0, my + 2, 10, 13, 0, 0, 7); ctx.stroke(); }
  // tear
  if (f.tear > 0.02) {
    const ty = ey + f.tear * r * 1.5;
    ctx.fillStyle = '#5AA9E6';
    ctx.beginPath(); ctx.moveTo(-ex, ey + 4);
    ctx.quadraticCurveTo(-ex + 7, ty - 6, -ex, ty);
    ctx.quadraticCurveTo(-ex - 7, ty - 6, -ex, ey + 4);
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
  }
  // sweat drop
  if (f.sweat) {
    ctx.fillStyle = '#8FCBFF'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    const sx = r * 0.78, sy = -r * 0.55;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 9, sy + 12, sx, sy + 20);
    ctx.quadraticCurveTo(sx - 9, sy + 12, sx, sy);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ---- rubber duck therapist ---------------------------------------------
export function drawDuck(ctx, x, y, s, opt = {}) {
  const seed = opt.seed || 0;
  const ink = { color: Ink.ink };
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // body
  blob(ctx, [
    { x: -46, y: 6 }, { x: -30, y: -26 }, { x: 4, y: -34 }, { x: 38, y: -16 },
    { x: 52, y: 12 }, { x: 40, y: 34 }, { x: -6, y: 40 }, { x: -40, y: 30 },
  ], seed + 50, { color: opt.color || '#FFD166', edge: true, edgeW: 7 });
  // head
  blob(ctx, [
    { x: 22, y: -34 }, { x: 34, y: -64 }, { x: 56, y: -74 }, { x: 76, y: -60 },
    { x: 82, y: -38 }, { x: 70, y: -20 }, { x: 46, y: -18 }, { x: 28, y: -24 },
  ], seed + 51, { color: opt.color || '#FFD166', edge: true, edgeW: 7 });
  // beak
  blob(ctx, [{ x: 80, y: -52 }, { x: 104, y: -46 }, { x: 106, y: -36 }, { x: 96, y: -30 }, { x: 78, y: -34 }],
    seed + 52, { color: '#F4A261', edge: true, edgeW: 6 });
  // wing
  stroke(ctx, [{ x: -14, y: 0 }, { x: 8, y: 12 }, { x: 24, y: 4 }], 7, 5, seed + 53, ink);
  // eye
  dot(ctx, 58, -52, 5.5, Ink.ink);
  if (opt.glasses) {
    ring(ctx, 58, -52, 15, 4.5, seed + 54, ink);
    stroke(ctx, [{ x: 68, y: -44 }, { x: 78, y: -18 }, { x: 66, y: 6 }], 3, 2.5, seed + 56, { color: Ink.ink, alpha: 0.85 });
  }
  if (opt.notepad) { // tiny notepad in front
    ctx.save(); ctx.translate(-58, -6); ctx.rotate(-0.14);
    ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = Ink.ink; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.rect(-26, -34, 52, 66); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

export function pencilArm(ctx, x1, y1, x2, y2, seed) { // duck's writing pencil
  stroke(ctx, [{ x: x1, y: y1 }, { x: x2, y: y2 }], 7, 6, seed, { color: Ink.ink });
  blob(ctx, [{ x: x2, y: y2 }, { x: x2 + 14, y: y2 + 6 }, { x: x2 + 4, y: y2 + 12 }], seed + 1,
    { color: '#E0B87A', edge: true, edgeW: 4 });
}
