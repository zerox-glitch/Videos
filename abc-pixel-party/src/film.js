// Master film: draw(ctx, t) — every frame is a pure function of time.
import {
  beats, PW, PH, UI, CARD_COLORS, OBJECTS, LETTERS,
  WALL, wallSlot, sectionAt,
} from './data.js';
import {
  clamp, lerp, ph, pop, env, outBack, outCubic, inQuad, rng, hash2,
  rrect, pill, pxBox, text, measure, drawSprite, drawGlyph, sparkle,
} from './lib/draw.js';
import { drawBg, backdropDisc } from './scene.js';

// ---------------------------------------------------------------- easings
function outBounce(u) {
  const n1 = 7.5625, d1 = 2.75;
  if (u < 1 / d1) return n1 * u * u;
  if (u < 2 / d1) { u -= 1.5 / d1; return n1 * u * u + 0.75; }
  if (u < 2.5 / d1) { u -= 2.25 / d1; return n1 * u * u + 0.9375; }
  u -= 2.625 / d1; return n1 * u * u + 0.984375;
}

function scaled(ctx, cx, cy, s, fn) {
  if (s <= 0.02) return;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.scale(s, s);
  ctx.translate(-Math.round(cx), -Math.round(cy));
  fn();
  ctx.restore();
}

// ---------------------------------------------------------------- shared UI
function chip(ctx, str, cx, y, {
  font = '800 15px Baloo2Extra', fill = '#FFFFFF', color = UI.ink,
  scale = 1, pad = 14, h = 26,
} = {}) {
  if (scale <= 0.02) return;
  const w = measure(ctx, str, font) + pad * 2;
  scaled(ctx, cx, y + h / 2, scale, () => {
    pill(ctx, cx - w / 2, y, w, h, { fill });
    text(ctx, str, cx, y + h / 2 + 1, { font, fill: color });
  });
}

// karaoke caption: white pill, words colour up as they are "sung"
function karaoke(ctx, line, t) {
  if (!line || t < line.t0 - 0.1 || t > line.t1 + 0.25) return;
  const font = '800 13px Baloo2Extra';
  ctx.font = font;
  const space = ctx.measureText(' ').width;
  const widths = line.words.map((w) => ctx.measureText(w[0]).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (line.words.length - 1);
  const h = 24, y = 228;
  const x0 = Math.round(PW / 2 - total / 2);
  pill(ctx, x0 - 12, y, total + 24, h, { fill: UI.paper });
  let cur = 0;
  for (let i = 0; i < line.words.length; i++) if (t >= line.words[i][1]) cur = i;
  // pop the pill on entry
  let x = x0;
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < line.words.length; i++) {
    const [w] = line.words[i];
    ctx.fillStyle = i < cur ? UI.karaokePast : i === cur ? UI.karaokeNow : UI.karaokeFuture;
    ctx.fillText(w, x, y + h / 2 + 1);
    x += widths[i] + space;
  }
}

function activeLine(t, tag) {
  for (const l of beats.lines) {
    if (!l.id.startsWith(tag)) continue;
    if (t >= l.t0 - 0.1 && t <= l.t1 + 0.25) return l;
  }
  return null;
}

