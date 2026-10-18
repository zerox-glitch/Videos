#!/usr/bin/env python3
"""patch_round1.py — exposure, cube legibility, captions, probe, figures."""
import re, sys

def sub(path, pairs):
    s = open(path).read()
    for old, new, *rest in pairs:
        cnt = s.count(old)
        if cnt == 0:
            print(f'MISS in {path}: {old[:70]!r}'); sys.exit(1)
        s = s.replace(old, new)
    open(path, 'w').write(s)
    print('patched', path)

# ── mini3d: exposure up
sub('src/lib/mini3d.js', [
    ("const AMB = 0.20;", "const AMB = 0.24;"),
    ("const k = AMB + d1 * 0.62 + d2 * 0.16 + d3 * 0.10;",
     "const k = AMB + d1 * 0.68 + d2 * 0.18 + d3 * 0.12;"),
])

sub('src/scenes.js', [
    # brighter brutalist palette
    ("const STEEL = [70, 82, 98];", "const STEEL = [84, 96, 114];"),
    ("const CONCRETE = [30, 34, 43];", "const CONCRETE = [40, 46, 58];"),
    ("const CONCRETE_D = [20, 24, 31];", "const CONCRETE_D = [28, 33, 43];"),
    ("const FLOOR_C = [16, 19, 25];", "const FLOOR_C = [20, 24, 31];"),
    ("grad: [[10, 12, 16], [26, 30, 38]]", "grad: [[13, 15, 20], [34, 39, 50]]"),
    ("grad: [[24, 28, 36], [13, 15, 20]]", "grad: [[34, 39, 50], [16, 18, 24]]"),
    ("grad: [[88, 100, 118], [46, 54, 66]]", "grad: [[104, 118, 140], [54, 63, 78]]"),
    # THE CUBE: legible near-black (spec: absorbs light, faint room reflection)
    ("""    for (const q of boxQuads(CUBE[0], CUBE[1], CUBE[2], 0.10, 0.10, 0.10, [6, 7, 9], { a: cb })) {
      q.stroke = [233, 242, 255];
      q.strokeA = 0.12;
      q.fogK = 0.2;
      add(q);
    }""",
     """    for (const q of boxQuads(CUBE[0], CUBE[1], CUBE[2], 0.10, 0.10, 0.10, [9, 11, 14], { a: cb })) {
      q.stroke = [233, 242, 255];
      q.strokeA = 0.5;
      q.fogK = 0.2;
      add(q);
    }
    // faint vertical room-reflection on the front face (per spec: near-black but not featureless)
    if (cb > 0.6) {
      add(quad([[CUBE[0] - 0.05, CUBE[1] + 0.05, CUBE[2] - 0.051],
                [CUBE[0] + 0.05, CUBE[1] + 0.05, CUBE[2] - 0.051],
                [CUBE[0] + 0.05, CUBE[1] - 0.05, CUBE[2] - 0.051],
                [CUBE[0] - 0.05, CUBE[1] - 0.05, CUBE[2] - 0.051]],
        [10, 13, 17], { a: cb * 0.9, emis: 1, grad: [[16, 20, 27], [5, 6, 8]], fogK: 0.2 }));
    }"""),
    # hall far cube: legible edges
    ("""  for (const q of boxQuads(0, 1.4 + cs / 2, cubeZ, cs, cs, cs, [6, 7, 9], { fogK: 0.5 })) {
    q.stroke = [233, 242, 255];
    out.push(q);
  }""",
     """  for (const q of boxQuads(0, 1.4 + cs / 2, cubeZ, cs, cs, cs, [8, 9, 12], { fogK: 0.5 })) {
    q.stroke = [233, 242, 255];
    q.strokeA = 0.8;
    out.push(q);
  }"""),
    # hall floor brighter
    ("[13, 15, 20], { grad: [[8, 10, 14], [22, 26, 33]], fogK: 0.7 }",
     "[15, 18, 24], { grad: [[11, 13, 17], [30, 35, 45]], fogK: 0.7 }"),
    # strips full strength
    ("PAL.white, { emis: 1, a: 0.7, fogK: 0.55 }", "PAL.white, { emis: 1, a: 1.0, fogK: 0.55 }"),
    # chamber: fog cut for 150 m readability
    ("renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.028 });",
     "renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.0095 });"),
    # chamber wall-strip glow positions (halfW=7 → walls at ±9)
    ("for (const sx of [-8.9, 8.9]) {", "for (const sx of [-(7 + 1.9), 7 + 1.9]) {"),
    # recursion: fog cut + per-seg glow x
    ("renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.020 + 0.004 * SEGS.indexOf(seg) });",
     "renderScene(ctx, q, cam, W, H, { fogColor: PAL.black, fogDensity: 0.0075 + 0.001 * SEGS.indexOf(seg) });"),
    # measure label overflow: clamp inside frame
    ("""      if (mu > 0.5) {
        hudText(ctx, '10 CM', p2[0] + 18, p2[1] - 16, 40, css(PAL.white, 0.98), { fam: F_SEMI });
        hudText(ctx, 'EDGE REFERENCE', p2[0] + 18, p2[1] + 14, 17, 'rgba(200,215,235,0.65)', { fam: F_MONO });
      }""",
     """      if (mu > 0.5) {
        const flip = p2[0] > W - 230;
        const lx = flip ? p2[0] - 18 : p2[0] + 18;
        const al = flip ? 'right' : 'left';
        hudText(ctx, '10 CM', lx, p2[1] - 16, 40, css(PAL.white, 0.98), { fam: F_SEMI, align: al });
        hudText(ctx, 'EDGE REFERENCE', lx, p2[1] + 14, 17, 'rgba(200,215,235,0.65)', { fam: F_MONO, align: al });
      }"""),
    # probe: reposition into frame (camera aims left toward monitor)
    ("function scene_paradox_probe(ctx, sec, T) {", "function scene_paradox_probe(ctx, sec, T) {"),
    ("""  drawProbe(ctx, { x: 0.62, y: 1.52, z: 3.30, yaw: 0, pitch: 0, f: (2 * Math.atan(24 / (2 * 35))) },
    [0.62, 1.52, 3.30], T, { alpha: a, face: 1 - 0.85 * ease(turnU) });""",
     """  const PP = [-0.08, 1.56, 3.30];
  drawProbe(ctx, { x: PP[0], y: PP[1], z: PP[2], yaw: 0, pitch: 0, f: (2 * Math.atan(24 / (2 * 35))) },
    PP, T, { alpha: a, face: 1 - 0.85 * ease(turnU) });"""),
    # figure silhouette: distinct head + slimmer shoulders
    ("""  const w = hpx * 0.30 * sx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(4,5,7,0.97)';
  // torso + head path
  ctx.beginPath();
  const cx = px;
  const headR = hpx * 0.062;
  const headY = top + headR;
  // shoulders → body → legs
  ctx.moveTo(cx - w / 2, bot);
  ctx.lineTo(cx - w / 2, top + hpx * 0.30);
  ctx.quadraticCurveTo(cx - w / 2, top + hpx * 0.16, cx - headR * 1.6, top + hpx * 0.14);
  ctx.lineTo(cx - headR * 1.1, top + hpx * 0.10);
  ctx.arc(cx + Math.sin(turn * 1.35) * headR * 0.5, headY, headR, Math.PI, 0);
  ctx.lineTo(cx + headR * 1.1, top + hpx * 0.10);
  ctx.quadraticCurveTo(cx + w / 2, top + hpx * 0.16, cx + w / 2, top + hpx * 0.30);
  ctx.lineTo(cx + w / 2, bot);
  ctx.closePath();
  ctx.fill();""",
     """  const w = hpx * 0.24 * sx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(4,5,7,0.97)';
  const cx = px;
  const headR = hpx * 0.058;
  const headY = top + headR;
  const shY = top + hpx * 0.24;          // shoulder line (neck visible above)
  // head
  ctx.beginPath();
  ctx.arc(cx + Math.sin(turn * 1.35) * headR * 0.5, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  // torso + legs
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, bot);
  ctx.lineTo(cx - w / 2, shY + hpx * 0.04);
  ctx.quadraticCurveTo(cx - w / 2, shY, cx - w * 0.34, shY - hpx * 0.015);
  ctx.lineTo(cx - w * 0.16, shY - hpx * 0.025);
  ctx.lineTo(cx + w * 0.16, shY - hpx * 0.025);
  ctx.lineTo(cx + w * 0.34, shY - hpx * 0.015);
  ctx.quadraticCurveTo(cx + w / 2, shY, cx + w / 2, shY + hpx * 0.04);
  ctx.lineTo(cx + w / 2, bot);
  ctx.closePath();
  ctx.fill();"""),
    # scene_paradox_probe position used in film feed → update export anchor too
    ("export const SCENES = {", "export const PROBE_POS = [-0.08, 1.56, 3.30];\n\nexport const SCENES = {"),
])

