#!/usr/bin/env python3
"""patch_round4.py — missing beat visuals + close-up polish."""
import sys

def sub(path, pairs):
    s = open(path).read()
    for old, new in pairs:
        if s.count(old) == 0:
            print(f'MISS in {path}: {old[:90]!r}'); sys.exit(1)
        s = s.replace(old, new)
    open(path, 'w').write(s)
    print('patched', path)

sub('src/scenes.js', [
    # door beacon: keep from hard-clipping
    ("      PAL.white, { a: opts.doorA, emis: 1, fogK: 0 }));",
     "      PAL.white, { a: opts.doorA * 0.85, emis: 1, fogK: 0 }));"),
    # floating hall: brighter slabs + stronger edges
    ("""      out.push(...boxQuads(cx, cy, z, s, s * (0.4 + r() * 1.6), s,
        [28, 33, 43], { fogK: 0.85, stroke: [96, 116, 150], strokeA: 0.30 }));""",
     """      out.push(...boxQuads(cx, cy, z, s, s * (0.4 + r() * 1.6), s,
        [36, 42, 55], { fogK: 0.85, stroke: [120, 145, 185], strokeA: 0.45 }));"""),
    ("""        out.push(...boxQuads(cx + (r() - 0.5) * 8, cy - 4 - r() * 8, z + 4, s * 0.5, s * 2, s * 0.5,
          [18, 22, 29], { fogK: 0.9 }));""",
     """        out.push(...boxQuads(cx + (r() - 0.5) * 8, cy - 4 - r() * 8, z + 4, s * 0.5, s * 2, s * 0.5,
          [26, 31, 41], { fogK: 0.9, stroke: [110, 132, 168], strokeA: 0.35 }));"""),
    # brushed streaks on the titanium top (close-up texture)
    ("""    add(quad([[1.75, 0.98, 6.0], [-0.65, 0.98, 6.0], [-0.65, 0.98, 4.8], [1.75, 0.98, 4.8]],
      shade(STEEL, 0.4), { a: tb })); // hidden-ish end cap safety""",
     """    add(quad([[1.75, 0.98, 6.0], [-0.65, 0.98, 6.0], [-0.65, 0.98, 4.8], [1.75, 0.98, 4.8]],
      shade(STEEL, 0.4), { a: tb })); // hidden-ish end cap safety
    if (tb > 0.6) {
      for (const [sx, sz0, sz1, al] of [[-0.35, 4.9, 5.9, 0.5], [0.35, 4.86, 5.95, 0.4], [1.15, 4.92, 5.88, 0.45]]) {
        add(quad([[sx, 0.9801, sz1], [sx + 0.006, 0.9801, sz1], [sx + 0.006, 0.9801, sz0], [sx, 0.9801, sz0]],
          [44, 51, 63], { a: tb * al, fogK: 0.2 }));
      }
    }"""),
    # cube contact shadow + grounding (drawn in extras, before glows)
    ("""function drawLabExtras(ctx, cam, T, opts = {}) {
  // overhead spot pool + cone (screen space, motivated practical)""",
     """function drawLabExtras(ctx, cam, T, opts = {}) {
  // cube contact shadow on the tabletop (grounding)
  if ((opts.spot ?? 1) > 0.05) {
    const cb = projectPoint([CUBE[0], 0.981, CUBE[2]], cam, W, H);
    const ce = projectPoint([CUBE[0] + 0.05, 0.981, CUBE[2]], cam, W, H);
    if (cb && ce) {
      const rr = Math.max(8, Math.abs(ce[0] - cb[0]) * 1.9);
      ctx.save();
      ctx.globalAlpha = 0.5 * Math.min(1, opts.spot);
      ctx.fillStyle = 'rgba(3,4,6,1)';
      ctx.beginPath();
      ctx.ellipse(cb[0], cb[1] + rr * 0.10, rr * 1.05, rr * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // overhead spot pool + cone (screen space, motivated practical)"""),
    # probe glass reflection on the monitor (event probe_reflect 87.6)
    ("""// feed-side exports (monitor's own viewpoint)""",
     """// monitor glass reflection of the probe (event probe_reflect)
export function drawProbeReflection(ctx, cam, T) {
  const u = clamp01((T - ev('probe_reflect')) / 0.8);
  if (u <= 0) return;
  const fade = T < 90.45 ? 0.95 : 0.35;
  const sp = MON.p.map((p) => projectPoint(p, cam, W, H));
  if (!sp.every(Boolean)) return;
  const cx = (sp[0][0] + sp[1][0] + sp[2][0] + sp[3][0]) / 4 + Math.sin(T * 0.9) * 6;
  const cy = (sp[0][1] + sp[1][1] + sp[2][1] + sp[3][1]) / 4;
  const hh = Math.hypot(sp[1][0] - sp[0][0], sp[1][1] - sp[0][1]);
  const r = hh * 0.30;
  ctx.save();
  ctx.globalAlpha = fade * u;
  ctx.fillStyle = 'rgba(4,5,8,0.92)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(112,214,247,${0.55 * u})`;
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,180,215,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  glow(ctx, cx, cy, r * 2.2, PAL.cyan, 0.22 * u * fade);
}

// feed-side exports (monitor's own viewpoint)"""),
    # ring_clear: sharper ring pulse
    ("""  const PP = [-0.08, 1.56, 3.30];
  drawProbe(ctx, cam, PP, T, { alpha: a, face: 1 - 0.85 * ease(turnU) });""",
     """  const PP = [-0.08, 1.56, 3.30];
  const sharp = prog(T, 'ring_clear', 0.7);
  drawProbe(ctx, cam, PP, T, { alpha: a, face: 1 - 0.85 * ease(turnU), sharp });"""),
    # drawProbe: accept sharp
    ("""  ctx.strokeStyle = css(PAL.cyan, 0.95);
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.stroke();""",
     """  ctx.strokeStyle = css(PAL.cyan, 0.95);
  ctx.lineWidth = Math.max(2, r * 0.13) * (1 + 0.6 * (opts.sharp ?? 0));
  ctx.stroke();"""),
    ("  glow(ctx, p[0], p[1] + bob, r * 2.1, PAL.cyan, 0.30 * (opts.alpha ?? 1) * (0.4 + 0.6 * face));",
     "  glow(ctx, p[0], p[1] + bob, r * 2.1, PAL.cyan, 0.30 * (opts.alpha ?? 1) * (0.4 + 0.6 * face) * (1 + 0.7 * (opts.sharp ?? 0)));"),
])

sub('src/film.js', [
    ("""    if ((sec.id === 'lab' || sec.id === 'paradox') && cam) {
      drawFeed(t);
      S.drawMonitorFeed(ctx, cam, feedCanvas, t, { alpha: 1 });
    }""",
     """    if ((sec.id === 'lab' || sec.id === 'paradox') && cam) {
      drawFeed(t);
      S.drawMonitorFeed(ctx, cam, feedCanvas, t, { alpha: 1 });
      if (sec.id === 'lab' || sec.id === 'paradox') S.drawProbeReflection(ctx, cam, t);
    }"""),
])
print('ALL OK')
