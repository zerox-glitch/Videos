import { W, H, BEATS } from './data.js';
import { initReel, renderBackdrop, drawScene } from './scenes/reel.js';

const params = new URLSearchParams(location.search);
const scale = Math.max(0.05, Math.min(1, Number(params.get('scale')) || 1));
const output = document.getElementById('c');
const width = Math.max(2, 2 * Math.round((W * scale) / 2));
const height = Math.max(2, 2 * Math.round((H * scale) / 2));
output.width = width;
output.height = height;
const ctx = output.getContext('2d', { alpha: false, desynchronized: false });
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

const backdrop = document.createElement('canvas');
backdrop.width = width;
backdrop.height = height;
const gl = backdrop.getContext('webgl', {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: true,
  premultipliedAlpha: false,
  powerPreference: 'high-performance',
});
if (!gl) throw new Error('WebGL is unavailable in the selected headless Chromium.');

const assets = await initReel({ W, H, scale, gl, backdrop });
await document.fonts.load('700 64px "Space Grotesk"');
await document.fonts.load('400 28px "DM Sans"');
await document.fonts.ready;
if (!document.fonts.check('700 64px "Space Grotesk"') || !document.fonts.check('400 28px "DM Sans"')) {
  throw new Error('A required local font did not load; refusing to render with a fallback.');
}

window.renderFrame = (time) => {
  const t = Math.max(0, Number(time) || 0);
  renderBackdrop(gl, backdrop, t, { W, H, scale });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
  ctx.drawImage(backdrop, 0, 0, W, H);
  const beatNow = BEATS.find((item) => t >= item.start && t < item.end) || BEATS.at(-1);
  drawScene(ctx, t, { W, H, scale, assets, beat: beatNow, beats: BEATS });
  return true;
};
window.grab = (type = 'image/png', quality = 0.92) => output.toDataURL(type, quality);
window.__ready = true;
