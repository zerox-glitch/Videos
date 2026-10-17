// 22–26 s · End card: the skill lockup, contact line and a closing marquee.
import { W, H, C, F } from '../data.js';
import {
  bg, text, label, chars, pill, rule, footer, outExpo, outCubic, outBack,
  seg, clamp, lerp, setFont,
} from '../draw.js';

function burst(ctx, cx, cy, t) {
  const p = outExpo(seg(t, 0.05, 0.8));
  if (p <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.22);
  ctx.scale(p, p);
  ctx.fillStyle = C.ink;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(-7, -44);
    ctx.lineTo(7, -44);
    ctx.lineTo(3, -94);
    ctx.lineTo(-3, -94);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function playButton(ctx, cx, cy, p) {
  const e = outBack(clamp(p), 2.0);
  if (e <= 0) return;
  const s = 68;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(e, e);
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.3);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.13, -s * 0.2);
  ctx.lineTo(s * 0.22, 0);
  ctx.lineTo(-s * 0.13, s * 0.2);
  ctx.closePath();
  ctx.fillStyle = C.lime;
  ctx.fill();
  ctx.restore();
}

function marquee(ctx, t) {
  const str = 'MOTION VIDEO DIRECTOR · PLAN · ANIMATE · EDIT · SOUND DESIGN · RENDER LOCALLY ';
  setFont(ctx, 26, F.monoBold);
  ctx.letterSpacing = '3px';
  const unit = ctx.measureText(str).width;
  const speed = 62;
  const offset = (t * speed) % unit;
  const y = 1720;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y - 34, W, 62);
  ctx.clip();
  for (let i = -1; i < Math.ceil(W / unit) + 1; i++) {
    ctx.fillStyle = C.ink;
    ctx.globalAlpha = 0.85;
    ctx.fillText(str, i * unit - offset, y);
  }
  ctx.restore();
  ctx.letterSpacing = '0px';
}

export function draw(ctx, t) {
  bg(ctx, C.lime);

  // faint registration grid on lime
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1;
  for (let x = 90; x < W; x += 90) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 90) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  burst(ctx, W - 168, 470, t);

  const badge = outExpo(seg(t, 0.0, 0.45));
  pill(ctx, 'MOTION VIDEO DIRECTOR · v3.5.2', 90, 330, {
    color: C.ink, border: 'rgba(10,12,15,0.35)', size: 20, height: 48, alpha: badge,
  });

  // tracking-collapse lockup
  const e1 = outExpo(seg(t, 0.1, 0.9));
  chars(ctx, 'MOTION VIDEO', 90, 640, {
    size: 112, family: F.display, color: C.ink, track: lerp(26, 0, e1),
  }, i => {
    const p = outExpo(seg(t, 0.1 + i * 0.018, 0.58 + i * 0.018));
    return { alpha: clamp(p * 1.3), dy: (1 - p) * 46 };
  });

  const e2 = outExpo(seg(t, 0.26, 1.05));
  const dirY = 790;
  chars(ctx, 'DIRECTOR.', 102, dirY + 10, {
    size: 118, family: F.display, color: 'rgba(242,238,228,0.92)', track: lerp(30, 2, e2),
  }, i => {
    const p = outExpo(seg(t, 0.26 + i * 0.018, 0.76 + i * 0.018));
    return { alpha: clamp(p * 1.3), dy: (1 - p) * 46 };
  });
  chars(ctx, 'DIRECTOR.', 90, dirY, {
    size: 118, family: F.display, color: C.ink, track: lerp(30, 2, e2),
  }, i => {
    const p = outExpo(seg(t, 0.26 + i * 0.018, 0.76 + i * 0.018));
    return { alpha: clamp(p * 1.3), dy: (1 - p) * 46 };
  });

  const line = outCubic(seg(t, 0.9, 1.35));
  if (line > 0) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(90, 880, 900 * line, 2);
  }

  text(ctx, 'Plan, animate, edit and sound-design a film', 90, 962, {
    size: 37, family: F.text, color: C.ink, alpha: 0.82 * outExpo(seg(t, 1.1, 1.65)),
  });
  text(ctx, 'with a coding agent. Rendered locally.', 90, 1012, {
    size: 37, family: F.text, color: C.ink, alpha: 0.82 * outExpo(seg(t, 1.2, 1.75)),
  });

  pill(ctx, 'github.com/Miftahul-Islam-Efaz/Motion-graphics-skill', 90, 1082, {
    color: C.ink, border: 'rgba(10,12,15,0.45)', size: 19, height: 50,
    alpha: outExpo(seg(t, 1.4, 1.9)),
  });
  pill(ctx, 'CLAUDE CODE · CODEX · CURSOR', 90, 1150, {
    color: C.lime, fill: 'rgba(10,12,15,0.92)', border: null, size: 19, height: 50,
    alpha: outExpo(seg(t, 1.55, 2.05)),
  });

  const pp = seg(t, 1.7, 2.15);
  if (pp > 0) {
    playButton(ctx, 132, 1276, pp);
    label(ctx, 'PLAY IT AGAIN', 190, 1290, {
      color: C.ink, size: 19, alpha: outExpo(seg(t, 1.95, 2.35)), track: 4,
    });
    text(ctx, '26 s · 780 frames · one file', 190, 1322, {
      size: 23, family: F.text, color: C.ink, alpha: 0.6 * outExpo(seg(t, 2.05, 2.45)),
    });
  }

  rule(ctx, 90, 1382, W - 90, 'rgba(10,12,15,0.28)', 1);
  label(ctx, 'zerox-glitch / Videos', 90, 1428, {
    color: C.ink, size: 20, alpha: 0.8, track: 2,
  });
  label(ctx, 'DEMO · 26.00 s · 780 FRAMES', W - 90, 1428, {
    color: C.ink, size: 20, align: 'right', alpha: 0.8, track: 2,
  });

  // scene strip: six tiles echoing the actual palette order
  const tiles = [
    ['#0A0C0F', '01'], ['#F2EEE4', '02'], ['#0A0C0F', '03'],
    ['#F2EEE4', '04'], ['#0A0C0F', '05'], ['#C7FF3E', '06'],
  ];
  const strip = outExpo(seg(t, 1.8, 2.5));
  if (strip > 0) {
    ctx.save();
    ctx.globalAlpha = strip;
    label(ctx, 'SIX SCENES', 90, 1482, { color: C.ink, size: 18, alpha: 0.55, track: 4 });
    label(ctx, 'ONE CANVAS', W - 90, 1482, { color: C.ink, size: 18, align: 'right', alpha: 0.55, track: 4 });
    const tw = 138, th = 84, gap = 12;
    for (let i = 0; i < tiles.length; i++) {
      const [color, num] = tiles[i];
      const a = outExpo(seg(t, 1.86 + i * 0.07, 2.1 + i * 0.07));
      const x = 90 + i * (tw + gap);
      const y = 1504 + (1 - a) * 18;
      ctx.globalAlpha = strip * a;
      ctx.beginPath();
      ctx.roundRect(x, y, tw, th, 10);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,12,15,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      label(ctx, num, x + 14, y + 26, {
        color: color === '#0A0C0F' ? C.lime : C.ink, size: 15, track: 2, alpha: 0.85,
      });
    }
    ctx.restore();
  }

  rule(ctx, 0, 1650, W, 'rgba(10,12,15,0.2)', 1);
  rule(ctx, 0, 1786, W, 'rgba(10,12,15,0.2)', 1);
  if (t > 2.0) marquee(ctx, t - 2.0);
}
