# TASTE — Stickman's Fine

Locked art direction for this film. Read before adding or changing a shot.

## 1. Brief & concept
- **What:** a 72-second, 16:9 (1920×1080, 30 fps) dark-ish stickman comedy for
  adults: five jokes about Mondays, coffee, meetings, self-deception and paying
  a rubber duck for advice.
- **Pipeline:** A · code-drawn (Canvas), every frame a pure function of time.
- **Tone:** dry, deadpan, cartoon-safe dark — no cruelty, no tragedy; mortality
  jokes stay whimsical (museum exhibits, fainting nurses), the punchlines are
  VO one-liners over designed visual gags.
- **Must not feel like:** stock vector clip-art, meme slideshows, sad-blob
  intertitles, or motion for motion's sake.

## 2. Theme & feel
- **Mood words:** risograph comic, hand-inked, sneaky jazz, Sunday-paper strip.
- **References:** Cyanide & Happiness beat structure, classic cartoon iris-outs,
  newspaper halftone print, adult-swim deadpan pacing.
- **Must not feel like:** neon, glossy 3D, generative-art particles, sakuga.

## 3. Design system
- **Ink:** variable-width tapered strokes, **line boil** re-jittered ~12×/s so
  every outline wobbles like hand-drawn cels. Stickman: head r≈46, stroke
  7–13, far limbs at 35 % alpha. Never smooth vector-perfect geometry.
- **Paper:** cream `#F6F0E4`-family wash per scene + fibre grain + 10-16 %
  vignette. Paper fills extend 460 px past the frame (camera-proof margins).
- **Spot colours per scene:** intro cream · joke1 night indigo `#333F8F`
  (chalk-cream strokes) · joke2 clinic mint · joke3 office slate `#E8EEF6`
  · joke4 dawn peach · joke5 therapy tan/rose · outro sunset orange→plum.
- **Screentones:** halftone dot floors/shadows (gap 8-11, r≈2.4) — the riso tell.
- **Type:** Bangers-Regular (titles, stamps, punch gags), PatrickHand-Regular
  (props, plaques, handwriting), PermanentMarker-Regular (calendar), Fredoka
  (screens/UI). Text only inside props/panels/stamps — never floating.
- **Devices:** iris wipes (0.25 s close/open) at every section boundary,
  3-frame white impact flash on every slam, snap-zooms event-tied to punchlines,
  speed lines and motion smears for fast actions. No shake, ever.

## 4. Motion
- Grammar: pops (back-eased), squash, rubber-limb stretches, fold-origami room
  (joke3), 1.75× deadpan snap-zoom (joke4), comic split-panels, gentle per-
  section push ≤1.06. Camera targets live in `film.js` CAM table only.

## 5. Audio
- Sneaky-jazz chiptune-adjacent score at 108 BPM: pizzicato + upright bass +
  brushes; **stab on every punchline**, rimshot after p2/p5, 35 designed SFX
  cued from `plan/beats.json` (alarm, clunk, shutter, quack, cricket, stamp…).
- Voice: raw adult voice-00 (no pitch shift), ducked music bed 42 %.
- Master: WAV −13.2 LUFS / −4.5 dBFS → 14 kHz LP → AAC 320k lands the MP4 at
  **≈ −14 LUFS with ≥1.5 dB headroom** (192k AAC spiked +2 dB on this material
  — 320k is mandatory).
