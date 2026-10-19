import beatSheet from '../plan/beats.json' with { type: 'json' };

export const W = 1080;
export const H = 1920;
export const FPS = beatSheet.fps;
export const DURATION = beatSheet.duration;
export const BEATS = beatSheet.beats;
export const beat = (id) => BEATS.find((item) => item.id === id);
