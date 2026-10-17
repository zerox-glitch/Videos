import { createCanvas } from '@napi-rs/canvas';
const c=createCanvas(960,540); const g=c.getContext('2d');
g.fillStyle='#000'; g.fillRect(0,0,960,540);
g.fillStyle='#2FF'; g.fillRect(400,100,2,340);
for (const [w,h] of [[480,270],[240,135],[120,68],[60,34],[30,17]]) {
  const d=createCanvas(w,h); const dc=d.getContext('2d');
  dc.drawImage(c,0,0,w,h);
  const im=dc.getImageData(0,0,w,h).data;
  let mx=0, cnt=0;
  for(let i=0;i<im.length;i+=4){ if(im[i]>mx) mx=im[i]; if(im[i]>2) cnt++; }
  console.log(w, 'maxR', mx, 'lit px', cnt);
}
