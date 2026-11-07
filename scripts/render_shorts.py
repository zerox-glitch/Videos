#!/usr/bin/env python3
"""
render_shorts.py (v2) — Professional Science & Podcast YouTube Shorts Pipeline.

Upgrades over v1:
  1. Transcript hook/payoff analysis + weak-opening & filler removal + pause tightening
  2. Short 3-7 word (max 2-line) modern titles that attract attention early and fade out at ~4.8s
  3. Boxless 2-5 word animated captions with elastic active-word pop & 3 selectable styles
  4. Full-bleed 1080x1920 vertical reframing, shot-aware face tracking & subtle emphasis zooms
  5. Concept-triggered NASA/ESA/CSA imagery & accurate physics motion-graphic B-roll inserts
  6. Cleaned voice, click-free EDL audio splicing, speech-ducked ambient score & -14 LUFS master
  7. Pre-export automated QA validator + A/B/C hook & title variations catalog
"""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter1d

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from audio_engine import build_mastered_audio
from broll_engine import BrollRenderer, schedule_broll_inserts
from hook_analyzer import build_curated_variations, group_caption_phrases
from qa_validator import validate_rendered_short

OUT_W = 1080
OUT_H = 1920

FONT_SANS = Path("assets/fonts/SpaceGrotesk-Variable.ttf")
FONT_FALLBACK = Path("assets/fonts/Montserrat-Variable.ttf")

# Unified 2-color palettes per selectable caption/title style (White + 1 Accent)
STYLE_PRESETS = {
    "clean_pop": {
        "name": "Clean Documentary Gold",
        "text_rgb": (255, 255, 255),
        "accent_rgb": (255, 204, 48),     # Warm Cinema Gold (#FFCC30)
        "stroke_rgba": (12, 16, 24, 245),
        "shadow_rgba": (0, 0, 0, 155),
        "active_scale": 1.10,
    },
    "science_cyan": {
        "name": "Quantum Cyan Pop",
        "text_rgb": (255, 255, 255),
        "accent_rgb": (64, 212, 255),     # Crisp Science Cyan (#40D4FF)
        "stroke_rgba": (10, 15, 26, 245),
        "shadow_rgba": (0, 0, 0, 155),
        "active_scale": 1.10,
    },
    "minimal_glow": {
        "name": "Minimal Editorial Amber",
        "text_rgb": (252, 252, 255),
        "accent_rgb": (255, 179, 71),     # Warm Editorial Amber (#FFB347)
        "stroke_rgba": (14, 18, 26, 235),
        "shadow_rgba": (0, 0, 0, 140),
        "active_scale": 1.07,
    },
}

EMPHASIS_KEYWORDS = {
    "andromeda", "cancel", "reality", "particle",
    "black", "planck", "pixels", "understanding",
    "mote", "trillion", "insignificant", "meaning", "valuable",
}


def load_bold_font(size: int, weight: int = 700) -> ImageFont.FreeTypeFont:
    fpath = FONT_SANS if FONT_SANS.exists() else FONT_FALLBACK
    font = ImageFont.truetype(str(fpath), size)
    try:
        font.set_variation_by_axes([weight])
    except Exception:
        pass
    return font


