// The playroom: wall, arched window, floor, furniture and gentle life.
import { W, H, P } from './data.js';
import {
  TAU, clamp, lerp, seg, smooth, easeOutCubic, easeOutBack, easeInOutSine,
  rrPath, fillRR, fillEllipse, fillCircle, strokeCircle, vgrad, rgrad,
  cloudPath, drawText, starPath, contactShadow, fillEllipse as fe,
} from './lib/draw.js';

const FLOOR = 770;
const WIN = { cx: 1395, cy: 322, w: 438, h: 430 };

function archPath(ctx, cx, cy, w, h) {
  const x = cx - w / 2, y = cy - h / 2, r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(cx, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function drawBunting(ctx, t) {
  const cols = [P.coral, P.yellow, P.mint, P.lavender, P.blue];
  for (let row = 0; row < 2; row++) {
    const y0 = 34 + row * 26;
    const sag = 74 + row * 18;
    ctx.strokeStyle = 'rgba(120,95,80,0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-30, y0);
    ctx.quadraticCurveTo(W / 2, y0 + sag, W + 30, y0 + 4);
    ctx.stroke();
    const n = 13;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const x = lerp(-30, W + 30, u);
      const y = lerp(y0, y0 + sag, 2 * u * (1 - u));
      const sway = Math.sin(t * 1.6 + i * 0.7 + row) * 0.05;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sway);
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(26, 0);
      ctx.lineTo(0, 62);
      ctx.closePath();
      ctx.fillStyle = cols[(i + row) % cols.length];
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.moveTo(-26, 0); ctx.lineTo(0, 0); ctx.lineTo(0, 62);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawSun(ctx, t, rise) {
  const sunY = WIN.cy + lerp(150, -96, rise);
  const sunX = WIN.cx + 26;
  const r = 62;
  ctx.save();
  // glow
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sunX, sunY, r * 0.4, sunX, sunY, r * 3.1);
  g.addColorStop(0, 'rgba(255,226,140,0.5)');
  g.addColorStop(0.4, 'rgba(255,206,110,0.2)');
  g.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sunX, sunY, r * 3.1, 0, TAU); ctx.fill();
  ctx.restore();

  // rays
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(t * 0.12);
  ctx.fillStyle = 'rgba(255,214,96,0.85)';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-9, -r - 8);
    ctx.lineTo(0, -r - 30 - 6 * Math.sin(t * 2 + i));
    ctx.lineTo(9, -r - 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // body
  ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, TAU);
  ctx.fillStyle = vgrad(ctx, sunX, sunY - r, sunY + r, [[0, '#FFE066'], [1, P.sunDeep]]);
  ctx.fill();

  // face
  const blink = Math.max(0, Math.sin(t * 1.7)) > 0.985 ? 0.1 : 1;
  ctx.fillStyle = '#8A5A1E';
  fillEllipse(ctx, sunX - 20, sunY - 10, 6.5, 8.5 * blink, '#8A5A1E');
  fillEllipse(ctx, sunX + 20, sunY - 10, 6.5, 8.5 * blink, '#8A5A1E');
  ctx.strokeStyle = '#8A5A1E';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(sunX, sunY + 8, 20, 0.28 * Math.PI, 0.72 * Math.PI);
  ctx.stroke();
  fillEllipse(ctx, sunX - 36, sunY + 10, 10, 6.5, 'rgba(255,140,120,0.5)');
  fillEllipse(ctx, sunX + 36, sunY + 10, 10, 6.5, 'rgba(255,140,120,0.5)');
}

