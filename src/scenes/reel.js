const DISPLAY = '"Space Grotesk", Arial, sans-serif';
const BODY = '"DM Sans", Arial, sans-serif';
const C = {
  night: '#071923', night2: '#0d2937', ink: '#102d3b', ink2: '#183b48',
  paper: '#f5f6f1', white: '#f7f8f4', aqua: '#62e8d3', aquaDeep: '#147c79',
  amber: '#ffb874', body: '#253a43', muted: '#718890', pale: '#e4eeea', line: '#d9e2de',
  green: '#1a9a77', red: '#ff8f73',
};
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => { p = clamp(p); return 1 - Math.pow(1 - p, 3); };
const easeInOut = (p) => { p = clamp(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const easeBack = (p) => { p = clamp(p); const c1 = 1.55; return 1 + (c1 + 1) * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const fract = (x) => x - Math.floor(x);

let shaderProgram;
let vertexBuffer;
let shaderUniforms;
let photos = {};

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

function setFont(ctx, size, weight = 600, family = BODY) {
  ctx.font = `${weight} ${size}px ${family}`;
}
function text(ctx, value, x, y, size, color = C.white, weight = 600, family = BODY, align = 'left', shadow = null) {
  ctx.save();
  setFont(ctx, size, weight, family);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = shadow.color || 'rgba(0,0,0,.3)';
    ctx.shadowBlur = shadow.blur || 12;
    ctx.shadowOffsetY = shadow.y || 4;
  }
  ctx.fillText(value, x, y);
  ctx.restore();
}
function centered(ctx, value, x, y, size, color = C.white, weight = 700, family = DISPLAY, shadow = null) {
  text(ctx, value, x, y, size, color, weight, family, 'center', shadow);
}
function lineText(ctx, value, x, y, maxWidth, size, color, weight = 700, family = DISPLAY, align = 'left') {
  ctx.save();
  setFont(ctx, size, weight, family);
  let current = size;
  while (ctx.measureText(value).width > maxWidth && current > 12) {
    current -= 1;
    setFont(ctx, current, weight, family);
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
  ctx.restore();
}
function pill(ctx, x, y, w, h, label, fill = C.night2, fg = C.aqua, border = 'rgba(98,232,211,.32)', size = 16) {
  ctx.save();
  roundedRect(ctx, x, y, w, h, h / 2, fill, border, 1.5);
  setFont(ctx, size, 700, DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}
function button(ctx, x, y, w, h, label, { fill = C.aqua, fg = C.night, size = 20, arrow = true, radius = 18 } = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(69,219,196,.25)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 7;
  roundedRect(ctx, x, y, w, h, radius, fill, 'rgba(255,255,255,.38)', 1);
  ctx.shadowColor = 'transparent';
  setFont(ctx, size, 800, DISPLAY);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = fg;
  ctx.fillText(label, x + 24, y + h / 2 + 1);
  if (arrow) {
    const cx = x + w - 35;
    const cy = y + h / 2;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.lineTo(cx + 1, cy - 6);
    ctx.moveTo(cx + 7, cy);
    ctx.lineTo(cx + 1, cy + 6);
    ctx.stroke();
  }
  ctx.restore();
}
function drawImageCover(ctx, image, x, y, w, h, radius = 18, shade = true) {
  if (!image || !image.complete || !image.naturalWidth) return;
  ctx.save();
  roundedRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = w / h;
  let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  if (shade) {
    const g = ctx.createLinearGradient(0, y + h * .46, 0, y + h);
    g.addColorStop(0, 'rgba(5,18,23,0)');
    g.addColorStop(1, 'rgba(5,18,23,.62)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y + h * .46, w, h * .54);
  }
  ctx.restore();
}
function circle(ctx, x, y, r, fill, stroke = null, width = 1) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function drawSnow(ctx, x, y, r, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.translate(x, y);
  for (let i = 0; i < 3; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * .55, 0); ctx.lineTo(r * .32, -r * .2); ctx.moveTo(r * .55, 0); ctx.lineTo(r * .32, r * .2); ctx.stroke();
  }
  ctx.restore();
}
function drawSun(ctx, x, y, r, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
  circle(ctx, x, y, r * .42, null, color, 3);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * .68, y + Math.sin(a) * r * .68); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke();
  }
  ctx.restore();
}
function drawAir(ctx, x, y, r, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const yy = y + i * 9;
    ctx.beginPath(); ctx.moveTo(x - r, yy); ctx.bezierCurveTo(x - r * .25, yy - 7, x + r * .2, yy + 7, x + r, yy - 2); ctx.stroke();
  }
  ctx.restore();
}
function drawHomeMark(ctx, x, y, size, color = C.aqua) {
  ctx.save();
  circle(ctx, x, y, size / 2, color);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(2, size * .055);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size * .23, y + size * .10);
  ctx.bezierCurveTo(x - size * .06, y - size * .26, x + size * .10, y + size * .27, x + size * .26, y - size * .08);
  ctx.stroke();
  ctx.restore();
}
function drawChronolyteMark(ctx, x, y, r, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.lineWidth = 5; ctx.strokeStyle = C.aqua; ctx.shadowColor = 'rgba(98,232,211,.4)'; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(x, y, r, -.48, Math.PI * 1.58); ctx.stroke();
  ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,184,116,.94)';
  ctx.beginPath(); ctx.arc(x, y, r * .62, .24, Math.PI * 1.82); ctx.stroke();
  circle(ctx, x + r * .78, y - r * .54, 5, C.amber);
  circle(ctx, x - r * .58, y + r * .68, 4, C.aqua);
  ctx.restore();
}
function drawPointer(ctx, x, y, click = 0, alpha = 1, scale = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const pulse = clamp(click);
  if (pulse > 0) {
    ctx.strokeStyle = `rgba(98,232,211,${.75 * (1 - pulse)})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x + 6, y + 8, 14 + pulse * 34, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(5,22,29,.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 35); ctx.lineTo(9, 27); ctx.lineTo(16, 43); ctx.lineTo(24, 39); ctx.lineTo(16, 23); ctx.lineTo(28, 22); ctx.closePath();
  ctx.fillStyle = C.white; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.restore();
}
function drawCheck(ctx, x, y, r, color = C.green) {
  ctx.save();
  circle(ctx, x, y, r, color);
  ctx.strokeStyle = C.white; ctx.lineWidth = Math.max(4, r * .12); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - r * .42, y + r * .03); ctx.lineTo(x - r * .12, y + r * .34); ctx.lineTo(x + r * .46, y - r * .36); ctx.stroke();
  ctx.restore();
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || 'Unknown shader error';
    gl.deleteShader(shader);
    throw new Error(`WebGL shader compile failed: ${error}`);
  }
  return shader;
}
function createAtmosphere(gl) {
  const vertex = `
    attribute vec2 a_position;
    void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
  `;
  const fragment = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      uv.y = 1.0 - uv.y;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= u_resolution.x / u_resolution.y;
      float t = u_time;
      vec2 c1 = vec2(-0.20 + 0.11 * sin(t * 0.31), 0.18 + 0.13 * cos(t * 0.23));
      vec2 c2 = vec2(0.26 + 0.12 * cos(t * 0.24), -0.40 + 0.10 * sin(t * 0.29));
      vec2 c3 = vec2(0.02 + 0.08 * sin(t * 0.17), -0.02);
      float d1 = length((p - c1) * vec2(1.0, 0.83));
      float d2 = length((p - c2) * vec2(0.78, 1.10));
      float d3 = length((p - c3) * vec2(0.90, 1.06));
      float glowA = exp(-d1 * 3.4) * (0.55 + 0.08 * sin(t * 0.7));
      float glowB = exp(-d2 * 3.0) * (0.48 + 0.06 * cos(t * 0.55));
      float glowC = exp(-d3 * 4.0) * 0.16;
      vec3 col = mix(vec3(0.018, 0.048, 0.064), vec3(0.008, 0.022, 0.032), uv.y * 0.85);
      col += vec3(0.035, 0.47, 0.46) * glowA;
      col += vec3(0.60, 0.25, 0.10) * glowB;
      col += vec3(0.035, 0.19, 0.25) * glowC;
      float gx = 1.0 - smoothstep(0.004, 0.012, abs(fract(uv.x * 18.0) - 0.5));
      float gy = 1.0 - smoothstep(0.004, 0.012, abs(fract(uv.y * 32.0) - 0.5));
      float grid = max(gx, gy) * 0.035;
      float sweep = 0.5 + 0.5 * sin((uv.y * 4.4 + sin(uv.x * 5.0 + t * 0.22) * 0.09 - t * 0.07) * 6.28318);
      col += vec3(0.018, 0.08, 0.09) * grid;
      col += vec3(0.006, 0.022, 0.027) * sweep * 0.24;
      float vignette = 1.0 - smoothstep(0.30, 1.42, length(p * vec2(0.66, 0.70)));
      col *= 0.72 + 0.28 * vignette;
      float grain = hash(gl_FragCoord.xy) - 0.5;
      col += grain * 0.012;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertex);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`WebGL program link failed: ${gl.getProgramInfoLog(program)}`);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  return {
    program,
    buffer,
    position: gl.getAttribLocation(program, 'a_position'),
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    time: gl.getUniformLocation(program, 'u_time'),
  };
}

export async function initReel({ gl }) {
  const load = (path) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image failed to load: ${path}`));
    image.src = path;
  });
  const [hero, thermostat] = await Promise.all([
    load('/assets/ai/hvac-technician-hero.jpg'),
    load('/assets/ai/hvac-thermostat-finished.jpg'),
  ]);
  photos = { hero, thermostat };
  const shader = createAtmosphere(gl);
  shaderProgram = shader.program;
  vertexBuffer = shader.buffer;
  shaderUniforms = shader;
  return photos;
}

