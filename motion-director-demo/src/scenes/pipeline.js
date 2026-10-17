// 18–22 s · The pipeline, four moves, one command.
import { W, H, C, F } from '../data.js';
import {
  bg, text, label, card, wordsMasked, check, pill, roundRect, hairlineGrid, cornerMarks, footer,
  outExpo, outCubic, outBack, seg, clamp, lerp, setFont,
} from '../draw.js';

const ROWS = [
  ['01', 'Brief & script', 'story approved'],
  ['02', 'Beats & boards', '780 frames locked'],
  ['03', 'Code-rendered', 'canvas → ffmpeg'],
  ['04', 'Mix & master', '−14 LUFS · −1.5 dBTP'],
];

const CMD = '$ node src/render.mjs --from 0 --to 26';

export function draw(ctx, t) {
  bg(ctx, C.ink);
  hairlineGrid(ctx, { alpha: 0.045 });

  label(ctx, '04 — PIPELINE', 90, 340, { color: C.lime, alpha: outExpo(seg(t, 0.03, 0.45)), size: 22, track: 6 });

  wordsMasked(ctx, 'From brief to MP4.', 90, 490, {
    size: 112, family: F.display, align: 'left', color: C.cream, t, start: 0.06, stagger: 0.07, dur: 0.55, track: -2,
  });

  for (let i = 0; i < ROWS.length; i++) {
    const r = ROWS[i];
    const at = 0.28 + i * 0.36;
    const p = outExpo(seg(t, at, at + 0.55));
    if (p <= 0) continue;
    const x = 90, w = 900, h = 112;
    const y = 632 + i * 134;

    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate((1 - p) * -40, 0);
    card(ctx, x, y, w, h, 20, 'rgba(242,238,228,0.04)', { stroke: C.line });
    // lime spine grows in
    roundRect(ctx, x, y + 16, 6 + 2 * p, h - 32, 4);
    ctx.fillStyle = C.lime;
    ctx.fillRect(x, y + 16, 6, h - 32);

    label(ctx, r[0], x + 44, y + 68, { color: C.lime, size: 24, track: 2 });
    text(ctx, r[1], x + 118, y + 70, {
      size: 44, family: F.displayMed, color: C.cream, alpha: 0.95,
    });
    label(ctx, r[2], x + w - 110, y + 68, { color: C.muted, size: 20, align: 'right', track: 1 });
    check(ctx, x + w - 56, y + h / 2, 34, seg(t, at + 0.35, at + 0.75), C.lime, 5);
    ctx.restore();
  }

  // command line
  const cmdP = seg(t, 1.85, 2.75);
  const shown = CMD.slice(0, Math.round(cmdP * CMD.length));
  const cx = 90, cy = 1238, cw = 900, ch = 92;
  const cmdIn = outExpo(seg(t, 1.72, 2.0));
  ctx.save();
  ctx.globalAlpha = cmdIn;
  ctx.translate(0, (1 - cmdIn) * 24);
  card(ctx, cx, cy, cw, ch, 18, 'rgba(199,255,62,0.06)', { stroke: 'rgba(199,255,62,0.28)' });
  setFont(ctx, 26, F.mono);
  ctx.fillStyle = C.lime;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(shown, cx + 32, cy + 57);
  const cwText = ctx.measureText(shown).width;
  const blink = Math.floor(t * 2.2) % 2 === 0;
  if (blink) {
    ctx.fillStyle = C.cream;
    ctx.fillRect(cx + 32 + cwText + 4, cy + 34, 12, 30);
  }

  ctx.restore();

  const badge = outBack(seg(t, 2.45, 2.95), 1.8);
  if (badge > 0) {
    ctx.save();
    ctx.translate(cx + cw, 1184);
    ctx.scale(badge, badge);
    ctx.translate(-(cx + cw), -1184);
    pill(ctx, '26.00 s · 780 frames · ready', cx + cw, 1162, {
      color: C.ink, fill: C.lime, border: null, size: 19, height: 44, align: 'right',
    });
    ctx.restore();
  }

  const outP = outExpo(seg(t, 3.0, 3.5));
  text(ctx, '→  renders/final/Demo v1.mp4', 90, 1392, {
    size: 24, family: F.mono, color: C.lime, alpha: 0.75 * outP,
  });
  text(ctx, '6 scenes · 780 frames · 1080×1920', W - 90, 1392, {
    size: 22, family: F.mono, color: C.muted, align: 'right', alpha: outP,
  });

  cornerMarks(ctx, { color: 'rgba(242,238,228,0.2)', alpha: outExpo(seg(t, 0.2, 0.8)) });
  footer(ctx, t, { text: 'ONE DETERMINISTIC PASS · NO AFTER EFFECTS', page: '04 / 06', alpha: outExpo(seg(t, 3.0, 3.5)) });
}
