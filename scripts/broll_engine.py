#!/usr/bin/env python3
"""
broll_engine.py — Concept-synchronized B-roll & scientific motion-graphics engine.
Combines official public-domain NASA/ESA/CSA astronomical imagery & simulations
with deterministic, physics-accurate procedural explanatory graphics (1080x1920).
"""
import math
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT_W = 1080
OUT_H = 1920
BROLL_DIR = Path("assets/broll")
MONO_FONT_PATH = Path("assets/fonts/JetBrainsMono-Variable.ttf")
SANS_FONT_PATH = Path("assets/fonts/SpaceGrotesk-Variable.ttf")

# Ordered concept triggers: (concept_id, regex_phrases, duration_sec)
CONCEPT_TRIGGERS = [
    ("double_slit_waves", [r"\bboth\s+routes\b", r"\bboth\s+paths\b", r"\binterfere\s+with\s+itself\b", r"\bone\s+particle\s+at\s+a\s+time\b", r"\bprobability\s+to\s+find\s+the\s+electron\b"], 4.3),
    ("andromeda_galaxy", [r"\bandromeda\s+galaxy\b"], 4.4),
    ("feynman_clocks", [r"\b12\s+oclock\b", r"\b6\s+oclock\b", r"\bcancel\s+out\b"], 4.5),
    ("photon_wavelength", [r"\bhigher\s+energy\s+photons\b", r"\bsmaller\s+the\s+wavelength\b"], 4.2),
    ("black_hole_real", [r"\bform\s+a\s+black\s+hole\b", r"\bblack\s+hole\s+grows\b", r"\bbigger\s+black\s+hole\b"], 4.8),
    ("planck_horizon_pixels", [r"\bplanck-sized\s+pixels\b", r"\btiling\s+the\s+event\s+horizon\b"], 4.6),
    ("earth_mote_of_dust", [r"\bmote\s+of\s+dust\b"], 4.0),
    ("milky_way_400b", [r"\b400\s+billion\s+stars\b", r"\bmilky\s+way\s+galaxy\b"], 4.4),
    ("jwst_two_trillion_galaxies", [r"\btwo\s+trillion\s+galaxies\b", r"\bmany\s+galaxies\b"], 4.8),
]


def _load_font(path: Path, size: int, weight: int = 600) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(path), size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def schedule_broll_inserts(
    words: List[Dict],
    total_dur: float,
    min_start_sec: float = 3.6,
    end_guard_sec: float = 5.0,
    min_gap_sec: float = 4.2,
) -> List[Dict]:
    """
    Scans the clip's remapped word timestamps for visualizable scientific concepts
    and schedules clean, non-overlapping B-roll windows with editorial pacing.
    """
    if not words or total_dur < 15.0:
        return []

    # Build sliding multi-word text windows for trigger matching
    candidates: List[Dict] = []

    for i in range(len(words)):
        win_words = words[i:min(len(words), i + 5)]
        win_txt = " ".join(w["word"] for w in win_words).lower()
        win_txt_clean = re.sub(r"[^a-z0-9\s-]", "", win_txt)
        t_hit = float(words[i]["start"])

        if t_hit < min_start_sec or t_hit > total_dur - end_guard_sec - 2.5:
            continue

        for cid, patterns, dur in CONCEPT_TRIGGERS:
            for pat in patterns:
                if re.search(pat, win_txt_clean):
                    b_start = max(min_start_sec, t_hit - 0.20)
                    b_end = min(total_dur - end_guard_sec, b_start + dur)
                    if b_end - b_start >= 2.8:
                        candidates.append({
                            "concept_id": cid,
                            "start": round(b_start, 3),
                            "end": round(b_end, 3),
                            "trigger_phrase": win_txt,
                        })
                    break

    candidates.sort(key=lambda x: x["start"])
    scheduled: List[Dict] = []
    used_concepts = set()
    for c in candidates:
        if c["concept_id"] in used_concepts:
            continue
        if not scheduled or (c["start"] - scheduled[-1]["end"]) >= min_gap_sec:
            scheduled.append(c)
            used_concepts.add(c["concept_id"])

    return scheduled