// burst of small squares at (x, y) right after a pop
function burst(ctx, x, y, t, t0, color = '#FFF3A0', n = 6, spread = 18) {
  const u = ph(t, t0, 0.4);
  if (u <= 0 || u >= 1) return;
  const a = 1 - u;
  const r = rng(Math.floor(t0 * 1000) + 7);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r() * 0.6;
    const d = spread * outCubic(u);
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    const s = 3;
    ctx.fillRect(Math.round(x + Math.cos(ang) * d - s / 2), Math.round(y + Math.sin(ang) * d - s / 2), s, s);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- INTRO
const INTRO_BLOCKS = [
  { ch: 'A', color: CARD_COLORS[0], t0: 0.55 },
  { ch: 'B', color: CARD_COLORS[1], t0: 1.10 },
  { ch: 'C', color: CARD_COLORS[2], t0: 1.65 },
];

function renderIntro(ctx, t) {
  drawBg(ctx, 'dawn', t);

  // shelf the blocks land on
  pxBox(ctx, 118, 156, 244, 12, 6, UI.ink);
  pxBox(ctx, 119, 157, 242, 8, 4, '#FFFFFF');

  const bw = 56, bh = 64, gap = 14;
  const x0 = Math.round((PW - (3 * bw + 2 * gap)) / 2);
  for (let i = 0; i < 3; i++) {
    const b = INTRO_BLOCKS[i];
    const bx = x0 + i * (bw + gap);
    const u = ph(t, b.t0, 0.62);
    const yBase = 156 - bh;
    let y, sy = 1, sx = 1;
    if (t < b.t0) y = -bh - 30;
    else {
      const fall = inQuad(clamp(u / 0.7, 0, 1));
      const bounce = u > 0.7 ? outBounce((u - 0.7) / 0.3) : 0;
      // drop then one small bounce
      y = lerp(-bh - 20, yBase, u < 0.7 ? fall : 1) - (u > 0.7 ? (1 - bounce) * 0 : 0);
      if (u >= 1) y = yBase + Math.sin(t * 2.2 + i) * 1.5;
      if (u > 0.68 && u < 0.95) {
        const k = Math.sin(((u - 0.68) / 0.27) * Math.PI);
        sy = 1 - 0.14 * k; sx = 1 + 0.12 * k;
      }
      void bounce;
    }
    const cx = bx + bw / 2, cy = y + bh / 2;
    // landing dust
    if (t >= b.t0 + 0.42 && t < b.t0 + 0.85) {
      const du = ph(t, b.t0 + 0.42, 0.43);
      const r = rng(100 + i);
      for (let k = 0; k < 6; k++) {
        const dir = k % 2 ? 1 : -1;
        const dx = dir * (8 + k * 3) * du;
        ctx.globalAlpha = (1 - du) * 0.9;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(cx + dx), Math.round(yBase + bh - 4 - (k % 3) * 3 - du * 6), 4, 4);
        ctx.globalAlpha = 1;
        void r;
      }
    }
    scaled(ctx, cx, yBase + bh, 1, () => {}); // noop guard
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(yBase + bh));
    ctx.scale(sx, sy);
    ctx.translate(-Math.round(cx), -Math.round(-(yBase + bh)));
    // NOTE: pivot at block bottom
    ctx.restore();

    // draw block (card + glyph), squashed about its bottom edge
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(y + bh));
    ctx.scale(sx, sy);
    ctx.translate(-Math.round(cx), Math.round(-(y + bh)));
    pxBox(ctx, bx - 1, y - 1, bw + 2, bh + 2, 10, UI.ink);
    pxBox(ctx, bx, y, bw, bh, 9, b.color);
    drawGlyph(ctx, b.ch, cx, cy, 6, '#FFFFFF', UI.ink);
    ctx.restore();
    // shelf shadow
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = UI.ink;
    ctx.fillRect(bx + 8, 152, bw - 16, 4);
    ctx.globalAlpha = 1;
    void sx; void sy;
  }

  // sidekick sprites previewing the alphabet friends
  const bounceA = Math.abs(Math.sin(t * 2.4));
  drawSprite(ctx, 'apple', 52, 176 - bounceA * 8, 2);
  drawSprite(ctx, 'ball', 396, 176 - Math.abs(Math.sin(t * 2.4 + 1.6)) * 10, 2);

  // title chip with the hook VO
  const cp = pop(t, beats.hook.t, 0.38);
  chip(ctx, 'Pixel Alphabet Party', PW / 2, 186, { scale: cp, font: '800 16px Baloo2Extra', h: 28 });
}

