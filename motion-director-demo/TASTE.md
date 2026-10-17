# TASTE — Motion Video Director demo

Approved style reference for this project. Read before writing any new scene.

## 1. Brief & concept
- **What:** a 26-second, 9:16 (1080×1920) motion-graphics demo made with the
  [Motion Video Director](../../.claude/skills/motion-video-director/SKILL.md) skill.
- **Story:** the claim ("26 seconds, made in code") → the old way (no timeline,
  no keyframes) → determinism (a frame is math) → three crafts, one system →
  the pipeline → lockup.
- **Audience:** developers and motion designers evaluating the skill.
- **Pipeline:** A · code-drawn (everything drawn in Canvas; no footage, no stock).
- **Tone:** precise, technical, confident. Spec-sheet, not salesy.

## 2. Theme & feel
- **Mood words:** instrument, blueprint, render console, darkroom.
- **References:** motion-design case studies, render farm dashboards, type specimens.
- **Must not feel like:** a template, a slideshow, neon gaming content, an ad with stock B-roll.

## 3. Design system
| Role | Value |
|---|---|
| Dominant (60%) | ink `#0A0C0F` / ink-2 `#14181E` |
| Secondary (30%) | cream `#F2EEE4` (full light scenes) |
| Accent (10%) | lime `#C7FF3E` |
| Second accent | ember `#FF5A2A` (strikethroughs, "02" markers, keyword only) |
| Muted text | `#8B939E` |
| Rules | cream 14–16% on ink, ink 16–22% on cream |

- **Type:** Space Grotesk 700/500 (display, scale 112–300 px, tracking −6…+4),
  Inter 400/500/600 (body 22–42 px), JetBrains Mono (labels, HUD, numerals, tracking 2–6 px).
  Max two typefaces per scene + mono for instrumentation.
- **Layout:** 90 px side margins. Content lives between y≈300 and y≈1450.
  Safe zones respected: nothing meaningful above y=250 or below y=1500
  (top ≈ 220 px and bottom ≈ 420 px stay clear for platform UI).
- **Texture:** 1 px grid at 4% (ink) / 4% (cream), film grain 5.5%, vignette 0.28 dark / 0.10 light.
- **Instruments:** corner registration marks, frame counter (top-right, f/780),
  timecode, bottom rule + mono caption + page index.
- **Transitions:** circle wipe (cream into a light scene, lime into the end card)
  or five-panel shutter (into an ink scene), 0.34 s, `outExpo`.

## 4. Motion language
- **Easing:** `outExpo` entrances, `outCubic` moves, `outBack(1.4–2.0)` only for landings, no linear UI.
- **Signature devices:** word-by-word mask reveal (0.055–0.07 s stagger),
  per-character tracking collapse (26→0 px, 0.8 s), lime swipe under a headline,
  1 px flash border on card landing, progress bar that completes in the hook.
- **Durations:** entrances 0.45–0.7 s, exits 0.3 s, holds ≥ 0.6 s.
- **One idea per shot**, on-screen text ≤ 7 words per line.

## 5. Sound identity
- **Source:** 100% procedural (NumPy synthesis in `scripts/sound.py`), no samples, no music.
- **Palette:** impact (sub + click), tick (dry UI), thud (card landings),
  whoosh (transitions), riser (pre-cut), chime (renders complete), draw (line reveals),
  typewriter (command typing), shimmer (outro).
- **Levels:** effects peak ≈ −12 to −6 dBFS; master −14 LUFS integrated, true peak ≤ −2.1 dBTP.
- **Rule:** every meaningful animation has one deliberate cue; silence is allowed and documented.
  No sound on more than one event per frame.

## 6. Technical setup
- `node src/render.mjs …` → `@napi-rs/canvas` (Skia) → raw RGBA pipe → `ffmpeg` (libx264, crf 18, yuv420p).
- Fonts registered from `assets/fonts` at boot. No browser, no network at render time.
- Timing lives in `src/timing.js` → exported to `plan/beats.json`, which `scripts/sound.py` consumes.
- Deterministic: identical output bytes across runs (verified).

## 7. Do / Don't
- **Do** keep every scene inside the 90 px margin and the HUD free zone (top-right y 225–290).
- **Do** let mono labels carry the "instrument" feel — they are the texture of this piece.
- **Do** use lime for one thing at a time.
- **Don't** add a third display typeface, gradients on type, or drop shadows on text.
- **Don't** put red/ember on a lime background (contrast fails); ember belongs on cream.
- **Don't** animate anything with a clock, timer or previous-frame state.

## 8. Decision history
- 2026-10-17 · Palette fixed: ink / cream / lime + ember accent.
- 2026-10-17 · Switched the deterministic pipeline from headless Chromium to Skia
  (`@napi-rs/canvas`) inside the sandbox; same `drawFrame(t)` contract, no browser needed.
- 2026-10-17 · Added the bottom-instrument band (rule + caption + page index) to every scene.
- 2026-10-17 · End card gets a six-tile scene strip to hold the lower third.
