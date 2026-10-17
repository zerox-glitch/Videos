// Design dimensions and the ONE timing source for the whole piece.
// Every scene is a pure function of absolute time (seeded, no clocks, no state).
export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 26;

export const scenes = [
  { id: 'hook',      start: 0,  end: 3  },
  { id: 'notimeline',start: 3,  end: 7  },
  { id: 'math',      start: 7,  end: 12 },
  { id: 'triptych',  start: 12, end: 18 },
  { id: 'pipeline',  start: 18, end: 22 },
  { id: 'endcard',   start: 22, end: 26 },
];

// Palette — 60% ink / 30% cream / 10% lime, ember used sparingly as a second accent.
export const C = {
  ink:    '#0A0C0F',
  ink2:   '#14181E',
  cream:  '#F2EEE4',
  lime:   '#C7FF3E',
  ember:  '#FF5A2A',
  muted:  '#8B939E',
  line:   'rgba(242,238,228,0.16)',
  inkLine:'rgba(10,12,15,0.16)',
};

// Font aliases are registered in draw.js from assets/fonts (OFL).
export const F = {
  display: 'Display',      // Space Grotesk 700
  displayMed: 'Display Medium', // Space Grotesk 500
  text: 'Text',            // Inter 400
  textMed: 'Text Medium',  // Inter 500
  textSemi: 'Text Semi',   // Inter 600
  mono: 'Mono',            // JetBrains Mono 400
  monoBold: 'Mono Bold',   // JetBrains Mono 700
};
