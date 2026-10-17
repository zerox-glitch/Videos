// Lumi & the Lost Star — a wordless storybook short.
// Design space is 1920×1080 at 24 fps; every frame is a pure function of time.
export const W = 1920;
export const H = 1080;
export const FPS = 24;
export const DURATION = 72;

export const scenes = [
  { id: 'meadow',  start: 0,  end: 12 }, // a quiet meadow, and Lumi
  { id: 'fall',    start: 12, end: 24 }, // a star slips out of the sky
  { id: 'heavy',   start: 24, end: 36 }, // too heavy for one little bug
  { id: 'lift',    start: 36, end: 48 }, // together, they lift it
  { id: 'release', start: 48, end: 60 }, // and the sky lights up
  { id: 'night',   start: 60, end: 72 }, // goodnight
];

/* Night palette: deep indigo sky, teal horizon, warm moon, one golden star. */
export const C = {
  skyTop:   '#040617',
  skyMid:   '#0C1436',
  skyLow:   '#1B3157',
  horizon:  '#2E5A70',
  dawn:     '#6A4A72',
  dawnLow:  '#C97B6B',

  moon:     '#FFF6DE',
  moonShade:'#E8D9B4',
  starLight:'#FFF3C4',
  star:     '#FFC94A',
  starDeep: '#E09A22',
  starDim:  '#8B7B58',

  lumi:     '#FFD166',
  lumiBelly:'#FFEDBC',
  lumiWing: '#BFE9FF',
  lumiGlow: '#C9F76F',
  cheek:    '#FF9E7A',
  ink:      '#241C2E',

  friend:   ['#C9F76F', '#7FE7C4', '#FFB3D9', '#9FD0FF', '#FFD166'],

  hillFar:  '#141C42',
  hillMid:  '#0D1434',
  hillNear: '#070C22',
  grass:    '#050A1B',
  rim:      'rgba(126,206,224,0.45)',

  cream:    '#FFF6E5',
  paper:    '#F7EFDF',
};

export const F = {
  display: 'Baloo',
  displayBold: 'Baloo Bold',
  text: 'Nunito',
  textBold: 'Nunito Bold',
  round: 'Fredoka',
};

/* Where the story beats happen (seconds). Shared with the cue sheet. */
export const BEATS = {
  starFall: 13.0,
  starLand: 14.05,
  firstLift: 25.2,
  secondLift: 28.4,
  idea: 31.15,
  friendsAt: 32.2,
  liftOff: 38.0,
  cloudPass: 41.4,
  release: 48.0,
  burst: 50.6,
  captionEnd: 56.2,
  landHome: 61.6,
  title: 66.0,
};
