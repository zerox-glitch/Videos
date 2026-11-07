#!/usr/bin/env python3
"""
audio_engine.py — Broadcast voice cleanup, click-free EDL pause splicing,
warm ambient documentary underscore with speech-envelope sidechain ducking,
restrained B-roll reveal cues, and -14 LUFS loudness mastering.
"""
import math
import subprocess
import wave
from pathlib import Path
from typing import Dict, List, Tuple

import imageio_ffmpeg
import numpy as np
from scipy.signal import butter, sosfiltfilt

SAMPLE_RATE = 48000


def _decode_cleaned_stereo_pcm(src_mp4: Path, tmp_wav: Path) -> np.ndarray:
    """Decodes source audio at 48kHz stereo with rumble highpass & gentle FFT denoise."""
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ff, "-y", "-nostats", "-loglevel", "error",
            "-i", str(src_mp4),
            "-vn",
            "-af", "highpass=f=75,lowpass=f=15500,afftdn=nf=-26",
            "-ar", str(SAMPLE_RATE),
            "-ac", "2",
            "-acodec", "pcm_s16le",
            str(tmp_wav),
        ],
        check=True,
    )
    with wave.open(str(tmp_wav), "rb") as wf:
        n_frames = wf.getnframes()
        raw = wf.readframes(n_frames)
    pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    return pcm.reshape(-1, 2)


