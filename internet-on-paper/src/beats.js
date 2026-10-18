// beats.js — shared loader for plan/beats.json (no cycles: film + scenes both import).
import { readFileSync } from 'node:fs';

export const beats = JSON.parse(
  readFileSync(new URL('../plan/beats.json', import.meta.url), 'utf8'));

export const EV = beats.events;
export const ev = (id) => EV[id];                 // absolute event time
export const has = (t, id) => t >= EV[id];        // event fired?
export const prog = (t, id, dur) => Math.max(0, Math.min(1, (t - EV[id]) / dur));
export const vis = (t, id, off = 0, dur = 0.35) => {
  const s = t - (EV[id] + off);
  if (s < 0) return 0;
  return s >= dur ? 1 : s / dur;
};
export const sectionAt = (t) =>
  beats.sections.find((s) => t >= s.t0 && t < s.t1) || beats.sections[beats.sections.length - 1];
