# PROGRESS — ABC Song: Pixel Alphabet Party   (updated 2026-10-17)

Phase: DONE (final delivered)
Current version: final → `renders/final/ABC Song - Pixel Alphabet Party.mp4`

Done:
- Brief locked: pixelated visuals + object-per-letter (A apple … H hat, zebra…).
- `plan/beats.json` (authoritative cue sheet), 96 s / 120 BPM / six sections.
- Hand-authored 7×9 A–Z bitmap font, 26 × 16×16 sprites (sprite sheet QA'd).
- Renderer: 480×270 internal, neighbor ×4; karaoke pills; checkerboard pixel wipes;
  per-section camera pushes; intro block drop; interlude pairs; showcase pedestals;
  finale wall + confetti + fireworks + endcard.
- `scripts/music.py` → `assets/score.wav` (chiptune, per-event blips/dings).
- 10 TTS takes (voice-00), kid-pitched, start-only silence trim.
- `scripts/mix.py` → `assets/mix.wav`: ducked, reverb, iterative master.
- Preview-first QA: `renders/previews/… Preview v1/v2.mp4`, contact sheets,
  wipe/fade stills (31.8 / 63.7 / 95.0 / 95.8), MP4-extracted spot frames.
- Final render 1920×1080 / 30 fps / 2880 frames / H.264 crf18 + AAC.

QA (final MP4):
- 96.00 s, H.264 High yuv420p + AAC-LC 48 kHz stereo, 9.9 MB.
- **−14.0 LUFS**, sample peak **−2.0 dB** (WAV masters at −4.5 dBFS ceiling +
  14 kHz LP before AAC: saturated chiptune otherwise overshoots to 0.0 dB).

Open issues:
- No `ffprobe` in sandbox — stream checks via `ffmpeg -i`.
- One full-size human viewing pass before publishing.

Key files: plan/beats.json, src/{pixelfont,sprites,data,film,scene,render}.js|mjs,
src/lib/draw.js, scripts/{music,mix}.py, assets/mix.wav, TASTE.md.
