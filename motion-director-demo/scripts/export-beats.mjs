#!/usr/bin/env node
// Writes plan/beats.json — the single timing source shared by picture and sound.
import { mkdir, writeFile } from 'node:fs/promises';
import { W, H, FPS, DURATION, scenes } from '../src/data.js';
import { cuts, cues } from '../src/timing.js';

const beats = {
  project: 'motion-video-director-demo',
  format: { width: W, height: H, fps: FPS, duration: DURATION, frames: Math.round(DURATION * FPS) },
  scenes: scenes.map((s, i) => ({ index: i + 1, ...s, frames: Math.round((s.end - s.start) * FPS) })),
  cuts,
  cues: cues.map(([t, sound, gain, pan, dur]) => ({
    t, frame: Math.round(t * FPS), sound, gain, pan, duration: dur ?? null,
  })),
};

await mkdir('plan', { recursive: true });
await writeFile('plan/beats.json', JSON.stringify(beats, null, 2) + '\n');
console.log(`plan/beats.json · ${beats.scenes.length} scenes · ${beats.cues.length} cues · ${beats.format.frames} frames`);
