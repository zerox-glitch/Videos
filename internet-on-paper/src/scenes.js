// scenes.js — THE INTERNET ON PAPER: eight paper-cyberpunk scenes.
// Each: (ctx, section, absolute T). Deterministic; local s = T - section.t0.
import * as I from './lib/ink.js';
import { beats, ev, prog, has, sectionAt } from './beats.js';

const { clamp01, lerp, ease, easeOut, easeBack, hash01, rng } = I;
const F = I.FAM, P = I.P;
const W = 1920, H = 1080;

// scene corner tag: "01 // PACKETS"
function sceneTag(ctx, T, num, label, color) {
  I.chip(ctx, 40, 34, `${num} // ${label}`, color, T, { size: 20, seed: 31 });
  if (T - beats.sections[sectionAt(T).id === 'threat' ? 6 : 0] >= 0) { /* noop keep */ }
}
// typed-string helper: chars revealed over dur from t0 (absolute)
function typed(ctx, str, x, y, t, t0, dur) {
  const u = clamp01((t - t0) / dur);
  if (u <= 0) return 0;
  const n = Math.floor(u * str.length);
  ctx.fillText(str.slice(0, n), x, y);
  if (u < 1) return ctx.measureText(str.slice(0, n)).width;
  return -1;
}

// ════════════════════════════════════════════════ INTRO (0–8)
export function scene_intro(ctx, sc, T) {
  I.paper(ctx, { base: '#0B0E14', gridColor: '#16283A', seed: 11 });

  // corner circuits draw-on
  const paths = [
    [[-40, 130], [260, 130], [330, 200], [570, 200]],
    [[1960, 110], [1690, 110], [1620, 180], [1470, 180]],
    [[-40, 975], [270, 975], [350, 895], [560, 895]],
    [[1960, 990], [1650, 990], [1580, 925], [1450, 925]],
  ];
  paths.forEach((p, i) => {
    const pu = ease(clamp01((T - 0.2 - i * 0.14) / 0.9));
    const pp = I.partial(p, pu);
    if (pp.length > 1) I.neon(ctx, pp, 3, P.cyan, T, 20 + i);
    if (pu > 0.95) I.led(ctx, p[p.length - 1][0], p[p.length - 1][1], 6, i % 2 ? P.magenta : P.cyan, true, T);
  });
  I.hudFrame(ctx, 26, 26, W - 52, H - 52, P.cyan, T, 3, 56);

  // boot terminal (pop-open at 0.6)
  if (T > 0.55) {
    const u = easeBack(clamp01((T - 0.55) / 0.45));
    ctx.save();
    ctx.translate(580, 790);
    ctx.scale(0.7 + 0.3 * u, 0.7 + 0.3 * u);
    ctx.globalAlpha = clamp01(u * 1.6);
    I.windowFrame(ctx, -390, -150, 780, 300, 'paper-core // boot', P.green, T, { seed: 5 });
    ctx.font = `26px ${F.mono}`;
    ctx.textAlign = 'left';
    const lines = [
      'BOOT:// PAPER-CORE v2.6',
      'mounting grid ........ OK',
      'ink: neon x3 ......... OK',
      'link: 104 BPM A MINOR  OK',
    ];
    const t0 = [1.0, 1.85, 2.6, 3.35];
    lines.forEach((ln, i) => {
      const pr = clamp01((T - t0[i]) / 0.55);
      if (pr <= 0) return;
      const n = Math.floor(pr * ln.length);
      ctx.fillStyle = pr < 1 ? P.cyan : (i === 3 ? P.amber : P.green);
      const shown = ln.slice(0, n);
      ctx.fillText(shown, -360, -76 + i * 44);
      if (pr < 1 && Math.floor(T * 5) % 2 === 0) {
        ctx.fillRect(-356 + ctx.measureText(shown).width, -100 + i * 44, 12, 28);
      }
    });
    ctx.restore();
  }

  // HUD chips
  if (T > 0.8) {
    I.chip(ctx, 1618, 40, 'SYS // 128.00 s', P.cyan, T, { size: 19, seed: 40 });
    I.chip(ctx, 1590, 88, '1920×1080 · 30 FPS', P.magenta, T, { size: 19, seed: 41 });
    I.chip(ctx, 40, H - 92, '00 // BOOT', P.amber, T, { size: 20, seed: 42 });
  }

  // TITLE: garbage → scramble-resolve → stamp
  if (T > 3.5) {
    ctx.save();
    ctx.translate(960, 330);
    const stampU = clamp01((T - 5.4) / 0.3);
    const sc = T >= 5.4 ? lerp(1.17, 1, easeOut(stampU)) : 1;
    ctx.scale(sc, sc);
    const rp = clamp01((T - 3.9) / 0.8);
    if (rp < 1) {
      ctx.globalAlpha = T < 3.9 ? 0.55 : 1;
      I.chromaText(ctx, I.scrambleStr('THE INTERNET', rp, 3, T), 0, 0,
        { size: 108, fam: F.display, align: 'center', off: 7 });
      I.chromaText(ctx, I.scrambleStr('ON PAPER', rp, 9, T), 0, 128,
        { size: 108, fam: F.display, align: 'center', off: 7 });
      ctx.globalAlpha = 1;
    } else {
      I.tracked(ctx, 'THE INTERNET', 0, 0, 108, P.ink, 10, F.display, 'center');
      I.tracked(ctx, 'ON PAPER', 0, 128, 108, P.cyan, 14, F.display, 'center');
    }
    ctx.restore();
    // neon underline sweep 4.8→5.4
    const ul = ease(clamp01((T - 4.8) / 0.6));
    if (ul > 0) {
      const x2 = lerp(480, 1440, ul);
      I.neon(ctx, [[480, 500], [x2, 500]], 5, P.magenta, T, 71);
    }
  }

  // subtitle strip 5.85
  if (T > 5.85) {
    const u = ease(prog(T, 'subtitle', 0.5));
    const x = 560, y = 560, w = 800;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 30, y - 20, (w + 60) * u, 110); ctx.clip();
    I.card(ctx, x, y, w, 66, { fill: P.cardHi, edge: P.magenta, bw: 2 });
    I.text(ctx, 'a neon field guide to where your data goes', x + 34, y + 45,
      { fam: F.body, size: 33, color: P.ink });
    ctx.restore();
  }
  if (T > 6.4) {
    I.text(ctx, 'v1.0 // HAND-INKED // NO CLOUD WAS HARMED', 960, H - 44,
      { fam: F.mono, size: 22, color: P.inkDim, align: 'center' });
  }
}

// ════════════════════════════════════════════════ PACKETS (8–26)
const LANES = [
  { y: 240, curve: 44 }, { y: 388, curve: -52 }, { y: 536, curve: 62 },
  { y: 684, curve: -44 }, { y: 832, curve: 34 },
];
const laneY = (i, x) => {
  const L = LANES[i], u = clamp01((x - 640) / 940);
  return L.y + Math.sin(u * Math.PI) * L.curve;
};
function strip(ctx, x, y, seq, T, o = {}) {
  const w = 320, h = 78;
  ctx.save();
  ctx.translate(x, y);
  I.card(ctx, -w / 2, -h / 2, w, h, {
    fill: o.drop ? 'rgba(40,8,20,0.9)' : P.card,
    edge: o.drop ? P.crimson : (o.retry ? P.magenta : P.cyan),
    bw: 2.5, rot: o.rot || 0,
  });
  // header block after header_stamp
  const hs = ease(clamp01((T - ev('header_stamp') - (o.i || 0) * 0.06) / 0.3));
  if (hs <= 0 && !o.drop) {
    // payload squiggle (pre-header state)
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k < 9; k++) {
      const px = -w / 2 + 16 + k * 15;
      ctx.moveTo(px, 18); ctx.lineTo(px, 30 - (k % 3) * 4);
    }
    ctx.stroke();
  }
  if (hs > 0 && !o.drop) {
    ctx.globalAlpha = hs;
    const s = lerp(1.25, 1, easeOut(hs));
    ctx.save();
    ctx.translate(-w / 2 + 12, -h / 2 + 8);
    ctx.scale(s, s);
    ctx.fillStyle = o.retry ? P.magenta : '#0E2430';
    ctx.fillRect(0, 0, 96, 26);
    ctx.font = `19px ${F.mono}`;
    ctx.fillStyle = o.retry ? '#0B0E14' : P.cyan;
    ctx.fillText(`SEQ ${seq}`, 8, 19);
    ctx.restore();
    ctx.font = `17px ${F.mono}`;
    ctx.fillStyle = P.ink;
    ctx.globalAlpha = hs * 0.95;
    ctx.fillText('10.0.0.4:52311', -w / 2 + 122, -h / 2 + 26);
    ctx.fillStyle = P.amber;
    ctx.fillText(`-> :443  ttl 64`, -w / 2 + 122, -h / 2 + 58);
    ctx.globalAlpha = 1;
  } else if (!o.drop) {
    ctx.font = `18px ${F.mono}`;
    ctx.fillStyle = P.inkDim;
    ctx.fillText(o.payload || 'payload...', -w / 2 + 16, h / 2 - 14);
  }
  if (o.retry) {
    ctx.font = `17px ${F.mono}`;
    ctx.fillStyle = P.magenta;
    ctx.fillText('RETRY', w / 2 - 64, -h / 2 + 20);
  }
  ctx.restore();
}

