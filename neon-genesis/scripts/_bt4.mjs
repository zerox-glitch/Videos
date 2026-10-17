import { createCanvas } from '@napi-rs/canvas';
const c=createCanvas(100,100); const g=c.getContext('2d');
g.fillStyle='#000'; g.fillRect(0,0,100,100);
g.fillStyle='#f00'; g.fillRect(10,10,40,40);
const rd=()=>{const d=g.getImageData(30,30,1,1).data;return [d[0],d[1],d[2]]};
for (const op of ['lighter','multiply','overlay','screen','source-over']) {
  g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='source-over'; g.globalAlpha=1;
  g.fillStyle='#000'; g.fillRect(0,0,100,100);
  g.fillStyle='#f00'; g.fillRect(10,10,40,40);
  g.globalCompositeOperation=op;
  g.fillStyle='#0f0'; g.fillRect(30,30,40,40);
  console.log(op, rd());
}
