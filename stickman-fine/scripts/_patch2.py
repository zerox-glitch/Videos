#!/usr/bin/env python3
"""Patch pass 2: J4/J5/outro fixes in src/scenes.js"""
p = 'src/scenes.js'
s = open(p).read()

def rep(a, b, n=1):
    global s
    assert a in s, 'MISSING: ' + a[:70]
    s = s.replace(a, b, n)

# --- J4: smear alpha before draw + directional ghosts
rep("""  if (shaking) {
    for (let i = 1; i <= 2; i++) {
      drawStick(ctx, pose, { eyes: 'sleep', mouth: 'flat' },
        { x: 800, y: 700, seed: s - i, headR: 44, flat: true, weight: 1 });
      ctx.globalAlpha = 0.18;
    }
    ctx.globalAlpha = 1;
    speedLines(ctx, 640, 540, 700, 600, s + 70, 7, 0.3, 0.42);
  }""",
"""  if (shaking) {
    for (let i = 1; i <= 2; i++) {
      ctx.globalAlpha = 0.14;
      drawStick(ctx, pose, { eyes: 'sleep', mouth: 'flat' },
        { x: 800 - i * 12, y: 700, seed: s - i, headR: 44, flat: true });
    }
    ctx.globalAlpha = 1;
    speedLines(ctx, 640, 540, 700, 600, s + 70, 7, 0.3, 0.42);
  }""")

# --- J5: pillow + body on the couch
rep("""  ctx.save(); ctx.translate(150, 690); ctx.rotate(0.06);
  blob(ctx, [{ x: -40, y: -10 }, { x: 60, y: -30 }, { x: 80, y: 30 }, { x: -40, y: 40 }], s + 6, { color: '#FFF6EA', edge: true, edgeW: 6 });
  ctx.restore();
  drawStick(ctx, pose, face, { x: 480, y: 742, seed: s, headR: 44, tilt: -1.55 });""",
"""  ctx.save(); ctx.translate(340, 706); ctx.rotate(0.06);
  blob(ctx, [{ x: -40, y: -10 }, { x: 60, y: -30 }, { x: 80, y: 30 }, { x: -40, y: 40 }], s + 6, { color: '#FFF6EA', edge: true, edgeW: 6 });
  ctx.restore();
  drawStick(ctx, pose, face, { x: 480, y: 790, seed: s, headR: 44, tilt: -1.55 });""")

rep("""      stroke(ctx, [
        { x: 545, y: 640 }, { x: 596, y: 610 }, { x: 566, y: 578 }, { x: 612, y: 552 },
        { x: 585, y: 522 }, { x: 630, y: 502 },
      ], 6, 4, s + 7, { alpha: u });""",
"""      stroke(ctx, [
        { x: 545, y: 690 }, { x: 596, y: 660 }, { x: 566, y: 628 }, { x: 612, y: 602 },
        { x: 585, y: 572 }, { x: 630, y: 552 },
      ], 6, 4, s + 7, { alpha: u });""")

rep("""  const face = vis(sc, 'tear')
    ? { eyes: 'open', brow: 'sad', mouth: 'tremble', tear: prog(sc, 'tear', 1.1) }
    : { eyes: 'open', brow: 'flat', mouth: talkU > 0.4 ? 'o' : 'flat' };""",
"""  const face = vis(sc, 'tear')
    ? { eyes: 'open', brow: 'sad', mouth: 'tremble', tear: prog(sc, 'tear', 1.1) }
    : { eyes: 'open', brow: 'flat', mouth: talkU > 0.4 ? 'o' : 'flat' };
  face.blink = blinkOf(T);""")

# --- J5: duck/chair geometry
rep("""  const dx = 1430, dy = 700;
  ctx.save();
  // chair
  ctx.fillStyle = '#7A9AE0'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.roundRect(dx - 190, dy - 90, 420, 300, 24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6686CE'; ctx.beginPath(); ctx.roundRect(dx - 160, dy - 60, 170, 220, 18); ctx.fill(); ctx.stroke();
  stroke(ctx, [{ x: dx - 150, y: dy + 210 }, { x: dx - 160, y: dy + 260 }], 14, 12, s + 8);
  stroke(ctx, [{ x: dx + 190, y: dy + 210 }, { x: dx + 200, y: dy + 260 }], 14, 12, s + 9);
  ctx.restore();
  const quackU = Math.abs(T - sc.at.duck_squeak) < 0.3 || Math.abs(T - sc.at.quack) < 0.3;
  drawDuck(ctx, dx, dy - 60, 1.7, {""",
"""  const dx = 1430, dy = 740; // dy = duck origin (pad center = dx-99, dy-10)
  ctx.save();
  // chair
  ctx.fillStyle = '#7A9AE0'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.roundRect(dx - 200, dy - 170, 440, 320, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6686CE'; ctx.beginPath(); ctx.roundRect(dx - 168, dy - 140, 170, 260, 18); ctx.fill(); ctx.stroke();
  ctx.restore();
  const squeakHit = Math.abs(T - sc.at.duck_squeak) < 0.3;
  drawDuck(ctx, dx, dy, 1.7, {""")

