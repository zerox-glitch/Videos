#!/usr/bin/env python3
"""Patch pass 4: duck reveal gate, gentler pan, chart text, pad text."""

def patch(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert a in s, f'{p} MISSING: ' + a[:70]
        s = s.replace(a, b, 1)
    open(p, 'w').write(s)
    print('patched', p)

patch('src/film.js', [
    ("  { at: 'duck_reveal',    cx: 1290, cy: 660, z: 1.07, dur: 0.90 },",
     "  { at: 'duck_reveal',    cx: 1050, cy: 660, z: 1.06, dur: 0.90 },"),
    ("""const IMPACTS = ['museum_case', 'flash1', 'flash2', 'flash3', 'stamp_espresso',
  'envelope_clunk', 'badge', 'stamp_proud', 'endcard'];""",
     """const IMPACTS = ['museum_case', 'flash1', 'flash2', 'flash3', 'stamp_espresso',
  'envelope_clunk', 'badge', 'stamp_proud', 'duck_reveal', 'endcard'];"""),
])

patch('src/scenes.js', [
    # chart typography fits the board
    ("""    text(ctx, 'DAILY CUP LIMIT', 0, -132, 34, 'PatrickHand-Regular', { color: '#55505E' });
    text(ctx, '1 CUP / DAY', 0, -34, 82, 'Bangers-Regular', { color: '#1B1A1F' });
    line(ctx, -120, 34, 120, 34, 6, s + 8, { alpha: 0.5 });
    text(ctx, 'doctor’s orders', 0, 84, 34, 'PatrickHand-Regular', { color: '#88808F' });""",
     """    text(ctx, 'DAILY CUP LIMIT', 0, -134, 34, 'PatrickHand-Regular', { color: '#55505E' });
    text(ctx, '1 CUP', 0, -46, 92, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, '/ DAY', 0, 34, 58, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, 'doctor’s orders', 0, 94, 34, 'PatrickHand-Regular', { color: '#88808F' });"""),
    # pad text sizing
    ("""    text(ctx, '$80', dx - 99, dy - 6, 54, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, '/ hr', dx - 97, dy + 36, 40, 'PatrickHand-Regular', { color: '#55505E' });""",
     """    text(ctx, '$80', dx - 99, dy - 16, 46, 'Bangers-Regular', { color: '#1B1A1F' });
    text(ctx, '/ hr', dx - 97, dy + 26, 34, 'PatrickHand-Regular', { color: '#55505E' });"""),
    # duck + chair pop in on the reveal (with impact flash handled by film.js)
    ("""  const dx = 1430, dy = 740; // dy = duck origin (pad center = dx-99, dy-10)
  ctx.save();
  // chair
  ctx.fillStyle = '#7A9AE0'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.roundRect(dx - 200, dy - 170, 440, 320, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6686CE'; ctx.beginPath(); ctx.roundRect(dx - 168, dy - 140, 170, 260, 18); ctx.fill(); ctx.stroke();
  ctx.restore();
  const squeakHit = Math.abs(T - sc.at.duck_squeak) < 0.3;
  drawDuck(ctx, dx, dy, 1.7, {
    seed: s, glasses: T > sc.at.duck_reveal - 0.4, notepad: true,
    color: '#FFD166',
  });""",
     """  const dx = 1430, dy = 740; // dy = duck origin (pad center = dx-99, dy-10)
  const squeakHit = Math.abs(T - sc.at.duck_squeak) < 0.3;
  if (vis(sc, 'duck_reveal')) {
    const ru = prog(sc, 'duck_reveal', 0.3);
    const rk = ru < 1 ? lerp(1.6, 1, easeOut(ru)) : 1;
    ctx.save();
    ctx.translate(dx, dy + 40); ctx.scale(rk, rk); ctx.translate(-dx, -(dy + 40));
  // chair
  ctx.fillStyle = '#7A9AE0'; ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.roundRect(dx - 200, dy - 170, 440, 320, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6686CE'; ctx.beginPath(); ctx.roundRect(dx - 168, dy - 140, 170, 260, 18); ctx.fill(); ctx.stroke();
  ctx.restore();
  drawDuck(ctx, dx, dy, 1.7, {
    seed: s, glasses: true, notepad: true,
    color: '#FFD166',
  });"""),
])

# close the duck block correctly: find the tail after squeak arcs and end the gate
s = open('src/scenes.js').read()
old = """  // squeak motion
  if (squeakHit || (T > sc.at.duck_reveal && T < sc.at.duck_reveal + 0.5)) {
    const a = Math.sin(T * 30) * 6;
    ctx.save(); ctx.translate(0, a * 0.4);
    ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 5; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(dx + 196, dy - 76, 26, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(dx + 206, dy - 76, 44, -0.6, 0.6); ctx.stroke();
    ctx.restore();
  }"""
new = """  // squeak motion
  if (squeakHit || (T > sc.at.duck_reveal && T < sc.at.duck_reveal + 0.5)) {
    const a = Math.sin(T * 30) * 6;
    ctx.save(); ctx.translate(0, a * 0.4);
    ctx.strokeStyle = '#1B1A1F'; ctx.lineWidth = 5; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(dx + 196, dy - 76, 26, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(dx + 206, dy - 76, 44, -0.6, 0.6); ctx.stroke();
    ctx.restore();
  }
  } // end duck_reveal gate"""
assert old in s, 'squeak tail missing'
s = s.replace(old, new, 1)
open('src/scenes.js', 'w').write(s)
print('gate closed')
