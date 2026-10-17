#!/usr/bin/env python3
"""Procedural sound design for the demo.

Reads plan/beats.json (the same cue sheet that drives the picture), synthesises
every effect locally with NumPy, mixes to stereo, then measures and normalises
to -14 LUFS integrated / -1.5 dBTP with FFmpeg's loudnorm.

No samples are downloaded, no API keys are used, nothing leaves the machine.

    python3 scripts/sound.py
"""
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
FFMPEG = os.environ.get("MVD_FFMPEG", "ffmpeg")

rng = np.random.default_rng(20261017)


def axis(dur):
    return np.arange(int(round(dur * SR))) / SR


def fft_band(x, fc, octaves=1.0):
    """Gaussian band-pass in the log-frequency domain (fast, zero-phase)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    lf = np.log2(np.maximum(f, 1.0))
    g = np.exp(-0.5 * ((lf - np.log2(fc)) / (octaves / 2)) ** 2)
    return np.fft.irfft(X * g, len(x))


def svf_band(noise, cutoffs, q=0.6):
    """Time-varying state-variable band-pass (one pass, deterministic)."""
    low = band = 0.0
    out = np.empty_like(noise)
    for i in range(len(noise)):
        F = 2.0 * np.sin(np.pi * min(cutoffs[i], SR / 6) / SR)
        high = noise[i] - low - q * band
        band += F * high
        low += F * band
        out[i] = band
    return out


def fade(x, attack=0.002, release=0.01):
    a = int(attack * SR)
    r = int(release * SR)
    if a > 0:
        x[:a] *= np.linspace(0, 1, a)
    if r > 0 and r < len(x):
        x[-r:] *= np.linspace(1, 0, r)
    return x


def attack_shape(x, ms=1.5):
    n = max(1, int(ms * SR / 1000))
    x[:n] *= np.linspace(0, 1, n)
    return x


# ---------------------------------------------------------------- recipes
def tick(dur=0.09, f0=2600.0, bright=1.0):
    t = axis(dur)
    n = rng.standard_normal(len(t))
    body = fft_band(n, f0, 1.4) * np.exp(-t / 0.010)
    tone = np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.018)
    x = bright * body + 0.6 * tone
    return attack_shape(fade(x / (np.max(np.abs(x)) + 1e-9), 0.0008, 0.01), 0.8) * 0.55


def impact(dur=1.0):
    t = axis(dur)
    f = 44 + 120 * np.exp(-t * 16)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t * 3.6)
    sub = np.sin(2 * np.pi * 31 * t) * np.exp(-t * 2.4)
    click = fft_band(rng.standard_normal(len(t)), 3200, 2.2) * np.exp(-t / 0.005)
    x = np.tanh(1.9 * (0.85 * body + 0.45 * sub)) + 0.32 * click
    return fade(x / (np.max(np.abs(x)) + 1e-9), 0.001, 0.09) * 0.9


def thud(dur=0.4):
    t = axis(dur)
    f = 95 + 40 * np.exp(-t * 20)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    knock = fft_band(rng.standard_normal(len(t)), 900, 1.6) * np.exp(-t / 0.02)
    x = 0.7 * body + 0.5 * knock
    return fade(x / (np.max(np.abs(x)) + 1e-9), 0.001, 0.05) * 0.75


def whoosh(dur=0.8):
    n = rng.standard_normal(int(dur * SR))
    u = np.linspace(0, 1, len(n))
    cut = 260 * (4200 / 260) ** np.sin(np.pi * u) ** 1.4
    x = svf_band(n, cut, q=0.55)
    env = np.sin(np.pi * u) ** 1.8
    x = x * env
    x = np.tanh(x * 1.6)
    return fade(x / (np.max(np.abs(x)) + 1e-9), 0.05, 0.12) * 0.6


def riser(dur=1.8):
    t = axis(dur)
    u = t / dur
    n = rng.standard_normal(len(t))
    cut = 380 * (7000 / 380) ** (u ** 1.5)
    noise = svf_band(n, cut, q=0.9)
    sweep = np.sin(2 * np.pi * np.cumsum(160 * (5.4 ** u)) / SR)
    env = u ** 2.2
    x = (0.75 * noise * env + 0.25 * sweep * env ** 1.4)
    x = np.tanh(x * 1.3)
    return fade(x / (np.max(np.abs(x)) + 1e-9), 0.15, 0.03) * 0.55


def chime(dur=1.6):
    t = axis(dur)
    f0 = 1046.5
    partials = [(1.0, 1.0, 0.9), (2.01, 0.45, 0.5), (3.02, 0.22, 0.32), (4.97, 0.1, 0.2)]
    x = np.zeros_like(t)
    for ratio, amp, tau in partials:
        x += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t / tau)
        x += amp * 0.35 * np.sin(2 * np.pi * f0 * ratio * 1.003 * t) * np.exp(-t / tau)
    return attack_shape(fade(x / (np.max(np.abs(x)) + 1e-9), 0.003, 0.15), 2.0) * 0.5


def draw(dur=2.2):
    t = axis(dur)
    u = t / dur
    n = rng.standard_normal(len(t))
    cut = 500 * (2600 / 500) ** u
    x = svf_band(n, cut, q=0.8) * np.sin(np.pi * u) ** 2
    return fade(x / (np.max(np.abs(x)) + 1e-9), 0.3, 0.4) * 0.4


def shimmer(dur=2.8):
    t = axis(dur)
    x = np.zeros_like(t)
    for i, f in enumerate([2637, 3136, 3520, 4186, 4699]):
        ph = rng.uniform(0, 2 * np.pi)
        x += (0.5 + 0.5 * np.sin(2 * np.pi * 5.2 * t + ph)) * np.sin(2 * np.pi * f * t + ph) / (i + 2)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return fade(x * env, 0.4, 0.6) * 0.3


def typewriter(dur=0.95):
    out = np.zeros(int(dur * SR))
    step = 0.062
    t0 = 0.0
    i = 0
    while t0 < dur - 0.05:
        c = tick(0.05, 3600 + rng.uniform(-400, 600), 0.7)
        j = int(t0 * SR)
        out[j:j + len(c)] += c * (0.55 + 0.45 * rng.random())
        t0 += step * (0.8 + 0.4 * rng.random())
        i += 1
    return fade(out, 0.002, 0.02)


RECIPES = {
    "tick": lambda: tick(0.09, 2600, 1.0),
    "tick_hi": lambda: tick(0.07, 4200, 0.8),
    "impact": impact,
    "thud": thud,
    "whoosh": whoosh,
    "riser": riser,
    "chime": chime,
    "draw": draw,
    "shimmer": shimmer,
    "type": typewriter,
}


def load_beats():
    with open(os.path.join(ROOT, "plan", "beats.json")) as f:
        return json.load(f)


def pan_gains(pan):
    a = (pan + 1) * np.pi / 4
    return float(np.cos(a)), float(np.sin(a))


def build_mix(beats):
    total = beats["format"]["duration"]
    n = int(total * SR)
    mix = np.zeros((n, 2), dtype=np.float64)
    cache = os.path.join(ROOT, "cache", "sfx")
    os.makedirs(cache, exist_ok=True)

    for name in sorted({c["sound"] for c in beats["cues"]}):
        snd = RECIPES[name]()
        _write_wav(os.path.join(cache, f"{name}.wav"), np.stack([snd, snd], 1) * 0.5)

    for cue in beats["cues"]:
        snd = RECIPES[cue["sound"]]()
        if cue.get("duration") and cue["sound"] != "type":
            snd = RECIPES[cue["sound"]]()
        start = int(round(cue["t"] * SR))
        end = min(n, start + len(snd))
        if start >= n:
            continue
        seg = snd[: end - start]
        gl, gr = pan_gains(cue.get("pan", 0.0) or 0.0)
        gain = cue.get("gain", 0.3)
        mix[start:end, 0] += seg * gain * gl
        mix[start:end, 1] += seg * gain * gr

    peak = np.max(np.abs(mix))
    if peak > 0:
        mix *= 0.7 / peak
    return mix


def _write_wav(path, stereo):
    data = np.clip(stereo, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def loudnorm(raw_path, out_path):
    print("  measuring loudness …")
    probe = subprocess.run(
        [FFMPEG, "-hide_banner", "-nostats", "-i", raw_path,
         "-af", "loudnorm=I=-14:TP=-2.1:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    )
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", probe.stderr, re.S)
    if not m:
        raise RuntimeError("Could not parse loudnorm output")
    stats = json.loads(m.group(0))
    print(f"  measured: I={stats['input_i']} LUFS · TP={stats['input_tp']} dBTP · LRA={stats['input_lra']} LU")

    af = (
        "loudnorm=I=-14:TP=-2.1:LRA=11"
        f":measured_I={stats['input_i']}:measured_TP={stats['input_tp']}"
        f":measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}"
        f":offset={stats['target_offset']}:linear=true"
    )
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", raw_path,
         "-af", af, "-ar", str(SR), "-c:a", "pcm_s24le", out_path],
        check=True,
    )
    check = subprocess.run(
        [FFMPEG, "-hide_banner", "-nostats", "-i", out_path,
         "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    tail = check.stderr.strip().splitlines()[-12:]
    print("  final:")
    for line in tail:
        if "I:" in line or "Peak:" in line or "LRA:" in line:
            print("   ", line.strip())


def main():
    beats = load_beats()
    print(f"  cue sheet: {len(beats['cues'])} cues over {beats['format']['duration']}s")
    mix = build_mix(beats)
    raw = os.path.join(ROOT, "cache", "mix_raw.wav")
    os.makedirs(os.path.dirname(raw), exist_ok=True)
    _write_wav(raw, mix)
    out = os.path.join(ROOT, "assets", "mix.wav")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    loudnorm(raw, out)
    print(f"  mix → {out}")


if __name__ == "__main__":
    sys.exit(main())
