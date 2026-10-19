const DISPLAY = '"Space Grotesk", Arial, sans-serif';
const BODY = '"DM Sans", Arial, sans-serif';
const C = {
  cream: '#FFF6EA', cream2: '#F8EBDD', ink: '#29233A', plum: '#321B54',
  purple: '#6B4EFF', purple2: '#563CE0', lilac: '#E7DFFF', coral: '#FF6D7A',
  coralPale: '#FFE3E6', lime: '#C8F16D', sky: '#91DDF1', white: '#FFFFFF',
  gray: '#756F7D', line: '#E8DFD3', green: '#227A59',
};
const HEADER = 122;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (p) => { p = clamp(p); return 1 - Math.pow(1 - p, 3); };
const easeInOut = (p) => { p = clamp(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const lerp = (a, b, p) => a + (b - a) * p;

function roundPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function rounded(ctx, x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
  roundPath(ctx, x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function circle(ctx, x, y, r, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function setFont(ctx, size, weight = 600, family = BODY) {
  ctx.font = `${weight} ${size}px ${family}`;
}

function text(ctx, value, x, y, size, color = C.ink, weight = 600, family = BODY, align = 'left', shadow = null) {
  ctx.save();
  setFont(ctx, size, weight, family);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = shadow.color || 'rgba(35,18,56,.34)';
    ctx.shadowBlur = shadow.blur || 16;
    ctx.shadowOffsetY = shadow.y || 4;
  }
  ctx.fillText(value, x, y);
  ctx.restore();
}

function fitText(ctx, value, x, y, maxWidth, size, color = C.ink, weight = 700, family = DISPLAY, align = 'left') {
  ctx.save();
  let current = size;
  setFont(ctx, current, weight, family);
  while (ctx.measureText(value).width > maxWidth && current > 17) {
    current -= 1;
    setFont(ctx, current, weight, family);
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
  ctx.restore();
  return current;
}

function popText(ctx, value, x, y, width, size, color, progress, align = 'left') {
  const p = clamp(progress);
  if (!p) return;
  const e = easeOut(p);
  ctx.save();
  ctx.globalAlpha = e;
  ctx.translate(0, (1 - e) * 26);
  ctx.scale(.96 + .04 * e, .96 + .04 * e);
  ctx.shadowColor = 'rgba(35,18,56,.34)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 5;
  fitText(ctx, value, x, y, width, size, color, 700, DISPLAY, align);
  ctx.restore();
}

function pill(ctx, x, y, w, h, label, fill = C.lime, fg = C.ink, size = 17, stroke = null) {
  ctx.save();
  rounded(ctx, x, y, w, h, h / 2, fill, stroke, 1.5);
  setFont(ctx, size, 700, DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function button(ctx, x, y, w, h, label, fill = C.coral, fg = C.ink, size = 22, time = 0, pressed = 0) {
  const press = clamp(pressed);
  ctx.save();
  ctx.shadowColor = fill === C.purple ? 'rgba(55,31,117,.25)' : 'rgba(255,109,122,.30)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 7 - press * 4;
  rounded(ctx, x, y + press * 3, w, h - press * 3, 22, fill, 'rgba(255,255,255,.42)', 1.4);
  ctx.shadowColor = 'transparent';
  setFont(ctx, size, 700, DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(label, x + 27, y + h / 2 + 1 + press * 2);
  const ax = x + w - 34, ay = y + h / 2 + press * 2;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(ax - 10, ay); ctx.lineTo(ax + 8, ay);
  ctx.lineTo(ax + 1, ay - 7); ctx.moveTo(ax + 8, ay); ctx.lineTo(ax + 1, ay + 7);
  ctx.stroke();
  ctx.restore();
}

function imageCover(ctx, image, x, y, w, h, focusX = .5, focusY = .5, radius = 0, source = null) {
  if (!image || !image.complete || !image.naturalWidth) return;
  let sx = source?.x ?? 0;
  let sy = source?.y ?? 0;
  let sw = source?.w ?? image.naturalWidth;
  let sh = source?.h ?? image.naturalHeight;
  const ratio = w / h;
  if (sw / sh > ratio) {
    const nextW = sh * ratio;
    sx += clamp(focusX, 0, 1) * (sw - nextW);
    sw = nextW;
  } else {
    const nextH = sw / ratio;
    sy += clamp(focusY, 0, 1) * (sh - nextH);
    sh = nextH;
  }
  ctx.save();
  if (radius) { roundPath(ctx, x, y, w, h, radius); ctx.clip(); }
  else { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function gradientShade(ctx, x, y, w, h, start, end, color = '35,18,56', horizontal = false) {
  const g = horizontal
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(${color},${start})`);
  g.addColorStop(1, `rgba(${color},${end})`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function star(ctx, x, y, outer, inner, fill, rotation = 0, points = 8) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + i * Math.PI / points;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function paw(ctx, x, y, size, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y + size * .18, size * .30, size * .23, -.08, 0, Math.PI * 2);
  ctx.fill();
  [[-.31, -.20, -.10], [-.10, -.38, -.04], [.14, -.38, .04], [.34, -.19, .10]].forEach(([dx, dy, tilt]) => {
    ctx.beginPath();
    ctx.ellipse(x + dx * size, y + dy * size, size * .105, size * .145, tilt, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function logoMark(ctx, x, y, size, fill = C.coral) {
  ctx.save();
  ctx.shadowColor = 'rgba(72,41,80,.15)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  rounded(ctx, x, y, size, size, size * .34, fill);
  ctx.shadowColor = 'transparent';
  paw(ctx, x + size * .50, y + size * .52, size * .68, C.cream);
  star(ctx, x + size * .78, y + size * .23, size * .10, size * .045, C.lime, .15, 5);
  ctx.restore();
}

function bagIcon(ctx, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  roundPath(ctx, x - 13, y - 7, 26, 24, 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 6); ctx.bezierCurveTo(x - 7, y - 18, x + 7, y - 18, x + 7, y - 6);
  ctx.stroke();
  ctx.restore();
}

function drawHeader(ctx, route, time = 0, bagCount = 0) {
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, 1080, HEADER);
  ctx.fillStyle = 'rgba(41,35,58,.10)';
  ctx.fillRect(0, HEADER - 2, 1080, 2);
  logoMark(ctx, 42, 24, 70, C.coral);
  text(ctx, 'GOOD PET CLUB', 130, 59, 25, C.ink, 700, DISPLAY);
  text(ctx, 'EVERYDAY PET GOODS', 132, 84, 12, C.gray, 700, DISPLAY);
  const links = [
    { id: 'shop', label: 'SHOP', x: 590, w: 55 },
    { id: 'dogs', label: 'DOGS', x: 676, w: 58 },
    { id: 'cats', label: 'CATS', x: 763, w: 53 },
  ];
  links.forEach((item) => {
    const active = route === item.id;
    text(ctx, item.label, item.x, 69, 17, active ? C.purple : C.ink, 700, DISPLAY);
    if (active) rounded(ctx, item.x, 89, item.w, 4, 2, C.coral);
  });
  const hover = route === 'bag';
  rounded(ctx, 862, 26, 171, 68, 22, hover ? C.lilac : C.white, hover ? C.purple : C.line, 1.5);
  bagIcon(ctx, 891, 60, C.ink);
  text(ctx, 'BAG', 914, 68, 17, C.ink, 700, DISPLAY);
  if (bagCount > 0) {
    const age = Math.max(0, time);
    const intro = easeOut(age / .14);
    const bounce = .64 + .36 * intro + .13 * Math.sin(age * 13) * Math.exp(-age * 5);
    ctx.save();
    ctx.translate(1004, 46);
    ctx.scale(bounce, bounce);
    circle(ctx, 0, 0, 18, C.purple);
    text(ctx, '1', 0, 6, 16, C.white, 700, DISPLAY, 'center');
    ctx.restore();
  } else {
    const breathe = .48 + .14 * Math.sin(time * 2.4);
    circle(ctx, 1004, 60, 4, `rgba(107,78,255,${breathe})`);
  }
}

function pageTag(ctx, label, x, y, fill = C.lime, fg = C.ink) {
  const w = Math.min(560, Math.max(205, label.length * 11 + 36));
  pill(ctx, x, y, w, 45, label, fill, fg, 16);
}

function iconPaw(ctx, x, y, size, color, plate = null) {
  if (plate) circle(ctx, x, y, size * .62, plate);
  paw(ctx, x, y, size * .82, color);
}

function categoryCard(ctx, x, y, w, h, label, sub, fill, iconColor, index, time = 0) {
  const bob = Math.sin(time * 2.2 + index * .8) * 2.5;
  ctx.save();
  ctx.shadowColor = 'rgba(41,35,58,.12)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 7;
  rounded(ctx, x, y + bob, w, h, 28, fill, 'rgba(255,255,255,.64)', 1.5);
  ctx.shadowColor = 'transparent';
  iconPaw(ctx, x + w - 58, y + 65 + bob, 45, iconColor, 'rgba(255,255,255,.55)');
  text(ctx, label, x + 24, y + h - 63 + bob, 27, C.ink, 700, DISPLAY);
  text(ctx, sub, x + 26, y + h - 31 + bob, 16, 'rgba(41,35,58,.72)', 600, BODY);
  star(ctx, x + w - 35, y + h - 30 + bob, 11, 4, C.coral, time * .16 + index, 5);
  ctx.restore();
}

function productCard(ctx, assets, x, y, w, h, item, time = 0) {
  ctx.save();
  ctx.shadowColor = 'rgba(41,35,58,.13)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 7;
  rounded(ctx, x, y, w, h, 25, C.cream, 'rgba(255,255,255,.86)', 1.4);
  ctx.shadowColor = 'transparent';
  imageCover(ctx, assets.products, x + 8, y + 8, 192, h - 16, item.focusX, item.focusY, 20, item.source);
  const tx = x + 218;
  pill(ctx, tx, y + 24, 90, 32, item.kind, item.kind === 'WALK' ? C.lime : item.kind === 'PLAY' ? C.coralPale : C.lilac, C.ink, 12);
  fitText(ctx, item.title, tx, y + 104, w - 242, 25, C.ink, 700, DISPLAY);
  fitText(ctx, item.note, tx, y + 140, w - 242, 16, C.gray, 500, BODY);
  text(ctx, 'EXPLORE  ↗', tx, y + h - 29, 14, C.purple, 700, DISPLAY);
  star(ctx, x + w - 24, y + 27, 8 + Math.sin(time * 2) * 1, 3, C.coral, time, 5);
  ctx.restore();
}

const PRODUCTS = [
  { kind: 'WALK', title: 'The Daily Walker', note: 'Little adventures, on repeat.', source: { x: 35, y: 0, w: 660, h: 390 }, focusX: .28, focusY: .48 },
  { kind: 'HOME', title: 'Snack-Time Set', note: 'A bowl for the good stuff.', source: { x: 700, y: 0, w: 650, h: 385 }, focusX: .42, focusY: .52 },
  { kind: 'PLAY', title: 'Tug Club Rope', note: 'Made for a little play break.', source: { x: 0, y: 350, w: 800, h: 410 }, focusX: .36, focusY: .46 },
  { kind: 'PLAY', title: 'The Bounce Ball', note: 'A bright spot in the day.', source: { x: 740, y: 340, w: 630, h: 420 }, focusX: .72, focusY: .52 },
];

function drawHook(ctx, assets, local, time) {
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, 1080, 1920);
  drawHeader(ctx, 'home', time, 0);
  imageCover(ctx, assets.hero, 0, HEADER, 1080, 1375, .73, .49);
  const lower = ctx.createLinearGradient(0, 600, 0, 1500);
  lower.addColorStop(0, 'rgba(38,22,54,0)');
  lower.addColorStop(.38, 'rgba(38,22,54,.42)');
  lower.addColorStop(1, 'rgba(38,22,54,.94)');
  ctx.fillStyle = lower;
  ctx.fillRect(0, HEADER, 1080, 1375);
  const left = ctx.createLinearGradient(0, 0, 900, 0);
  left.addColorStop(0, 'rgba(41,35,58,.26)');
  left.addColorStop(.58, 'rgba(41,35,58,.08)');
  left.addColorStop(1, 'rgba(41,35,58,0)');
  ctx.fillStyle = left;
  ctx.fillRect(0, HEADER, 1080, 1375);
  ctx.save();
  ctx.globalAlpha = easeOut((local + .02) / .16);
  pill(ctx, 62, 794, 367, 50, 'PET-SHOP WEBSITE CONCEPT', C.lime, C.ink, 16);
  ctx.restore();
  popText(ctx, 'PET SHOP OWNERS:', 65, 924, 820, 43, C.white, (local - .05) / .20);
  popText(ctx, 'YOUR NEXT', 62, 1048, 850, 98, C.white, (local - .20) / .24);
  popText(ctx, 'CUSTOMER', 60, 1160, 920, 112, C.lime, (local - .42) / .24);
  popText(ctx, 'IS SCROLLING.', 63, 1270, 970, 82, C.white, (local - .66) / .26);
  ctx.save();
  ctx.globalAlpha = easeOut((local - .84) / .22);
  text(ctx, 'Give them a first click worth stopping for.', 68, 1322, 24, C.white, 600, BODY, 'left', { blur: 12, y: 3 });
  ctx.restore();
  const orbit = .5 + .5 * Math.sin(time * 2.5);
  star(ctx, 953, 812 + orbit * 13, 26, 11, C.coral, time * .25, 8);
  star(ctx, 892, 1052 + Math.sin(time * 2) * 8, 14, 6, C.sky, -time * .2, 5);
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 1497, 1080, 423);
  text(ctx, 'GOOD STUFF FOR GOOD PETS.', 62, 1591, 32, C.ink, 700, DISPLAY);
  text(ctx, 'DOGS  ·  CATS  ·  HOME  ·  OUT & ABOUT', 64, 1640, 18, C.gray, 700, DISPLAY);
  pill(ctx, 62, 1680, 195, 59, 'SHOP THE JOY', C.coral, C.ink, 18);
  pill(ctx, 274, 1680, 165, 59, 'DOG PEOPLE', C.lilac, C.ink, 16);
  pill(ctx, 456, 1680, 162, 59, 'CAT PEOPLE', C.sky, C.ink, 16);
  rounded(ctx, 62, 1790, 956, 2, 1, C.line);
  text(ctx, 'A LITTLE MORE TAIL-WAG IN EVERY DAY.', 64, 1850, 17, C.ink, 700, DISPLAY);
  text(ctx, 'SCROLL TO EXPLORE  ↓', 1018, 1850, 15, C.purple, 700, DISPLAY, 'right');
}

function drawHome(ctx, assets, scroll, local, time) {
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, 1080, 1920);
  drawHeader(ctx, 'home', time, 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, HEADER, 1080, 1920 - HEADER); ctx.clip();
  ctx.translate(0, -scroll);
  pageTag(ctx, 'A LITTLE JOY, EVERY DAY', 62, 166, C.lime, C.ink);
  popText(ctx, 'GOOD STUFF', 60, 326, 930, 102, C.ink, (local + .08) / .26);
  popText(ctx, 'FOR GOOD PETS.', 62, 423, 960, 82, C.purple, (local - .08) / .28);
  text(ctx, 'Daily essentials. Extra-big tail wags.', 66, 473, 25, C.gray, 500, BODY);
  button(ctx, 62, 514, 405, 80, 'SHOP THE GOOD STUFF', C.coral, C.ink, 21, time);
  pill(ctx, 493, 526, 258, 55, 'DOGS  ·  CATS  ·  HOME', C.white, C.ink, 15, C.line);
  imageCover(ctx, assets.hero, 0, 646, 1080, 654, .68, .49);
  gradientShade(ctx, 0, 646, 1080, 654, 0, .66, '41,26,55');
  pill(ctx, 58, 1203, 358, 52, 'MEET YOUR NEW DAILY FAVOURITES', C.lime, C.ink, 15);
  text(ctx, 'Made for their kind of day.', 63, 1400, 43, C.ink, 700, DISPLAY);
  text(ctx, 'Little comforts. Big personalities.', 66, 1442, 22, C.gray, 500, BODY);
  categoryCard(ctx, 48, 1480, 308, 198, 'FOR THE DOGS', 'WALK · PLAY · NAP', C.coralPale, C.coral, 0, time);
  categoryCard(ctx, 386, 1480, 308, 198, 'FOR THE CATS', 'CHASE · CLIMB · LOUNGE', C.lilac, C.purple, 1, time);
  categoryCard(ctx, 724, 1480, 308, 198, 'OUT & ABOUT', 'LEADS · BOWLS · BAGS', C.sky, C.green, 2, time);
  text(ctx, 'THE LITTLE THINGS THEY LOVE', 62, 1743, 25, C.ink, 700, DISPLAY);
  text(ctx, 'SEE ALL  ↗', 1018, 1743, 15, C.purple, 700, DISPLAY, 'right');
  productCard(ctx, assets, 46, 1780, 482, 244, PRODUCTS[0], time);
  productCard(ctx, assets, 552, 1780, 482, 244, PRODUCTS[3], time);
  ctx.restore();
}

function drawShop(ctx, assets, scroll, local, time) {
  ctx.fillStyle = C.purple;
  ctx.fillRect(0, 0, 1080, 1920);
  drawHeader(ctx, 'shop', time, 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, HEADER, 1080, 1920 - HEADER); ctx.clip();
  ctx.translate(0, -scroll);
  pageTag(ctx, '02  /  SHOP ALL', 62, 166, C.lime, C.ink);
  popText(ctx, 'GOOD THINGS', 60, 295, 950, 78, C.white, (local + .05) / .28);
  popText(ctx, 'FOR EVERY TAIL.', 62, 386, 970, 78, C.lime, (local - .06) / .30);
  text(ctx, 'A bright little corner of the internet for pets.', 65, 437, 23, 'rgba(255,255,255,.87)', 500, BODY);
  pill(ctx, 62, 470, 166, 54, 'ALL GOODS', C.cream, C.ink, 16);
  pill(ctx, 242, 470, 152, 54, 'DOGS', 'rgba(255,255,255,.16)', C.white, 16, 'rgba(255,255,255,.34)');
  pill(ctx, 408, 470, 152, 54, 'CATS', 'rgba(255,255,255,.16)', C.white, 16, 'rgba(255,255,255,.34)');
  pill(ctx, 574, 470, 192, 54, 'WALK & PLAY', 'rgba(255,255,255,.16)', C.white, 16, 'rgba(255,255,255,.34)');
  imageCover(ctx, assets.products, 34, 550, 1012, 590, .5, .5, 34);
  const fade = ctx.createLinearGradient(0, 910, 0, 1140);
  fade.addColorStop(0, 'rgba(41,35,58,0)'); fade.addColorStop(1, 'rgba(41,35,58,.65)');
  rounded(ctx, 34, 550, 1012, 590, 34, 'rgba(0,0,0,0)');
  ctx.save(); roundPath(ctx, 34, 550, 1012, 590, 34); ctx.clip(); ctx.fillStyle = fade; ctx.fillRect(34, 550, 1012, 590); ctx.restore();
  pill(ctx, 62, 1057, 305, 50, 'THE GOOD-STUFF EDIT', C.lime, C.ink, 16);
  text(ctx, 'Walks. Naps. Repeat.', 62, 1216, 36, C.white, 700, DISPLAY);
  text(ctx, 'Pick a little something for their next big day.', 64, 1250, 19, 'rgba(255,255,255,.84)', 500, BODY);
  productCard(ctx, assets, 46, 1281, 482, 242, PRODUCTS[0], time);
  productCard(ctx, assets, 552, 1281, 482, 242, PRODUCTS[1], time);
  productCard(ctx, assets, 46, 1547, 482, 242, PRODUCTS[2], time);
  productCard(ctx, assets, 552, 1547, 482, 242, PRODUCTS[3], time);
  text(ctx, 'GOOD PET CLUB  ·  AN IMAGINED PET-SHOP STOREFRONT', 62, 1844, 15, 'rgba(255,255,255,.78)', 700, DISPLAY);
  ctx.restore();
}

function drawColorDot(ctx, x, y, color, selected, label) {
  circle(ctx, x, y, selected ? 25 : 22, color, selected ? C.ink : 'rgba(41,35,58,.16)', selected ? 3 : 1.5);
  if (selected) {
    ctx.save();
    ctx.strokeStyle = C.white; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 1, y + 6); ctx.lineTo(x + 9, y - 7); ctx.stroke();
    ctx.restore();
  }
  text(ctx, label, x + 36, y + 6, 15, C.gray, 700, DISPLAY);
}

function drawProduct(ctx, assets, local, time) {
  const added = local > 2.52 ? 1 : 0;
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, 1080, 1920);
  drawHeader(ctx, 'shop', added ? local - 2.52 : 0, added);
  pageTag(ctx, '03  /  PRODUCT DETAILS', 62, 151, C.lilac, C.ink);
  text(ctx, '←  BACK TO THE GOOD STUFF', 66, 223, 17, C.purple, 700, DISPLAY);
  imageCover(ctx, assets.cat, 36, 250, 1008, 665, .72, .50, 34);
  pill(ctx, 66, 285, 278, 49, 'GOOD PET CLUB  ·  TOYS', C.cream, C.ink, 15);
  const photoGlow = .5 + .5 * Math.sin(time * 2.4);
  star(ctx, 968, 314, 25 + photoGlow * 3, 10, C.lime, time * .22, 8);
  pill(ctx, 62, 839, 318, 50, 'A LITTLE PLAY, A LOT OF POUNCE', C.lime, C.ink, 14);
  popText(ctx, 'POUNCE & PLAY', 62, 1012, 950, 68, C.ink, (local + .08) / .30);
  fitText(ctx, 'FEATHER TEASER', 64, 1082, 950, 64, C.purple, 700, DISPLAY);
  text(ctx, 'A little feather. A lot of happy pounces.', 66, 1128, 23, C.gray, 500, BODY);
  text(ctx, 'CHOOSE A COLOUR', 66, 1203, 16, C.ink, 700, DISPLAY);
  drawColorDot(ctx, 92, 1257, C.coral, true, 'CORAL');
  drawColorDot(ctx, 264, 1257, C.purple, false, 'LILAC');
  drawColorDot(ctx, 432, 1257, C.lime, false, 'MINT');
  const pressed = local > 2.12 && local < 2.66 ? Math.sin(Math.min(1, (local - 2.12) / .2) * Math.PI) * .24 : 0;
  button(ctx, 62, 1310, 956, 98, 'ADD TO BAG', C.coral, C.ink, 26, time, pressed);
  text(ctx, 'DEMO PRODUCT  ·  SAMPLE STOREFRONT', 64, 1474, 15, C.gray, 700, DISPLAY);
  rounded(ctx, 62, 1510, 956, 178, 28, C.white, C.line, 1.5);
  iconPaw(ctx, 122, 1599, 44, C.purple, C.lilac);
  text(ctx, 'A LITTLE JOY, PACKED WITH PERSONALITY.', 183, 1578, 21, C.ink, 700, DISPLAY);
  text(ctx, 'One playful pick for their everyday.', 184, 1619, 19, C.gray, 500, BODY);
  text(ctx, 'MADE FOR PET PEOPLE  ·  GOOD PET CLUB', 64, 1770, 16, C.purple, 700, DISPLAY);
}

function drawQuantity(ctx, x, y, time) {
  rounded(ctx, x, y, 198, 66, 20, C.cream, C.line, 1.4);
  circle(ctx, x + 36, y + 33, 18, C.white);
  text(ctx, '−', x + 36, y + 40, 25, C.ink, 700, DISPLAY, 'center');
  text(ctx, '1', x + 99, y + 41, 21, C.ink, 700, DISPLAY, 'center');
  circle(ctx, x + 162, y + 33, 18, C.lime);
  text(ctx, '+', x + 162, y + 40, 23, C.ink, 700, DISPLAY, 'center');
}

function drawBag(ctx, assets, local, time) {
  const pressed = local > 3.46 && local < 4.08 ? Math.sin(Math.min(1, (local - 3.46) / .22) * Math.PI) * .25 : 0;
  ctx.fillStyle = C.coralPale;
  ctx.fillRect(0, 0, 1080, 1920);
  drawHeader(ctx, 'bag', time, 1);
  pageTag(ctx, '04  /  YOUR BAG', 62, 158, C.lime, C.ink);
  popText(ctx, 'GOOD CHOICE.', 62, 300, 960, 84, C.ink, (local + .02) / .27);
  fitText(ctx, 'YOUR BAG IS READY.', 64, 377, 960, 61, C.purple, 700, DISPLAY);
  text(ctx, 'One little pick for a very good day.', 67, 418, 23, C.gray, 500, BODY);
  ctx.save();
  ctx.shadowColor = 'rgba(41,35,58,.13)'; ctx.shadowBlur = 27; ctx.shadowOffsetY = 10;
  rounded(ctx, 44, 462, 992, 382, 31, C.cream, 'rgba(255,255,255,.8)', 1.4);
  ctx.shadowColor = 'transparent';
  imageCover(ctx, assets.cat, 62, 480, 307, 346, .72, .52, 24);
  pill(ctx, 398, 498, 234, 39, 'GOOD PET CLUB  ·  TOYS', C.lilac, C.ink, 12);
  fitText(ctx, 'Pounce & Play', 399, 596, 570, 44, C.ink, 700, DISPLAY);
  text(ctx, 'Feather Teaser · Coral', 402, 638, 19, C.gray, 500, BODY);
  text(ctx, 'DEMO PRICE', 402, 711, 14, C.gray, 700, DISPLAY);
  text(ctx, '$14.00', 402, 757, 34, C.purple, 700, DISPLAY);
  drawQuantity(ctx, 791, 744, time);
  text(ctx, 'Sample item · fictional demo price', 402, 798, 15, C.gray, 500, BODY);
  ctx.restore();
  text(ctx, 'ORDER SUMMARY', 64, 921, 18, C.ink, 700, DISPLAY);
  rounded(ctx, 46, 950, 988, 324, 30, C.white, 'rgba(255,255,255,.72)', 1.5);
  text(ctx, 'Sample subtotal', 80, 1028, 22, C.gray, 500, BODY);
  text(ctx, '$14.00', 994, 1028, 24, C.ink, 700, DISPLAY, 'right');
  rounded(ctx, 80, 1060, 918, 2, 1, C.line);
  text(ctx, 'Delivery', 80, 1122, 22, C.gray, 500, BODY);
  text(ctx, 'Shown at next step', 994, 1122, 19, C.gray, 600, BODY, 'right');
  rounded(ctx, 80, 1155, 918, 2, 1, C.line);
  text(ctx, 'Sample total', 80, 1228, 24, C.ink, 700, DISPLAY);
  text(ctx, '$14.00', 994, 1228, 28, C.purple, 700, DISPLAY, 'right');
  button(ctx, 62, 1320, 956, 100, 'CONTINUE TO CHECKOUT', C.purple, C.white, 24, time, pressed);
  text(ctx, 'SAMPLE CHECKOUT FLOW  ·  NO REAL ORDER IS PLACED', 64, 1471, 15, C.ink, 700, DISPLAY);
  rounded(ctx, 46, 1520, 988, 220, 30, C.plum);
  star(ctx, 112, 1602, 20, 8, C.lime, time * .2, 8);
  text(ctx, 'GOOD THINGS, ONE CLICK AWAY.', 158, 1594, 27, C.white, 700, DISPLAY);
  text(ctx, 'A clear bag. A checkout that keeps things simple.', 160, 1638, 19, 'rgba(255,255,255,.83)', 500, BODY);
  text(ctx, 'GOOD PET CLUB  ·  A FICTIONAL STORE CONCEPT', 64, 1828, 15, C.purple, 700, DISPLAY);
  if (local > 2.65 && local < 4.35) {
    const p = easeInOut((local - 2.78) / .38);
    const click = easeOut((local - 3.48) / .15) * (1 - easeOut((local - 3.92) / .14));
    drawCursor(ctx, lerp(754, 848, p), lerp(1192, 1368, p), click, .86, 1 - easeOut((local - 4.16) / .16));
  }
}

function chronolyteMark(ctx, x, y, r, time, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.lime;
  ctx.shadowColor = 'rgba(200,241,109,.40)'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(x, y, r, -.58, Math.PI * 1.42); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.coral;
  ctx.beginPath(); ctx.arc(x, y, r * .63, .24, Math.PI * 1.64); ctx.stroke();
  circle(ctx, x + r * .70, y - r * .62, 6, C.sky);
  circle(ctx, x - r * .58, y + r * .55, 5, C.coral);
  star(ctx, x + r * .85, y + r * .55 + Math.sin(time * 2) * 3, 7, 3, C.lime, time, 5);
  ctx.restore();
}

function contactBar(ctx, y, kind, label, local) {
  const a = easeOut((local - .48) / .30);
  ctx.save();
  ctx.globalAlpha = a;
  const x = 72 + (1 - a) * 25;
  rounded(ctx, x, y, 936, 118, 26, C.cream, 'rgba(255,255,255,.72)', 1.5);
  circle(ctx, x + 62, y + 59, 34, kind === 'web' ? C.sky : C.coralPale);
  ctx.strokeStyle = C.purple;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'web') {
    ctx.beginPath(); ctx.arc(x + 62, y + 59, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 62, y + 59, 7, 18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 45, y + 59); ctx.lineTo(x + 79, y + 59); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + 51, y + 44); ctx.quadraticCurveTo(x + 46, y + 53, x + 58, y + 70);
    ctx.quadraticCurveTo(x + 72, y + 82, x + 82, y + 68); ctx.lineTo(x + 70, y + 57);
    ctx.lineTo(x + 63, y + 63); ctx.lineTo(x + 54, y + 54); ctx.lineTo(x + 60, y + 48); ctx.closePath();
    ctx.stroke();
  }
  fitText(ctx, label, x + 120, y + 74, 760, kind === 'web' ? 42 : 46, C.ink, 700, DISPLAY);
  ctx.restore();
}

function drawCta(ctx, local, time) {
  const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, '#5032C8');
  bg.addColorStop(.52, '#321B54');
  bg.addColorStop(1, '#211139');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);
  const glow = ctx.createRadialGradient(844, 455, 0, 844, 455, 560);
  glow.addColorStop(0, 'rgba(255,109,122,.31)'); glow.addColorStop(1, 'rgba(255,109,122,0)');
  ctx.fillStyle = glow; ctx.fillRect(200, 0, 880, 1100);
  const drift = Math.sin(time * 1.8);
  star(ctx, 926, 262 + drift * 12, 42, 18, C.lime, time * .16, 8);
  star(ctx, 147, 701 - drift * 11, 22, 9, C.sky, -time * .18, 8);
  paw(ctx, 951, 1613 + drift * 14, 88, 'rgba(255,255,255,.14)');
  logoMark(ctx, 58, 70, 72, C.coral);
  text(ctx, 'CHRONOLYTE AI', 150, 119, 27, C.white, 700, DISPLAY);
  text(ctx, 'WEB DESIGN  ·  CREATIVE EXPERIENCES', 152, 147, 14, 'rgba(255,255,255,.76)', 700, DISPLAY);
  ctx.save(); ctx.globalAlpha = easeOut((local + .04) / .26);
  pill(ctx, 340, 230, 400, 54, 'FOR PET-SHOP OWNERS', 'rgba(255,255,255,.12)', C.lime, 16, 'rgba(200,241,109,.52)');
  ctx.restore();
  const mark = easeOut((local + .02) / .32);
  chronolyteMark(ctx, 540, 403, 45, time, mark);
  popText(ctx, 'WANT A WEBSITE', 540, 601, 970, 76, C.white, (local - .08) / .30, 'center');
  popText(ctx, 'THIS GOOD?', 540, 719, 930, 112, C.lime, (local - .34) / .34, 'center');
  ctx.save(); ctx.globalAlpha = easeOut((local - .52) / .26);
  text(ctx, 'Let’s make your next scroll-stopper.', 540, 778, 26, 'rgba(255,255,255,.84)', 500, BODY, 'center');
  ctx.restore();
  contactBar(ctx, 903, 'web', 'www.chronolyteai.site', local);
  contactBar(ctx, 1049, 'phone', '+1 (812) 690-6121', local);
  ctx.save(); ctx.globalAlpha = easeOut((local - .58) / .26);
  pill(ctx, 332, 1255, 416, 52, 'LET’S BUILD SOMETHING GOOD.', 'rgba(255,255,255,.12)', C.white, 15, 'rgba(255,255,255,.22)');
  text(ctx, 'CHRONOLYTE AI  ·  WWW.CHRONOLYTEAI.SITE', 540, 1406, 17, 'rgba(255,255,255,.72)', 700, DISPLAY, 'center');
  ctx.restore();
  const pulse = .5 + .5 * Math.sin(local * 2.4);
  ctx.save(); ctx.globalAlpha = .22 + .15 * pulse;
  rounded(ctx, 452, 1495, 176, 5, 3, C.coral);
  ctx.restore();
}

function drawPage(ctx, id, assets, state) {
  if (id === 'home') drawHome(ctx, assets, state.scroll || 0, state.local || 0, state.time || 0);
  else if (id === 'shop') drawShop(ctx, assets, state.scroll || 0, state.local || 0, state.time || 0);
  else if (id === 'product') drawProduct(ctx, assets, state.local || 0, state.time || 0);
  else if (id === 'bag') drawBag(ctx, assets, state.local || 0, state.time || 0);
  else drawHook(ctx, assets, state.local || 0, state.time || 0);
}

function routeState(id, local) {
  if (id === 'home') return { local, scroll: 88 * easeInOut((local - .52) / 2.40) };
  if (id === 'shop') return { local, scroll: 72 * easeInOut((local - .56) / 2.45) };
  return { local, scroll: 0 };
}

function drawRoute(ctx, id, previous, local, time, assets) {
  const trans = .48;
  const state = { ...routeState(id, local), time };
  if (previous && local < trans) {
    const p = easeInOut(local / trans);
    ctx.save();
    ctx.translate(-1080 * p, 0);
    const oldScroll = previous === 'home' ? 82 : previous === 'shop' ? 52 : 0;
    drawPage(ctx, previous, assets, { local: .72, scroll: oldScroll, time: time - .45 });
    ctx.restore();
    ctx.save();
    ctx.translate(1080 * (1 - p), 0);
    drawPage(ctx, id, assets, state);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = .85 * (1 - p);
    ctx.fillStyle = C.coral;
    ctx.fillRect(1080 * (1 - p) - 12, HEADER, 12, 1798);
    ctx.restore();
    return;
  }
  drawPage(ctx, id, assets, state);
  if (id === 'home' && local > .82 && local < 1.70) {
    const p = easeInOut((local - .86) / .42);
    drawCursor(ctx, lerp(728, 403, p), lerp(704, 548, p), easeOut((local - 1.30) / .18), .84, 1 - easeOut((local - 1.57) / .12));
  } else if (id === 'shop' && local > 1.10 && local < 2.10) {
    const p = easeInOut((local - 1.12) / .43);
    drawCursor(ctx, lerp(910, 774, p), lerp(1030, 1403 - state.scroll, p), easeOut((local - 1.68) / .16), .82, 1 - easeOut((local - 1.94) / .12));
  }
}

function drawCursor(ctx, x, y, click = 0, scale = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  const p = clamp(click);
  if (p > 0) {
    ctx.strokeStyle = `rgba(255,109,122,${.8 * (1 - p)})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x + 5, y + 7, 15 + 31 * p, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(41,35,58,.42)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 39); ctx.lineTo(11, 29); ctx.lineTo(20, 47);
  ctx.lineTo(29, 42); ctx.lineTo(18, 25); ctx.lineTo(33, 24); ctx.closePath();
  ctx.fillStyle = C.white; ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.restore();
}

export function drawPetScene(ctx, time, { assets, beats }) {
  const beat = beats.find((item) => time >= item.start && time < item.end) || beats.at(-1);
  const local = Math.max(0, time - beat.start);
  const index = beats.indexOf(beat);
  const previous = index > 0 ? beats[index - 1].id : null;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (beat.id === 'hook') {
    drawHook(ctx, assets, local, time);
  } else if (beat.id === 'cta') {
    if (local < .46 && previous) {
      const p = easeInOut(local / .46);
      ctx.save(); ctx.translate(-1080 * p, 0);
      drawBag(ctx, assets, 4.1, time - .4);
      ctx.restore();
      ctx.save(); ctx.translate(1080 * (1 - p), 0);
      drawCta(ctx, local, time);
      ctx.restore();
    } else {
      drawCta(ctx, local, time);
    }
  } else {
    drawRoute(ctx, beat.id, previous, local, time, assets);
    if (beat.id === 'product') {
      const clickStart = 2.06;
      if (local > 1.36 && local < 2.98) {
        const p = easeInOut((local - 1.46) / .48);
        const click = easeOut((local - clickStart) / .16) * (1 - easeOut((local - 2.48) / .14));
        drawCursor(ctx, lerp(756, 848, p), lerp(1222, 1358, p), click, .88, 1 - easeOut((local - 2.77) / .16));
      }
    } else if (beat.id === 'bag') {
      if (local > 2.66 && local < 4.36) {
        const p = easeInOut((local - 2.80) / .38);
        const click = easeOut((local - 3.48) / .15) * (1 - easeOut((local - 3.92) / .14));
        drawCursor(ctx, lerp(754, 848, p), lerp(1192, 1368, p), click, .86, 1 - easeOut((local - 4.16) / .16));
      }
    }
  }
  ctx.restore();
}
