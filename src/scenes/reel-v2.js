const DISPLAY = '"Space Grotesk", Arial, sans-serif';
const BODY = '"DM Sans", Arial, sans-serif';
const P = {
  ink: '#10264A', ink2: '#18365C', deep: '#0A1837',
  page: '#F4F7FD', white: '#FFFFFF', blue: '#2C63F4', blue2: '#1B4FD4',
  sky: '#DDF4FF', aqua: '#5DDBEF', orange: '#FF754A', yellow: '#FFD05A',
  mint: '#C9F3E7', pale: '#E8F0FF', line: '#D5E0F0',
  body: '#344762', muted: '#647792', green: '#119A76',
};
const W = 1080;
const H = 1920;
const HEADER = 132;
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => { p = clamp(p); return 1 - Math.pow(1 - p, 3); };
const easeInOut = (p) => { p = clamp(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

function roundedRect(ctx, x, y, w, h, r, fill = null, stroke = null, lineWidth = 1) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.stroke(); }
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

function text(ctx, value, x, y, size, color = P.ink, weight = 600, family = BODY, align = 'left', shadow = null) {
  ctx.save();
  setFont(ctx, size, weight, family);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = shadow.color || 'rgba(4,18,43,.38)';
    ctx.shadowBlur = shadow.blur || 18;
    ctx.shadowOffsetY = shadow.y || 4;
  }
  ctx.fillText(value, x, y);
  ctx.restore();
}

