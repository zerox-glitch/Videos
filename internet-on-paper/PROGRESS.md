# PROGRESS — The Internet on Paper   (updated 2026-10-18)

Phase: DONE (final delivered)
Current version: final → `renders/final/The Internet On Paper.mp4`

Done:
- Brief: paper-style informative tech video, cyberpunk-on-paper, ≥2 min,
  glitch/scramble effects, cinematic music → 128 s "The Internet on Paper".
- `plan/beats.json`: 8 sections, 52 picture events, 64 SFX cues, 8 VO takes,
  7 glitch cuts, 6 flash frames. Regen: `python3 scripts/make_beats.py`.
- Visual system: `src/lib/ink.js` (black paper + grid + fibres, riso-neon
  misregistered strokes, halftone, HUD chrome, scramble text, noise bars,
  glyph-safe type helpers), scenes in `src/scenes.js` (intro, packets, dns,
  speed, datacenter, crypto, threat, outro), camera/glitch compositor/post in
  `src/film.js`, deterministic renderer `src/render.mjs`.
- QA: 3 smoke-still rounds (32 stills + 3 contact sheets) → patches: neon
  ghost/core balance, mono glyph boxes (`→ ✓ ▸ ↔`), DNS label overlap,
  strip header/tick collision, hook-note gap, map contrast + labels + legend,
  threat specimen tag. Preview contact sheet + MP4 glitch-frame probes pass.
- Audio: `scripts/music.py` (cinematic score + 64 SFX) → `assets/score.wav`
  (128 s, −14.8 LUFS); 8 TTS takes (voice-00) → `scripts/mix.py` with
  encode-chain loudness loop → `assets/mix.wav`.
- Preview-first: `renders/previews/Internet On Paper Preview v1.mp4` remuxed
  with final mix (**−14.3 LUFS / −1.80 dB decoded** ✓), full contact inspected.

QA (final MP4):
- 128.00 s (2:08), 1920×1080 30 fps, H.264 High yuv420p (crf22 slow) +
  AAC-LC 44.1 kHz 320k, 72.9 MB.
- **−14.3 LUFS**, decoded peak **−1.80 dB** (spec −14 ±0.3, peak ≤ −1.5).
- Native AAC rings +5 dB on this transient material → mix loop measures
  THROUGH the encode chain (WAV CEIL −7.8, knee 0.42). Do not regress to
  WAV-only loudness checks.

Open issues:
- One full-size human viewing pass before publishing.
- No ffprobe — stream checks via `ffmpeg -i`.

Key files: plan/beats.json, src/{film,scenes,render}.{js,mjs}, src/lib/ink.js,
scripts/{make_beats,music,mix}.py, TASTE.md.
