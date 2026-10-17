// 12–18 s · Three crafts, one director. Cards land like shots on a beat.
import { W, H, C, F, DURATION } from '../data.js';
import { cues } from '../timing.js';
import {
  bg, text, label, card, wordsMasked, roundRect, hairlineGrid, cornerMarks, footer,
  outExpo, outCubic, outBack, seg, clamp, lerp, sine, setFont, playMark,
} from '../draw.js';

const CARDS = [
  { x: 90, y: 720, w: 280, h: 520, n: '01', title: 'TYPE', at: 0.18 },
  { x: 400, y: 720, w: 280, h: 520, n: '02', title: 'MOTION', at: 0.6 },
  { x: 710, y: 720, w: 280, h: 520, n: '03', title: 'SOUND', at: 1.02 },
];

function cardShell(ctx, t, c) {
  const p = outBack(seg(t, 0.1 + c.at, 0.62 + c.at), 1.7);
  if (p <= 0) return null;
  const yOff = (1 - clamp(p)) * 70;
  ctx.save();
  ctx.globalAlpha = clamp(p * 1.35);
  ctx.translate(c.x + c.w / 2, c.y + yOff + c.h / 2);
  ctx.scale(lerp(0.94, 1, clamp(p)), lerp(0.94, 1, clamp(p)));
  ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2));
  card(ctx, c.x, c.y, c.w, c.h, 24, 'rgba(10,12,15,0.035)', { stroke: 'rgba(10,12,15,0.22)' });

  // flash border on landing
  const flash = clamp(1 - (t - (0.62 + c.at)) / 0.45);
  if (flash > 0 && p > 0.5) {
    roundRect(ctx, c.x, c.y, c.w, c.h, 24);
    ctx.strokeStyle = C.lime;
    ctx.globalAlpha = flash * 0.9;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  label(ctx, c.n, c.x + 26, c.y + 48, { color: C.lime, size: 20, track: 3 });
  label(ctx, c.title, c.x + 26, c.y + c.h - 26, { color: C.ink, size: 22, track: 5 });
  ctx.restore();
  return p;
}

function typeCard(ctx, t, c) {
  const p = outExpo(seg(t, 0.5, 1.0));
  text(ctx, 'Aa', c.x + 26, c.y + 240, {
    size: 132, family: F.display, color: C.ink, alpha: p, track: -4,
  });
  // a live caption demo inside the card
  const capY = c.y + 330;
  const words = ['MAKE', 'IT', 'MOVE'];
  setFont(ctx, 30, F.display);
  let x = c.x + 26;
  for (let i = 0; i < words.length; i++) {
    const pp = outBack(seg(t, 1.0 + i * 0.12, 1.32 + i * 0.12), 2);
    if (pp > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(pp);
      ctx.translate(x, capY + (1 - clamp(pp)) * 18);
      ctx.fillStyle = i === 2 ? C.ember : C.ink;
      ctx.fillText(words[i], 0, 0);
      ctx.restore();
    }
    x += ctx.measureText(words[i]).width + 10;
  }
  // baseline rules, like a type specimen
  ctx.strokeStyle = 'rgba(10,12,15,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(c.x + 26, capY + 12); ctx.lineTo(c.x + c.w - 26, capY + 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(c.x + 26, c.y + 150); ctx.lineTo(c.x + c.w - 26, c.y + 150); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(c.x + 26, c.y + 392); ctx.lineTo(c.x + c.w - 26, c.y + 392); ctx.stroke();
  label(ctx, 'SPACE GROTESK / INTER', c.x + 26, c.y + 430, { color: C.muted, size: 15, track: 1 });
}

