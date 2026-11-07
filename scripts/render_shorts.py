#!/usr/bin/env python3
"""
Render 3 viral YouTube Shorts (1080x1920, >= 60s each) from Brian Cox's
Big Think interview ("The quantum roots of reality", https://youtu.be/kO41iURud9c):
  - Shot-aware face-tracked 9:16 framing
  - 2-line Topic Hook on top with multiple words in BOTH lines colored distinctly
  - Word-by-word dynamic karaoke captions with the currently spoken word in YELLOW
"""
import argparse
import json
import math
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_W = 1080
OUT_H = 1920
VIDEO_TOP_Y = 336          # Top header band height above crisp portrait video
VIDEO_AREA_H = OUT_H - VIDEO_TOP_Y  # 1584px -> 1080x1584 (~736px wide crop out of 1920px!)

FONT_PATH = Path("assets/fonts/Montserrat-Variable.ttf")

# Vibrant palette for multi-colored hook keywords (distinct from caption yellow #FFE600)
CYAN = (0, 234, 255)        # #00EAFF
CORAL = (255, 77, 109)      # #FF4D6D
ORANGE = (255, 159, 28)     # #FF9F1C
MINT = (56, 239, 125)       # #38EF7D
VIOLET = (199, 125, 255)    # #C77DFF
CRIMSON = (255, 56, 100)    # #FF3864
WHITE = (255, 255, 255)
ACTIVE_YELLOW = (255, 230, 0)  # #FFE600 — spoken word highlight

SHORTS_CONFIG = {
    "short1_double_slit": {
        "output_name": "Short 1 - Quantum Double Slit Andromeda.mp4",
        "kicker": "PROF. BRIAN COX  •  DOUBLE-SLIT MYSTERY",
        "accent_color": CYAN,
        "hook_lines": [
            # Line 1: 2 colored words (ONE = Cyan, EVERY = Coral)
            [
                ("How", WHITE),
                ("ONE", CYAN),
                ("Electron", WHITE),
                ("Takes", WHITE),
                ("EVERY", CORAL),
                ("Path", WHITE),
            ],
            # Line 2: 2 colored words (ANDROMEDA = Orange, BACK = Mint)
            [
                ("Even", WHITE),
                ("To", WHITE),
                ("ANDROMEDA", ORANGE),
                ("And", WHITE),
                ("BACK", MINT),
            ],
        ],
    },
    "short2_planck_black_hole": {
        "output_name": "Short 2 - Planck Scale Black Hole.mp4",
        "kicker": "PROF. BRIAN COX  •  THE PLANCK LIMIT",
        "accent_color": VIOLET,
        "hook_lines": [
            # Line 1: 2 colored words (DEEPER = Cyan, REALITY = Violet)
            [
                ("Look", WHITE),
                ("DEEPER", CYAN),
                ("Into", WHITE),
                ("REALITY", VIOLET),
            ],
            # Line 2: 2 colored words (BLACK = Orange, HOLE = Crimson)
            [
                ("And", WHITE),
                ("Light", WHITE),
                ("Forms", WHITE),
                ("A", WHITE),
                ("BLACK", ORANGE),
                ("HOLE", CRIMSON),
            ],
        ],
    },
    "short3_cosmic_meaning": {
        "output_name": "Short 3 - Why Humans Matter In Space.mp4",
        "kicker": "PROF. BRIAN COX  •  COSMIC PURPOSE",
        "accent_color": MINT,
        "hook_lines": [
            # Line 1: 2 colored words (TINY = Cyan, MEANING = Mint)
            [
                ("Why", WHITE),
                ("TINY", CYAN),
                ("Humans", WHITE),
                ("Bring", WHITE),
                ("MEANING", MINT),
            ],
            # Line 2: 2 colored words (TRILLION = Orange, GALAXIES = Coral)
            [
                ("To", WHITE),
                ("2", WHITE),
                ("TRILLION", ORANGE),
                ("Silent", WHITE),
                ("GALAXIES", CORAL),
            ],
        ],
    },
}


