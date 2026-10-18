#!/usr/bin/env python3
"""music.py — sneaky-jazz comedy score + designed SFX for Stickman's Fine.

72.0 s, 108 BPM, A minor. Pure NumPy synthesis. SFX cues come from
plan/beats.json (id -> t); stabs land on the five punchline VO starts.
Run: python3 scripts/music.py  ->  assets/score.wav
"""
import json, pathlib, sys
import numpy as np

SR = 48000
DUR = 72.0
BPM = 108.0
BEAT = 60.0 / BPM

ROOT = pathlib.Path(__file__).resolve().parent.parent
beats = json.loads((ROOT / "plan" / "beats.json").read_text())

N = int(SR * DUR)
L = np.zeros(N, dtype=np.float64)
R = np.zeros(N, dtype=np.float64)

def idx(t): return int(round(t * SR))

def add(buf_l, buf_r, sig, t, pan=0.0, gain=1.0):
    i = idx(t)
    if i >= N or i < -len(sig): return
    a = max(0, i); b = min(N, i + len(sig))
    if b <= a: return
    seg = sig[b - a - min(a - i, 0):b - a] if i < 0 else sig[a - i:b - i]
    gl = gain * (1 - max(0, pan)) if pan > 0 else gain
    gr = gain * (1 + min(0, pan)) if pan < 0 else gain
    gl = gain * np.sqrt((1 - pan) / 2) * np.sqrt(2)
    gr = gain * np.sqrt((1 + pan) / 2) * np.sqrt(2)
    buf_l[a:b] += seg * gl
    buf_r[a:b] += seg * gr

def env(n, a, d, s=0.0, r=0.0, sus=0.0):  # simple ADSR in seconds
    a, d, r = max(1, int(a * SR)), max(1, int(d * SR)), max(1, int(r * SR))
    out = np.zeros(n)
    k = 0
    seg = min(a, n); out[:seg] = np.linspace(0, 1, seg); k = seg
    if k < n:
        seg = min(d, n - k); out[k:k + seg] = np.linspace(1, s if s or r else 0, seg); k += seg
    if k < n and sus:
        seg = min(int(sus * SR), n - k); out[k:k + seg] = s; k += seg
    if k < n:
        seg = n - k; out[k:] = np.linspace(out[k - 1] if k else 0, 0, seg)
    return out

def expd(n, rate):
    return np.exp(-np.arange(n) / (rate * SR))

def tone(f, dur, harm=(1.0, 0.0), vib=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    w = np.zeros(n)
    for k, amp in enumerate(harm, start=1):
        if amp: w += amp * np.sin(2 * np.pi * f * k * t)
    if vib: w *= 1 + vib * np.sin(2 * np.pi * 5.5 * t)
    return w

# ---------------- instruments --------------------------------------------
def pizz(f, dur=0.28, amp=1.0, bright=0.5):     # nylon/comedy pizzicato
    n = int(dur * SR)
    w = np.sin(2 * np.pi * f * np.arange(n) / SR)
    w += bright * 0.6 * np.sin(4 * np.pi * f * np.arange(n) / SR)
    w += bright * 0.25 * np.sin(6 * np.pi * f * np.arange(n) / SR)
    return w * expd(n, 0.09) * amp

def bass(f, dur=0.5, amp=1.0):                  # upright-ish pluck bass
    n = int(dur * SR); t = np.arange(n) / SR
    w = np.sign(np.sin(2 * np.pi * f * t)) * 0.15 + np.sin(2 * np.pi * f * t)
    w += 0.4 * np.sin(2 * np.pi * 2 * f * t) * expd(n, 0.03)
    return w * expd(n, 0.22) * amp

def mallet(f, dur=0.6, amp=1.0):                # xylophone/boomwhack
    n = int(dur * SR); t = np.arange(n) / SR
    w = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 3.1 * f * t)
    w += 0.2 * np.sin(2 * np.pi * 5.8 * f * t) * expd(n, 0.02)
    return w * expd(n, 0.12) * amp