export function scene_packets(ctx, sc, T) {
  I.paper(ctx, { base: '#0C1220', gridColor: '#1B2A44', seed: 21 });
  I.chip(ctx, 40, 34, '01 // PACKETS', P.cyan, T, { size: 20, seed: 31 });

  // phone card
  const phU = ease(prog(T, 'msg_card', 0.55));
  if (phU > 0) {
    const x = lerp(-470, 120, phU), y = 210, w = 400, h = 660;
    I.card(ctx, x, y, w, h, { fill: '#0E1424', edge: P.cyan, bw: 3 });
    I.text(ctx, 'PAPERPHONE // 8:47 PM', x + 24, y + 44, { fam: F.semi, size: 22, color: P.cyan });
    I.sline(ctx, x + 20, y + 60, x + w - 20, y + 60, 2, 'rgba(43,232,232,0.4)', T, 5);
    // bubble
    I.card(ctx, x + 30, y + 100, 340, 130, { fill: P.cardHi, edge: 'rgba(255,255,255,0.25)', bw: 2 });
    I.text(ctx, 'me -> sam', x + 50, y + 145, { fam: F.mono, size: 20, color: P.inkDim });
    I.text(ctx, "'meet me at 8?'", x + 50, y + 195, { fam: F.body, size: 34, color: P.ink });
    // file row (rips at 11.0)
    if (T < 11.05) {
      const rip = clamp01((T - 11.0) / 0.05);
      ctx.save();
      ctx.globalAlpha = 1 - rip;
      I.card(ctx, x + 30, y + 430, 340, 110, { fill: '#101C30', edge: P.amber, bw: 2.5 });
      I.text(ctx, 'IMG_4471.png', x + 52, y + 478, { fam: F.mono, size: 26, color: P.ink });
      I.text(ctx, '10 MB · outbound', x + 52, y + 516, { fam: F.mono, size: 21, color: P.amber });
      ctx.restore();
    }
    // send arrow
    const sa = 1 + Math.sin(T * 3) * 0.05;
    ctx.save();
    ctx.translate(x + w - 56, y + h - 60);
    ctx.scale(sa, sa);
    I.neon(ctx, [[-18, 0], [14, 0]], 5, P.magenta, T, 9);
    I.neon(ctx, [[4, -12], [16, 0], [4, 12]], 5, P.magenta, T, 10);
    ctx.restore();
  }

  // route lanes draw-on 15.4
  const LU = ease(prog(T, 'route_draw', 1.1));
  if (LU > 0) {
    for (let i = 0; i < 5; i++) {
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const x = lerp(640, 1580, k / 24);
        pts.push([x, laneY(i, x)]);
      }
      const pp = I.partial(pts, clamp01(LU * 1.15 - i * 0.05));
      if (pp.length > 1) I.neon(ctx, pp, 2.5, 'rgba(43,232,232,0.55)', T, 60 + i, 1.1);
      // waypoint diamonds
      if (LU > 0.8) {
        for (const wx of [920, 1300]) {
          const wy = laneY(i, wx);
          ctx.save();
          ctx.translate(wx, wy); ctx.rotate(Math.PI / 4);
          ctx.strokeStyle = 'rgba(43,232,232,0.6)';
          ctx.lineWidth = 2;
          ctx.strokeRect(-7, -7, 14, 14);
          ctx.restore();
        }
      }
    }
  }

  // sticky fact (from header_stamp)
  if (T > 13.2) {
    const u = easeBack(clamp01((T - 13.2) / 0.4));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.4);
    ctx.translate(1565, 175);
    ctx.scale(0.5 + 0.5 * u, 0.5 + 0.5 * u);
    I.card(ctx, -165, -110, 330, 220, { fill: '#F2C14E', border: false, rot: 0.05 });
    I.text(ctx, '10 MB ≈', -130, -40, { fam: F.head, size: 44, color: '#141414' });
    I.text(ctx, '7,000 PACKETS', -130, 20, { fam: F.head, size: 40, color: '#141414' });
    I.text(ctx, 'every chunk routed', -130, 72, { fam: F.mono, size: 21, color: '#3A3A2A' });
    I.text(ctx, 'on its own path', -130, 100, { fam: F.mono, size: 21, color: '#3A3A2A' });
    ctx.restore();
  }

  // moving strips
  const MOVE0 = 16.6;
  if (T > 11.0) {
    for (let i = 0; i < 5; i++) {
      const t0 = 11.0 + i * 0.1;
      const born = easeBack(clamp01((T - t0) / 0.35));
      if (born <= 0) continue;
      const isDrop = i === 2;
      // phase 1: docked fan-out until MOVE0
      let x = 700 + i * 190, y = laneY(i, 700 + i * 190);
      let alpha = 1, rot = (i - 2) * 0.03, dropNow = false, retry = false, seq = i + 1;
      if (T >= MOVE0) {
        const dur = isDrop ? 4.3 : 6.0 + i * 0.3;
        let u = clamp01((T - MOVE0) / dur);
        if (isDrop && T >= 20.9) u = clamp01((20.9 - MOVE0) / dur); // freeze at drop
        x = lerp(700, 1560, u);
        y = laneY(i, x);
        if (isDrop && T >= 20.9) {
          const gone = clamp01((T - 20.9) / 0.25);
          if (gone < 1) { dropNow = true; alpha = 1 - gone; }
        }
        // reassembly 23.6
        const ru = ease(clamp01((T - ev('assemble') - i * 0.09) / 0.55));
        if (ru > 0 && !(isDrop && T < 21.6)) {
          x = lerp(x, 1290, ru); y = lerp(y, 470, ru);
          if (ru > 0.98 && !(isDrop && T < 21.6)) alpha *= 1 - clamp01((ru - 0.98) * 40);
        }
      }
      // drop marker
      if (isDrop && T >= 20.9 && T < 21.6) {
        ctx.save();
        ctx.globalAlpha = 1;
        I.noiseBars(ctx, x - 170, y - 50, 340, 100, 7, 40, T);
        ctx.font = `44px ${F.head}`;
        ctx.fillStyle = P.crimson;
        ctx.fillText('?', x + 90, y + 14);
        I.text(ctx, 'LOST — TCP will ask again', x - 160, y + 74,
          { fam: F.mono, size: 21, color: P.crimson });
        ctx.restore();
      }
      // retry strip
      if (isDrop && T >= 21.6 && T < ev('assemble')) {
        const ru2 = ease(clamp01((T - 21.6) / 1.6));
        const rx = lerp(700, 1560, ru2), ry = laneY(2, rx);
        const ru3 = ease(clamp01((T - ev('assemble') - 0.1) / 0.55));
        const fx2 = lerp(rx, 1290, ru3), fy2 = lerp(ry, 470, ru3);
        strip(ctx, fx2, fy2, '3·R', T, { retry: true, i: 0, rot: 0.02 });
        if (ru3 > 0.98) { /* absorbed */ }
        continue;
      }
      if (alpha > 0 && born > 0) {
        ctx.save();
        ctx.globalAlpha = alpha * clamp01(born * 1.5);
        const s = lerp(0.5, 1, easeBack(born));
        ctx.translate(x, y);
        ctx.scale(s, s);
        ctx.translate(-x, -y);
        strip(ctx, x, y, seq, T, { drop: dropNow, rot, i });
        ctx.restore();
      }
    }
  }

  // reassembled photo card + ACK
  const AU = easeBack(clamp01((T - ev('assemble') - 0.62) / 0.5));
  if (AU > 0) {
    ctx.save();
    ctx.globalAlpha = clamp01(AU * 1.5);
    const s = lerp(0.55, 1, AU);
    ctx.translate(1290, 470); ctx.scale(s, s); ctx.translate(-1290, -470);
    I.card(ctx, 1105, 330, 370, 280, { fill: '#101C30', edge: P.green, bw: 3, tape: 'l' });
    ctx.fillStyle = 'rgba(43,232,232,0.12)';
    ctx.fillRect(1135, 365, 310, 150);
    // little photo glyph
    ctx.strokeStyle = P.cyan; ctx.lineWidth = 4;
    ctx.strokeRect(1235, 405, 110, 80);
    ctx.beginPath(); ctx.arc(1270, 435, 12, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1245, 475); ctx.lineTo(1275, 448); ctx.lineTo(1305, 475); ctx.stroke();
    I.text(ctx, 'IMG_4471.png', 1135, 552, { fam: F.mono, size: 25, color: P.ink });
    I.text(ctx, '5 packets · reassembled', 1135, 586, { fam: F.mono, size: 21, color: P.green });
    ctx.restore();
  }
  if (T > ev('ack')) {
    const u = easeBack(clamp01((T - ev('ack')) / 0.35));
    ctx.save();
    ctx.translate(1330, 648);
    ctx.scale(u, u);
    ctx.globalAlpha = clamp01(u * 1.5);
    I.card(ctx, -170, -34, 340, 68, { fill: 'rgba(6,26,18,0.92)', edge: P.green, bw: 2.5 });
    I.text(ctx, 'ACK RECEIVED', -140, 14, { fam: F.head, size: 34, color: P.green });
    // drawn check (font lacks U+2713)
    I.sline(ctx, 118, -8, 132, 6, 5, P.green, T, 240);
    I.sline(ctx, 132, 6, 156, -18, 5, P.green, T, 241);
    ctx.restore();
  }
}

