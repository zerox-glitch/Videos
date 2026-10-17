// Pixel backgrounds: banded skies, sun, clouds, hills, checker ground.
// Everything is drawn on the 480×270 pixel grid, integer-snapped.
import { PW, PH } from './data.js';
import { clamp, lerp, hash2, sparkle, rrect, pxCircle, pxBox } from './lib/draw.js';

// each scheme: sky band colours (top→bottom), sun colour, hill colours, ground
export const SCHEMES = {
  dawn: {
    bands: ['#BDE7FF', '#A5DAFF', '#8ECFFF', '#7AC2FF', '#69B6FF', '#5FADFF'],
    sun: '#FFD93D', sunHalo: '#FFF3A0',
    hillFar: '#7BD389', hillNear: '#52BE74',
    ground: ['#FFE9B8', '#FFDD9A'], groundLine: '#F5C86B',
    cloud: '#FFFFFF', cloudShade: '#DCEEFF',
  },
  candy: {
    bands: ['#FFD9E8', '#FFC9DE', '#FFB9D4', '#FFA9CA', '#FF99C0', '#FF89B6'],
    sun: '#FFF3A0', sunHalo: '#FFFBD9',
    hillFar: '#8ED0FF', hillNear: '#6BB8F0',
    ground: ['#FFF0C8', '#FFE49E'], groundLine: '#F2C86A',
    cloud: '#FFFFFF', cloudShade: '#F4E3F0',
  },
  peach: {
    bands: ['#FFE9CF', '#FFE0BF', '#FFD7B0', '#FFCEA1', '#FFC592', '#FFBC83'],
    sun: '#FF9F4D', sunHalo: '#FFD9A0',
    hillFar: '#FFD23F', hillNear: '#F2B441',
    ground: ['#D8F3DC', '#C4EAD0'], groundLine: '#95D5B2',
    cloud: '#FFFFFF', cloudShade: '#FFE5CC',
  },
  stage: {
    bands: ['#E7E0FF', '#DCD4FF', '#D0C6FF', '#C4B8FF', '#B8AAFF', '#AC9CFF'],
    sun: '#FFD93D', sunHalo: '#FFF3A0',
    hillFar: '#FFA6CE', hillNear: '#F085B4',
    ground: ['#FFFFFF', '#F2ECFF'], groundLine: '#C9B8FF',
    cloud: '#FFFFFF', cloudShade: '#E8E0FF',
  },
  mint: {
    bands: ['#D6F7E3', '#C4F1D8', '#B2EBCE', '#A0E5C4', '#8EDFBA', '#7CD9B0'],
    sun: '#FFD93D', sunHalo: '#FFF3A0',
    hillFar: '#7CC4FF', hillNear: '#5FADFF',
    ground: ['#FFF0C8', '#FFE49E'], groundLine: '#F2C86A',
    cloud: '#FFFFFF', cloudShade: '#E4F5EC',
  },
  festival: {
    bands: ['#FFE3B3', '#FFD9A6', '#FFCF99', '#FFC58C', '#FFBB7F', '#FFB172'],
    sun: '#FF8A3D', sunHalo: '#FFC46B',
    hillFar: '#A45BE8', hillNear: '#8E45D6',
    ground: ['#FFD9E8', '#FFC9DE'], groundLine: '#FF9EC7',
    cloud: '#FFFFFF', cloudShade: '#FFE8D1',
  },
};

function cloud(ctx, x, y, s, sch) {
  // stepped pixel cloud: two lobes + flat base
  const r = Math.round;
  ctx.fillStyle = sch.cloud;
  ctx.fillRect(r(x), r(y + 6 * s), r(34 * s), r(8 * s));
  ctx.fillRect(r(x + 6 * s), r(y + 2 * s), r(22 * s), r(6 * s));
  ctx.fillRect(r(x + 12 * s), r(y), r(10 * s), r(4 * s));
  ctx.fillStyle = sch.cloudShade;
  ctx.fillRect(r(x + 2 * s), r(y + 12 * s), r(30 * s), r(2 * s));
}

