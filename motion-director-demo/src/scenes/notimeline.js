// 3–7 s · The old way: a timeline that refuses to exist.
import { W, H, C, F } from '../data.js';
import {
  bg, text, label, card, rule, wordsMasked, cross, check, pill, footer,
  outExpo, outCubic, outBack, seg, clamp, lerp, setFont,
} from '../draw.js';

function timelineCard(ctx, t) {
  const x = 90, y = 720, w = 900, h = 250;
  const enter = outExpo(seg(t, 0.2, 0.75));
  const kill = outCubic(seg(t, 1.55, 1.95));
  if (kill >= 1) return;

  ctx.save();
  ctx.globalAlpha = enter * (1 - kill);
  ctx.translate(0, (1 - enter) * 50 - kill * 26);
  card(ctx, x, y, w, h, 24, 'rgba(10,12,15,0.055)', { stroke: C.inkLine });

  setFont(ctx, 24, F.monoBold);
  ctx.fillStyle = C.ink;
  ctx.globalAlpha = 0.85 * enter * (1 - kill);
  ctx.fillText('untitled-project.aep', x + 36, y + 56);
  ctx.globalAlpha = enter * (1 - kill);
  label(ctx, '47 TRACKS', x + w - 36, y + 56, { color: C.ink, alpha: 0.45, size: 20, align: 'right', track: 3 });

  const tracks = [
    [0.62, C.ink],
    [0.38, C.ember],
    [0.5, C.ink],
  ];
  for (let i = 0; i < tracks.length; i++) {
    const ty = y + 92 + i * 38;
    ctx.fillStyle = 'rgba(10,12,15,0.08)';
    ctx.fillRect(x + 36, ty, w - 72, 24);
    ctx.globalAlpha = 0.55 * enter * (1 - kill);
    ctx.fillStyle = tracks[i][1];
    ctx.fillRect(x + 36 + (i * 90), ty, (w - 72) * tracks[i][0] * 0.7, 24);
    ctx.globalAlpha = enter * (1 - kill);
  }

  // playhead sweeping the (very important) empty timeline
  const ph = x + 36 + (w - 72) * ((t * 0.35) % 1);
  ctx.strokeStyle = C.ember;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ph, y + 84); ctx.lineTo(ph, y + h - 20); ctx.stroke();
  ctx.restore();

  cross(ctx, x + w - 92, y - 30, 54, seg(t, 1.35, 1.8), C.ember, 7);
}

function codeCard(ctx, t) {
  const x = 90, y = 1010, w = 900, h = 250;
  const enter = outBack(seg(t, 2.2, 2.75), 1.9);
  if (enter <= 0) return;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(lerp(0.92, 1, clamp(enter)), lerp(0.92, 1, clamp(enter)));
  ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.globalAlpha = clamp(enter * 1.3);
  card(ctx, x, y, w, h, 24, C.ink, { shadow: 40 });
  label(ctx, '● render.mjs', x + 36, y + 54, { color: C.lime, size: 22, track: 2 });

  const lines = [
    ['for (let f = 0; f < 780; f++)', 0.4],
    ['  draw(f / 30);', 0.62],
  ];
  for (let i = 0; i < lines.length; i++) {
    text(ctx, lines[i][0], x + 36, y + 118 + i * 52, {
      size: 30, family: F.mono, color: C.cream, alpha: 0.9 * clamp(enter),
    });
  }
  check(ctx, x + w - 82, y + h - 82, 46, seg(t, 2.55, 2.95), C.lime, 6);
  ctx.restore();
}

export function draw(ctx, t) {
  bg(ctx, C.cream);
  label(ctx, '01 — THE OLD WAY', 90, 340, { color: C.ember, alpha: outExpo(seg(t, 0.05, 0.5)), size: 22, track: 6 });

  const strike1 = outCubic(seg(t, 1.35, 1.75));
  wordsMasked(ctx, 'No timeline.', 90, 500, {
    size: 122, family: F.display, align: 'left', color: C.ink, t, start: 0.12, stagger: 0.07, dur: 0.55, track: -2,
  });
  if (strike1 > 0) {
    const w = 660 * strike1;
    ctx.fillStyle = C.ember;
    ctx.fillRect(92, 468, w, 12);
  }

  wordsMasked(ctx, 'No keyframes.', 90, 660, {
    size: 122, family: F.display, align: 'left', color: C.ink, t, start: 0.55, stagger: 0.07, dur: 0.55, track: -2,
  });
  const strike2 = outCubic(seg(t, 1.9, 2.3));
  if (strike2 > 0) {
    ctx.fillStyle = C.ember;
    ctx.fillRect(92, 628, 720 * strike2, 12);
  }

  timelineCard(ctx, t);
  codeCard(ctx, t);

  const note = outExpo(seg(t, 2.8, 3.3));
  text(ctx, 'Just code that draws every single frame.', 90, 1360, {
    size: 42, family: F.text, color: C.ink, alpha: 0.75 * note,
  });
  pill(ctx, '6 SCENES · 1 CANVAS · 0 PLUGINS', 90, 1412, {
    color: C.ink, border: null, fill: 'rgba(10,12,15,0.07)', size: 20, height: 46, alpha: note,
  });
  footer(ctx, t, { text: 'THE OLD WAY: TIMELINE, KEYFRAMES, PLUGINS', page: '01 / 06', dark: false, alpha: outExpo(seg(t, 2.7, 3.2)) });
}