// ════════════════════════════════════════════════ DNS (26–44)
export function scene_dns(ctx, sc, T) {
  I.paper(ctx, { base: '#0E141C', gridColor: '#16302A', seed: 31 });
  I.chip(ctx, 40, 34, '02 // DNS', P.green, T, { size: 20, seed: 32 });

  // window opens with scan reveal 26.6
  const OU = ease(prog(T, 'dns_prompt', 0.4));
  if (OU > 0) {
    const x = 430, y = 150, w = 1060, h = 720;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 40, y - 40, w + 80, (h + 80) * OU); ctx.clip();
    I.windowFrame(ctx, x, y, w, h, 'resolvectl — paper dns', P.green, T, { seed: 8 });
    // scan edge
    if (OU < 1) {
      ctx.fillStyle = 'rgba(69,255,161,0.5)';
      ctx.fillRect(x - 40, y - 40 + (h + 80) * OU, w + 80, 5);
    }
    // prompt line
    ctx.font = `30px ${F.mono}`;
    ctx.fillStyle = P.green;
    const w1 = typed(ctx, '$ you typed: ', x + 40, y + 100, T, 27.3, 0.55);
    if (w1 > 0) {
      ctx.fillStyle = P.ink;
      ctx.fillText('youtube.com', x + 40 + w1, y + 100);
    } else if (T > 27.85) {
      ctx.fillStyle = P.green; ctx.fillText('$ you typed: ', x + 40, y + 100);
      ctx.fillStyle = P.ink; ctx.fillText('youtube.com', x + 40 + ctx.measureText('$ you typed: ').width, y + 100);
    }
    // dig query (scramble-resolve at 29.4)
    if (T > 29.35) {
      const rp = clamp01((T - 29.4) / 0.5);
      ctx.fillStyle = P.cyan;
      ctx.fillText(I.scrambleStr('> dig youtube.com A +short', rp, 12, T), x + 40, y + 156);
    }
    // big answer
    if (T > ev('dns_answer') - 0.05) {
      const u = easeBack(clamp01((T - ev('dns_answer')) / 0.35));
      ctx.save();
      ctx.translate(x + 40, y + 300);
      ctx.scale(lerp(1.35, 1, easeOut(clamp01((T - ev('dns_answer')) / 0.3))), 1);
      ctx.globalAlpha = clamp01(u * 1.6);
      ctx.font = `26px ${F.semi}`;
      ctx.fillStyle = P.inkDim;
      ctx.fillText('ANSWER · A RECORD', 0, -108);
      ctx.restore();
      I.chromaText(ctx, '142.250.65.78', x + 40, y + 300,
        { size: 86, fam: F.mono, color: P.cyan, off: 5 * (1 - clamp01((T - ev('dns_answer')) / 0.5)) + 2 });
      I.text(ctx, 'your machine now knows where to knock.', x + 44, y + 350,
        { fam: F.body, size: 27, color: P.inkDim });
    }
    // resolver hop chips (31.2)
    if (T > 31.2) {
      const hops = ['DEVICE', 'ROUTER', 'RESOLVER'];
      const hx = [x + 60, x + 420, x + 780];
      const hy = y + 560;
      hops.forEach((hName, i) => {
        const hu = easeBack(clamp01((T - 31.2 - i * 0.16) / 0.35));
        if (hu <= 0) return;
        ctx.save();
        ctx.globalAlpha = clamp01(hu * 1.5);
        ctx.translate(hx[i], hy); ctx.scale(hu, hu);
        I.card(ctx, -90, -32, 180, 64, { fill: '#0C1612', edge: i === 2 ? P.green : P.cyan, bw: 2.5 });
        I.text(ctx, hName, -74, 12, { fam: F.semi, size: 27, color: i === 2 ? P.green : P.cyan });
        ctx.restore();
        if (i < 2) {
          const au = ease(clamp01((T - 31.6 - i * 0.3) / 0.35));
          if (au > 0) I.arrow(ctx, hx[i] + 96, hy, hx[i] + 96 + 160 * au, hy, 3.5, P.inkDim, T, 80 + i);
        }
      });
      // pulse dot traverses
      const pu = clamp01((T - 31.9) / 1.4);
      if (pu > 0 && pu < 1) {
        const px = lerp(hx[0], hx[2] + 60, pu);
        I.led(ctx, px, hy, 8, P.green, true, T);
      }
    }
    // cache row (36.8)
    if (T > 36.8) {
      I.chip(ctx, x + 40, y + 440, 'TTL 300 s', P.amber, T, { size: 21, seed: 33 });
      const cu = easeBack(clamp01((T - 37.05) / 0.35));
      if (cu > 0) {
        ctx.save();
        ctx.globalAlpha = clamp01(cu * 1.5);
        ctx.translate(x + 300, y + 440);
        ctx.scale(cu, cu);
        I.card(ctx, 0, 0, 300, 54, { fill: 'rgba(6,26,18,0.92)', edge: P.green, bw: 2.5 });
        I.text(ctx, 'CACHED · next: instant', 16, 38, { fam: F.mono, size: 23, color: P.green });
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // lookup stopwatch prop (39.5)
  if (T > 39.5) {
    const u = ease(prog(T, 'dns_ms', 0.4));
    const x = 90, y = 380, w = 300, h = 300;
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.6);
    I.card(ctx, x, y, w, h, { fill: P.card, edge: P.amber, bw: 3, tape: 'r' });
    I.text(ctx, 'LOOKUP', x + 26, y + 46, { fam: F.semi, size: 26, color: P.amber });
    // needle
    const na = lerp(-2.1, 0.5, ease(clamp01((T - 39.5) / 0.8)));
    ctx.save();
    ctx.translate(x + w / 2, y + 150);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 74, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
    I.sline(ctx, 0, 0, Math.cos(na) * 62, Math.sin(na) * 62, 5, P.magenta, T, 90);
    ctx.fillStyle = P.magenta;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
    ctx.restore();
    I.text(ctx, '≈ 40 ms', x + 26, y + 262, { fam: F.head, size: 46, color: P.ink });
    ctx.restore();
  }
}

// ════════════════════════════════════════════════ SPEED / FIBER (44–62)
const LANDS = [
  { n: 'NA', poly: [[240, 300], [430, 255], [530, 345], [470, 480], [350, 530], [255, 440]] },
  { n: 'SA', poly: [[470, 570], [545, 630], [520, 775], [445, 700]] },
  { n: 'EU', poly: [[860, 265], [985, 245], [1005, 330], [910, 365]] },
  { n: 'AF', poly: [[880, 400], [995, 425], [960, 610], [870, 560]] },
  { n: 'AS', poly: [[1035, 235], [1405, 215], [1530, 335], [1400, 425], [1155, 405], [1050, 330]] },
  { n: 'AU', poly: [[1420, 645], [1545, 655], [1520, 740], [1420, 725]] },
];
const CITIES = [
  { n: 'NYC', x: 430, y: 360 }, { n: 'LON', x: 940, y: 300 },
  { n: 'TOK', x: 1500, y: 360 }, { n: 'SIN', x: 1360, y: 560 },
];
const CABLES = [
  [[430, 360], [685, 235], [940, 300]],
  [[940, 300], [1230, 165], [1500, 360]],
  [[1500, 360], [1470, 470], [1360, 560]],
];
function quadPts(p0, c, p1, n = 36) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, iu = 1 - u;
    pts.push([
      iu * iu * p0[0] + 2 * iu * u * c[0] + u * u * p1[0],
      iu * iu * p0[1] + 2 * iu * u * c[1] + u * u * p1[1],
    ]);
  }
  return pts;
}
export function scene_speed(ctx, sc, T) {
  I.paper(ctx, { base: '#0A1020', gridColor: '#14263F', seed: 41 });
  I.chip(ctx, 40, 34, '03 // FIBER', P.amber, T, { size: 20, seed: 34 });

  const dim = T > ev('cable_stat') + 0.4 ? 0.55 : 1;
  ctx.save();
  ctx.globalAlpha = dim;

  // lands draw-on (44.6, stagger)
  LANDS.forEach((L, i) => {
    const u = ease(clamp01((T - ev('map_draw') - i * 0.13) / 0.55));
    if (u <= 0) return;
    ctx.save();
    ctx.beginPath();
    L.poly.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.globalAlpha = u;
    ctx.fill();
    ctx.clip();
    I.halftone(ctx, 180, 180, 1440, 640, 11, 2.6, 'rgba(43,232,232,0.5)', 0.65 * u);
    ctx.restore();
    // outline partial
    const ring = [...L.poly, L.poly[0]];
    const pp = I.partial(ring, u);
    if (pp.length > 1) I.inkLine(ctx, pp, 6, P.ink, T, 100 + i);
    // continent micro-label
    if (u > 0.9) {
      let cx0 = 0, cy0 = 0;
      L.poly.forEach(([px, py]) => { cx0 += px; cy0 += py; });
      cx0 /= L.poly.length; cy0 /= L.poly.length;
      const names = { NA: 'N. AMERICA', SA: 'S. AMERICA', EU: 'EUROPE', AF: 'AFRICA', AS: 'ASIA', AU: 'OCEANIA' };
      I.text(ctx, names[L.n] || L.n, cx0, cy0, {
        fam: F.mono, size: 19, color: 'rgba(233,237,246,0.55)', align: 'center',
      });
    }
  });

  // city dots
  CITIES.forEach((c, i) => {
    if (T < ev('map_draw') + 0.3) return;
    I.led(ctx, c.x, c.y, 7, P.amber, true, T, i);
    I.text(ctx, c.n, c.x + 14, c.y - 12, { fam: F.mono, size: 24, color: P.amber });
  });

  // cables draw-on (46.2)
  CABLES.forEach((cb, i) => {
    const u = ease(clamp01((T - ev('cable_draw') - i * 0.22) / 0.7));
    if (u <= 0) return;
    const pts = quadPts(cb[0], cb[1], cb[2]);
    const pp = I.partial(pts, u);
    if (pp.length > 1) I.neon(ctx, pp, 4, P.amber, T, 120 + i, 2);
    if (u > 0.6) {
      const mp = quadPts(cb[0], cb[1], cb[2])[18];
      I.text(ctx, 'SUBSEA FIBER', mp[0] - 78, mp[1] - 14, { fam: F.mono, size: 20, color: P.amber, alpha: (u - 0.6) / 0.4 });
    }
  });

  // light pulse run (49.0) — main pulse + echoes
  const runs = [[0, 0], [0.5, 1], [1.0, 2]];
  runs.forEach(([delay, k]) => {
    const u = clamp01((T - ev('light_run') - delay) / 1.4);
    if (u <= 0 || u >= 1) return;
    const pts = quadPts(CABLES[0][0], CABLES[0][1], CABLES[0][2]);
    const pp = I.partial(pts, u);
    if (pp.length > 1) {
      const trail = I.partial(pts, Math.max(0, u - 0.22));
      if (trail.length > 1) I.neon(ctx, trail, 6, '#FFFFFF', T, 130 + k, 0.6);
      const head = pp[pp.length - 1];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = P.cyan;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(head[0], head[1], 11, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(head[0], head[1], 24, 0, 7); ctx.fill();
      ctx.restore();
    }
  });

  // ping rings at LON/NYC (57.4, one sweep each)
  if (T > 57.4 && T < 58.4) {
    const u = (T - 57.4) / 1.0;
    for (const c of [CITIES[0], CITIES[1]]) {
      ctx.save();
      ctx.globalAlpha = (1 - u) * 0.8;
      ctx.strokeStyle = P.cyan;
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, 14 + u * 110, 0, 7); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore(); // un-dim

  // RTT chip
  if (T > 57.4) {
    I.chip(ctx, 560, 430, 'LON / NYC · RTT ≈ 74 ms', P.cyan, T, { size: 23, seed: 35 });
  }

  // legend chip (from map open) — density for the lower band
  if (T > 44.9) {
    I.chip(ctx, 40, 996, 'LAND = PAPER GRID · LINE = FIBER · DOT = LANDING',
      P.inkDim, T, { size: 19, seed: 46, fill: 'rgba(0,0,0,0.55)' });
  }

  // deep_ping sweep (59.8): restrike cables + shimmer band
  if (T > 59.8 && T < 61.0) {
    const u = clamp01((T - 59.8) / 1.2);
    const a = Math.sin(u * Math.PI);
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    CABLES.forEach((cb, i) => I.neon(ctx, quadPts(cb[0], cb[1], cb[2]), 6, '#FFFFFF', T, 140 + i, 0.8));
    ctx.globalAlpha = a * 0.4;
    const sx = lerp(100, 1820, u);
    I.halftone(ctx, sx, 180, 220, 660, 10, 3.2, P.cyan, 0.7);
    ctx.restore();
  }

  // fact card: 200,000 km/s (52.0)
  if (T > 52.0) {
    const u = easeBack(clamp01((T - 52.0) / 0.45));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5);
    ctx.translate(1520, 810); ctx.scale(0.7 + 0.3 * u, 0.7 + 0.3 * u); ctx.translate(-1520, -810);
    I.card(ctx, 1240, 685, 560, 250, { fill: P.card, edge: P.cyan, bw: 3, tape: 'l' });
    I.text(ctx, 'LIGHT IN FIBER', 1272, 735, { fam: F.semi, size: 27, color: P.cyan });
    I.text(ctx, '≈200,000', 1272, 815, { fam: F.head, size: 74, color: P.ink });
    I.text(ctx, 'km/s — about 2/3 the speed of light', 1272, 862, { fam: F.mono, size: 24, color: P.amber });
    I.text(ctx, 'glass slows photons; nobody tells them', 1272, 906, { fam: F.body, size: 23, color: P.inkDim });
    ctx.restore();
  }

  // stat card: 95%+ (54.6)
  if (T > 54.6) {
    const u = easeBack(clamp01((T - 54.6) / 0.45));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5);
    ctx.translate(410, 875); ctx.scale(0.7 + 0.3 * u, 0.7 + 0.3 * u); ctx.translate(-410, -875);
    I.card(ctx, 140, 745, 540, 265, { fill: '#1A1408', edge: P.amber, bw: 3 });
    I.text(ctx, '95%+', 172, 862, { fam: F.head, size: 96, color: P.amber });
    I.text(ctx, 'of intercontinental data rides', 172, 912, { fam: F.body, size: 27, color: P.ink });
    I.text(ctx, 'undersea cables — not satellites.', 172, 950, { fam: F.body, size: 27, color: P.ink });
    ctx.restore();
  }
}

