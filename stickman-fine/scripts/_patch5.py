#!/usr/bin/env python3
"""Patch pass 5: desk hands, shake-arm direction, panel checkmark, monocle."""

def patch(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert a in s, f'{p} MISSING: ' + a[:70]
        s = s.replace(a, b, 1)
    open(p, 'w').write(s)
    print('patched', p)

patch('src/rig.js', [
    # sit: hands rest ON the desk surface (visible above desk top y=720 -> local y <= -60)
    ("  sit: P([-4,-108],[6,-156],[14,-204], [4,-100],[-4,-44],[-6,4], [-2,-98],[6,-42],[14,6],\n          [62,44],[64,104],[58,52],[60,106]),",
     "  sit: P([-4,-108],[6,-156],[14,-204], [4,-100],[30,-76],[62,-74], [-2,-98],[26,-70],[72,-66],\n          [62,44],[64,104],[58,52],[60,106]),"),
    # duck glasses = monocle on the eye (the second lens read as being on the beak)
    ("""  if (opt.glasses) {
    ring(ctx, 48, -52, 14, 4, seed + 54, ink);
    ring(ctx, 74, -50, 12, 4, seed + 55, ink);
    line(ctx, 62, -52, 62, -51, 4, seed + 56, { color: Ink.ink, flat: true });
  }""",
     """  if (opt.glasses) {
    ring(ctx, 58, -52, 15, 4.5, seed + 54, ink);
    stroke(ctx, [{ x: 68, y: -44 }, { x: 78, y: -18 }, { x: 66, y: 6 }], 3, 2.5, seed + 56, { color: Ink.ink, alpha: 0.85 });
  }"""),
])

patch('src/scenes.js', [
    # J4: shake arm reaches UP and AWAY from the face
    ("""  let pose = POSES.sleep;
  const ha0 = [-104, -18];
  if (T >= sc.at.shake_start - 0.3 && T < sc.at.shake_end + 0.4) {
    const amt = shaking ? Math.sin((T - sc.at.shake_start) * 34) : 0;
    const fade = shaking ? clamp01((T - sc.at.shake_start) * 4) * clamp01((sc.at.shake_end - T) * 3 + 0.3) : (T >= sc.at.shake_end + 0.4 ? 0 : 1);
    pose = {
      ...POSES.sleep,
      shA: [-40, -130], elA: [-10, -200], haA: [ha0[0] + amt * 30 * fade, ha0[1] - 70 + amt * 16 * fade],
    };""",
     """  let pose = POSES.sleep;
  const ha0 = [60, -150];
  if (T >= sc.at.shake_start - 0.3 && T < sc.at.shake_end + 0.4) {
    const amt = shaking ? Math.sin((T - sc.at.shake_start) * 34) : 0;
    const fade = shaking ? clamp01((T - sc.at.shake_start) * 4) * clamp01((sc.at.shake_end - T) * 3 + 0.3) : (T >= sc.at.shake_end + 0.4 ? 0 : 1);
    pose = {
      ...POSES.sleep,
      shA: [-40, -130], elA: [10, -190], haA: [ha0[0] + amt * 26 * fade, ha0[1] + amt * 14 * fade],
    };"""),
    # no stray shake speed-lines (smears carry the motion)
    ("    ctx.globalAlpha = 1;\n    speedLines(ctx, 640, 540, 700, 600, s + 70, 7, 0.3, 0.42);\n  }",
     "    ctx.globalAlpha = 1;\n  }"),
    # panel: replace unsupported check glyph with a drawn tick
    ("""      text(ctx, '10,000 STEPS ✓', pw / 2, ph * 0.88, 46, 'Fredoka_600SemiBold', { color: '#1B1A1F' });""",
     """      text(ctx, '10,000 STEPS', pw / 2 + 26, ph * 0.88, 46, 'Fredoka_600SemiBold', { color: '#1B1A1F' });
      stroke(ctx, [{ x: pw / 2 - 132, y: ph * 0.88 + 2 }, { x: pw / 2 - 116, y: ph * 0.88 + 20 }, { x: pw / 2 - 78, y: ph * 0.88 - 24 }], 11, 13, s + 97, { color: '#4CAF50' });"""),
])
print('pass5 complete')