function drawWindow(ctx, t, rise) {
  const { cx, cy, w, h } = WIN;
  ctx.save();
  archPath(ctx, cx, cy, w, h);
  ctx.clip();

  // sky
  ctx.fillStyle = vgrad(ctx, 0, cy - h / 2, cy + h / 2, [
    [0, P.skyTop], [0.55, '#A8E4F8'], [1, P.skyBot],
  ]);
  ctx.fillRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8);

  // clouds
  const clouds = [[0.2, 0.3, 1.0, 8], [0.62, 0.16, 0.72, 5], [0.42, 0.63, 0.55, 11]];
  for (const [ux, uy, s, sp] of clouds) {
    const x = cx - w / 2 + ((ux * w + t * sp) % (w + 160)) - 80;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    cloudPath(ctx, x, cy - h / 2 + uy * h, s * 1.05);
  }

  // sun
  drawSun(ctx, t, rise);

  // hills
  ctx.fillStyle = 'rgba(150,214,190,0.85)';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h / 2);
  ctx.quadraticCurveTo(cx - w * 0.18, cy + h * 0.2, cx + w * 0.1, cy + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(111,203,143,0.9)';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.05, cy + h / 2);
  ctx.quadraticCurveTo(cx + w * 0.22, cy + h * 0.26, cx + w / 2, cy + h / 2);
  ctx.closePath();
  ctx.fill();

  // birds
  for (let i = 0; i < 3; i++) {
    const bx = cx - w / 2 + ((i * 0.31 + 0.12) * w + t * (11 + i * 4)) % (w + 120) - 60;
    const by = cy - h * 0.24 + Math.sin(t * 1.4 + i) * 8 + i * 22;
    const flap = Math.sin(t * 9 + i * 2) * 4;
    ctx.strokeStyle = 'rgba(70,110,130,0.55)';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - 10, by + flap * 0.3);
    ctx.quadraticCurveTo(bx - 4, by - 5 - flap, bx, by);
    ctx.quadraticCurveTo(bx + 4, by - 5 - flap, bx + 10, by + flap * 0.3);
    ctx.stroke();
  }

  // window sheen
  const sheen = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 3, cy + h / 2);
  sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.restore();

  // frame
  ctx.save();
  ctx.lineJoin = 'round';
  archPath(ctx, cx, cy, w, h);
  ctx.lineWidth = 26;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(206,153,106,0.55)';
  ctx.stroke();
  archPath(ctx, cx, cy, w - 26, h - 26);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
  ctx.restore();

  // mullions
  ctx.save();
  archPath(ctx, cx, cy, w, h);
  ctx.clip();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx, cy + h / 2);
  ctx.moveTo(cx - w / 2, cy + h * 0.08); ctx.lineTo(cx + w / 2, cy + h * 0.08);
  ctx.stroke();
  ctx.restore();
}

function drawShelf(ctx, t) {
  const x = 150, y = 250, w = 330;
  ctx.fillStyle = 'rgba(120,80,55,0.12)';
  ctx.fillRect(x + 12, y + 26, w, 16);
  fillRR(ctx, x, y, w, 22, 11, '#FFFFFF');
  fillRR(ctx, x, y + 11, w, 8, 4, 'rgba(206,153,106,0.35)');
  // brackets
  fillRR(ctx, x + 26, y + 22, 16, 34, 6, '#EFD6B8');
  fillRR(ctx, x + w - 42, y + 22, 16, 34, 6, '#EFD6B8');
  // toys on the shelf
  // teddy
  const sway = Math.sin(t * 0.9) * 0.03;
  ctx.save();
  ctx.translate(x + 62, y - 2);
  ctx.rotate(sway);
  fillCircle(ctx, -14, -46, 12, '#C98B5A');
  fillCircle(ctx, 14, -46, 12, '#C98B5A');
  fillCircle(ctx, 0, -30, 26, '#DDA26F');
  fillCircle(ctx, -9, -34, 4.5, '#4A3B32');
  fillCircle(ctx, 9, -34, 4.5, '#4A3B32');
  fillEllipse(ctx, 0, -22, 7, 5.5, '#4A3B32');
  fillEllipse(ctx, 0, -24, 3, 2.4, '#FF9EB8');
  ctx.restore();
  // blocks
  fillRR(ctx, x + 120, y - 24, 40, 26, 5, P.coral);
  fillRR(ctx, x + 166, y - 30, 34, 32, 5, P.yellow);
  fillRR(ctx, x + 150, y - 56, 30, 26, 5, P.blue);
  // ball
  fillCircle(ctx, x + 250, y - 20, 20, P.lavender);
  ctx.save();
  ctx.beginPath(); ctx.arc(x + 250, y - 20, 20, 0, TAU); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x + 250, y - 20, 12, 0, TAU); ctx.stroke();
  ctx.restore();
}