def stick(dur=0.05, amp=1.0, hp=1400):          # woodblock / rim click
    n = int(dur * SR)
    w = np.random.default_rng(hp).standard_normal(n)
    w = np.diff(np.concatenate([[0], w]))        # crude high-pass
    w += np.sin(2 * np.pi * hp * np.arange(n) / SR)
    return w * expd(n, 0.012) * amp * 0.5

def kick(dur=0.22, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 120 * np.exp(-t * 22) + 44
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(n, 0.08) * amp

def brush(dur=0.3, amp=1.0, seed=7):
    n = int(dur * SR)
    w = np.random.default_rng(seed).standard_normal(n)
    # band-ish: subtract smoothed
    k = np.ones(40) / 40
    w = w - np.convolve(w, k, mode="same")
    return w * env(n, 0.02, dur * 0.5, 0.3, dur * 0.4) * amp

def stab(root=220.0, dur=0.4, amp=1.0, minor=True):  # punchline brass-ish hit
    n = int(dur * SR); t = np.arange(n) / SR
    third = root * (2 ** (3 / 12) if minor else 2 ** (4 / 12))
    w = np.zeros(n)
    for f, a in [(root, 1.0), (third, 0.8), (root * 1.5, 0.7), (root * 2, 0.5)]:
        for h in (1, 2, 3, 4):
            w += (a / h) * np.sin(2 * np.pi * f * h * t)
    w *= env(n, 0.006, 0.10, 0.55, dur - 0.11)
    return np.tanh(w * 1.4) * 0.22 * amp

def rimshot(amp=1.0):                            # ba-dum-tss
    out = np.zeros(int(0.9 * SR))
    for i, (f, a, at) in enumerate([(320, 0.9, 0), (240, 1.0, 0.16), (90, 0.9, 0.34)]):
        n = int(0.35 * SR); w = stick(0.06, 1.0, 900 + i * 200) * 0.0
        tt = np.arange(n) / SR
        w = np.sin(2 * np.pi * f * tt) * expd(n, 0.05) * a
        k = idx(at); out[k:k + n] += w[:len(out) - k]
    n0 = int(0.5 * SR)                            # cymbal hiss
    hs = np.random.default_rng(3).standard_normal(n0)
    hs *= expd(n0, 0.14) * 0.35
    out[idx(0.34):idx(0.34) + n0] += hs[:len(out) - idx(0.34)]
    return out * amp

def fanfare(amp=1.0):
    out = np.zeros(int(0.9 * SR))
    seq = [(523.25, 0), (659.25, 0.12), (783.99, 0.24), (1046.5, 0.40)]
    for f, t0 in seq:
        n = int(0.45 * SR)
        w = mix2(mallet(f, 0.45, 1.0), 0.4 * mallet(f * 2, 0.3, 0.6))
        k = idx(t0); out[k:k + n] += w[:len(out) - k] * 0.7
    return out * amp

# ---------------- SFX ------------------------------------------------------
def mix2(a, b):
    n = max(len(a), len(b))
    out = np.zeros(n); out[:len(a)] += a; out[:len(b)] += b
    return out

def sfx(sig_id, amp=1.0):
    rng = np.random.default_rng(abs(hash(sig_id)) % (2**31))
    if sig_id == "alarm_buzz":
        n = int(1.4 * SR); t = np.arange(n) / SR
        w = np.sign(np.sin(2 * np.pi * 880 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t))
        w = w * env(n, 0.01, 0.1, 0.8, 0.2) * 0.16
        return w
    if sig_id == "slap":   return mix2(kick(0.14, 1.0), stick(0.05, 1.2, 2500)) * 0.5 * amp
    if sig_id == "thud":   return kick(0.3, 1.2) * 0.7 * amp
    if sig_id == "plop":   return kick(0.1, 0.7) * 0.5 * amp
    if sig_id == "whoosh":
        n = int(0.45 * SR)
        w = rng.standard_normal(n)
        k = np.ones(30) / 30
        w = np.convolve(w, k, mode="same")
        return w * env(n, 0.18, 0.05, 0.4, 0.2) * np.linspace(0.3, 1, n) * 0.5 * amp
    if sig_id == "clunk_glass":
        n = int(0.6 * SR); t = np.arange(n) / SR
        w = rng.standard_normal(n) * expd(n, 0.015) * 0.6
        for f in (1870, 2410, 3160): w += 0.3 * np.sin(2 * np.pi * f * t) * expd(n, 0.09)
        return w * 0.5 * amp
    if sig_id == "shutter":
        n = int(0.09 * SR)
        w = rng.standard_normal(n) * expd(n, 0.008)
        st = stick(0.03, 1.0, 3000); w[:len(st)] += st
        return w * 0.55 * amp
    if sig_id == "pop_chart":
        return mix2(stick(0.05, 1.4, 1800), kick(0.1, 0.5)) * 0.5 * amp
    if sig_id == "pop":
        n = int(0.08 * SR); t = np.arange(n) / SR
        f = 600 * expd(n, 0.02) + 250
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(n, 0.02) * 0.6 * amp
    if sig_id == "glug":
        out = np.zeros(int(0.8 * SR))
        for i in range(4):
            n = int(0.12 * SR); t = np.arange(n) / SR
            f = 300 + i * 90
            w = np.sin(2 * np.pi * f * t * (1 + 0.4 * t)) * env(n, 0.01, 0.06, 0.3, 0.05)
            k = idx(i * 0.17); out[k:k + n] += w[:len(out) - k]
        return out * 0.4 * amp
    if sig_id == "ecg_beep":
        n = int(0.25 * SR); t = np.arange(n) / SR
        return np.sin(2 * np.pi * 1046 * t) * env(n, 0.01, 0.06, 0.6, 0.18) * 0.3 * amp
    if sig_id == "stamp":
        return mix2(kick(0.16, 1.3), stick(0.05, 1.5, 1400)) * 0.6 * amp
    if sig_id == "sip":
        n = int(0.3 * SR); w = rng.standard_normal(n)
        k = np.ones(14) / 14
        w = np.convolve(w, k, mode="same")
        return w * env(n, 0.06, 0.1, 0.5, 0.1) * 0.25 * amp
    if sig_id == "rattle":
        out = np.zeros(int(0.5 * SR))
        for i in range(7):
            n = int(0.05 * SR)
            w = rng.standard_normal(n) * expd(n, 0.008)
            k = idx(i * 0.065 + rng.random() * 0.01); out[k:k + n] += w[:len(out) - k]
        return out * 0.3 * amp
    if sig_id == "beepbeep":
        out = np.zeros(int(0.5 * SR))
        for i in range(2):
            n = int(0.12 * SR); t = np.arange(n) / SR
            w = np.sign(np.sin(2 * np.pi * 1320 * t)) * env(n, 0.005, 0.04, 0.5, 0.06)
            k = idx(i * 0.22); out[k:k + n] += w[:len(out) - k]
        return out * 0.22 * amp
    if sig_id == "shake_rattle":
        n = int(2.6 * SR)
        w = rng.standard_normal(n)
        w = np.convolve(w, np.ones(8) / 8, mode="same")
        trem = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 17 * np.arange(n) / SR))
        return w * trem * 0.16 * amp
    if sig_id == "fanfare": return fanfare(0.75 * amp)
    if sig_id == "cricket":
        out = np.zeros(int(0.7 * SR))
        for i in range(3):
            n = int(0.07 * SR); t = np.arange(n) / SR
            w = np.sin(2 * np.pi * 4200 * t) * env(n, 0.004, 0.03, 0.4, 0.03)
            k = idx(i * 0.14); out[k:k + n] += w[:len(out) - k]
        return out * 0.2 * amp
    if sig_id == "page":
        n = int(0.3 * SR); w = rng.standard_normal(n)
        w = w - np.convolve(w, np.ones(60) / 60, mode="same")
        return w * env(n, 0.1, 0.1, 0.5, 0.1) * 0.3 * amp
    if sig_id == "quack":
        n = int(0.35 * SR); t = np.arange(n) / SR
        f0 = 300
        w = np.zeros(n)
        for h, a in [(1, 1.0), (2, 0.55), (3, 0.4), (4, 0.25)]:
            w += a * np.sin(2 * np.pi * f0 * h * t * (1 + 0.12 * np.sin(2 * np.pi * 26 * t)))
        w *= env(n, 0.02, 0.12, 0.5, 0.16)
        return w * 0.35 * amp
    if sig_id == "scribble":
        n = int(0.4 * SR); w = rng.standard_normal(n)
        w = np.diff(np.concatenate([[0], w]))
        return w * env(n, 0.02, 0.2, 0.6, 0.15) * 0.18 * amp
    if sig_id == "pencil":
        n = int(0.35 * SR); w = rng.standard_normal(n)
        w = np.diff(np.concatenate([[0], w]))
        scratch = (np.sin(2 * np.pi * 9 * np.arange(n) / SR) > 0).astype(float)
        return w * scratch * env(n, 0.02, 0.15, 0.7, 0.15) * 0.2 * amp
    if sig_id == "ding":
        return mallet(1318.5, 1.2, 0.7) * 0.5 * amp
    return np.zeros(1)

