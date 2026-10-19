# TASTE — Chronolyte AI HVAC Website Reel

Updated: 2026-10-19 · current version: v2 → `renders/final/HVAC Website Reel v2.mp4`
Status: v2 is the revision requested after v1 review; preserve v1 at `renders/final/HVAC Website Reel v1.mp4`.
Visual companion: `plan/design.html` · active timing source: `plan/beats.json`

## 1. Brief, concept & story
- **One-line concept:** A full-screen, edge-to-edge tour of a polished fictional HVAC site: Home → Services → How It Works → Booking → Chronolyte AI CTA.
- **Platform / format:** Instagram Reel · vertical 9:16 · 1080×1920 · 30 fps · 22 s.
- **Audience & goal / CTA:** HVAC owners and contractors; show what a vivid service-business site could look like and invite them to contact Chronolyte AI at `www.chronolyteai.site` or `+18126906121`.
- **Brand inputs:** No user logo or palette supplied; use a text-only Chronolyte AI end card. Fictional website concept: Northline HVAC. Include font licences alongside local fonts.
- **Pipeline:** Mixed, code-led: deterministic Canvas/WebGL animation with two generated HVAC photographs; no stock footage.
- **Narrative:** 0–2.2 hook → 2.2–5.8 Home → 5.8–9.6 Services → 9.6–13.2 How It Works → 13.2–18.2 Booking → 18.2–22 CTA.

## 2. Theme & feel
- **Mood:** bold · bright · direct · premium · human.
- **Visual world:** full-screen website pages, no device bezel or picture-in-picture; frosty white surfaces, saturated cobalt navigation, warm coral calls to action, sunshine-yellow highlights and generous HVAC photography.
- **Pacing:** intensity 4/5; immediate visual hook, four readable routes, visible vertical scrolling, concise final contact hold.
- **Must not feel like:** a phone floating in a dark void, a generic dark SaaS mockup, tiny UI, glitch overload, unlicensed trending audio or a real HVAC company making unverifiable claims.

## 3. Visual design system
- **Palette (60–30–10):** page/frost `#F4F7FD`; cobalt `#2C63F4`; deep navy `#10264A`; white `#FFFFFF`; coral CTA `#FF754A`; sunshine `#FFD05A`; sky `#DDF4FF`; mint `#C9F3E7`; body `#344762`.
- **Typography:** display `Space Grotesk Variable` (`assets/fonts/space-grotesk/space-grotesk-latin-wght-normal.woff2`, OFL-1.1, 700–800); UI/body `DM Sans Variable` (`assets/fonts/dm-sans/dm-sans-latin-opsz-normal.woff2`, OFL-1.1, 500–800). Local fonts are awaited and checked before rendering.
- **Sizes at 1080 px width:** hook 66–116 px; route headlines 76–96 px; body 24–30 px; nav and labels 18–22 px; contact rows 42–44 px.
- **Text treatment:** high-contrast short lines; dark ink on light backgrounds, white/yellow on cobalt or darkened photography; no text baked into photos. Buttons use solid coral or cobalt fills and large labels.
- **Layout:** the website fills the entire 1080×1920 frame edge-to-edge on every site route. The fixed full-width nav is 132 px high. Main content uses full-width photo panels and bold cards; keep critical overlay copy within platform safe areas. No device frame, outer dark margin or tiny inset website.
- **Motion:** route transitions slide the full webpage across the entire canvas; homepage/services scroll vertically behind the fixed nav; cursor taps receive one clear ring; absolute-time animation only.
- **Imagery:** generated HVAC technician beside a home heat pump and a close-up thermostat photo; crop with subject-aware focal points and use crisp independently rendered UI copy.

## 4. Motion language
- **Easing:** `easeOutCubic` for type/card entrances; `easeInOutCubic` for page slides and scroll.
- **Kinetic type:** hook lines arrive in three short, staggered beats; route labels remain inside the webpage design.
- **Transitions:** one full-width horizontal page move, 460 ms; no device shrink/zoom-out. Scroll motion remains visible and comfortable to follow.
- **Secondary motion:** soft color glow and subtle site-status pulse; no rapid flashes or camera shake.

## 5. Sound identity
- **Voice:** none.
- **SFX:** original procedural impacts, short swipes and restrained clicks from `plan/beats.json`; dry and synced to page/cursor actions.
- **Music:** none in v2. Add a currently licensed Instagram sound in-app if desired.
- **Banned:** copied trending/copyrighted audio, long risers, repeated click spam, jump scares.

## 6. Technical setup
- **Render:** `npm run render`; deterministic `src/main.js` + `src/scenes/reel-v2.js`; `plan/beats.json`; local Playwright/Chromium + FFmpeg. Preview with `npm run preview`.
- **Assets:** `assets/ai/hvac-technician-hero.jpg`, `assets/ai/hvac-thermostat-finished.jpg`; local OFL fonts under `assets/fonts/`; V2 procedural mix `assets/sfx/reel-sfx-v2.wav`.
- **Final target:** H.264/yuv420p + AAC 48 kHz, faststart; 1080×1920, 30 fps, 22 s.

## 7. Do / Don't
- **DO:** make every website route full-screen; show clear vertical scrolls and distinct pages; keep copy large; preserve exact phone digits and URL on the ending.
- **DON'T:** show a phone mockup, miniaturize the site, put a device frame around it, invent testimonials/ratings/guarantees/availability, or place the CTA under platform overlays.

## 8. Feedback rules log
| Date | Version | User said | Rule we keep |
|---|---|---|---|
| 2026-10-19 | v1 | Asked for an Instagram Reel showing an HVAC website, pages/scrolling and Chronolyte AI contact at the end. | Strong hook, legible site UI, accurate contact details and a proper 9:16 export. |
| 2026-10-19 | v2 | Said the website visuals were not full-screen; asked for better visuals and colors. | Do not use phone/device mockups. The website itself must fill the full 1080×1920 frame edge-to-edge, with a visibly refreshed high-contrast palette. |

## 9. Decision history
- 2026-10-19 · v1 · Dark navy/aqua outer field with a phone screen; user feedback identified the device frame as too small.
- 2026-10-19 · v2 · Replaced the framed-phone layout with full-bleed native website pages; switched to frost/cobalt/coral/yellow and preserved all required contact details.

## 10. Continue checklist
1. Read this file, `PROGRESS.md` and the end of `LOG.md`.
2. Use `plan/beats.json` as the single active timing source.
3. Keep the website edge-to-edge; do not restore the phone mockup.
4. Inspect all preview contact sheets for full-frame coverage, readable type and safe areas before full export.
5. Preserve the supplied `www.chronolyteai.site` and `+18126906121` at the ending.