export function renderBackdrop(gl, backdrop, t, { W, H }) {
  gl.viewport(0, 0, backdrop.width, backdrop.height);
  gl.disable(gl.BLEND);
  gl.useProgram(shaderProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(shaderUniforms.position);
  gl.vertexAttribPointer(shaderUniforms.position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(shaderUniforms.resolution, backdrop.width, backdrop.height);
  gl.uniform1f(shaderUniforms.time, t);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function ambientParticles(ctx, t, { W, H, alpha = .36 }) {
  ctx.save();
  for (let i = 0; i < 24; i++) {
    const seed = i * 17.23;
    const x = fract(Math.sin(seed * 1.73) * 321.77) * W;
    const y0 = fract(Math.sin(seed * 2.91) * 921.41) * H;
    const y = fract(y0 / H + t * (.012 + (i % 5) * .002)) * H;
    const radius = 1.2 + (i % 4) * .6;
    const opacity = alpha * (.35 + .65 * (.5 + .5 * Math.sin(t * 1.6 + seed)));
    circle(ctx, x, y, radius, `rgba(184,241,232,${opacity})`);
  }
  ctx.restore();
}
function drawAmbientRings(ctx, cx, cy, t, { alpha = .7, radius = 220, color = C.aqua } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 3; i++) {
    const r = radius + i * 42 + Math.sin(t * .7 + i) * 8;
    ctx.globalAlpha = alpha * (0.22 - i * .045);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * (1 + i * .08), r * .58, -.30 + i * .22, t * (.09 + i * .025), t * (.09 + i * .025) + Math.PI * 1.55, false); ctx.stroke();
  }
  ctx.restore();
}
function drawSoftGlow(ctx, x, y, r, color, alpha = .4) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('ALPHA', String(alpha)));
  g.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function drawKineticLine(ctx, value, x, y, size, color, progress, maxW, align = 'center') {
  const p = clamp(progress);
  if (p <= 0) return;
  const e = easeBack(p);
  const alpha = easeOut(p);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + (1 - easeOut(p)) * 34);
  ctx.scale(0.82 + 0.18 * e, 0.82 + 0.18 * e);
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  setFont(ctx, size, 700, DISPLAY);
  ctx.shadowColor = color === C.aqua ? 'rgba(98,232,211,.32)' : 'rgba(2,13,20,.45)';
  ctx.shadowBlur = 26; ctx.shadowOffsetY = 9;
  ctx.fillStyle = color;
  let f = size;
  while (ctx.measureText(value).width > maxW && f > 24) { f -= 1; setFont(ctx, f, 700, DISPLAY); }
  ctx.fillText(value, 0, 0);
  ctx.restore();
}

