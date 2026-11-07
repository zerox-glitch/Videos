#!/usr/bin/env python3
"""
Fetches source windows and exact word-level timestamps from YouTube via
Cloudflare WARP + bgutil POT provider + faster-whisper.
"""
import argparse
import json
import socket
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

DEFAULT_VIDEO_ID = "kO41iURud9c"
OUT_DIR = Path("assets/source")


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
    with wave.open(str(wav_path), "rb") as wf:
        raw = wf.readframes(wf.getnframes())
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def download_youtube(youtube_url: str, dest_mp4: Path) -> bool:
    proxies = []
    if port_open(40000):
        proxies.append(["--proxy", "socks5h://127.0.0.1:40000"])
    proxies.append([])

    pot_arg = []
    if port_open(4416):
        pot_arg = ["--extractor-args", "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416"]

    for p_args in proxies:
        for c_args in [[], ["--extractor-args", "youtube:player-client=mweb,tv,web_safari"]]:
            if dest_mp4.exists():
                dest_mp4.unlink()
            cmd = [
                "yt-dlp", "-4", "--no-playlist", "--no-progress", "--rm-cache-dir",
                "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
                "--merge-output-format", "mp4",
                "-o", str(dest_mp4),
                *p_args, *pot_arg, *c_args,
                youtube_url,
            ]
            res = run(cmd, check=False)
            if res.returncode == 0 and dest_mp4.exists() and dest_mp4.stat().st_size > 5_000_000:
                return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-id", default=DEFAULT_VIDEO_ID)
    parser.add_argument("--only-doubleslit-upgrade", action="store_true")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    youtube_url = f"https://www.youtube.com/watch?v={args.video_id}"
    full_mp4 = Path("/tmp/yt_full.mp4")

    if not download_youtube(youtube_url, full_mp4):
        print("ERROR: Download failed.", file=sys.stderr)
        sys.exit(1)

    from faster_whisper import WhisperModel
    model = WhisperModel("small.en", device="cpu", compute_type="int8")

    # Extract full double-slit explanation (19:50 to 24:42 -> 1190s..1482s)
    start_s = 1190.0
    dur_s = 292.0
    out_clip = OUT_DIR / "window1_doubleslit_full.mp4"
    out_wav = Path("/tmp/w1_full.wav")

    run([
        "ffmpeg", "-y", "-nostats", "-loglevel", "error",
        "-ss", f"{start_s:.3f}", "-t", f"{dur_s:.3f}",
        "-i", str(full_mp4),
        "-c:v", "libx264", "-preset", "fast", "-crf", "21",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        str(out_clip),
    ])
    run([
        "ffmpeg", "-y", "-nostats", "-loglevel", "error",
        "-i", str(out_clip),
        "-vn", "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le",
        str(out_wav),
    ])

    audio_np = load_wav_float32(out_wav)
    segs, _ = model.transcribe(audio_np, word_timestamps=True, vad_filter=False)
    words = []
    for seg in segs:
        for w in (seg.words or []):
            words.append({
                "word": w.word.strip(),
                "start": round(float(w.start), 3),
                "end": round(float(w.end), 3),
            })

    out_json = OUT_DIR / "window1_doubleslit_full.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({
            "clip_id": "short1_double_slit",
            "youtube_start_sec": start_s,
            "duration_sec": dur_s,
            "words": words,
        }, f, indent=2)
    print(f"Saved {out_clip} ({out_clip.stat().st_size/1e6:.1f} MB) and {out_json} ({len(words)} words)", flush=True)


if __name__ == "__main__":
    main()
