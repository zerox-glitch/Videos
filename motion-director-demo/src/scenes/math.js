// 7–12 s · Every frame is a function of time. Show the actual curve we render with.
import { W, H, C, F } from '../data.js';
import {
  bg, text, label, hairlineGrid, card, rule, wordsMasked, cornerMarks, footer,
  outExpo, outCubic, seg, clamp, lerp, sine,
} from '../draw.js';

const CARD = { x: 90, y: 690, w: 900, h: 540 };
const P = {
  x0: CARD.x + 84,
  x1: CARD.x + CARD.w - 60,
  y0: CARD.y + 118,
  y1: CARD.y + CARD.h - 96,
};

export function draw(ctx, t) {
  bg(ctx, C.ink);
  hairlineGrid(ctx, { alpha: 0.045 });

  label(ctx, '02 — DETERMINISM', 90, 340, { color: C.lime, alpha: outExpo(seg(t, 0.03, 0.45)), size: 22, track: 6 });

  wordsMasked(ctx, 'Every frame', 90, 500, {
    size: 128, family: F.display, align: 'left', color: C.cream, t, start: 0.08, stagger: 0.06, dur: 0.5, track: -2,
  });
  const line2 = seg(t, 0.22, 0.7);
  wordsMasked(ctx, 'is just math.', 90, 636, {
    size: 128, family: F.display, align: 'left', color: C.cream, t, start: 0.22, stagger: 0.055, dur: 0.5, track: -2,
  });
  // accent the keyword once it has landed
  const hi = outCubic(seg(t, 0.75, 1.05));
  if (hi > 0) {
    ctx.fillStyle = C.lime;
    ctx.fillRect(90 - 8, 636 + 14, 260 * hi, 8);
  }

  const enter = outExpo(seg(t, 0.35, 0.95));
  ctx.save();
  ctx.globalAlpha = enter;
  ctx.translate(0, (1 - enter) * 40);
  card(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 26, 'rgba(242,238,228,0.035)', { stroke: C.line });
  label(ctx, 'EASE OUT CUBIC', CARD.x + 44, CARD.y + 56, { color: C.lime, size: 21, track: 4 });
  text(ctx, 'ease(u) = 1 − (1 − u)³', CARD.x + CARD.w - 44, CARD.y + 58, {
    size: 22, family: F.mono, color: C.muted, align: 'right',
  });
  ctx.restore();

  // axes
  ctx.save();
  ctx.globalAlpha = enter * 0.9;
  ctx.strokeStyle = 'rgba(242,238,228,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 4; i++) {
    const y = lerp(P.y1, P.y0, i / 4);
    ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(P.x1, y); ctx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const x = lerp(P.x0, P.x1, i / 4);
    ctx.beginPath(); ctx.moveTo(x, P.y0); ctx.lineTo(x, P.y1); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(242,238,228,0.4)';
  ctx.beginPath(); ctx.moveTo(P.x0, P.y1); ctx.lineTo(P.x1, P.y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(P.x0, P.y0); ctx.lineTo(P.x0, P.y1); ctx.stroke();
  ctx.restore();

  const X = u => lerp(P.x0, P.x1, u);
  const Y = v => lerp(P.y1, P.y0, v);

  // linear reference
  const lin = seg(t, 0.9, 1.6);
  if (lin > 0) {
    ctx.save();
    ctx.globalAlpha = enter * 0.75;
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = 'rgba(139,147,158,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(lin), Y(lin));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    text(ctx, 'linear', X(0.72) + 14, Y(0.72) - 10, {
      size: 22, family: F.mono, color: C.muted, alpha: enter * clamp(lin * 2 - 1),
    });
  }

  // the curve we actually animate with
  const reveal = outCubic(seg(t, 1.05, 3.15));
  if (reveal > 0) {
    ctx.save();
    ctx.strokeStyle = C.lime;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(199,255,62,0.55)';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * reveal;
      const v = 1 - Math.pow(1 - u, 3);
      const px = X(u), py = Y(v);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    const u = reveal;
    const v = 1 - Math.pow(1 - u, 3);
    const px = X(u), py = Y(v);

    // projection lines
    ctx.save();
    ctx.globalAlpha = enter * 0.55;
    ctx.setLineDash([5, 8]);
    ctx.strokeStyle = C.lime;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, P.y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(P.x0, py); ctx.stroke();
    ctx.restore();

    // travelling dot
    ctx.save();
    ctx.shadowColor = 'rgba(199,255,62,0.9)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = C.cream;
    ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (reveal >= 1) {
      for (let k = 0; k < 3; k++) {
        const pp = ((t - 3.15) / 1.1 - k * 0.22);
        if (pp > 0 && pp < 1) {
          ctx.save();
          ctx.globalAlpha = (1 - pp) * 0.5;
          ctx.strokeStyle = C.lime;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px, py, 12 + pp * 70, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
      }
    }

    // live readout
    const rx = CARD.x + 44;
    const ry = CARD.y + CARD.h - 46;
    text(ctx, `u = ${u.toFixed(2)}   ease = ${v.toFixed(2)}`, rx, ry, {
      size: 24, family: F.monoBold, color: C.lime, alpha: enter,
    });
  } else {
    text(ctx, 'u = 0.00   ease = 0.00', CARD.x + 44, CARD.y + CARD.h - 46, {
      size: 24, family: F.monoBold, color: C.lime, alpha: enter * 0.5,
    });
  }

  // axis labels
  text(ctx, '0', P.x0, P.y1 + 34, { size: 20, family: F.mono, color: C.muted, align: 'center', alpha: enter });
  text(ctx, '1', P.x1, P.y1 + 34, { size: 20, family: F.mono, color: C.muted, align: 'center', alpha: enter });
  text(ctx, 't', (P.x0 + P.x1) / 2, P.y1 + 34, { size: 20, family: F.mono, color: C.muted, align: 'center', alpha: enter * 0.7 });

  text(ctx, 'No clocks. No prior frame. No surprises.', 90, 1330, {
    size: 40, family: F.text, color: C.cream, alpha: 0.78 * outExpo(seg(t, 2.3, 2.9)),
  });
  const fr = Math.round(reveal * 780);
  label(ctx, `FRAME ${String(fr).padStart(3, '0')} / 780`, 90, 1412, {
    color: C.lime, size: 22, alpha: outExpo(seg(t, 2.4, 3.0)), track: 3,
  });
  label(ctx, 'f(t) → identical pixels', W - 90, 1412, {
    color: C.muted, size: 22, align: 'right', alpha: outExpo(seg(t, 2.6, 3.1)), track: 2,
  });

  cornerMarks(ctx, { color: 'rgba(242,238,228,0.18)', alpha: outExpo(seg(t, 0.2, 0.8)) });
  footer(ctx, t, { text: 'SEEDED · NO CLOCKS · NO PRIOR-FRAME STATE', page: '02 / 06', alpha: outExpo(seg(t, 2.6, 3.2)) });
}
