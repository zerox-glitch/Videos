#!/usr/bin/env python3
"""NEON GENESIS — procedural score + sound design (30 s, stereo 48 kHz).

Everything is synthesised: sub booms, ion whooshes, city construction,
bike engine, moon drone, reversed impacts, title hit.
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(20261017)

L = np.zeros(N)
R = np.zeros(N)
SEND = np.zeros(N)          # reverb send


# ------------------------------------------------------------------ utils
def tt(n):
    return np.arange(n) / SR


def noise(n):
    return rng.standard_normal(n)


def filt(x, kind, f, order=2):
    if kind == 'band':
        sos = butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype='bandpass', output='sos')
    else:
        sos = butter(order, f / (SR / 2), btype=kind, output='sos')
    return sosfilt(sos, x)


def env(t, a=0.01, d=0.3, curve=1.0, sustain=0.0):
    at = np.clip(t / max(a, 1e-4), 0, 1)
    de = np.exp(-np.power(np.maximum(t - a, 0) / max(d, 1e-4), curve))
    return at * de


def place(sig, at, gain=1.0, pan=0.0, send=0.0):
    """Mix a mono signal into the stereo bus at time `at` (seconds)."""
    i = int(at * SR)
    if i >= N:
        return
    n = min(len(sig), N - i)
    if n <= 0:
        return
    s = sig[:n] * gain
    gl = np.cos((pan + 1) * np.pi / 4)
    gr = np.sin((pan + 1) * np.pi / 4)
    L[i:i + n] += s * gl
    R[i:i + n] += s * gr
    if send:
        SEND[i:i + n] += s * send


# --------------------------------------------------------------- elements
def sub_boom(dur=3.2, f=38, drop=7, decay=0.9, click=1.0):
    n = int(dur * SR)
    t = tt(n)
    fr = f * (1 + drop * np.exp(-t / 0.06))
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / decay)
    sub = np.sin(2 * np.pi * (f * 0.5) * t) * np.exp(-t / (decay * 2.2))
    sig = body + 0.7 * sub
    if click:
        c = filt(noise(n), 'band', (700, 5200)) * np.exp(-t / 0.028)
        sig += c * 0.55 * click
    sig *= np.clip(t / 0.004, 0, 1)
    return np.tanh(sig * 1.25)


def metal_hit(f=220, dur=1.4, decay=0.35, bright=1.0):
    n = int(dur * SR)
    t = tt(n)
    ratios = [1, 2.76, 5.4, 8.93, 13.3]
    sig = np.zeros(n)
    for i, rr in enumerate(ratios):
        sig += np.sin(2 * np.pi * f * rr * t + i * 1.7) * np.exp(-t / (decay / (1 + i * 0.8))) / (1 + i * 0.9)
    sig += filt(noise(n), 'high', 2200) * np.exp(-t / 0.03) * 0.4 * bright
    return sig * np.clip(t / 0.002, 0, 1)


def whoosh(dur=1.2, f0=200, f1=3000, curve=1.0, width=1.0, gain=1.0):
    n = int(dur * SR)
    t = tt(n)
    u = np.clip(t / dur, 0, 1) ** curve
    centers = [f0 * (f1 / f0) ** (u[i]) for i in range(0, n, 512)]
    centers = np.repeat(np.array(centers), 512)[:n]
    src = noise(n)
    out = np.zeros(n)
    bands = 6
    for k in range(bands):
        fc = f0 * (f1 / f0) ** (k / (bands - 1))
        lo = fc / (1.6 ** width)
        hi = min(fc * (1.6 ** width), SR / 2 - 200)
        if hi <= lo:
            continue
        b = filt(src, 'band', (lo, hi))
        # mask: how close the sweep is to this band
        w = np.exp(-np.power(np.log(np.maximum(centers, 1) / fc) / (0.5 * width), 2))
        out += b * w
    envl = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.4
    return out * envl * gain


def riser(dur=2.0, f0=90, f1=1400, shape=1.0):
    n = int(dur * SR)
    t = tt(n)
    u = t / dur
    fr = f0 * (f1 / f0) ** (u ** shape)
    saw = 2 * ((np.cumsum(fr) / SR) % 1.0) - 1
    saw = filt(saw, 'low', 2400, 2)
    nz = filt(noise(n), 'band', (400, 9000))
    envl = u ** 2.2
    return (saw * 0.5 + nz * 0.55) * envl


def pad(freqs, dur, attack=1.2, release=1.6, detune=0.004, cutoff=1800, gain=1.0):
    n = int(dur * SR)
    t = tt(n)
    sig = np.zeros(n)
    for f in freqs:
        for d in (-1, 0, 1):
            ph = rng.uniform(0, 6.28)
            sig += 2 * (((f * (1 + d * detune)) * t + ph / 6.28) % 1.0) - 1
    sig /= (len(freqs) * 3)
    sig = filt(sig, 'low', cutoff, 2)
    envl = np.clip(t / attack, 0, 1) * np.clip((dur - t) / release, 0, 1)
    return sig * envl * gain


def sparkle(n=1, fmin=1200, fmax=5200):
    out = np.zeros(int(0.25 * SR))
    for _ in range(n):
        f = rng.uniform(fmin, fmax)
        m = int(0.22 * SR)
        t = tt(m)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t / rng.uniform(0.02, 0.09))
        i = rng.integers(0, len(out) - m)
        out[i:i + m] += s * rng.uniform(0.3, 1.0)
    return out


def engine(dur, speed_curve):
    """speed_curve(t)-> 0..1 multiplier"""
    n = int(dur * SR)
    t = tt(n)
    sp = speed_curve(t)
    base = 46 + 58 * sp
    ph = np.cumsum(base) / SR
    saw = 2 * (ph % 1.0) - 1
    saw2 = 2 * ((ph * 1.5) % 1.0) - 1
    grind = filt(noise(n), 'band', (180, 2400))
    am = 0.65 + 0.35 * np.sin(2 * np.pi * np.cumsum(base * 0.5) / SR)
    sig = (saw * 0.45 + saw2 * 0.2 + grind * 0.5) * am
    sig = filt(sig, 'low', 3200, 2)
    envl = np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
    return sig * envl


def glitch_burst(dur=0.4, bits=5):
    n = int(dur * SR)
    x = noise(n)
    x = np.round(x * (2 ** bits)) / (2 ** bits)
    x *= (rng.random(n) > 0.35)
    t = tt(n)
    return x * np.exp(-t / (dur * 0.5))


def reverse_impact(dur=1.2, f=60):
    n = int(dur * SR)
    t = tt(n)
    rev = np.exp(-np.power((dur - t) / (dur * 0.55), 2))
    fr = f * (1 + 3 * (t / dur) ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(fr) / SR)
    nz = filt(noise(n), 'band', (200, 4000))
    return (tone * 0.6 + nz * 0.4) * rev


def tick(f=2600, dur=0.06):
    n = int(dur * SR)
    t = tt(n)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012)


def tinnitus(dur=2.0, f=6800):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 1.5 * t)) * np.clip(t / 0.2, 0, 1) * np.clip((dur - t) / 0.6, 0, 1) * 0.5


# ------------------------------------------------------------------ score
# 0 — ignition
place(sub_boom(3.0, 30, 4, 1.6, 0.3), 0.0, 0.30, 0, 0.1)
place(pad([55, 82.5], 3.2, attack=1.9, release=0.8, cutoff=400, gain=0.5), 0.0, 0.42, 0, 0.2)
place(np.sin(2 * np.pi * 1240 * tt(int(1.4 * SR))) * np.exp(-tt(int(1.4 * SR)) / 0.35), 0.55, 0.22, 0.1, 0.9)
place(sparkle(14, 1600, 6400), 0.62, 0.35, -0.3, 1.0)
for i in range(16):
    at = 0.85 + i * 0.085
    place(sparkle(3, 2000, 8000), at, 0.10 + i * 0.006, np.sin(i) * 0.7, 1.0)
place(riser(1.6, 120, 2200, 1.6), 1.5, 0.30, 0, 0.5)
# ticking pulse
for i in range(9):
    place(tick(1800 + i * 90, 0.05), 1.2 + i * 0.18, 0.07 + i * 0.006, -0.2, 0.4)
# implosion
place(reverse_impact(0.75, 90), 2.35, 0.75, 0, 0.3)
place(whoosh(0.5, 6000, 200, 0.6), 2.6, 0.5, 0, 0.2)
place(sub_boom(1.3, 45, 5, 0.28), 3.05, 0.85, 0, 0.25)
place(metal_hit(180, 0.9, 0.18), 3.05, 0.35, 0.2, 0.6)

# 3.42 — the impact
place(sub_boom(4.2, 36, 9, 1.15, 1.0), 3.42, 1.15, 0, 0.35)
place(metal_hit(70, 2.6, 0.8, 1.0), 3.42, 0.5, 0, 0.9)
place(whoosh(2.2, 120, 7000, 0.45, 1.4), 3.40, 0.55, 0, 0.4)
place(reverse_impact(0.5, 140), 3.20, 0.4, 0, 0.4)
for i in range(10):
    place(sparkle(4, 900, 7000), 3.55 + rng.random() * 0.9, 0.10, rng.uniform(-0.9, 0.9), 1.0)

# 4.0–9.4 construction
place(pad([41.2, 61.7, 82.4], 5.6, attack=0.6, release=1.2, cutoff=900, gain=0.65), 4.0, 0.5, 0, 0.35)
place(riser(5.4, 60, 900, 1.3), 4.0, 0.24, 0, 0.3)
# metallic construction clanks, denser over time
clank_times = np.sort(4.35 + np.random.default_rng(7).random(46) ** 0.7 * 4.7)
for i, at in enumerate(clank_times):
    f = np.random.default_rng(100 + i).uniform(180, 900)
    place(metal_hit(f, 0.7, 0.14, 0.8), at, 0.035 + 0.05 * (i / len(clank_times)), np.random.default_rng(200 + i).uniform(-0.8, 0.8), 0.6)
# power-up swell
place(riser(3.4, 200, 3000, 2.0), 5.4, 0.20, 0, 0.5)
place(sub_boom(1.6, 52, 3, 0.5, 0.4), 8.9, 0.45, 0, 0.4)
place(whoosh(1.4, 300, 6000, 1.5), 8.8, 0.4, 0, 0.4)

# 10.0 dive
place(whoosh(1.3, 5000, 150, 0.55, 1.2), 10.0, 0.75, 0, 0.5)
place(sub_boom(1.5, 40, 4, 0.4, 0.3), 10.05, 0.5, 0, 0.3)
# 10.9–16 bike
def speed(t):
    return np.clip(0.15 + t / 6.2 + 0.25 * np.exp(-np.power((t - 4.3) / 0.8, 2)), 0, 1.6)
place(engine(5.4, speed), 10.55, 0.5, 0.05, 0.25)
# wind
n_w = int(5.6 * SR)
tw = tt(n_w)
wind = filt(noise(n_w), 'band', (300, 3000)) * (0.25 + 0.35 * np.clip(tw / 5.6, 0, 1))
place(wind, 10.4, 0.30, 0, 0.3)
# pass-bys
for at, f0, f1 in [(11.4, 900, 5000), (12.6, 1200, 6000), (14.0, 700, 4000)]:
    place(whoosh(0.55, f0, f1, 0.8, 0.7), at, 0.36, rng.uniform(-0.7, 0.7), 0.5)
# near miss + speed ramp
place(whoosh(0.42, 500, 8000, 0.4, 0.5), 14.62, 0.75, -0.8, 0.4)
place(riser(1.5, 150, 2400, 1.2), 14.3, 0.34, 0, 0.4)
place(sub_boom(1.8, 44, 4, 0.55, 0.5), 15.4, 0.5, 0, 0.35)

# 16.0 launch
place(whoosh(1.9, 200, 9000, 2.2, 1.0), 15.95, 0.7, 0, 0.55)
place(riser(1.9, 70, 1200, 1.1), 16.0, 0.4, 0, 0.5)
place(sub_boom(2.2, 38, 5, 0.7, 0.3), 16.1, 0.55, 0, 0.3)

# 17.4 moon reveal
place(sub_boom(5.0, 33, 6, 1.9, 1.0), 17.35, 1.05, 0, 0.5)
place(metal_hit(55, 4.0, 1.6, 0.6), 17.35, 0.5, 0, 1.0)
place(whoosh(2.6, 80, 5000, 1.1, 1.6), 17.3, 0.45, 0, 0.6)
# choir-ish pad progression
chords = [
    ([73.4, 110.0, 146.8, 220.0], 2.0),   # Dm
    ([58.3, 87.3, 116.5, 174.6], 2.1),    # Bb
    ([87.3, 130.8, 174.6, 261.6], 2.3),   # F
    ([65.4, 98.0, 130.8, 196.0], 1.8),    # C
]
at = 17.4
for ch, dur in chords:
    place(pad(ch, dur + 0.8, attack=0.9, release=1.2, cutoff=1600, gain=0.55), at, 0.34, 0, 0.9)
    place(pad([f * 2 for f in ch], dur + 0.6, attack=1.2, release=1.0, cutoff=3000, gain=0.35), at, 0.16, 0, 1.0)
    at += dur
place(sparkle(10, 2000, 9000), 18.2, 0.14, 0, 1.0)
place(metal_hit(340, 3.0, 1.1, 1.2), 20.1, 0.28, 0.3, 1.0)
place(np.sin(2 * np.pi * 1760 * tt(int(2.4 * SR))) * env(tt(int(2.4 * SR)), 0.02, 0.6), 20.1, 0.10, -0.2, 1.0)
place(sparkle(16, 3000, 11000), 20.1, 0.16, 0, 1.0)

# 22.2 pulse / 22.55 freeze
place(reverse_impact(0.8, 70), 21.5, 0.8, 0, 0.6)
place(sub_boom(1.8, 40, 8, 0.5, 1.0), 22.2, 0.95, 0, 0.4)
place(whoosh(0.9, 4000, 200, 0.5, 1.2), 22.2, 0.6, 0, 0.3)
place(tinnitus(1.6), 22.5, 0.16, 0, 0.4)

# 23.2–25.9 collapse
for i in range(9):
    place(reverse_impact(0.5 + i * 0.05, 55 + i * 6), 23.1 + i * 0.16, 0.22, rng.uniform(-0.6, 0.6), 0.6)
for i in range(14):
    place(glitch_burst(0.2), 23.0 + rng.random() * 2.4, 0.10, rng.uniform(-0.9, 0.9), 0.5)
place(riser(2.6, 40, 900, 2.4), 23.1, 0.35, 0, 0.5)
place(whoosh(3.0, 6000, 90, 2.2, 1.4), 23.0, 0.5, 0, 0.4)
place(sub_boom(2.4, 30, 5, 0.9, 0.4), 25.5, 0.75, 0, 0.4)
# 25.9 chip lock
place(metal_hit(880, 1.6, 0.22, 1.4), 25.9, 0.32, 0, 0.8)
place(np.sin(2 * np.pi * 220 * tt(int(1.2 * SR))) * env(tt(int(1.2 * SR)), 0.03, 0.35), 25.9, 0.16, 0, 0.5)
for i in range(10):
    place(sparkle(3, 2000, 9000), 25.9 + i * 0.08, 0.08, rng.uniform(-0.8, 0.8), 1.0)

# 27.3 title hit
place(sub_boom(2.6, 34, 7, 1.2, 1.0), 27.3, 1.0, 0, 0.5)
place(metal_hit(48, 2.8, 1.2, 0.7), 27.3, 0.42, 0, 1.0)
place(pad([36.7, 55.0, 73.4, 110.0], 2.4, attack=0.15, release=1.0, cutoff=700, gain=0.6), 27.3, 0.34, 0, 0.7)
place(whoosh(1.2, 8000, 400, 0.4, 1.0), 27.28, 0.35, 0, 0.5)
# electrical resonance
for i in range(22):
    f = rng.uniform(1800, 7000)
    m = int(0.09 * SR)
    s = np.sin(2 * np.pi * f * tt(m)) * np.exp(-tt(m) / 0.02)
    place(s, 27.35 + rng.random() * 2.0, 0.028, rng.uniform(-0.8, 0.8), 1.0)
# tagline pulse
place(sub_boom(1.6, 42, 4, 0.6, 0.3), 28.1, 0.5, 0, 0.4)
place(np.sin(2 * np.pi * 330 * tt(int(1.4 * SR))) * env(tt(int(1.4 * SR)), 0.01, 0.5), 28.1, 0.08, 0, 1.0)
# 29.35 final pulse
place(riser(0.5, 300, 5000), 29.3, 0.22, 0, 0.5)
place(whoosh(0.35, 9000, 900, 0.4, 0.6), 29.35, 0.3, 0, 0.3)

# 29.78 final bass hit + cut
place(sub_boom(1.4, 30, 6, 0.55, 1.0), 29.78, 1.25, 0, 0.35)
place(metal_hit(60, 0.6, 0.12, 0.6), 29.78, 0.4, 0, 0.7)

# ------------------------------------------------------------------ mix
# reverb: synthetic IR, FFT convolution
ir_n = int(2.6 * SR)
tir = tt(ir_n)
ir = noise(ir_n) * np.exp(-tir / 0.55)
ir = filt(ir, 'low', 6000)
ir[:int(0.012 * SR)] = 0
ir /= np.max(np.abs(ir)) + 1e-9
wetL = fftconvolve(SEND, ir)[:N]
wetR = fftconvolve(SEND, np.roll(ir, 240))[:N]
wetL /= (np.max(np.abs(wetL)) + 1e-9)
wetR /= (np.max(np.abs(wetR)) + 1e-9)
mixL = L + wetL * 0.55
mixR = R + wetR * 0.55

# gentle high-pass to remove DC / sub-rumble below 25 Hz
mixL = filt(mixL, 'high', 24)
mixR = filt(mixR, 'high', 24)

# soft limiter
def limit(x, drive=1.0):
    x = x * drive
    return np.tanh(x * 1.02) / np.tanh(1.02)


peak = max(np.max(np.abs(mixL)), np.max(np.abs(mixR)))
import sys
DRIVE = float(sys.argv[1]) if len(sys.argv) > 1 else 2.0
def soft(x, d):
    return np.tanh(x * d) / np.tanh(d)
mixL = soft(mixL / peak * 1.02, DRIVE)
mixR = soft(mixR / peak * 1.02, DRIVE)

# fade the last 40 ms so the final hit cuts cleanly at 30.0
fade_n = int(0.04 * SR)
mixL[-fade_n:] *= np.linspace(1, 0, fade_n)
mixR[-fade_n:] *= np.linspace(1, 0, fade_n)

# target loudness (measured after with ffmpeg; this gets us close)


pk = max(np.max(np.abs(mixL)), np.max(np.abs(mixR)))
mixL *= 0.72 / pk
mixR *= 0.72 / pk

out = np.stack([mixL, mixR], axis=1)
wavfile.write('assets/score.wav', SR, (out * 32767).astype(np.int16))
print('wrote assets/score.wav', out.shape, 'peak', round(float(np.max(np.abs(out))), 3),
      'rms', round(float(np.sqrt(np.mean(out ** 2))), 4))
