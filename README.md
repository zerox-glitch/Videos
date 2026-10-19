# Chronolyte AI — Full-Screen HVAC Website Reel

A 22-second Instagram Reel showing a fictional HVAC website as a sequence of **full-screen, edge-to-edge pages**. V2 was redesigned after feedback: no phone/device mockup, no dark side surround, larger HVAC imagery, and a brighter frost/cobalt/coral/yellow palette.

## Deliverables

- `renders/final/HVAC Website Reel v2.mp4` — latest version, 1080×1920 (9:16), 30 fps, H.264/AAC, 22 seconds.
- `renders/final/HVAC Website Reel v1.mp4` — preserved previous version.
- V2 ending shows `www.chronolyteai.site` and `+1 (812) 690-6121` together.

## V2 route tour

1. Full-bleed HVAC homepage hook.
2. Home page with a visible vertical scroll, large photo hero and service cards.
3. Cobalt Services page with large service cards and a full-width thermostat photo.
4. How It Works page with an edge-to-edge photo hero and three large steps.
5. Booking page with visible service/date/time selection and a clearly labeled sample confirmation.
6. Chronolyte AI contact end card.

Northline HVAC is a fictional demo site. The page copy is drawn independently from the generated photos, so text stays sharp. No fake testimonials, ratings or business-performance claims are used.

## Project map

- `plan/beats.json` — active v2 timing and sound cues.
- `plan/storyboard.md`, `plan/script.md`, `plan/design.html` — current creative plan and style board.
- `src/scenes/reel-v2.js` — full-screen site pages and animation.
- `src/scenes/reel.js` — original v1 scene source; preserved for reference.
- `src/render.js` — deterministic Playwright/Chromium → FFmpeg renderer.
- `assets/ai/` — generated HVAC stills; `assets/fonts/` — Space Grotesk and DM Sans (used), plus licensed design specimens.
- `assets/sfx/reel-sfx-v2.wav` — original 48 kHz procedural UI SFX mix for v2.
- `manifest.json` — asset provenance and licensing notes.

## Re-render

Requires Node 22+ and Python 3.10+; rendering tools are project-local npm dependencies.

```bash
npm install
npm run audio
npm run render
```

Low-resolution full-length preview:

```bash
npm run preview
```

The renderer supports `--from`, `--to`, `--fps`, `--scale`, `--out`, `--name`, optional `--audio`, and `--jpg` for deterministic still-frame checks. Existing versioned exports are never overwritten.

## Sound

No voiceover or copyrighted/trending track is embedded. The render includes original procedural UI taps and page swipes; add a currently licensed Instagram track in-app if desired.
