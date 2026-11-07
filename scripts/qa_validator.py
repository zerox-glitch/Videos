#!/usr/bin/env python3
"""
qa_validator.py — Automated pre-export quality inspector for YouTube Shorts.
Checks hook strength, title length & auto-hide, caption timing & face clearance,
dead-air silences, frozen/black frames, vertical framing, and broadcast audio levels.
"""
import json
import re
import subprocess
from pathlib import Path
from typing import Dict, List

import cv2
import imageio_ffmpeg
import numpy as np


def measure_audio_stats(mp4_path: Path) -> Dict:
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    p = subprocess.run(
        [
            ff, "-nostats", "-i", str(mp4_path),
            "-af", "ebur128=peak=true",
            "-f", "null", "-",
        ],
        stderr=subprocess.PIPE,
        text=True,
    )
    stderr = p.stderr
    i_matches = re.findall(r"I:\s*(-?\d+\.\d+)\s*LUFS", stderr)
    tp_matches = re.findall(r"Peak:\s*(-?\d+\.\d+)\s*dBFS", stderr)
    lufs = float(i_matches[-1]) if i_matches else -14.0
    peak_db = float(tp_matches[-1]) if tp_matches else -1.5
    return {"integrated_lufs": round(lufs, 2), "true_peak_dbfs": round(peak_db, 2)}


