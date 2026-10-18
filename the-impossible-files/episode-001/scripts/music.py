#!/usr/bin/env python3
"""music.py — dark ambient cinematic score, 54 BPM, D minor, 109 s.
Gates: silence after blackout (63.24–66.2), near-silence before the turn
(99.5–100.6), loop-friendly return at the end. → assets/score.wav"""
import os, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, fftconvolve

SR = 48000
DUR = 109.0
N = int(SR * DUR)
BPM = 54.0
BEAT = 60.0 / BPM          # 1.1111 s
T = np.arange(N) / SR
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'score.wav')

rng = np.random.default_rng(1607)

def lp(x, fc, order=2):
    b, a = butter(order, min(fc / (SR / 2), 0.99), 'low'); return lfilter(b, a, x)
def hp(x, fc, order=2):
    b, a = butter(order, max(fc / (SR / 2), 1e-4), 'high'); return lfilter(b, a, x)

def seg(t0, t1):
    return slice(int(t0 * SR), int(min(t1, DUR) * SR))

# piecewise envelope (piece, value) linear-interpolated across timeline
def curve(points):
    ts = np.array([p[0] for p in points]); vs = np.array([p[1] for p in points])
    return np.interp(T, ts, vs)

# ── voices ──────────────────────────────────────────────────
# 1) drone: detuned low sines (D1, A1, D2) + filtered noise bed
def drone_voice():
    fD1, fA1, fD2 = 36.71, 55.0, 73.42
    x = (0.55 * np.sin(2 * np.pi * fD1 * T + 0.3 * np.sin(2 * np.pi * 0.11 * T)) +
         0.42 * np.sin(2 * np.pi * fA1 * T + 2.1) +
         0.34 * np.sin(2 * np.pi * (fD2 * 1.001) * T) +
         0.30 * np.sin(2 * np.pi * (fD2 * 0.5) * T + 1.0))
    # breathing tremolo
    x *= 1 + 0.18 * np.sin(2 * np.pi * (1 / (BEAT * 4)) * T)
    air = lp(rng.standard_normal(N), 620) * 0.16
    air *= 1 + 0.3 * np.sin(2 * np.pi * 0.07 * T + 1.2)
    return x + air

# 2) sub pulse every 2 beats (1 pulse per bar-pair)
def pulse_voice():
    x = np.zeros(N)
    period = BEAT * 2
    t = 0.4
    i = 0
    while t < DUR:
        i0 = int(t * SR)
        d = 0.55
        n = int(d * SR)
        tt = np.arange(n) / SR
        f = 58 * (0.62) ** (tt / d)
        p = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-np.linspace(0, 7, n))
        x[i0:i0 + n] += p
        t += period
        i += 1
    return x

# 3) shimmer: airy high partials (D6/A6) slow swells
def shimmer_voice():
    x = (0.12 * np.sin(2 * np.pi * 1174.66 * T + 0.9 * np.sin(2 * np.pi * 0.13 * T)) +
         0.09 * np.sin(2 * np.pi * 1760.0 * T + 2.2) +
         0.06 * np.sin(2 * np.pi * 587.33 * T))
    x *= 1 + 0.6 * np.sin(2 * np.pi * 0.05 * T + 0.4)
    x += hp(rng.standard_normal(N), 6000) * 0.05
    return x

# 4) bell pads (FM plucks) at sparse moments
def bell_at(t0, f, gain=0.5, d=2.6):
    i0 = int(t0 * SR)
    n = int(d * SR)
    if i0 + n > N: n = N - i0
    if n <= 0: return np.zeros(N)
    tt = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-np.linspace(0, 8, n)) * 2.6
    x = np.sin(2 * np.pi * f * tt + mod) * np.exp(-np.linspace(0, 5.0, n))
    out = np.zeros(N)
    out[i0:i0 + n] = gain * x
    return out

# 5) string-warm low pad (saw cluster, LP) for the lab movement
def pad_voice():
    f = np.array([146.83, 174.61, 220.0, 293.66])   # D3 F3 A3 D4
    x = np.zeros(N)
    for k, ff in enumerate(f):
        ph = np.cumsum(np.full(N, ff * (1 + 0.0022 * ((k % 2) * 2 - 1)))) / SR
        saw = 2 * (ph % 1.0) - 1
        x += saw * (0.5 ** k)
    x = lp(x, 900, 3)
    return x

