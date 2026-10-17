// Validate + render a labelled contact sheet of all 26 sprites → cache/sprites.png
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { SPRITES, PALETTE } from '../src/sprites.js';

let bad = 0;
for (const [name, rows] of Object.entries(SPRITES)) {
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) { console.error(`${name} row ${i}: len ${r.length} != ${w}`); bad++; }
    for (const ch of r) if (!(ch in PALETTE)) { console.error(`${name} row ${i}: unknown '${ch}'`); bad++; }
  });
}
if (Object.keys(SPRITES).length !== 26) { console.error('sprite count', Object.keys(SPRITES).length); bad++; }
if (bad) { console.error(`${bad} problems`); process.exit(1); }

const S = 5;                       // pixel scale on the sheet
const CELL_W = 16 * S, CELL_H = 16 * S + 14;
const cols = 7, rowsN = 4;
const canvas = createCanvas(cols * (CELL_W + 8) + 8, rowsN * (CELL_H + 8) + 8);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#F2EFE6'; ctx.fillRect(0, 0, canvas.width, canvas.height);

const names = Object.entries(SPRITES);
names.forEach(([name, grid], i) => {
  const cx = 8 + (i % cols) * (CELL_W + 8);
  const cy = 8 + Math.floor(i / cols) * (CELL_H + 8);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx - 2, cy - 2, CELL_W + 4, CELL_H + 4);
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = PALETTE[row[x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(cx + x * S, cy + y * S, S, S);
    }
  });
  ctx.fillStyle = '#26243B';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, cx + CELL_W / 2, cy + 16 * S + 11);
});

fs.mkdirSync('cache', { recursive: true });
fs.writeFileSync('cache/sprites.png', canvas.toBuffer('image/png'));
console.log('cache/sprites.png OK —', names.length, 'sprites');
