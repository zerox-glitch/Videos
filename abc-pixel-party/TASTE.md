# TASTE — ABC Song: Pixel Alphabet Party

Locked art direction for this film. Read before adding or changing a shot.

## 1. Brief & concept
- **What:** a 96-second, 16:9 (1920×1080, 30 fps) alphabet music video for ages 2–5
  — "A is for Apple, B is for Ball" over an ABC song reprise.
- **Requirement from brief:** *pixelated visuals* with *objects drawn alongside the
  alphabets* — every letter visibly pairs with a picture.
- **Pipeline:** B · code-drawn (Canvas), every frame a pure function of time.
- **Tone:** candy-arcade playground — bright, chunky, joyful, and legible for toddlers.
  High energy, but never frantic.

## 2. Theme & feel
- **Mood words:** pixel party, sticker book, candy arcade, confetti, song-along.
- **References:** 16-bit kids' edutainment UI, gummy-candy packaging, arcade menus.
- **Must not feel like:** flat slideshow transitions, generic slideshows, screensaver
  particles, shaky cam, bloom haze, or a font demo.

## 3. Design system
- **Pixel rule (absolute):** internal canvas **480×270**, everything integer-snapped,
  final image upscaled ×4 with **neighbor** interpolation. No anti-aliased vector
  letterforms — letters are the hand-authored **7×9 bitmap glyph** font; objects are
  **16×16 char-grid sprites**. Smooth anything = wrong.
- **Letter cards:** 40×40 rounded pixel boxes, candy fills with a **dark navy outline**
  (#1A1230 family) and a 2 px light top band — the outline is the anti-NEON device.
- **Palette roles:** candy reds/corals, mints, sky blues, purples, sun-yellows, pinks;
  every section re-skins the *background* scheme (sky-blue intro → candy-pink song →
  sunset interlude → lavender showcase → mint song2 → sunset finale) while cards stay
  candy.
- **Type:** Baloo 2 (ExtraBold/Bold) for chips, captions, karaoke pills only — always
  inside a stroked pill/panel, never floating loose mid-film.
- **Karaoke:** pill at y=228, h=24 — past `#FFB020`, now `#FF8A3D`, future `#6B688A`.

## 4. Motion
- **Grammar:** everything *pops* (back-eased scale + ring/burst), settles with squash,
  exits with shrink. Blocks *drop* with dust. Camera **pushes ≤1.05 continuously** per
  section — no jumps, no shake.
- **Transitions:** 0.42 s checkerboard **pixel wipes** finishing exactly on section
  boundaries (32 / 40.5 / 64 / 88). Only cross-section move allowed.
- **Density:** every section carries ≥3 live layers (background drift, subject, UI).

## 5. Audio
- 120 BPM chiptune: square lead (ABC/Twinkle melody), pulse bass, noise drums; a blip
  fires **on every letter pop**, a ding **on every showcase item** — per-event sync.
- Kid-pitched TTS (pitch ×1.18) for hook + 8 callouts + cheer; ducked music bed.
- Master: **−14 LUFS, peak ≤ −1.5 dB** (AAC output re-measured; LP 14 kHz before
  encode because saturated chiptune overshoots the codec otherwise).
