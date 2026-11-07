#!/usr/bin/env python3
"""
Runs in GitHub Actions to fetch the 3 viral 1080p clips (>= 60s each) and exact
word-level timestamps from https://www.youtube.com/watch?v=kO41iURud9c.
"""
import json
import socket
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

VIDEO_ID = "kO41iURud9c"
YOUTUBE_URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"
OUT_DIR = Path("assets/source")
OUT_DIR.mkdir(parents=True, exist_ok=True)

CHAPTER_WINDOWS = [
    {"id": "window1_doubleslit", "start": 17 * 60 + 11, "end": 26 * 60 + 25},
    {"id": "window2_planck", "start": 39 * 60 + 0, "end": 45 * 60 + 15},
    {"id": "window3_meaning", "start": 70 * 60 + 15, "end": 75 * 60 + 30},
]


def port_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1.5):
            return True
    except OSError:
        return False


def run(cmd, check=True):
    print(f"+ {' '.join(map(str, cmd))}", flush=True)
    return subprocess.run(cmd, check=check)


def load_wav_float32(wav_path: Path) -> np.ndarray:
    """Load 16kHz mono 16-bit PCM WAV directly into float32 numpy array (avoids PyAV bug)."""
    with wave.open(str(wav_path), "rb") as wf:
        raw = wf.readframes(wf.getnframes())
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def try_ytdlp(dest_mp4: Path) -> bool:
    print("=== Downloading full 1080p video via yt-dlp ===", flush=True)
    proxies = []
    if port_open(40000):
        proxies.append(["--proxy", "socks5h://127.0.0.1:40000"])
    proxies.append([])
    if port_open(9050):
        proxies.append(["--proxy", "socks5h://127.0.0.1:9050"])

    pot_arg = []
    if port_open(4416):
        pot_arg = ["--extractor-args", "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416"]

    client_variants = [
        [],
        ["--extractor-args", "youtube:player-client=mweb,tv,web_safari"],
        ["--extractor-args", "youtube:player-client=android_vr"],
    ]

    for p_args in proxies:
        for c_args in client_variants:
            if dest_mp4.exists():
                dest_mp4.unlink()
            cmd = [
                "yt-dlp",
                "-4",
                "--no-playlist",
                "--no-progress",
                "--rm-cache-dir",
                "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
                "--merge-output-format", "mp4",
                "-o", str(dest_mp4),
                *p_args,
                *pot_arg,
                *c_args,
                YOUTUBE_URL,
            ]
            res = run(cmd, check=False)
            if res.returncode == 0 and dest_mp4.exists() and dest_mp4.stat().st_size > 5_000_000:
                print(f"SUCCESS with yt-dlp ({p_args} {c_args})!", flush=True)
                return True
    return False


def find_phrase_window(words, start_phrases, end_phrases, default_start, default_end):
    norm_words = [
        {
            "w": "".join(ch.lower() for ch in w["word"] if ch.isalnum()),
            "raw": w["word"].strip(),
            "start": w["start"],
            "end": w["end"],
        }
        for w in words
    ]
    norm_words = [x for x in norm_words if x["w"]]

    def match_seq(seq_str, from_idx=0):
        tokens = ["".join(ch.lower() for ch in t if ch.isalnum()) for t in seq_str.split()]
        tokens = [t for t in tokens if t]
        n = len(tokens)
        for i in range(from_idx, len(norm_words) - n + 1):
            if [norm_words[i + k]["w"] for k in range(n)] == tokens:
                return i, i + n - 1
        return None

    s_time = default_start
    s_idx = 0
    for sp in start_phrases:
        m = match_seq(sp, 0)
        if m:
            s_idx = m[0]
            s_time = max(0.0, norm_words[m[0]]["start"] - 0.30)
            print(f"Matched start phrase '{sp}' at {s_time:.2f}s", flush=True)
            break

    e_time = default_end
    for ep in end_phrases:
        m = match_seq(ep, s_idx)
        if m:
            e_time = norm_words[m[1]]["end"] + 0.50
            print(f"Matched end phrase '{ep}' at {e_time:.2f}s", flush=True)
            break

    return s_time, e_time