function sun(ctx, x, y, r0, sch, t) {
  const cx = Math.round(x), cy = Math.round(y);
  const R = Math.round(r0);
  // stepped rays behind the disc (1px gap → reads as shine)
  ctx.fillStyle = sch.sunHalo;
  ctx.fillRect(cx - 2, cy - R - 9, 4, 8);   // top
  ctx.fillRect(cx - 2, cy + R + 1, 4, 8);   // bottom
  ctx.fillRect(cx - R - 9, cy - 2, 8, 4);   // left
  ctx.fillRect(cx + R + 1, cy - 2, 8, 4);   // right
  const d = Math.round((R + 2) * 0.72);
  ctx.fillRect(cx + d, cy + d, 5, 5);       // diagonals
  ctx.fillRect(cx - d - 5, cy + d, 5, 5);
  ctx.fillRect(cx + d, cy - d - 5, 5, 5);
  ctx.fillRect(cx - d - 5, cy - d - 5, 5, 5);
  pxCircle(ctx, cx, cy, R, sch.sun);
  void t;
}

function hills(ctx, sch) {
  const r = Math.round;
  const base = 214;
  // far hill: rounded mass left
  ctx.fillStyle = sch.hillFar;
  rrect(ctx, -30, base - 26, 190, 60, 30);
  ctx.fill();
  rrect(ctx, 150, base - 18, 200, 52, 26);
  ctx.fill();
  // near hill right
  ctx.fillStyle = sch.hillNear;
  rrect(ctx, 300, base - 34, 240, 70, 34);
  ctx.fill();
  rrect(ctx, 40, base - 14, 160, 44, 22);
  ctx.fill();
  void r;
}

function ground(ctx, sch) {
  const gy = 218;
  const cell = 14;
  ctx.fillStyle = sch.ground[0];
  ctx.fillRect(0, gy, PW, PH - gy);
  ctx.fillStyle = sch.ground[1];
  for (let y = gy; y < PH; y += cell) {
    for (let x = ((y / cell) % 2) * cell; x < PW; x += cell * 2) {
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.fillStyle = sch.groundLine;
  ctx.fillRect(0, gy, PW, 2);
  void cell;
}

// decorative twinkles — fixed positions, deterministic
const TWINKLES = Array.from({ length: 14 }, (_, i) => ({
  x: 14 + hash2(i, 7) * (PW - 28),
  y: 10 + hash2(i, 13) * 150,
  ph: hash2(i, 29) * Math.PI * 2,
  s: 2 + Math.round(hash2(i, 31) * 2),
}));

export function drawBg(ctx, schemeName, t) {
  const sch = SCHEMES[schemeName] || SCHEMES.dawn;
  const n = sch.bands.length;
  const bandH = Math.ceil(220 / n);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = sch.bands[i];
    // overlap the seam above by 2px so camera-zoom AA can't expose gaps
    const y0 = i === 0 ? 0 : i * bandH - 2;
    ctx.fillRect(0, y0, PW, Math.min(bandH + (i === 0 ? 0 : 2), 224 - y0));
  }
  // sun top-right
  sun(ctx, PW - 58, 52, 24, sch, t);
  // drifting clouds (deterministic, wrap)
  const drift = (t * 6) % (PW + 90);
  cloud(ctx, ((58 + drift) % (PW + 90)) - 60, 34, 1.4, sch);
  cloud(ctx, ((240 + drift * 0.7) % (PW + 120)) - 60, 84, 1.0, sch);
  cloud(ctx, ((420 + drift * 0.5) % (PW + 140)) - 70, 22, 1.2, sch);
  hills(ctx, sch);
  ground(ctx, sch);
  // twinkles
  for (let i = 0; i < TWINKLES.length; i++) {
    const w = TWINKLES[i];
    const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 2.2 + w.ph));
    sparkle(ctx, w.x, w.y, w.s, a * 0.9);
  }
}

// soft pixel disc used behind showcase objects
export function backdropDisc(ctx, x, y, r0, color) {
  ctx.globalAlpha = 0.32;
  pxCircle(ctx, x, y, r0, color);
  ctx.globalAlpha = 1;
}

export { clamp, lerp };
