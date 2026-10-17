# ABC Song — Pixel Alphabet Party

A 96-second alphabet music video for toddlers, drawn entirely in code: chunky
**pixel letter cards** drop onto a candy shelf, a **wall of all 26 letters** sings
along with a karaoke pill, and every letter meets its object — *A is for Apple,
B is for Ball … H is for Hat* — before the whole alphabet waves off under
confetti and fireworks.

Pixel art is genuine: an internal **480×270** canvas, a hand-authored **7×9 bitmap
A–Z font**, **26 sixteen-by-sixteen sprites**, integer-snapped everything, then a
×4 neighbor upscale. The score is synthesised chiptune (square lead on the ABC
melody, blip on every letter pop) and the kid voice is TTS pitched up a notch.

- **Watch:** [`renders/final/ABC Song - Pixel Alphabet Party.mp4`](renders/final/ABC%20Song%20-%20Pixel%20Alphabet%20Party.mp4)
- **Quick look:** [`renders/qa/final-contact.jpg`](renders/qa/final-contact.jpg) — one frame every 2.5 s

| | |
|---|---|
| Duration | 96.00 s |
| Picture | 1920×1080, 30 fps, H.264 High, yuv420p |
| Sound | AAC-LC 48 kHz stereo, **−14.0 LUFS**, −2.0 dB peak |
| Size | 9.9 MB |
| Tempo / key | 120 BPM (bar = 2 s), C major |

## The episode

| Time | Section | What happens |
|---|---|---|
| 0–8 s | Intro | A, B, C blocks drop onto the shelf; title chip + hook VO. |
| 8–32 s | Song 1 | 4×7 wall builds card-by-card on the beat; karaoke pill sings. |
| 32–40.5 s | Interlude | Pixel wipe; eight letter+object pairs parade; "Let's meet some friends!" |
| 40.5–64 s | Showcase | One by one: *A is for Apple … H is for Hat*, big sprite + TTS callout. |
| 64–88 s | Song 2 | Reprise — every card now shows its letter **and** its object. |
| 88–96 s | Finale | Full wall waves, confetti + fireworks, "Great job! / Sing it again!", white fade. |

## Production

Everything is generated in code — frames from `src/film.js`, music from
`scripts/music.py`, mix from `scripts/mix.py`. Previews render at half scale
first (`renders/previews/`), QA sheets live in `renders/qa/`, and the cue sheet
is `plan/beats.json` (regenerate with `python3 scripts/make_beats.py`).

```bash
node src/render.mjs --from 0 --to 96 --fps 30 --up 4 \
  --out renders/final --name "ABC Song - Pixel Alphabet Party" \
  --audio assets/mix.wav --crf 18 --preset slow
```
