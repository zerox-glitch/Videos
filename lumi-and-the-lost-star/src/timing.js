// Captions, dissolves and the sound cue sheet. Absolute seconds.
// Exported to plan/beats.json by scripts/export-beats.mjs.
import { BEATS } from './data.js';

export const transitions = [
  { t: 12, dur: 0.9 },
  { t: 24, dur: 0.8 },
  { t: 36, dur: 0.9 },
  { t: 48, dur: 0.7 },
  { t: 60, dur: 1.4 },
];

export const fades = {
  in: { from: 0, dur: 1.4 },
  out: { at: 70.6, dur: 1.4 },
};

export const captions = [
  { start: 1.2,  end: 7.0,  text: 'In a quiet meadow, under a silver moon…' },
  { start: 7.4,  end: 11.4, text: 'lived a little firefly named Lumi.' },
  { start: 16.8, end: 20.4, text: 'One night, a star slipped out of the sky.' },
  { start: 20.7, end: 24.2, text: 'It landed with a bump.' },
  { start: 25.3, end: 30.6, text: 'The star was far too heavy for one little bug.' },
  { start: 31.9, end: 35.7, text: 'So Lumi called her friends.' },
  { start: 37.4, end: 42.2, text: 'Together, they lifted it higher…' },
  { start: 42.6, end: 47.3, text: '…higher than the tallest tree.' },
  { start: 50.9, end: 55.9, text: 'And the sky lit up like a smile.' },
  { start: 62.4, end: 66.0, text: 'Goodnight, little star.' },
];

// [time, sound, gain, pan, extra]
export const cues = [
  // ambience is generated separately from `ambience` below
  [0.6,  'crickets', 0.10, 0.0],

  // 1 · meadow
  [2.05, 'flutter', 0.20, -0.35],
  [4.55, 'flutter', 0.16, -0.1],
  [6.40, 'flutter', 0.14, 0.05],
  [6.95, 'twinkle', 0.14, -0.05],

  // 2 · the fall
  [13.02, 'whooshBig', 0.42, 0.25, 1.0],
  [14.02, 'impact', 0.50, 0.15],
  [14.20, 'dust', 0.24, 0.15],
  [14.60, 'flutter', 0.18, -0.3],
  [16.40, 'flutter', 0.14, -0.15],
  [18.55, 'flicker', 0.20, 0.1],
  [19.10, 'flicker', 0.16, 0.1],
  [21.40, 'strain', 0.20, 0.0],
  [22.60, 'thud', 0.30, 0.05],
  [23.30, 'sigh', 0.18, 0.0],

  // 3 · too heavy
  [25.30, 'strain', 0.26, 0.0, 1.1],
  [26.55, 'thud', 0.34, 0.05],
  [27.20, 'flutter', 0.14, -0.1],
  [28.45, 'strain', 0.30, 0.0, 1.2],
  [29.85, 'thud', 0.40, 0.05],
  [30.60, 'sigh', 0.24, 0.0],
  [31.15, 'idea', 0.30, 0.0],
  [31.80, 'pulse', 0.26, 0.0],
  // friends arrive on rising pitches — a little melody of entrances
  [32.20, 'pop', 0.26, -0.4, 0],
  [32.85, 'pop', 0.24, -0.15, 1],
  [33.45, 'pop', 0.24, 0.15, 2],
  [34.00, 'pop', 0.22, 0.35, 3],
  [34.55, 'pop', 0.22, -0.05, 4],
  [35.10, 'chime', 0.16, 0.0],

  // 4 · the lift
  [36.30, 'thread', 0.20, 0.0],
  [38.00, 'heave', 0.40, 0.0],
  [38.30, 'liftoff', 0.34, 0.0, 2.2],
  [41.40, 'windGust', 0.22, 0.2],
  [45.20, 'shimmer', 0.18, 0.0],

  // 5 · release
  [48.00, 'chime', 0.30, 0.0],
  [49.60, 'riser', 0.22, 0.0, 1.0],
  [50.60, 'burst', 0.55, 0.0],
  [51.20, 'sparkleCascade', 0.34, 0.0, 2.4],
  [52.40, 'flutter', 0.16, -0.4],
  [53.20, 'flutter', 0.16, 0.4],
  [56.20, 'chime', 0.20, 0.0],

  // 6 · goodnight
  [61.60, 'yawn', 0.22, 0.0],
  [63.60, 'sigh', 0.14, 0.0],
  [66.00, 'titleChime', 0.30, 0.0],
  [69.80, 'twinkle', 0.16, 0.1],
];

