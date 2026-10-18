#!/usr/bin/env python3
"""Patch pass 1: J1/J2/J3 fixes in src/scenes.js"""
p = 'src/scenes.js'
s = open(p).read()

def rep(a, b, n=1):
    global s
    assert a in s, 'MISSING: ' + a[:70]
    s = s.replace(a, b, n)

# --- J1: night-scene ink
rep("""  const dark = T < sc.at.museum_case + 0.6;
  Ink.ink = dark ? '#F3EEE2' : '#1B1A1F';
  const night = ['#333F8F', '#4A57A8'];
  const dawn = ['#7A7FD0', '#B7A5D8'];
  paper(ctx, W, H, night[0], night[1], s, 0.16);
  if (dark) { // pre-museum still night""",
"""  Ink.ink = '#F3EEE2'; // chalk-on-night throughout
  const night = ['#333F8F', '#4A57A8'];
  paper(ctx, W, H, night[0], night[1], s, 0.16);
  { // night stars""")

rep("""  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = Ink.ink; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(0, 0, 56, 0, 7); ctx.fill(); ctx.stroke();
  text(ctx, ring_ ? '6:00' : '6:00', 0, -4, 30, 'Fredoka_600SemiBold', { color: '#1B1A1F' });""",
"""  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(0, 0, 56, 0, 7); ctx.fill(); ctx.stroke();
  text(ctx, '6:00', 0, -4, 30, 'Fredoka_600SemiBold', { color: '#1B1A1F' });""")

rep("""  ctx.fillStyle = '#8A6FBF'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.roundRect(1180, 700, 250, 180, 10); ctx.fill(); ctx.stroke();
  const ringing""",
"""  ctx.fillStyle = '#8A6FBF'; ctx.strokeStyle = '#F3EEE2'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.roundRect(1180, 700, 250, 180, 10); ctx.fill(); ctx.stroke();
  const ringing""")

rep("""  ctx.fillStyle = '#8A6FBF'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(380, 690, 740, 150, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#EDE9FC'; ctx.beginPath(); ctx.roundRect(360, 640, 200, 110, 16); ctx.fill(); ctx.stroke(); // pillow
  ctx.fillStyle = '#D62828'; ctx.beginPath(); ctx.roundRect(540, 700, 600, 118, 20); ctx.fill(); ctx.stroke();   // blanket
  ctx.fillStyle = '#FFFDF6'; ctx.beginPath(); ctx.roundRect(540, 700, 600, 34, 14); ctx.fill(); ctx.stroke();""",
"""  ctx.fillStyle = '#8A6FBF'; ctx.strokeStyle = '#F3EEE2'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(380, 690, 740, 150, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#EDE9FC'; ctx.strokeStyle = '#333F8F'; ctx.beginPath(); ctx.roundRect(360, 640, 200, 110, 16); ctx.fill(); ctx.stroke(); // pillow
  ctx.fillStyle = '#D62828'; ctx.strokeStyle = '#F3EEE2'; ctx.beginPath(); ctx.roundRect(540, 700, 600, 118, 20); ctx.fill(); ctx.stroke();   // blanket
  ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#D62828'; ctx.beginPath(); ctx.roundRect(540, 700, 600, 34, 14); ctx.fill(); ctx.stroke();""")

# rubber-arm slap + whoosh
rep("""  if (T >= sc.at.snooze_slap - 0.34 && T < sc.at.snooze_slap + 0.3) {
    const u = prog(sc, 'snooze_slap', 0.2, -0.34);
    const up = u < 0.6 ? u / 0.6 : (1 - (u - 0.6) / 0.4);
    pose = lerpPose(POSES.sleep, {
      ...POSES.sleep,
      elA: [30, -140], haA: [110, -170],
    }, easeOut(up));
  }""",
"""  if (T >= sc.at.snooze_slap - 0.4 && T < sc.at.snooze_slap + 0.3) {
    const u = prog(sc, 'snooze_slap', 0.2, -0.4);
    const up = u < 0.55 ? u / 0.55 : (1 - (u - 0.55) / 0.45);
    pose = lerpPose(POSES.sleep, {
      ...POSES.sleep,
      shA: [20, -86], elA: [240, -140], haA: [470, -158],
    }, easeOut(up));
    if (up > 0.55) whoosh(ctx, 1090, 560, 190, 0.35, s + 44, 0.75, 6);
  }""")