// ---------------------------------------------------------------- SONG
function renderSong(ctx, t, pass) {
  const scheme = pass === 1 ? 'candy' : 'mint';
  drawBg(ctx, scheme, t);
  const times = pass === 1 ? beats.letters1 : beats.letters2;
  const tag = pass === 1 ? 's1' : 's2';

  for (let i = 0; i < 26; i++) {
    const { x, y } = wallSlot(i);
    const cx = x + WALL.cw / 2, cy = y + WALL.chh / 2;
    const popT = times[i];
    // empty slot (opaque board — translucent boxes smeared over the hills)
    ctx.globalAlpha = 0.22;
    pxBox(ctx, x, y, WALL.cw, WALL.chh, 6, UI.ink);
    ctx.globalAlpha = 1;
    pxBox(ctx, x + 1, y + 1, WALL.cw - 2, WALL.chh - 2, 5, '#FFFFFF');
    if (t < popT) continue;

    const u = ph(t, popT, 0.34);
    const active = t >= popT && t < popT + 0.95;
    let s = u < 1 ? outBack(u) : 1;
    if (u >= 1) s = 1;
    const bob = u >= 1 ? Math.sin(t * 2.4 + i * 0.55) * 0.8 : 0;
    const activeScale = active ? 1.1 : 1;

    scaled(ctx, cx, cy, s * activeScale, () => {
      // ink border layer + colour face
      pxBox(ctx, x - 1, y - 1, WALL.cw + 2, WALL.chh + 2, 7, UI.ink);
      pxBox(ctx, x, y, WALL.cw, WALL.chh, 6, CARD_COLORS[i % CARD_COLORS.length]);
      if (pass === 1) {
        drawGlyph(ctx, LETTERS[i], cx, cy + 1, 3, '#FFFFFF', 'rgba(38,36,59,0.55)');
      } else {
        drawGlyph(ctx, LETTERS[i], x + 13, cy, 2, '#FFFFFF', 'rgba(38,36,59,0.55)');
        drawSprite(ctx, OBJECTS[LETTERS[i]], x + 25, cy - 8, 1);
      }
      if (active) {
        // accent ring
        rrect(ctx, x - 3, y - 3, WALL.cw + 6, WALL.chh + 6, 8);
        ctx.strokeStyle = UI.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    // vertical bob applied outside scale for crispness
    void bob;
    if (active) burst(ctx, cx, cy, t, popT, '#FFFFFF', 5, 20);
  }

  karaoke(ctx, activeLine(t, tag), t);
}

// ---------------------------------------------------------------- INTERLUDE
function renderInterlude(ctx, t) {
  drawBg(ctx, 'peach', t);
  const cp = pop(t, 33.0, 0.36);
  chip(ctx, 'Let\u2019s meet some friends!', PW / 2, 44, { scale: cp });

  const items = beats.showcase; // A..H
  const colW = PW / items.length;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const t0 = 32.45 + i * 0.13;
    const u = pop(t, t0, 0.3);
    if (u <= 0) continue;
    const cx = colW * (i + 0.5);
    const bounce = Math.abs(Math.sin(t * 2.6 + i * 0.7)) * 4;
    scaled(ctx, cx, 170, u, () => {
      // letter tile left, object right — the pair stands on the ground line
      drawGlyph(ctx, it.letter, cx - 17, 198 - bounce, 2, '#FFFFFF', UI.ink);
      drawSprite(ctx, it.sprite, cx - 1, 186 - bounce, 2);
    });
    // group shadow on the checker ground
    ctx.globalAlpha = 0.25 * u;
    ctx.fillStyle = UI.ink;
    ctx.fillRect(Math.round(cx - 22), 216, 44, 3);
    ctx.globalAlpha = 1;
    if (t < t0 + 0.35) burst(ctx, cx, 200, t, t0, '#FFF3A0', 4, 14);
  }
}

// ---------------------------------------------------------------- SHOWCASE
function showcaseAnim(name, t, i) {
  // returns {dx, dy, sx, sy} transform for the object sprite
  const phase = i * 0.9;
  const hopSet = new Set(['ball', 'dog', 'rabbit', 'yoyo', 'lion', 'pig', 'owl']);
  const swimSet = new Set(['fish', 'cat', 'zebra', 'van']);
  const pulseSet = new Set(['grapes', 'sun', 'tree']);
  if (hopSet.has(name)) {
    const k = Math.abs(Math.sin(t * Math.PI * 1.15 + phase));
    const squash = 1 - (1 - k) * 0.18;
    return { dx: 0, dy: -k * 9, sx: 1 / squash * (k < 0.12 ? 1.12 : 1), sy: squash };
  }
  if (swimSet.has(name)) return { dx: Math.sin(t * 2.1 + phase) * 5, dy: Math.sin(t * 3.4 + phase) * 1.5, sx: 1, sy: 1 };
  if (pulseSet.has(name)) {
    const p = 1 + Math.sin(t * 3.2 + phase) * 0.05;
    return { dx: 0, dy: 0, sx: p, sy: 2 - p };
  }
  if (name === 'egg') return { dx: Math.sin(t * 7 + phase) * 2.5, dy: 0, sx: 1, sy: 1 };
  // default gentle bob
  return { dx: 0, dy: Math.sin(t * 2 + phase) * 2.5, sx: 1, sy: 1 };
}

function drawShowcaseItem(ctx, it, idx, t, k, exiting) {
  // k = entrance scale, exiting: shrink
  const cardC = { x: 106, y: 112 };
  const objC = { x: 330, y: 112 };
  const color = CARD_COLORS[idx % CARD_COLORS.length];

  const cardS = k, objS = Math.max(0, k * 0.94);
  // pedestals (drawn unscaled under)
  ctx.globalAlpha = 0.5 * clamp(k, 0, 1);
  pxBox(ctx, 64, 170, 84, 8, 4, UI.ink);
  pxBox(ctx, 284, 170, 92, 8, 4, UI.ink);
  ctx.globalAlpha = 1;

  scaled(ctx, cardC.x, cardC.y, cardS, () => {
    pxBox(ctx, 63, 63, 86, 98, 12, UI.ink);
    pxBox(ctx, 64, 64, 84, 96, 11, color);
    drawGlyph(ctx, it.letter, cardC.x, cardC.y, 8, '#FFFFFF', 'rgba(38,36,59,0.5)');
  });

  // disc behind object
  backdropDisc(ctx, objC.x, objC.y + 4, 54, color);
  const anim = showcaseAnim(it.sprite, t, idx);
  scaled(ctx, objC.x, objC.y, objS, () => {
    ctx.save();
    ctx.translate(Math.round(objC.x + anim.dx), Math.round(objC.y + anim.dy));
    ctx.scale(anim.sx, anim.sy);
    ctx.translate(-Math.round(objC.x), -Math.round(objC.y));
    drawSprite(ctx, it.sprite, objC.x - 48, objC.y - 48, 6);
    ctx.restore();
  });
  if (exiting) void color;
}

function renderShowcase(ctx, t) {
  drawBg(ctx, 'stage', t);
  const items = beats.showcase;
  let idx = -1;
  for (let i = 0; i < items.length; i++) if (t >= items[i].t) idx = i;
  if (idx < 0) idx = 0;
  const it = items[idx];

  // exiting previous item
  if (idx > 0 && t < it.t + 0.16) {
    const u = ph(t, it.t, 0.16);
    const prev = items[idx - 1];
    drawShowcaseItem(ctx, prev, idx - 1, t, 1 - outCubic(u), true);
  }
  // entering current
  const k = outBack(ph(t, it.t, 0.34));
  drawShowcaseItem(ctx, it, idx, t, Math.max(0, k), false);
  if (t < it.t + 0.4) {
    burst(ctx, 106, 112, t, it.t, '#FFFFFF', 5, 26);
    burst(ctx, 330, 112, t, it.t + 0.1, color0(idx), 6, 30);
  }

  // caption: "A is for Apple"
  const cp = pop(t, it.t + 0.12, 0.3);
  if (cp > 0.02) {
    const f = '800 16px Baloo2Extra';
    const word = it.word;
    const isFor = 'is for';
    ctx.font = f;
    const w1 = ctx.measureText(it.letter).width;
    const w2 = ctx.measureText(isFor).width;
    const w3 = ctx.measureText(word).width;
    const space = ctx.measureText(' ').width;
    const total = w1 + space + w2 + space + w3;
    const h = 28, y = 218;
    const cx = PW / 2;
    const color = color0(idx);
    scaled(ctx, cx, y + h / 2, cp, () => {
      pill(ctx, cx - total / 2 - 14, y, total + 28, h, { fill: UI.paper });
      ctx.font = f;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let x = cx - total / 2;
      ctx.fillStyle = color; ctx.fillText(it.letter, x, y + h / 2 + 1); x += w1 + space;
      ctx.fillStyle = UI.inkSoft; ctx.fillText(isFor, x, y + h / 2 + 1); x += w2 + space;
      ctx.fillStyle = color; ctx.fillText(word, x, y + h / 2 + 1);
    });
  }
}
function color0(idx) { return CARD_COLORS[idx % CARD_COLORS.length]; }

// ---------------------------------------------------------------- FINALE
const FW = [[120, 66], [366, 58], [240, 36]];
const FCOLORS = ['#FF6B6B', '#FFD23F', '#3D8BFD', '#43C465', '#F062A6'];

function firework(ctx, t, t0, fx, fy, ci) {
  const u = ph(t, t0, 0.8);
  if (u <= 0 || u >= 1) return;
  const a = 1 - u;
  const reach = 40 * outCubic(u);
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]];
  for (const [dx, dy] of dirs) {
    for (let k = 1; k <= 3; k++) {
      const d = reach * (k / 3);
      ctx.globalAlpha = a * (1 - (k - 1) * 0.22);
      ctx.fillStyle = FCOLORS[(ci + k) % FCOLORS.length];
      const s = 4 - k;
      ctx.fillRect(Math.round(fx + dx * d - s / 2), Math.round(fy + dy * d - s / 2), s, s);
    }
  }
  ctx.globalAlpha = 1;
}

