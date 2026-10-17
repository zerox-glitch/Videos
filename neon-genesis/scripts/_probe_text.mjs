import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
const W = 960, H = 540;
const c = createCanvas(W, H);
const ctx = c.getContext('2d');
ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);

// replicate drawTracked with fill '#F2FDFF'
const text='NEON GENESIS', tracking=12;
ctx.font='56px Michroma'; ctx.textBaseline='middle';
const chars=[...text];
const widths=chars.map(ch=>ctx.measureText(ch).width);
const total=widths.reduce((a,b)=>a+b,0)+tracking*(chars.length-1);
let x=W/2-total/2;
for(let i=0;i<chars.length;i++){
  ctx.fillStyle='#F2FDFF'; ctx.globalAlpha=1;
  ctx.save(); ctx.translate(x+widths[i]/2, 200); ctx.scale(1,1);
  ctx.fillText(chars[i], -widths[i]/2, 0); ctx.restore();
  x+=widths[i]+tracking;
}
writeFileSync('/tmp/probe_text.png', c.toBuffer('image/png'));
