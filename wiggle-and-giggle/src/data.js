// Palette, layout and song timeline for Wiggle & Giggle.
export const W = 1920;
export const H = 1080;

export const P = {
  wallTop: '#FFF7EC',
  wallBot: '#FFE9D4',
  wallBand: '#FBD9BC',
  rail: '#F0BC93',
  floor: '#F5C88F',
  floorDark: '#E6AF74',
  floorLine: '#D79A62',
  rug: '#FFD3DE',
  rug2: '#FFB3C7',
  rug3: '#FF96B1',
  rugEdge: '#FFF1E4',
  skyTop: '#7FD3F2',
  skyBot: '#CFF2FD',
  sun: '#FFD24A',
  sunDeep: '#FFB92E',
  cloud: '#FFFFFF',
  mint: '#7FD8C6',
  mintDark: '#5BBFAB',
  mintLight: '#B2EDE1',
  coral: '#FF8B7B',
  coralDark: '#E86C5D',
  yellow: '#FFD166',
  yellowDark: '#E8B33F',
  lavender: '#B9A7E8',
  lavenderDark: '#9A85D6',
  blue: '#7EC8F2',
  blueDark: '#5CA9D6',
  wood: '#E8B98C',
  woodDark: '#CE996A',
  cream: '#FFF8EE',
  ink: '#4A3B32',
  inkSoft: '#7A6357',
  pink: '#FF9EB8',
  green: '#6FCB8F',
  greenDark: '#4FA96E',
};

export const CAST = {
  milo: { x: 905, y: 902, s: 1.12 },
  pip: { x: 1138, y: 900, s: 1.02 },
};

/* song timeline (seconds) — 120 BPM, one bar = 2s */
export const SONG = {
  intro: [0, 9.0],
  verse1: [9.0, 21.0],
  chorus1: [21.0, 33.0],
  verse2: [33.0, 42.0],
  chorus2: [42.0, 54.0],
  bridge: [54.0, 66.0],
  outro: [66.0, 75.0],
  bpm: 120,
  bar: 2.0,
};

export const BEATS = {
  sunUp: 1.6,
  titleIn: 1.2,
  titleOut: 4.8,
  wake: 8.8,
  stand: 10.2,
  pointsUp: 12.4,
  chorus1: 21.0,
  toes: 21.4,
  clap: 23.4,
  nose: 25.4,
  dance: 27.4,
  pipWake: 34.4,
  pipUp: 37.0,
  hitChorus: 42.0,
  jump: 54.4,
  reach: 57.2,
  spin: 59.6,
  ground: 61.6,
  hooray: 63.2,
  endCard: 68.4,
};

export const LYRICS = [
  { t0: 9.4, t1: 12.1, text: 'Good morning, sun! Good morning, day!', hi: 'Good morning, sun!' },
  { t0: 12.2, t1: 15.2, text: 'Time to wake up and stretch and play!', hi: 'stretch and play!' },
  { t0: 15.4, t1: 18.2, text: 'Good morning, room! Good morning, me!', hi: 'Good morning, me!' },
  { t0: 18.3, t1: 21.0, text: 'A happy, hoppy, wiggly day — whee!', hi: 'wiggly day' },

  { t0: 21.4, t1: 23.3, text: 'Wiggle, wiggle, wiggle your toes!', hi: 'wiggle your toes' },
  { t0: 23.4, t1: 25.3, text: 'Clap, clap, clap your hands!', hi: 'clap your hands' },
  { t0: 25.4, t1: 27.3, text: 'Wiggle, wiggle, wiggle your nose!', hi: 'wiggle your nose' },
  { t0: 27.4, t1: 29.9, text: 'Now let’s do a little dance!', hi: 'little dance' },
  { t0: 30.0, t1: 33.0, text: 'La-la-la, la-la-la, wiggle and giggle!', hi: 'wiggle and giggle' },

  { t0: 33.4, t1: 36.2, text: 'Good morning, Pip! Good morning, pup!', hi: 'Good morning, Pip!' },
  { t0: 36.3, t1: 39.0, text: 'Time to wake up, get up, up, up!', hi: 'up, up, up!' },
  { t0: 39.1, t1: 42.0, text: 'Stretch your paws and wag your tail!', hi: 'wag your tail' },

  { t0: 42.4, t1: 44.3, text: 'Wiggle, wiggle, wiggle your toes!', hi: 'wiggle your toes' },
  { t0: 44.4, t1: 46.3, text: 'Clap, clap, clap your hands!', hi: 'clap your hands' },
  { t0: 46.4, t1: 48.3, text: 'Wiggle, wiggle, wiggle your nose!', hi: 'wiggle your nose' },
  { t0: 48.4, t1: 50.9, text: 'Now let’s do a little dance!', hi: 'little dance' },
  { t0: 51.0, t1: 54.0, text: 'La-la-la, la-la-la, wiggle and giggle!', hi: 'wiggle and giggle' },

  { t0: 54.6, t1: 57.1, text: 'Jump, jump, jump up high!', hi: 'jump up high' },
  { t0: 57.2, t1: 59.5, text: 'Reach, reach, reach the sky!', hi: 'reach the sky' },
  { t0: 59.6, t1: 62.0, text: 'Spin around and touch the ground!', hi: 'touch the ground' },
  { t0: 62.2, t1: 65.6, text: 'Hooray! Hooray! We did it!', hi: 'Hooray!' },

  { t0: 68.6, t1: 71.6, text: 'Wiggle and giggle, all day long!', hi: 'Wiggle and giggle' },
  { t0: 71.8, t1: 74.6, text: 'Sing it again — come on, sing along!', hi: 'sing along' },
];