function fitText(ctx, value, x, y, maxWidth, size, color = P.ink, weight = 700, family = DISPLAY, align = 'left') {
  ctx.save();
  let current = size;
  setFont(ctx, current, weight, family);
  while (ctx.measureText(value).width > maxWidth && current > 18) {
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

function popText(ctx, value, x, y, maxWidth, size, color, progress, weight = 700, align = 'left') {
  const p = clamp(progress);
  if (p <= 0) return;
  const e = easeOut(p);
  ctx.save();
  ctx.globalAlpha = e;
  ctx.translate(0, (1 - e) * 26);
  ctx.scale(.94 + .06 * e, .94 + .06 * e);
  ctx.shadowColor = color === P.yellow ? 'rgba(255,208,90,.28)' : 'rgba(4,18,43,.32)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 5;
  fitText(ctx, value, x, y, maxWidth, size, color, weight, DISPLAY, align);
  ctx.restore();
}

function pill(ctx, x, y, w, h, label, fill = P.blue, fg = P.white, size = 18, border = null) {
  ctx.save();
  roundedRect(ctx, x, y, w, h, h / 2, fill, border, 1.4);
  setFont(ctx, size, 800, DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function button(ctx, x, y, w, h, label, fill = P.orange, fg = P.ink, size = 24, arrow = true, radius = 20) {
  ctx.save();
  ctx.shadowColor = fill === P.orange ? 'rgba(255,117,74,.24)' : 'rgba(44,99,244,.25)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 7;
  roundedRect(ctx, x, y, w, h, radius, fill, 'rgba(255,255,255,.44)', 1.4);
  ctx.shadowColor = 'transparent';
  setFont(ctx, size, 800, DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(label, x + 25, y + h / 2 + 1);
  if (arrow) {
    const cx = x + w - 35;
    const cy = y + h / 2;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx + 1, cy - 7);
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 1, cy + 7);
    ctx.stroke();
  }
  ctx.restore();
}

function imageCover(ctx, image, x, y, w, h, focusX = .5, focusY = .5) {
  if (!image || !image.complete || !image.naturalWidth) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = w / h;
  let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = clamp(focusX * image.naturalWidth - sw / 2, 0, image.naturalWidth - sw);
  } else {
    sh = image.naturalWidth / targetRatio;
    sy = clamp(focusY * image.naturalHeight - sh / 2, 0, image.naturalHeight - sh);
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function verticalShade(ctx, x, y, w, h, start = .35, strength = .72, color = '8,24,55') {
  const gradient = ctx.createLinearGradient(0, y + h * start, 0, y + h);
  gradient.addColorStop(0, `rgba(${color},0)`);
  gradient.addColorStop(1, `rgba(${color},${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y + h * start, w, h * (1 - start));
}

function drawBrandMark(ctx, x, y, size, background = P.blue) {
  roundedRect(ctx, x, y, size, size, size * .27, background);
  ctx.save();
  ctx.strokeStyle = P.white;
  ctx.lineWidth = Math.max(3, size * .055);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const yy = y + size * (.34 + i * .16);
    ctx.beginPath();
    ctx.moveTo(x + size * .25, yy);
    ctx.bezierCurveTo(x + size * .42, yy - size * .11, x + size * .56, yy + size * .11, x + size * .75, yy);
    ctx.stroke();
  }
  circle(ctx, x + size * .76, y + size * .23, size * .045, P.yellow);
  ctx.restore();
}

function drawChronolyteMark(ctx, x, y, r, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = 6;
  ctx.strokeStyle = P.aqua;
  ctx.shadowColor = 'rgba(93,219,239,.45)';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(x, y, r, -.55, Math.PI * 1.55);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = P.orange;
  ctx.beginPath();
  ctx.arc(x, y, r * .62, .22, Math.PI * 1.78);
  ctx.stroke();
  circle(ctx, x + r * .76, y - r * .55, 6, P.yellow);
  circle(ctx, x - r * .58, y + r * .65, 5, P.aqua);
  ctx.restore();
}

const NAV_LINKS = [
  { id: 'home', label: 'HOME', x: 466, w: 58 },
  { id: 'services', label: 'SERVICES', x: 560, w: 92 },
  { id: 'process', label: 'OUR APPROACH', x: 681, w: 142 },
];

function siteHeader(ctx, route, time = 0) {
  ctx.fillStyle = P.white;
  ctx.fillRect(0, 0, W, HEADER);
  ctx.fillStyle = P.line;
  ctx.fillRect(0, HEADER - 2, W, 2);
  drawBrandMark(ctx, 48, 28, 76, P.blue);
  text(ctx, 'NORTHLINE', 143, 60, 29, P.ink, 800, DISPLAY);
  text(ctx, 'HEATING  ·  COOLING', 145, 86, 14, P.muted, 800, DISPLAY);
  for (const item of NAV_LINKS) {
    const active = route === item.id;
    text(ctx, item.label, item.x, 76, 18, active ? P.blue : P.ink2, 800, DISPLAY);
    if (active) {
      roundedRect(ctx, item.x, 97, item.w, 4, 2, P.orange);
    }
  }
  button(ctx, 864, 29, 168, 72, 'BOOK NOW', P.orange, P.ink, 19, true, 18);
  // A restrained status dot makes the fixed nav feel alive without competing with copy.
  const pulse = .72 + .20 * Math.sin(time * 2.1);
  circle(ctx, 1060, 65, 4, `rgba(44,99,244,${pulse})`);
}

function pageTag(ctx, label, x = 62, y = 170, fill = P.blue, fg = P.white) {
  const width = Math.max(180, label.length * 13 + 38);
  pill(ctx, x, y, width, 48, label, fill, fg, 18);
}

function snowflake(ctx, x, y, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.translate(x, y);
  for (let i = 0; i < 3; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(r * .58, 0); ctx.lineTo(r * .31, -r * .23);
    ctx.moveTo(r * .58, 0); ctx.lineTo(r * .31, r * .23);
    ctx.stroke();
  }
  ctx.restore();
}

function sunIcon(ctx, x, y, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  circle(ctx, x, y, r * .4, null, color, 4);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r * .68, y + Math.sin(angle) * r * .68);
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    ctx.stroke();
  }
  ctx.restore();
}

function airIcon(ctx, x, y, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const yy = y + i * 14;
    ctx.beginPath();
    ctx.moveTo(x - r, yy);
    ctx.bezierCurveTo(x - r * .2, yy - 10, x + r * .2, yy + 10, x + r, yy - 3);
    ctx.stroke();
  }
  ctx.restore();
}

function homeIcon(ctx, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size * .46, y + size * .05);
  ctx.lineTo(x, y - size * .42);
  ctx.lineTo(x + size * .46, y + size * .05);
  ctx.lineTo(x + size * .36, y + size * .05);
  ctx.lineTo(x + size * .36, y + size * .42);
  ctx.lineTo(x - size * .36, y + size * .42);
  ctx.lineTo(x - size * .36, y + size * .05);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function serviceCard(ctx, x, y, w, h, kind, title, subtitle, fill = P.white, foreground = P.ink, number = '') {
  ctx.save();
  ctx.shadowColor = 'rgba(11,32,68,.12)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  roundedRect(ctx, x, y, w, h, 28, fill, 'rgba(255,255,255,.62)', 1.5);
  ctx.shadowColor = 'transparent';
  const badgeFill = foreground === P.white ? 'rgba(255,255,255,.16)' : 'rgba(44,99,244,.10)';
  circle(ctx, x + 62, y + 62, 38, badgeFill);
  const iconColor = foreground === P.white ? P.yellow : P.blue;
  if (kind === 'snow') snowflake(ctx, x + 62, y + 62, 20, iconColor);
  else if (kind === 'sun') sunIcon(ctx, x + 62, y + 62, 22, iconColor);
  else if (kind === 'air') airIcon(ctx, x + 62, y + 62, 22, iconColor);
  else homeIcon(ctx, x + 62, y + 62, 42, iconColor);
  if (number) text(ctx, number, x + w - 80, y + 42, 16, foreground === P.white ? 'rgba(255,255,255,.65)' : P.muted, 800, DISPLAY, 'left');
  text(ctx, title, x + 28, y + h - 74, 34, foreground, 800, DISPLAY);
  fitText(ctx, subtitle, x + 28, y + h - 37, w - 56, 21, foreground === P.white ? 'rgba(255,255,255,.82)' : P.muted, 600, BODY);
  ctx.strokeStyle = foreground === P.white ? P.yellow : P.orange;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ax = x + w - 40, ay = y + 44;
  ctx.beginPath(); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax + 2, ay); ctx.lineTo(ax - 4, ay - 6); ctx.moveTo(ax + 2, ay); ctx.lineTo(ax - 4, ay + 6); ctx.stroke();
  ctx.restore();
}

function drawCursor(ctx, x, y, click = 0, scale = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const p = clamp(click);
  if (p > 0) {
    ctx.strokeStyle = `rgba(255,117,74,${.8 * (1 - p)})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x + 7, y + 9, 16 + p * 34, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(6,24,54,.42)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 42); ctx.lineTo(11, 32); ctx.lineTo(20, 50); ctx.lineTo(29, 45); ctx.lineTo(19, 28); ctx.lineTo(34, 27); ctx.closePath();
  ctx.fillStyle = P.white; ctx.fill();
  ctx.strokeStyle = P.ink; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.restore();
}

function drawHookPage(ctx, assets, local) {
  ctx.fillStyle = P.page;
  ctx.fillRect(0, 0, W, H);
  siteHeader(ctx, 'home', local);
  const imageY = HEADER;
  const imageH = 1048;
  imageCover(ctx, assets.hero, 0, imageY, W, imageH, .68, .48);
  const leftShade = ctx.createLinearGradient(0, 0, W * .92, 0);
  leftShade.addColorStop(0, 'rgba(5,20,49,.88)');
  leftShade.addColorStop(.52, 'rgba(5,20,49,.55)');
  leftShade.addColorStop(1, 'rgba(5,20,49,.06)');
  ctx.fillStyle = leftShade;
  ctx.fillRect(0, imageY, W, imageH);
  verticalShade(ctx, 0, imageY, W, imageH, .64, .78, '6,20,49');

  const tagAlpha = easeOut((local + .03) / .16);
  ctx.save(); ctx.globalAlpha = tagAlpha;
  pill(ctx, 64, 218, 378, 54, 'WEBSITE DESIGN FOR HVAC', P.yellow, P.ink, 19);
  ctx.restore();
  popText(ctx, 'HVAC OWNERS', 68, 397, 630, 43, P.white, (local - .10) / .24, 800);
  popText(ctx, 'YOUR NEXT', 68, 545, 730, 102, P.white, (local - .32) / .30, 800);
  popText(ctx, 'CUSTOMER', 68, 676, 790, 116, P.yellow, (local - .58) / .34, 800);
  popText(ctx, 'IS SCROLLING.', 70, 778, 790, 66, P.white, (local - .88) / .28, 800);
  ctx.save(); ctx.globalAlpha = easeOut((local - 1.03) / .20);
  text(ctx, 'See a full-screen HVAC website in action.', 74, 844, 26, P.white, 600, BODY, 'left', { blur: 12, y: 3 });
  ctx.restore();
  button(ctx, 68, 916, 362, 84, 'BOOK A VISIT', P.orange, P.ink, 24, true, 20);
  if (local > 1.3 && local < 2.05) drawCursor(ctx, 295, 948, clamp((local - 1.58) / .26), .82, easeOut((local - 1.28) / .12));

  ctx.fillStyle = P.white;
  ctx.fillRect(0, imageY + imageH, W, H - (imageY + imageH));
  text(ctx, 'NORTHLINE HVAC', 66, 1278, 22, P.blue, 800, DISPLAY);
  fitText(ctx, 'Heating  ·  Cooling  ·  Indoor air', 66, 1342, 920, 40, P.ink, 800, DISPLAY);
  text(ctx, 'Comfort, built around you.', 68, 1394, 26, P.muted, 600, BODY);
  const chips = [
    { x: 66, w: 264, label: 'A/C REPAIR', fill: P.sky, fg: P.ink },
    { x: 346, w: 264, label: 'HEATING', fill: P.mint, fg: P.ink },
    { x: 626, w: 356, label: 'INDOOR AIR', fill: '#FFF0D6', fg: P.ink },
  ];
  for (const item of chips) pill(ctx, item.x, 1450, item.w, 62, item.label, item.fill, item.fg, 19);
  text(ctx, 'NORTHLINEHVAC.EXAMPLE', 68, 1588, 16, P.muted, 800, DISPLAY);
  ctx.fillStyle = P.blue;
  ctx.fillRect(0, 1644, W, 276);
  text(ctx, 'A BETTER FIRST STEP.', 66, 1726, 40, P.white, 800, DISPLAY);
  text(ctx, 'Pick a service. Choose a time.', 68, 1772, 24, 'rgba(255,255,255,.85)', 600, BODY);
  button(ctx, 704, 1694, 322, 80, 'SCHEDULE SERVICE', P.yellow, P.ink, 19, true, 18);
}

function drawHomePage(ctx, assets, scroll, time) {
  ctx.fillStyle = P.page;
  ctx.fillRect(0, 0, W, H);
  siteHeader(ctx, 'home', time);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, HEADER, W, H - HEADER); ctx.clip();
  ctx.translate(0, -scroll);
  pageTag(ctx, '01  /  HOME', 62, 168, P.blue, P.white);
  text(ctx, 'Comfort,', 62, 314, 96, P.ink, 800, DISPLAY);
  fitText(ctx, 'built around you.', 62, 414, 965, 94, P.ink, 800, DISPLAY);
  text(ctx, 'Heating, cooling + indoor air, made simple.', 66, 470, 27, P.body, 600, BODY);
  button(ctx, 64, 516, 362, 82, 'SCHEDULE A VISIT', P.orange, P.ink, 22, true, 20);
  imageCover(ctx, assets.hero, 0, 636, W, 672, .67, .50);
  verticalShade(ctx, 0, 636, W, 672, .52, .70, '6,20,49');
  pill(ctx, 58, 1217, 390, 54, 'NORTHLINE  ·  HOME COMFORT', 'rgba(16,38,74,.92)', P.white, 18, 'rgba(255,255,255,.34)');
  text(ctx, 'A home that feels right.', 62, 1397, 52, P.ink, 800, DISPLAY);
  text(ctx, 'Explore the services that make every season easier.', 66, 1443, 25, P.body, 500, BODY);
  serviceCard(ctx, 48, 1490, 308, 230, 'snow', 'COOLING', 'Repairs & tune-ups', P.sky, P.ink, '01');
  serviceCard(ctx, 386, 1490, 308, 230, 'sun', 'HEATING', 'Seasonal service', '#FFF0D6', P.ink, '02');
  serviceCard(ctx, 724, 1490, 308, 230, 'air', 'INDOOR AIR', 'Breathe easier', P.ink2, P.white, '03');
  ctx.fillStyle = P.ink;
  ctx.fillRect(0, 1760, W, 360);
  text(ctx, 'READY FOR THE NEXT STEP?', 66, 1840, 34, P.yellow, 800, DISPLAY);
  text(ctx, 'Find the service that fits your home.', 68, 1882, 22, P.white, 600, BODY);
  ctx.restore();
}

function drawServicesPage(ctx, assets, scroll, time) {
  ctx.fillStyle = P.blue;
  ctx.fillRect(0, 0, W, H);
  siteHeader(ctx, 'services', time);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, HEADER, W, H - HEADER); ctx.clip();
  ctx.translate(0, -scroll);
  pageTag(ctx, '02  /  SERVICES', 62, 166, P.yellow, P.ink);
  text(ctx, 'HEATING. COOLING.', 62, 306, 78, P.white, 800, DISPLAY);
  text(ctx, 'FRESH AIR.', 62, 402, 93, P.yellow, 800, DISPLAY);
  text(ctx, 'Everything your home needs, in one clear place.', 66, 452, 26, 'rgba(255,255,255,.88)', 600, BODY);
  const left = 52, gap = 18, cardW = 479, cardH = 248;
  serviceCard(ctx, left, 502, cardW, cardH, 'snow', 'A/C REPAIR', 'Repairs & seasonal tune-ups', P.white, P.ink, '01');
  serviceCard(ctx, left + cardW + gap, 502, cardW, cardH, 'sun', 'HEATING', 'Warmth, made simple', '#FFF0D6', P.ink, '02');
  serviceCard(ctx, left, 770, cardW, cardH, 'home', 'NEW SYSTEMS', 'Explore options for your home', P.mint, P.ink, '03');
  serviceCard(ctx, left + cardW + gap, 770, cardW, cardH, 'air', 'INDOOR AIR', 'Breathe a little easier', P.ink2, P.white, '04');
  imageCover(ctx, assets.thermostat, 0, 1050, W, 544, .57, .50);
  verticalShade(ctx, 0, 1050, W, 544, .38, .82, '7,24,55');
  pill(ctx, 58, 1450, 270, 48, 'HOME COMFORT', P.yellow, P.ink, 17);
  text(ctx, 'Choose what fits your home.', 60, 1535, 45, P.white, 800, DISPLAY);
  text(ctx, 'Clear options. One easy next step.', 64, 1580, 24, 'rgba(255,255,255,.88)', 600, BODY);
  button(ctx, 62, 1635, 372, 78, 'EXPLORE SERVICES', P.orange, P.ink, 21, true, 18);
  ctx.fillStyle = P.ink2;
  ctx.fillRect(0, 1740, W, 320);
  text(ctx, 'ONE CLEAR NEXT STEP.', 62, 1827, 39, P.white, 800, DISPLAY);
  text(ctx, 'Choose a service. Book online.', 65, 1872, 23, 'rgba(255,255,255,.85)', 600, BODY);
  ctx.restore();
}

function drawProcessPage(ctx, assets, scroll, time) {
  ctx.fillStyle = P.page;
  ctx.fillRect(0, 0, W, H);
  siteHeader(ctx, 'process', time);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, HEADER, W, H - HEADER); ctx.clip();
  ctx.translate(0, -scroll);
  imageCover(ctx, assets.thermostat, 0, HEADER, W, 562, .59, .5);
  verticalShade(ctx, 0, HEADER, W, 562, .22, .78, '7,24,55');
  pill(ctx, 62, 177, 330, 50, '03  /  HOW IT WORKS', P.yellow, P.ink, 18);
  text(ctx, 'A clearer path', 62, 524, 76, P.white, 800, DISPLAY, 'left', { blur: 16, y: 4 });
  text(ctx, 'to comfort.', 62, 612, 82, P.white, 800, DISPLAY, 'left', { blur: 16, y: 4 });
  text(ctx, 'Know what happens next.', 66, 665, 26, P.white, 600, BODY, 'left', { blur: 12, y: 3 });
  text(ctx, 'THREE SIMPLE STEPS', 62, 780, 18, P.blue, 800, DISPLAY);
  fitText(ctx, 'From first click to home comfort.', 62, 842, 960, 50, P.ink, 800, DISPLAY);
  const cards = [
    { x: 48, fill: P.white, num: '01', title: 'Tell us', body: 'Share what your home needs.' },
    { x: 386, fill: P.yellow, num: '02', title: 'See options', body: 'Find a clear next step.' },
    { x: 724, fill: P.ink2, num: '03', title: 'Choose a time', body: 'Pick a visit that works.' },
  ];
  cards.forEach((card, index) => {
    const reveal = easeOut((time - .12 - index * .13) / .42);
    ctx.save();
    ctx.globalAlpha = reveal;
    const yy = 900 + (1 - reveal) * 30;
    roundedRect(ctx, card.x, yy, 308, 324, 28, card.fill, 'rgba(255,255,255,.76)', 1.4);
    text(ctx, card.num, card.x + 25, yy + 69, 43, card.fill === P.ink2 ? P.yellow : P.orange, 800, DISPLAY);
    fitText(ctx, card.title, card.x + 25, yy + 149, 260, 36, card.fill === P.ink2 ? P.white : P.ink, 800, DISPLAY);
    fitText(ctx, card.body, card.x + 25, yy + 211, 260, 23, card.fill === P.ink2 ? 'rgba(255,255,255,.84)' : P.body, 600, BODY);
    roundedRect(ctx, card.x + 25, yy + 254, 74, 7, 4, card.fill === P.ink2 ? P.yellow : P.blue);
    ctx.restore();
  });
  roundedRect(ctx, 48, 1280, 984, 252, 30, P.blue);
  text(ctx, 'Clear choices.', 82, 1370, 56, P.white, 800, DISPLAY);
  text(ctx, 'Confident next step.', 82, 1434, 56, P.yellow, 800, DISPLAY);
  text(ctx, 'See the service page, then book right from the site.', 84, 1487, 24, 'rgba(255,255,255,.90)', 600, BODY);
  ctx.fillStyle = P.orange;
  ctx.fillRect(0, 1550, W, 380);
  text(ctx, 'READY TO GET STARTED?', 64, 1642, 35, P.ink, 800, DISPLAY);
  text(ctx, 'The next step is right here.', 66, 1692, 28, P.ink, 600, BODY);
  button(ctx, 64, 1732, 370, 82, 'BOOK A VISIT', P.yellow, P.ink, 23, true, 20);
  ctx.restore();
}

function dateTile(ctx, x, y, w, day, date, selected = false) {
  const fill = selected ? P.blue : P.white;
  const ink = selected ? P.white : P.ink;
  roundedRect(ctx, x, y, w, 148, 24, fill, selected ? P.blue : P.line, 2);
  if (selected) roundedRect(ctx, x + 9, y + 9, w - 18, 130, 18, null, 'rgba(255,255,255,.36)', 1.5);
  text(ctx, day, x + w / 2, y + 54, 20, selected ? 'rgba(255,255,255,.82)' : P.muted, 800, DISPLAY, 'center');
  text(ctx, date, x + w / 2, y + 108, 45, ink, 800, DISPLAY, 'center');
}

function timeTile(ctx, x, y, w, label, selected = false) {
  roundedRect(ctx, x, y, w, 92, 19, selected ? P.mint : P.white, selected ? '#6BCBB1' : P.line, 2);
  circle(ctx, x + 34, y + 46, 11, selected ? P.green : P.line);
  if (selected) {
    ctx.save(); ctx.strokeStyle = P.white; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 29, y + 46); ctx.lineTo(x + 33, y + 51); ctx.lineTo(x + 41, y + 40); ctx.stroke(); ctx.restore();
  }
  fitText(ctx, label, x + 64, y + 55, w - 82, 24, P.ink, 800, DISPLAY);
}

