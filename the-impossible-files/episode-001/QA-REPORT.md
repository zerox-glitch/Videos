# QA Report — THE IMPOSSIBLE FILES EP.001

**Deliverable:** `final/cube-infinite-space.mp4` · 1080×1920 · 30 fps · 109.02 s · H.264 (High) yuv420p · AAC-LC 320k 48 kHz · 29.97 MB

## Audio (measured through the delivered file)

| Metric | Target | Measured |
|---|---|---|
| Integrated loudness (EBU R128, decoded) | ~ −14 LUFS | **−14.2 LUFS** |
| True/decoded peak | ≲ −1.5 dBTP | **−4.23 dBFS** (headroom ✓) |
| VO placement | beats-locked | 8/8 takes inside windows (max slack 0.24 s) |
| Music gate (blackout 63.24–66.2) | stop / silence | segment RMS −19.1 dB (VO + tail only) ✓ |
| Void before the turn (99.5–100.6) | near-silence | segment RMS −28.2 dB ✓ |
| Ducking under VO | VO always clear | −0.42 bed factor, 70 ms attack / 300 ms release |

Loudness loop measured **through the real AAC encode chain** (native AAC rings +5–7 dB on this
material — WAV-only checks are meaningless). Converged in 2 iterations.

## Visual checks (preview 540×960 first, then final 1080×1920)

- **Seamless loop:** frame 0 vs frame 3269 mean|Δ| = **0.97/255** (residual = intended grain boil;
  luma means 31.0 vs 31.0). Opening pose and closing pose are mathematically identical
  (ang −0.17 rad, rad 1.12 m, y 1.010 m). No fade-in, no fade-out, no title/logo/end card.
- **Portal transitions (face-matched through darkness):** frame-exact strip around portal_3
  (n1417–1421): dark → dark → **single 1-frame flash (n1419, +35.9 luma)** → dark → next world.
  Exactly one flash frame at each of 47.30 / 52.60 / 57.40 / 61.60 — no multi-frame blowouts.
- **Blackout (63.24):** consecutive-frame Δ 0.04–0.09 — clean, no flicker.
- **Collapse (105.4):** consecutive-frame Δ 0.43–0.93 — smooth geometry morph, no pops.
- **Every scene inspected** at ≥5 sample frames (contact sheets `renders/qa/preview-sheet1/2.jpg`,
  `final-contact-sheet.jpg`, full-res `final-stills.jpg`): no clipping of captions/HUD, no black
  frames outside designed dark beats, no caption collisions (HUD block y≈30–46 %, captions y≈81 %),
  portal believability verified, monitor screen-within-screen readable, probe ring unmistakable.
- **Caption sync:** canvas = `plan/beats.json` = video verified at t=51.0 ("TEN TIMES LARGER.",
  window 48.65–51.17) and t=85.5 ("Then the researchers noticed", window 85.12–87.54) plus 34-tile
  sheet sweep. Captions are 2–6 word groups, off-white, selective ALL-CAPS highlights, vertical
  reveal only (no bounce/karaoke/emoji/font-change), Chakra Petch registered (no fallback glyphs —
  `→ ✓ ↑ ▸` avoided per glyph probe).
- **First frame:** cinematic cube macro — no title card, no logo, no fade-in ✓
- **Cyan discipline:** cyan appears only on scan/wire/tunnel/HUD/warning/probe-ring/monitor-UI ✓
  (amber reserved for shelf indicator + REC dot).
- **Fiction:** incident-report narration + all on-screen text present the story as fiction; no
  real-science claims.

## Retention structure

New detail every 3–6 s (measure line 2.55 · scan beam 11.6 · counter steps 14.6/15.6/16.5/17.6 ·
warning 18.1 · portals ×4 · blackout 63.24 · door light 65.2 · cube recognition 76.2 ·
monitor feed 84 · probe reflection 87.6 · researchers 91.3 · probe ring 96.4/98.2 ·
turn 100.6 · collapse 105.4 · loop match 107.55). Calm before the turn (99.5–100.6 ≈ −28 dB),
clear final paradox, loop ending.

## Fixes made during preview QA (logged)

1. Preview canvas mismatch (1080-coords on 540-canvas) → dynamic `setSize`.
2. `ev()` object-vs-number NaN across all scene events → time accessor.
3. Exposure: frontal key light + fog density cuts for 150 m halls + emissive edge strokes.
4. Table slab occluded the cube (camera below table-top height) → camera raised to 1.010–1.024 m.
5. Left hall strip backface-culled → double-sided; captions off-canvas at preview → relative baseline;
   UI type scaled by W/1080 (preview ≡ final); fonts loaded via `registerFromPath` (file presence
   required); probe projected through its own position → scene camera passed in; figure neck gap;
   probe-in-own-feed removed (camera can't see itself); monitor probe reflection + ring-sharp pulse
   restored as event-driven beats.

## Known deviations

- Takes s3 (×1.18) and s7 (×1.16) are tempo-corrected at mix time to fit the locked 109 s plan
  (natural-range pitch-preserving; wording untouched per instruction).
- s1 came back shorter than planned → breathing room before scene 2 (accepted, improves pacing).
- Audio peaks sit at −4.2 dBTP (under the −1.5 limit) — loudness −14.2 LUFS is the controlling spec.
