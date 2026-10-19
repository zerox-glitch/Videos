# TASTE — Chronolyte AI HVAC Website Reel

Updated: 2026-10-19 · current version: v1 → `renders/final/HVAC Website Reel v1.mp4`
Status: creator-directed v1 built from the user's brief; not yet user-reviewed.
Visual companion: `plan/design.html` · one timing source: `plan/beats.json`

## 1. Brief, concept & story
- **One-line concept:** A scroll-stopping mini tour of a polished fictional HVAC website: home → services → booking → Chronolyte AI CTA.
- **Video type / platform / format:** Instagram Reel · vertical 9:16 · 1080×1920 · 30 fps · 22 s.
- **Audience & goal / CTA:** HVAC owners and contractors; show what a high-quality service-business site could look like and invite them to contact Chronolyte AI at `www.chronolyteai.site` or `+18126906121`.
- **Brand inputs:** No brand assets supplied beyond URL and phone; use a text-only Chronolyte AI end card. Fictional website demo brand: Northline HVAC. Client/commercial-facing usage; font licenses included beside font files.
- **Narrative structure:** 0–2.4 s hook → 2.4–6.2 s home page → 6.2–10.3 s services page → 10.3–14.6 s booking page → 14.6–18.5 s page stack → 18.5–22 s CTA.
- **Pipeline:** B, mixed but code-led: deterministic Canvas/WebGL animation + two generated still photographs, no stock footage.

## 2. Theme & feel
- **Mood words:** premium · kinetic · confident · human · clear.
- **Theme / visual world:** deep midnight-blue atmosphere with cyan/aqua energy, warm amber photo light, a bright editorial website mockup, and a large mobile-device frame.
- **Intensity / pacing:** 4/5; 0.5–1.5 s beats, smooth page scrolls, quick but readable route transitions, 3.5 s final hold.
- **References:** no reference footage supplied; use the Motion Video Director skill's clarity-first UI motion and short-form hook structure, not copied artwork/audio.
- **Must not feel like:** stock-template ad, unreadable micro-UI, glitch overload, unlicensed trending audio, or an HVAC company making unverifiable claims.

## 3. Visual design system
- **Palette (60–30–10):** atmosphere `#071923`; UI surface `#F5F6F1`; card/nav `#0D2937`; CTA aqua `#62E8D3`; warm accent `#FFB874`; primary text `#F7F8F4`; UI body `#253A43`; muted `#A8BCC2`.
- **Typography:** display `Space Grotesk Variable`, `assets/fonts/space-grotesk/space-grotesk-latin-wght-normal.woff2`, 700; body `DM Sans Variable`, `assets/fonts/dm-sans/dm-sans-latin-opsz-normal.woff2`, 400–700. Local copies, OFL-1.1. Display candidates on the design board: Space Grotesk, Manrope, Outfit. Body candidates: DM Sans, Manrope, Space Grotesk. Chosen pairing: Space Grotesk + DM Sans.
- **Sizes at 1080 px width:** hero display 88–112 px; section headline 68–78 px; caption 48–60 px; website headline 52–62 px; website body 24–30 px; UI labels 18–24 px.
- **Text treatment:** short high-contrast lines; soft dark shadow for white type on glows; aqua only for emphasized words/buttons; no thin outlines or busy text effects.
- **Layout:** headline/caption between y=240–390; device/site between y=405–1530; contact details held in central safe area. Avoid top 220 px, bottom 420 px and right-side UI strip. ≤6 words per caption group where practical.
- **Textures & finish:** original WebGL gradient field, fine grid, mild grain/vignette, faint ambient specks; no flicker or hard flashes.
- **Imagery:** generated editorial HVAC photos, no written text/logos. Keep photos behind independently rendered UI copy.

## 4. Motion language
- **Easing:** `easeOutCubic` for entrances, `easeInOutCubic` for page transitions/scroll, restrained back-ease for the first device arrival; absolute-time seeded loops only.
- **Text animation:** 180–320 ms masked/blur-to-sharp rise; 35–55 ms word/line stagger; one emphatic kinetic hook, then quieter captions.
- **Signature devices:** slim cyan route/scroll indicator, bright booking button, cursor taps with single ring, layered page stack, cyan/amber light orbit.
- **Transitions:** horizontal route swipe; fast but controlled 220–380 ms. Scene changes are on beat; no flashing strobe.
- **Camera:** slight device yaw/pitch and 1–2% push, no uncontrolled shake.

## 5. Sound identity
- **Voice:** none.
- **SFX:** original procedurally synthesized short UI ticks, button taps, soft impacts and compact swishes at the cue times in `plan/beats.json`; dry and restrained; no bundled third-party recordings.
- **Music:** none in v1. User can add a currently licensed Instagram track in-app if desired.
- **Banned:** copyrighted/trending music copied into the export, long risers, repeated click spam, loud jump scares.

## 6. Technical setup
- **Render:** `npm run render`; deterministic `src/main.js`/`src/scenes/reel.js`, `plan/beats.json`, local Playwright Chromium + FFmpeg. Range preview CLI: `node src/render.js --from <s> --to <s> --fps <n> --scale <0–1> --out <dir> [--jpg]`.
- **Key assets:** `assets/ai/hvac-technician-hero.jpg`, `assets/ai/hvac-thermostat-install.jpg`; local fonts in `assets/fonts/`; audio recipe in `scripts/generate_sfx.py`.
- **Final target:** MP4 H.264, yuv420p, AAC 48 kHz, faststart; 1080×1920, 30 fps, 22 s.

## 7. Do / Don't
- **DO:** show three clearly distinct website routes, visibly scroll within pages, keep demo copy short, keep the contact pair readable for at least 3 s, use only the supplied real contact details.
- **DON'T:** imply demo testimonials, real HVAC guarantees, conversion numbers, customer results, business hours, or fake contact details; bury CTA in platform UI zones; add tiny illegible copy.

## 8. Feedback rules log
| Date | Version | User said | Rule we keep |
|---|---|---|---|
| 2026-10-19 | v1 | Asked for a Reels-size HVAC website promo with scrolling/pages and Chronolyte AI contact at the end. | Prioritize visibly different routes, legible short copy, and exact contact details in the final hold. |

## 9. Decision history
- 2026-10-19 · v1 · Chose a 22 s 9:16 no-VO/no-music treatment · the user supplied no narration or music reference; procedural SFX keep the UI tactile without copying audio.

## 10. Continue checklist
1. Read this file, `PROGRESS.md` and the end of `LOG.md`.
2. Use `plan/beats.json` as the sole timing source.
3. Keep palette/fonts/motion consistent and run a full contact-sheet readability check before changing or rendering new versions.
4. Preserve the exact supplied website/phone at the CTA; do not introduce unverified business claims.