// ════════════════════════════════════════════════ DATACENTER (62–80)
const ROWS = [
  { y: 880, s: 1.0, x0: 60, n: 13, gap: 18 },
  { y: 665, s: 0.78, x0: 130, n: 16, gap: 16 },
  { y: 515, s: 0.6, x0: 215, n: 19, gap: 14 },
];
export function scene_datacenter(ctx, sc, T) {
  I.paper(ctx, { base: '#0D1014', gridColor: '#1E2430', gridStep: 48, seed: 51 });
  I.chip(ctx, 40, 34, '04 // CLOUD', P.cyan, T, { size: 20, seed: 36 });

  let globalA = 1;
  ROWS.forEach((row, ri) => {
    const u = easeBack(clamp01((T - ev('racks_in') - ri * 0.16) / 0.6));
    if (u <= 0) return;
    const dy = lerp(150, 0, u);
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.4) * (ri === 0 ? 1 : ri === 1 ? 0.97 : 0.9);
    ctx.translate(0, dy);
    for (let i = 0; i < row.n; i++) {
      const w = 108 * row.s, h = 220 * row.s;
      const x = row.x0 + i * (w + row.gap);
      const yB = row.y;
      const idx = ri * 100 + i;
      I.card(ctx, x, yB - h, w, h, {
        fill: ri === 0 ? '#12161F' : '#10131B', edge: '#252C3A', bw: 2, shadow: ri === 0,
      });
      // LED grid
      for (let cL = 0; cL < 3; cL++) {
        for (let rL = 0; rL < 7; rL++) {
          const on = hash01(idx * 13.7 + rL * 3.1 + cL + Math.floor(T * 3) * 0.37) > 0.46;
          const col = (idx + rL) % 3 === 0 ? P.amber : P.cyan;
          I.led(ctx, x + w * 0.25 + cL * w * 0.25, yB - h + h * 0.14 + rL * h * 0.1,
            Math.max(2, 3.4 * row.s), col, on, T, idx);
        }
      }
      // brand stripe
      ctx.fillStyle = ri === 0 ? 'rgba(255,194,74,0.7)' : 'rgba(255,194,74,0.4)';
      ctx.fillRect(x + 6, yB - h + h * 0.8, w - 12, Math.max(3, 6 * row.s));
      if (ri === 0) {
        ctx.font = `${Math.round(13 * row.s)}px ${F.mono}`;
        ctx.fillStyle = P.inkDim;
        ctx.fillText(`R-${10 + i}`, x + 8, yB - 8);
      }
    }
    ctx.restore();
    // fans on front row rack #0 (64.4)
    if (ri === 0 && T > ev('fan_spin')) {
      const spin = T > 64.4 ? (T - 64.4) * 10 : 0;
      const x = row.x0 + row.n * (108 + row.gap) + 40, yB = row.y - 110;
      for (let k = 0; k < 3; k++) {
        const fx = x + k * 54, fy = yB;
        ctx.save();
        ctx.strokeStyle = 'rgba(43,232,232,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx, fy, 22, 0, 7); ctx.stroke();
        ctx.translate(fx, fy);
        ctx.rotate(spin + k);
        for (let b = 0; b < 3; b++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 0); ctx.stroke();
        }
        ctx.restore();
      }
      I.text(ctx, 'COOLING', x - 4, yB + 52, { fam: F.mono, size: 17, color: P.cyan });
    }
  });

  // query card + fan-out (67.0)
  if (T > 67.0) {
    const u = easeBack(clamp01((T - 67.0) / 0.4));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5);
    const x = 130, y = 150;
    I.card(ctx, x, y, 400, 160, { fill: P.card, edge: P.cyan, bw: 3, tape: 'l' });
    I.text(ctx, 'GET /cat-pics.jpg', x + 24, y + 56, { fam: F.mono, size: 30, color: P.cyan });
    I.text(ctx, 'host: paper.net', x + 24, y + 100, { fam: F.mono, size: 24, color: P.inkDim });
    I.text(ctx, '1 request → 12 machines', x + 24, y + 140, { fam: F.body, size: 23, color: P.amber });
    ctx.restore();
    // hairlines to mid-row racks
    const row = ROWS[1];
    for (let k = 0; k < 12; k++) {
      const i = k * 1 + 2;
      const w = 108 * row.s;
      const tx = row.x0 + i * (w + row.gap) + w / 2;
      const ty = row.y - 110 * row.s;
      const lu = ease(clamp01((T - 67.1 - k * 0.04) / 0.45));
      if (lu <= 0) continue;
      I.neon(ctx, I.partial([[530, 235], [760, 300 + k * 8], [tx, ty]], lu),
        2, 'rgba(43,232,232,0.75)', T, 150 + k, 1);
      if (lu >= 1 && T < 70.6) {
        const dpu = clamp01((T - 67.7 - k * 0.08) / 0.8);
        if (dpu > 0 && dpu < 1) {
          const pp = I.partial([[530, 235], [760, 300 + k * 8], [tx, ty]], dpu);
          const pt = pp[pp.length - 1];
          I.led(ctx, pt[0], pt[1], 5, P.green, true, T, k);
        }
      }
    }
  }

  // stitch back → result (70.6)
  if (T > 70.6) {
    const x = 1470, y = 150;
    const u = easeBack(clamp01((T - 70.6) / 0.4));
    const row = ROWS[1];
    for (let k = 0; k < 12; k++) {
      const i = k + 2;
      const w = 108 * row.s;
      const tx = row.x0 + i * (w + row.gap) + w / 2;
      const ty = row.y - 110 * row.s;
      const lu = ease(clamp01((T - 70.6 - k * 0.035) / 0.4));
      if (lu <= 0) continue;
      I.neon(ctx, I.partial([[tx, ty], [1300, 260 + k * 6], [x - 10, y + 130]], lu),
        2, 'rgba(255,194,74,0.8)', T, 170 + k, 1);
    }
    if (u > 0) {
      ctx.save();
      ctx.globalAlpha = clamp01(u * 1.5);
      ctx.translate(x + 185, y + 90); ctx.scale(u, u); ctx.translate(-(x + 185), -(y + 90));
      I.card(ctx, x, y, 370, 180, { fill: 'rgba(8,24,20,0.95)', edge: P.green, bw: 3 });
      I.text(ctx, '200 OK', x + 24, y + 62, { fam: F.head, size: 48, color: P.green });
      I.text(ctx, '14 ms · 12 shards stitched', x + 24, y + 110, { fam: F.mono, size: 23, color: P.ink });
      I.text(ctx, 'one pic, many hands', x + 24, y + 150, { fam: F.body, size: 23, color: P.inkDim });
      ctx.restore();
    }
  }

  // cloud sticky (73.0)
  if (T > 73.0) {
    const u = easeBack(clamp01((T - 73.0) / 0.32));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5);
    ctx.translate(1040, 430);
    ctx.scale(lerp(1.35, 1, easeOut(u)), lerp(1.35, 1, easeOut(u)));
    ctx.rotate(-0.055);
    I.card(ctx, -210, -160, 420, 320, { fill: '#F7D060', border: false, shadowColor: 'rgba(0,0,0,0.7)' });
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-70, -176, 140, 34);
    I.text(ctx, 'the cloud =', -170, -70, { fam: F.head, size: 46, color: '#141414' });
    I.text(ctx, "someone else's", -170, -6, { fam: F.head, size: 46, color: '#141414' });
    I.text(ctx, 'computer.', -170, 58, { fam: F.head, size: 46, color: '#141414' });
    I.text(ctx, '— every sysadmin, forever', -170, 128, { fam: F.mono, size: 22, color: '#3A3A2A' });
    ctx.restore();
  }

  // power gauge (75.4)
  if (T > 75.4) {
    const u = ease(prog(T, 'power_fact', 1.2));
    I.text(ctx, 'DATA CENTERS ≈ 1.5% OF WORLD ELECTRICITY', 140, 962,
      { fam: F.semi, size: 30, color: P.ink });
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(140, 982, 900, 44);
    ctx.strokeStyle = P.amber; ctx.lineWidth = 3;
    ctx.strokeRect(140, 982, 900, 44);
    ctx.fillStyle = u > 0.92 ? P.crimson : P.amber;
    ctx.fillRect(146, 988, 888 * u, 32);
    if (u > 0.9) I.text(ctx, 'AND CLIMBING ↑', 1064, 1016, { fam: F.head, size: 30, color: P.crimson });
  }

  // heat waves (78.2)
  if (T > 78.2) {
    ctx.save();
    ctx.globalAlpha = 0.5 * ease(clamp01((T - 78.2) / 0.5));
    I.wavy(ctx, 300, 430, 900, 430, 14, P.amber, T, 201, 3);
    I.wavy(ctx, 1000, 400, 1600, 400, 12, P.amber, T, 202, 3);
    I.wavy(ctx, 500, 350, 1100, 350, 10, 'rgba(255,194,74,0.7)', T, 203, 2.5);
    ctx.restore();
  }
}