rep("""    const w = Math.sin((T - sc.at.duck_write) * 16) * 26;
    pencilArm(ctx, dx + 44, dy - 66, dx + 66 + w, dy + 14, s + 10);
    // scribbles on pad
    for (let i = 0; i < 3; i++) {
      const y = dy - 96 + i * 22;
      line(ctx, dx - 118, y, dx - 40 + i * 14, y + 4, 5, s + 11 + i, { alpha: 0.8 });
    }""",
"""    const w = Math.sin((T - sc.at.duck_write) * 16) * 26;
    pencilArm(ctx, dx + 44, dy - 6, dx - 20 + w, dy + 40, s + 10);
    // scribbles on pad
    for (let i = 0; i < 3; i++) {
      const y = dy - 46 + i * 24;
      line(ctx, dx - 130, y, dx - 60 + i * 12, y + 4, 5, s + 11 + i, { alpha: 0.8 });
    }""")

rep("""    text(ctx, '$80', dx - 78, dy - 40, 54, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, '/ hr', dx - 74, dy + 6, 40, 'PatrickHand-Regular', { color: '#55505E' });""",
"""    text(ctx, '$80', dx - 99, dy - 6, 54, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, '/ hr', dx - 97, dy + 36, 40, 'PatrickHand-Regular', { color: '#55505E' });""")

rep("""  if (quackU || (T > sc.at.duck_reveal && T < sc.at.duck_reveal + 0.5)) {
    const a = Math.sin(T * 30) * 6;
    ctx.save(); ctx.translate(0, a * 0.4);
    ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 5; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(dx + 175, dy - 130, 26, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(dx + 185, dy - 130, 44, -0.6, 0.6); ctx.stroke();
    ctx.restore();
  }""",
"""  if (squeakHit || (T > sc.at.duck_reveal && T < sc.at.duck_reveal + 0.5)) {
    const a = Math.sin(T * 30) * 6;
    ctx.save(); ctx.translate(0, a * 0.4);
    ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 5; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(dx + 196, dy - 76, 26, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(dx + 206, dy - 76, 44, -0.6, 0.6); ctx.stroke();
    ctx.restore();
  }""")

# tear fall
rep("""    if (u < 0.92) {
      const tx = 480 + POSES.sleep.head[0] - 30, ty = 742 + POSES.sleep.head[1] + 34;
      const fy = ty + u * 260;""",
"""    if (u < 0.92) {
      const tx = 480 + POSES.sleep.head[0] - 30, ty = 790 + POSES.sleep.head[1] + 34;
      const fy = ty + u * 76;""")

rep("""    } else if (u < 1) {
      dot(ctx, 450, 900, 8 * (1 - u), '#5AA9E6', 1 - u);
    }""",
"""    } else if (u < 1) {
      dot(ctx, 318, 806, 8 * (1 - u), '#5AA9E6', 1 - u);
    }""")

# --- Outro: stickman clear of endcard
rep("""  // Stickman on the roof ledge with coffee
  const sipping""",
"""  // Stickman on the roof ledge with coffee (clear of the endcard)
  const SX = 1660;
  const sipping""")

rep("""  shadow(ctx, 1300, 886, 74, 14, 0.4, s);
  drawStick(ctx, pose, face, { x: 1300, y: 886 - 96, seed: s, headR: 46, color: '#2A2237' });
  // mug
  ctx.save(); ctx.translate(1300 + pose.haA[0] + 6, 790 + pose.haA[1]);""",
"""  shadow(ctx, SX, 886, 74, 14, 0.4, s);
  drawStick(ctx, pose, face, { x: SX, y: 886 - 96, seed: s, headR: 46, color: '#2A2237' });
  // mug
  ctx.save(); ctx.translate(SX + pose.haA[0] + 6, 790 + pose.haA[1]);""")

rep("""      line(ctx, 1300 + 8 + Math.cos(a) * 60, 790 - 60 + Math.sin(a) * 60,
        1300 + 8 + Math.cos(a) * 86, 790 - 60 + Math.sin(a) * 86, 5, s + 30 + i, { alpha: 0.8 });""",
"""      line(ctx, SX + 8 + Math.cos(a) * 60, 790 - 60 + Math.sin(a) * 60,
        SX + 8 + Math.cos(a) * 86, 790 - 60 + Math.sin(a) * 86, 5, s + 30 + i, { alpha: 0.8 });""")

open(p, 'w').write(s)
print('pass2 ok:', len(s))
