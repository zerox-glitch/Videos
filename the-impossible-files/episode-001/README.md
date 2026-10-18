# THE IMPOSSIBLE FILES — EP.001: THE CUBE WITH INFINITE SPACE INSIDE

Fully narrated vertical sci-fi short (fiction). Deterministic software-3D rendering — no GPU,
no browser. Built with the Motion Video Director skill (beats-locked → preview QA → final).

- **Format:** 1080×1920 9:16 · 30 fps · H.264 MP4 + AAC · 109.0 s · seamless visual loop
- **Final file:** `final/cube-infinite-space.mp4`
- **Narration:** exact incident-report script (voice: deep male baritone) — `assets/vo/s1..s8.mp3`
- **Subtitles:** `subtitles/cube-infinite-space.srt`
- **Audio:** procedural dark-ambient score (54 BPM, D minor) + 37 synthesized SFX cues,
  final mix ducked under VO → `assets/mix.wav` (≈ −14.3 LUFS / −1.8 dBTP through AAC)
- **Storyboard:** `plan/storyboard.md` · **Beats (timing source of truth):** `plan/beats.json`
- **QA:** `QA-REPORT.md` · contact sheets in `renders/qa/`

## Rebuild

```bash
pip install --user --break-system-packages numpy scipy pillow
npm install                      # @napi-rs/canvas
python3 scripts/make_beats.py    # → plan/beats.json
python3 scripts/sfx.py           # → audio/sfx/*.wav
python3 scripts/music.py         # → assets/score.wav
python3 scripts/mix.py           # → assets/mix.wav (encode-chain loudness loop)
python3 scripts/srt.py           # → subtitles/*.srt
node src/render.mjs --stills 5,16,33,50,70,85,97,106.5 --width 540   # smoke
node src/render.mjs --from 0 --to 109 --fps 30 --crf 20 --preset medium \
  --width 540 --audio assets/mix.wav --out renders/previews --name "Cube Infinite Space Preview" --segments 4
node src/render.mjs --from 0 --to 109 --fps 30 --crf 22 --preset slow \
  --width 1080 --audio assets/mix.wav --out renders/final --name "cube-infinite-space" --segments 8
```

Fonts: Chakra Petch (captions/HUD) + Share Tech Mono (measurement HUD), registered from
`assets/fonts/` by `src/render.mjs`. Cyan is reserved for technology / scanning / spatial
anomalies. Rendering is deterministic: every frame is a pure function of absolute time.
