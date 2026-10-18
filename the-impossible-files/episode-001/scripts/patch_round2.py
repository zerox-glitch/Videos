#!/usr/bin/env python3
"""patch_round2.py — preview-safe UI scale, frontal key light, probe cam, figures."""
import sys

def sub(path, pairs):
    s = open(path).read()
    for old, new in pairs:
        if s.count(old) == 0:
            if s.count(new) > 0:
                print('already applied:', old[:50].replace(chr(10),' '))
                continue
            print(f'MISS in {path}: {old[:80]!r}'); sys.exit(1)
        s = s.replace(old, new)
    open(path, 'w').write(s)
    print('patched', path)

sub('src/lib/mini3d.js', [
    # key light: from behind-camera upper-left → front faces (facing viewer) get shaped
    ("const L_KEY = (() => { const v = [-0.32, 0.86, 0.40], m = Math.hypot(...v); return v.map((x) => x / m); })();",
     "const L_KEY = (() => { const v = [-0.25, 0.72, -0.65], m = Math.hypot(...v); return v.map((x) => x / m); })();"),
    ("const L_FILL = (() => { const v = [0.55, 0.20, -0.60], m = Math.hypot(...v); return v.map((x) => x / m); })();",
     "const L_FILL = (() => { const v = [0.65, 0.30, -0.55], m = Math.hypot(...v); return v.map((x) => x / m); })();"),
])