function checkMark(ctx, x, y, r, fill = P.green) {
  circle(ctx, x, y, r, fill);
  ctx.save();
  ctx.strokeStyle = P.white;
  ctx.lineWidth = Math.max(5, r * .12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * .42, y + r * .03);
  ctx.lineTo(x - r * .10, y + r * .34);
  ctx.lineTo(x + r * .48, y - r * .35);
  ctx.stroke();
  ctx.restore();
}

function drawBookingPage(ctx, time, success = 0) {
  ctx.fillStyle = '#EDF3FF';
  ctx.fillRect(0, 0, W, H);
  siteHeader(ctx, 'booking', time);
  pageTag(ctx, '04  /  BOOK ONLINE', 62, 166, P.blue, P.white);
  text(ctx, "Let's get it", 62, 303, 85, P.ink, 800, DISPLAY);
  text(ctx, 'comfortable.', 62, 392, 85, P.ink, 800, DISPLAY);
  text(ctx, 'Choose a service. Pick a time.', 66, 440, 27, P.body, 600, BODY);
  ctx.save();
  ctx.shadowColor = 'rgba(16,38,74,.14)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 12;
  roundedRect(ctx, 52, 482, 976, 1072, 34, P.white, 'rgba(255,255,255,.9)', 1.6);
  ctx.shadowColor = 'transparent';
  text(ctx, 'SERVICE NEEDED', 100, 547, 18, P.muted, 800, DISPLAY);
  roundedRect(ctx, 96, 570, 888, 112, 22, P.pale, '#D6E3F5', 1.5);
  circle(ctx, 148, 626, 31, P.white);
  snowflake(ctx, 148, 626, 18, P.blue);
  text(ctx, 'Air conditioning repair', 198, 636, 31, P.ink, 800, DISPLAY);
  text(ctx, 'CHOOSE A DAY', 100, 750, 18, P.muted, 800, DISPLAY);
  const tileW = 278, gap = 27;
  dateTile(ctx, 96, 774, tileW, 'MON', '14', true);
  dateTile(ctx, 96 + tileW + gap, 774, tileW, 'TUE', '15', false);
  dateTile(ctx, 96 + (tileW + gap) * 2, 774, tileW, 'WED', '16', false);
  text(ctx, 'TIME WINDOW', 100, 985, 18, P.muted, 800, DISPLAY);
  timeTile(ctx, 96, 1008, 424, '10 AM – 12 PM', true);
  timeTile(ctx, 544, 1008, 440, '12 PM – 2 PM', false);
  button(ctx, 96, 1140, 888, 100, 'REQUEST A VISIT', P.orange, P.ink, 28, true, 23);
  text(ctx, 'Sample request flow · details confirmed by the provider.', 98, 1301, 21, P.muted, 600, BODY);
  roundedRect(ctx, 96, 1342, 888, 132, 22, P.page);
  drawBrandMark(ctx, 124, 1377, 62, P.blue);
  text(ctx, 'A SIMPLE WAY TO GET STARTED', 210, 1401, 17, P.blue, 800, DISPLAY);
  text(ctx, 'Clear choices. No long forms.', 210, 1440, 25, P.ink, 800, DISPLAY);
  ctx.restore();
  ctx.fillStyle = P.ink2;
  ctx.fillRect(0, 1580, W, 340);
  text(ctx, 'NORTHLINE HVAC', 62, 1673, 28, P.yellow, 800, DISPLAY);
  text(ctx, 'A clear next step for home comfort.', 64, 1724, 27, P.white, 600, BODY);
  button(ctx, 62, 1758, 370, 82, 'EXPLORE SERVICES', P.orange, P.ink, 21, true, 20);

  if (success > 0) {
    const reveal = easeOut(success);
    ctx.save();
    ctx.globalAlpha = .24 * reveal;
    ctx.fillStyle = P.deep;
    ctx.fillRect(0, HEADER, W, H - HEADER);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = reveal;
    const modalY = 650 + (1 - reveal) * 34;
    ctx.shadowColor = 'rgba(6,24,54,.24)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 18;
    roundedRect(ctx, 125, modalY, 830, 600, 36, P.white, 'rgba(255,255,255,.8)', 1.5);
    ctx.shadowColor = 'transparent';
    checkMark(ctx, 540, modalY + 126, 48, P.green);
    text(ctx, 'Request received.', 540, modalY + 250, 52, P.ink, 800, DISPLAY, 'center');
    text(ctx, 'Sample booking · ready for confirmation', 540, modalY + 308, 25, P.body, 600, BODY, 'center');
    roundedRect(ctx, 205, modalY + 362, 670, 82, 18, P.pale);
    text(ctx, 'A/C REPAIR  ·  MON 14  ·  10 AM', 540, modalY + 413, 21, P.blue, 800, DISPLAY, 'center');
    button(ctx, 304, modalY + 475, 472, 78, 'BACK TO THE SITE', P.yellow, P.ink, 22, true, 18);
    ctx.restore();
  }
}

