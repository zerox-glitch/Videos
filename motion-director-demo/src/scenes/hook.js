// 0–3 s · Hook: the claim, a spec sheet and a render ticking to 100 %.
import { W, H, C, F } from '../data.js';
import {
  bg, text, label, hairlineGrid, cornerMarks, card, rule, wordsMasked, footer,
  outExpo, outCubic, outBack, seg, clamp, lerp, sine,
} from '../draw.js';

const ROWS = [
  ['scenes', '6'],
  ['fps', '30'],
  ['duration', '26.0 s'],
  ['stock footage', '0'],
];

export function draw(ctx, t) {
  bg(ctx, C.ink);
  hairlineGrid(ctx, { alpha: 0.045 });

  // header
  const head = outExpo(seg(t, 0.05, 0.6));
  label(ctx, 'CASE STUDY / 001', 90, 340, { color: C.lime, alpha: head, size: 22, track: 6 });
  label(ctx, '9:16 · 1080×1920', W - 90, 340, { color: C.muted, alpha: head, size: 22, align: 'right', track: 3 });

  // "26" — the number lands first
  const p26 = outBack(seg(t, 0.08, 0.62), 1.4);
  ctx.save();
  ctx.translate(90, 700);
  ctx.scale(lerp(0.82, 1, clamp(p26)), lerp(0.82, 1, clamp(p26)));
  text(ctx, '26', 0, 0, { size: 300, family: F.display, color: C.lime, alpha: clamp(p26 * 1.4), track: -6 });
  ctx.restore();

  // "SECONDS."
  wordsMasked(ctx, 'SECONDS.', 90, 830, {
    size: 126, family: F.display, align: 'left', color: C.cream,
    t, start: 0.34, stagger: 0.028, dur: 0.5, track: 4,
  });
  text(ctx, 'A motion graphic made entirely in code.', 90, 912, {
    size: 42, family: F.text, color: C.cream, alpha: 0.72 * outExpo(seg(t, 0.9, 1.4)),
  });

  // spec sheet card
  const cp = outExpo(seg(t, 1.0, 1.7));
  const cx = 90, cy = 1000 + (1 - cp) * 60, cw = 900, ch = 316;
  ctx.save();
  ctx.globalAlpha = cp;
  card(ctx, cx, cy, cw, ch, 26, 'rgba(242,238,228,0.045)', { stroke: C.line });
  label(ctx, '● render.mjs', cx + 40, cy + 62, { color: C.lime, size: 22, track: 2 });
  label(ctx, 'OUTPUT', cx + cw - 40, cy + 62, { color: C.muted, size: 20, align: 'right', track: 4 });

  for (let i = 0; i < ROWS.length; i++) {
    const y = cy + 116 + i * 38;
    label(ctx, ROWS[i][0], cx + 40, y, { color: C.cream, alpha: 0.55, size: 22, track: 1 });
    text(ctx, ROWS[i][1], cx + cw - 40, y + 1, {
      size: 24, family: F.monoBold, color: C.cream, align: 'right', track: 1,
    });
  }

  // progress bar — a render that finishes inside the hook
  const prog = outCubic(seg(t, 1.15, 2.62));
  const pct = Math.round(prog * 100);
  const bx = cx + 40, by = cy + ch - 46, bw = cw - 180, bh = 10;
  ctx.fillStyle = 'rgba(242,238,228,0.12)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = C.lime;
  ctx.fillRect(bx, by, bw * prog, bh);
  if (prog > 0 && prog < 1) {
    ctx.save();
    ctx.shadowColor = 'rgba(199,255,62,0.8)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = C.lime;
    ctx.fillRect(bx + bw * prog - 3, by - 6, 6, bh + 12);
    ctx.restore();
  }
  label(ctx, `${pct}%`, cx + cw - 40, cy + ch - 40, {
    color: prog >= 1 ? C.lime : C.cream, size: 22, align: 'right', track: 2,
  });
  ctx.restore();

  // footer
  const fp = outExpo(seg(t, 1.8, 2.3));
  label(ctx, 'no footage · no stock · no templates', 90, 1400, { color: C.muted, alpha: 0.85 * fp, size: 20, track: 3 });

  // tiny pulse so the frame is never fully at rest
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.7);
  label(ctx, '●', W - 96, 1400, { color: C.lime, alpha: (0.35 + 0.5 * pulse) * fp, size: 20, align: 'right' });

  cornerMarks(ctx, { color: 'rgba(242,238,228,0.2)', alpha: fp });
  footer(ctx, t, { text: 'WRITTEN, ANIMATED & MIXED IN CODE', page: '00 / 06', alpha: outExpo(seg(t, 2.0, 2.5)) });
}
