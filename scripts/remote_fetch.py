#!/usr/bin/env python3
"""
Runs in GitHub Actions to fetch the 3 source chapters/clips and exact word-level
timestamps from https://www.youtube.com/watch?v=kO41iURud9c.
"""
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

VIDEO_ID = "kO41iURud9c"
YOUTUBE_URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"
OUT_DIR = Path("assets/source")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Chapter windows from the YouTube video description that contain our 3 viral moments:
# 1) Double-slit experiment: 00:17:11 - 00:26:25 (viral moment around 19:00 - 24:30)
# 2) Fundamental measurements / Planck length black hole: 00:39:00 - 00:45:15
# 3) Humanity & cosmic meaning: 01:10:20 - 01:15:30
CHAPTER_WINDOWS = [
    {"id": "window1_doubleslit", "start": 17 * 60 + 11, "end": 26 * 60 + 25},
    {"id": "window2_planck", "start": 39 * 60 + 0, "end": 45 * 60 + 15},
    {"id": "window3_meaning", "start": 70 * 60 + 20, "end": 75 * 60 + 30},
]


def run(cmd, check=True):
    print(f"+ {' '.join(map(str, cmd))}", flush=True)
    return subprocess.run(cmd, check=check)


def try_pytubefix(dest_mp4: Path) -> bool:
    print("=== Trying pytubefix ===", flush=True)
    try:
        from pytubefix import YouTube
    except Exception as e:
        print(f"pytubefix import failed: {e}", flush=True)
        return False

    clients = ["ANDROID_VR", "IOS", "MWEB", "TV", "WEB"]
    for client in clients:
        try:
            print(f"Trying pytubefix client={client}...", flush=True)
            yt = YouTube(YOUTUBE_URL, client=client)
            print(f"Title: {yt.title} ({yt.length}s)", flush=True)

            # Prefer 1080p adaptive mp4 + audio, fallback to 720p adaptive or progressive
            v_stream = (
                yt.streams.filter(adaptive=True, file_extension="mp4", res="1080p").first()
                or yt.streams.filter(adaptive=True, file_extension="mp4", res="720p").first()
                or yt.streams.filter(progressive=True, file_extension="mp4").order_by("resolution").desc().first()
            )
            if not v_stream:
                continue

            if v_stream.is_progressive:
                v_stream.download(output_path="/tmp", filename="full.mp4")
                Path("/tmp/full.mp4").rename(dest_mp4)
                return dest_mp4.exists() and dest_mp4.stat().st_size > 5_000_000

            a_stream = (
                yt.streams.filter(only_audio=True, file_extension="mp4").order_by("abr").desc().first()
                or yt.streams.filter(only_audio=True).order_by("abr").desc().first()
            )
            if not a_stream:
                continue

            v_path = v_stream.download(output_path="/tmp", filename="video_only")
            a_path = a_stream.download(output_path="/tmp", filename="audio_only")
            run([
                "ffmpeg", "-y",
                "-i", v_path,
                "-i", a_path,
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k",
                str(dest_mp4),
            ])
            if dest_mp4.exists() and dest_mp4.stat().st_size > 5_000_000:
                print(f"Success with pytubefix client={client}!", flush=True)
                return True
        except Exception as e:
            print(f"pytubefix client={client} failed: {e}", flush=True)
    return False


def try_ytdlp(dest_mp4: Path) -> bool:
    print("=== Trying yt-dlp ===", flush=True)
    client_Strategies = [
        ["--extractor-args", "youtube:player_client=android_vr"],
        ["--extractor-args", "youtube:player_client=ios,mweb"],
        ["--extractor-args", "youtube:player_client=tv_embedded,web_creator"],
        [],
    ]
    for extra in client_Strategies:
        try:
            cmd = [
                "yt-dlp",
                "--no-playlist",
                "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]",
                "--merge-output-format", "mp4",
                "-o", str(dest_mp4),
                *extra,
                YOUTUBE_URL,
            ]
            res = run(cmd, check=False)
            if res.returncode == 0 and dest_mp4.exists() and dest_mp4.stat().st_size > 5_000_000:
                print(f"Success with yt-dlp ({extra})!", flush=True)
                return True
        except Exception as e:
            print(f"yt-dlp strategy {extra} error: {e}", flush=True)
    return False