def analyze_source_shots_and_head(src_mp4: Path) -> Dict:
    """
    Scans source video at coarse stride to detect camera cuts and track speaker
    horizontal center (cx) + head top (y_top) smoothly within each camera shot.
    """
    cap = cv2.VideoCapture(str(src_mp4))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 23.976)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    cx_raw = np.full(n_frames, w * 0.5, dtype=np.float32)
    ytop_raw = np.full(n_frames, h * 0.12, dtype=np.float32)
    shot_cuts = [0]

    prev_gray = None
    last_cx = w * 0.5
    last_ytop = h * 0.12

    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx >= n_frames:
            break

        small = cv2.resize(frame, (320, 180), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

        if prev_gray is not None:
            diff = float(np.mean(np.abs(gray.astype(np.int16) - prev_gray.astype(np.int16))))
            if diff > 16.0 and (idx - shot_cuts[-1]) > int(fps * 0.8):
                shot_cuts.append(idx)
        prev_gray = gray

        if idx % 3 == 0:
            # Studio speaker silhouette detection against bright backdrop
            roi = gray[8:115, 55:265]
            if float(np.percentile(roi, 85)) > 165.0:
                mask = roi < 132
                if int(mask.sum()) > 45:
                    ys_m, xs_m = np.where(mask)
                    last_cx = (float(np.median(xs_m)) + 55.0) * (w / 320.0)
                    last_ytop = (float(np.percentile(ys_m, 3)) + 8.0) * (h / 180.0)

        cx_raw[idx] = np.clip(last_cx, w * 0.28, w * 0.72)
        ytop_raw[idx] = np.clip(last_ytop, h * 0.05, h * 0.30)
        idx += 1

    cap.release()
    shot_cuts.append(n_frames)

    # Smooth independently within each camera angle so cuts stay crisp, zero pan-blur!
    cx_smooth = cx_raw.copy()
    ytop_smooth = ytop_raw.copy()
    for s_i in range(len(shot_cuts) - 1):
        a, b = shot_cuts[s_i], shot_cuts[s_i + 1]
        if b - a > 8:
            cx_smooth[a:b] = gaussian_filter1d(cx_raw[a:b], sigma=16.0, mode="nearest")
            ytop_smooth[a:b] = gaussian_filter1d(ytop_raw[a:b], sigma=18.0, mode="nearest")

    return {
        "fps": fps,
        "width": w,
        "height": h,
        "n_frames": n_frames,
        "cx": cx_smooth,
        "ytop": ytop_smooth,
    }


def build_zoom_curve(
    n_out_frames: int,
    fps: float,
    words: List[Dict],
) -> np.ndarray:
    """
    Creates subtle, purposeful documentary zoom-ins (max 1.085x) ONLY on 2-3
    key revelation moments plus a gentle closing push-in — never repetitive!
    """
    zoom = np.ones(n_out_frames, dtype=np.float32)
    t_arr = np.arange(n_out_frames, dtype=np.float32) / fps
    total_dur = n_out_frames / max(1.0, fps)

    # Select up to 2 well-spaced emphasis peaks from transcript keywords
    peaks: List[float] = []
    for w in words:
        clean = "".join(ch for ch in w["word"].lower() if ch.isalpha())
        if clean in EMPHASIS_KEYWORDS and 5.0 < w["start"] < total_dur - 7.0:
            if not peaks or (w["start"] - peaks[-1]) > 14.0:
                peaks.append(float(w["start"]))
        if len(peaks) >= 2:
            break

    for pk in peaks:
        # Smooth bell-shaped emphasis push-in (3.6s wide, +5.5% zoom)
        zoom += 0.055 * np.exp(-0.5 * ((t_arr - (pk + 0.8)) / 1.6) ** 2).astype(np.float32)

    # Gentle closing intimacy push-in over final 6 seconds (+7.5% zoom)
    if total_dur > 10.0:
        close_prog = np.clip((t_arr - (total_dur - 6.5)) / 6.5, 0.0, 1.0)
        close_ease = close_prog * close_prog * (3.0 - 2.0 * close_prog)
        zoom += 0.075 * close_ease.astype(np.float32)

    return np.clip(zoom, 1.0, 1.11)


def reframe_vertical_portrait(
    frame_bgr: np.ndarray,
    cx_src: float,
    ytop_src: float,
    zoom: float,
    target_head_top_out: float,
) -> np.ndarray:
    """
    Full-bleed 1080x1920 9:16 portrait crop with shot-normalized head headroom.
    Seamlessly extends uniform studio backdrop upward when needed so tight closeups
    never clip the speaker's hair or collide with the temporary opening headline.
    """
    src_h, src_w = frame_bgr.shape[:2]

    # Base portrait crop height (~980px at zoom=1.0 -> medium-closeup portrait scale)
    crop_h = (src_h * 0.91) / zoom
    crop_w = crop_h * (OUT_W / OUT_H)

    # Desired top of crop in source coords so ytop_src maps to target_head_top_out
    scale_y = OUT_H / crop_h
    desired_y1 = ytop_src - (target_head_top_out / scale_y)

    pad_top = 0
    if desired_y1 < 0:
        # Check if top strip of source frame is clean studio backdrop (low row variance)
        top_strip = frame_bgr[0:8, max(0, int(cx_src - crop_w * 0.4)):min(src_w, int(cx_src + crop_w * 0.4))]
        if top_strip.size > 0 and float(np.std(top_strip)) < 14.0:
            pad_top = int(math.ceil(-desired_y1)) + 4
            frame_work = cv2.copyMakeBorder(
                frame_bgr, pad_top, 0, 0, 0, borderType=cv2.BORDER_REPLICATE
            )
            desired_y1 += pad_top
        else:
            frame_work = frame_bgr
            desired_y1 = 0.0
    else:
        frame_work = frame_bgr

    work_h, work_w = frame_work.shape[:2]
    y1 = int(round(max(0.0, min(work_h - crop_h, desired_y1))))
    y2 = min(work_h, y1 + int(round(crop_h)))

    x1 = int(round(max(0.0, min(work_w - crop_w, cx_src - crop_w * 0.5))))
    x2 = min(work_w, x1 + int(round(crop_w)))

    cropped = frame_work[y1:y2, x1:x2]
    out = cv2.resize(cropped, (OUT_W, OUT_H), interpolation=cv2.INTER_LANCZOS4)

    # Subtle cinematic edge polish (very light vignette at extreme corners only)
    return out


class OverlayCompositor:
    """
    Renders:
      1. Clean, short 2-line opening headline (visible 0..4.8s, smooth slide-in & fade-out,
         NO heavy black background container, unified 2-color palette).
      2. Boxless 2-5 word animated subtitles in lower-third safe zone with smooth
         active-word scale pop & soft drop shadow.
    """

    def __init__(self, style_name: str = "clean_pop"):
        self.style = STYLE_PRESETS.get(style_name, STYLE_PRESETS["clean_pop"])
        self.title_font = load_bold_font(74, weight=700)
        self.cap_font = load_bold_font(66, weight=700)
        self._word_sprite_cache: Dict[Tuple[str, bool, int], Image.Image] = {}
        self._title_banner_cache: Optional[Image.Image] = None
        self._top_scrim_bgr: Optional[np.ndarray] = None

        # Precompute gentle top gradient scrimalpha (0..0.38 at top edge, zero by y=430)
        scrim_a = np.zeros((OUT_H, OUT_W), dtype=np.float32)
        ys = np.linspace(0.0, 1.0, 440, dtype=np.float32)
        scrim_a[:440, :] = (0.38 * ((1.0 - ys) ** 1.8))[:, None]
        self._top_scrim_alpha = scrim_a[:, :, None]

    def build_title_layer(self, title_lines: List[str], accent_words: List[str]) -> Image.Image:
        """Pre-renders the crisp boxless 2-line title RGBA layer (`1080x440`)."""
        accent_set = {w.strip(".,?!:;'\"").upper() for w in accent_words}
        layer = Image.new("RGBA", (OUT_W, 440), (0, 0, 0, 0))
        shadow_layer = Image.new("RGBA", (OUT_W, 440), (0, 0, 0, 0))

        draw_fg = ImageDraw.Draw(layer)
        draw_sh = ImageDraw.Draw(shadow_layer)

        # Auto-scale font down slightly if a line exceeds 930px width
        font = self.title_font
        for sz in (74, 66, 58, 50):
            cand_f = load_bold_font(sz, weight=700)
            max_lw = max(
                (draw_fg.textbbox((0, 0), ln.upper(), font=cand_f, stroke_width=6)[2] for ln in title_lines),
                default=0,
            )
            if max_lw <= 930:
                font = cand_f
                break

        y_cursor = 128 if len(title_lines) == 2 else 172
        line_gap = 86

        # Subtle thin accent rule above headline (modern editorial touch, zero heavy box)
        bar_w = 76
        draw_fg.rounded_rectangle(
            [(OUT_W // 2 - bar_w // 2, y_cursor - 26), (OUT_W // 2 + bar_w // 2, y_cursor - 19)],
            radius=4,
            fill=(*self.style["accent_rgb"], 245),
        )

        for ln in title_lines[:2]:
            words = ln.upper().split()
            sp_w = draw_fg.textbbox((0, 0), " ", font=font)[2]
            w_widths = [draw_fg.textbbox((0, 0), w, font=font)[2] for w in words]
            total_w = sum(w_widths) + sp_w * max(0, len(words) - 1)
            x_cur = (OUT_W - total_w) // 2

            for w_str, ww in zip(words, w_widths):
                clean_tok = w_str.strip(".,?!:;'\"")
                fill_rgb = self.style["accent_rgb"] if clean_tok in accent_set else self.style["text_rgb"]
                draw_sh.text(
                    (x_cur, y_cursor + 5),
                    w_str,
                    font=font,
                    fill=(0, 0, 0, 175),
                    stroke_width=6,
                    stroke_fill=(0, 0, 0, 175),
                )
                draw_fg.text(
                    (x_cur, y_cursor),
                    w_str,
                    font=font,
                    fill=(*fill_rgb, 255),
                    stroke_width=5,
                    stroke_fill=self.style["stroke_rgba"],
                )
                x_cur += ww + sp_w

            y_cursor += line_gap

        shadow_blurred = shadow_layer.filter(ImageFilter.GaussianBlur(radius=7.0))
        return Image.alpha_composite(shadow_blurred, layer)

    def _get_word_sprite(self, word_text: str, is_active: bool, font_size: int) -> Image.Image:
        key = (word_text, is_active, font_size)
        if key in self._word_sprite_cache:
            return self._word_sprite_cache[key]

        font = self.cap_font if font_size == 66 else load_bold_font(font_size, weight=700)
        dummy = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
        bbox = dummy.textbbox((0, 0), word_text, font=font, stroke_width=6)
        pad = 18
        w = (bbox[2] - bbox[0]) + pad * 2
        h = (bbox[3] - bbox[1]) + pad * 2

        sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        fg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d_sh = ImageDraw.Draw(sh)
        d_fg = ImageDraw.Draw(fg)

        ox = pad - bbox[0]
        oy = pad - bbox[1]

        d_sh.text(
            (ox, oy + 4),
            word_text,
            font=font,
            fill=self.style["shadow_rgba"],
            stroke_width=6,
            stroke_fill=self.style["shadow_rgba"],
        )
        sh = sh.filter(ImageFilter.GaussianBlur(radius=6.0))

        fill_rgb = self.style["accent_rgb"] if is_active else self.style["text_rgb"]
        d_fg.text(
            (ox, oy),
            word_text,
            font=font,
            fill=(*fill_rgb, 255),
            stroke_width=5,
            stroke_fill=self.style["stroke_rgba"],
        )

        sprite = Image.alpha_composite(sh, fg)
        self._word_sprite_cache[key] = sprite
        return sprite

    def composite_frame(
        self,
        frame_bgr: np.ndarray,
        t: float,
        title_layer: Image.Image,
        title_hide_sec: float,
        active_phrase: Optional[Dict],
        caption_center_y: int = 1445,
    ) -> np.ndarray:
        out = frame_bgr.copy()

        # 1. Temporary opening headline (0 .. title_hide_sec), smooth entrance & clean exit
        if t < title_hide_sec:
            if t < 0.34:
                p = t / 0.34
                alpha = p * p * (3.0 - 2.0 * p)
                y_off = int(round((1.0 - alpha) * 22.0))
            elif t > title_hide_sec - 0.55:
                p = max(0.0, (title_hide_sec - t) / 0.55)
                alpha = p * p * (3.0 - 2.0 * p)
                y_off = -int(round((1.0 - alpha) * 20.0))
            else:
                alpha = 1.0
                y_off = 0

            if alpha > 0.01:
                # Subtle top scrim ONLY while opening headline is visible (no box!)
                scrim_w = self._top_scrim_alpha[:440] * alpha
                out[:440] = (out[:440].astype(np.float32) * (1.0 - scrim_w)).astype(np.uint8)

                arr = np.array(title_layer)
                if y_off != 0:
                    shifted = np.zeros_like(arr)
                    if y_off > 0:
                        shifted[y_off:] = arr[:-y_off]
                    else:
                        shifted[:y_off] = arr[-y_off:]
                    arr = shifted

                a_mask = (arr[:, :, 3:4].astype(np.float32) / 255.0) * alpha
                fg_bgr = arr[:, :, 2::-1].astype(np.float32)
                out[:440] = np.clip(out[:440].astype(np.float32) * (1.0 - a_mask) + fg_bgr * a_mask, 0, 255).astype(np.uint8)

        # 2. Boxless 2-5 word animated subtitle with active-word scale pop
        if active_phrase is not None:
            p_words = active_phrase["words"]
            p_start = float(active_phrase["start"])
            p_end = float(active_phrase["end"])

            # Smooth phrase entrance/exit micro-fade
            p_alpha = 1.0
            p_slide = 0
            if t - p_start < 0.075:
                u = max(0.0, (t - p_start) / 0.075)
                p_alpha = u
                p_slide = int(round((1.0 - u) * 8.0))
            elif p_end - t < 0.065:
                p_alpha = max(0.0, (p_end - t) / 0.065)

            # Pick font size that keeps the 2-5 word chunk comfortably within 940px
            raw_tokens = [w["word"] for w in p_words]
            joined_len = sum(len(tok) for tok in raw_tokens)
            font_sz = 66 if joined_len <= 18 else (58 if joined_len <= 24 else 50)

            # Determine active word index (hold previous word across tiny <120ms intra-phrase gaps)
            active_idx = -1
            for i, w in enumerate(p_words):
                next_s = float(p_words[i + 1]["start"]) if i + 1 < len(p_words) else float(w["end"]) + 0.12
                if float(w["start"]) <= t < max(float(w["end"]), min(next_s, float(w["end"]) + 0.14)):
                    active_idx = i
                    break

            sprites = []
            scales = []
            lifts = []
            for i, w in enumerate(p_words):
                is_act = (i == active_idx)
                sp = self._get_word_sprite(w["word"], is_act, font_sz)
                if is_act:
                    dt = max(0.0, t - float(w["start"]))
                    # Smooth elastic pop in first 130ms, settling cleanly
                    pop = math.sin(min(1.0, dt / 0.13) * (math.pi * 0.68))
                    sc = 1.0 + (self.style["active_scale"] - 1.0) * pop
                    lift = -int(round(5.0 * pop))
                else:
                    sc = 1.0
                    lift = 0
                sprites.append(sp)
                scales.append(sc)
                lifts.append(lift)

            # Compute horizontal layout using unscaled core widths so adjacent words don't jitter
            gap_px = -14  # sprites include 18px blur padding on each side
            base_widths = [sp.size[0] for sp in sprites]
            total_row_w = sum(base_widths) + gap_px * max(0, len(sprites) - 1)
            x_cur = (OUT_W - total_row_w) // 2

            for sp, bw, sc, lift in zip(sprites, base_widths, scales, lifts):
                sw, sh = sp.size
                if abs(sc - 1.0) > 0.004:
                    nw = max(1, int(round(sw * sc)))
                    nh = max(1, int(round(sh * sc)))
                    sp_draw = sp.resize((nw, nh), resample=Image.Resampling.BICUBIC)
                else:
                    nw, nh = sw, sh
                    sp_draw = sp

                # Center scaled word over its base slot
                draw_x = x_cur - (nw - bw) // 2
                draw_y = caption_center_y - nh // 2 + lift + p_slide

                arr = np.array(sp_draw)
                x0 = max(0, draw_x)
                y0 = max(0, draw_y)
                x1 = min(OUT_W, draw_x + nw)
                y1 = min(OUT_H, draw_y + nh)
                if x1 > x0 and y1 > y0:
                    sub = arr[y0 - draw_y:y1 - draw_y, x0 - draw_x:x1 - draw_x]
                    a_m = (sub[:, :, 3:4].astype(np.float32) / 255.0) * p_alpha
                    fg_b = sub[:, :, 2::-1].astype(np.float32)
                    roi = out[y0:y1, x0:x1].astype(np.float32)
                    out[y0:y1, x0:x1] = np.clip(roi * (1.0 - a_m) + fg_b * a_m, 0, 255).astype(np.uint8)

                x_cur += bw + gap_px

        return out


def render_single_short(
    clip_entry: Dict,
    raw_mp4: Path,
    out_mp4: Path,
    variant_key: str = "A",
    caption_style: str = "clean_pop",
    enable_music: bool = True,
    seed_offset: int = 0,
) -> Tuple[Dict, Dict]:
    """
    Renders a complete v2 Short MP4 and runs the automated QA validator.
    Returns (all_variations_catalog_for_clip, qa_report).
    """
    clip_id = clip_entry["clip_id"]
    src_dur = float(
        clip_entry.get("duration_sec")
        or clip_entry.get("duration")
        or (clip_entry["words"][-1]["end"] + 0.3)
    )

    variations = build_curated_variations(clip_id, clip_entry["words"], src_dur)
    var = variations.get(variant_key, variations["A"])

    edl: List[Tuple[float, float]] = [tuple(x) for x in var["edl"]]
    words: List[Dict] = var["words"]
    phrases: List[Dict] = group_caption_phrases(words, max_words=4, max_chars=24)
    total_dur = float(var["duration_sec"])
    title_lines = var["title_lines"]
    accent_words = var["accent_words"]
    title_hide_sec = 4.8

    broll_schedule = schedule_broll_inserts(words, total_dur)

    print(f"\n[{clip_id} | Variant {variant_key}] '{' / '.join(title_lines)}'")
    print(f"  Duration: {total_dur:.2f}s ({len(edl)} tightened segments) | Hook={var['hook_score']} | Payoff={var['payoff_score']}")
    print(f"  Opening : {var['opening_text']}")
    print(f"  B-Roll  : {[(b['concept_id'], b['start'], b['end']) for b in broll_schedule]}")

    # 1. Analyze source shots & speaker head track
    track = analyze_source_shots_and_head(raw_mp4)
    fps = track["fps"]

    # 2. Build mastered 48kHz stereo audio (cleaned voice + ducked documentary bed + -14 LUFS)
    out_mp4.parent.mkdir(parents=True, exist_ok=True)
    tmp_wav = out_mp4.with_suffix(".master.wav")
    build_mastered_audio(
        src_mp4=raw_mp4,
        edl=edl,
        broll_schedule=broll_schedule,
        out_wav=tmp_wav,
        seed_offset=seed_offset,
        enable_music=enable_music,
    )

    # Map each output frame index -> source frame index via EDL
    frame_src_indices: List[int] = []
    for (s_sec, e_sec) in edl:
        n_seg_frames = max(1, int(round((e_sec - s_sec) * fps)))
        for k in range(n_seg_frames):
            src_t = s_sec + (k / fps)
            src_idx = max(0, min(track["n_frames"] - 1, int(round(src_t * fps))))
            frame_src_indices.append(src_idx)

    n_out_frames = len(frame_src_indices)
    zoom_curve = build_zoom_curve(n_out_frames, fps, words)

    compositor = OverlayCompositor(style_name=caption_style)
    title_layer = compositor.build_title_layer(title_lines, accent_words)
    broll_renderer = BrollRenderer()

    # 3. Stream-decode source frames and pipe 1080x1920 frames directly into FFmpeg H.264 + AAC
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    enc_cmd = [
        ff, "-y", "-nostats", "-loglevel", "error",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "bgr24",
        "-s", f"{OUT_W}x{OUT_H}",
        "-r", f"{fps:.6f}",
        "-i", "-",
        "-i", str(tmp_wav),
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-shortest",
        "-movflags", "+faststart",
        str(out_mp4),
    ]
    proc = subprocess.Popen(enc_cmd, stdin=subprocess.PIPE)

    cap = cv2.VideoCapture(str(raw_mp4))
    cur_pos = -1
    cached_frame = None
    p_cursor = 0

    for out_idx, src_idx in enumerate(frame_src_indices):
        t = out_idx / fps

        # Efficient sequential read when contiguous, seek only across EDL jumps
        if cached_frame is None or src_idx != cur_pos:
            if cur_pos < 0 or src_idx < cur_pos or (src_idx - cur_pos) > 8:
                cap.set(cv2.CAP_PROP_POS_FRAMES, src_idx)
                ret, fr = cap.read()
                cur_pos = src_idx
            else:
                fr = cached_frame
                while cur_pos < src_idx:
                    ret, fr_next = cap.read()
                    if not ret:
                        break
                    fr = fr_next
                    cur_pos += 1
            if fr is not None:
                cached_frame = fr

        raw_fr = cached_frame

        # Smoothly glide speaker head higher after opening headline disappears at 4.8s
        if t < title_hide_sec - 0.4:
            head_target_y = 408.0
        elif t < title_hide_sec + 0.8:
            u = (t - (title_hide_sec - 0.4)) / 1.2
            ease = u * u * (3.0 - 2.0 * u)
            head_target_y = 408.0 - 66.0 * ease
        else:
            head_target_y = 342.0

        # Check active B-roll window (with smooth 0.32s optical cross-dissolve)
        broll_hit = None
        broll_alpha = 0.0
        xf_dur = 0.32
        for b in broll_schedule:
            bs, be = float(b["start"]), float(b["end"])
            if bs <= t <= be:
                broll_hit = b
                if t - bs < xf_dur:
                    u = (t - bs) / xf_dur
                    broll_alpha = u * u * (3.0 - 2.0 * u)
                elif be - t < xf_dur:
                    u = (be - t) / xf_dur
                    broll_alpha = u * u * (3.0 - 2.0 * u)
                else:
                    broll_alpha = 1.0
                break

        if broll_alpha >= 0.999 and broll_hit is not None:
            loc_t = t - float(broll_hit["start"])
            b_dur = max(0.1, float(broll_hit["end"]) - float(broll_hit["start"]))
            base_bgr = broll_renderer.render_frame(broll_hit["concept_id"], loc_t, b_dur)
        else:
            speaker_bgr = reframe_vertical_portrait(
                raw_fr,
                cx_src=float(track["cx"][src_idx]),
                ytop_src=float(track["ytop"][src_idx]),
                zoom=float(zoom_curve[out_idx]),
                target_head_top_out=head_target_y,
            )
            if broll_hit is not None and broll_alpha > 0.001:
                loc_t = t - float(broll_hit["start"])
                b_dur = max(0.1, float(broll_hit["end"]) - float(broll_hit["start"]))
                broll_bgr = broll_renderer.render_frame(broll_hit["concept_id"], loc_t, b_dur)
                base_bgr = cv2.addWeighted(speaker_bgr, 1.0 - broll_alpha, broll_bgr, broll_alpha, 0.0)
            else:
                base_bgr = speaker_bgr

        # Advance active caption phrase pointer
        while p_cursor < len(phrases) and float(phrases[p_cursor]["end"]) < t - 0.07:
            p_cursor += 1
        act_phrase = None
        if p_cursor < len(phrases):
            cand_p = phrases[p_cursor]
            if float(cand_p["start"]) - 0.08 <= t <= float(cand_p["end"]) + 0.07:
                act_phrase = cand_p

        final_bgr = compositor.composite_frame(
            base_bgr,
            t=t,
            title_layer=title_layer,
            title_hide_sec=title_hide_sec,
            active_phrase=act_phrase,
            caption_center_y=1445,
        )
        proc.stdin.write(final_bgr.tobytes())

    cap.release()
    proc.stdin.close()
    rc = proc.wait()
    if tmp_wav.exists():
        tmp_wav.unlink()
    if rc != 0:
        raise RuntimeError(f"FFmpeg encode failed for {out_mp4} (rc={rc})")

    # 4. Run Automated Pre-Export Quality Gate
    meta_for_qa = {
        "clip_id": clip_id,
        "variant": variant_key,
        "title_lines": title_lines,
        "title_hide_sec": title_hide_sec,
        "caption_top_y": 1395,
        "hook_score": var["hook_score"],
        "payoff_score": var["payoff_score"],
        "opening_text": var["opening_text"],
        "closing_text": var["closing_text"],
        "words": words,
        "phrases": phrases,
        "broll_schedule": broll_schedule,
    }
    qa_report = validate_rendered_short(out_mp4, meta_for_qa)
    status_str = "PASS" if qa_report["all_passed"] else "WARN"
    print(f"  [QA: {status_str}] LUFS={qa_report['audio']['integrated_lufs']} dB | Peak={qa_report['audio']['true_peak_dbfs']} dBFS")
    for chk in qa_report["checks"]:
        mark = "OK" if chk["passed"] else "!!"
        print(f"    [{mark}] {chk['check']}: {chk['detail']}")

    # Summarize all 3 generated variations (A/B/C) for selection catalog
    variations_summary = {}
    for vk, vv in variations.items():
        variations_summary[vk] = {
            "label": vv["label"],
            "title_lines": vv["title_lines"],
            "accent_words": vv["accent_words"],
            "duration_sec": vv["duration_sec"],
            "hook_score": vv["hook_score"],
            "payoff_score": vv["payoff_score"],
            "opening_text": vv["opening_text"],
            "closing_text": vv["closing_text"],
            "edl_segment_count": len(vv["edl"]),
        }

    return variations_summary, qa_report


DEFAULT_OUTPUT_NAMES = {
    "short1_double_slit": "Short 1 - Quantum Double Slit Andromeda.mp4",
    "short2_planck_black_hole": "Short 2 - Planck Scale Black Hole.mp4",
    "short3_cosmic_meaning": "Short 3 - Why Humans Matter In Space.mp4",
}


def resolve_raw_mp4(clip_entry: Dict, raw_dir: Path) -> Path:
    cid = clip_entry["clip_id"]
    cand1 = raw_dir / f"{cid}.mp4"
    if cand1.exists():
        return cand1
    src_field = clip_entry.get("source_video") or clip_entry.get("video_path")
    if src_field and Path(src_field).exists():
        return Path(src_field)
    cand2 = Path("assets/source") / f"{cid}.mp4"
    if cand2.exists():
        return cand2
    raise FileNotFoundError(f"Raw source video for {cid} not found in {raw_dir} or assets/source/")


def main():
    parser = argparse.ArgumentParser(description="Render v2 Science/Podcast YouTube Shorts.")
    parser.add_argument("--manifest", type=Path, default=Path("assets/source/clips_manifest.json"))
    parser.add_argument("--raw-dir", type=Path, default=Path("/tmp/raw_clips"))
    parser.add_argument("--out-dir", type=Path, default=Path("shorts"))
    parser.add_argument("--only", type=str, default=None, help="Render only matching clip_id")
    parser.add_argument("--variant", type=str, default="A", choices=["A", "B", "C"])
    parser.add_argument(
        "--caption-style",
        type=str,
        default="clean_pop",
        choices=list(STYLE_PRESETS.keys()),
    )
    parser.add_argument(
        "--export-variations",
        action="store_true",
        help="Also render alternative B/C hook & title variations into <out-dir>/variations/",
    )
    parser.add_argument("--no-music", action="store_true", help="Disable ambient documentary score")
    args = parser.parse_args()

    with open(args.manifest, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    all_variations_catalog = {}
    all_qa_reports = []

    for idx, entry in enumerate(manifest):
        cid = entry["clip_id"]
        if args.only and args.only not in cid:
            continue

        raw_mp4 = resolve_raw_mp4(entry, args.raw_dir)
        out_name = entry.get("output_filename") or DEFAULT_OUTPUT_NAMES.get(cid, f"{cid}.mp4")
        out_mp4 = args.out_dir / out_name

        var_summary, qa_rep = render_single_short(
            clip_entry=entry,
            raw_mp4=raw_mp4,
            out_mp4=out_mp4,
            variant_key=args.variant,
            caption_style=args.caption_style,
            enable_music=not args.no_music,
            seed_offset=idx,
        )
        all_variations_catalog[cid] = {
            "active_variant": args.variant,
            "caption_style": args.caption_style,
            "available_caption_styles": list(STYLE_PRESETS.keys()),
            "variations": var_summary,
        }
        all_qa_reports.append(qa_rep)

        if args.export_variations:
            var_dir = args.out_dir / "variations"
            alt_styles = ["clean_pop", "science_cyan", "minimal_glow"]
            for alt_i, alt_vk in enumerate(["B", "C"]):
                alt_out = var_dir / f"{cid}_variant_{alt_vk}.mp4"
                alt_style = alt_styles[(alt_i + 1) % len(alt_styles)]
                render_single_short(
                    clip_entry=entry,
                    raw_mp4=raw_mp4,
                    out_mp4=alt_out,
                    variant_key=alt_vk,
                    caption_style=alt_style,
                    enable_music=not args.no_music,
                    seed_offset=idx + alt_i + 1,
                )

    args.out_dir.mkdir(parents=True, exist_ok=True)
    with open(args.out_dir / "clip_variations.json", "w", encoding="utf-8") as f:
        json.dump(all_variations_catalog, f, indent=2)
    with open(args.out_dir / "qa_report.json", "w", encoding="utf-8") as f:
        json.dump(all_qa_reports, f, indent=2)

    print(f"\nSaved variations catalog -> {args.out_dir / 'clip_variations.json'}")
    print(f"Saved automated QA report -> {args.out_dir / 'qa_report.json'}")


if __name__ == "__main__":
    main()
