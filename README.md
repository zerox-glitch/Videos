# Automated YouTube Shorts Clipping Pipeline (v2)

End-to-end automated pipeline for turning long-form science, educational, and podcast interviews into broadcast-grade `1080×1920` (9:16) vertical Shorts for YouTube Shorts, Instagram Reels, and TikTok.

## Key Capabilities (v2 Architecture)

1. **Hook & Story-Arc Analyzer (`scripts/hook_analyzer.py`)**
   - Normalizes ASR physics/astronomy terminology (`Planck-sized`, `Andromeda Galaxy`, `Milky Way`, etc.).
   - Scores candidate opening sentences for curiosity, surprise, contrast, and emotional pull while penalizing weak conversational openings (`"Well, what does it mean?"`, `"So let's say..."`, `"And the prescription is..."`).
   - Builds tightened Edit Decision Lists (EDLs) that cut rambling filler and tighten dead pauses (`> 0.50s` → `~0.16s`) while remapping word timestamps onto the output timeline.
   - Generates **A / B / C hook and title variations** per clip (`shorts/clip_variations.json`).

2. **Short Disappearing Modern Titles (`scripts/render_shorts.py`)**
   - Concise **3–7 word** headlines (`max 2 lines`) in bold `Space Grotesk` with a unified 2-color palette (White + 1 signature accent color) and zero heavy black header containers.
   - Auto-positioned in the upper portrait safe zone above the speaker's head, animating in smoothly at `0.0s` and fading out cleanly at `4.8s`.

3. **Boxless Animated 2–5 Word Captions (`scripts/render_shorts.py`)**
   - Word-by-word active highlight with smooth elastic scale pop (`1.10×`) + subtle vertical lift, crisp dark outline, and soft Gaussian drop shadow.
   - Three selectable styles via `--caption-style`:
     - `clean_pop` (Pure White + Warm Cinema Gold `#FFCC30`)
     - `science_cyan` (Pure White + Quantum Cyan `#40D4FF`)
     - `minimal_glow` (Editorial Off-White + Warm Amber `#FFB347`)

4. **Dynamic Vertical Editing & Shot-Aware Face Tracking (`scripts/render_shorts.py`)**
   - Full-bleed `1080×1920` portrait reframing with camera-cut detection, per-shot Gaussian-smoothed head tracking, and restrained emphasis zoom-ins (`≤ 1.10×`) on key revelations.

5. **Concept-Synchronized B-Roll & Physics Motion Graphics (`scripts/broll_engine.py`)**
   - Automatically triggers `0.32s` cross-dissolved visual inserts synchronized to spoken concepts while preserving Brian Cox's continuous narration:
     - **Public-domain NASA / ESA / CSA / JPL space imagery** (`assets/broll/CREDITS.json`): Andromeda Galaxy (`PIA15416`), NASA Goddard relativistic black hole lensing simulations, Earth at night (`Suomi NPP`), Milky Way Galactic Center (`Chandra + MeerKAT`), and JWST First Deep Field (`SMACS 0723`).
     - **Procedural scientific motion graphics**: 2D double-slit wave superposition (`ψ₁ + ψ₂`), Feynman `12 o'clock + 6 o'clock` amplitude cancellation clocks, `E = hc/λ` photon wavelength compression, and 3D Planck-scale event-horizon pixels.

6. **Broadcast Audio Mastering (`scripts/audio_engine.py`)**
   - `75 Hz` rumble high-pass + gentle spectral denoise (`afftdn`), click-free `24 ms` raised-cosine EDL splices, low-passed ambient documentary score automatically sidechain-ducked under speech, restrained B-roll harmonic swells, and `-14 LUFS` / `-1.5 dBTP` (`48 kHz` AAC) mastering.

7. **Automated Pre-Export Quality Gate (`scripts/qa_validator.py`)**
   - Verifies `1080×1920` resolution, zero black/frozen frames, speaker horizontal centering, caption-to-face clearance, 3–7 word temporary title bounds, hook/payoff scores, 2–5 word non-overlapping caption sync, tightened silences (`≤ 0.65s`), and EBU R128 loudness (`shorts/qa_report.json`).

## Usage

```bash
# Render all primary v2 Shorts (Variant A, 'clean_pop' style)
python3 scripts/render_shorts.py \
  --manifest assets/source/clips_manifest.json \
  --raw-dir /tmp/raw_clips \
  --out-dir shorts

# Render a specific clip with an alternative hook/title variant & caption style
python3 scripts/render_shorts.py \
  --only short1_double_slit \
  --variant B \
  --caption-style science_cyan \
  --out-dir shorts/variations

# Export primary Shorts + all B/C variations automatically
python3 scripts/render_shorts.py --export-variations
```
