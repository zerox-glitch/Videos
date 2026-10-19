# TASTE — Chronolyte AI Pet Shop Website Reel

Updated: 2026-10-19 · current version: v1 → `renders/final/Pet Shop Website Reel v1.mp4`
Status: v1 complete; rendered and QA-checked against the user's pet-shop request and the full-screen feedback on the HVAC reel.
Active plan: `pet-shop/plan/beats.json` · visual companion: `pet-shop/plan/design.html`

## 1. Brief & story
- **Concept:** A playful, polished pet-shop website tour: Home → Shop → Product → Bag → Chronolyte AI CTA.
- **Platform/format:** Instagram Reel · 9:16 · 1080×1920 · 30 fps · 22 s.
- **Audience/goal:** Pet-shop owners; make the site demo energetic, clear and product-focused.
- **Brand:** Fictional demo storefront `GOOD PET CLUB`; closing CTA is Chronolyte AI at `www.chronolyteai.site` and `+18126906121`.
- **Carry-forward feedback:** No device/phone mockup. The website itself fills the full vertical frame edge-to-edge.
- **Pipeline:** Deterministic Canvas 2D animation + three AI-generated pet/shop images; locally licensed OFL fonts.

## 2. Theme & visual system
- **Mood:** joyful · tactile · bright · premium · a little cheeky.
- **Palette:** warm cream `#FFF6EA`; deep ink `#29233A`; plum `#321B54`; vivid purple `#6B4EFF`; coral `#FF6D7A`; fresh lime `#C8F16D`; airy blue `#91DDF1`; white `#FFFFFF`.
- **Typography:** Space Grotesk Variable for bold display/UI labels; DM Sans Variable for body text. Both local OFL-1.1 fonts, independently rendered (never baked into the photos).
- **Layout:** full-screen 1080×1920 storefront pages with a 122 px sticky navigation; no device bezel, black surround or inset phone screenshot. Use full-width pet photos, oversized category tiles and generous UI hit targets.
- **Graphic accents:** small paw-print and starburst vector marks, floating toy-bounce motion, and lime/coral highlights; keep decorative marks away from text.

## 3. Motion language
- Hook line pops in over the full-screen hero photo; paw/star accents drift in a gentle arc.
- Website routes slide edge-to-edge; Home and Shop visibly scroll vertically.
- Product color chips and Add to Bag button animate on cursor tap; cart badge bounces once, not continuously.
- EaseOutCubic for entrances, EaseInOutCubic for route slides/scroll. Absolute-time animation only; no flicker/strobe.

## 4. Sound
- No voiceover or copyrighted/trending track. Original short procedural UI swishes/taps and soft playful confirmation cues only.
- Add a currently licensed Instagram audio track in-app if desired.

## 5. Accuracy / constraints
- GOOD PET CLUB is a fictional sample brand, visibly treated as a website concept. The $14.00 sample price and cart are explicitly labeled fictional/demo; no real order, customer review, health claim or shipping promise is implied.
- Generated images contain no text; all names, labels and buttons are vector-rendered with the verified local fonts.
- Preserve Chronolyte AI's exact website and phone at the ending.

## 6. Technical setup
- Source: `pet-shop/src/pet-scene.js`, `pet-shop/src/main.js`, `pet-shop/plan/beats.json`.
- Render: `npm run render:pet`; preview: `npm run preview:pet`; sound: `npm run audio:pet`.
- Images: `assets/ai/pet-shop/`; mix: `assets/sfx/pet-shop-reel-sfx-v1.wav`.
- Export: H.264/yuv420p + AAC 48 kHz; 1080×1920, 30 fps, 22 s.
