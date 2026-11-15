#!/usr/bin/env python3
"""
Fetches source video from YouTube via Cloudflare WARP + bgutil POT provider
(when available on the runner), and either:

  * window mode (default, legacy): extracts one timed window and writes
    word-level timestamps via faster-whisper — used for the Brian Cox Shorts.
  * clips mode: downloads the full video and cuts it into caption-free clip
    segments at scene-change boundaries. No transcription, no overlays — just
    raw clip segments + a machine-readable manifest.

Outputs land under assets/source/ (window mode) or clips/<video_id>/ (clips
mode). assets/source/*.mp4 is gitignored by design; clips/ is committed.
"""
import argparse
import json
import socket
import subprocess
import sys
from pathlib import Path

OUT_DIR = Path("assets/source")
CLIPS_DIR = Path("clips")
DEFAULT_VIDEO_ID = "kO41iURud9c"


def port_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1.5):
            return True
    except OSError:
        return False


def run(cmd, check=True):
    print(f"+ {' '.join(map(str, cmd))}", flush=True)
    return subprocess.run(cmd, check=check)


def ffprobe_duration(mp4: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1", str(mp4)],
        text=True,
    ).strip()
    return float(out)


def download_youtube(youtube_url: str, dest_mp4: Path, log: list) -> bool:
    """Try several proxy / POT / player-client combos; log each attempt."""
    proxies = []
    if port_open(40000):
        proxies.append(("warp-socks5", ["--proxy", "socks5h://127.0.0.1:40000"]))
    proxies.append(("direct", []))

    pot_arg = []
    if port_open(4416):
        pot_arg = ["--extractor-args",
                   "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416"]

    client_sets = [
        ("mweb,tv,web_safari",
         ["--extractor-args", "youtube:player-client=mweb,tv,web_safari"]),
        ("android",
         ["--extractor-args", "youtube:player-client=android"]),
        ("ios",
         ["--extractor-args", "youtube:player-client=ios"]),
        ("tv_embedded",
         ["--extractor-args", "youtube:player-client=tv_embedded"]),
        ("web_embedded",
         ["--extractor-args", "youtube:player-client=web_embedded"]),
        ("default", []),
    ]

    for p_name, p_args in proxies:
        for c_name, c_args in client_sets:
            if dest_mp4.exists():
                dest_mp4.unlink()
            tag = f"{p_name}+{c_name}"
            cmd = [
                "yt-dlp", "-4", "--no-playlist", "--no-progress", "--rm-cache-dir",
                "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
                "--merge-output-format", "mp4",
                "-o", str(dest_mp4),
                *p_args, *pot_arg, *c_args,
                youtube_url,
            ]
            log.append(f"[try] {tag}")
            res = run(cmd, check=False)
            detail = ""
            if res.returncode == 0 and dest_mp4.exists() and dest_mp4.stat().st_size > 5_000_000:
                log.append(f"[ok] {tag}")
                return True
            if dest_mp4.exists():
                detail = f" ({dest_mp4.stat().st_size} bytes)"
            log.append(f"[fail] {tag}{detail} rc={res.returncode}")
    return False


def write_diagnostics(log: list, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(log) + "\n", encoding="utf-8")


def scene_cuts(video_mp4: Path, threshold: float) -> list:
    """Return timestamps (s) where a new scene starts, via ffmpeg select filter."""
    res = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(video_mp4),
         "-vf", f"select='gt(scene,{threshold})',showinfo",
         "-an", "-f", "null", "-"],
        capture_output=True, text=True, check=False,
    )
    cuts = []
    for line in res.stderr.splitlines():
        if "showinfo" in line:
            for token in line.split():
                if token.startswith("pts_time:"):
                    try:
                        cuts.append(float(token.split(":", 1)[1]))
                    except ValueError:
                        pass
                    break
    return cuts


def cut_clips(video_mp4: Path, cuts: list, dur: float, out_dir: Path,
              min_clip: float, max_clip: float) -> list:
    """Cut caption-free segments between scene changes; return manifest entries."""
    out_dir.mkdir(parents=True, exist_ok=True)
    points = [0.0] + cuts + [dur]
    segs = []
    for i in range(len(points) - 1):
        s, e = points[i], points[i + 1]
        if e - s < min_clip:
            continue
        t = s
        while t < e:
            e2 = min(t + max_clip, e)
            segs.append((t, e2))
            t = e2

    manifest = []
    for i, (s, e) in enumerate(segs, 1):
        out = out_dir / f"clip_{i:02d}.mp4"
        run([
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-ss", f"{s:.3f}", "-to", f"{e:.3f}",
            "-i", str(video_mp4),
            "-c:v", "libx264", "-crf", "24", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
            str(out), "-y",
        ], check=True)
        manifest.append({
            "file": str(out),
            "start": round(s, 3),
            "end": round(e, 3),
            "duration": round(e - s, 3),
        })
        print(f"{out}  {s:.3f} -> {e:.3f}  ({e - s:.2f}s)", flush=True)
    return manifest