// ════════════════════════════════════════════════ CRYPTO (80–98)
export function scene_crypto(ctx, sc, T) {
  I.paper(ctx, { base: '#100C18', gridColor: '#2A1E3A', seed: 61 });
  I.chip(ctx, 40, 34, '05 // LOCKS', P.gold, T, { size: 20, seed: 37 });

  // padlock
  const lockX = 300, lockY = 450;
  const bodyU = ease(prog(T, 'lock_draw', 0.55));
  if (bodyU > 0) {
    ctx.save();
    ctx.globalAlpha = clamp01(bodyU * 1.5);
    I.neonRect(ctx, lockX, lockY, 300, 250, 5, P.gold, T, 210, 14);
    // keyhole
    ctx.strokeStyle = P.gold; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(lockX + 150, lockY + 105, 30, 0, 7); ctx.stroke();
    I.sline(ctx, lockX + 150, lockY + 130, lockX + 150, lockY + 185, 6, P.gold, T, 211);
    ctx.restore();
  }
  // shackle: lifted (open) until 96.6, snaps closed
  const snapU = ease(clamp01((T - ev('lock_snap')) / 0.15));
  const shDy = bodyU > 0.9 ? lerp(-26, 0, snapU) : -26;
  if (bodyU > 0.3) {
    const cxx = lockX + 150, topY = lockY + shDy;
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const a = Math.PI + (k / 24) * Math.PI;
      pts.push([cxx + Math.cos(a) * 92, topY + Math.sin(a) * 92]);
    }
    // legs
    pts.unshift([cxx - 92, topY + 62]);
    pts.push([cxx + 92, topY + 62]);
    const su = ease(prog(T, 'lock_draw', 0.7) + 0.3);
    const pp = I.partial(pts, clamp01(su));
    if (pp.length > 1) I.neon(ctx, pp, 6, P.gold, T, 212, 2);
  }
  // HTTPS chip after snap
  if (T > ev('lock_snap')) {
    const u = easeBack(clamp01((T - ev('lock_snap')) / 0.3));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5);
    ctx.translate(450, 760); ctx.scale(u, u);
    I.card(ctx, -150, -32, 300, 64, { fill: 'rgba(30,26,8,0.95)', edge: P.gold, bw: 2.5 });
    I.text(ctx, 'HTTPS SECURED', -122, 14, { fam: F.head, size: 32, color: P.gold });
    // drawn lock tick
    I.sline(ctx, 96, -10, 110, 4, 4.5, P.gold, T, 242);
    I.sline(ctx, 110, 4, 138, -22, 4.5, P.gold, T, 243);
    ctx.restore();
  }

  // handshake tickets (83.0)
  if (T > 83.0) {
    const uA = ease(clamp01((T - 83.0) / 0.5));
    const xA = lerp(360, 700, uA);
    ctx.save();
    ctx.globalAlpha = clamp01(uA * 1.6);
    I.card(ctx, xA, 250, 470, 150, { fill: P.card, edge: P.cyan, bw: 3 });
    I.text(ctx, 'CLIENT_HELLO', xA + 22, 300, { fam: F.head, size: 36, color: P.cyan });
    I.text(ctx, 'cipher: TLS_AES_256_GCM_SHA384', xA + 22, 344, { fam: F.mono, size: 22, color: P.inkDim });
    I.text(ctx, 'version: TLS 1.3', xA + 22, 380, { fam: F.mono, size: 22, color: P.inkDim });
    ctx.restore();

    const uB = ease(clamp01((T - 83.14) / 0.5));
    const xB = lerp(1560, 700, uB);
    ctx.save();
    ctx.globalAlpha = clamp01(uB * 1.6);
    I.card(ctx, xB, 440, 470, 150, { fill: P.card, edge: P.green, bw: 3 });
    I.text(ctx, 'SERVER_HELLO', xB + 22, 490, { fam: F.head, size: 36, color: P.green });
    I.text(ctx, 'cert: paper.net OK chain ok', xB + 22, 534, { fam: F.mono, size: 22, color: P.inkDim });
    I.text(ctx, 'version: TLS 1.3', xB + 22, 570, { fam: F.mono, size: 22, color: P.inkDim });
    ctx.restore();
  }

  // key swap (86.0)
  if (T > 86.0) {
    const u = ease(clamp01((T - 86.0) / 0.8));
    const k1x = lerp(700, 1070, u), k2x = lerp(1070, 700, u);
    const yK = 640;
    const drawKey = (x, label, col) => {
      I.card(ctx, x, yK, 340, 74, { fill: '#1A160A', edge: col, bw: 2.5 });
      I.text(ctx, label, x + 18, yK + 48, { fam: F.mono, size: 25, color: col });
    };
    drawKey(k1x, u < 0.5 ? 'KEY-EXCHANGE >' : 'SHARED OK', u < 0.5 ? P.gold : P.green);
    drawKey(k2x, u < 0.5 ? '< KEY-EXCHANGE' : 'OK SHARED', u < 0.5 ? P.gold : P.green);
    if (u >= 1) {
      I.text(ctx, 'both sides now hold the same secret — nobody else does.',
        700, yK + 118, { fam: F.body, size: 25, color: P.inkDim });
    }
  }

  // AES shred (88.8) plaintext → cipher grid
  const shredU = clamp01((T - ev('aes_shred')) / 0.8);
  if (T > 86.6) {
    const gx = 1220, gy = 250, cw = 106, ch = 64, gap = 6;
    if (shredU <= 0 || T < ev('aes_shred')) {
      // plaintext card (with pre-shred slice jitter in last 0.1 s)
      const jitter = T > ev('aes_shred') - 0.1 ? (hash01(Math.floor(T * 30)) - 0.5) * 26 : 0;
      ctx.save();
      ctx.translate(jitter, 0);
      I.card(ctx, gx, gy, 464, 150, { fill: P.card, edge: P.magenta, bw: 3, tape: 'l' });
      I.text(ctx, 'PLAINTEXT', gx + 22, gy + 46, { fam: F.semi, size: 24, color: P.magenta });
      I.text(ctx, "'meet me at 8?'", gx + 22, gy + 112, { fam: F.head, size: 44, color: P.ink });
      ctx.restore();
    } else {
      // cipher cells scramble then lock
      const cols = 4, rows = 4;
      const r = rng(999);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const idx = j * cols + i;
          const cu = clamp01((shredU - idx * 0.03) / 0.3);
          if (cu <= 0) continue;
          const cx0 = gx + i * (cw + gap), cy0 = gy + 30 + j * (ch + gap);
          ctx.save();
          ctx.globalAlpha = clamp01(cu * 2);
          ctx.fillStyle = cu < 1 ? '#1E0E18' : '#0E1424';
          ctx.fillRect(cx0, cy0, cw, ch);
          ctx.strokeStyle = cu < 1 ? P.magenta : 'rgba(43,232,232,0.6)';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx0, cy0, cw, ch);
          ctx.font = `26px ${F.mono}`;
          ctx.fillStyle = cu < 1 ? P.magenta : P.cyan;
          const hex = cu < 1
            ? I.scrambleStr('a9f3', cu, 50 + idx, T)
            : (Math.floor(hash01(idx * 7.7) * 0xffff)).toString(16).padStart(4, '0');
          ctx.fillText(hex, cx0 + 16, cy0 + 44);
          ctx.restore();
        }
      }
      I.text(ctx, 'AES-256 — looks like noise, costs a fortune to read',
        gx, gy + 30 + rows * (ch + gap) + 40, { fam: F.body, size: 24, color: P.inkDim });
    }
  }

  // brute-force bar (93.9)
  if (T > 93.9) {
    I.text(ctx, 'ATTACK PROGRESS', 240, 668, { fam: F.semi, size: 24, color: P.crimson });
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(240, 682, 940, 40);
    ctx.strokeStyle = P.crimson; ctx.lineWidth = 2.5;
    ctx.strokeRect(240, 682, 940, 40);
    const gw = 3 + Math.min(6, (T - 93.9) * 0.8);
    ctx.fillStyle = P.crimson;
    ctx.fillRect(244, 686, gw, 32);
    const eu = easeBack(clamp01((T - 94.6) / 0.3));
    if (eu > 0) {
      ctx.save();
      ctx.globalAlpha = clamp01(eu * 1.5);
      ctx.translate(1190, 702); ctx.scale(eu, eu);
      I.card(ctx, 0, -26, 330, 52, { fill: 'rgba(40,8,14,0.92)', edge: P.crimson, bw: 2 });
      I.text(ctx, 'est. time: no.', 20, 10, { fam: F.mono, size: 26, color: P.crimson });
      ctx.restore();
    }
  }

  // KEY FACT card (91.4)
  if (T > 91.4) {
    const rp = clamp01((T - 91.4) / 0.6);
    const x = 240, y = 770;
    ctx.save();
    ctx.globalAlpha = clamp01(rp * 2);
    I.card(ctx, x, y, 1440, 210, { fill: '#171024', edge: P.magenta, bw: 3.5 });
    I.chromaText(ctx, I.scrambleStr('AES-256 · 2^256 KEYS', rp, 60, T),
      x + 34, y + 76, { size: 56, fam: F.head, color: P.ink, off: 8 * (1 - rp) + 1 });
    I.text(ctx, 'brute force would take longer than the universe has existed.',
      x + 36, y + 140, { fam: F.body, size: 36, color: rp > 0.8 ? P.ink : P.inkDim });
    I.chip(ctx, x + 1150, y + 30, '≈1.16 × 10^77 keys', P.gold, T, { size: 21, seed: 44 });
    ctx.restore();
  }
}

