# Brian Cox — Viral YouTube Shorts (`kO41iURud9c`)

Three vertical **1080×1920 (9:16)** YouTube Shorts extracted from Big Think's full interview with **Prof. Brian Cox — *The quantum roots of reality*** ([`https://youtu.be/kO41iURud9c`](https://youtu.be/kO41iURud9c)).

Each Short is **over 1 minute long**, features **shot-aware subject tracking**, a **2-line Topic Hook on top** with **multiple colored keywords in both lines**, and **word-by-word dynamic captions** where the **currently spoken word highlights in bright yellow (`#FFE600`)**.

---

## Rendered Shorts (`shorts/`)

| # | File | Duration | Source Timestamp | 2-Line Multi-Color Top Hook |
|---|------|----------|------------------|-----------------------------|
| **1** | [`shorts/Short 1 - Quantum Double Slit Andromeda.mp4`](shorts/Short%201%20-%20Quantum%20Double%20Slit%20Andromeda.mp4) | **1:16** (`76.2s`) | `23:24` – `24:41` | **Line 1:** How **ONE** *(cyan)* Electron Takes **EVERY** *(coral)* Path<br>**Line 2:** Even To **ANDROMEDA** *(orange)* And **BACK** *(mint)* |
| **2** | [`shorts/Short 2 - Planck Scale Black Hole.mp4`](shorts/Short%202%20-%20Planck%20Scale%20Black%20Hole.mp4) | **1:50** (`110.2s`) | `41:24` – `43:15` | **Line 1:** Look **DEEPER** *(cyan)* Into **REALITY** *(violet)*<br>**Line 2:** And Light Forms A **BLACK** *(orange)* **HOLE** *(crimson)* |
| **3** | [`shorts/Short 3 - Why Humans Matter In Space.mp4`](shorts/Short%203%20-%20Why%20Humans%20Matter%20In%20Space.mp4) | **1:52** (`112.0s`) | `1:10:27` – `1:12:19` | **Line 1:** Why **TINY** *(cyan)* Humans Bring **MEANING** *(mint)*<br>**Line 2:** To 2 **TRILLION** *(orange)* Silent **GALAXIES** *(coral)* |

---

## Specs

- **Resolution:** `1080 × 1920` (9:16 vertical HD)
- **Codec:** H.264 High Profile (`yuv420p`, `+faststart`) + AAC-LC 48 kHz stereo (`-14 LUFS` loudness normalized)
- **Captions:** Montserrat Black (`900`), 3–5 word high-retention phrases, active spoken word highlighted in **Yellow (`#FFE600`)** with scale pop and dark contrast pill
- **Top Hook:** 2-line header card with 2 distinct colored emphasis words in **both** Line 1 and Line 2

## Pipeline Structure

- `scripts/remote_fetch.py` & `.github/workflows/fetch-clips.yml` — Downloads the 1080p YouTube source, aligns millisecond word-level timestamps with `faster-whisper`, and cuts sentence-accurate source clips into `assets/source/clips_manifest.json`.
- `scripts/render_shorts.py` — Shot-aware vertical framing + 2-line multi-color top hook + yellow active-word karaoke caption renderer.
