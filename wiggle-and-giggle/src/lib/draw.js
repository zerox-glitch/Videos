// Small 2D drawing kit for the Wiggle & Giggle cartoon.
export const TAU = Math.PI * 2;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const easeOutElastic = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;
};
export const easeOutBounce = (t) => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
  if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
  t -= 2.625 / d1;
  return n1 * t * t + 0.984375;
};
export const wobble = (t, f, ph = 0) => Math.sin(t * f * TAU + ph);

/* ------------------------------------------------------------------ paths */
export function rrPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function fillRR(ctx, x, y, w, h, r, fill) {
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function ellipsePath(ctx, cx, cy, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, TAU);
}

export function fillEllipse(ctx, cx, cy, rx, ry, fill, rot = 0) {
  ellipsePath(ctx, cx, cy, rx, ry, rot);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function fillCircle(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.abs(r), 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeCircle(ctx, cx, cy, r, color, w) {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.abs(r), 0, TAU);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

/* vertical gradient helper: stops = [[0,'#fff'],[1,'#000']] */
export function vgrad(ctx, x, y0, y1, stops) {
  const g = ctx.createLinearGradient(x, y0, x, y1);
  for (const [p, c] of stops) g.addColorStop(clamp(p), c);
  return g;
}

export function rgrad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [p, c] of stops) g.addColorStop(clamp(p), c);
  return g;
}

/* chunky limb: dark rim then colour then highlight */
export function limb(ctx, x1, y1, x2, y2, w, fill, rim) {
  ctx.lineCap = 'round';
  if (rim) {
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = rim;
    ctx.lineWidth = w + 7;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}

/* soft contact shadow */
export function contactShadow(ctx, x, y, rx, ry, a = 0.16) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(90,60,40,${a})`);
  g.addColorStop(0.62, `rgba(90,60,40,${a * 0.55})`);
  g.addColorStop(1, 'rgba(90,60,40,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/* five-point star */
export function starPath(ctx, cx, cy, r, inner = 0.45, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * TAU;
    const rr = i % 2 ? r * inner : r;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function notePath(ctx, x, y, s, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 6.5, -0.35, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -1);
  ctx.quadraticCurveTo(9, -34, 10, -40);
  ctx.quadraticCurveTo(22, -44, 26, -36);
  ctx.quadraticCurveTo(18, -36, 12, -26);
  ctx.lineTo(12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function heartPath(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-16, -2, -14, -18, -4, -18);
  ctx.bezierCurveTo(0, -18, 0, -14, 0, -12);
  ctx.bezierCurveTo(0, -14, 0, -18, 4, -18);
  ctx.bezierCurveTo(14, -18, 16, -2, 0, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function cloudPath(ctx, x, y, s, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.arc(-34, 6, 24, 0, TAU);
  ctx.arc(-6, -8, 32, 0, TAU);
  ctx.arc(30, 4, 26, 0, TAU);
  ctx.arc(8, 14, 26, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* chunky text with a soft drop shadow */
export function drawText(ctx, text, x, y, {
  font = '800 120px Baloo2', fill = '#fff', stroke = null, lw = 0,
  align = 'center', baseline = 'middle', alpha = 1, shadow = null, letter = 0,
} = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetY = shadow.y || 0;
  }
  if (letter) {
    // manual tracking
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + letter * (chars.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    ctx.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      if (stroke) {
        ctx.lineWidth = lw;
        ctx.strokeStyle = stroke;
        ctx.lineJoin = 'round';
        ctx.strokeText(chars[i], cx, y);
      }
      ctx.fillStyle = fill;
      ctx.fillText(chars[i], cx, y);
      cx += widths[i] + letter;
    }
  } else {
    if (stroke) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

export function sparklePath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.closePath();
}