// ════════════════════════════════════════════════ THREAT (98–116)
export function scene_threat(ctx, sc, T) {
  I.paper(ctx, { base: '#150A0E', gridColor: '#3A1620', fleck: 'rgba(255,120,110,0.05)', seed: 71 });
  I.chip(ctx, 40, 34, '06 // THREAT LOG', P.crimson, T, { size: 20, seed: 38 });
  // blinking record dot
  if (hash01(Math.floor(T * 2.5)) > 0.35) I.led(ctx, 300, 56, 7, P.crimson, true, T);

  // crimson horizon (98.2)
  const hz = ease(prog(T, 'dark_rise', 0.8));
  if (hz > 0) I.neon(ctx, I.partial([[-40, 205], [1960, 205]], hz), 3, 'rgba(255,75,62,0.55)', T, 220, 2);

  // phishing hook + password note (100.4)
  if (T > 100.3) {
    const drop = ease(prog(T, 'phish_hook', 0.5));
    const lx = 560;
    const lineEndY = lerp(-60, 380, drop);
    I.sline(ctx, lx, -60, lx, lineEndY, 3, P.crimson, T, 221);
    if (drop > 0.85) {
      const hook = [[lx, lineEndY], [lx, lineEndY + 70], [lx + 34, lineEndY + 112],
        [lx + 74, lineEndY + 104], [lx + 82, lineEndY + 62]];
      I.neon(ctx, hook, 4.5, P.crimson, T, 222, 1.4);
      // grabbed note (gentle event-gated swing)
      const grab = ease(clamp01((T - 101.0) / 0.7));
      const bob = Math.sin((T - 100.4) * 3.2) * 5 * grab;
      const ny = 505 - 58 * grab + bob;
      ctx.save();
      ctx.rotate(Math.sin((T - 100.4) * 2.4) * 0.03 * grab);
      I.card(ctx, 400, ny, 320, 200, { fill: '#F2C14E', border: false, rot: 0.04, shadowColor: 'rgba(0,0,0,0.75)' });
      I.text(ctx, 'PASSWORD.SECRET', 428, ny + 52, { fam: F.mono, size: 22, color: '#4A3A10' });
      I.text(ctx, 'hunter2', 428, ny + 128, { fam: F.head, size: 58, color: '#141414' });
      I.text(ctx, '(same since 2014)', 428, ny + 172, { fam: F.mono, size: 21, color: '#4A3A10' });
      ctx.restore();
      if (T > 101.2) {
        const cu = easeBack(clamp01((T - 101.2) / 0.35));
        ctx.save();
        ctx.globalAlpha = clamp01(cu * 1.5);
        ctx.translate(760, 560); ctx.scale(cu, cu);
        I.card(ctx, 0, 0, 400, 74, { fill: 'rgba(40,8,14,0.95)', edge: P.crimson, bw: 2.5 });
        I.text(ctx, 'PHISHING -> 198.51.100.7', 18, 48, { fam: F.mono, size: 25, color: P.crimson });
        ctx.restore();
      }
    }
  }

  // specimen tag — right-side density while the hook plays
  if (T > 101.6) {
    const u = easeBack(clamp01((T - 101.6) / 0.4));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.4) * 0.92;
    ctx.translate(1560, 850);
    ctx.scale(u, u);
    I.card(ctx, -200, -95, 400, 190, { fill: '#1A0C10', edge: P.crimson, bw: 2.5, rot: -0.04 });
    I.text(ctx, 'SPECIMEN 07-B', -170, -48, { fam: F.mono, size: 24, color: P.crimson });
    I.text(ctx, 'HUMAN (CURIOUS)', -170, 4, { fam: F.head, size: 34, color: P.ink });
    I.text(ctx, 'trusting by default', -170, 52, { fam: F.body, size: 23, color: P.inkDim });
    I.text(ctx, 'patch level: overdue', -170, 84, { fam: F.mono, size: 21, color: P.amber });
    ctx.restore();
  }

  // ransom alert card (103.3) — card shakes, camera never does
  if (T > 103.3) {
    const u = clamp01((T - 103.3) / 0.6);
    const amp = (1 - u) * 9;
    const sx = Math.sin(T * 61) * amp, sy = Math.cos(T * 53) * amp * 0.6;
    const x = 1200 + sx, y = 250 + sy;
    ctx.save();
    const popU = easeBack(clamp01((T - 103.3) / 0.3));
    ctx.globalAlpha = clamp01(popU * 1.6);
    ctx.translate(x + 290, y + 170);
    ctx.scale(lerp(1.3, 1, easeOut(popU)), lerp(1.3, 1, easeOut(popU)));
    ctx.translate(-(x + 290), -(y + 170));
    I.card(ctx, x, y, 580, 340, { fill: '#1C0A10', edge: P.crimson, bw: 4 });
    if (hash01(Math.floor(T * 4)) > 0.4) I.led(ctx, x + 540, y + 40, 10, P.crimson, true, T);
    I.text(ctx, 'YOUR FILES', x + 30, y + 84, { fam: F.head, size: 56, color: P.crimson });
    I.text(ctx, 'ARE LOCKED', x + 30, y + 148, { fam: F.head, size: 56, color: P.crimson });
    I.text(ctx, '// DECRYPT KEY: NOT FOUND', x + 30, y + 210, { fam: F.mono, size: 27, color: P.amber });
    I.text(ctx, 'ransomware — the math held,', x + 30, y + 262, { fam: F.body, size: 25, color: P.inkDim });
    I.text(ctx, 'the open port did not.', x + 30, y + 298, { fam: F.body, size: 25, color: P.inkDim });
    // cartoon key with X
    ctx.save();
    ctx.translate(x + 480, y + 250);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(-26, -18, 22, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(30, 36); ctx.lineTo(44, 22); ctx.moveTo(18, 24); ctx.lineTo(30, 12); ctx.stroke();
    ctx.strokeStyle = P.crimson;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-46, -38); ctx.lineTo(46, 42); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  // 2FA card (111.4)
  if (T > 111.4) {
    const x = 880, y = 300;
    const u = easeBack(clamp01((T - 111.4) / 0.3));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5);
    I.card(ctx, x, y, 300, 250, { fill: P.card, edge: P.magenta, bw: 3, tape: 'r' });
    I.text(ctx, '2FA CODE', x + 24, y + 48, { fam: F.semi, size: 26, color: P.magenta });
    '4029'.split('').forEach((d, i) => {
      const du = easeBack(clamp01((T - 111.55 - i * 0.12) / 0.3));
      if (du <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp01(du * 1.6);
      ctx.translate(x + 42 + i * 62, y + 140);
      ctx.scale(du, du);
      ctx.font = `64px ${F.mono}`;
      ctx.fillStyle = P.ink;
      ctx.fillText(d, -14, 22);
      ctx.restore();
    });
    I.text(ctx, 'expires in 29 s', x + 24, y + 224, { fam: F.mono, size: 22, color: P.inkDim });
    ctx.restore();
    const cu = easeBack(clamp01((T - 111.9) / 0.35));
    if (cu > 0) {
      ctx.save();
      ctx.globalAlpha = clamp01(cu * 1.5);
      ctx.translate(850, 580); ctx.scale(cu, cu);
      I.card(ctx, 0, 0, 360, 56, { fill: 'rgba(40,4,24,0.95)', edge: P.magenta, bw: 2.5 });
      I.text(ctx, 'SOMETHING YOU HAVE', 22, 39, { fam: F.semi, size: 25, color: P.magenta });
      ctx.restore();
    }
  }

  // hash terminal (106.0)
  if (T > 106.0) {
    const x = 150, y = 720, w = 1620, h = 320;
    const OU = ease(prog(T, 'hash_type', 0.35));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 30, y - 30, w + 60, (h + 60) * OU); ctx.clip();
    I.windowFrame(ctx, x, y, w, h, 'vault — secure notes', P.green, T, { seed: 12 });
    ctx.font = `30px ${F.mono}`;
    ctx.fillStyle = P.green;
    typed(ctx, '$ vault add hunter2', x + 40, y + 90, T, 106.1, 0.7);
    if (T > 106.9) {
      ctx.fillStyle = P.green;
      const target = '$2b$12$Kxv8mR3qP9wL2nH7tYc0eUOq4Zb7';
      const newHash = '$2b$12$Qp7Zn4XwE1vR8mT3yB6kLdHs0Rf';
      if (T < 108.9) {
        ctx.fillText(target, x + 40, y + 148);
      } else {
        const rp = clamp01((T - 108.9) / 0.7);
        ctx.fillText(I.scrambleStr(newHash, rp, 71, T), x + 40, y + 148);
      }
    }
    if (T > 107.5) {
      ctx.fillStyle = P.inkDim;
      ctx.font = `26px ${F.body}`;
      ctx.fillText('stored as a one-way hash — not your password.', x + 40, y + 200);
    }
    if (T > 108.9) {
      ctx.font = `28px ${F.mono}`;
      ctx.fillStyle = P.amber;
      ctx.fillText('+ salt 9f3a7d2c', x + 40, y + 252);
    }
    if (T > 109.8) {
      ctx.font = `26px ${F.body}`;
      ctx.fillStyle = P.cyan;
      ctx.fillText('same password + new salt = completely different hash.', x + 460, y + 252);
    }
    ctx.restore();
  }

  // patch sticky (113.8)
  if (T > 113.8) {
    const u = easeBack(clamp01((T - 113.8) / 0.3));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5);
    ctx.translate(1240, 545);
    ctx.rotate(-0.09);
    ctx.scale(lerp(1.4, 1, easeOut(u)), lerp(1.4, 1, easeOut(u)));
    I.card(ctx, -170, -75, 340, 150, { fill: '#F7D060', border: false });
    I.text(ctx, 'UPDATE.', -140, -10, { fam: F.head, size: 52, color: '#141414' });
    I.text(ctx, 'NOW.', -140, 50, { fam: F.head, size: 52, color: '#C22B1E' });
    ctx.restore();
  }
}

