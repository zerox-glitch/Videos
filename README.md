# Videos

Motion-graphics experiments rendered entirely in code.

## Motion Video Director — demo film

[`motion-director-demo/`](motion-director-demo) is a 26-second, 1080×1920
motion-graphics film made with the
[Motion Video Director skill](https://github.com/Miftahul-Islam-Efaz/Motion-graphics-skill)
(v3.5.2). The skill is installed locally at `.claude/skills/motion-video-director`
and is **not committed here** — its licence is single-user and forbids redistribution.
Install it yourself with:

```bash
npx skills add Miftahul-Islam-Efaz/Motion-graphics-skill
```

- **Watch:** [`motion-director-demo/renders/final/Motion Video Director - Demo v1.mp4`](motion-director-demo/renders/final/Motion%20Video%20Director%20-%20Demo%20v1.mp4)
- **Quick look:** [`motion-director-demo/demo-preview.gif`](motion-director-demo/demo-preview.gif)
- **How it was built:** [`motion-director-demo/README.md`](motion-director-demo/README.md)
  (project code is original and independent of the skill's protected materials)

Every frame is drawn in code (Canvas/Skia, deterministic `f(t)`), piped to FFmpeg,
and scored with 40 procedurally synthesised sound cues. No footage, no stock, no samples.

## Lumi & the Lost Star

[`lumi-and-the-lost-star/`](lumi-and-the-lost-star) is a 72-second wordless storybook cartoon
for ages 3–7, also made with the Motion Video Director skill: a firefly finds a fallen star,
and her friends help carry it home.

- **Watch:** [`lumi-and-the-lost-star/renders/final/Lumi and the Lost Star v2.mp4`](lumi-and-the-lost-star/renders/final/Lumi%20and%20the%20Lost%20Star%20v2.mp4)
- **Quick look:** [`lumi-and-the-lost-star/demo-preview.gif`](lumi-and-the-lost-star/demo-preview.gif)
- **Poster:** [`lumi-and-the-lost-star/poster.jpg`](lumi-and-the-lost-star/poster.jpg)
- **How it was built:** [`lumi-and-the-lost-star/README.md`](lumi-and-the-lost-star/README.md)

1920×1080 · 24 fps · 1:12 · H.264 + AAC · −13.9 LUFS.
Everything is drawn and scored in code: a 24-bar music-box lullaby, 45 designed sound cues,
no samples, no stock, no TTS.