const CONFETTI = (() => {
  const r = rng(20261017);
  return Array.from({ length: 52 }, (_, i) => ({
    x: r() * PW,
    v: 34 + r() * 46,
    sway: 6 + r() * 10,
    swf: 1 + r() * 1.4,
    s: r() < 0.4 ? 3 : 4,
    c: FCOLORS[i % FCOLORS.length],
    d: r() * 2.2,
  }));
})();

function renderFinale(ctx, t) {
  drawBg(ctx, 'festival', t);

  // full wall (song-two layout) with a cheerful wave
  for (let i = 0; i < 26; i++) {
    const { x, y } = wallSlot(i);
    const cx = x + WALL.cw / 2, cy = y + WALL.chh / 2;
    const wob = Math.sin(t * 3 - i * 0.35) * 1.6;
    ctx.save();
    ctx.translate(0, Math.round(wob));
    pxBox(ctx, x - 1, y - 1, WALL.cw + 2, WALL.chh + 2, 7, UI.ink);
    pxBox(ctx, x, y, WALL.cw, WALL.chh, 6, CARD_COLORS[i % CARD_COLORS.length]);
    drawGlyph(ctx, LETTERS[i], x + 13, cy, 2, '#FFFFFF', 'rgba(38,36,59,0.55)');
    drawSprite(ctx, OBJECTS[LETTERS[i]], x + 25, cy - 8, 1);
    ctx.restore();
  }

  // fireworks
  if (t >= 88.3) {
    firework(ctx, t, 88.35, FW[0][0], FW[0][1], 0);
    firework(ctx, t, 89.15, FW[1][0], FW[1][1], 2);
    firework(ctx, t, 89.95, FW[2][0], FW[2][1], 4);
    firework(ctx, t, 90.9, FW[0][0], FW[0][1], 3);
    firework(ctx, t, 91.7, FW[1][0], FW[1][1], 1);
  }

  // confetti rain
  if (t >= 88.1) {
    for (const p of CONFETTI) {
      const tt = t - 88.1 - p.d;
      if (tt < 0) continue;
      const yy = -6 + ((tt * p.v) % (PH + 30));
      const xx = p.x + Math.sin(tt * p.swf) * p.sway;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(xx), Math.round(yy), p.s, p.s + 2);
      ctx.globalAlpha = 1;
    }
  }

  // end card panel
  const ep = pop(t, beats.endcard.t, 0.4);
  if (ep > 0.02) {
    const cx = PW / 2, y = 84, w = 250, h = 84;
    scaled(ctx, cx, y + h / 2, ep, () => {
      pxBox(ctx, cx - w / 2 - 2, y - 2, w + 4, h + 4, 16, UI.ink);
      pxBox(ctx, cx - w / 2, y, w, h, 15, '#FFFFFF');
      // yellow header band
      pxBox(ctx, cx - w / 2 + 8, y + 10, w - 16, 30, 12, UI.accent);
      text(ctx, 'Great job!', cx, y + 26, { font: '800 22px Baloo2Extra', fill: UI.ink });
      text(ctx, 'Sing it again!', cx, y + 60, { font: '800 16px Baloo2Extra', fill: UI.karaokeNow });
    });
  }
}

