import { createCanvas } from '@napi-rs/canvas';
import { bloom } from '../src/lib/gfx.js';
const c=createCanvas(960,540); const g=c.getContext('2d');
g.fillStyle='#000'; g.fillRect(0,0,960,540);
g.strokeStyle='#37F2FF'; g.lineWidth=2; g.beginPath(); g.moveTo(400,100); g.lineTo(400,440); g.stroke();
const rd=(x,y)=>{const d=g.getImageData(x,y,1,1).data;return [d[0],d[1],d[2]]};
console.log('line', rd(400,270), 'halo 20px', rd(420,270), 'halo 40px', rd(440,270));
bloom(g,1920,1080,{strength:1,threshold:0.5});
console.log('after line', rd(400,270), 'halo 20', rd(420,270), 'halo 40', rd(440,270), 'far 90', rd(490,270));