class BrollRenderer:
    """Renders 1080x1920 BGR frames for scheduled scientific B-roll inserts."""

    def __init__(self):
        self.image_cache: Dict[str, np.ndarray] = {}
        self.gif_cache: Dict[str, List[np.ndarray]] = {}
        self.font_hud = _load_font(MONO_FONT_PATH, 23, 600)
        self.font_title = _load_font(SANS_FONT_PATH, 34, 700)

        # Precompute 2D grid for fast vectorized physics animations (540x960 upscaled 2x)
        gy, gx = np.mgrid[0:960, 0:540].astype(np.float32)
        self.gx = gx
        self.gy = gy

        # Deterministic starfield backdrop
        rng = np.random.default_rng(42)
        self.stars_xy = rng.integers(0, [OUT_W, OUT_H], size=(420, 2))
        self.stars_b = rng.integers(90, 255, size=(420,))
        self.stars_r = rng.choice([1, 1, 1, 2, 2, 3], size=(420,))

    def _get_bgr_image(self, filename: str) -> Optional[np.ndarray]:
        if filename not in self.image_cache:
            p = BROLL_DIR / filename
            if not p.exists():
                return None
            pil_im = Image.open(p).convert("RGB")
            self.image_cache[filename] = cv2.cvtColor(np.array(pil_im), cv2.COLOR_RGB2BGR)
        return self.image_cache[filename]

    def _get_gif_frames(self, filename: str) -> List[np.ndarray]:
        if filename not in self.gif_cache:
            p = BROLL_DIR / filename
            frames = []
            if p.exists():
                im = Image.open(p)
                for idx in range(getattr(im, "n_frames", 1)):
                    im.seek(idx)
                    rgb = np.array(im.convert("RGB"))
                    frames.append(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
            self.gif_cache[filename] = frames
        return self.gif_cache[filename]

    def _draw_hud_badge(self, bgr: np.ndarray, title: str, credit: str) -> np.ndarray:
        """Draws a restrained, documentary-grade corner HUD label (upper-left safe zone)."""
        pil = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        overlay = Image.new("RGBA", (OUT_W, 240), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)

        # Subtle top gradient for readability
        for y in range(180):
            a = int(130 * (1.0 - y / 180.0) ** 1.6)
            d.line([(0, y), (OUT_W, y)], fill=(5, 7, 14, a))

        # Accent vertical bar + clean scientific typography
        x0, y0 = 64, 96
        d.rounded_rectangle((x0, y0, x0 + 5, y0 + 68), radius=2, fill=(56, 189, 248, 235))
        d.text((x0 + 20, y0 - 2), title, font=self.font_title, fill=(248, 250, 252, 245))
        d.text((x0 + 20, y0 + 40), credit, font=self.font_hud, fill=(148, 163, 184, 225))

        top_crop = pil.crop((0, 0, OUT_W, 240)).convert("RGBA")
        comp = Image.alpha_composite(top_crop, overlay).convert("RGB")
        pil.paste(comp, (0, 0))
        return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)

    def _ken_burns_cover(self, img_bgr: np.ndarray, progress: float, zoom_start: float = 1.04, zoom_end: float = 1.16, pan_x: float = 0.0) -> np.ndarray:
        ih, iw = img_bgr.shape[:2]
        target_aspect = OUT_W / OUT_H
        src_aspect = iw / ih

        # Scale so image covers 1080x1920 with headroom for zoom/pan
        zoom = zoom_start + (zoom_end - zoom_start) * (0.5 - 0.5 * math.cos(math.pi * progress))
        if src_aspect > target_aspect:
            base_h = ih
            base_w = int(ih * target_aspect)
        else:
            base_w = iw
            base_h = int(iw / target_aspect)

        win_w = max(64, int(base_w / zoom))
        win_h = max(64, int(base_h / zoom))
        cx = iw * (0.5 + pan_x * (progress - 0.5))
        cy = ih * 0.5
        x0 = int(np.clip(cx - win_w / 2, 0, iw - win_w))
        y0 = int(np.clip(cy - win_h / 2, 0, ih - win_h))
        crop = img_bgr[y0:y0 + win_h, x0:x0 + win_w]
        return cv2.resize(crop, (OUT_W, OUT_H), interpolation=cv2.INTER_LINEAR)

    def _starfield_canvas(self, progress: float) -> np.ndarray:
        canvas = np.full((OUT_H, OUT_W, 3), (14, 9, 6), dtype=np.uint8)
        shift_y = int(progress * 28)
        for (sx, sy), sb, sr in zip(self.stars_xy, self.stars_b, self.stars_r):
            yy = (int(sy) + shift_y) % OUT_H
            col = (int(sb), int(sb * 0.94), int(sb * 0.88))
            cv2.circle(canvas, (int(sx), yy), int(sr), col, -1, lineType=cv2.LINE_AA)
        return canvas

    def render_frame(self, concept_id: str, local_t: float, duration: float) -> np.ndarray:
        progress = float(np.clip(local_t / max(0.01, duration), 0.0, 1.0))

        if concept_id == "double_slit_waves":
            # Vectorized 2D double-slit coherent wave interference + fringe accumulation
            slit_y = 310.0
            s1_x, s2_x = 205.0, 335.0
            d1 = np.sqrt((self.gx - s1_x) ** 2 + (self.gy - slit_y) ** 2) + 1.0
            d2 = np.sqrt((self.gx - s2_x) ** 2 + (self.gy - slit_y) ** 2) + 1.0
            k_wave = 0.24
            omega = local_t * 9.5

            # Incident plane-like spherical wave above barrier, superposed slits below barrier
            above = self.gy < slit_y
            src_d = np.sqrt((self.gx - 270.0) ** 2 + (self.gy - 70.0) ** 2) + 1.0
            psi_above = np.cos(k_wave * src_d - omega) * np.exp(-src_d / 420.0)
            psi_below = (
                np.cos(k_wave * d1 - omega) / np.sqrt(d1 * 0.04 + 1.0)
                + np.cos(k_wave * d2 - omega) / np.sqrt(d2 * 0.04 + 1.0)
            ) * 0.65
            psi = np.where(above, psi_above, psi_below)
            intensity = np.clip((psi + 1.25) / 2.5, 0.0, 1.0)

            small = np.zeros((960, 540, 3), dtype=np.uint8)
            # Deep ocean-cyan scientific wave palette
            small[:, :, 0] = np.clip(18 + intensity * 225, 0, 255).astype(np.uint8)  # B
            small[:, :, 1] = np.clip(12 + (intensity ** 1.4) * 185, 0, 255).astype(np.uint8)  # G
            small[:, :, 2] = np.clip(8 + (intensity ** 2.6) * 95, 0, 255).astype(np.uint8)   # R

            # Detector screen intensity curve |psi|^2 at y = 610 (in 960 space -> y=1220 in 1920)
            canvas = cv2.resize(small, (OUT_W, OUT_H), interpolation=cv2.INTER_LINEAR)
            by = int(slit_y * 2)
            cv2.rectangle(canvas, (0, by - 8), (int(s1_x * 2) - 22, by + 8), (220, 228, 240), -1)
            cv2.rectangle(canvas, (int(s1_x * 2) + 22, by - 8), (int(s2_x * 2) - 22, by + 8), (220, 228, 240), -1)
            cv2.rectangle(canvas, (int(s2_x * 2) + 22, by - 8), (OUT_W, by + 8), (220, 228, 240), -1)

            # Plot bright interference probability envelope on detector screen
            det_y = 1230
            cv2.line(canvas, (70, det_y), (OUT_W - 70, det_y), (120, 140, 170), 2)
            xs = np.arange(80, OUT_W - 80, 4)
            theta = (xs - OUT_W / 2.0) / 340.0
            fringe = (np.cos(theta * 9.2) ** 2) * np.exp(-(theta ** 2) * 0.9)
            pts = np.column_stack([xs, (det_y - fringe * 155).astype(np.int32)])
            cv2.polylines(canvas, [pts], False, (56, 224, 255), 5, lineType=cv2.LINE_AA)
            return self._draw_hud_badge(canvas, "DOUBLE-SLIT INTERFERENCE", "SINGLE ELECTRON SUPERPOSITION  |  WAVE SUM")

        if concept_id == "andromeda_galaxy":
            m31 = self._get_bgr_image("nasa_andromeda_m31.jpg")
            if m31 is not None:
                canvas = self._starfield_canvas(progress)
                # Place M31 with smooth zoom & rotation-free aspect preservation
                ih, iw = m31.shape[:2]
                scale = (1.12 + 0.14 * progress) * (OUT_W / iw)
                nw, nh = int(iw * scale), int(ih * scale)
                resized = cv2.resize(m31, (nw, nh), interpolation=cv2.INTER_LINEAR)
                x0 = (nw - OUT_W) // 2
                y_pos = 340
                crop = resized[0:min(nh, OUT_H - y_pos), x0:x0 + OUT_W]
                # Feather top & bottom edges into starfield
                ch = crop.shape[0]
                feather = np.ones((ch, 1, 1), dtype=np.float32)
                f_len = min(140, ch // 4)
                feather[:f_len, 0, 0] = np.linspace(0.0, 1.0, f_len)
                feather[-f_len:, 0, 0] = np.linspace(1.0, 0.0, f_len)
                dst = canvas[y_pos:y_pos + ch].astype(np.float32)
                canvas[y_pos:y_pos + ch] = np.clip(dst * (1.0 - feather) + crop.astype(np.float32) * feather, 0, 255).astype(np.uint8)

                # Subtle animated Feynman path arc reaching Andromeda & returning
                n_pts = max(4, int(120 * min(1.0, progress * 1.25)))
                ts = np.linspace(0.0, min(1.0, progress * 1.25), n_pts)
                px = (540 + 270 * np.sin(ts * math.pi * 2.0) * np.sin(ts * math.pi)).astype(np.int32)
                py = (1320 - 650 * np.sin(ts * math.pi)).astype(np.int32)
                pts = np.column_stack([px, py]).astype(np.int32).reshape(-1, 1, 2)
                cv2.polylines(canvas, [pts], False, (90, 220, 255), 5, lineType=cv2.LINE_AA)
                cv2.circle(canvas, (int(px[-1]), int(py[-1])), 11, (180, 245, 255), -1, lineType=cv2.LINE_AA)
                return self._draw_hud_badge(canvas, "ANDROMEDA GALAXY (M31)", "2.5 MILLION LIGHT-YEARS  |  NASA / JPL-CALTECH")

        if concept_id == "feynman_clocks":
            canvas = self._starfield_canvas(progress * 0.2)
            # Draw two large Feynman quantum phasor clocks spinning into 12 o'clock and 6 o'clock!
            # Settle smoothly onto 12 o'clock (-pi/2) and 6 o'clock (+pi/2) as progress -> 0.65
            settle = min(1.0, progress / 0.62)
            ease = 1.0 - (1.0 - settle) ** 3
            ang1 = -math.pi / 2.0 - (1.0 - ease) * (math.pi * 4.0)
            ang2 = +math.pi / 2.0 + (1.0 - ease) * (math.pi * 3.0)

            for cx_c, ang, col_c in [(315, ang1, (255, 215, 56)), (765, ang2, (120, 180, 255))]:
                cy_c, rad = 690, 155
                cv2.circle(canvas, (cx_c, cy_c), rad, (30, 38, 56), -1, lineType=cv2.LINE_AA)
                cv2.circle(canvas, (cx_c, cy_c), rad, (140, 165, 200), 4, lineType=cv2.LINE_AA)
                # 12 tick marks
                for h_i in range(12):
                    a_t = h_i * math.pi / 6.0
                    r_in = rad - (20 if h_i % 3 == 0 else 11)
                    p1 = (int(cx_c + r_in * math.cos(a_t)), int(cy_c + r_in * math.sin(a_t)))
                    p2 = (int(cx_c + (rad - 4) * math.cos(a_t)), int(cy_c + (rad - 4) * math.sin(a_t)))
                    cv2.line(canvas, p1, p2, (180, 195, 220), 3 if h_i % 3 == 0 else 1, lineType=cv2.LINE_AA)
                # Phasor arrow hand
                hx = int(cx_c + (rad - 28) * math.cos(ang))
                hy = int(cy_c + (rad - 28) * math.sin(ang))
                cv2.arrowedLine(canvas, (cx_c, cy_c), (hx, hy), col_c, 8, line_type=cv2.LINE_AA, tipLength=0.22)
                cv2.circle(canvas, (cx_c, cy_c), 10, (255, 255, 255), -1, lineType=cv2.LINE_AA)

            # Vector sum clock below -> shrinks to zero as 12 o'clock + 6 o'clock cancel!
            vx = math.cos(ang1) + math.cos(ang2)
            vy = math.sin(ang1) + math.sin(ang2)
            mag = min(1.0, math.hypot(vx, vy) / 2.0)
            scx, scy, srad = 540, 1075, 130
            cv2.circle(canvas, (scx, scy), srad, (24, 30, 44), -1, lineType=cv2.LINE_AA)
            cv2.circle(canvas, (scx, scy), srad, (95, 235, 255) if mag > 0.1 else (110, 125, 150), 3, lineType=cv2.LINE_AA)
            if mag > 0.04:
                shx = int(scx + (srad - 24) * (vx / 2.0))
                shy = int(scy + (srad - 24) * (vy / 2.0))
                cv2.arrowedLine(canvas, (scx, scy), (shx, shy), (90, 240, 255), 7, line_type=cv2.LINE_AA, tipLength=0.25)
            else:
                cv2.circle(canvas, (scx, scy), 14, (80, 230, 255), 3, lineType=cv2.LINE_AA)

            return self._draw_hud_badge(canvas, "FEYNMAN PATH AMPLITUDES", "12 O'CLOCK + 6 O'CLOCK -> DESTRUCTIVE CANCELLATION")

        if concept_id == "photon_wavelength":
            canvas = self._starfield_canvas(progress * 0.3)
            # Smoothly compress wavelength lambda and shift color Red -> Cyan -> Violet-White
            comp = 1.0 + 4.2 * (progress ** 1.35)
            xs = np.linspace(90, OUT_W - 90, 520)
            amp = 155.0 * (1.0 - 0.25 * progress)
            phase = local_t * (8.0 + 18.0 * progress)
            ys = 840.0 + amp * np.sin((xs - 90.0) * 0.018 * comp - phase)

            # Wavelength color interpolation (BGR): Red (60,70,255) -> Cyan (255,215,50) -> UV/Violet (255,150,210)
            if progress < 0.5:
                u = progress * 2.0
                col = (int(60 + 195 * u), int(70 + 145 * u), int(255 - 205 * u))
            else:
                u = (progress - 0.5) * 2.0
                col = (255, int(215 - 65 * u), int(50 + 160 * u))

            pts = np.column_stack([xs.astype(np.int32), ys.astype(np.int32)])
            # Soft glow + crisp wave core
            glow_layer = canvas.copy()
            cv2.polylines(glow_layer, [pts], False, col, 22, lineType=cv2.LINE_AA)
            glow_layer = cv2.GaussianBlur(glow_layer, (31, 31), 0)
            canvas = cv2.addWeighted(canvas, 0.55, glow_layer, 0.75, 0)
            cv2.polylines(canvas, [pts], False, (255, 255, 255), 5, lineType=cv2.LINE_AA)

            # Energy meter bar
            bar_x0, bar_y0, bar_w = 140, 1140, OUT_W - 280
            cv2.rectangle(canvas, (bar_x0, bar_y0), (bar_x0 + bar_w, bar_y0 + 22), (45, 55, 75), -1)
            cv2.rectangle(canvas, (bar_x0, bar_y0), (bar_x0 + int(bar_w * (0.15 + 0.85 * progress)), bar_y0 + 22), col, -1)
            return self._draw_hud_badge(canvas, "PHOTON ENERGY  (E = hc / L)", "SHORTER WAVELENGTH  ->  EXTREME ENERGY DENSITY")

        if concept_id == "black_hole_real":
            frames = self._get_gif_frames("nasa_black_hole_closeup.gif") or self._get_gif_frames("nasa_black_hole_wide.gif")
            canvas = self._starfield_canvas(progress * 0.4)
            if frames:
                f_i = int(local_t * 24.0) % len(frames)
                bh = frames[f_i]
                # Subtle growth as energy is added ("and the black hole grows")
                scale = 1.36 + 0.24 * progress
                size = int(750 * scale)
                bh_res = cv2.resize(bh, (size, size), interpolation=cv2.INTER_LINEAR)
                # Center on 1080x1920
                cx, cy = OUT_W // 2, 850
                sx0 = max(0, (size - OUT_W) // 2)
                dx0 = max(0, cx - size // 2)
                w_copy = min(OUT_W - dx0, size - sx0)
                sy0 = max(0, (size - OUT_H) // 2)
                dy0 = max(0, cy - size // 2)
                h_copy = min(OUT_H - dy0, size - sy0)
                patch = bh_res[sy0:sy0 + h_copy, sx0:sx0 + w_copy].astype(np.float32)
                # Smooth radial + vertical edge feather so square simulation melts into starfield
                py_g, px_g = np.ogrid[0:h_copy, 0:w_copy]
                rx = (px_g - w_copy * 0.5) / max(1.0, w_copy * 0.48)
                ry = (py_g - h_copy * 0.5) / max(1.0, h_copy * 0.46)
                rad_mask = np.clip(1.22 - np.sqrt(rx * rx + ry * ry), 0.0, 1.0)[..., None].astype(np.float32)
                patch_feathered = (patch * rad_mask).astype(np.uint8)
                dst = canvas[dy0:dy0 + h_copy, dx0:dx0 + w_copy]
                canvas[dy0:dy0 + h_copy, dx0:dx0 + w_copy] = np.maximum(dst, patch_feathered)
            return self._draw_hud_badge(canvas, "GRAVITATIONAL COLLAPSE", "BLACK HOLE LENSING SIMULATION  |  NASA GODDARD")

        if concept_id == "planck_horizon_pixels":
            canvas = self._starfield_canvas(progress * 0.25)
            cx, cy, radius = OUT_W // 2, 835, 340
            # Soft amber-cyan horizon halo
            cv2.circle(canvas, (cx, cy), radius + 24, (90, 65, 20), -1, lineType=cv2.LINE_AA)
            canvas = cv2.GaussianBlur(canvas, (45, 45), 0)
            cv2.circle(canvas, (cx, cy), radius, (12, 16, 26), -1, lineType=cv2.LINE_AA)

            # 3D rotating latitude-longitude Planck area tiles on the event horizon
            rot = local_t * 0.55
            n_lat, n_lon = 18, 36
            for i_lat in range(1, n_lat):
                phi = -math.pi * 0.48 + math.pi * 0.96 * (i_lat / n_lat)
                y3 = math.sin(phi)
                r_ring = math.cos(phi)
                for i_lon in range(n_lon):
                    theta = (2.0 * math.pi * i_lon / n_lon) + rot
                    z3 = r_ring * math.cos(theta)
                    if z3 <= 0.05:
                        continue
                    x3 = r_ring * math.sin(theta)
                    sx = int(cx + x3 * radius)
                    sy = int(cy + y3 * radius)
                    shimmer = 0.55 + 0.45 * math.sin(i_lat * 3.1 + i_lon * 1.9 + local_t * 5.0)
                    sz = max(4, int(11 * z3))
                    col = (
                        int(190 + 65 * shimmer),
                        int(145 + 85 * shimmer),
                        int(40 + 80 * (1.0 - shimmer)),
                    )
                    cv2.rectangle(canvas, (sx - sz, sy - sz), (sx + sz, sy + sz), col, 1, lineType=cv2.LINE_AA)
                    if shimmer > 0.84:
                        cv2.rectangle(canvas, (sx - sz + 2, sy - sz + 2), (sx + sz - 2, sy + sz - 2), col, -1)

            cv2.circle(canvas, (cx, cy), radius, (245, 200, 95), 3, lineType=cv2.LINE_AA)
            return self._draw_hud_badge(canvas, "PLANCK-SCALE HORIZON PIXELS", "EVENT HORIZON AREA  |  Lp = 1.6 x 10^-35 METERS")

        if concept_id == "earth_mote_of_dust":
            earth = self._get_bgr_image("nasa_earth_night.jpg")
            canvas = self._starfield_canvas(progress * 0.35)
            if earth is not None:
                # Subtle pull-back so Earth feels like a fragile mote in vast darkness
                scale = 0.72 - 0.16 * progress
                ew = int(OUT_W * scale)
                eh = int(earth.shape[0] * (ew / earth.shape[1]))
                e_res = cv2.resize(earth, (ew, eh), interpolation=cv2.INTER_LINEAR)
                x0 = (OUT_W - ew) // 2
                y0 = 830 - eh // 2
                # Radial feather around Earth disc
                yy, xx = np.ogrid[0:eh, 0:ew]
                dist = np.sqrt(((xx - ew / 2) / (ew * 0.46)) ** 2 + ((yy - eh / 2) / (eh * 0.48)) ** 2)
                alpha = np.clip(1.35 - dist, 0.0, 1.0)[..., None].astype(np.float32)
                dst = canvas[y0:y0 + eh, x0:x0 + ew].astype(np.float32)
                canvas[y0:y0 + eh, x0:x0 + ew] = np.clip(dst * (1.0 - alpha) + e_res.astype(np.float32) * alpha, 0, 255).astype(np.uint8)
            return self._draw_hud_badge(canvas, "A MOTE OF DUST", "EARTH FROM ORBIT  |  NASA EARTH OBSERVATORY")

        if concept_id == "milky_way_400b":
            mw = self._get_bgr_image("nasa_milky_way_core.jpg")
            if mw is not None:
                canvas = self._ken_burns_cover(mw, progress, zoom_start=1.05, zoom_end=1.18, pan_x=0.04)
                return self._draw_hud_badge(canvas, "THE MILKY WAY GALAXY", "400 BILLION STARS  |  NASA CHANDRA & MEERKAT")

        if concept_id == "jwst_two_trillion_galaxies":
            jwst = self._get_bgr_image("nasa_jwst_deep_field.jpg")
            if jwst is None:
                jwst = self._get_bgr_image("nasa_hubble_ultra_deep_field.jpg")
            if jwst is not None:
                canvas = self._ken_burns_cover(jwst, progress, zoom_start=1.22, zoom_end=1.03, pan_x=-0.03)
                return self._draw_hud_badge(canvas, "2 TRILLION GALAXIES", "WEBB FIRST DEEP FIELD (SMACS 0723)  |  NASA / ESA / CSA")

        return self._starfield_canvas(progress)