def splice_edl_segments(
    full_pcm: np.ndarray,
    edl: List[Tuple[float, float]],
    xfade_ms: float = 24.0,
) -> np.ndarray:
    """
    Splices EDL (start, end) intervals while preserving EXACT timeline duration
    `sum(e - s for s, e in edl)` so video frames and word timestamps never drift!
    Uses short pre/post handles from source audio around each cut for click-free
    raised-cosine crossfades.
    """
    n_total = full_pcm.shape[0]
    half_xf = int(SAMPLE_RATE * (xfade_ms / 1000.0) * 0.5)

    pieces: List[np.ndarray] = []
    for idx, (s_sec, e_sec) in enumerate(edl):
        s_i = max(0, min(n_total - 1, int(round(s_sec * SAMPLE_RATE))))
        e_i = max(s_i + 1, min(n_total, int(round(e_sec * SAMPLE_RATE))))
        seg = full_pcm[s_i:e_i].copy()

        # Apply smooth micro-fade at interior edit boundaries if source handle unavailable,
        # or cross-blend using pre-roll from source audio to eliminate any waveform step!
        if idx > 0 and seg.shape[0] > half_xf * 2 and s_i >= half_xf:
            prev_end_i = max(0, min(n_total, int(round(edl[idx - 1][1] * SAMPLE_RATE))))
            if prev_end_i + half_xf <= n_total and pieces and pieces[-1].shape[0] > half_xf * 2:
                # Blend tail of previous segment with continuation, and head of current segment
                t = np.linspace(0.0, 1.0, half_xf * 2, dtype=np.float32)[:, None]
                w_in = 0.5 - 0.5 * np.cos(math.pi * t)
                w_out = 1.0 - w_in
                prev_tail_ext = full_pcm[prev_end_i - half_xf:prev_end_i + half_xf]
                curr_head_ext = full_pcm[s_i - half_xf:s_i + half_xf]
                if prev_tail_ext.shape[0] == half_xf * 2 and curr_head_ext.shape[0] == half_xf * 2:
                    blended = prev_tail_ext * w_out + curr_head_ext * w_in
                    pieces[-1][-half_xf:] = blended[:half_xf]
                    seg[:half_xf] = blended[half_xf:]

        pieces.append(seg)

    out = np.concatenate(pieces, axis=0) if pieces else np.zeros((SAMPLE_RATE, 2), dtype=np.float32)

    # Gentle clip fade-in (35ms) and fade-out (200ms)
    fi = min(int(0.035 * SAMPLE_RATE), out.shape[0] // 4)
    fo = min(int(0.200 * SAMPLE_RATE), out.shape[0] // 4)
    if fi > 0:
        out[:fi] *= np.linspace(0.0, 1.0, fi, dtype=np.float32)[:, None]
    if fo > 0:
        out[-fo:] *= np.linspace(1.0, 0.0, fo, dtype=np.float32)[:, None]

    return out


def synthesize_documentary_bed(
    n_samples: int,
    broll_schedule: List[Dict],
    seed_offset: int = 0,
) -> np.ndarray:
    """
    Synthesizes a warm, restrained ambient documentary pad (below vocal formant band)
    plus subtle, deep harmonic swells on B-roll visual reveals.
    """
    t = np.arange(n_samples, dtype=np.float32) / SAMPLE_RATE

    # Warm D-minor9 / F-major7 cosmic chord sets depending on clip mood
    chord_sets = [
        [73.42, 110.00, 146.83, 174.61, 220.00, 329.63],  # D2, A2, D3, F3, A3, E4
        [65.41, 98.00, 130.81, 164.81, 196.00, 293.66],   # C2, G2, C3, E3, G3, D4
        [87.31, 130.81, 174.61, 220.00, 261.63, 329.63],  # F2, C3, F3, A3, C4, E4
    ]
    freqs = chord_sets[seed_offset % len(chord_sets)]

    left = np.zeros(n_samples, dtype=np.float32)
    right = np.zeros(n_samples, dtype=np.float32)

    for idx, f in enumerate(freqs):
        lfo_l = 0.65 + 0.35 * np.sin(2.0 * math.pi * (0.06 + 0.017 * idx) * t + idx * 0.9)
        lfo_r = 0.65 + 0.35 * np.cos(2.0 * math.pi * (0.055 + 0.019 * idx) * t + idx * 1.4)
        amp = 1.0 / (1.0 + idx * 0.55)
        wave_a = np.sin(2.0 * math.pi * f * t)
        wave_b = np.sin(2.0 * math.pi * (f * 1.0025) * t + 0.7)
        left += amp * lfo_l * (0.7 * wave_a + 0.3 * wave_b)
        right += amp * lfo_r * (0.3 * wave_a + 0.7 * wave_b)

    pad = np.stack([left, right], axis=1)
    # Warm low-pass filter at 720 Hz so pad never masks speech clarity (1-4 kHz)
    sos = butter(3, 720.0 / (SAMPLE_RATE * 0.5), btype="low", output="sos")
    pad = sosfiltfilt(sos, pad, axis=0).astype(np.float32)
    pad /= max(1e-6, float(np.max(np.abs(pad))))

    # Subtle B-roll reveal harmonic swells (max 3 cues, very restrained)
    cues = np.zeros_like(pad)
    root_f = freqs[1]
    for b in broll_schedule[:4]:
        c_time = float(b["start"])
        c_center = int(c_time * SAMPLE_RATE)
        win_len = int(0.85 * SAMPLE_RATE)
        i0 = max(0, c_center - win_len // 2)
        i1 = min(n_samples, i0 + win_len)
        if i1 - i0 < 400:
            continue
        lt = np.arange(i1 - i0, dtype=np.float32) / SAMPLE_RATE
        dur = (i1 - i0) / SAMPLE_RATE
        env = np.sin(math.pi * (lt / dur)) ** 2.0
        # Soft octave fifth swell, zero harshness
        swell_l = env * (0.65 * np.sin(2.0 * math.pi * root_f * lt) + 0.35 * np.sin(2.0 * math.pi * (root_f * 3.0) * lt))
        swell_r = env * (0.65 * np.sin(2.0 * math.pi * (root_f * 1.003) * lt) + 0.35 * np.sin(2.0 * math.pi * (root_f * 2.997) * lt))
        cues[i0:i1, 0] += swell_l * 0.032
        cues[i0:i1, 1] += swell_r * 0.032

    # Fade pad smoothly in (1.2s) and out (1.4s)
    fi = min(int(1.2 * SAMPLE_RATE), n_samples // 4)
    fo = min(int(1.4 * SAMPLE_RATE), n_samples // 4)
    if fi > 0:
        pad[:fi] *= np.linspace(0.0, 1.0, fi, dtype=np.float32)[:, None]
    if fo > 0:
        pad[-fo:] *= np.linspace(1.0, 0.0, fo, dtype=np.float32)[:, None]

    return pad, cues


def build_mastered_audio(
    src_mp4: Path,
    edl: List[Tuple[float, float]],
    broll_schedule: List[Dict],
    out_wav: Path,
    seed_offset: int = 0,
    enable_music: bool = True,
) -> Path:
    """
    Produces the final mastered 48kHz stereo WAV for a Short:
      - Cleaned, EDL-spliced speech
      - Speech-envelope sidechain-ducked ambient score + restrained B-roll swells
      - EBU R128 loudness normalized (-14 LUFS, -1.5 dBTP)
    """
    tmp_clean = out_wav.with_suffix(".clean.wav")
    tmp_premix = out_wav.with_suffix(".premix.wav")

    full_pcm = _decode_cleaned_stereo_pcm(src_mp4, tmp_clean)
    voice = splice_edl_segments(full_pcm, edl)
    n_samples = voice.shape[0]

    if enable_music:
        pad, cues = synthesize_documentary_bed(n_samples, broll_schedule, seed_offset=seed_offset)

        # Compute smooth speech envelope for automatic sidechain ducking
        mono_abs = np.mean(np.abs(voice), axis=1)
        win = int(0.18 * SAMPLE_RATE)
        kernel = np.ones(win, dtype=np.float32) / max(1, win)
        speech_env = np.convolve(mono_abs, kernel, mode="same")
        speech_active = np.clip(speech_env / (np.percentile(speech_env, 85) + 1e-6), 0.0, 1.0)

        # Duck music down to ~0.035 amplitude under active speech, ~0.072 in pauses
        duck_gain = (0.072 - 0.038 * speech_active)[:, None].astype(np.float32)
        mix = voice + pad * duck_gain + cues
    else:
        mix = voice

    peak = float(np.max(np.abs(mix)))
    if peak > 0.96:
        mix *= 0.96 / peak

    pcm16 = np.clip(mix * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(str(tmp_premix), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm16.tobytes())

    # Broadcast EBU R128 loudness normalization (-14 LUFS, -1.5 dBTP)
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ff, "-y", "-nostats", "-loglevel", "error",
            "-i", str(tmp_premix),
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
            "-ar", str(SAMPLE_RATE),
            "-ac", "2",
            "-acodec", "pcm_s16le",
            str(out_wav),
        ],
        check=True,
    )

    for p in (tmp_clean, tmp_premix):
        if p.exists():
            p.unlink()

    return out_wav