function drawHook(ctx, t, W, H) {
  const local = t;
  drawAmbientRings(ctx, 540, 930, local, { alpha: .74, radius: 290, color: C.aqua });
  drawSoftGlow(ctx, 230 + Math.sin(local * .8) * 44, 920, 340, 'rgba(69,219,196,ALPHA)', .24);
  drawSoftGlow(ctx, 860, 670 + Math.cos(local * .7) * 36, 300, 'rgba(255,161,93,ALPHA)', .20);
  const tagP = clamp((local + .03) / .12);
  ctx.save(); ctx.globalAlpha = easeOut(tagP);
  pill(ctx, 340, 270, 400, 48, 'WEB DESIGN FOR HVAC', 'rgba(12,41,54,.84)', C.aqua, 'rgba(98,232,211,.45)', 19);
  ctx.restore();
  drawKineticLine(ctx, 'HVAC OWNERS', 540, 620, 66, C.white, (local + .12) / .33, 860);
  drawKineticLine(ctx, 'YOUR NEXT', 540, 790, 82, C.white, (local - .42) / .32, 850);
  drawKineticLine(ctx, 'CUSTOMER', 540, 920, 124, C.aqua, (local - .73) / .38, 920);
  drawKineticLine(ctx, 'IS SCROLLING.', 540, 1012, 62, C.white, (local - 1.08) / .30, 850);

  const preview = easeOut(clamp((local - 1.28) / .48));
  if (preview > 0) {
    ctx.save(); ctx.globalAlpha = preview;
    const x = 248, y = lerp(1338, 1262, preview), w = 584, h = 138;
    ctx.shadowColor = 'rgba(1,10,16,.5)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 18;
    roundedRect(ctx, x, y, w, h, 28, 'rgba(10,36,49,.95)', 'rgba(139,216,208,.35)', 2);
    ctx.shadowBlur = 0;
    drawHomeMark(ctx, x + 47, y + 49, 38, C.aqua);
    text(ctx, 'NORTHLINE', x + 79, y + 46, 19, C.white, 700, DISPLAY);
    text(ctx, 'HEATING  ·  COOLING  ·  HOME COMFORT', x + 80, y + 71, 12, '#a8c2c6', 700, DISPLAY);
    button(ctx, x + 24, y + 83, w - 48, 42, 'BOOK A VISIT', { size: 17, radius: 14 });
    const click = clamp((local - 1.83) / .35);
    const pointerX = x + w * .69;
    const pointerY = y + 98;
    drawPointer(ctx, pointerX, pointerY, click, 1, .7);
    ctx.restore();
  }
}

function drawSectionHeader(ctx, number, route, lines, progress) {
  const e = easeOut(progress);
  ctx.save(); ctx.globalAlpha = e;
  pill(ctx, 80, 244 + (1 - e) * 16, 204, 39, `${number}  /  ${route}`, 'rgba(13,41,55,.88)', C.aqua, 'rgba(98,232,211,.28)', 15);
  ctx.restore();
  if (lines.length === 1) {
    drawKineticLine(ctx, lines[0], 80, 360, 48, C.white, progress, 910, 'left');
  } else {
    drawKineticLine(ctx, lines[0], 80, 335, 44, C.white, progress, 910, 'left');
    drawKineticLine(ctx, lines[1], 80, 389, 44, C.aqua, progress, 910, 'left');
  }
  ctx.save(); ctx.globalAlpha = .75;
  const x0 = 824, y0 = 268;
  for (let i = 0; i < 3; i++) {
    const active = i === Number(number) - 1;
    roundedRect(ctx, x0 + i * 42, y0, active ? 31 : 12, 10, 5, active ? C.aqua : 'rgba(168,188,194,.30)');
  }
  ctx.restore();
}

function drawNorthlineHeader(ctx, sx, sy, sw, time) {
  ctx.fillStyle = '#fbfcf8'; ctx.fillRect(sx, sy, sw, 76);
  ctx.strokeStyle = 'rgba(16,45,59,.10)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(sx + 18, sy + 76); ctx.lineTo(sx + sw - 18, sy + 76); ctx.stroke();
  drawHomeMark(ctx, sx + 39, sy + 38, 34, C.aqua);
  text(ctx, 'NORTHLINE', sx + 66, sy + 35, 20, C.ink, 800, DISPLAY);
  text(ctx, 'HVAC', sx + 67, sy + 55, 11, C.muted, 800, DISPLAY);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(sx + sw - 51, sy + 30 + i * 8); ctx.lineTo(sx + sw - 26, sy + 30 + i * 8); ctx.stroke();
  }
  if (time > 0) {
    const dot = .65 + .25 * Math.sin(time * 2.2);
    circle(ctx, sx + sw - 62, sy + 38, 3, `rgba(20,124,121,${dot})`);
  }
}
function drawStatusBar(ctx, sx, sy, sw) {
  ctx.fillStyle = '#fbfcf8'; ctx.fillRect(sx, sy, sw, 40);
  text(ctx, '9:41', sx + 28, sy + 26, 16, C.ink, 700, BODY);
  const ix = sx + sw - 89, iy = sy + 19;
  ctx.save(); ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) ctx.fillRect(ix + i * 5, iy + 3 - i * 3, 3, 5 + i * 3);
  ctx.beginPath(); ctx.arc(ix + 35, iy + 3, 9, Math.PI * 1.17, Math.PI * 1.83); ctx.stroke();
  ctx.beginPath(); ctx.arc(ix + 35, iy + 3, 5, Math.PI * 1.20, Math.PI * 1.80); ctx.stroke();
  roundedRect(ctx, ix + 54, iy - 8, 24, 15, 4, null, C.ink, 1.8);
  ctx.fillRect(ix + 78, iy - 4, 3, 7); roundedRect(ctx, ix + 57, iy - 5, 15, 9, 2, C.ink);
  ctx.restore();
}