def main():
    full_mp4 = Path("/tmp/brian_cox_full.mp4")
    if not try_ytdlp(full_mp4):
        print("ERROR: Download failed.", flush=True)
        sys.exit(1)

    print(f"Downloaded full video: {full_mp4} ({full_mp4.stat().st_size / 1e6:.1f} MB)", flush=True)

    from faster_whisper import WhisperModel
    print("Loading faster-whisper small.en model...", flush=True)
    model = WhisperModel("small.en", device="cpu", compute_type="int8")

    clip_specs = [
        {
            "clip_id": "short1_double_slit",
            "window": CHAPTER_WINDOWS[0],
            "start_phrases": [
                "and the prescription is very simple",
                "a complex number for those that",
                "the fact that you get it from particles",
            ],
            "end_phrases": [
                "correct description of reality the particle does",
                "description of reality the particle does",
                "going to the andromeda galaxy and back right",
            ],
        },
        {
            "clip_id": "short2_planck_black_hole",
            "window": CHAPTER_WINDOWS[1],
            "start_phrases": [
                "so lets say we want to make an observation",
                "want to make an observation of some very small",
                "another property of the planck length",
            ],
            "end_phrases": [
                "edge of our current understanding",
                "building blocks of space that size",
                "bigger and bigger black hole",
            ],
        },
        {
            "clip_id": "short3_cosmic_meaning",
            "window": CHAPTER_WINDOWS[2],
            "start_phrases": [
                "when we contemplate the size and the scale",
                "contemplate the size and the scale of the universe",
            ],
            "end_phrases": [
                "bring meaning to an otherwise meaningless galaxy",
                "otherwise meaningless galaxy",
                "meaningless galaxy",
            ],
        },
    ]

    manifest = []
    for spec in clip_specs:
        win = spec["window"]
        win_wav = Path(f"/tmp/{win['id']}.wav")
        dur = win["end"] - win["start"]

        # Fast audio-only extraction (<1s) for transcription
        run([
            "ffmpeg", "-y", "-nostats", "-loglevel", "error",
            "-ss", str(win["start"]),
            "-t", str(dur),
            "-i", str(full_mp4),
            "-vn", "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le",
            str(win_wav),
        ])

        print(f"Transcribing {win['id']} ({dur}s audio)...", flush=True)
        audio_np = load_wav_float32(win_wav)
        segments, _ = model.transcribe(audio_np, word_timestamps=True, vad_filter=True)
        words = []
        for seg in segments:
            for w in (seg.words or []):
                words.append({
                    "word": w.word,
                    "start": round(float(w.start), 3),
                    "end": round(float(w.end), 3),
                })

        s_rel, e_rel = find_phrase_window(
            words,
            spec["start_phrases"],
            spec["end_phrases"],
            default_start=0.0,
            default_end=min(float(dur), 95.0),
        )
        if e_rel - s_rel < 63.0:
            e_rel = min(float(dur), s_rel + 75.0)

        abs_start = win["start"] + s_rel
        clip_dur = e_rel - s_rel
        out_clip = OUT_DIR / f"{spec['clip_id']}.mp4"

        print(f"Encoding {out_clip.name}: start={abs_start:.2f}s dur={clip_dur:.2f}s...", flush=True)
        run([
            "ffmpeg", "-y", "-nostats", "-loglevel", "error",
            "-ss", f"{abs_start:.3f}",
            "-t", f"{clip_dur:.3f}",
            "-i", str(full_mp4),
            "-c:v", "libx264", "-preset", "fast", "-crf", "21",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            str(out_clip),
        ])

        # Re-transcribe the exact trimmed clip for frame-exact 0-based word timestamps
        clip_wav = Path(f"/tmp/{spec['clip_id']}.wav")
        run([
            "ffmpeg", "-y", "-nostats", "-loglevel", "error",
            "-i", str(out_clip),
            "-vn", "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le",
            str(clip_wav),
        ])
        clip_np = load_wav_float32(clip_wav)
        c_segs, _ = model.transcribe(clip_np, word_timestamps=True, vad_filter=False)
        clip_words = []
        for seg in c_segs:
            for w in (seg.words or []):
                clip_words.append({
                    "word": w.word.strip(),
                    "start": round(float(w.start), 3),
                    "end": round(float(w.end), 3),
                })

        manifest.append({
            "clip_id": spec["clip_id"],
            "file": str(out_clip),
            "youtube_start_sec": round(abs_start, 2),
            "youtube_end_sec": round(abs_start + clip_dur, 2),
            "duration_sec": round(clip_dur, 2),
            "words": clip_words,
        })
        print(
            f"Saved {out_clip}: {clip_dur:.2f}s ({out_clip.stat().st_size / 1e6:.2f} MB), {len(clip_words)} words",
            flush=True,
        )

    with open(OUT_DIR / "clips_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("All 3 clips and word timestamps generated successfully!", flush=True)


if __name__ == "__main__":
    main()
