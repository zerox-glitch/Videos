#!/usr/bin/env python3
"""Patch pass 3: QA round-1 fixes (ink alpha, paper margin, poses, staging)."""

def load(p): return open(p).read()
def save(p, s): open(p, 'w').write(s)

def patch(p, pairs):
    s = load(p)
    for a, b in pairs:
        assert a in s, f'{p} MISSING: ' + a[:70]
        s = s.replace(a, b, 1)
    save(p, s)
    print('patched', p)

# ---------------- ink.js ----------------
patch('src/lib/ink.js', [
    # multiply alpha instead of replacing (inherits camera/fold groups)
    ("""  ctx.strokeStyle = opt.color || Ink.ink;
  if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;""",
     """  ctx.strokeStyle = opt.color || Ink.ink;
  if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;"""),
    ("""  ctx.fillStyle = opt.color || Ink.paper;
  if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
  ctx.fill();""",
     """  ctx.fillStyle = opt.color || Ink.paper;
  if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
  ctx.fill();"""),
    ("""  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();""",
     """  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();"""),
    ("""    ctx.globalAlpha = alpha * (0.55 + hash(seed + i) * 0.45);""",
     """    ctx.globalAlpha *= alpha * (0.55 + hash(seed + i) * 0.45);"""),
    # paper: cover beyond world rect so cameras never expose the void
    ("""export function paper(ctx, W, H, top, bot, seed = 0, vignette = 0.10) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bot || top);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.5;
  const ox = -(Math.floor(hash(seed) * 6) * 37) % 320, oy = -(Math.floor(hash(seed + 9) * 6) * 29) % 180;
  for (let x = ox; x < W; x += 320) for (let y = oy; y < H; y += 180)
    ctx.drawImage(grain(), x, y, 320, 180);
  ctx.restore();
  if (vignette > 0) {
    const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
    rg.addColorStop(0, 'rgba(30,26,40,0)');
    rg.addColorStop(1, `rgba(30,26,40,${vignette})`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
}""",
     """const M = 460; // camera-proof margin around the world rect
export function paper(ctx, W, H, top, bot, seed = 0, vignette = 0.10) {
  const g = ctx.createLinearGradient(0, -M, 0, H + M);
  g.addColorStop(0, top); g.addColorStop(1, bot || top);
  ctx.fillStyle = g; ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
  ctx.save();
  ctx.globalAlpha = 0.5;
  const ox = -(Math.floor(hash(seed) * 6) * 37) % 320, oy = -(Math.floor(hash(seed + 9) * 6) * 29) % 180;
  for (let x = ox - M; x < W + M; x += 320) for (let y = oy - M; y < H + M; y += 180)
    ctx.drawImage(grain(), x, y, 320, 180);
  ctx.restore();
  if (vignette > 0) {
    const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
    rg.addColorStop(0, 'rgba(30,26,40,0)');
    rg.addColorStop(1, `rgba(30,26,40,${vignette})`);
    ctx.fillStyle = rg; ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
  }
}"""),
])

# ---------------- rig.js ----------------
patch('src/rig.js', [
    ("  wave: P([0,-118],[8,-166],[16,-214], [4,-110],[44,-140],[56,-196], [0,-108],[12,-50],[20,10],",
     "  wave: P([0,-118],[8,-166],[16,-214], [4,-110],[50,-170],[64,-276], [0,-108],[12,-50],[20,10],"),
])

