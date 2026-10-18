// beats.js — loads the locked plan/beats.json (fs in node, fetch in browser).
import { createRequire } from 'node:module';

function loadBeats() {
  if (typeof window === 'undefined') {
    const require = createRequire(import.meta.url);
    const path = require('path');
    const fs = require('fs');
    const { fileURLToPath } = require('url');
    const here = path.dirname(fileURLToPath(import.meta.url));
    return JSON.parse(fs.readFileSync(path.resolve(here, '..', 'plan', 'beats.json'), 'utf8'));
  }
  throw new Error('beats.js: browser fetch path not needed');
}

export const beats = loadBeats();
export const SECTIONS = beats.sections;
export const DUR = beats.meta.dur;
export const FPS = beats.meta.fps;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const EV_G = {};
for (const [id, t] of Object.entries(beats.events)) EV_G[id] = { id, t };

export function ev(idOrSec, maybeId) {
  const id = maybeId !== undefined ? maybeId : idOrSec;
  return EV_G[id] || { t: -1 };
}
export function prog(t, id, dur) {
  const e = EV_G[id];
  if (!e) return 0;
  return clamp01((t - e.t) / dur);
}
export function sectionAt(t) {
  return SECTIONS.find((s) => t >= s.t0 && t < s.t1) || SECTIONS[SECTIONS.length - 1];
}
