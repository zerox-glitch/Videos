#!/usr/bin/env python3
"""Wiggle & Giggle — 75 s sing-along score, 120 BPM, C major.

Bright ukulele + marimba + glockenspiel + bass + light kit, arranged to the
episode's lyric sheet. Writes assets/score.wav (48 kHz stereo).
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
import os

SR = 48000
DUR = 75.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

BPM = 120.0
BEAT = 60.0 / BPM       # 0.5 s
BAR = 4 * BEAT          # 2.0 s

L = np.zeros(N)
R = np.zeros(N)
SEND = np.zeros(N)      # reverb send

# ------------------------------------------------------------------ utils
def t_of(beat):
    return beat * BEAT

def place(sig, at, gain=1.0, pan=0.0, send=0.0):
    i = int(at * SR)
    if i >= N:
        return
    n = min(len(sig), N - i)
    if n <= 0:
        return
    gl = gain * np.sqrt(max(0.0, 0.5 * (1 - pan)))
    gr = gain * np.sqrt(max(0.0, 0.5 * (1 + pan)))
    L[i:i+n] += sig[:n] * gl
    R[i:i+n] += sig[:n] * gr
    if send:
        SEND[i:i+n] += sig[:n] * gain * send

def env_ad(n, attack, decay, curve=2.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-np.power(t / decay, curve))
    return a * d

def lp(x, fc, order=2):
    fc = min(fc, SR * 0.45)
    sos = butter(order, fc / (SR / 2), btype='low', output='sos')
    return sosfilt(sos, x)

def hp(x, fc, order=2):
    sos = butter(order, max(20, fc) / (SR / 2), btype='high', output='sos')
    return sosfilt(sos, x)

def bp(x, lo, hi, order=2):
    lo = max(18, lo); hi = min(hi, SR * 0.45)
    sos = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
    return sosfilt(sos, x)

def f_of(midi):
    return 440.0 * 2 ** ((midi - 69) / 12.0)

# ------------------------------------------------------------------ voices
def marimba(midi, dur=0.9, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_of(midi)
    y = (np.sin(2*np.pi*f*t) * np.exp(-t*9)
         + 0.42*np.sin(2*np.pi*f*4*t + 0.4) * np.exp(-t*26)
         + 0.20*np.sin(2*np.pi*f*9.2*t) * np.exp(-t*40)
         + 0.10*np.sin(2*np.pi*f*2*t) * np.exp(-t*4))
    y *= 1 - np.exp(-t*400)
    return y * 0.32 * vel

def glock(midi, dur=1.4, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_of(midi)
    y = (np.sin(2*np.pi*f*t) * np.exp(-t*4.2)
         + 0.35*np.sin(2*np.pi*f*2.76*t) * np.exp(-t*8)
         + 0.18*np.sin(2*np.pi*f*5.4*t) * np.exp(-t*14))
    y *= 1 - np.exp(-t*600)
    return y * 0.22 * vel

def pluck(midi, dur=0.7, vel=1.0, bright=2600):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_of(midi)
    y = np.zeros(n)
    for k in range(1, 9):
        y += (1.0 / k**1.35) * np.sin(2*np.pi*f*k*t + k*0.3) * np.exp(-t*(5 + k*2.4))
    y = lp(y, bright)
    y *= 1 - np.exp(-t*500)
    return y * 0.24 * vel

def bass(midi, dur=0.9, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_of(midi)
    y = (np.sin(2*np.pi*f*t) * 1.0
         + 0.28*np.sin(2*np.pi*f*2*t)
         + 0.10*np.sin(2*np.pi*f*3*t))
    y = lp(y, 900)
    e = env_ad(n, 0.006, dur*0.55, 1.4)
    return y * e * 0.30 * vel

def pad(midis, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for m in midis:
        for det in (-0.12, 0.0, 0.11):
            f = f_of(m) * (1 + det/100)
            y += np.sin(2*np.pi*f*t + rng.random()*6) * 0.5
            y += 0.22*np.sin(2*np.pi*f*2*t)
    y = lp(y, 1800)
    a = np.clip(t / 0.4, 0, 1)
    r = np.clip((dur - t) / 0.5, 0, 1)
    return y * a * r * 0.085 * vel / max(1, len(midis))

def kick(vel=1.0):
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 105 * np.exp(-t*22) + 42
    y = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*13)
    click = bp(rng.standard_normal(n), 1200, 4200) * np.exp(-t*160) * 0.25
    return (y + click) * 0.55 * vel

def shaker(vel=1.0):
    n = int(0.10 * SR)
    t = np.arange(n) / SR
    y = bp(rng.standard_normal(n), 5200, 12000) * np.exp(-t*48)
    return y * 0.16 * vel

def woodblock(vel=1.0, f=1180):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    y = np.sin(2*np.pi*f*t) * np.exp(-t*38) + 0.4*np.sin(2*np.pi*f*1.6*t)*np.exp(-t*55)
    return y * 0.17 * vel

def tamb(vel=1.0):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    y = bp(rng.standard_normal(n), 3500, 11000) * np.exp(-t*26)
    return y * 0.15 * vel

def clap(vel=1.0):
    n = int(0.20 * SR)
    t = np.arange(n) / SR
    base = bp(rng.standard_normal(n), 900, 3400)
    mod = (np.exp(-t*60) + 0.6*np.exp(-np.maximum(t-0.012, 0)*55) + 0.4*np.exp(-np.maximum(t-0.026, 0)*50))
    return base * mod * 0.22 * vel

def chime_up(f0, f1, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1/f0) ** (t/dur)
    y = np.sin(2*np.pi*np.cumsum(f)/SR) * np.sin(np.pi*t/dur)**1.6
    return y * 0.10 * vel

def sparkle_run(midis, step=0.06, vel=1.0):
    for i, m in enumerate(midis):
        place(glock(m, 1.0, vel * (0.55 + 0.45*rng.random())), i*step, 0.8, pan=(-0.4+0.8*i/max(1,len(midis)-1)), send=0.5)

# ------------------------------------------------------------------ score
# chord voicings (midi)
CH = {
    'C':  ([48, 55, 60, 64], 36, [60, 64, 67, 72]),
    'G':  ([50, 55, 59, 62], 43, [59, 62, 67, 71]),
    'Am': ([45, 57, 60, 64], 45, [57, 60, 64, 69]),
    'F':  ([41, 57, 60, 65], 41, [57, 60, 65, 69]),
    'Dm': ([50, 57, 62, 65], 38, [62, 65, 69, 74]),
}

def chord_at(name, beat, length, vel=1.0, strum=True, bright=2600):
    notes, root, voicing = CH[name]
    place(bass(root, length*BEAT*0.95, vel*0.95), t_of(beat), 0.9, send=0.05)
    for i, m in enumerate(voicing):
        off = i*0.018 if strum else 0
        place(pluck(m - 12, 0.8, vel*0.62, bright), t_of(beat) + off, 0.55, pan=-0.25 + i*0.17, send=0.12)

def melody(seq, beat, vel=1.0, octave=0, inst='marimba', pan=0.15):
    """seq = [(midi|None, beats), ...]"""
    b = beat
    for m, d in seq:
        if m is not None:
            if inst == 'marimba':
                place(marimba(m + octave, max(0.35, d*BEAT*1.6), vel), t_of(b), 0.9, pan=pan, send=0.25)
            else:
                place(glock(m + octave, max(0.6, d*BEAT*2.2), vel), t_of(b), 0.75, pan=pan, send=0.35)
        b += d

# --- tiny melodic figures (C major) ------------------------------------
# "good morning" motif
V1 = [(72,0.5),(74,0.5),(76,0.5),(74,0.5),(72,1.0),(67,1.0),(69,0.5),(72,0.5),(69,1.0),(67,1.0)]
V1b = [(72,0.5),(74,0.5),(76,1.0),(74,0.5),(72,0.5),(69,1.0),(67,0.5),(69,0.5),(72,1.5),(None,0.5)]
# chorus hook: wiggle wiggle
CHO = [(67,0.5),(67,0.5),(72,0.5),(67,0.5),(69,1.0),(67,0.5),(64,0.5),(67,1.0),(None,0.5),
       (72,0.5),(72,0.5),(76,0.5),(72,0.5),(74,1.0),(72,0.5),(69,0.5),(72,1.0),(None,1.0)]
CHO2 = [(69,0.5),(69,0.5),(72,0.5),(69,0.5),(67,1.0),(64,0.5),(67,0.5),(69,1.0),(None,0.5),
        (72,0.5),(74,0.5),(76,0.5),(79,0.5),(76,1.0),(72,0.5),(69,0.5),(72,1.0),(None,1.0)]
# verse 2 - pip
V2 = [(72,0.5),(72,0.5),(74,0.5),(72,0.5),(69,1.0),(67,1.0),(64,0.5),(67,0.5),(69,1.0),(72,1.0)]
V2b = [(74,0.5),(74,0.5),(76,0.5),(74,0.5),(72,1.0),(69,1.0),(67,0.5),(69,0.5),(72,1.5),(None,0.5)]
# bridge: jump jump
BR1 = [(72,0.5),(72,0.5),(79,1.0),(79,0.5),(76,0.5),(72,1.0),(74,0.5),(76,0.5),(77,1.0),(76,1.0)]
BR2 = [(79,0.5),(79,0.5),(81,0.5),(79,0.5),(76,1.0),(72,1.0),(74,0.5),(76,0.5),(72,2.0)]

# --- arrangement -------------------------------------------------------
def bar_chords(start_beat, names, vel=1.0, bright=2600):
    for i, c in enumerate(names):
        chord_at(c, start_beat + i*4, 4, vel, bright=bright)

# INTRO 0–9 s (beats 0–18)
place(chime_up(300, 2400, 2.2, 1.0), 0.15, 0.9, send=0.7)
sparkle_run([72, 76, 79, 84], 0.11, 0.7)
place(pad([48, 55, 64, 67], 4.0, 0.9), 0.0, 0.9, send=0.5)
for i, c in enumerate(['C', 'G', 'Am', 'F']):
    chord_at(c, 4 + i*4, 4, 0.55 if i < 2 else 0.7, bright=2200)
for b in range(8, 18, 2):
    place(shaker(0.45), t_of(b), 0.5, pan=0.3, send=0.1)
# sunrise gliss
sparkle_run([79, 81, 84, 86, 88, 91], 0.075, 0.8)
place(glock(84, 2.4, 0.9), 1.55, 0.8, send=0.6)

# VERSE 1  (beats 18–42)
bar_chords(18, ['C','G','Am','F','C','G'], 0.95)
for b in range(18, 42):
    place(kick(0.85 if b % 2 == 0 else 0.55), t_of(b), 0.9, send=0.02)
    place(shaker(0.55 if b % 2 else 0.85), t_of(b), 0.65, pan=0.32, send=0.08)
melody(V1, 18, 1.0)
melody(V1b, 28, 0.95)
for b in range(18, 42, 4):
    place(tamb(0.5), t_of(b+2), 0.5, pan=-0.2, send=0.2)

# CHORUS 1 (beats 42–66)
bar_chords(42, ['F','C','G','Am','F','G'], 1.0, bright=3200)
for b in range(42, 66):
    place(kick(1.0 if b % 2 == 0 else 0.6), t_of(b), 1.0, send=0.02)
    place(shaker(0.9 if b % 2 else 0.55), t_of(b), 0.75, pan=0.34, send=0.1)
    place(tamb(0.7 if b % 4 == 2 else 0.35), t_of(b), 0.5, pan=-0.28, send=0.18)
    if b % 4 == 0 or b % 4 == 2:
        place(clap(0.85), t_of(b), 0.8, pan=-0.05, send=0.28)
melody(CHO, 42, 1.05)
melody(CHO2, 54, 1.0)
place(pad([60, 64, 67, 72], 8.0, 0.55), 42.0, 0.8, send=0.4)

# VERSE 2 (beats 66–84)
bar_chords(66, ['C','G','Am','F','C'], 0.9)
for b in range(66, 84):
    place(kick(0.8 if b % 2 == 0 else 0.5), t_of(b), 0.8)
    place(shaker(0.5), t_of(b), 0.55, pan=0.3, send=0.06)
melody(V2, 66, 0.95)
melody(V2b, 76, 0.9)
place(glock(84, 1.2, 0.7), t_of(74.5), 0.6, send=0.5)

# CHORUS 2 (beats 84–108)
bar_chords(84, ['F','C','G','Am','F','G'], 1.0, bright=3400)
for b in range(84, 108):
    place(kick(1.0 if b % 2 == 0 else 0.62), t_of(b), 1.0)
    place(shaker(0.95 if b % 2 else 0.55), t_of(b), 0.8, pan=0.34, send=0.12)
    place(tamb(0.7 if b % 4 == 2 else 0.35), t_of(b), 0.55, pan=-0.28, send=0.2)
    if b % 4 in (0, 2):
        place(clap(0.9), t_of(b), 0.85, pan=-0.05, send=0.3)
melody(CHO, 84, 1.1)
melody(CHO2, 96, 1.05, octave=0)

# BRIDGE (beats 108–132) — jump, reach, spin, hooray
bar_chords(108, ['F','G','C','Am','F','G'], 1.05, bright=3600)
for b in range(108, 132):
    place(kick(1.0 if b % 2 == 0 else 0.7), t_of(b), 1.05)
    place(shaker(0.9), t_of(b), 0.8, pan=0.3, send=0.1)
    if b % 2 == 1:
        place(woodblock(0.7), t_of(b), 0.6, pan=-0.3, send=0.2)
melody(BR1, 108, 1.05)
melody(BR2, 118, 1.1)
# build into hooray
for i, b in enumerate(range(124, 132)):
    place(kick(0.7 + 0.05*i), t_of(b), 0.9)
place(pad([65, 69, 72, 77], 6.0, 0.8), 120.0, 1.0, send=0.55)
sparkle_run([84, 88, 91, 96], 0.09, 0.9)

# OUTRO (beats 132–150)
bar_chords(132, ['C','F','C','G'], 0.95)
for b in range(132, 146):
    place(kick(0.85 if b % 2 == 0 else 0.5), t_of(b), 0.85)
    place(shaker(0.6), t_of(b), 0.6, pan=0.3, send=0.1)
melody([(72,0.5),(74,0.5),(76,0.5),(79,0.5),(76,1.0),(72,1.0),(72,2.0)], 132, 0.95)
place(pad([48, 55, 60, 64, 67], 5.5, 0.9), 144.0, 1.0, send=0.7)
place(bass(36, 3.2, 1.0), 144.0, 1.1, send=0.1)
for i, m in enumerate([72, 76, 79, 84, 88]):
    place(glock(m, 2.2, 0.75), t_of(144) + i*0.07, 0.8, pan=-0.4 + i*0.2, send=0.6)
place(glock(96, 3.0, 0.7), t_of(146), 0.7, send=0.8)

# ------------------------------------------------------------------ reverb
ir_len = int(1.9 * SR)
t = np.arange(ir_len) / SR
ir = rng.standard_normal(ir_len) * np.exp(-t * 3.1)
ir = lp(ir, 5200)
ir[: int(0.016*SR)] = 0
ir /= np.sqrt(np.sum(ir**2)) + 1e-9
irL = ir
irR = np.roll(ir, int(0.009 * SR))
wetL = fftconvolve(SEND, irL)[:N]
wetR = fftconvolve(SEND, irR)[:N]
L = L + 0.55 * wetL
R = R + 0.55 * wetR

# ------------------------------------------------------------------ master
L = hp(L, 26)
R = hp(R, 26)

# gentle bus compression
def comp(x, thr=0.5, ratio=2.6, att=0.008, rel=0.22):
    env = np.abs(x)
    a = np.exp(-1/(SR*att)); r = np.exp(-1/(SR*rel))
    e = np.zeros_like(env)
    prev = 0.0
    for i in range(len(env)):
        c = a if env[i] > prev else r
        prev = c*prev + (1-c)*env[i]
        e[i] = prev
    gain = np.where(e > thr, (thr + (e - thr)/ratio) / np.maximum(e, 1e-9), 1.0)
    return x * gain

L = comp(L); R = comp(R)

# soft clip + normalise
def soft(x, d=1.6):
    return np.tanh(x * d) / np.tanh(d)

peak = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-9
L = soft(L / peak * 1.05)
R = soft(R / peak * 1.05)

# fade the last 40 ms to avoid a click, and the first 10 ms
fade = int(0.04 * SR)
L[-fade:] *= np.linspace(1, 0, fade)
R[-fade:] *= np.linspace(1, 0, fade)
in_f = int(0.01 * SR)
L[:in_f] *= np.linspace(0, 1, in_f)
R[:in_f] *= np.linspace(0, 1, in_f)

m = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-9
L = L / m * 0.84
R = R / m * 0.84

os.makedirs('assets', exist_ok=True)
wavfile.write('assets/score.wav', SR, np.stack([L, R], axis=1).astype(np.float32))
print('wrote assets/score.wav', len(L)/SR, 's')