sub('src/film.js', [
    # caption baseline relative to canvas height
    ("const CAP_BASELINE_AREA = 1560;   // block centre (safe zone above bottom UI)",
     "let CAP_BASELINE_AREA = 1560;     // block centre; scaled to H in createFilm"),
    ("  W = canvas.width; H = canvas.height;\n  S.setSize(W, H);",
     "  W = canvas.width; H = canvas.height;\n  CAP_BASELINE_AREA = H * 0.8125;   // 1560/1920 safe zone\n  S.setSize(W, H);"),
    # grain a touch calmer
    ("    ctx.globalAlpha = 0.55;\n    ctx.fillStyle = pat;", "    ctx.globalAlpha = 0.42;\n    ctx.fillStyle = pat;"),
    # feed: camera cannot see itself — drop probe-in-feed block
    ("""      const pa = M.ease(clamp01((t - ev('probe_behind').t) / 0.9));
      if (t > ev('probe_behind').t) {
        // probe edge sometimes clips into its own feed (authentic POV)
        const pr = M.projectPoint([0.62, 1.52, 3.30], cam, fw, fh);
        if (pr && t < ev('probe_turn').t + 1.0) {
          fctx.save();
          fctx.globalAlpha = pa * 0.9;
          fctx.fillStyle = '#06080B';
          fctx.beginPath();
          fctx.arc(pr[0], pr[1], 40, 0, Math.PI * 2);
          fctx.fill();
          fctx.strokeStyle = M.css(M.PAL.cyan, 0.9);
          fctx.lineWidth = 6;
          fctx.beginPath();
          fctx.arc(pr[0], pr[1], 18, 0, Math.PI * 2);
          fctx.stroke();
          fctx.restore();
        }
      }""",
     "      // (the probe never appears in its own feed — it IS the camera)"),
])
print('ALL OK')