function drawPage(ctx, id, assets, state) {
  if (id === 'hook') drawHookPage(ctx, assets, state.local || 0);
  else if (id === 'home') drawHomePage(ctx, assets, state.scroll || 0, state.local || 0);
  else if (id === 'services') drawServicesPage(ctx, assets, state.scroll || 0, state.local || 0);
  else if (id === 'process') drawProcessPage(ctx, assets, state.scroll || 0, state.local || 0);
  else if (id === 'booking') drawBookingPage(ctx, state.local || 0, state.success || 0);
  else drawHookPage(ctx, assets, state.local || 0);
}

function routeState(id, local) {
  if (id === 'home') return { local, scroll: 252 * easeInOut((local - .48) / 2.55) };
  if (id === 'services') return { local, scroll: 126 * easeInOut((local - .52) / 2.35) };
  if (id === 'process') return { local, scroll: 64 * easeInOut((local - .55) / 2.0) };
  if (id === 'booking') return { local, success: easeOut((local - 3.42) / .30) };
  return { local };
}

function routeScene(ctx, id, previous, local, assets) {
  const state = routeState(id, local);
  const transition = .46;
  if (previous && local < transition) {
    const p = easeInOut(local / transition);
    ctx.fillStyle = id === 'services' ? P.blue : P.page;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-W * p, 0);
    drawPage(ctx, previous, assets, { local: Math.max(0, transition - .12), scroll: previous === 'home' ? 170 : previous === 'services' ? 80 : 0 });
    ctx.restore();
    ctx.save();
    ctx.translate(W * (1 - p), 0);
    drawPage(ctx, id, assets, state);
    ctx.restore();
    // A narrow color ribbon marks the route change, without ever shrinking the website.
    ctx.fillStyle = P.orange;
    ctx.globalAlpha = .9 * (1 - p);
    ctx.fillRect(W * (1 - p) - 12, HEADER, 12, H - HEADER);
    ctx.globalAlpha = 1;
    return;
  }
  drawPage(ctx, id, assets, state);
  if (id === 'home' && local > .6 && local < 1.25) {
    drawCursor(ctx, 356, 558 - state.scroll, clamp((local - .84) / .22), .86, 1 - clamp((local - 1.13) / .12));
  } else if (id === 'services' && local > .72 && local < 1.8) {
    drawCursor(ctx, 276, 618 - state.scroll, clamp((local - 1.10) / .26), .82, 1 - clamp((local - 1.63) / .14));
  } else if (id === 'booking') {
    if (local > .75 && local < 1.65) drawCursor(ctx, 250, 812, clamp((local - 1.02) / .22), .82, 1 - clamp((local - 1.48) / .12));
    else if (local >= 1.65 && local < 2.55) drawCursor(ctx, 390, 1048, clamp((local - 1.96) / .22), .82, 1 - clamp((local - 2.38) / .12));
    else if (local >= 2.55 && local < 3.45) drawCursor(ctx, 522, 1180, clamp((local - 2.85) / .24), .82, 1 - clamp((local - 3.28) / .12));
  }
}