# 6) risers (musical layer matched to sfx risers)
def riser_at(t0, d, f0=110, f1=880, gain=0.28):
    i0, i1 = int(t0 * SR), int((t0 + d) * SR)
    if i1 > N: i1 = N
    n = i1 - i0
    if n <= 0: return np.zeros(N)
    tt = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (np.linspace(0, 1, n) ** 1.7)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6
    x += lp(rng.standard_normal(n), 3000) * 0.25
    x *= np.linspace(0.03, 1, n) ** 2
    x[-int(0.04 * SR):] *= np.linspace(1, 0, int(0.04 * SR))
    out = np.zeros(N)
    out[i0:i0 + n] = gain * x
    return out

# ── arrangement envelope (piece → 0/1 levels) ───────────────
drone_lvl = curve([
    (0.0, 0.85), (11.4, 0.9), (23.6, 1.0), (43.3, 1.0), (57.4, 1.05),
    (63.24, 1.05), (63.60, 0.0), (66.2, 0.0),              # MUSIC STOPS at blackout
    (67.0, 0.0), (72.0, 0.30), (78.36, 0.45), (90.45, 0.42),
    (96.5, 0.30), (99.5, 0.10), (100.55, 0.02),             # void before the turn
    (100.6, 0.18), (103.6, 0.30), (103.7, 0.62), (109.0, 0.85),
])
pulse_lvl = curve([
    (0.0, 0.7), (23.6, 0.8), (47.3, 0.95), (61.6, 1.0),
    (63.24, 0.9), (63.6, 0.0), (78.3, 0.0), (79.5, 0.30),
    (90.45, 0.26), (97.0, 0.14), (99.5, 0.0), (103.6, 0.0),
    (103.7, 0.55), (109.0, 0.7),
])
shimmer_lvl = curve([
    (0.0, 0.25), (11.5, 0.35), (14.6, 0.5), (23.6, 0.35), (43.3, 0.3),
    (63.24, 0.4), (63.6, 0.0), (70.0, 0.0), (74.0, 0.30),
    (90.45, 0.4), (96.0, 0.5), (99.5, 0.08), (100.6, 0.5),
    (103.6, 0.3), (103.7, 0.3), (109.0, 0.28),
])
pad_lvl = curve([
    (0.0, 0.0), (66.9, 0.0), (70.0, 0.22), (78.36, 0.40), (90.45, 0.34),
    (97.5, 0.20), (99.5, 0.04), (100.6, 0.30), (103.6, 0.18),
    (103.7, 0.0), (109.0, 0.0),
])

# ── mix down ────────────────────────────────────────────────
score = np.zeros(N)
score += drone_voice() * drone_lvl * 0.50
score += pulse_voice() * pulse_lvl * 0.55
score += shimmer_voice() * shimmer_lvl * 0.30
score += pad_voice() * pad_lvl * 0.32

# sparse bells in the seventh-cube/lab breath
for t0, f, g in [
    (67.6, 293.66, 0.5), (71.4, 349.23, 0.42), (75.0, 440.0, 0.40),
    (77.0, 293.66, 0.34), (81.5, 392.0, 0.30), (87.0, 349.23, 0.36),
    (92.4, 293.66, 0.40), (98.6, 440.0, 0.30),
    (105.3, 349.23, 0.42), (107.6, 293.66, 0.46),
]:
    score += bell_at(t0, f, g)

# musical risers under the four escalating entries
score += riser_at(45.4, 1.9, 120, 700, 0.26)
score += riser_at(50.8, 1.8, 130, 820, 0.28)
score += riser_at(55.7, 1.7, 140, 900, 0.30)
score += riser_at(59.8, 1.8, 150, 1050, 0.34)
# void riser into the turn
score += riser_at(98.8, 1.8, 90, 620, 0.22)

# hit support (musical layer under sfx impacts)
def hit(t0, f0=64, d=1.4, gain=0.5):
    i0 = int(t0 * SR); n = min(int(d * SR), N - i0)
    if n <= 0: return
    tt = np.arange(n) / SR
    f = f0 * (0.5) ** (tt / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-np.linspace(0, 6, n))
    score[i0:i0 + n] += gain * x

for t0, g in [(47.3, 0.5), (52.6, 0.55), (57.4, 0.6), (61.6, 0.7),
              (100.6, 0.75), (103.66, 0.6), (106.4, 0.5)]:
    hit(t0, 64, 1.5, g)

# gentle stereo: haas + tilt
score = lp(score, 15000, 2)
L = score.copy()
R = np.concatenate([np.zeros(260), score[:-260]])
R = 0.92 * R + 0.08 * score
st = np.stack([L, R], 1)

# global soft ceiling (pre-mix; mix.py owns final loudness)
st = np.tanh(st * 1.1) * 0.9
m = np.max(np.abs(st)) or 1
st = st * (0.92 / m)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
wavfile.write(OUT, SR, (st * 32767).astype(np.int16))
print(f'score.wav  {DUR}s  peak={20*np.log10(np.max(np.abs(st))):.2f} dBFS')
