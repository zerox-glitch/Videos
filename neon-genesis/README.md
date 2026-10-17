# NEON GENESIS — the city that builds itself

30 s procedural cyberpunk title sequence. 1920×1080, 30 fps, H.264, stereo.
Everything is generated in code: a software 3D engine on @napi-rs/canvas
(perspective camera, near-plane clipping, painter's sort, additive glow,
half-res bloom, anamorphic streaks, film grain), plus a fully procedural
score rendered with numpy/scipy.

Story beats
0–4   ignition: dust spirals into orbital rings → geometric mandala → implosion → shockwave
4–10  the blast ignites a grid; thousands of towers rise, wireframe→solid, windows cascade
10–16 dive into a neon canyon; a bike with cyan/magenta light trails carves through traffic
16–22 vertical ascent; an artificial moon with metallic rings aligns into a luminous sigil
22–27 the city freezes, shatters into light and folds into a chip die
27–30 chip in the void; NEON GENESIS / REALITY IS JUST ANOTHER SIMULATION.

Run
  npm install
  node src/render.mjs --stills 3.4,9.9,13.6 --scale 0.5 --out renders/previews
  node src/render.mjs --from 0 --to 30 --fps 30 --scale 1 --out renders/final \
       --name "NEON GENESIS" --audio assets/score.wav
  python3 scripts/sound.py 2.0     # regenerates assets/score.wav
