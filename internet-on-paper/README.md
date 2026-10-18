# The Internet on Paper

A 128-second informative tech short printed the only way it makes sense:
**cyberpunk on black construction paper.** Your message gets ripped into
packets, DNS answers in forty milliseconds, light races through undersea
cables, a data center stitches twelve shards back into one picture, TLS
shakes hands over AES-256, and the weakest link turns out to be you —
politely phished, gently ransomed, hashed and salted. Ends on
`STAY CURIOUS. STAY ENCRYPTED.` and a CRT power-down.

Every frame is drawn in code: engineering-grid paper with fibre flecks,
riso-style misregistered neon strokes (magenta/cyan ghosts under a hot core),
12 Hz line boil, halftone landmasses, terminals that type and scramble, and
glitch cuts built from slice displacement + true RGB channel split at every
section boundary. The score is a 104 BPM A-minor cinematic hybrid — pads,
sub, 16th saw plucks, risers into all seven cuts — with 64 designed SFX cued
from one beats file.

- **Watch:** [`renders/final/The Internet On Paper.mp4`](renders/final/The%20Internet%20On%20Paper.mp4)
- **Quick look:** [`renders/qa/final-contact.jpg`](renders/qa/final-contact.jpg) — one frame every 2 s

| | |
|---|---|
| Duration | 128.00 s (2:08) |
| Picture | 1920×1080, 30 fps, H.264 High, yuv420p, crf 22 |
| Sound | AAC-LC 44.1 kHz stereo (320k), **−14.3 LUFS**, −1.8 dB peak |
| Size | 72.9 MB |
| Tempo / key | 104 BPM, A minor |

## The run-time

| Time | Section | What happens |
|---|---|---|
| 0–8 s | Boot | Grid powers up; title scramble-resolves and stamps. |
| 8–26 s | Packets | A chat card rips into five sequenced strips; one gets lost, TCP re-asks, everything reassembles. |
| 26–44 s | DNS | A terminal types the query, slams the answer, caches it, stopwatch reads ≈40 ms. |
| 44–62 s | Fiber | Paper-halftone world map, subsea arcs, light pulses; `200,000 km/s`, `95%+`, `RTT ≈ 74 ms`. |
| 62–80 s | Cloud | Rack rows blink, one request fans out to twelve machines, sticky note: *the cloud = someone else's computer*. |
| 80–98 s | Locks | TLS handshake tickets, AES shreds plaintext into hex cells, `2^256` fact, padlock snaps. |
| 98–116 s | Threat | Hook grabs `hunter2`, ransom card shivers, one-way hash + salt rerolls, 2FA code, *update now*. |
| 116–128 s | Outro | Six recap cards, one last page-load gauge, end stamp, CRT collapse to a single dot. |

## Production

Frames come from `src/film.js` (camera, glitch compositor, scan wipes, post)
through `src/scenes.js` on a pure `draw(t)` path; cues live in
`plan/beats.json` (`python3 scripts/make_beats.py`). Score: `scripts/music.py`.
Mix: `scripts/mix.py` (loudness loop measures through the real AAC encode
chain — native AAC rings hard on this material).

```bash
node src/render.mjs --from 0 --to 128 --fps 30 --crf 22 --preset slow \
  --out renders/final --name "The Internet On Paper" --audio assets/mix.wav
```