function drawAtmosphere(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0B1A3E');
  g.addColorStop(.56, '#16356F');
  g.addColorStop(1, '#0A1837');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const orbs = [
    { x: 240 + Math.sin(time * .45) * 42, y: 820, r: 440, color: 'rgba(44,99,244,.28)' },
    { x: 890, y: 520 + Math.cos(time * .40) * 38, r: 320, color: 'rgba(255,117,74,.17)' },
    { x: 520, y: 1580, r: 350, color: 'rgba(93,219,239,.12)' },
  ];
  for (const orb of orbs) {
    const radial = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    radial.addColorStop(0, orb.color);
    radial.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(orb.x - orb.r, orb.y - orb.r, orb.r * 2, orb.r * 2);
  }
  ctx.save();
  ctx.globalAlpha = .14;
  ctx.strokeStyle = 'rgba(93,219,239,.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(540, 1120, 300 + i * 42, 160 + i * 28, -.28, time * .06 + i, time * .06 + i + Math.PI * 1.55);
    ctx.stroke();
  }
  ctx.restore();
}

function drawContactRow(ctx, y, iconKind, label, local) {
  const reveal = easeOut((local - .36) / .30);
  ctx.save();
  ctx.globalAlpha = reveal;
  roundedRect(ctx, 90, y - 54, 900, 112, 26, 'rgba(255,255,255,.98)', 'rgba(255,255,255,.44)', 1.6);
  circle(ctx, 147, y, 31, iconKind === 'web' ? P.sky : P.mint);
  ctx.strokeStyle = P.blue;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (iconKind === 'web') {
    ctx.beginPath(); ctx.arc(147, y, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(147, y, 7, 17, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(131, y); ctx.lineTo(163, y); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(137, y - 13); ctx.quadraticCurveTo(132, y - 3, 143, y + 9);
    ctx.quadraticCurveTo(154, y + 20, 163, y + 9); ctx.lineTo(155, y + 1);
    ctx.lineTo(149, y + 6); ctx.lineTo(140, y - 3); ctx.lineTo(145, y - 9); ctx.closePath(); ctx.stroke();
  }
  const size = iconKind === 'web' ? 42 : 44;
  fitText(ctx, label, 206, y + 14, 735, size, P.ink, 800, DISPLAY);
  ctx.restore();
}

function drawCta(ctx, local) {
  drawAtmosphere(ctx, local);
  const tag = easeOut((local + .04) / .26);
  ctx.save(); ctx.globalAlpha = tag;
  pill(ctx, 274, 224, 532, 54, 'WEBSITES FOR SERVICE BUSINESSES', 'rgba(255,255,255,.12)', P.aqua, 19, 'rgba(93,219,239,.48)');
  ctx.restore();
  const markAlpha = easeOut((local + .02) / .34);
  drawChronolyteMark(ctx, 540, 412, 51, markAlpha);
  ctx.save(); ctx.globalAlpha = markAlpha;
  text(ctx, 'CHRONOLYTE AI', 540, 518, 45, P.white, 800, DISPLAY, 'center');
  ctx.restore();
  popText(ctx, 'NEED A WEBSITE', 540, 686, 940, 77, P.white, (local - .10) / .32, 800, 'center');
  popText(ctx, 'LIKE THIS?', 540, 808, 900, 108, P.yellow, (local - .38) / .34, 800, 'center');
  ctx.save(); ctx.globalAlpha = easeOut((local - .55) / .26);
  text(ctx, 'Make your first impression impossible to miss.', 540, 876, 27, 'rgba(236,244,255,.86)', 600, BODY, 'center');
  ctx.restore();
  drawContactRow(ctx, 1040, 'web', 'www.chronolyteai.site', local);
  drawContactRow(ctx, 1188, 'phone', '+1 (812) 690-6121', local);
  ctx.save(); ctx.globalAlpha = easeOut((local - .48) / .28) * .76;
  text(ctx, 'WEB DESIGN  ·  CREATIVE EXPERIENCES', 540, 1378, 18, 'rgba(229,241,255,.75)', 800, DISPLAY, 'center');
  ctx.restore();
  // Small visual pulse under the contact card keeps the hold alive but leaves the details still.
  const p = .5 + .5 * Math.sin(local * 2.5);
  ctx.save(); ctx.globalAlpha = .18 + .14 * p;
  roundedRect(ctx, 450, 1460, 180, 5, 3, P.aqua);
  ctx.restore();
}

export function drawSceneV2(ctx, t, { assets, beats }) {
  const beat = beats.find((item) => t >= item.start && t < item.end) || beats.at(-1);
  const local = Math.max(0, t - beat.start);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (beat.id === 'hook') {
    drawHookPage(ctx, assets, local);
  } else if (beat.id === 'home') {
    routeScene(ctx, 'home', 'hook', local, assets);
  } else if (beat.id === 'services') {
    routeScene(ctx, 'services', 'home', local, assets);
  } else if (beat.id === 'process') {
    routeScene(ctx, 'process', 'services', local, assets);
  } else if (beat.id === 'booking') {
    routeScene(ctx, 'booking', 'process', local, assets);
  } else {
    drawCta(ctx, local);
  }
  ctx.restore();
}
