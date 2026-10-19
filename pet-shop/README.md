# GOOD PET CLUB — fictional pet-shop Website Reel

A separate 22-second Instagram Reel demonstrating a bright, animated pet-shop storefront. GOOD PET CLUB and its catalog are fictional website-concept content. The live website is the picture: it fills the complete vertical 1080×1920 frame edge-to-edge, with no phone or device mockup.

## Route tour

1. Pet-shop owner hook and full-bleed cat/dog home hero.
2. Cream-colored storefront home, visible vertical scroll and category cards.
3. Lilac catalog with a product flat-lay and four item tiles.
4. Cat-toy product detail, color selection, Add to Bag and a single bag-badge bounce.
5. Sample shopping bag / checkout UI, explicitly labeled as a demo; no real order is placed.
6. Chronolyte AI campaign end card with website and phone number held together.

## Re-render

From the repository root, with Node 22+, Python 3.10+ and the project-local packages installed:

```bash
npm run audio:pet
npm run preview:pet
npm run render:pet
```

The final output is `renders/final/Pet Shop Website Reel v1.mp4`. Existing HVAC exports are preserved. The pet-specific beat plan, storyboard, script and design board are in `pet-shop/plan/`; provenance is in `pet-shop/manifest.json`.

## Implementation

- `src/main.js` loads local assets, fonts and the single timing plan.
- `src/pet-scene.js` draws deterministic frame-by-frame Canvas animation.
- `plan/beats.json` controls route ranges, captions and audio cues.
- `assets/ai/pet-shop/` contains three text-free generated photos.
- `assets/sfx/pet-shop-reel-sfx-v1.wav` is original procedural 48 kHz stereo UI sound design.
