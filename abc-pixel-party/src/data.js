// Static configuration + the timing source (plan/beats.json).
import beats from '../plan/beats.json' with { type: 'json' };

export { beats };

export const PW = 480;   // internal pixel canvas (the "native res")
export const PH = 270;
export const UP = 4;     // nearest-neighbour upscale → 1920×1080

// ---------------------------------------------------------------- ui palette
export const UI = {
  ink: '#26243B',
  inkSoft: '#4A4866',
  paper: '#FFFFFF',
  karaokePast: '#FFB020',
  karaokeNow: '#FF8A3D',
  karaokeFuture: '#6B688A',
  accent: '#FFD23F',
  blush: '#FFA6CE',
  mint: '#43C465',
};

// card colours, cycled across the wall
export const CARD_COLORS = [
  '#FF6B6B', '#FFD23F', '#3D8BFD', '#43C465',
  '#FF9F1C', '#A45BE8', '#F062A6', '#45D6E6',
];

// ---------------------------------------------------------------- objects
// letter → sprite key (the whole point of the video)
export const OBJECTS = {
  A: 'apple', B: 'ball', C: 'cat', D: 'dog', E: 'egg', F: 'fish',
  G: 'grapes', H: 'hat', I: 'igloo', J: 'juice', K: 'kite', L: 'lion',
  M: 'moon', N: 'nest', O: 'owl', P: 'pig', Q: 'queen', R: 'rabbit',
  S: 'sun', T: 'tree', U: 'umbrella', V: 'van', W: 'watch', X: 'xylophone',
  Y: 'yoyo', Z: 'zebra',
};

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// word per letter (used by finale parade + showcase copy)
export const WORDS = {
  Apple: 1, Ball: 1, Cat: 1, Dog: 1, Egg: 1, Fish: 1, Grapes: 1, Hat: 1,
  Igloo: 1, Juice: 1, Kite: 1, Lion: 1, Moon: 1, Nest: 1, Owl: 1, Pig: 1,
  Queen: 1, Rabbit: 1, Sun: 1, Tree: 1, Umbrella: 1, Van: 1, Watch: 1,
  Xylophone: 1, Yoyo: 1, Zebra: 1,
};

// ---------------------------------------------------------------- wall layout
export const WALL = {
  cols: 7, rows: 4,
  cw: 46, chh: 36,   // card w / h
  gx: 6, gy: 6,
  get w() { return this.cols * this.cw + (this.cols - 1) * this.gx; },
  get h() { return this.rows * this.chh + (this.rows - 1) * this.gy; },
  get x0() { return Math.round((PW - this.w) / 2); },
  get y0() { return 38; },
};

export function wallSlot(i) {
  const c = i % WALL.cols, r = Math.floor(i / WALL.cols);
  return {
    x: WALL.x0 + c * (WALL.cw + WALL.gx),
    y: WALL.y0 + r * (WALL.chh + WALL.gy),
  };
}

// ---------------------------------------------------------------- sections
export function sectionAt(t) {
  const S = beats.sections;
  if (t < S.intro[1]) return 'intro';
  if (t < S.song1[1]) return 'song1';
  if (t < S.interlude[1]) return 'interlude';
  if (t < S.showcase[1]) return 'showcase';
  if (t < S.song2[1]) return 'song2';
  return 'finale';
}