// ---------------------------------------------------------------- dispatch
function cameraZoom(section, t) {
  const S = beats.sections;
  const u = clamp((t - S[section][0]) / (S[section][1] - S[section][0]), 0, 1);
  switch (section) {
    case 'intro': return 1 + 0.02 * u;
    case 'song1': return 1 + 0.03 * u;
    case 'interlude': return 1.025 - 0.02 * u;
    case 'showcase': return 1.005;
    case 'song2': return 1 + 0.04 * u;
    case 'finale': return 1 + 0.045 * u;
    default: return 1;
  }
}

function renderScene(ctx, section, t) {
  const z = cameraZoom(section, t);
  ctx.save();
  if (z !== 1) {
    ctx.translate(PW / 2, PH / 2);
    ctx.scale(z, z);
    ctx.translate(-PW / 2, -PH / 2);
  }
  switch (section) {
    case 'intro': renderIntro(ctx, t); break;
    case 'song1': renderSong(ctx, t, 1); break;
    case 'interlude': renderInterlude(ctx, t); break;
    case 'showcase': renderShowcase(ctx, t); break;
    case 'song2': renderSong(ctx, t, 2); break;
    case 'finale': renderFinale(ctx, t); break;
    default: renderIntro(ctx, t);
  }
  ctx.restore();
}