# ---------------- scenes.js ----------------
patch('src/scenes.js', [
    # --- J1: readable lying face + Zzz time-passage gag
    ("  drawStick(ctx, pose, face, { x: 700, y: 690, seed: s, headR: 44, tilt: -1.9 });",
     """  drawStick(ctx, pose, face, { x: 700, y: 690, seed: s, headR: 44, tilt: -1.25 });
  if (T >= sc.at.days_start && T < sc.at.days_end + 0.7) {
    for (let i = 0; i < 3; i++) {
      const zu = ((T - sc.at.days_start) * 0.55 + i / 3) % 1;
      text(ctx, 'z', 560 + i * 36 + zu * 70, 620 - zu * 190, 24 + i * 15,
        'PatrickHand-Regular', { color: '#F3EEE2', alpha: (1 - zu) * 0.9, rot: 0.18 });
    }
  }"""),
    # --- J1: tourists hold cameras up to their faces
    ("      const face = { eyes: 'open', brow: 'raise', mouth: 'o' };\n      ctx.save(); ctx.translate(tx, G); ctx.scale(k * dir, k);\n      drawStick(ctx, i === 1 ? POSES.talk : POSES.stand, face, { x: 0, y: 0, seed: s + i * 7, headR: 46 });",
     "      const face = { eyes: 'open', brow: 'raise', mouth: 'o' };\n      ctx.save(); ctx.translate(tx, G); ctx.scale(k * dir, k);\n      drawStick(ctx, POSES.watchLook, face, { x: 0, y: 0, seed: s + i * 7, headR: 46 });"),
    # --- J2: chart typography
    ("""    text(ctx, 'DAILY CUP LIMIT', 0, -130, 34, 'PatrickHand-Regular', { color: '#55505E' });
    text(ctx, '1', -50, -30, 150, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, 'CUP / DAY', 55, -50, 44, 'Fredoka_600SemiBold', { color: '#1B1A1F' });
    line(ctx, -120, 60, 120, 60, 6, s + 8, { alpha: 0.5 });
    text(ctx, 'doctor’s orders', 0, 96, 34, 'PatrickHand-Regular', { color: '#88808F' });""",
     """    text(ctx, 'DAILY CUP LIMIT', 0, -132, 34, 'PatrickHand-Regular', { color: '#55505E' });
    text(ctx, '1 CUP / DAY', 0, -34, 82, 'Bangers-Regular', { color: '#1B1A1F' });
    line(ctx, -120, 34, 120, 34, 6, s + 8, { alpha: 0.5 });
    text(ctx, 'doctor’s orders', 0, 84, 34, 'PatrickHand-Regular', { color: '#88808F' });"""),
    # --- J2: nurse faints AWAY from the patient (falls toward the doctor)
    ("""    ctx.save();
    ctx.translate(1050, G); ctx.rotate(lerp(0, -1.45, fall)); ctx.translate(0, 0);""",
     """    ctx.save();
    ctx.translate(1120, G); ctx.rotate(lerp(0, 1.45, fall)); ctx.translate(0, 0);"""),
    ("    if (u < 0.4) speedLines(ctx, 1050, 600, 500, 700, s + 18, 6, 0.4, 0.5);",
     "    if (u < 0.4) speedLines(ctx, 1120, 600, 500, 700, s + 18, 6, 0.4, 0.5);"),
    # --- J4: lying face tilt, deadpan arm clear of face, watch nudge, Zzz
    ("  drawStick(ctx, pose, face, { x: 800, y: 700, seed: s, headR: 44, tilt: -1.9 });",
     "  drawStick(ctx, pose, face, { x: 800, y: 700, seed: s, headR: 44, tilt: -1.3 });"),
    ("    if (T >= sc.at.deadpan_zoom) pose = { ...pose, haA: [ha0[0] - 20, ha0[1] - 60], elA: [-14, -196] };",
     "    if (T >= sc.at.deadpan_zoom) pose = { ...pose, elA: [36, -156], haA: [-30, -110] };"),
    ("    ctx.save(); ctx.translate(800 + wp[0], 700 + wp[1]); ctx.rotate(shaking ? J(s, 81) * 0.3 : 0.4);",
     "    ctx.save(); ctx.translate(800 + wp[0] + 14, 700 + wp[1] + 8); ctx.rotate(shaking ? J(s, 81) * 0.3 : 0.4);"),
    # --- J5: proper sofa + tilt
    ("""  ctx.save(); ctx.translate(430, 880);
  blob(ctx, [{ x: -300, y: 0 }, { x: -330, y: -60 }, { x: -320, y: -170 }, { x: -270, y: -186 },
  { x: -260, y: -84 }, { x: 280, y: -84 }, { x: 290, y: -190 }, { x: 340, y: -174 },
  { x: 350, y: -54 }, { x: 318, y: 0 }], s + 2, { color: '#E5989B', edge: true, edgeW: 9 });
  // back cushion
  blob(ctx, [{ x: -250, y: -84 }, { x: -250, y: -160 }, { x: 270, y: -160 }, { x: 270, y: -84 }], s + 3,
    { color: '#D98489', edge: true, edgeW: 6 });
  // legs
  stroke(ctx, [{ x: -290, y: 0 }, { x: -300, y: 40 }], 14, 12, s + 4, {});
  stroke(ctx, [{ x: 300, y: 0 }, { x: 310, y: 40 }], 14, 12, s + 5, {});
  ctx.restore();""",
     """  ctx.save(); ctx.translate(430, 880);
  // back
  blob(ctx, [{ x: -320, y: -70 }, { x: -330, y: -196 }, { x: -296, y: -230 },
  { x: 300, y: -230 }, { x: 330, y: -196 }, { x: 322, y: -70 }], s + 2,
    { color: '#D98489', edge: true, edgeW: 9 });
  // seat
  blob(ctx, [{ x: -356, y: -78 }, { x: 356, y: -78 }, { x: 348, y: -6 }, { x: -348, y: -6 }], s + 3,
    { color: '#E5989B', edge: true, edgeW: 9 });
  // armrests
  blob(ctx, [{ x: -356, y: -8 }, { x: -356, y: -150 }, { x: -312, y: -164 },
  { x: -300, y: -140 }, { x: -300, y: -8 }], s + 4, { color: '#C9757B', edge: true, edgeW: 8 });
  blob(ctx, [{ x: 356, y: -8 }, { x: 356, y: -150 }, { x: 312, y: -164 },
  { x: 300, y: -140 }, { x: 300, y: -8 }], s + 5, { color: '#C9757B', edge: true, edgeW: 8 });
  // legs
  stroke(ctx, [{ x: -320, y: -6 }, { x: -330, y: 44 }], 16, 14, s + 6, {});
  stroke(ctx, [{ x: 320, y: -6 }, { x: 330, y: 44 }], 16, 14, s + 7, {});
  ctx.restore();"""),
    ("  drawStick(ctx, pose, face, { x: 480, y: 790, seed: s, headR: 44, tilt: -1.55 });",
     "  drawStick(ctx, pose, face, { x: 480, y: 790, seed: s, headR: 44, tilt: -1.25 });"),
    # --- OUTRO: cream silhouette pops against the skyline; window lights stay on buildings
    ("""  for (let j = 0; j < 26; j++) {
      const wx = hash(j * 11 + li) * W, wy = 880 - 60 - hash(j * 3 + li) * 320 * k;""",
     """  for (let j = 0; j < 26; j++) {
      const wx = hash(j * 11 + li) * W, wy = 880 - 34 - hash(j * 3 + li) * 150 * k;"""),
    ("  drawStick(ctx, pose, face, { x: SX, y: 886 - 96, seed: s, headR: 46, color: '#2A2237' });",
     "  drawStick(ctx, pose, face, { x: SX, y: 886 - 96, seed: s, headR: 46, color: '#FFF3E0' });"),
    ("""  blob(ctx, [{ x: -30, y: -6 }, { x: 30, y: -6 }, { x: 26, y: -58 }, { x: -26, y: -58 }], s + 20, { color: '#D62828', edge: true, edgeW: 6 });""",
     """  blob(ctx, [{ x: -30, y: -6 }, { x: 30, y: -6 }, { x: 26, y: -58 }, { x: -26, y: -58 }], s + 20, { color: '#D62828', edge: true, edgeW: 6 });
  ring(ctx, 34, -34, 18, 6, s + 22, { color: '#FFF3E0' });"""),
    ("""      line(ctx, SX + 8 + Math.cos(a) * 60, 790 - 60 + Math.sin(a) * 60,
        SX + 8 + Math.cos(a) * 86, 790 - 60 + Math.sin(a) * 86, 5, s + 30 + i, { alpha: 0.8 });""",
     """      line(ctx, SX + 8 + Math.cos(a) * 60, 790 - 60 + Math.sin(a) * 60,
        SX + 8 + Math.cos(a) * 86, 790 - 60 + Math.sin(a) * 86, 5, s + 30 + i,
        { alpha: 0.9, color: '#FFF3E0' });"""),
])
print('pass3 complete')