def load_font(size: int, weight: int = 900) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONT_PATH), size)
    try:
        font.set_variation_by_axes([weight])
    except Exception:
        pass
    return font


def detect_face_crop_centers(video_path: Path, crop_w: int) -> np.ndarray:
    """
    Shot-aware subject/head tracker:
      1. Scans video frames, detects camera cuts via grayscale frame delta.
      2. Tracks subject head/upper-body silhouette X-centroid inside the central
         studio zone (ignoring outer bookshelf edges on wide shots).
      3. Smooths horizontally within each continuous shot while snapping cleanly on cuts!
    """
    cap = cv2.VideoCapture(str(video_path))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    scale = 0.25
    small_w, small_h = int(src_w * scale), int(src_h * scale)
    rx0, rx1 = int(src_w * 0.25 * scale), int(src_w * 0.72 * scale)
    ry0, ry1 = int(src_h * 0.04 * scale), int(src_h * 0.42 * scale)

    cuts = [0]
    face_obs: Dict[int, float] = {}
    prev_gray = None
    idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        small = cv2.resize(frame, (small_w, small_h), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

        if prev_gray is not None:
            diff = float(np.mean(np.abs(gray.astype(np.int16) - prev_gray.astype(np.int16))))
            if diff > 18.0 and (idx - cuts[-1]) >= 8:
                cuts.append(idx)
        prev_gray = gray

        if idx % 3 == 0:
            roi = gray[ry0:ry1, rx0:rx1]
            # Verify bright studio backdrop exists in ROI before foreground thresholding
            if float(np.percentile(roi, 85)) > 175.0:
                mask = roi < 145
                if int(mask.sum()) > 45:
                    xs = np.where(mask)[1] + rx0
                    face_obs[idx] = float(np.median(xs)) / scale

        idx += 1

    cap.release()
    n_frames = max(idx, total_frames, 1)
    cuts.append(n_frames)

    half_crop = crop_w / 2.0
    min_cx = half_crop
    max_cx = src_w - half_crop
    centers = np.full(n_frames, src_w * 0.5, dtype=np.float32)

    for s_i in range(len(cuts) - 1):
        f_start, f_end = cuts[s_i], cuts[s_i + 1]
        shot_faces = [face_obs[f] for f in range(f_start, f_end) if f in face_obs]
        if shot_faces:
            shot_median = float(np.median(shot_faces))
            shot_cx = float(np.clip(shot_median, min_cx, max_cx))
            cur = shot_cx
            for f in range(f_start, min(f_end, n_frames)):
                if f in face_obs:
                    obs_clamped = float(np.clip(face_obs[f], min_cx, max_cx))
                    if abs(obs_clamped - shot_cx) < src_w * 0.18:
                        cur = 0.88 * cur + 0.12 * obs_clamped
                centers[f] = cur
            if f_end - f_start > 9:
                seg = centers[f_start:f_end].copy()
                kernel = np.ones(15, dtype=np.float32) / 15.0
                seg_pad = np.pad(seg, (7, 7), mode="edge")
                centers[f_start:f_end] = np.convolve(seg_pad, kernel, mode="valid")
        else:
            centers[f_start:min(f_end, n_frames)] = float(np.clip(src_w * 0.5, min_cx, max_cx))

    return centers


def render_hook_banner(
    hook_lines: List[List[Tuple[str, Tuple[int, int, int]]]],
    kicker: str,
    accent_color: Tuple[int, int, int],
    band_h: int = 410,
) -> np.ndarray:
    """
    Pre-renders the top 1080 x band_h RGBA Topic Hook banner:
      - Smooth dark vertical vignette fading seamlessly into the video at y = VIDEO_TOP_Y..band_h
      - Sleek dark rounded header card with glowing top accent bar
      - Two bold lines of hook text where multiple keywords in BOTH lines have distinct colors!
    """
    img = Image.new("RGBA", (OUT_W, band_h), (0, 0, 0, 0))

    # 1. Clean studio dark header band + subtle drop-shadow onto top edge of video
    grad = np.zeros((band_h, OUT_W, 4), dtype=np.uint8)
    for y in range(band_h):
        if y < VIDEO_TOP_Y:
            alpha = 238
        else:
            t = (y - VIDEO_TOP_Y) / max(1, band_h - VIDEO_TOP_Y)
            alpha = int(115 * ((1.0 - min(1.0, t)) ** 2.2))
        grad[y, :, 0] = 10
        grad[y, :, 1] = 13
        grad[y, :, 2] = 22
        grad[y, :, 3] = max(0, min(255, alpha))
    img = Image.alpha_composite(img, Image.fromarray(grad, mode="RGBA"))

    # Subtle glowing separator line at y = VIDEO_TOP_Y
    sep_layer = Image.new("RGBA", (OUT_W, band_h), (0, 0, 0, 0))
    sep_draw = ImageDraw.Draw(sep_layer)
    sep_draw.rectangle((0, VIDEO_TOP_Y - 3, OUT_W, VIDEO_TOP_Y), fill=(*accent_color, 175))
    img = Image.alpha_composite(img, sep_layer)

    # 2. Card container with soft shadow
    card_layer = Image.new("RGBA", (OUT_W, band_h), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(card_layer)
    card_box = (34, 38, OUT_W - 34, 312)
    # Shadow
    shadow_layer = Image.new("RGBA", (OUT_W, band_h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    s_draw.rounded_rectangle(
        (card_box[0] + 2, card_box[1] + 10, card_box[2] + 2, card_box[3] + 12),
        radius=30,
        fill=(0, 0, 0, 165),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, shadow_layer)

    c_draw.rounded_rectangle(
        card_box,
        radius=28,
        fill=(13, 16, 26, 232),
        outline=(255, 255, 255, 38),
        width=2,
    )
    # Top glowing accent bar
    accent_w = 240
    ax0 = (OUT_W - accent_w) // 2
    c_draw.rounded_rectangle(
        (ax0, card_box[1], ax0 + accent_w, card_box[1] + 6),
        radius=3,
        fill=(*accent_color, 255),
    )
    img = Image.alpha_composite(img, card_layer)

    draw = ImageDraw.Draw(img)

    # 3. Kicker text
    kicker_font = load_font(20, weight=700)
    k_bbox = draw.textbbox((0, 0), kicker, font=kicker_font)
    kw = k_bbox[2] - k_bbox[0]
    draw.text(
        ((OUT_W - kw) / 2, card_box[1] + 20),
        kicker,
        font=kicker_font,
        fill=(210, 220, 238, 220),
    )

    # 4. Auto-fit 2-line Hook Typography & vertically center inside card
    max_line_w = (card_box[2] - card_box[0]) - 48  # 964px max width
    chosen_size = 56
    for sz in range(58, 34, -2):
        f_test = load_font(sz, weight=900)
        space_w = f_test.getlength(" ") * 1.06
        fits = True
        for line_tokens in hook_lines:
            total_w = sum(f_test.getlength(tok) for tok, _ in line_tokens) + space_w * max(0, len(line_tokens) - 1)
            if total_w > max_line_w:
                fits = False
                break
        if fits:
            chosen_size = sz
            break

    hook_font = load_font(chosen_size, weight=900)
    space_w = hook_font.getlength(" ") * 1.08
    line_gap = int(chosen_size * 1.38)
    block_top = card_box[1] + 54 + max(0, (card_box[3] - (card_box[1] + 54) - (line_gap + chosen_size)) // 2 - 6)
    line_ys = [block_top, block_top + line_gap]

    # Soft shadow layer for hook words
    txt_shadow = Image.new("RGBA", (OUT_W, band_h), (0, 0, 0, 0))
    ts_draw = ImageDraw.Draw(txt_shadow)
    txt_fg = Image.new("RGBA", (OUT_W, band_h), (0, 0, 0, 0))
    tf_draw = ImageDraw.Draw(txt_fg)

    for line_idx, line_tokens in enumerate(hook_lines[:2]):
        widths = [hook_font.getlength(tok) for tok, _ in line_tokens]
        total_w = sum(widths) + space_w * max(0, len(line_tokens) - 1)
        cur_x = (OUT_W - total_w) / 2.0
        cur_y = line_ys[line_idx]

        for (tok, color), w_px in zip(line_tokens, widths):
            # Subtle colored glow pill behind colored emphasis words
            if color != WHITE:
                pill_pad_x, pill_pad_y = 10, 4
                tb = tf_draw.textbbox((cur_x, cur_y), tok, font=hook_font)
                tf_draw.rounded_rectangle(
                    (tb[0] - pill_pad_x, tb[1] - pill_pad_y, tb[2] + pill_pad_x, tb[3] + pill_pad_y + 2),
                    radius=12,
                    fill=(color[0], color[1], color[2], 38),
                )

            ts_draw.text(
                (cur_x + 3, cur_y + 5),
                tok,
                font=hook_font,
                fill=(0, 0, 0, 210),
                stroke_width=6,
                stroke_fill=(0, 0, 0, 210),
            )
            tf_draw.text(
                (cur_x, cur_y),
                tok,
                font=hook_font,
                fill=(*color, 255),
                stroke_width=5,
                stroke_fill=(6, 8, 14, 255),
            )
            cur_x += w_px + space_w

    txt_shadow = txt_shadow.filter(ImageFilter.GaussianBlur(5))
    img = Image.alpha_composite(img, txt_shadow)
    img = Image.alpha_composite(img, txt_fg)
    return np.array(img, dtype=np.uint8)


def build_caption_phrases(words: List[Dict]) -> List[Dict]:
    """
    Groups word-level timestamps into punchy, high-retention 3-5 word Shorts phrases
    that break naturally on punctuation and pauses.
    """
    cleaned = []
    for w in words:
        txt = (w.get("word") or "").strip()
        if not txt:
            continue
        cleaned.append({
            "word": txt,
            "start": float(w["start"]),
            "end": max(float(w["end"]), float(w["start"]) + 0.04),
        })

    phrases = []
    buf = []
    buf_chars = 0

    for i, w in enumerate(cleaned):
        buf.append(w)
        buf_chars += len(w["word"]) + 1

        ends_punct = w["word"][-1] in ".?!,:;—"
        next_gap = (cleaned[i + 1]["start"] - w["end"]) if (i + 1 < len(cleaned)) else 9.9

        should_flush = (
            len(buf) >= 5
            or buf_chars >= 26
            or (ends_punct and len(buf) >= 2)
            or next_gap >= 0.38
            or i == len(cleaned) - 1
        )
        if should_flush:
            # Compute seamless active windows for each word inside the phrase
            p_words = []
            for k, pw in enumerate(buf):
                w_start = pw["start"]
                if k + 1 < len(buf):
                    w_end = min(buf[k + 1]["start"], pw["end"] + 0.32)
                    # Bridge tiny <0.22s intra-phrase gaps so yellow highlight never flickers
                    if buf[k + 1]["start"] - pw["end"] < 0.22:
                        w_end = buf[k + 1]["start"]
                else:
                    w_end = pw["end"] + 0.16
                p_words.append({
                    "word": pw["word"],
                    "start": w_start,
                    "end": max(w_end, w_start + 0.04),
                })

            p_start = max(0.0, p_words[0]["start"] - 0.06)
            p_end = p_words[-1]["end"]
            if phrases and p_start < phrases[-1]["end"]:
                phrases[-1]["end"] = p_start

            phrases.append({
                "start": p_start,
                "end": p_end,
                "words": p_words,
            })
            buf = []
            buf_chars = 0

    return phrases


def split_phrase_two_lines(words: List[Dict], max_chars_line: int = 16) -> List[List[Tuple[int, str]]]:
    """Splits a 3-5 word phrase into 1 or 2 balanced lines of (word_index, display_text)."""
    items = [(i, w["word"].upper()) for i, w in enumerate(words)]
    total_chars = sum(len(t) for _, t in items) + max(0, len(items) - 1)
    if total_chars <= max_chars_line or len(items) == 1:
        return [items]

    # Pick most balanced split point
    best_split = 1
    best_diff = 999
    for s in range(1, len(items)):
        l1 = sum(len(t) for _, t in items[:s]) + max(0, s - 1)
        l2 = sum(len(t) for _, t in items[s:]) + max(0, len(items) - s - 1)
        diff = abs(l1 - l2)
        if diff < best_diff:
            best_diff = diff
            best_split = s
    return [items[:best_split], items[best_split:]]


def render_caption_strip(
    phrase: Dict,
    active_word_idx: int,
    strip_h: int = 320,
) -> np.ndarray:
    """
    Renders a 1080 x strip_h RGBA caption strip where:
      - Surrounding words in the phrase are crisp pure WHITE with heavy black stroke
      - The currently spoken word (active_word_idx) is vibrant YELLOW (#FFE600)
        with subtle highlight pill + scale pop!
    """
    img = Image.new("RGBA", (OUT_W, strip_h), (0, 0, 0, 0))
    lines = split_phrase_two_lines(phrase["words"], max_chars_line=16)

    base_size = 64 if max(sum(len(t) for _, t in ln) for ln in lines) <= 17 else 55
    font_norm = load_font(base_size, weight=900)
    font_pop = load_font(int(base_size * 1.07), weight=900)
    space_w = font_norm.getlength(" ") * 1.15

    # Measure total block box for subtle translucent dark backdrop pill
    line_metrics = []
    max_w = 0.0
    for ln in lines:
        w_sum = 0.0
        tok_ws = []
        for idx_w, txt in ln:
            f_use = font_pop if idx_w == active_word_idx else font_norm
            tw = f_use.getlength(txt)
            tok_ws.append(tw)
            w_sum += tw
        w_sum += space_w * max(0, len(ln) - 1)
        max_w = max(max_w, w_sum)
        line_metrics.append((ln, tok_ws, w_sum))

    line_step = int(base_size * 1.30)
    total_h = line_step * len(lines)
    start_y = (strip_h - total_h) // 2

    # Soft dark backdrop container so white/yellow text pops even on Big Think's white studio backdrop
    bg_layer = Image.new("RGBA", (OUT_W, strip_h), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    pad_x, pad_y = 34, 18
    bx0 = int((OUT_W - max_w) / 2 - pad_x)
    bx1 = int((OUT_W + max_w) / 2 + pad_x)
    by0 = max(8, start_y - pad_y)
    by1 = min(strip_h - 8, start_y + total_h + pad_y - 6)
    bg_draw.rounded_rectangle(
        (bx0, by0, bx1, by1),
        radius=26,
        fill=(10, 12, 20, 172),
    )
    bg_layer = bg_layer.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, bg_layer)

    shadow_layer = Image.new("RGBA", (OUT_W, strip_h), (0, 0, 0, 0))
    sh_draw = ImageDraw.Draw(shadow_layer)
    fg_layer = Image.new("RGBA", (OUT_W, strip_h), (0, 0, 0, 0))
    fg_draw = ImageDraw.Draw(fg_layer)

    for l_idx, (ln, tok_ws, w_sum) in enumerate(line_metrics):
        cur_x = (OUT_W - w_sum) / 2.0
        cur_y = start_y + l_idx * line_step

        for (idx_w, txt), tw in zip(ln, tok_ws):
            is_active = (idx_w == active_word_idx)
            f_use = font_pop if is_active else font_norm
            y_adj = cur_y - 3 if is_active else cur_y
            color = ACTIVE_YELLOW if is_active else WHITE

            if is_active:
                tb = fg_draw.textbbox((cur_x, y_adj), txt, font=f_use)
                fg_draw.rounded_rectangle(
                    (tb[0] - 11, tb[1] - 5, tb[2] + 11, tb[3] + 6),
                    radius=14,
                    fill=(255, 215, 0, 48),
                )

            sh_draw.text(
                (cur_x + 3, y_adj + 5),
                txt,
                font=f_use,
                fill=(0, 0, 0, 235),
                stroke_width=9,
                stroke_fill=(0, 0, 0, 235),
            )
            fg_draw.text(
                (cur_x, y_adj),
                txt,
                font=f_use,
                fill=(*color, 255),
                stroke_width=7,
                stroke_fill=(8, 10, 16, 255),
            )
            cur_x += tw + space_w

    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, shadow_layer)
    img = Image.alpha_composite(img, fg_layer)
    return np.array(img, dtype=np.uint8)


def alpha_blend_band_bgr(
    canvas_bgr: np.ndarray,
    overlay_rgba: np.ndarray,
    y0: int,
) -> None:
    """Fast in-place vectorized alpha blend of an RGBA band onto a BGR canvas."""
    h_ov = overlay_rgba.shape[0]
    y1 = min(OUT_H, y0 + h_ov)
    slice_h = y1 - y0
    if slice_h <= 0:
        return
    ov = overlay_rgba[:slice_h]
    alpha = ov[:, :, 3:4].astype(np.uint16)  # (H, W, 1) in 0..255
    inv_alpha = 255 - alpha
    ov_bgr = ov[:, :, [2, 1, 0]].astype(np.uint16)
    dst = canvas_bgr[y0:y1].astype(np.uint16)
    canvas_bgr[y0:y1] = ((dst * inv_alpha + ov_bgr * alpha + 127) >> 8).astype(np.uint8)


def render_single_short(entry: Dict, out_dir: Path) -> Path:
    clip_id = entry["clip_id"]
    cfg = SHORTS_CONFIG[clip_id]
    src_mp4 = Path(entry["file"])
    out_mp4 = out_dir / cfg["output_name"]

    cap = cv2.VideoCapture(str(src_mp4))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    # Portrait crop window matching 1080 x VIDEO_AREA_H aspect ratio
    crop_h = src_h
    crop_w = int(round(src_h * (OUT_W / VIDEO_AREA_H)))
    crop_w = min(src_w, crop_w - (crop_w % 2))

    print(f"[{clip_id}] Detecting faces & camera cuts across {total_frames} frames ({src_w}x{src_h} @ {fps:.2f}fps)...")
    crop_centers = detect_face_crop_centers(src_mp4, crop_w)

    print(f"[{clip_id}] Pre-rendering 2-line multi-color Topic Hook & yellow active-word caption sprites...")
    hook_rgba = render_hook_banner(
        cfg["hook_lines"],
        cfg["kicker"],
        cfg["accent_color"],
        band_h=376,
    )

    phrases = build_caption_phrases(entry["words"])
    caption_cache: Dict[Tuple[int, int], np.ndarray] = {}
    for p_idx, p in enumerate(phrases):
        caption_cache[(p_idx, -1)] = render_caption_strip(p, -1, strip_h=310)
        for w_idx in range(len(p["words"])):
            caption_cache[(p_idx, w_idx)] = render_caption_strip(p, w_idx, strip_h=310)

    # Subtle lower vignette for caption zone + Shorts UI zone
    bot_vig_h = 560
    bot_vig = np.zeros((bot_vig_h, OUT_W, 4), dtype=np.uint8)
    for y in range(bot_vig_h):
        t = y / max(1, bot_vig_h - 1)
        bot_vig[y, :, 0] = 6
        bot_vig[y, :, 1] = 8
        bot_vig[y, :, 2] = 14
        bot_vig[y, :, 3] = int(145 * (t ** 1.6))

    ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_bin,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "bgr24",
        "-s", f"{OUT_W}x{OUT_H}",
        "-r", f"{fps:.6f}",
        "-i", "-",
        "-i", str(src_mp4),
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-profile:v", "high",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-ar", "48000",
        "-b:a", "192k",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-shortest",
        "-movflags", "+faststart",
        str(out_mp4),
    ]

    print(f"[{clip_id}] Rendering {out_mp4.name} ...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    cap = cv2.VideoCapture(str(src_mp4))

    canvas = np.zeros((OUT_H, OUT_W, 3), dtype=np.uint8)
    caption_y0 = 1310
    p_cursor = 0
    f_idx = 0
    accent_bgr = (cfg["accent_color"][2], cfg["accent_color"][1], cfg["accent_color"][0])

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        t = f_idx / fps
        cx = float(crop_centers[min(f_idx, len(crop_centers) - 1)])
        x0 = int(round(cx - crop_w / 2.0))
        x0 = max(0, min(src_w - crop_w, x0))
        crop = frame[0:crop_h, x0:x0 + crop_w]

        # Main portrait video area (y = VIDEO_TOP_Y .. 1920)
        main_vid = cv2.resize(crop, (OUT_W, VIDEO_AREA_H), interpolation=cv2.INTER_LINEAR)
        canvas[VIDEO_TOP_Y:OUT_H] = main_vid

        # Blurred darkened ambient top header fill (y = 0 .. VIDEO_TOP_Y)
        top_strip = cv2.resize(crop[0:max(40, crop_h // 5)], (OUT_W // 8, max(8, VIDEO_TOP_Y // 8)))
        top_strip = cv2.GaussianBlur(top_strip, (9, 9), 0)
        top_fill = cv2.resize(top_strip, (OUT_W, VIDEO_TOP_Y), interpolation=cv2.INTER_LINEAR)
        canvas[0:VIDEO_TOP_Y] = (top_fill.astype(np.uint16) * 90 >> 8).astype(np.uint8)

        # Bottom vignette + Top 2-line multi-color Topic Hook
        alpha_blend_band_bgr(canvas, bot_vig, OUT_H - bot_vig_h)
        alpha_blend_band_bgr(canvas, hook_rgba, 0)

        # Advance active phrase pointer and composite word-by-word Yellow caption
        while p_cursor < len(phrases) and phrases[p_cursor]["end"] < t:
            p_cursor += 1
        if p_cursor < len(phrases):
            ph = phrases[p_cursor]
            if ph["start"] <= t <= ph["end"]:
                active_w = -1
                for wi, wobj in enumerate(ph["words"]):
                    if wobj["start"] <= t <= wobj["end"]:
                        active_w = wi
                        break
                if active_w == -1 and t >= ph["words"][0]["start"]:
                    # Fallback to most recently started word inside active phrase
                    for wi, wobj in enumerate(ph["words"]):
                        if t >= wobj["start"]:
                            active_w = wi
                cap_rgba = caption_cache[(p_cursor, active_w)]
                alpha_blend_band_bgr(canvas, cap_rgba, caption_y0)

        # Subtle progress bar along very bottom edge
        prog_w = int(OUT_W * min(1.0, f_idx / max(1, total_frames - 1)))
        if prog_w > 0:
            canvas[OUT_H - 8:OUT_H, 0:prog_w] = accent_bgr

        proc.stdin.write(canvas.tobytes())
        f_idx += 1

    cap.release()
    proc.stdin.close()
    stderr_out = proc.stderr.read().decode("utf-8", errors="replace")
    retcode = proc.wait()
    if retcode != 0:
        print(stderr_out[-2000:], file=sys.stderr)
        raise RuntimeError(f"FFmpeg failed for {clip_id} with exit code {retcode}")

    dur_rendered = f_idx / fps
    size_mb = out_mp4.stat().st_size / 1e6
    print(f"[{clip_id}] DONE -> {out_mp4} ({dur_rendered:.2f}s, {size_mb:.2f} MB)")
    return out_mp4


def main():
    parser = argparse.ArgumentParser(description="Render viral YouTube Shorts with multi-color hook and yellow word captions.")
    parser.add_argument("--manifest", default="assets/source/clips_manifest.json", help="Path to clips_manifest.json")
    parser.add_argument("--out-dir", default="shorts", help="Output directory for rendered 9:16 MP4 Shorts")
    parser.add_argument("--only", default=None, help="Optional clip_id filter")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"Manifest not found at {manifest_path}", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    for entry in manifest:
        if args.only and entry["clip_id"] != args.only:
            continue
        render_single_short(entry, out_dir)


if __name__ == "__main__":
    main()