def fetch_window(video_id: str) -> None:
    """Legacy behavior: extract the Brian Cox double-slit window + transcript."""
    from faster_whisper import WhisperModel  # heavy import, lazy

    import wave
    import numpy as np

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    youtube_url = f"https://www.youtube.com/watch?v={video_id}"
    full_mp4 = Path("/tmp/yt_full.mp4")

    log: list = []
    if not download_youtube(youtube_url, full_mp4, log):
        write_diagnostics(log, OUT_DIR / "fetch_diagnostics.txt")
        print("ERROR: Download failed.", file=sys.stderr)
        sys.exit(1)

    model = WhisperModel("small.en", device="cpu", compute_type="int8")

    # Full double-slit explanation window.
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

    def load_wav_float32(wav_path: Path) -> np.ndarray:
        with wave.open(str(wav_path), "rb") as wf:
            raw = wf.readframes(wf.getnframes())
        return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

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
    print(f"Saved {out_clip} ({out_clip.stat().st_size / 1e6:.1f} MB) and "
          f"{out_json} ({len(words)} words)", flush=True)


def fetch_clips(video_id: str, threshold: float, min_clip: float,
                max_clip: float) -> None:
    """Download the full video and cut caption-free scene-based clips."""
    # Resolve a bare video id to a watch URL.
    youtube_url = video_id if video_id.startswith("http") else \
        f"https://www.youtube.com/watch?v={video_id}"
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in video_id)
    out_dir = CLIPS_DIR / safe_name
    out_dir.mkdir(parents=True, exist_ok=True)

    full_mp4 = Path("/tmp/yt_full.mp4")

    log: list = []
    if not download_youtube(youtube_url, full_mp4, log):
        write_diagnostics(log, OUT_DIR / "fetch_diagnostics.txt")
        print("ERROR: Download failed.", file=sys.stderr)
        sys.exit(1)

    dur = ffprobe_duration(full_mp4)
    cuts = scene_cuts(full_mp4, threshold)
    print(f"Source: {dur:.2f}s  scene cuts detected: {len(cuts)}", flush=True)

    manifest_entries = cut_clips(full_mp4, cuts, dur, out_dir, min_clip, max_clip)

    manifest = {
        "source": youtube_url,
        "video_id": video_id,
        "source_duration": round(dur, 3),
        "scene_threshold": threshold,
        "min_clip": min_clip,
        "max_clip": max_clip,
        "clip_count": len(manifest_entries),
        "clips": manifest_entries,
    }
    manifest_path = out_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote {manifest_path} — {len(manifest_entries)} caption-free clips", flush=True)


def latest_request() -> dict:
    """Return the most recently pushed requests/*.json, if any."""
    import glob as _glob
    files = sorted(_glob.glob("requests/*.json"))
    if not files:
        return {}
    with open(files[-1], encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-id", default=DEFAULT_VIDEO_ID)
    parser.add_argument("--mode", choices=["window", "clips"], default="window")
    parser.add_argument("--threshold", type=float, default=0.35)
    parser.add_argument("--min-clip", type=float, default=2.0)
    parser.add_argument("--max-clip", type=float, default=20.0)
    args = parser.parse_args()

    # A pushed requests/*.json file overrides CLI inputs — this is how a
    # push to the branch triggers a fetch for an arbitrary video.
    req = latest_request()
    if req:
        args.video_id = req.get("video_id", args.video_id)
        args.mode = req.get("mode", args.mode)
        args.threshold = float(req.get("threshold", args.threshold))
        args.min_clip = float(req.get("min_clip", args.min_clip))
        args.max_clip = float(req.get("max_clip", args.max_clip))
        print(f"Using request file: {args.video_id} [{args.mode}]", flush=True)

    if args.mode == "clips":
        fetch_clips(args.video_id, args.threshold, args.min_clip, args.max_clip)
    else:
        fetch_window(args.video_id)


if __name__ == "__main__":
    main()