# ---------------- score ----------------------------------------------------
def t_of(sec, b): return beats["sections"][sec]["t0"] + b * BEAT

VO = beats["vo"]
PUNCH = [VO[k]["t"] for k in ("p1", "p2", "p3", "p4", "p5")]

A2, C3, E3, F3, G3, A3, C4, E4, D4, G4, A4, B3 = 110.0, 130.81, 164.81, 174.61, 196.0, 220.0, 261.63, 329.63, 293.66, 392.0, 440.0, 246.94

def sneaky_bar(t0, phase=0):       # one bar of sneaky groove
    # bass: root walk
    for b, f in [(0, A2), (1, A2), (2, E3 / 2 * 1.0), (3, G3 / 2)]:
        add(L, R, bass(f * 2, 0.5, 0.5), t0 + b * BEAT, 0.0)
    # offbeat pizz eighths
    notes = [A3, C4, E4, C4, A3, B3, E4, D4]
    for i, f in enumerate(notes):
        tt = t0 + (i // 2) * BEAT + (0.5 if i % 2 else 0.25) * BEAT * 2 * (i % 2) / max(1, (i % 2) or 1)
        # simpler: hits on eighths with rests
        hits = [0.0, 0.75, 1.5, 2.0, 2.75, 3.5]
        pass
    for h, f in zip([0.5, 1.5, 2.5, 3.5], [A3, C4, E4, C4]):
        add(L, R, pizz(f, 0.3, 0.5), t0 + h * BEAT, -0.25)
        add(L, R, pizz(f * 2, 0.18, 0.18), t0 + h * BEAT, 0.3)
    # brushes 2 & 4, stick on 4&
    add(L, R, brush(0.3, 0.5, seed=int(t0 * 10) % 99), t0 + BEAT, 0.35)
    add(L, R, brush(0.3, 0.5, seed=int(t0 * 11) % 99), t0 + 3 * BEAT, -0.35)
    add(L, R, kick(0.2, 0.7), t0, 0)
    add(L, R, kick(0.2, 0.55), t0 + 2 * BEAT, 0)
    add(L, R, stick(0.05, 0.5, 1600), t0 + 3.5 * BEAT, 0.2)

BAR = 4 * BEAT
# intro: sparse pluck motif + single bass
for i, f in enumerate([A3, C4, E4, None, C4, A3]):
    t = 0.6 + i * 0.7
    if f: add(L, R, pizz(f, 0.5, 0.55, bright=0.7), t, -0.1 + 0.05 * i)
add(L, R, bass(A2, 1.0, 0.5), 0.6)
add(L, R, bass(A2, 1.0, 0.45), 3.6)
add(L, R, brush(0.5, 0.3, 11), 2.4, 0.4)

# jokes 1-3: sneaky groove (skip during fold silence 36.4-37.2)
t = beats["sections"][1]["t0"] + 0.0
sec_i = 1
while t < beats["sections"][5]["t1"] - BAR / 2:
    sec = None
    for s in beats["sections"]:
        if s["t0"] <= t < s["t1"]: sec = s["name"]
    quiet = (36.4 <= t < 37.3)
    if sec in ("joke1", "joke2", "joke3", "joke4") and not quiet:
        if sec == "joke4":
            # techier: lighter, add blip arp
            sneaky_bar(t)
            for j in range(4):
                add(L, R, pizz([E4, G4, A4, E4][j], 0.14, 0.24), t + j * BEAT * 0.5 + 0.12, 0.4)
        else:
            sneaky_bar(t)
    elif sec == "joke5":
        # calm brushes + soft pizz
        add(L, R, bass(A2, 0.9, 0.42), t, 0.0)
        add(L, R, bass(F3 / 2, 0.9, 0.36), t + 2 * BEAT, 0.0)
        for h, f in [(0.5, A3), (1.5, C4), (2.5, A3), (3.5, E4)]:
            add(L, R, pizz(f, 0.34, 0.34), t + h * BEAT, -0.2)
        add(L, R, brush(0.4, 0.42, seed=41), t + BEAT, 0.35)
        add(L, R, brush(0.4, 0.42, seed=42), t + 3 * BEAT, -0.35)
    t += BAR

# punchline stabs + rimshots on p2 & p5
for i, tp in enumerate(PUNCH):
    add(L, R, stab(220.0 if i % 2 == 0 else 261.63, 0.45, 1.1, minor=True), tp - 0.05, 0.0)
    if i in (1, 4):
        add(L, R, rimshot(0.75), tp + 0.7, 0.1)

# outro: half-time warm resolution
o0 = beats["sections"][6]["t0"]
for h, f in [(0.0, A3), (1.0, F3 * 2), (2.0, E4), (3.0, C4)]:
    add(L, R, pizz(f, 0.7, 0.5, bright=0.35), o0 + h * BEAT, -0.1)
add(L, R, bass(A2, 1.4, 0.5), o0, 0)
add(L, R, bass(F3 / 2, 1.2, 0.45), o0 + 2 * BEAT, 0)
# warm pad through outro
n_pad = int(5.6 * SR); tp_ = np.arange(n_pad) / SR
pad = np.zeros(n_pad)
for f in (A3, C4, E4):
    pad += np.sin(2 * np.pi * f * tp_) + 0.5 * np.sin(2 * np.pi * f * 1.003 * tp_)
pad *= env(n_pad, 0.7, 1.0, 0.7, 2.2) * 0.05
add(L, R, pad, o0, -0.3, 1.0); add(L, R, pad, o0, 0.3, 1.0)
# endcard sting
add(L, R, stab(220.0, 0.7, 1.2, minor=False), beats["events"]["endcard"] - 0.03, 0.0)
add(L, R, mallet(880, 1.0, 0.5), beats["events"]["endcard"], 0.15)

# ---------------- SFX layer ------------------------------------------------
GAIN = {"alarm_buzz": 1.0, "clunk_glass": 1.1, "stamp": 1.1, "fanfare": 1.0,
        "shutter": 0.9, "rimshot": 1.0}
for cue in beats["sfx"]:
    sig = sfx(cue["id"], GAIN.get(cue["id"], 1.0))
    pan = {"shutter": -0.4, "cricket": 0.5, "quack": 0.35, "beepbeep": 0.3}.get(cue["id"], 0.0)
    add(L, R, sig, cue["t"], pan)

# ---------------- master ---------------------------------------------------
# gentle glue + fades + normalize
def glue(x):
    return np.tanh(x * 1.05) / np.tanh(1.05)

L, R = glue(L), glue(R)
fi = int(0.15 * SR); L[:fi] *= np.linspace(0, 1, fi); R[:fi] *= np.linspace(0, 1, fi)
f0, f1 = idx(71.4), N
L[f0:f1] *= np.linspace(1, 0, f1 - f0); R[f0:f1] *= np.linspace(1, 0, f1 - f0)
peak = max(np.abs(L).max(), np.abs(R).max())
g = (10 ** (-3.0 / 20)) / peak
L *= g; R *= g

out = np.stack([L, R], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype("<i2")
import wave
path = ROOT / "assets" / "score.wav"
path.parent.mkdir(exist_ok=True)
with wave.open(str(path), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {path}  {DUR}s  peak={20*np.log10(peak*g):.2f} dBFS")
