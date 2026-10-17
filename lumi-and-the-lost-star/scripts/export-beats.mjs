#!/usr/bin/env node
// plan/beats.json — the single timing sheet shared by picture, captions and sound.
import { mkdir, writeFile } from 'node:fs/promises';
import { W, H, FPS, DURATION, scenes, BEATS } from '../src/data.js';
import { captions, cues, beds, music, transitions, fades } from '../src/timing.js';

const beats = {
  project: 'lumi-and-the-lost-star',
  duration: DURATION,
  format: { width: W, height: H, fps: FPS, frames: Math.round(DURATION * FPS) },
  story: BEATS,
  scenes: scenes.map((s, i) => ({ index: i + 1, ...s, frames: Math.round((s.end - s.start) * FPS) })),
  transitions,
  fades,
  captions,
  cues: cues.map(([t, sound, gain, pan, extra]) => ({
    t, frame: Math.round(t * FPS), sound, gain, pan, extra: extra ?? null,
  })),
  beds,
  music: { ...music, beatSeconds: 60 / music.bpm, barSeconds: (60 / music.bpm) * 4 },
};

await mkdir('plan', { recursive: true });
await writeFile('plan/beats.json', JSON.stringify(beats, null, 2) + '\n');
console.log(`plan/beats.json · ${beats.scenes.length} scenes · ${beats.captions.length} captions · ${beats.cues.length} cues · ${beats.format.frames} frames`);
