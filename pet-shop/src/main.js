import { drawPetScene } from './pet-scene.js';

const W = 1080;
const H = 1920;
const params = new URLSearchParams(location.search);
const scale = Math.max(0.05, Math.min(1, Number(params.get('scale')) || 1));
const canvas = document.getElementById('c');
const width = Math.max(2, 2 * Math.round((W * scale) / 2));
const height = Math.max(2, 2 * Math.round((H * scale) / 2));
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: false });
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load project asset: ${url}`));
    image.src = url;
  });
}

const [hero, cat, products, beatResponse] = await Promise.all([
  loadImage('/assets/ai/pet-shop/pet-shop-hero.png'),
  loadImage('/assets/ai/pet-shop/pet-shop-cat.png'),
  loadImage('/assets/ai/pet-shop/pet-shop-products.png'),
  fetch('/pet-shop/plan/beats.json'),
]);
if (!beatResponse.ok) throw new Error('Unable to load the pet-shop beat plan.');
const beatSheet = await beatResponse.json();
const assets = { hero, cat, products };
await document.fonts.load('700 64px "Space Grotesk"');
await document.fonts.load('500 28px "DM Sans"');
await document.fonts.ready;
if (!document.fonts.check('700 64px "Space Grotesk"') || !document.fonts.check('500 28px "DM Sans"')) {
  throw new Error('A required local font did not load; refusing to render with a fallback.');
}

window.renderFrame = (time) => {
  const t = Math.max(0, Number(time) || 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
  drawPetScene(ctx, t, { W, H, assets, beats: beatSheet.beats });
  return true;
};
window.grab = (type = 'image/png', quality = 0.92) => canvas.toDataURL(type, quality);
window.__ready = true;