function pageEyebrow(ctx, label, x, y, color = C.aquaDeep) {
  ctx.save(); roundedRect(ctx, x, y - 21, 154, 31, 15, '#e0f5ef');
  setFont(ctx, 14, 800, DISPLAY); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(label, x + 77, y - 5); ctx.restore();
}
function pageHome(ctx, sw, scroll, assets, localTime) {
  const m = 28, width = sw - m * 2;
  pageEyebrow(ctx, 'HOME COMFORT', m, 37);
  text(ctx, 'Your comfort,', m, 112, 55, C.ink, 700, DISPLAY);
  text(ctx, 'handled.', m, 170, 55, C.ink, 700, DISPLAY);
  text(ctx, 'Heating and cooling, made simple.', m, 215, 22, '#536b72', 500, BODY);
  button(ctx, m, 248, 270, 60, 'BOOK A VISIT', { size: 18, radius: 16 });
  drawImageCover(ctx, assets.hero, m, 334, width, 274, 22, true);
  ctx.save(); roundedRect(ctx, m + 18, 334 + 218, 190, 36, 18, 'rgba(8,31,41,.76)', 'rgba(255,255,255,.18)', 1);
  text(ctx, 'HOME COMFORT, HANDLED', m + 32, 334 + 242, 12, C.white, 800, DISPLAY); ctx.restore();
  text(ctx, 'AC repair  ·  Heating  ·  Indoor air', m, 652, 18, C.aquaDeep, 700, DISPLAY);
  roundedRect(ctx, m, 690, width, 196, 22, '#ffffff', '#e0e7e3', 1.4);
  text(ctx, 'A home that feels right.', m + 24, 740, 27, C.ink, 700, DISPLAY);
  text(ctx, 'From quick repairs to seasonal tune-ups,', m + 24, 777, 18, '#566e75', 500, BODY);
  text(ctx, 'help is just one clear step away.', m + 24, 804, 18, '#566e75', 500, BODY);
  button(ctx, m + 24, 826, width - 48, 48, 'EXPLORE SERVICES', { size: 16, radius: 14, arrow: true });
  text(ctx, 'LOCAL HOME COMFORT', m, 934, 13, C.muted, 800, DISPLAY);
}
function serviceIcon(ctx, kind, x, y) {
  circle(ctx, x, y, 28, '#e1f6f1');
  if (kind === 'snow') drawSnow(ctx, x, y, 16, C.aquaDeep);
  else if (kind === 'sun') drawSun(ctx, x, y, 17, C.aquaDeep);
  else if (kind === 'air') drawAir(ctx, x, y, 16, C.aquaDeep);
  else {
    ctx.save(); ctx.strokeStyle = C.aquaDeep; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 14, y + 8); ctx.lineTo(x, y - 13); ctx.lineTo(x + 14, y + 8); ctx.lineTo(x + 14, y + 17); ctx.lineTo(x - 14, y + 17); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
}
function serviceCard(ctx, x, y, w, h, icon, titleValue, description) {
  roundedRect(ctx, x, y, w, h, 19, '#ffffff', '#e1e8e4', 1.2);
  serviceIcon(ctx, icon, x + 43, y + 43);
  text(ctx, titleValue, x + 20, y + 96, 21, C.ink, 700, DISPLAY);
  text(ctx, description, x + 20, y + 124, 15, '#637981', 500, BODY);
  ctx.strokeStyle = 'rgba(20,124,121,.7)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + w - 32, y + 25); ctx.lineTo(x + w - 20, y + 37); ctx.lineTo(x + w - 32, y + 49); ctx.stroke();
}
function pageServices(ctx, sw, scroll, assets) {
  const m = 27, width = sw - m * 2, gap = 14, cardW = (width - gap) / 2;
  pageEyebrow(ctx, 'OUR SERVICES', m, 36);
  text(ctx, 'Comfort, covered.', m, 111, 52, C.ink, 700, DISPLAY);
  text(ctx, 'Find the right help, fast.', m, 151, 22, '#536b72', 500, BODY);
  serviceCard(ctx, m, 190, cardW, 150, 'snow', 'AC repair', 'Repairs & tune-ups');
  serviceCard(ctx, m + cardW + gap, 190, cardW, 150, 'sun', 'Heating', 'Warmth, made simple');
  serviceCard(ctx, m, 354, cardW, 150, 'home', 'New systems', 'Install with confidence');
  serviceCard(ctx, m + cardW + gap, 354, cardW, 150, 'air', 'Indoor air', 'Breathe a little easier');
  drawImageCover(ctx, assets.thermostat, m, 534, width, 224, 21, true);
  roundedRect(ctx, m + 16, 696, 172, 36, 18, 'rgba(8,31,41,.78)', 'rgba(255,255,255,.18)', 1);
  text(ctx, 'PERSONALIZED COMFORT', m + 28, 720, 11, C.white, 800, DISPLAY);
  text(ctx, 'The right service,', m, 796, 27, C.ink, 700, DISPLAY);
  text(ctx, 'without the runaround.', m, 831, 27, C.ink, 700, DISPLAY);
  button(ctx, m, 853, width, 54, 'BOOK A VISIT', { size: 17, radius: 15 });
  text(ctx, 'AC  ·  HEAT  ·  AIR', m, 941, 13, C.muted, 800, DISPLAY);
}
function dateTile(ctx, x, y, w, label, date, selected = false) {
  roundedRect(ctx, x, y, w, 76, 15, selected ? C.ink : '#ffffff', selected ? C.ink : '#d8e2de', 1.4);
  text(ctx, label, x + w / 2, y + 26, 13, selected ? '#bfd5d6' : C.muted, 800, DISPLAY, 'center');
  text(ctx, date, x + w / 2, y + 55, 23, selected ? C.white : C.ink, 700, DISPLAY, 'center');
}
function pageBooking(ctx, sw, scroll, assets, showSuccess, localTime) {
  const m = 28, width = sw - m * 2;
  pageEyebrow(ctx, 'ONLINE SCHEDULING', m, 35);
  text(ctx, "Let's get it", m, 105, 50, C.ink, 700, DISPLAY);
  text(ctx, 'comfortable.', m, 158, 50, C.ink, 700, DISPLAY);
  text(ctx, 'Choose what you need and a time.', m, 198, 20, '#536b72', 500, BODY);
  text(ctx, 'SERVICE', m, 244, 13, C.muted, 800, DISPLAY);
  roundedRect(ctx, m, 258, width, 77, 17, '#ffffff', '#dce5e1', 1.3);
  circle(ctx, m + 37, 296, 19, '#e2f7f1'); drawSnow(ctx, m + 37, 296, 11, C.aquaDeep);
  text(ctx, 'Air conditioner repair', m + 70, 302, 20, C.ink, 700, BODY);
  text(ctx, 'CHOOSE A DAY', m, 375, 13, C.muted, 800, DISPLAY);
  const dayW = (width - 20) / 3;
  dateTile(ctx, m, 389, dayW, 'TUE', '14', true);
  dateTile(ctx, m + dayW + 10, 389, dayW, 'WED', '15', false);
  dateTile(ctx, m + (dayW + 10) * 2, 389, dayW, 'THU', '16', false);
  text(ctx, 'AVAILABLE WINDOW', m, 501, 13, C.muted, 800, DISPLAY);
  const chipY = 515, chipW = (width - 18) / 2;
  roundedRect(ctx, m, chipY, chipW, 54, 14, '#e2f7f1', 'rgba(20,124,121,.35)', 1.2);
  text(ctx, '10 AM – 12 PM', m + chipW / 2, chipY + 34, 16, C.aquaDeep, 700, DISPLAY, 'center');
  roundedRect(ctx, m + chipW + 18, chipY, chipW, 54, 14, '#ffffff', '#dce5e1', 1.2);
  text(ctx, '12 PM – 2 PM', m + chipW + 18 + chipW / 2, chipY + 34, 16, C.ink, 700, DISPLAY, 'center');
  button(ctx, m, 602, width, 60, 'REQUEST A VISIT', { size: 17, radius: 16 });
  text(ctx, 'We’ll contact you to confirm the details.', m, 698, 16, '#637981', 500, BODY);
  roundedRect(ctx, m, 740, width, 120, 20, '#eaf2ee');
  drawHomeMark(ctx, m + 38, 780, 27, C.aqua);
  text(ctx, 'A SIMPLE WAY TO GET STARTED', m + 62, 785, 13, C.aquaDeep, 800, DISPLAY);
  text(ctx, 'Clear choices. No long forms.', m + 22, 826, 20, C.ink, 700, DISPLAY);
  if (showSuccess > 0) {
    ctx.save();
    const a = easeOut(showSuccess);
    ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(2,20,27,.18)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14;
    roundedRect(ctx, m + 10, 207 - (1 - a) * 22, width - 20, 484, 30, '#ffffff', '#d9e4df', 1.3);
    ctx.shadowColor = 'transparent';
    drawCheck(ctx, sw / 2, 292 - (1 - a) * 22, 42, C.green);
    text(ctx, 'Request received.', sw / 2, 383 - (1 - a) * 22, 34, C.ink, 700, DISPLAY, 'center');
    text(ctx, 'We’ll reach out shortly to confirm.', sw / 2, 422 - (1 - a) * 22, 18, '#5f747b', 500, BODY, 'center');
    roundedRect(ctx, m + 38, 465 - (1 - a) * 22, width - 76, 75, 18, '#f1f6f3');
    text(ctx, 'AC REPAIR  ·  TUE 14  ·  10 AM', sw / 2, 510 - (1 - a) * 22, 14, C.aquaDeep, 800, DISPLAY, 'center');
    text(ctx, 'Sample booking experience', sw / 2, 579 - (1 - a) * 22, 13, C.muted, 600, BODY, 'center');
    ctx.restore();
  }
}

