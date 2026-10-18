# Stickman's Fine — A Stickman Comedy

A 72-second adult comedy short about a stickman who is, and we cannot stress
this enough, **completely fine**. Five dark-but-cosy jokes — the Monday snooze
that ends in a museum exhibit, a blood type of espresso, the meeting that could
have been an email (that could have been a thought), a smartwatch that believes
its own lies, and an $80/hour rubber-duck therapist — plus a rooftop sign-off
that promises everything will repeat tomorrow.

Everything is drawn in code: **hand-inked variable-width strokes with a live
12 Hz line boil**, risograph-style halftone floors, paper-grain washes, iris
wipes, 3-frame impact flashes, and event-timed snap-zooms. The score is a
sneaky-jazz pizzicato bed (108 BPM) whose stabs and 35 designed SFX are cued
from one beats file, so every gag lands with its sound.

- **Watch:** [`renders/final/Stickmans Fine - A Stickman Comedy.mp4`](renders/final/Stickmans%20Fine%20-%20A%20Stickman%20Comedy.mp4)
- **Quick look:** [`renders/qa/final-contact.jpg`](renders/qa/final-contact.jpg) — one frame every 2 s

| | |
|---|---|
| Duration | 72.00 s |
| Picture | 1920×1080, 30 fps, H.264 High, yuv420p |
| Sound | AAC-LC 48 kHz stereo (320k), **−14.1 LUFS**, −3.0 dB peak |
| Size | 36 MB |
| Tempo / key | 108 BPM, A minor |

## The set-up

| Time | Beat | What happens |
|---|---|---|
| 0–6 s | Intro | Stickman waves beside his coffee; title stamps in. |
| 6–17.5 s | Joke 1 | Alarm says MONDAY; he snoozes through the years — wakes up an exhibit. |
| 17.5–29.5 s | Joke 2 | Clinic: one cup a day, he says — as the espresso IV drips. |
| 29.5–42.5 s | Joke 3 | "Quick 5 min meeting" — the room literally folds into an envelope. |
| 42.5–55.5 s | Joke 4 | Bed-marathon on the smartwatch, then the app vs reality split panel. |
| 55.5–66.5 s | Joke 5 | The duck takes notes; the notepad says $80/hr. |
| 66.5–72 s | Outro | Rooftop sip, one last alarm twitch, "EVERYTHING'S FINE." |

## Production

Frames come from `src/film.js` (timeline, camera, iris) through `src/scenes.js`
on a pure `draw(t)` path; audio cues live in `plan/beats.json`
(`python3 scripts/make_beats.py`). Score: `scripts/music.py`. Mix: `scripts/mix.py`.

```bash
node src/render.mjs --from 0 --to 72 --fps 30 --crf 18 --preset slow \
  --out renders/final --name "Stickmans Fine - A Stickman Comedy" \
  --audio assets/mix.wav
```
