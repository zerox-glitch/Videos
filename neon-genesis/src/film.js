// Master timeline: which chapter owns a frame, plus global helpers.
import * as spark from './scenes/spark.js';
import * as genesis from './scenes/genesis.js';
import * as velocity from './scenes/velocity.js';
import * as ascension from './scenes/ascension.js';
import * as collapse from './scenes/collapse.js';
import * as title from './scenes/title.js';

const CHAPTERS = [
  [0.0, 4.0, spark],
  [4.0, 10.0, genesis],
  [10.0, 16.0, velocity],
  [16.0, 22.0, ascension],
  [22.0, 27.0, collapse],
  [27.0, 30.0, title],
];

export function drawFrame(ctx, t, W, H) {
  let ch = CHAPTERS[CHAPTERS.length - 1];
  for (const c of CHAPTERS) if (t >= c[0] && t < c[1]) { ch = c; break; }
  if (t < CHAPTERS[0][0]) ch = CHAPTERS[0];
  ch[2].draw(ctx, t - ch[0], { W, H, t });
}