function pageDraw(ctx, page, sw, scroll, assets, showSuccess, time) {
  ctx.save();
  ctx.translate(0, -scroll);
  if (page === 'home') pageHome(ctx, sw, scroll, assets, time);
  else if (page === 'services') pageServices(ctx, sw, scroll, assets);
  else pageBooking(ctx, sw, scroll, assets, showSuccess, time);
  ctx.restore();
}

function drawPhone(ctx, {
  x = 170, y = 440, w = 740, h = 1040, scale = 1, rotation = 0,
  page = 'home', previous = null, routeProgress = 1, scroll = 0, success = 0,
  assets, time = 0, pointer = null, alpha = 1,
}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(0,0,0,.50)'; ctx.shadowBlur = 48; ctx.shadowOffsetY = 25;
  const caseGradient = ctx.createLinearGradient(0, 0, w, h);
  caseGradient.addColorStop(0, '#07131a'); caseGradient.addColorStop(.48, '#1b303b'); caseGradient.addColorStop(1, '#050d12');
  roundedRect(ctx, 0, 0, w, h, 60, caseGradient, 'rgba(190,223,224,.62)', 2);
  ctx.shadowColor = 'transparent';
  const sx = 15, sy = 16, sw = w - 30, sh = h - 32;
  ctx.save();
  roundedRect(ctx, sx, sy, sw, sh, 47, C.paper, 'rgba(214,228,224,.75)', 1.2);
  ctx.clip();
  ctx.fillStyle = C.paper; ctx.fillRect(sx, sy, sw, sh);
  drawStatusBar(ctx, sx, sy, sw);
  drawNorthlineHeader(ctx, sx, sy + 40, sw, time);
  const bodyTop = sy + 116;
  const bodyH = sh - 116 - 10;
  ctx.save();
  ctx.beginPath(); ctx.rect(sx, bodyTop, sw, bodyH); ctx.clip();
  ctx.translate(sx, bodyTop);
  if (previous && routeProgress < 1) {
    const p = easeInOut(routeProgress);
    ctx.save(); ctx.translate(-sw * p, 0);
    pageDraw(ctx, previous, sw, Math.min(scroll, 80), assets, 0, time);
    ctx.restore();
    ctx.save(); ctx.translate(sw * (1 - p), 0);
    pageDraw(ctx, page, sw, scroll, assets, success, time);
    ctx.restore();
  } else {
    pageDraw(ctx, page, sw, scroll, assets, success, time);
  }
  ctx.restore();

  if (scroll > 12 && page !== 'booking') {
    const trackX = sx + sw - 8, trackY = bodyTop + 42, trackH = bodyH - 92;
    roundedRect(ctx, trackX, trackY, 3, trackH, 2, 'rgba(16,45,59,.14)');
    const maxScroll = page === 'home' ? 260 : 230;
    const thumbY = trackY + (trackH - 116) * clamp(scroll / maxScroll);
    roundedRect(ctx, trackX - 1, thumbY, 5, 116, 3, 'rgba(20,124,121,.72)');
  }
  if (pointer) {
    const bx = sx + (pointer.x ?? sw * .72);
    const by = bodyTop + (pointer.y ?? 300) - scroll;
    drawPointer(ctx, bx, by, pointer.click || 0, pointer.alpha ?? 1, pointer.scale ?? .9);
  }
  // Quiet hardware details and the home indicator keep the mockup clearly mobile.
  ctx.fillStyle = '#08151b'; roundedRect(ctx, w / 2 - 52, sy + 8, 104, 17, 9, '#08151b');
  roundedRect(ctx, w / 2 - 55, h - 24, 110, 5, 3, 'rgba(10,26,33,.65)');
  ctx.restore();
  // Subtle polished rim; no bright chrome flare.
  ctx.strokeStyle = 'rgba(227,248,245,.28)'; ctx.lineWidth = 1;
  roundedRect(ctx, 2, 2, w - 4, h - 4, 58, null, 'rgba(227,248,245,.18)', 1);
  ctx.restore();
}

