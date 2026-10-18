// film.js — full-frame compositor: scene dispatch → monitor feed → flashes
// → captions → post (vignette + grain). Deterministic in t (seconds).
import { createCanvas } from '@napi-rs/canvas';
import { createRequire } from 'node:module';
import { beats, ev } from './beats.js';
import * as S from './scenes.js';
import * as M from './lib/mini3d.js';

let W = S.W, H = S.H;   // set to canvas size in createFilm
const FPS = 30;

// ── fonts (registered by render.mjs; here we only assert family names)
// 'ChakraPetch-SemiBold' · 'ChakraPetch-Bold' · 'ShareTechMono-Regular'

// ── caption table (sorted, from beats)
const CAPS = [];
for (const sid of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) {
  for (const g of beats.captions[sid]) CAPS.push({ ...g, sid });
}
CAPS.sort((a, b) => a.t - b.t);

const CAP_FONT_BASE = 46, CAP_FONT_HI = 51;
let CAP_BASELINE_AREA = 1560;     // block centre; scaled to H in createFilm

function wrapGroups(g) {
  // single line if fits, else split words into up to 2 lines (return arrays)
  const words = g.text.split(' ');
  if (words.length <= 3) return [g.text];
  return [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')];
}

function drawCaptions(ctx, t) {
  let g = null;
  for (const c of CAPS) {
    if (t >= c.t && t < c.t1 + 0.05) g = c;
    if (c.t > t) break;
  }
  if (!g) return;
  const u = clamp01((t - g.t) / Math.max(0.2, g.t1 - g.t));
  const enter = ease(Math.min(1, (t - g.t) / 0.16));
  const exitA = t > g.t1 - 0.12 ? clamp01((g.t1 + 0.05 - t) / 0.17) : 1;
  const alpha = enter * (exitA ?? 1);
  const text = g.hi ? g.text.toUpperCase() : g.text;
  const size = Math.round((g.hi ? CAP_FONT_HI : CAP_FONT_BASE) * (W / 1080));
  const lines = wrapGroups({ text });
  const y0 = CAP_BASELINE_AREA - (lines.length - 1) * (size * 0.62) + (1 - enter) * 14;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  lines.forEach((ln, i) => {
    const y = y0 + i * size * 1.24;
    const fam = g.hi ? '"ChakraPetch-Bold"' : '"ChakraPetch-SemiBold"';
    ctx.font = `${g.hi ? 'bold ' : ''}${size}px ${fam}`;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(3,4,6,0.85)';
    ctx.lineWidth = Math.max(4, Math.round(9 * (W / 1080)));
    ctx.strokeText(ln, W / 2, y);
    ctx.fillStyle = g.hi ? 'rgba(240,248,255,0.99)' : 'rgba(233,242,255,0.94)';
    ctx.fillText(ln, W / 2, y);
  });
  ctx.restore();
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function ease(v) { return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }

// ── grain tiles (boiling, 4-frame cycle)
function makeGrainTiles() {
  const tiles = [];
  const N = 320;
  for (let k = 0; k < 4; k++) {
    const c = createCanvas(N, N);
    const cx = c.getContext('2d');
    const img = cx.createImageData(N, N);
    const rnd = M.rng(9137 + k * 131);
    for (let i = 0; i < N * N; i++) {
      const v = (rnd() * 255) | 0;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 26;
    }
    cx.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return tiles;
}

// ── static monitor "feed within feed" panel (one step of recursion)
function makeStaticPanel() {
  const c = createCanvas(486, 274);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 486, 274);
  g.addColorStop(0, '#0B1622');
  g.addColorStop(0.5, '#12283A');
  g.addColorStop(1, '#0A121C');
  x.fillStyle = g; x.fillRect(0, 0, 486, 274);
  x.strokeStyle = 'rgba(112,214,247,0.75)';
  x.lineWidth = 3;
  x.strokeRect(60, 40, 366, 190);
  x.fillStyle = 'rgba(112,214,247,0.10)';
  x.fillRect(60, 40, 366, 190);
  x.fillStyle = 'rgba(112,214,247,0.9)';
  x.font = '18px "ShareTechMono-Regular"';
  x.fillText('CAM 01', 74, 66);
  return c;
}

export function createFilm(canvas) {
  W = canvas.width; H = canvas.height;
  CAP_BASELINE_AREA = H * 0.8125;   // 1560/1920 safe zone
  S.setSize(W, H);
  const ctx = canvas.getContext('2d');
  const feedCanvas = createCanvas(486, 864);
  const feedCtx = feedCanvas.getContext('2d');
  const grain = makeGrainTiles();
  const statPanel = makeStaticPanel();

  // ── the feed: what the monitor (and probe) sees
  function drawFeed(t) {
    const f = feedCanvas;
    const fw = 486, fh = 864;
    const fctx = feedCtx;
    fctx.fillStyle = '#080A0E';
    fctx.fillRect(0, 0, fw, fh);
    const inParadox = t >= 90.45;
    // probe-POV camera: behind the researchers, looking at the monitor
    const yawTgt = [-1.15, 1.32, 5.5];
    const cam = {
      x: 0.55, y: 1.60,
      z: inParadox ? 2.75 : 3.05,
      yaw: 0, pitch: -0.045,
      f: (2 * Math.atan(24 / (2 * 22))),
    };
    cam.yaw = Math.atan2(yawTgt[0] - cam.x, yawTgt[2] - cam.z) +
      (inParadox ? 0.30 * (1 - M.ease(clamp01((t - ev('probe_turn').t) / 1.3))) - 0.15 : 0);
    cam.pitch = Math.atan2(1.30 - cam.y, yawTgt[2] - cam.z);
    const quads = S.labQuadsForFeed ? S.labQuadsForFeed() : S.labQuadsPub();
    M.renderScene(fctx, quads, cam, fw, fh, { fogColor: M.PAL.black, fogDensity: 0.05 });
    // feed's own monitor shows the static panel (self-recursion illusion)
    S.drawMonitorFeed(fctx, cam, statPanel, t, { alpha: 0.9 });
    if (inParadox) {
      const turnU = clamp01((t - ev('they_turn').t) / 1.5);
      S.drawFigureForFeed(fctx, cam, t, turnU);
      // (the probe never appears in its own feed — it IS the camera)
    }
    // feed grain + timestamp line (screen artefact, not floating film text)
    fctx.save();
    fctx.globalAlpha = 0.5;
    fctx.fillStyle = 'rgba(140,170,200,0.55)';
    fctx.font = '15px "ShareTechMono-Regular"';
    const rec = t >= 90.45 ? 'REC ●' : 'LIVE';
    fctx.fillStyle = t >= 90.45 ? 'rgba(231,170,96,0.8)' : 'rgba(140,170,200,0.6)';
    fctx.fillText(rec, 14, fh - 14);
    fctx.restore();
  }

  // ── main frame
  function draw(t) {
    // background (fog base) — guarantees no leftover pixels
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = '#080A0E';
    ctx.fillRect(0, 0, W, H);

    const sec = beats.sections.find((s) => t >= s.t0 && t < s.t1) || beats.sections[beats.sections.length - 1];
    let cam = null;
    switch (sec.id) {
      case 'object': S.scene_object(ctx, sec, t); break;
      case 'scan': S.scene_scan(ctx, sec, t); break;
      case 'chamber': S.scene_chamber(ctx, sec, t); break;
      case 'recursion': S.scene_recursion(ctx, sec, t); break;
      case 'seventh': S.scene_seventh(ctx, sec, t); break;
      case 'lab': cam = S.scene_lab(ctx, sec, t); break;
      case 'paradox':
        cam = S.scene_paradox(ctx, sec, t);
        S.scene_paradox_probe(ctx, sec, t, cam);
        break;
      case 'ending': S.scene_ending(ctx, sec, t); break;
    }
    // monitor live feed (lab + paradox windows)
    if ((sec.id === 'lab' || sec.id === 'paradox') && cam) {
      drawFeed(t);
      S.drawMonitorFeed(ctx, cam, feedCanvas, t, { alpha: 1 });
      if (sec.id === 'lab' || sec.id === 'paradox') S.drawProbeReflection(ctx, cam, t);
    }

    // impact flash frames (single-frame, subtle)
    for (const f of beats.flashes) {
      if (t >= f && t < f + 1 / FPS - 0.001) {
        ctx.fillStyle = 'rgba(225,240,255,0.17)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    // captions
    drawCaptions(ctx, t);

    // post: vignette
    ctx.save();
    const vg = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.28, W / 2, H * 0.5, H * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.62, 'rgba(0,0,0,0.10)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // post: boiling grain
    const fi = Math.round(t * FPS);
    const tile = grain[fi % 4];
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.save();
    const ox = (fi * 97) % 320, oy = (fi * 53) % 320;
    ctx.translate(-ox, -oy);
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W + 320, H + 320);
    ctx.restore();
  }

  return { draw, feedCanvas };
}