sub('src/scenes.js', [
    # hudText: scale type with canvas width (preview == final proportions)
    ("""function hudText(ctx, s, x, y, size, color, opts = {}) {
  ctx.save();
  ctx.font = `${opts.weight || ''} ${size}px ${opts.fam || F_MONO}`.trim();""",
     """function hudText(ctx, s, x, y, size, color, opts = {}) {
  ctx.save();
  const k = W / 1080;
  ctx.font = `${opts.weight || ''} ${Math.round(size * k)}px ${opts.fam || F_MONO}`.trim();"""),
    # brackets scale
    ("function brackets(ctx, x, y, w, h, color, a = 1, L = 26) {",
     "function brackets(ctx, x, y, w, h, color, a = 1, L) {\n  L = L ?? 26 * (W / 1080);"),
    # scan HUD block: scale rects/ticks
    ("""    hudText(ctx, 'SCAN 04 · TOMOGRAPHIC', lx, ly + 138, 20, 'rgba(140,175,200,0.6)', { fam: F_MONO, alpha: hudA });
    // progress ticks
    for (let i = 0; i < 14; i++) {
      const on = i / 14 < clamp01((T - ev('wire_on')) / 7.4);
      ctx.globalAlpha = hudA;
      ctx.fillStyle = on ? css(PAL.cyan, 0.9) : 'rgba(255,255,255,0.14)';
      ctx.fillRect(lx + i * 30, ly + 168, 22, 6);
      ctx.globalAlpha = 1;
    }""",
     """    hudText(ctx, 'SCAN 04 · TOMOGRAPHIC', lx, ly + 138, 20, 'rgba(140,175,200,0.6)', { fam: F_MONO, alpha: hudA });
    // progress ticks
    const kk = W / 1080;
    for (let i = 0; i < 14; i++) {
      const on = i / 14 < clamp01((T - ev('wire_on')) / 7.4);
      ctx.globalAlpha = hudA;
      ctx.fillStyle = on ? css(PAL.cyan, 0.9) : 'rgba(255,255,255,0.14)';
      ctx.fillRect(lx + i * 30 * kk, ly + 168, 22 * kk, 6 * kk);
      ctx.globalAlpha = 1;
    }"""),
    ("""      const wu = clamp01((T - ev('warning')) / 0.3);
      ctx.save();
      ctx.globalAlpha = hudA * blink * wu;
      ctx.strokeStyle = css(PAL.cyan, 0.95);
      ctx.lineWidth = 2;
      const wx = 64, wy = ly + 236, ww = 470, wh = 64;
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(8,16,22,0.8)';
      ctx.fillRect(wx, wy, ww, wh);
      hudText(ctx, 'SPATIAL DISCREPANCY', wx + 24, wy + 43, 30, css(PAL.cyan, 1), { fam: F_MONO });
      ctx.restore();
      glow(ctx, wx + ww / 2, wy + wh / 2, 260, PAL.cyan, 0.16);""",
     """      const wu = clamp01((T - ev('warning')) / 0.3);
      const kk2 = W / 1080;
      ctx.save();
      ctx.globalAlpha = hudA * blink * wu;
      ctx.strokeStyle = css(PAL.cyan, 0.95);
      ctx.lineWidth = Math.max(1, 2 * kk2);
      const wx = 64 * kk2, wy = ly + 236, ww = 470 * kk2, wh = 64 * kk2;
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(8,16,22,0.8)';
      ctx.fillRect(wx, wy, ww, wh);
      hudText(ctx, 'SPATIAL DISCREPANCY', wx + 24 * kk2, wy + 43 * kk2, 30, css(PAL.cyan, 1), { fam: F_MONO });
      ctx.restore();
      glow(ctx, wx + ww / 2, wy + wh / 2, 260 * kk2, PAL.cyan, 0.16);"""),
    # beam band scale
    ("    const by = lerp(yTop, yBot, easeOut(bu) * 0.96 + 0.02);",
     """    const by = lerp(yTop, yBot, easeOut(bu) * 0.96 + 0.02);
    const bkk = W / 1080;"""),
    ("    g.addColorStop(0, 'rgba(112,214,247,0)');\n    g.addColorStop(0.5, 'rgba(112,214,247,0.85)');\n    g.addColorStop(1, 'rgba(112,214,247,0)');\n    ctx.fillStyle = g;\n    ctx.fillRect(xL - 8, by - 26, (xR - xL) + 16, 52);\n    ctx.restore();\n    glow(ctx, (xL + xR) / 2, by, 90, PAL.cyan, 0.4);",
     "    g.addColorStop(0, 'rgba(112,214,247,0)');\n    g.addColorStop(0.5, 'rgba(112,214,247,0.85)');\n    g.addColorStop(1, 'rgba(112,214,247,0)');\n    ctx.fillStyle = g;\n    ctx.fillRect(xL - 8, by - 26 * bkk, (xR - xL) + 16, 52 * bkk);\n    ctx.restore();\n    glow(ctx, (xL + xR) / 2, by, 90 * bkk, PAL.cyan, 0.4);"),
    # lab extras glow radii scale
    ("      glow(ctx, p[0], p[1], 430, [40, 56, 78], 0.5 * opts.spot);",
     "      glow(ctx, p[0], p[1], 430 * (W / 1080), [40, 56, 78], 0.5 * opts.spot);"),
    ("      const w1 = 40, w2 = 330;", "      const w1 = 40 * (W / 1080), w2 = 330 * (W / 1080);"),
    ("      ctx.ellipse(p[0], p[1], 300, 90, 0, 0, TAU);",
     "      ctx.ellipse(p[0], p[1], 300 * (W / 1080), 90 * (W / 1080), 0, 0, TAU);"),
    ("      if (p) glow(ctx, p[0], p[1], 130, PAL.white, 0.30 * opts.stripGlow);",
     "      if (p) glow(ctx, p[0], p[1], 130 * (W / 1080), PAL.white, 0.30 * opts.stripGlow);"),
    # figure: close the neck gap
    ("  const shY = top + hpx * 0.24;          // shoulder line (neck visible above)",
     "  const shY = top + hpx * 0.185;         // shoulder line (close head gap)"),
    ("  ctx.lineTo(cx - w * 0.16, shY - hpx * 0.025);\n  ctx.lineTo(cx + w * 0.16, shY - hpx * 0.025);\n  ctx.lineTo(cx + w * 0.34, shY - hpx * 0.015);",
     "  ctx.lineTo(cx - w * 0.16, shY - hpx * 0.018);\n  ctx.lineTo(cx + w * 0.16, shY - hpx * 0.018);\n  ctx.lineTo(cx + w * 0.34, shY - hpx * 0.010);"),
    # probe uses the PARADOX camera (was projecting through itself)
    ("""export function scene_paradox_probe(ctx, sec, T) {
  // probe hovering behind the researchers
  const a = ease(clamp01((T - ev('probe_behind')) / 0.9));
  if (a <= 0) return;
  const turnU = clamp01((T - ev('probe_turn')) / 1.3);
  const PP = [-0.08, 1.56, 3.30];
  drawProbe(ctx, { x: PP[0], y: PP[1], z: PP[2], yaw: 0, pitch: 0, f: (2 * Math.atan(24 / (2 * 35))) },
    PP, T, { alpha: a, face: 1 - 0.85 * ease(turnU) });
}""",
     """export function scene_paradox_probe(ctx, sec, T, cam) {
  // probe hovering behind the researchers (must be projected through the scene camera)
  const a = ease(clamp01((T - ev('probe_behind')) / 0.9));
  if (a <= 0 || !cam) return;
  const turnU = clamp01((T - ev('probe_turn')) / 1.3);
  const PP = [-0.08, 1.56, 3.30];
  drawProbe(ctx, cam, PP, T, { alpha: a, face: 1 - 0.85 * ease(turnU) });
}"""),
    # hall strips: double-sided (left wall strip was backface-culled)
    ("""  out.push(quad([[-halfW - 1.9, 1.15, len], [-halfW - 1.9, 1.15, -6], [-halfW - 1.9, 1.02, -6], [-halfW - 1.9, 1.02, len]],
    PAL.white, { emis: 1, a: 1.0, fogK: 0.55 }));""",
     """  out.push(quad([[-halfW - 1.9, 1.15, len], [-halfW - 1.9, 1.15, -6], [-halfW - 1.9, 1.02, -6], [-halfW - 1.9, 1.02, len]],
    PAL.white, { emis: 1, a: 1.0, fogK: 0.55 }));
  out.push(quad([[-halfW - 1.9, 1.02, len], [-halfW - 1.9, 1.02, -6], [-halfW - 1.9, 1.15, -6], [-halfW - 1.9, 1.15, len]],
    PAL.white, { emis: 1, a: 1.0, fogK: 0.55 }));"""),
    # bright structural accents in dark halls
    ("out.push(...boxQuads(x, pillarH / 2, z, pillarW, pillarH, pillarW, CONCRETE, { fogK: 0.92 }));",
     "out.push(...boxQuads(x, pillarH / 2, z, pillarW, pillarH, pillarW, CONCRETE, { fogK: 0.92, stroke: [86, 102, 130], strokeA: 0.30 }));"),
    ("""          out.push(...boxQuads(x, bh / 2, z + r() * 5, bw, bh, bw * (0.7 + r() * 0.7),
            r() > 0.5 ? [26, 30, 38] : [21, 25, 32], { fogK: 0.95 }));""",
     """          out.push(...boxQuads(x, bh / 2, z + r() * 5, bw, bh, bw * (0.7 + r() * 0.7),
            r() > 0.5 ? [30, 35, 45] : [24, 29, 38], { fogK: 0.95, stroke: [96, 116, 150], strokeA: 0.28 }));"""),
    ("""      out.push(...boxQuads(cx, cy, z, s, s * (0.4 + r() * 1.6), s,
        [24, 28, 36], { fogK: 0.85 }));""",
     """      out.push(...boxQuads(cx, cy, z, s, s * (0.4 + r() * 1.6), s,
        [28, 33, 43], { fogK: 0.85, stroke: [96, 116, 150], strokeA: 0.30 }));"""),
    ("out.push(...boxQuads(0, fh, z, fw, th, th * 1.6, c, { fogK: 0.8 }));           // top",
     "out.push(...boxQuads(0, fh, z, fw, th, th * 1.6, c, { fogK: 0.8, stroke: [110, 132, 168], strokeA: 0.30 }));           // top"),
    ("out.push(...boxQuads(0, th / 2, z, fw, th, th * 1.6, c, { fogK: 0.8 }));       // bottom",
     "out.push(...boxQuads(0, th / 2, z, fw, th, th * 1.6, c, { fogK: 0.8, stroke: [110, 132, 168], strokeA: 0.30 }));       // bottom"),
    ("out.push(...boxQuads(-fw / 2, fh / 2, z, th, fh, th * 1.6, c, { fogK: 0.8 })); // L",
     "out.push(...boxQuads(-fw / 2, fh / 2, z, th, fh, th * 1.6, c, { fogK: 0.8, stroke: [110, 132, 168], strokeA: 0.30 })); // L"),
    ("out.push(...boxQuads(fw / 2, fh / 2, z, th, fh, th * 1.6, c, { fogK: 0.8 }));  // R",
     "out.push(...boxQuads(fw / 2, fh / 2, z, th, fh, th * 1.6, c, { fogK: 0.8, stroke: [110, 132, 168], strokeA: 0.30 }));  // R"),
])

sub('src/film.js', [
    # caption type scales with canvas
    ("""  const text = g.hi ? g.text.toUpperCase() : g.text;
  const size = g.hi ? CAP_FONT_HI : CAP_FONT_BASE;""",
     """  const text = g.hi ? g.text.toUpperCase() : g.text;
  const size = Math.round((g.hi ? CAP_FONT_HI : CAP_FONT_BASE) * (W / 1080));"""),
    ("    ctx.lineWidth = 9;", "    ctx.lineWidth = Math.max(4, Math.round(9 * (W / 1080)));"),
    # pass the scene camera into the probe draw
    ("        S.scene_paradox_probe(ctx, sec, t);", "        S.scene_paradox_probe(ctx, sec, t, cam);"),
])
print('ALL OK')