function productScene(ctx, t, beat, config) {
  const local = t - beat.start;
  const route = beat.id === 'home' ? 'HOME' : beat.id === 'services' ? 'SERVICES' : 'BOOKING';
  const number = beat.id === 'home' ? '01' : beat.id === 'services' ? '02' : '03';
  let lines;
  if (beat.id === 'home') lines = ['FIRST IMPRESSIONS.', 'ZERO GUESSWORK.'];
  else if (beat.id === 'services') lines = ['EVERY SERVICE.', 'EASY TO FIND.'];
  else lines = ['TAP. CHOOSE.', 'REQUEST A VISIT.'];
  drawSectionHeader(ctx, number, route, lines, local / .40);
  const deviceIn = easeOut(clamp(local / .48));
  const y = lerp(490, 442, deviceIn);
  const scale = lerp(.94, 1, deviceIn);
  const rotation = beat.id === 'services' ? lerp(.026, -.009, deviceIn) : beat.id === 'booking' ? lerp(-.025, .009, deviceIn) : lerp(-.015, .004, deviceIn);
  let scroll = 0;
  if (beat.id === 'home') scroll = 202 * easeInOut(clamp((local - .75) / 2.15));
  if (beat.id === 'services') scroll = 205 * easeInOut(clamp((local - .60) / 2.35));
  if (beat.id === 'booking') scroll = 20 * easeInOut(clamp((local - 1.5) / 1.25));
  const previous = beat.id === 'services' ? 'home' : beat.id === 'booking' ? 'services' : null;
  const routeProgress = previous ? clamp(local / .44) : 1;
  let success = beat.id === 'booking' ? clamp((local - 3.02) / .36) : 0;
  if (beat.id === 'booking') success = easeOut(success);
  let pointer = null;
  if (beat.id === 'home' && local > 2.02 && local < 2.95) {
    const click = clamp((local - 2.48) / .25);
    pointer = { x: 245, y: 248, click, alpha: clamp((local - 1.96) / .16) * (1 - clamp((local - 2.78) / .17)), scale: .72 };
  }
  if (beat.id === 'services' && local > 1.55 && local < 2.65) {
    const click = clamp((local - 2.04) / .25);
    pointer = { x: 245, y: 265, click, alpha: clamp((local - 1.50) / .14) * (1 - clamp((local - 2.52) / .20)), scale: .70 };
  }
  if (beat.id === 'booking' && local > 1.25 && local < 2.8) {
    const click = clamp((local - 1.56) / .24);
    const x = local < 2.0 ? 398 : 450;
    const yPointer = local < 2.0 ? 415 : 630;
    pointer = { x, y: yPointer, click, alpha: .9 * (1 - clamp((local - 2.55) / .22)), scale: .72 };
  }
  drawPhone(ctx, { x: 170, y, w: 740, h: 1040, scale, rotation, page: beat.id, previous, routeProgress, scroll, success, assets: config.assets, time: local, pointer });
  // A tiny drag trace makes the vertical scroll action legible without covering the page.
  if ((beat.id === 'home' || beat.id === 'services') && local > .74 && local < 3.5) {
    const p = clamp((local - .74) / 2.2);
    const x = 888, y0 = 602;
    ctx.save(); ctx.globalAlpha = .50 * (1 - Math.max(0, p - .82) / .18);
    ctx.strokeStyle = 'rgba(98,232,211,.82)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y0 + 78 * p); ctx.lineTo(x, y0 + 24 + 78 * p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 7, y0 + 70 + 78 * p); ctx.lineTo(x, y0 + 78 + 78 * p); ctx.lineTo(x + 7, y0 + 70 + 78 * p); ctx.stroke();
    ctx.restore();
  }
}

