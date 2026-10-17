# TASTE — Lumi & the Lost Star

Locked art direction for this film. Read before adding or changing a shot.

## 1. Brief & concept
- **What:** a 72-second, 16:9 (1920×1080, 24 fps) wordless storybook cartoon for ages 3–7.
- **Story:** a tiny firefly finds a fallen star, lifts it with her friends, and sends it home.
  Theme: *small lights are stronger together.* No dialogue — captions carry the story.
- **Pipeline:** A · code-drawn (Canvas/Skia), every frame a pure function of time.
- **Tone:** warm, gentle, bedtime-friendly. Wonder over excitement; no peril, no jump scares.

## 2. Theme & feel
- **Mood words:** night meadow, picture book, fireflies, lullaby.
- **References:** classic 2D storybook animation (flat shapes, soft rim light), bedtime read-aloud pacing.
- **Must not feel like:** a tech demo, a flat vector icon set, a hyperactive YouTube short.

## 3. Design system
| Role | Value |
|---|---|
| Sky | `#040617` → `#0C1436` → `#1B3157` (top → horizon), dawn wash `#6A4A72` / `#C97B6B` |
| Hills | far `#141C42`, mid `#0D1434`, near `#070C22` at 86–92% opacity |
| Moon | `#FFF6DE` body, `#E8D9B4` shade, `#FFE9B0` glow |
| The star | `#FFC94A` / `#E09A22` at full glow, dims to `#8B7B58` when tired |
| Lumi | body `#FFD166` → `#F2A93B`, lantern `#C9F76F`, wings `#BFE9FF` @ 34% |
| Friends | `#C9F76F`, `#7FE7C4`, `#FFB3D9`, `#9FD0FF`, `#FFD166` |
| Text | cream `#FFF6E5` on a `rgba(4,6,23,0.62)` gradient scrim |
| Ink (faces) | `#3A2A44` |

- **Type:** Baloo 2 (display / captions, weight 800 and 600), Nunito 600/700 (body),
  Fredoka 600 (small labels). Captions 46 px centred, scrim from y≈820.
- **Layout:** 16:9. Heroes live between y≈250 and y≈870; captions never overlap them.
  Every camera is a pure transform — never move a character with a screen-space offset.
- **Light direction:** the moon is upper-right at (1490, 250). Every rim light, leaf crown and
  character highlight comes from that side.
- **Finish:** film grain 5%, vignette 0.40, 1.4 s fade in, 1.4 s fade out.

## 4. Motion language
- **Easing:** `outCubic` for arrivals, `smooth` for camera drifts, `outBack(1.4–2.2)` only for pop-ins.
- **Camera:** slow pushes (≤ 8% over a scene), lift scenes use a vertical track with parallax
  (stars 0.045, moon 0.35, hills/grass 1.0).
- **Character:** bob 3–8 px at 1.3–2.2 Hz; wings 22–34 rad/s; blinks every ~3.4 s; squash 5–18% on landings.
- **Transitions:** 0.7–1.4 s cross-dissolves on scene cuts — a bedtime film never hard-cuts.

## 5. Sound identity
- **Music:** 24 bars at 80 BPM (exactly 72 s), F major, I–vi–IV–V and I–IV–V–vi,
  music-box arpeggio + soft pad + upright bass. Climax bars 16–19, gentle ending from bar 20.
- **Cues:** 45 designed effects — flutter chirps, whooshes, impacts, sparkles, crickets, wind.
  Character "voices" are formant-shaped chirps (triangular lead + filtered breath), never speech.
- **Levels:** master −13.9 LUFS integrated, true peak −1.8 dBTP. Music ducks under the opening and ending.
- **Sync:** every cue lands within ±0.05 s of its picture event (measured).

## 6. Technical setup
- `node src/render.mjs …` → `@napi-rs/canvas` (Skia) → raw RGBA → `ffmpeg` libx264 crf 18.
- Timing lives in `src/timing.js`; `scripts/export-beats.mjs` writes `plan/beats.json`,
  which `scripts/sound.py` consumes for both music and effects.
- No network, no browser, no samples at build time. Deterministic.

## 7. Do / Don't
- **Do** keep Lumi's eyes above y=800 while a caption is on screen.
- **Do** light everything from the moon (upper-right).
- **Do** let silences breathe; the meadow opens with crickets only.
- **Don't** use pure black, pure white or saturated red.
- **Don't** add camera shake except on the two impacts (landing, burst).
- **Don't** put more than one caption on screen at a time.

## 8. Decision history
- 2026-10-17 · Chose a wordless film with captions (no TTS) so pacing stays under our control.
- 2026-10-17 · Moved captions out of the scene cameras into one screen-space pass (they were
  being scaled by each scene's zoom, which pushed them off-frame and under characters).
- 2026-10-17 · Act 2 re-staged: star raised to y≈700, Lumi to y≈560, lens softened to 1.5×.
- 2026-10-17 · Replaced the cloud-puff transition with an additive mist veil (puffs were hiding the cast).
- 2026-10-17 · Wind beds rebuilt as FFT-shaped band-limited noise; the earlier one-pole version leaked
  white noise across the whole spectrum.
