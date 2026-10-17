# LOG — Lumi & the Lost Star

- 2026-10-17 06:07 · Created project, instanced Baloo 2 / Nunito / Fredoka statics from Google Fonts (OFL).
- 06:09 · Story spine, palette, scene ranges (6 × 12 s) and the 24-bar music arrangement.
- 06:10 · Built the shared toolkit: easing, glows, sparkles, dust, caption scrim, film finish.
- 06:10 · Built the world (sky, 150 twinkling stars, craters + face on the moon, hills, grass, clouds)
  and the cast (Lumi with 6 expressions, the star with a bandage, 5 friends).
- 06:12 · First stills: found the star never drew — `fall.js` compared scene-local time to absolute
  beats. Fixed with a local-time offset; the fall now animates correctly.
- 06:13 · Art pass: storybook tree with leaf clusters, tapered rim-lit grass, foreground blades,
  friendlier two-tone clouds.
- 06:14 · Soundtrack v1: music box + foley. Spectrum review showed broadband hiss from the wind beds;
  rewrote wind as FFT-shaped band-limited noise and rebalanced beds, bass and bells.
- 06:15 · Contact-sheet review of all six acts. Issues found: wide framing in Act 2, caption over
  Lumi's face, puffy cloud transition covering the cast, small cast in the lift.
- 06:17 · Fixed: Act 2 staged higher with a softer lens, caption moved into a single screen-space
  pass (it had been inside each scene's camera transform), cloud puffs replaced by an additive veil.
- 06:20 · Render v1 (188 s). QA passed; two framing tweaks requested by the review.
- 06:22 · Final polish: bigger hero framing in the meadow, Act 2 raised, burst and release tweaks.
- 06:24 · Render v2 (188 s) and QA: −13.9 LUFS / TP −1.8 dBTP; 9 of 19 story beats measured
  as strong onsets, the rest are intentional soft cues (whoosh under music).
- 06:25 · Exported demo-preview.gif and poster.jpg; wrote README / TASTE / manifest.