function drawClock(ctx, t) {
  const cx = 830, cy = 210, r = 62;
  fillCircle(ctx, cx, cy, r + 8, '#FFFFFF');
  ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, TAU);
  ctx.strokeStyle = 'rgba(206,153,106,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    fillCircle(ctx, cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12), 3.2, 'rgba(120,95,80,0.5)');
  }
  const sec = (t * 6) % 60;
  const min = 8 + t * 0.1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((min / 60) * TAU);
  ctx.strokeStyle = '#6B5548';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.55); ctx.stroke();
  ctx.rotate(-(min / 60) * TAU + (sec / 60) * TAU);
  ctx.strokeStyle = '#E86C5D';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.72); ctx.stroke();
  ctx.restore();
  fillCircle(ctx, cx, cy, 6, '#6B5548');
}

function drawSofa(ctx) {
  const x = 60, y = 560, w = 560;
  contactShadow(ctx, x + w / 2, 812, 300, 34, 0.2);
  // back
  fillRR(ctx, x + 24, y + 60, w - 48, 150, 42, P.mintDark);
  fillRR(ctx, x + 26, y + 46, w - 52, 150, 42, P.mint);
  // seat
  fillRR(ctx, x, y + 170, w, 74, 26, P.mint);
  fillRR(ctx, x + 6, y + 166, w - 12, 70, 22, P.mintLight);
  // arms
  fillRR(ctx, x - 6, y + 126, 74, 130, 34, P.mint);
  fillRR(ctx, x + w - 68, y + 126, 74, 130, 34, P.mint);
  fillRR(ctx, x + 2, y + 130, 58, 118, 28, P.mintLight);
  fillRR(ctx, x + w - 60, y + 130, 58, 118, 28, P.mintLight);
  // cushions
  fillRR(ctx, x + 96, y + 78, 150, 96, 26, '#FFF3DE');
  fillRR(ctx, x + 104, y + 86, 132, 78, 20, '#FFFDF6');
  fillRR(ctx, x + 268, y + 78, 150, 96, 26, '#FFE3C0');
  fillRR(ctx, x + 276, y + 86, 132, 78, 20, '#FFF7E6');
  // legs
  fillRR(ctx, x + 26, y + 238, 20, 26, 8, P.woodDark);
  fillRR(ctx, x + w - 48, y + 238, 20, 26, 8, P.woodDark);
}

function drawChest(ctx, t) {
  const x = 1585, y = 690, w = 265, h = 190;
  contactShadow(ctx, x + w / 2, y + h + 4, 155, 22, 0.2);
  fillRR(ctx, x, y + 24, w, h - 24, 18, P.coralDark);
  fillRR(ctx, x, y, w, h - 30, 18, P.coral);
  fillRR(ctx, x + 12, y + 14, w - 24, 42, 14, 'rgba(255,255,255,0.22)');
  // lid band
  fillRR(ctx, x + 4, y + 62, w - 8, 16, 8, '#FFB4A6');
  // latch
  fillCircle(ctx, x + w / 2, y + 110, 16, P.yellow);
  fillCircle(ctx, x + w / 2, y + 110, 7, P.yellowDark);
  // toys poking out
  fillRR(ctx, x + 36, y - 26, 44, 34, 8, P.blue);
  fillCircle(ctx, x + 210, y - 18, 26, P.yellow);
  ctx.save();
  ctx.beginPath(); ctx.arc(x + 210, y - 18, 26, 0, TAU); ctx.clip();
  ctx.fillStyle = P.coral;
  ctx.beginPath(); ctx.arc(x + 210, y - 18, 26, 0.2, 1.4); ctx.lineTo(x + 210, y - 18); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 210, y - 18, 26, 2.2, 3.4); ctx.lineTo(x + 210, y - 18); ctx.fill();
  ctx.restore();
}

function drawPlant(ctx, t) {
  const x = 120, y = 812;
  const sway = Math.sin(t * 1.1) * 0.04;
  contactShadow(ctx, x, y + 6, 74, 16, 0.2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  // leaves
  ctx.fillStyle = P.greenDark;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42;
    ctx.save();
    ctx.rotate(a * 0.55);
    ctx.beginPath();
    ctx.ellipse(0, -120, 26, 78, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = P.green;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42;
    ctx.save();
    ctx.rotate(a * 0.55);
    ctx.beginPath();
    ctx.ellipse(-6, -126, 22, 70, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // pot
  ctx.beginPath();
  ctx.moveTo(-52, -70);
  ctx.lineTo(52, -70);
  ctx.lineTo(38, 0);
  ctx.lineTo(-38, 0);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 0, -70, 0, [[0, '#FF9E8C'], [1, '#E8766A']]);
  ctx.fill();
  fillRR(ctx, -58, -82, 116, 22, 10, '#FFB0A0');
  ctx.restore();
}

function drawRug(ctx) {
  const cx = 940, cy = 916;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.32);
  fillCircle(ctx, 6, 12, 545, 'rgba(120,80,55,0.10)');
  fillCircle(ctx, 0, 0, 540, P.rugEdge);
  fillCircle(ctx, 0, 0, 512, P.rug);
  strokeCircle(ctx, 0, 0, 452, P.rug2, 34);
  strokeCircle(ctx, 0, 0, 356, P.rug2, 22);
  fillCircle(ctx, 0, 0, 300, P.rug3);
  fillCircle(ctx, 0, 0, 262, P.rug);
  // dots
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    fillCircle(ctx, Math.cos(a) * 402, Math.sin(a) * 402, 15, P.rugEdge);
  }
  ctx.restore();
}