function miniPageTile(ctx, x, y, w, h, kind, assets, reveal, rotation = 0, scale = 1) {
  ctx.save(); ctx.globalAlpha *= reveal;
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rotation); ctx.scale(scale, scale); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = 38; ctx.shadowOffsetY = 18;
  roundedRect(ctx, 0, 0, w, h, 28, C.paper, 'rgba(227,248,245,.65)', 1.5);
  ctx.shadowColor = 'transparent';
  roundedRect(ctx, 12, 12, w - 24, 40, 14, C.ink);
  text(ctx, 'NORTHLINE', 28, 38, 13, C.white, 800, DISPLAY);
  text(ctx, kind === 'home' ? '/ home' : kind === 'services' ? '/ services' : '/ schedule', w - 26, 38, 11, '#abc5c8', 600, BODY, 'right');
  if (kind === 'home') {
    text(ctx, 'Comfort,', 23, 109, 28, C.ink, 700, DISPLAY);
    text(ctx, 'handled.', 23, 141, 28, C.ink, 700, DISPLAY);
    text(ctx, 'Heating & cooling, made simple.', 23, 164, 12, '#536b72', 500, BODY);
    drawImageCover(ctx, assets.hero, 20, 185, w - 40, 174, 15, true);
    roundedRect(ctx, 20, 322, w - 40, 29, 13, 'rgba(8,31,41,.72)');
    centered(ctx, 'HOME COMFORT', w / 2, 341, 10, C.white, 800, DISPLAY);
    button(ctx, 20, 381, w - 40, 46, 'BOOK A VISIT', { size: 13, radius: 13 });
    roundedRect(ctx, 20, 444, w - 40, 100, 16, '#ffffff', '#e1e8e4', 1);
    text(ctx, 'Local comfort,', 34, 481, 17, C.ink, 700, DISPLAY);
    text(ctx, 'made simple.', 34, 504, 17, C.ink, 700, DISPLAY);
  } else if (kind === 'services') {
    text(ctx, 'Comfort,', 23, 109, 28, C.ink, 700, DISPLAY);
    text(ctx, 'covered.', 23, 141, 28, C.ink, 700, DISPLAY);
    serviceCard(ctx, 20, 170, (w - 50) / 2, 128, 'snow', 'AC repair', 'Repairs');
    serviceCard(ctx, 30 + (w - 50) / 2, 170, (w - 50) / 2, 128, 'sun', 'Heating', 'Tune-ups');
    serviceCard(ctx, 20, 312, (w - 50) / 2, 128, 'home', 'Systems', 'Install');
    serviceCard(ctx, 30 + (w - 50) / 2, 312, (w - 50) / 2, 128, 'air', 'Indoor air', 'Breathe easy');
    drawImageCover(ctx, assets.thermostat, 20, 466, w - 40, 112, 14, true);
  } else {
    text(ctx, 'Let’s get it', 23, 109, 26, C.ink, 700, DISPLAY);
    text(ctx, 'comfortable.', 23, 139, 26, C.ink, 700, DISPLAY);
    roundedRect(ctx, 20, 165, w - 40, 68, 13, '#ffffff', '#dce5e1', 1);
    text(ctx, 'SERVICE  ·  AC repair', 33, 205, 13, C.ink, 700, BODY);
    for (let i = 0; i < 3; i++) {
      const xx = 20 + i * ((w - 48) / 3 + 4);
      roundedRect(ctx, xx, 250, (w - 56) / 3, 63, 12, i === 0 ? C.ink : '#ffffff', i === 0 ? C.ink : '#dce5e1', 1);
      centered(ctx, ['TUE 14', 'WED 15', 'THU 16'][i], xx + (w - 56) / 6, 289, 12, i === 0 ? C.white : C.ink, 700, DISPLAY);
    }
    roundedRect(ctx, 20, 335, w - 40, 48, 12, '#e2f7f1');
    centered(ctx, '10 AM – 12 PM', w / 2, 365, 12, C.aquaDeep, 700, DISPLAY);
    button(ctx, 20, 402, w - 40, 47, 'REQUEST A VISIT', { size: 12, radius: 12 });
    drawCheck(ctx, w / 2, 514, 34, C.green);
  }
  ctx.restore();
}
function flowScene(ctx, t, beat, config) {
  const local = t - beat.start;
  drawSectionHeader(ctx, '04', 'THE WHOLE EXPERIENCE', ['ONE CLEAR NEXT STEP.', 'ON EVERY PAGE.'], local / .36);
  const reveal = easeOut(clamp((local + .02) / .42));
  const fan = easeInOut(clamp((local + .02) / .72));
  const width = 284, height = 600, y = 655;
  const centers = [190, 540, 890];
  const startCenter = 540;
  const pos = centers.map((center) => lerp(startCenter, center, fan));
  drawAmbientRings(ctx, 540, 1010, local, { alpha: .44, radius: 330, color: C.aqua });
  miniPageTile(ctx, pos[0] - width / 2, y + 30 + (1 - fan) * 22, width, height, 'home', config.assets, reveal, lerp(0, -.045, fan), lerp(.90, 1, fan));
  miniPageTile(ctx, pos[1] - width / 2, y, width, height, 'services', config.assets, reveal, lerp(0, .012, fan), lerp(.90, 1, fan));
  miniPageTile(ctx, pos[2] - width / 2, y + 30 + (1 - fan) * 22, width, height, 'booking', config.assets, reveal, lerp(0, .045, fan), lerp(.90, 1, fan));
  const names = ['01  HOME', '02  SERVICES', '03  BOOKING'];
  for (let i = 0; i < 3; i++) {
    const tw = i === 1 ? 180 : 142;
    pill(ctx, pos[i] - tw / 2, 1282, tw, 38, names[i], 'rgba(12,41,54,.84)', C.aqua, 'rgba(98,232,211,.24)', 13);
  }
  const connectorAlpha = .7 * reveal;
  ctx.save(); ctx.globalAlpha = connectorAlpha; ctx.strokeStyle = 'rgba(98,232,211,.64)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(285, 1301); ctx.lineTo(388, 1301); ctx.moveTo(692, 1301); ctx.lineTo(795, 1301); ctx.stroke();
  ctx.restore();
}