function motionCard(ctx, t, c) {
  const x0 = c.x + 26, x1 = c.x + c.w - 26;
  const yb = c.y + 340, yt = c.y + 150;
  const X = u => lerp(x0, x1, u);
  const Y = v => lerp(yb, yt, v);
  ctx.save();
  ctx.strokeStyle = 'rgba(10,12,15,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();

  const u = clamp(((t - 1.1) % 3) / 2);
  ctx.strokeStyle = C.lime;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const uu = (i / 60);
    const vv = 1 - Math.pow(1 - uu, 3);
    if (i === 0) ctx.moveTo(X(uu), Y(vv)); else ctx.lineTo(X(uu), Y(vv));
  }
  ctx.stroke();

  const v = 1 - Math.pow(1 - u, 3);
  for (let k = 4; k >= 1; k--) {
    const uk = clamp(u - k * 0.045);
    const vk = 1 - Math.pow(1 - uk, 3);
    ctx.globalAlpha = 0.2 * (1 - k / 5);
    ctx.fillStyle = C.lime;
    ctx.beginPath(); ctx.arc(X(uk), Y(vk), 9 - k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(199,255,62,0.9)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(X(u), Y(v), 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  label(ctx, 'EASE OUT CUBIC', c.x + 26, c.y + 430, { color: C.muted, size: 15, track: 1 });
}

function soundCard(ctx, t, c) {
  const n = 15;
  const base = c.y + 350;
  const w = (c.w - 52) / n;
  for (let i = 0; i < n; i++) {
    const env = Math.exp(-Math.pow((i - n * 0.45) / (n * 0.34), 2));
    const osc = 0.55 + 0.45 * Math.abs(sine(t * (1.3 + i * 0.07) + i * 0.11, 1));
    const h = 12 + env * osc * 150;
    const x = c.x + 26 + i * w;
    const appear = outExpo(seg(t, 1.2 + i * 0.02, 1.5 + i * 0.02));
    ctx.fillStyle = i < 6 ? C.lime : 'rgba(199,255,62,0.75)';
    ctx.globalAlpha = appear;
    roundRect(ctx, x + w * 0.18, base - h, w * 0.64, h, w * 0.3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(10,12,15,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(c.x + 26, base + 18); ctx.lineTo(c.x + c.w - 26, base + 18); ctx.stroke();
  label(ctx, '−14 LUFS / −1.5 dBTP', c.x + 26, c.y + 430, { color: C.muted, size: 15, track: 1 });
}

function cueStrip(ctx, t, globalT) {
  const shown = outExpo(seg(t, 2.6, 3.2));
  if (shown <= 0) return;
  const x0 = 90, x1 = W - 90, yb = 1400, yt = 1352;
  const X = ct => lerp(x0, x1, clamp(ct / DURATION));
  ctx.save();
  ctx.globalAlpha = shown;
  ctx.strokeStyle = 'rgba(10,12,15,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();
  for (const c of cues) {
    const x = X(c[0]);
    const past = c[0] <= globalT;
    const big = c[1] === 'impact';
    const h = big ? 34 : c[1] === 'whoosh' ? 24 : 14;
    ctx.strokeStyle = past ? (big ? C.ember : 'rgba(10,12,15,0.75)') : 'rgba(10,12,15,0.18)';
    ctx.lineWidth = big ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x, yb);
    ctx.lineTo(x, yb - h);
    ctx.stroke();
  }
  for (let s = 0; s <= DURATION; s += 5) {
    const x = X(s);
    ctx.strokeStyle = 'rgba(10,12,15,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb + 8); ctx.stroke();
    label(ctx, `${s}s`, x, yb + 30, { color: C.ink, size: 15, align: 'center', alpha: 0.45, track: 1 });
  }
  const px = X(globalT);
  ctx.fillStyle = C.lime;
  ctx.fillRect(px - 1.5, yt - 8, 3, yb - yt + 26);
  ctx.beginPath(); ctx.arc(px, yt - 8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(10,12,15,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(px, yt - 8, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function draw(ctx, t, globalT = 12 + t) {
  bg(ctx, C.cream);
  hairlineGrid(ctx, { alpha: 0.04, color: C.ink });

  label(ctx, '03 — ONE SYSTEM', 90, 340, { color: C.ember, alpha: outExpo(seg(t, 0.03, 0.45)), size: 22, track: 6 });

  wordsMasked(ctx, 'Three crafts.', 90, 500, {
    size: 122, family: F.display, align: 'left', color: C.ink, t, start: 0.08, stagger: 0.07, dur: 0.5, track: -2,
  });
  const oneP = seg(t, 0.3, 0.75);
  wordsMasked(ctx, 'One director.', 90, 636, {
    size: 122, family: F.display, align: 'left', color: C.ink, t, start: 0.3, stagger: 0.06, dur: 0.5, track: -2,
  });
  // lime swipe under the second line once revealed
  const swipe = outCubic(seg(t, 0.95, 1.35));
  if (swipe > 0) {
    ctx.fillStyle = C.lime;
    ctx.fillRect(88, 660, 700 * swipe, 18);
  }

  for (const c of CARDS) {
    const p = cardShell(ctx, t, c);
    if (p === null) continue;
    ctx.save();
    if (c.title === 'TYPE') typeCard(ctx, t, c);
    if (c.title === 'MOTION') motionCard(ctx, t, c);
    if (c.title === 'SOUND') soundCard(ctx, t, c);
    ctx.restore();
  }

  text(ctx, 'Every cut, click and chord reads the same cue sheet.', 90, 1300, {
    size: 36, family: F.text, color: C.ink, alpha: 0.72 * outExpo(seg(t, 2.8, 3.4)),
  });
  cueStrip(ctx, t, globalT);
  footer(ctx, t, { text: 'ONE CUE SHEET DRIVES PICTURE, MOTION AND MIX', page: '03 / 06', dark: false, alpha: outExpo(seg(t, 2.9, 3.5)) });
}