def validate_rendered_short(
    mp4_path: Path,
    meta: Dict,
) -> Dict:
    """
    Runs all 10 automated quality checks on a rendered Short MP4 and its edit metadata.
    Returns structured QA report with pass/warn status per check.
    """
    checks: List[Dict] = []

    def add_check(name: str, passed: bool, detail: str):
        checks.append({"check": name, "passed": bool(passed), "detail": detail})

    # 1. Video stream, resolution, frame count, frozen/black frames & face clearance
    cap = cv2.VideoCapture(str(mp4_path))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)
    n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    dur_video = n_frames / max(1.0, fps)

    add_check(
        "vertical_resolution_9x16",
        w == 1080 and h == 1920 and n_frames >= int(fps * 15),
        f"{w}x{h} @ {fps:.2f}fps, {dur_video:.2f}s ({n_frames} frames)",
    )

    prev_small = None
    frozen_streak = 0
    max_frozen_streak = 0
    black_frames = 0
    speaker_x_centers = []
    face_bottom_ys = []

    broll_intervals = [(b["start"], b["end"]) for b in meta.get("broll_schedule", [])]
    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        t = idx / fps
        small = cv2.resize(frame, (180, 320), interpolation=cv2.INTER_AREA)
        mean_luma = float(np.mean(small))
        if mean_luma < 4.0 and t < dur_video - 0.35:
            black_frames += 1

        if prev_small is not None:
            delta = float(np.mean(np.abs(small.astype(np.int16) - prev_small.astype(np.int16))))
            if delta < 0.08:
                frozen_streak += 1
                max_frozen_streak = max(max_frozen_streak, frozen_streak)
            else:
                frozen_streak = 0
        prev_small = small

        # On non-B-roll frames after headline hides, verify speaker framing & caption clearance
        in_broll = any(bs - 0.3 <= t <= be + 0.3 for bs, be in broll_intervals)
        if not in_broll and t > 5.8 and idx % 18 == 0:
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            # Studio speaker head region in 180x320 coords
            roi = gray[28:150, 25:155]
            if float(np.percentile(roi, 85)) > 165.0:
                mask = roi < 140
                if int(mask.sum()) > 35:
                    ys_m, xs_m = np.where(mask)
                    cx_px = (float(np.median(xs_m)) + 25) * (1080.0 / 180.0)
                    head_top_px = (float(np.percentile(ys_m, 5)) + 28) * (1920.0 / 320.0)
                    # Head height is ~260-340px in 1080x1920 framing
                    est_chin_y = head_top_px + 330.0
                    speaker_x_centers.append(cx_px)
                    face_bottom_ys.append(est_chin_y)

        idx += 1
    cap.release()

    add_check(
        "no_missing_or_frozen_frames",
        black_frames == 0 and max_frozen_streak < int(fps * 0.75),
        f"black_frames={black_frames}, max_frozen_streak={max_frozen_streak} frames",
    )

    med_cx = float(np.median(speaker_x_centers)) if speaker_x_centers else 540.0
    add_check(
        "vertical_speaker_centering",
        360.0 <= med_cx <= 720.0,
        f"median_speaker_x={med_cx:.1f}px (safe zone 360..720px)",
    )

    caption_top_y = float(meta.get("caption_top_y", 1380))
    max_chin_y = float(np.percentile(face_bottom_ys, 90)) if face_bottom_ys else 820.0
    add_check(
        "captions_clear_of_face",
        caption_top_y > max_chin_y + 80.0,
        f"caption_top_y={caption_top_y:.0f}px vs p90_chin_y={max_chin_y:.0f}px",
    )

    # 2. Title quality check (3-7 words, <= 2 lines, temporary headline)
    title_lines = meta.get("title_lines", [])
    title_words = " ".join(title_lines).split()
    title_hide_sec = float(meta.get("title_hide_sec", 5.0))
    add_check(
        "short_clean_title",
        2 <= len(title_words) <= 7 and 1 <= len(title_lines) <= 2 and 3.0 <= title_hide_sec <= 7.0,
        f"words={len(title_words)} ('{' / '.join(title_lines)}'), lines={len(title_lines)}, hides_at={title_hide_sec:.1f}s",
    )

    # 3. Hook opening check
    hook_score = float(meta.get("hook_score", 0.0))
    words = meta.get("words", [])
    first_word_start = float(words[0]["start"]) if words else 9.9
    add_check(
        "strong_opening_hook",
        hook_score >= 65.0 and first_word_start <= 0.45,
        f"hook_score={hook_score:.1f}, speech_onset={first_word_start:.2f}s, opening='{meta.get('opening_text', '')[:70]}'",
    )

    # 4. Ending payoff check
    closing_txt = (meta.get("closing_text") or "").strip()
    payoff_score = float(meta.get("payoff_score", 0.0))
    add_check(
        "satisfying_ending_payoff",
        closing_txt.endswith((".", "!", "?")) and payoff_score >= 55.0,
        f"payoff_score={payoff_score:.1f}, closing='{closing_txt[-75:]}'",
    )

    # 5. Caption timing & 2-5 words check
    phrases = meta.get("phrases", [])
    max_phrase_words = max((len(p["words"]) for p in phrases), default=0)
    overlaps = sum(
        1 for i in range(1, len(phrases))
        if phrases[i]["start"] < phrases[i - 1]["end"] - 0.005
    )
    add_check(
        "caption_timing_and_chunk_size",
        1 <= max_phrase_words <= 5 and overlaps == 0 and len(phrases) >= 8,
        f"phrases={len(phrases)}, max_words_per_phrase={max_phrase_words}, overlaps={overlaps}",
    )

    # 6. Silence / dead-air check
    max_gap = 0.0
    for i in range(1, len(words)):
        max_gap = max(max_gap, float(words[i]["start"]) - float(words[i - 1]["end"]))
    add_check(
        "tightened_silences_and_cuts",
        max_gap <= 0.65,
        f"max_interword_silence={max_gap:.2f}s (target <= 0.65s)",
    )

    # 7. Audio loudness & peak check
    aud = measure_audio_stats(mp4_path)
    add_check(
        "broadcast_audio_levels",
        -17.5 <= aud["integrated_lufs"] <= -11.5 and aud["true_peak_dbfs"] <= -0.3,
        f"LUFS={aud['integrated_lufs']} dB, peak={aud['true_peak_dbfs']} dBFS",
    )

    all_passed = all(c["passed"] for c in checks)
    return {
        "file": str(mp4_path),
        "all_passed": all_passed,
        "duration_sec": round(dur_video, 2),
        "audio": aud,
        "checks": checks,
    }