function drawContactRow(ctx, x, y, w, iconKind, label) {
  circle(ctx, x + 32, y, 22, 'rgba(98,232,211,.13)', 'rgba(98,232,211,.42)', 1.5);
  ctx.save(); ctx.strokeStyle = C.aqua; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (iconKind === 'web') {
    ctx.beginPath(); ctx.arc(x + 32, y, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 32, y, 5.1, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 22, y); ctx.lineTo(x + 42, y); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(x + 25, y - 8); ctx.quadraticCurveTo(x + 22, y - 1, x + 30, y + 7); ctx.quadraticCurveTo(x + 37, y + 13, x + 42, y + 6); ctx.lineTo(x + 37, y + 1); ctx.lineTo(x + 33, y + 4); ctx.lineTo(x + 28, y - 1); ctx.lineTo(x + 31, y - 5); ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
  text(ctx, label, x + 75, y + 12, iconKind === 'web' ? 32 : 34, C.white, 600, BODY);
}
function endCard(ctx, t, beat, W, H) {
  const local = t - beat.start;
  const arrive = easeOut(clamp((local + .05) / .30));
  // A calm central aura signals the shift from demo to contact card.
  ctx.save();
  const wipe = clamp(local / .34);
  if (wipe > 0) {
    ctx.globalAlpha = .22 * (1 - wipe);
    const r = 160 + wipe * 920;
    const g = ctx.createRadialGradient(540, 930, 0, 540, 930, r);
    g.addColorStop(0, 'rgba(98,232,211,.5)'); g.addColorStop(1, 'rgba(98,232,211,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  drawAmbientRings(ctx, 540, 880, local, { alpha: .55, radius: 330, color: C.aqua });
  drawChronolyteMark(ctx, 540, 390, 42, arrive);
  ctx.save(); ctx.globalAlpha = arrive;
  pill(ctx, 354, 298, 372, 42, 'WEBSITES FOR SERVICE BUSINESSES', 'rgba(13,41,55,.82)', C.aqua, 'rgba(98,232,211,.28)', 14);
  ctx.restore();
  drawKineticLine(ctx, 'NEED A WEBSITE', 540, 600, 78, C.white, (local + .08) / .36, 910);
  drawKineticLine(ctx, 'LIKE THIS?', 540, 716, 112, C.aqua, (local - .38) / .38, 870);
  ctx.save(); ctx.globalAlpha = easeOut(clamp((local - .60) / .25));
  centered(ctx, 'We build websites people remember.', 540, 798, 29, '#c3d5d6', 500, BODY);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = easeOut(clamp((local - .78) / .32));
  drawChronolyteMark(ctx, 335, 930, 28, 1);
  text(ctx, 'CHRONOLYTE AI', 382, 948, 39, C.white, 700, DISPLAY);
  ctx.restore();

  const cardProgress = easeOut(clamp((local - .82) / .40));
  ctx.save(); ctx.globalAlpha = cardProgress;
  const cardX = 140, cardY = 1034, cardW = 800, cardH = 286 + Math.min(1, Math.max(0, local - 1.20)) * 0;
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 18;
  roundedRect(ctx, cardX, cardY + (1 - cardProgress) * 22, cardW, cardH, 32, 'rgba(11,38,51,.89)', 'rgba(98,232,211,.40)', 2);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(169,207,210,.16)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cardX + 34, cardY + 143); ctx.lineTo(cardX + cardW - 34, cardY + 143); ctx.stroke();
  drawContactRow(ctx, cardX + 50, cardY + 76, cardW - 100, 'web', 'www.chronolyteai.site');
  drawContactRow(ctx, cardX + 50, cardY + 214, cardW - 100, 'phone', '+1 (812) 690-6121');
  ctx.restore();
  ctx.save(); ctx.globalAlpha = easeOut(clamp((local - 1.05) / .3)) * .75;
  centered(ctx, 'WEB DESIGN  ·  CREATIVE EXPERIENCES', 540, 1410, 17, '#9ab5ba', 700, DISPLAY);
  ctx.restore();
}

export function drawScene(ctx, t, { W, H, assets, beats }) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ambientParticles(ctx, t, { W, H, alpha: t < 2.4 ? .24 : .19 });
  const hook = beats.find((item) => item.id === 'hook');
  const home = beats.find((item) => item.id === 'home');
  const services = beats.find((item) => item.id === 'services');
  const booking = beats.find((item) => item.id === 'booking');
  const flow = beats.find((item) => item.id === 'flow');
  const cta = beats.find((item) => item.id === 'cta');
  if (t < hook.end) {
    drawHook(ctx, t, W, H);
  } else if (t < home.end) {
    productScene(ctx, t, home, { assets });
  } else if (t < services.end) {
    productScene(ctx, t, services, { assets });
  } else if (t < booking.end) {
    productScene(ctx, t, booking, { assets });
  } else if (t < flow.end) {
    flowScene(ctx, t, flow, { assets });
  } else {
    endCard(ctx, t, cta, W, H);
  }
  // A subtle finishing grain/edge tone is drawn in 2D so the UI remains crisp.
  const v = ctx.createRadialGradient(W * .5, H * .48, H * .16, W * .5, H * .48, H * .75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,4,8,.20)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