// Continuous beds: [start, end, sound, gain]
export const beds = [
  [0, 72, 'crickets', 0.045],
  [12.5, 24, 'nightWind', 0.050],
  [36.5, 48, 'highWind', 0.060],
  [48, 60, 'highWind', 0.045],
  [60, 72, 'nightWind', 0.035],
];

// Music arrangement: 24 bars of 4/4 at 80 BPM = 72 s exactly.
export const music = {
  bpm: 80,
  bars: 24,
  beatsPerBar: 4,
  // One chord per bar. F major: I–vi–IV–V.
  chords: [
    'F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C',
    'Bb', 'C', 'Dm', 'Bb', 'F', 'Bb', 'C', 'C',
    'F', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'F',
  ],
  // Melody phrases: [bar, beat, lengthInBeats, midiNote, velocity]
  melody: [
    // phrase A — wonder (bars 0–3)
    [1, 0, 1.5, 76, 0.55], [1, 2, 1, 72, 0.45], [1, 3, 1, 69, 0.4],
    [2, 0, 1.5, 77, 0.5], [2, 2, 1, 72, 0.42], [2, 3, 1, 69, 0.38],
    [3, 0, 1.5, 74, 0.52], [3, 2, 1, 70, 0.42], [3, 3, 1, 65, 0.36],
    // phrase B — curiosity (bars 4–7)
    [4, 0, 1, 72, 0.6], [4, 1, 1, 76, 0.55], [4, 2, 2, 79, 0.6],
    [5, 0, 1.5, 77, 0.55], [5, 2, 1, 74, 0.5], [5, 3, 1, 72, 0.45],
    [6, 0, 1.5, 74, 0.55], [6, 2, 1, 70, 0.48], [6, 3, 1, 74, 0.5],
    [7, 0, 2, 72, 0.55], [7, 2, 1, 67, 0.42], [7, 3, 1, 69, 0.44],
    // phrase C — effort (bars 8–11)
    [8, 0, 1, 70, 0.6], [8, 1, 1, 74, 0.55], [8, 2, 1.5, 77, 0.6], [8, 3.5, 0.5, 79, 0.45],
    [9, 0, 1.5, 76, 0.6], [9, 2, 1, 72, 0.5], [9, 3, 1, 74, 0.5],
    [10, 0, 1, 74, 0.55], [10, 1, 1, 77, 0.55], [10, 2, 2, 81, 0.62],
    [11, 0, 1.5, 79, 0.6], [11, 2, 1, 77, 0.5], [11, 3, 1, 74, 0.5],
    // phrase D — lift (bars 12–15)
    [12, 0, 2, 77, 0.62], [12, 2, 1, 81, 0.6], [12, 3, 1, 79, 0.55],
    [13, 0, 1.5, 77, 0.6], [13, 2, 1, 74, 0.5], [13, 3, 1, 77, 0.55],
    [14, 0, 1.5, 79, 0.62], [14, 2, 1, 76, 0.55], [14, 3, 1, 72, 0.5],
    [15, 0, 2, 74, 0.58], [15, 2, 2, 76, 0.6],
    // phrase E — climax (bars 16–19)
    [16, 0, 1, 84, 0.68], [16, 1, 1, 81, 0.6], [16, 2, 2, 77, 0.62],
    [17, 0, 1, 82, 0.65], [17, 1, 1, 79, 0.58], [17, 2, 2, 74, 0.55],
    [18, 0, 1, 84, 0.68], [18, 1, 1, 79, 0.6], [18, 2, 1, 76, 0.55], [18, 3, 1, 79, 0.58],
    [19, 0, 2, 81, 0.66], [19, 2, 1, 77, 0.55], [19, 3, 1, 74, 0.55],
    // phrase F — goodnight (bars 20–23)
    [20, 0, 1.5, 77, 0.55], [20, 2, 1, 74, 0.45], [20, 3, 1, 72, 0.42],
    [21, 0, 1.5, 77, 0.5], [21, 2, 1, 81, 0.45],
    [22, 0, 2, 79, 0.48], [22, 2, 1, 76, 0.4], [22, 3, 1, 72, 0.4],
    [23, 0, 3.5, 77, 0.5],
  ],
};

export { BEATS };
