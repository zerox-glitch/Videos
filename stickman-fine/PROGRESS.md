# PROGRESS — Stickman's Fine   (updated 2026-10-18)

Phase: DONE (final delivered)
Current version: final → `renders/final/Stickmans Fine - A Stickman Comedy.mp4`

Done:
- Brief: adult dark-ish stickman comedy, five jokes + hook + outro, 72 s.
- `plan/beats.json`: 7 sections, 8 VO takes, 43 picture events, 35 SFX cues,
  6 iris boundaries. Regenerate: `python3 scripts/make_beats.py`.
- Visual system: `src/lib/ink.js` (tapered strokes + 12 Hz line boil, halftone,
  paper grain, impact flash, speed lines), `src/rig.js` (stickman pose library
  + faces + rubber-duck therapist), 7 scenes in `src/scenes.js`, camera/iris/
  fade timeline in `src/film.js`, deterministic renderer `src/render.mjs`.
- QA: 5 smoke-still rounds (cache/smoke1..4, cache/cmp) covering every scene,
  pose, transition; fixes: camera-proof paper margins, alpha inheritance,
  slap reach, nurse staging, desk hands, shake-arm direction, split-panel tick,
  duck reveal gate (pixel-probe verified), outro silhouette contrast.
- Audio: `scripts/music.py` (sneaky-jazz score + 35 SFX) → `assets/score.wav`;
  8 TTS takes (voice-00, unshifted) → `scripts/mix.py` → `assets/mix.wav`.
- Preview-first: `renders/previews/Stickmans Fine Preview v1.mp4` (960×540)
  inspected via contact sheet; MP4↔still frame probes at 36/58/66/70 aligned.

QA (final MP4):
- 72.00 s, 1920×1080 30 fps, H.264 High yuv420p + AAC-LC 48 kHz 320k, 36 MB.
- **−14.1 LUFS**, peak **−3.0 dB** (AAC 192k measured +1.98 dB on this
  transient material — 320k fixed it; do not regress to 192k).

Open issues:
- No ffprobe — stream checks via `ffmpeg -i`.
- One full-size human viewing pass before publishing.

Key files: plan/beats.json, src/{film,scenes,rig,render}.mjs/js, src/lib/ink.js,
scripts/{make_beats,music,mix}.py, TASTE.md.