// ════════════════════════════════════════════════ OUTRO (116–128)
const RECAP = [
  ['PACKETS', 'cut · routed · whole', P.cyan],
  ['DNS', 'names → numbers', P.green],
  ['FIBER', '200,000 km/s', P.amber],
  ['CLOUD', 'a building, not a cloud', P.cyan],
  ['LOCKS', 'TLS · AES-256', P.gold],
  ['HUMANS', 'the weak link', P.magenta],
];
export function scene_outro(ctx, sc, T) {
  I.paper(ctx, { base: '#0B0E14', gridColor: '#1E2A44', seed: 81 });
  I.chip(ctx, 40, 34, '07 // RECAP', P.magenta, T, { size: 20, seed: 39 });

  const fadeAll = 1 - ease(clamp01((T - 122.4) / 0.45));

  // recap cards (116.4)
  ctx.save();
  ctx.globalAlpha = fadeAll;
  RECAP.forEach(([ttl, sub, col], i) => {
    const u = easeBack(clamp01((T - 116.4 - i * 0.09) / 0.45));
    if (u <= 0) return;
    const x = 130 + i * 296;
    const y = 300 + Math.abs(i - 2.5) * 24;
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5) * fadeAll;
    ctx.translate(x + 135, y + 90);
    ctx.scale(u, u);
    ctx.translate(-(x + 135), -(y + 90));
    I.card(ctx, x, y, 270, 180, { fill: P.card, edge: col, bw: 3 });
    I.text(ctx, `0${i + 1}`, x + 18, y + 40, { fam: F.mono, size: 21, color: P.inkDim });
    I.text(ctx, ttl, x + 18, y + 100, { fam: F.head, size: 36, color: col });
    I.text(ctx, sub, x + 18, y + 146, { fam: F.body, size: 22, color: P.ink });
    ctx.restore();
  });
  ctx.restore();

  // one packet crossing (117–124, single pass)
  if (T > 117.0 && T < 124.2) {
    const u = clamp01((T - 117.0) / 7.0);
    const px = lerp(-280, 2200, u);
    ctx.save();
    ctx.globalAlpha = fadeAll;
    I.card(ctx, px, 930, 260, 64, { fill: P.card, edge: P.cyan, bw: 2.5 });
    I.text(ctx, 'SEQ · KEEP MOVING', px + 18, 972, { fam: F.mono, size: 24, color: P.cyan });
    ctx.restore();
  }

  // final gauge (119.6)
  if (T > 119.6 && fadeAll > 0) {
    const x = 640, y = 620, w = 640, h = 250;
    const u = easeBack(clamp01((T - 119.6) / 0.4));
    ctx.save();
    ctx.globalAlpha = clamp01(u * 1.5) * fadeAll;
    I.card(ctx, x, y, w, h, { fill: P.card, edge: P.amber, bw: 3 });
    I.text(ctx, 'YOUR LAST PAGE LOAD', x + 28, y + 48, { fam: F.semi, size: 27, color: P.amber });
    I.text(ctx, '≈ 0.1 s', x + 28, y + 138, { fam: F.head, size: 84, color: P.ink });
    I.text(ctx, '30+ round trips · most of it light', x + 28, y + 196, { fam: F.body, size: 27, color: P.inkDim });
    // needle
    const na = lerp(-2.2, 0.7, ease(clamp01((T - 119.8) / 0.9)));
    ctx.save();
    ctx.translate(x + w - 96, y + 110);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 64, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
    I.sline(ctx, 0, 0, Math.cos(na) * 54, Math.sin(na) * 54, 5, P.magenta, T, 230);
    ctx.restore();
    ctx.restore();
  }

  // END STAMP (122.8)
  if (T > 122.8) {
    const u = easeOut(clamp01((T - 122.8) / 0.25));
    const sc = lerp(1.3, 1, u);
    ctx.save();
    ctx.translate(960, 430);
    ctx.scale(sc, sc);
    ctx.rotate(-0.012);
    ctx.globalAlpha = clamp01(u * 2);
    I.card(ctx, -500, -160, 1000, 320, { fill: '#120A18', edge: P.cyan, bw: 4 });
    ctx.strokeStyle = P.magenta;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-482, -142, 964, 284);
    I.tracked(ctx, 'THE INTERNET ON PAPER', 0, -84, 30, P.amber, 8, F.display, 'center');
    I.tracked(ctx, 'STAY CURIOUS.', 0, 22, 72, P.ink, 5, F.head, 'center');
    I.tracked(ctx, 'STAY ENCRYPTED.', 0, 118, 72, P.magenta, 5, F.head, 'center');
    ctx.restore();
  }
  if (T > 124.2) {
    I.text(ctx, 'MADE OF AGREEMENTS · 104 BPM · HAND-INKED · NO CLOUD WAS HARMED',
      960, H - 40, { fam: F.mono, size: 23, color: P.inkDim, align: 'center' });
  }
}

export const SCENES = {
  intro: scene_intro,
  packets: scene_packets,
  dns: scene_dns,
  speed: scene_speed,
  datacenter: scene_datacenter,
  crypto: scene_crypto,
  threat: scene_threat,
  outro: scene_outro,
};
