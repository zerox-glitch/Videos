# TASTE — The Internet on Paper

Locked art direction for this film. Read before adding or changing a shot.

## 1. Brief & concept
- **What:** a 128-second, 16:9 (1920×1080, 30 fps) informative tech short —
  where your data actually goes — rendered as **cyberpunk printed on black
  construction paper**.
- **Pipeline:** A · code-drawn (Canvas), every frame a pure function of time.
- **Tone:** cinematic, deadpan-informative; glitch punctuation, never glitch
  soup. Facts live inside designed props (terminals, cards, gauges, stickies).
- **Must not feel like:** a slide deck, a stock neon loop, or a motion-graphics
  template.

## 2. Theme & feel
- **Mood words:** riso-printed terminal, engineering grid, neon misregistration,
  CRT shut-down, threat-log red.
- **References:** black-paper zines, oscilloscope HUDs, synthwave posters,
  packet-capture terminals, corporate risk decks torn up and re-taped.
- **Must not feel like:** smooth glassmorphism, glow-bloom wallpapers,
  Matrix rain, or crypto-shill hype.

## 3. Design system
- **Substrate:** black/graphite paper per scene (`#0B0E14` family) with fibre
  flecks, engineering grid (64 px minor / 256 px major), film grain, vignette,
  420 px camera-proof margins. Scanline texture over the whole frame.
- **Neon ink (riso rule):** every neon stroke = magenta ghost + cyan ghost at
  ±boil offset UNDER a full-width colour core (misregistration, not bloom).
  Palette: cyan `#2BE8E8`, magenta `#FF3D8C`, amber `#FFC24A`, gold `#FFD34E`,
  green `#45FFA1`, crimson `#FF4B3E`.
- **Type:** Michroma-Regular (display titles), Chakra Petch Bold/SemiBold
  (headings, chips), Chakra Petch Regular (body), ShareTechMono-Regular
  (terminals, data). **Never** use glyphs the faces lack: no `✓ → ▸ ↔` in
  mono, no `✓ ↔ ▸` in Chakra — draw checks, use ASCII (`->`, `<`, `>`).
  Facts and labels only inside cards/terminals/chips/stickies — no floating text.
- **Glitch grammar:** frame-level burst = horizontal slice displacement +
  true R/C channel split + static bars; 0.14–0.18 s, only at the 7 section
  cuts and 6 scripted picture events. Text scramble uses the same charset.
- **Transitions:** 1-frame white/cyan flash + glitch burst, then a 0.42 s
  top-down scan wipe with glowing edge. No slides, no dissolves.
- **Ending:** CRT collapse (vertical squeeze + brightness) → dot → fade.

## 4. Motion
- Grammar: back-eased pops, draw-on lines (tapered, 12 Hz boil), packets that
  travel purpose-built lanes, card shake (never camera shake), event-tied
  snap-zooms (≤0.07 scale bump), per-section camera pan/push ≤1.05 smooth.
- Forbidden: random shake, bloom (shadowBlur), particle rain, loops without
  cause, arbitrary zooms.

## 5. Audio
- Cinematic hybrid at 104 BPM A minor: detuned wide pads, sub + growl bass
  8ths, 16th saw plucks, kick/snare/hats (half-time in the threat section),
  noise risers into all 7 cuts, booms + brass stabs on picture impacts,
  64 designed SFX cued from `plan/beats.json`.
- Voice: raw adult voice-00, no pitch shift; music ducks to 42 % under VO.
- Master: mix loop measures through the REAL encode chain (native AAC rings
  +5 dB on this material): WAV ceiling −7.8 dBFS, knee 0.42, target decoded
  **−14.25 LUFS** → delivered **−14.3 LUFS / −1.8 dB**. Never trust WAV-only
  loudness; never drop the `lowpass=14000` + AAC 320k chain.
