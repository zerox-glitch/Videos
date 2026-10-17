// Event + sound cues. Exported to plan/beats.json by scripts/export-beats.mjs so
// picture and sound are driven by the same data. Times are ABSOLUTE seconds.
export const cuts = [
  { t: 3,  type: 'circle',  color: '#F2EEE4' },
  { t: 7,  type: 'shutter', color: '#0A0C0F' },
  { t: 12, type: 'circle',  color: '#C7FF3E' },
  { t: 18, type: 'shutter', color: '#0A0C0F' },
  { t: 22, type: 'circle',  color: '#C7FF3E' },
];

// [time, sound, gain, pan, duration]
export const cues = [
  // 0–3 hook
  [0.08, 'impact', 0.55, 0.0],
  [0.72, 'impact', 0.30, 0.0],
  [0.96, 'tick',   0.26, -0.2],
  [2.52, 'chime',  0.24, 0.1],
  [2.70, 'whoosh', 0.40, 0.0],

  // 3–7 no timeline
  [3.12, 'tick',   0.28, -0.15],
  [4.36, 'thud',   0.30, -0.1],
  [4.58, 'thud',   0.26, 0.15],
  [5.30, 'tick',   0.26, 0.1],
  [5.92, 'chime',  0.20, 0.2],
  [6.72, 'whoosh', 0.42, 0.0],

  // 7–12 math
  [7.10, 'tick',   0.26, -0.2],
  [7.36, 'tick',   0.20, 0.2],
  [8.02, 'draw',   0.26, 0.0],
  [10.15,'chime',  0.22, 0.1],
  [11.64,'whoosh', 0.44, 0.0],

  // 12–18 triptych
  [12.10,'tick',   0.26, -0.2],
  [12.72,'tick',   0.24, -0.3],
  [13.14,'tick',   0.24, 0.0],
  [13.56,'tick',   0.24, 0.3],
  [15.62,'draw',   0.22, 0.0, 0.9],
  [15.95,'tick',   0.14, -0.2],
  [16.35,'tick',   0.12, 0.1],
  [16.85,'tick',   0.12, 0.25],
  [17.35,'tick',   0.14, -0.1],
  [17.55,'riser',  0.26, 0.0],

  // 18–22 pipeline
  [18.05,'impact', 0.34, 0.0],
  [18.42,'tick',   0.22, -0.2],
  [18.78,'tick',   0.22, -0.1],
  [19.14,'tick',   0.22, 0.1],
  [19.50,'tick',   0.22, 0.2],
  [20.15,'type',   0.16, 0.0, 0.95],
  [20.72,'chime',  0.24, 0.0],
  [21.58,'whoosh', 0.42, 0.0],

  // 22–26 end card
  [22.02,'impact', 0.52, 0.0],
  [22.18,'tick',   0.24, 0.1],
  [23.46,'tick',   0.18, -0.1],
  [23.62,'tick',   0.18, 0.2],
  [24.12,'chime',  0.22, 0.0],
  [24.95,'shimmer',0.24, 0.0],
];
