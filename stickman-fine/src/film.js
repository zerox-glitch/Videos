// film.js — global timeline: section dispatch, camera, iris wipes, impact
// frames, fades. Every frame is a pure function of t.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { paper, impact, Ink } from './lib/ink.js';
import { ease, easeIn, easeOut, scene_intro, scene_joke1, scene_joke2, scene_joke3, scene_joke4, scene_joke5, scene_outro } from './scenes.js';

const here = dirname(fileURLToPath(import.meta.url));
export const beats = JSON.parse(readFileSync(join(here, '..', 'plan', 'beats.json'), 'utf8'));

const SCENES = {
  intro: scene_intro, joke1: scene_joke1, joke2: scene_joke2, joke3: scene_joke3,
  joke4: scene_joke4, joke5: scene_joke5, outro: scene_outro,
};

// camera base per section: [cx, cy, z0, z1]
const BASE = {
  intro: [960, 620, 1.00, 1.03],
  joke1: [860, 640, 1.00, 1.04],
  joke2: [960, 640, 1.00, 1.03],
  joke3: [960, 640, 1.00, 1.03],
  joke4: [900, 660, 1.00, 1.03],
  joke5: [960, 700, 1.00, 1.03],
  outro: [960, 600, 1.02, 1.06],
};

// event-driven camera moves (snap-zoom / pan) — never random shake
const CAM = [
  { at: 'museum_case',    cx: 785,  cy: 660, z: 1.14, dur: 0.22 },
  { at: 'stamp_espresso', cx: 1210, cy: 500, z: 1.12, dur: 0.20 },
  { at: 'envelope_clunk', cx: 960,  cy: 560, z: 1.13, dur: 0.20 },
  { at: 'deadpan_zoom',   cx: 668,  cy: 604, z: 1.75, dur: 0.18 },
  { at: 'split_panel',    cx: 960,  cy: 540, z: 1.00, dur: 0.25 },
  { at: 'duck_reveal',    cx: 1050, cy: 660, z: 1.06, dur: 0.90 },
  { at: 'endcard',        cx: 960,  cy: 470, z: 1.07, dur: 0.16 },
];

const IMPACTS = ['museum_case', 'flash1', 'flash2', 'flash3', 'stamp_espresso',
  'envelope_clunk', 'badge', 'stamp_proud', 'duck_reveal', 'endcard'];

const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
const lerp = (a, b, u) => a + (b - a) * u;

export function sectionOf(t) {
  for (const s of beats.sections) if (t >= s.t0 && t < s.t1) return s;
  return beats.sections[beats.sections.length - 1];
}

function camera(t) {
  const sec = sectionOf(t);
  const [bcx, bcy, z0, z1] = BASE[sec.name] || [960, 620, 1, 1];
  const u = clamp01((t - sec.t0) / (sec.t1 - sec.t0));
  let cx = bcx, cy = bcy, z = lerp(z0, z1, u);
  // latest passed event inside this section wins
  let last = null;
  for (const c of CAM) {
    const at = beats.events[c.at];
    if (at >= sec.t0 && at <= t && at < sec.t1) last = c;
  }
  if (last) {
    const k = easeOut(clamp01((t - beats.events[last.at]) / last.dur));
    cx = lerp(cx, last.cx, k); cy = lerp(cy, last.cy, k); z = lerp(z, last.z, k);
  }
  return { cx, cy, z };
}

function drawIris(ctx, t, W, H) {
  const R0 = 1160;
  let r = null;
  for (const b of beats.iris) {
    if (t >= b - 0.25 && t <= b) r = R0 * (1 - easeIn((b - t) / 0.25));
    if (t > b && t <= b + 0.25) r = R0 * easeOut((t - b) / 0.25);
  }
  // final close on the endcard
  if (t >= 71.15) r = Math.min(r === null ? R0 : r, R0 * (1 - easeIn(clamp01((t - 71.15) / 0.38))));
  if (r === null) return;
  r = Math.max(0.01, r);
  ctx.save();
  ctx.fillStyle = '#100E14';
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
  ctx.fill('evenodd');
  ctx.restore();
}

export function drawFilm(ctx, t) {
  const W = 1920, H = 1080;
  ctx.save();
  ctx.fillStyle = '#0C0B10';
  ctx.fillRect(0, 0, W, H);

  // camera transform
  const cam = camera(t);
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.cx, -cam.cy);

  // scene
  const sec = sectionOf(t);
  const sc = { T: t, at: beats.events, beats, sec };
  (SCENES[sec.name] || scene_intro)(ctx, W, H, sc);
  ctx.restore();

  // screen-space overlays
  for (const id of IMPACTS) impact(ctx, t, beats.events[id], W, H);
  drawIris(ctx, t, W, H);

  // fades (in from paper, out to black)
  const [f0, f1] = beats.fade.in, [g0, g1] = beats.fade.out;
  if (t < f1) {
    ctx.save(); ctx.globalAlpha = 1 - (t - f0) / (f1 - f0);
    ctx.fillStyle = '#FFFDF6'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (t > g0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (t - g0) / (g1 - g0));
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}