// offscreen buffer for checker wipes
let off = null;
function wipeOverlay(ctx, prevSection, nextSection, t, tw, p) {
  if (!off) {
    off = ctx.__off; // created by render.mjs
  }
  const octx = off.getContext('2d');
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, PW, PH);
  renderScene(octx, nextSection, t);
  const cell = 16;
  const cols = Math.ceil(PW / cell), rows = Math.ceil(PH / cell);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if (hash2(cx * 7 + 1, cy * 13 + 3) < p) {
        const sx = cx * cell, sy = cy * cell;
        const w = Math.min(cell, PW - sx), h = Math.min(cell, PH - sy);
        ctx.drawImage(off, sx, sy, w, h, sx, sy, w, h);
      }
    }
  }
  void prevSection;
}

// ---------------------------------------------------------------- entry
export function draw(ctx, t) {
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, PW, PH);

  const wipes = beats.wipes;
  let wiping = null;
  for (const tw of wipes) {
    if (t >= tw - 0.42 && t < tw) { wiping = tw; break; }
  }
  if (wiping !== null) {
    const prev = sectionAt(wiping - 0.001);
    const next = sectionAt(wiping + 0.001);
    renderScene(ctx, prev, t);
    const p = (t - (wiping - 0.42)) / 0.42;
    wipeOverlay(ctx, prev, next, t, wiping, p);
  } else {
    renderScene(ctx, sectionAt(t), t);
  }

  // global fades
  if (t < 0.45) {
    ctx.fillStyle = `rgba(255,255,255,${1 - t / 0.45})`;
    ctx.fillRect(0, 0, PW, PH);
  }
  const f0 = beats.fade.t0;
  if (t >= f0) {
    const a = clamp((t - f0) / (beats.fade.t1 - f0), 0, 1);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(0, 0, PW, PH);
  }
}

// render.mjs attaches the offscreen canvas here
export function attachOffscreen(canvas) { off = canvas; }