def try_invidious_piped(dest_mp4: Path) -> bool:
    print("=== Trying Piped / Invidious APIs ===", flush=True)
    piped_instances = [
        "https://pipedapi.kavin.rocks",
        "https://api.piped.private.coffee",
        "https://pipedapi.adminforge.de",
        "https://pipedapi.in.projectsegfau.lt",
    ]
    for base in piped_instances:
        try:
            req = urllib.request.Request(
                f"{base}/streams/{VIDEO_ID}",
                headers={"User-Agent": "Mozilla/5.0"},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            v_streams = [
                s for s in data.get("videoStreams", [])
                if s.get("url") and s.get("height", 0) in (1080, 720)
            ]
            a_streams = [s for s in data.get("audioStreams", []) if s.get("url")]
            if v_streams and a_streams:
                v_streams.sort(key=lambda s: s.get("height", 0), reverse=True)
                a_streams.sort(key=lambda s: s.get("bitrate", 0), reverse=True)
                v_url = v_streams[0]["url"]
                a_url = a_streams[0]["url"]
                run([
                    "ffmpeg", "-y",
                    "-i", v_url,
                    "-i", a_url,
                    "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k",
                    str(dest_mp4),
                ])
                if dest_mp4.exists() and dest_mp4.stat().st_size > 5_000_000:
                    return True
        except Exception as e:
            print(f"Piped {base} failed: {e}", flush=True)
    return False


def find_phrase_window(words, start_phrases, end_phrases, default_start, default_end):
    """Find exact start and end timestamps (relative to chapter window) matching target transcript phrases."""
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
            s_time = max(0.0, norm_words[m[0]]["start"] - 0.35)
            print(f"Matched start phrase '{sp}' at {s_time:.2f}s", flush=True)
            break

    e_time = default_end
    for ep in end_phrases:
        m = match_seq(ep, s_idx)
        if m:
            e_time = norm_words[m[1]]["end"] + 0.55
            print(f"Matched end phrase '{ep}' at {e_time:.2f}s", flush=True)
            break

    return s_time, e_time


def main():
    full_mp4 = Path("/tmp/brian_cox_full.mp4")
    ok = (
        try_pytubefix(full_mp4)
        or try_ytdlp(full_mp4)
        or try_invidious_piped(full_mp4)
    )
    if not ok:
        print("ERROR: All download methods failed.", flush=True)
        sys.exit(1)

    print(f"Downloaded full video: {full_mp4} ({full_mp4.stat().st_size / 1e6:.1f} MB)", flush=True)

    from faster_whisper import WhisperModel
    print("Loading faster-whisper base.en model...", flush=True)
    model = WhisperModel("base.en", device="cpu", compute_type="int8")

    # Target exact viral clips inside each chapter window
    clip_specs = [
        {
            "clip_id": "short1_double_slit",
            "window": CHAPTER_WINDOWS[0],
            "start_phrases": [
                "the fact that you get it from particles",
                "you still get that pattern if you send",
                "still get that pattern if you send one particle",
            ],
            "end_phrases": [
                "correct description of reality the particle does",
                "description of reality the particle does",
                "going to the andromeda galaxy and back right",
                "explore all routes on the way from the gun to the screen",
            ],
        },
        {
            "clip_id": "short2_planck_black_hole",
            "window": CHAPTER_WINDOWS[1],
            "start_phrases": [
                "and heres another property of the planck length",
                "another property of the planck length",
                "lets say we want to make an observation of some very small",
            ],
            "end_phrases": [
                "at the edge of our current understanding",
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
                "meaningless galaxy",
            ],
        },
    ]

    manifest = []
    for spec in clip_specs:
        win = spec["window"]
        win_mp4 = Path(f"/tmp/{win['id']}.mp4")
        win_wav = Path(f"/tmp/{win['id']}.wav")
        dur = win["end"] - win["start"]

        run([
            "ffmpeg", "-y",
            "-ss", str(win["start"]),
            "-t", str(dur),
            "-i", str(full_mp4),
            "-c:v", "libx264", "-preset", "fast", "-crf", "19",
            "-c:a", "aac", "-b:a", "192k",
            str(win_mp4),
        ])
        run([
            "ffmpeg", "-y",
            "-i", str(win_mp4),
            "-ac", "1", "-ar", "16000",
            str(win_wav),
        ])

        print(f"Transcribing {win['id']} with word timestamps...", flush=True)
        segments, _ = model.transcribe(str(win_wav), word_timestamps=True, vad_filter=True)
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
            default_end=min(float(dur), 90.0),
        )
        # Ensure clip is at least 62 seconds long
        if e_rel - s_rel < 62.0:
            e_rel = min(float(dur), s_rel + 70.0)

        out_clip = OUT_DIR / f"{spec['clip_id']}.mp4"
        clip_dur = e_rel - s_rel
        run([
            "ffmpeg", "-y",
            "-ss", f"{s_rel:.3f}",
            "-t", f"{clip_dur:.3f}",
            "-i", str(win_mp4),
            "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            str(out_clip),
        ])

        # Re-transcribe the exact trimmed clip so word timestamps are 0-based and frame-exact!
        clip_wav = Path(f"/tmp/{spec['clip_id']}.wav")
        run(["ffmpeg", "-y", "-i", str(out_clip), "-ac", "1", "-ar", "16000", str(clip_wav)])
        c_segs, _ = model.transcribe(str(clip_wav), word_timestamps=True, vad_filter=False)
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
            "youtube_start_sec": round(win["start"] + s_rel, 2),
            "youtube_end_sec": round(win["start"] + e_rel, 2),
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
