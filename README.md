# Chronolyte AI — HVAC Website Reel

A 22-second Instagram Reel promo for Chronolyte AI's web-design services, created as a high-energy mobile HVAC website tour. The fictional demo brand is **Northline HVAC**; the real CTA at the ending is `www.chronolyteai.site` and `+1 (812) 690-6121`.

## Deliverable

- `renders/final/HVAC Website Reel v1.mp4` — 1080×1920 (9:16), 30 fps, H.264/AAC, 22 seconds.
- The v1 mix has original procedural UI/transition SFX, with no voiceover or background music. Add a currently licensed Instagram track in-app if you want music.

## Project map

- `plan/beats.json` — single source of truth for timing and sound cues.
- `plan/storyboard.md`, `plan/script.md`, `plan/design.html` — story, on-screen copy and visual system.
- `src/scenes/reel.js` — deterministic Canvas/WebGL animation and HVAC website UI.
- `src/render.js` — range renderer: Playwright/Chromium → FFmpeg.
- `assets/ai/` — two generated HVAC photos; all UI text is separately rendered.
- `assets/fonts/` — Space Grotesk + DM Sans (used) and Manrope + Outfit (design specimens), with OFL licenses.
- `assets/sfx/reel-sfx.wav` — original 48 kHz procedural SFX mix, generated from the cue data.
- `manifest.json` — asset provenance/licensing notes.

## Re-render

Node 22+ is recommended. Render tools are declared as project-local npm dependencies.

```bash
npm install
python3 scripts/generate_sfx.py
npm run render
```

Low-resolution full-length preview:

```bash
node src/render.js --from 0 --to 22 --fps 8 --scale 0.35 \
  --out renders/previews --name "HVAC Website Reel Preview v1" \
  --audio assets/sfx/reel-sfx.wav
```

The renderer accepts `--from`, `--to`, `--fps`, `--scale`, `--out`, optional `--audio`, `--name`, and `--jpg` for deterministic frame checks. Existing named exports are never overwritten.

## Creative / accuracy notes

- The opening hook is `HVAC OWNERS — YOUR NEXT CUSTOMER IS SCROLLING.`
- The website visibly opens and scrolls through Home, Services and Booking routes.
- Northline HVAC is a fictional demo site. No claims, testimonials, ratings, guarantees or results are invented.
- The phone number is spaced for readability but retains the supplied digits exactly.
