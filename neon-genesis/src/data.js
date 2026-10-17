// NEON GENESIS — design constants, palette and the master timeline.
export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 30;

/* Chapters (absolute seconds) */
export const CH = {
  sparkEnd: 4.0,
  cityEnd: 10.0,
  velocityEnd: 16.0,
  moonEnd: 22.0,
  collapseEnd: 27.0,
  end: 30.0,
};

/* Story beats shared by picture and sound */
export const BEAT = {
  sparkIn: 0.55,
  orbitIn: 1.35,
  implode: 3.05,
  blast: 3.45,
  gridBirth: 3.75,
  firstTower: 4.45,
  skylineDone: 9.2,
  dive: 10.2,
  speedRamp: 14.2,
  ascent: 16.0,
  moonReveal: 17.4,
  ringAlign: 20.1,
  pulse: 22.2,
  freeze: 22.55,
  collapse: 23.2,
  chipForm: 25.9,
  titleIn: 27.3,
  taglineIn: 28.1,
  finalPulse: 29.35,
  black: 29.78,
};

/* Palette — deep black, cyan, electric purple, hot magenta, cold fog */
export const C = {
  black: '#020309',
  void: '#010104',
  skyTop: '#03040E',
  skyMid: '#070B22',
  skyLow: '#0C1738',
  horizon: '#14315A',
  fog: '#0A1733',
  fogWarm: '#241B45',
  cyan: '#37F2FF',
  cyanSoft: '#8CF7FF',
  cyanDeep: '#0A8FA8',
  purple: '#7B4DFF',
  purpleSoft: '#B18CFF',
  magenta: '#FF2E9A',
  magentaSoft: '#FF7AC4',
  amber: '#FFB259',
  white: '#EAF6FF',
  steel: '#0B1220',
  steelLight: '#16233A',
  chip: '#071019',
  chipLine: '#123447',
};

export const F = {
  title: 'Michroma',
  display: 'Chakra Bold',
  text: 'Chakra',
  light: 'Chakra Light',
  mono: 'Mono',
  grotesk: 'Grotesk',
};

/* Moon */
export const MOON = {
  pos: [0, 860, -2250],
  r: 620,
};

/* City extents */
export const CITY = {
  xMin: -1700, xMax: 1700,
  zMin: -2300, zMax: 900,
  block: 86,
};
