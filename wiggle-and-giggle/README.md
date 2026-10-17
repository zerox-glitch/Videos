# Wiggle & Giggle — “The Morning Wiggle”

A 75-second toddler song episode in the spirit of Cocomelon: a warm pastel playroom
at sunrise, a chunky little kid called **Milo**, and a cream puppy called **Pip**
who sleeps through the first half of the song.

Everything is generated in code — vector frames drawn with Skia, the score
synthesised with NumPy, the vocal takes rendered with TTS and pitched up into a
chipmunk-kid register. No footage, no samples, no stock artwork.

- **Watch:** [`renders/final/Wiggle and Giggle - The Morning Wiggle.mp4`](renders/final/Wiggle%20and%20Giggle%20-%20The%20Morning%20Wiggle.mp4)
- **Quick look:** [`renders/qa/contact.jpg`](renders/qa/contact.jpg) — one frame every 2.5 s

| | |
|---|---|
| Duration | 75.00 s |
| Picture | 1920×1080, 30 fps, H.264 High, yuv420p |
| Sound | AAC-LC 48 kHz stereo, **−14.0 LUFS**, −3.6 dBTP |
| Size | 24.5 MB |
| Tempo / key | 120 BPM (bar = 2 s), C major |

## The episode

| Time | Section | What happens |
|---|---|---|
| 0–9 s | Intro | Dawn creeps across the playroom; Milo is asleep on the rug, title card blooms. |
| 9–21 s | Verse 1 | Milo rolls up, stretches, points at the sun, greets the room. |
| 21–33 s | Chorus 1 | The wiggle dance: toes, clap, nose, little dance, la-la-la. |
| 33–42 s | Verse 2 | Milo wakes Pip; Pip hops and wags. |
| 42–54 s | Chorus 2 | Full-energy repeat, both characters dancing. |
| 54–66 s | Bridge | Jump, reach, spin, touch the ground, hooray + confetti. |
| 66–75 s | Outro | “The End — Sing it again!”, fade. |

Lyrics are original, timed to the beat, and appear as a large white pill caption
with a karaoke-style warm-yellow fill that sweeps across each line as it is sung.

## Cast

- **Milo** — chunky toddler, brown curly top-knot, blue star-print shirt, rosy
  cheeks, big dot eyes; 905 px tall stage position, scale 1.12.
- **Pip** — cream puppy, floppy ears, wagging tail; asleep until 34.4 s.

## How it is built

```
src/lib/draw.js      easing + shape helpers (limb, cloud, star, note, heart)
src/data.js          canvas size, palette, cast, song structure, timed lyrics
src/room.js          the playroom (wall, bunting, arched window + sun, sofa, toys)
src/characters.js    drawMilo / drawPip — fully pose-driven rigs
src/film.js          master draw(ctx, t): acting beats, camera, captions, FX, grade
src/render.mjs       CLI: stills · contact sheet · MP4 (raw BGRA → ffmpeg)
scripts/music.py     75 s score: drums, bass, plucks, pads, bells, SFX
scripts/mix.py       vocal loading/pitch, reverb, ducking, master → assets/mix.wav
```

Frames are drawn deterministically as `f(t)`, streamed to ffmpeg as raw BGRA
through a pipe, and encoded in a single pass. The whole film is a pure function
of time, so any frame can be re-rendered exactly.

### Rebuild

```bash
npm install                                   # @napi-rs/canvas + fonts
python3 scripts/music.py                      # → assets/score.wav
FFMPEG=~/.local/bin/ffmpeg python3 scripts/mix.py   # → assets/mix.wav
node src/render.mjs --from 0 --to 75 --fps 30 --scale 1 \
  --out renders/final --name "Wiggle and Giggle - The Morning Wiggle" \
  --audio assets/mix.wav --crf 18 --preset slow
```

Stills and contact sheets:

```bash
node src/render.mjs --stills 12.5,36.5,60.3 --scale 0.5 --out renders/previews
ffmpeg -i "renders/final/Wiggle and Giggle - The Morning Wiggle.mp4" \
  -vf "fps=1/2.5,scale=384:-1,tile=6x5" -frames:v 1 renders/qa/contact.jpg
```

## Notes

- Fonts are OFL (Baloo 2, Fredoka, Nunito) and are vendored in `assets/fonts`
  because `@napi-rs/canvas` cannot load CFF/OTF variable fonts.
- The score and mix WAVs are regenerable and gitignored; the rendered MP4 is
  committed so the film can be watched without a toolchain.
- Original song, original characters. Nothing here is derived from Cocomelon
  content — only the visual grammar of the genre (flat bright vectors, giant
  round heads, karaoke captions).