# museum spotlight
rep("""    // glass box
    ctx.save();""",
"""    // exhibit spotlight
    ctx.save();
    const sp = ctx.createLinearGradient(785, 120, 785, 900);
    sp.addColorStop(0, 'rgba(255,244,214,0.55)'); sp.addColorStop(1, 'rgba(255,244,214,0.02)');
    ctx.fillStyle = sp;
    ctx.beginPath(); ctx.moveTo(720, 90); ctx.lineTo(850, 90);
    ctx.lineTo(1330, 900); ctx.lineTo(240, 900); ctx.closePath(); ctx.fill();
    ctx.restore();
    // glass box
    ctx.save();""")

# --- J2: tube ends at the hand
rep("""    stroke(ctx, [{ x: ix - 20, y: 476 }, { x: ix + 40, y: 560 }, { x: 745, y: 620 }, { x: 690, y: 646 }], 6, 5, s + 14, { color: '#6F4E37' });""",
"""    stroke(ctx, [{ x: ix - 20, y: 476 }, { x: ix + 40, y: 570 }, { x: 750, y: 632 }, { x: 786, y: 664 }], 6, 5, s + 14, { color: '#6F4E37' });""")

# --- J3: fold transform + alpha + stickman before desk
rep("""  if (foldU > 0) { // the room folds into itself
    ctx.translate(960, 700);
    ctx.transform(lerp(1, 0.08, foldU), lerp(1, 0.04, foldU) * foldU * 0 + (1 - foldU) + foldU * 0.12,
      lerp(1, 0.14, foldU) * 0 + (1 - foldU) * 0 + foldU * -0.10, lerp(1, 0.10, foldU),
      0, 0);
    ctx.translate(-960, -700);
    ctx.globalAlpha = 1 - foldU * 0.25;
  }""",
"""  if (foldU > 0) { // the room folds into itself toward the desk
    ctx.translate(960, 700);
    ctx.transform(lerp(1, 0.07, foldU), 0.10 * foldU, -0.05 * foldU, lerp(1, 0.09, foldU), 0, 0);
    ctx.translate(-960, -700);
    ctx.globalAlpha = 1 - foldU;
  }""")

rep("""  // desk + paperwork
  ctx.save();
  ctx.fillStyle = '#B98E5E';""",
"""  // Stickman at desk (sitting) — before the desk so legs tuck underneath
  let face = { eyes: 'open', brow: 'flat', mouth: 'flat' };
  if (T > sc.at.clock_spin + 2) { face = { eyes: 'dead', brow: 'sad', mouth: 'flat' }; }
  if (T > sc.at.clock_spin + 4.2) { face = { eyes: 'dead', brow: 'sad', mouth: 'tremble' }; }
  face.blink = blinkOf(T);
  shadow(ctx, 880, 906, 70, 14, 0.28, s);
  drawStick(ctx, POSES.sit, face, { x: 880, y: 768, seed: s, headR: 46 });

  // desk + paperwork
  ctx.save();
  ctx.fillStyle = '#B98E5E';""")

rep("""  // Stickman at desk (sitting)
  let face = { eyes: 'open', brow: 'flat', mouth: 'flat' };
  if (T > sc.at.clock_spin + 2) { face = { eyes: 'dead', brow: 'sad', mouth: 'flat' }; }
  if (T > sc.at.clock_spin + 4.2) { face = { eyes: 'dead', brow: 'sad', mouth: 'tremble' }; }
  face.blink = blinkOf(T);
  shadow(ctx, 880, 906, 70, 14, 0.28, s);
  drawStick(ctx, POSES.sit, face, { x: 880, y: 806, seed: s, headR: 46 });

  // boss""",
"""  // boss""")

open(p, 'w').write(s)
print('pass1 ok:', len(s))