function drawFloor(ctx) {
  ctx.fillStyle = vgrad(ctx, 0, FLOOR, H, [[0, '#F7CE96'], [0.5, P.floor], [1, '#EAB675']]);
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
  // planks
  ctx.strokeStyle = 'rgba(190,132,80,0.30)';
  ctx.lineWidth = 2;
  const rows = 7;
  for (let i = 1; i <= rows; i++) {
    const y = FLOOR + Math.pow(i / rows, 1.7) * (H - FLOOR);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // vertical seams
  for (let i = 0; i < 10; i++) {
    const x = (i / 10) * W + 40;
    ctx.strokeStyle = 'rgba(190,132,80,0.18)';
    ctx.beginPath();
    ctx.moveTo(x, FLOOR + 6);
    ctx.lineTo(x + 26, H);
    ctx.stroke();
  }
  // skirting
  fillRR(ctx, -10, FLOOR - 26, W + 20, 34, 8, '#FFF3E2');
  fillRR(ctx, -10, FLOOR + 2, W + 20, 10, 4, 'rgba(190,132,80,0.25)');
}

function drawWall(ctx) {
  ctx.fillStyle = vgrad(ctx, 0, 0, FLOOR, [[0, P.wallTop], [0.62, '#FFF0DE'], [1, P.wallBot]]);
  ctx.fillRect(0, 0, W, FLOOR);
  // subtle stripes
  for (let i = 0; i < 12; i++) {
    if (i % 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect((i / 12) * W, 0, W / 12, FLOOR);
  }
  // wainscot
  ctx.fillStyle = P.wallBand;
  ctx.fillRect(0, 634, W, FLOOR - 634);
  fillRR(ctx, -10, 614, W + 20, 26, 12, P.rail);
  fillRR(ctx, -10, 614, W + 20, 10, 6, 'rgba(255,255,255,0.45)');
  // panels
  for (let i = 0; i < 8; i++) {
    const x = 60 + i * 236;
    fillRR(ctx, x, 664, 178, 82, 12, 'rgba(255,255,255,0.28)');
    fillRR(ctx, x + 6, 670, 166, 70, 9, 'rgba(214,150,104,0.10)');
  }
}

function drawLightBeam(ctx, t, rise) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const a = 0.10 * rise;
  const g = ctx.createLinearGradient(WIN.cx - 180, 540, WIN.cx - 420, 1080);
  g.addColorStop(0, `rgba(255,240,190,${a})`);
  g.addColorStop(0.5, `rgba(255,236,180,${a * 0.5})`);
  g.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(WIN.cx - 200, 540);
  ctx.lineTo(WIN.cx + 200, 540);
  ctx.lineTo(WIN.cx + 60, 1080);
  ctx.lineTo(WIN.cx - 560, 1080);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRoom(ctx, t, { rise = 1, warm = 1 } = {}) {
  drawWall(ctx);
  drawBunting(ctx, t);
  drawWindow(ctx, t, rise);
  drawShelf(ctx, t);
  drawClock(ctx, t);
  drawFloor(ctx);
  drawRug(ctx);
  drawSofa(ctx);
  drawChest(ctx, t);
  drawPlant(ctx, t);
  drawLightBeam(ctx, t, rise);

  // ambient warm wash
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(WIN.cx, 380, 60, WIN.cx, 380, 1250);
  g.addColorStop(0, `rgba(255,226,170,${0.16 * warm * rise})`);
  g.addColorStop(0.45, `rgba(255,210,150,${0.06 * warm * rise})`);
  g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export { FLOOR, WIN };
