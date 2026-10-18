#!/usr/bin/env python3
"""music.py — THE INTERNET ON PAPER cinematic score + designed SFX.

104 BPM, A minor, 128 s. Hybrid-cinematic: sub pulse, detuned pads, 16th saw
arps, tight hybrid drums, risers into every section boundary, brass stabs on
key picture events, darkening at the threat section, warm resolve at the outro.
Writes assets/score.wav (stereo).
"""
import json, os, math
import numpy as np
from scipy import signal

SR = 44100
DUR = 128.0
N = int(SR * DUR)
BPM = 104.0
SPB = 60.0 / BPM
BAR = SPB * 4

with open(os.path.join(os.path.dirname(__file__), '..', 'plan', 'beats.json')) as f:
    BEATS = json.load(f)

rng = np.random.default_rng(1047)
L = np.zeros(N); R = np.zeros(N)

def add(t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    n = min(len(sig), N - i)
    gl = gain * math.sqrt((1 - pan) / 2 + 0.5 * (1 - abs(pan)) * 0)  # simple
    gl = gain * (1 - max(0, pan) * 0.55)
    gr = gain * (1 + min(0, pan) * 0.55)
    L[i:i + n] += sig[:n] * gl
    R[i:i + n] += sig[:n] * gr

def env(n, a, d, s=0.0, sus=0.0, r=0.0):
    a, d, r = max(1, int(a * SR)), max(1, int(d * SR)), max(1, int(r * SR))
    out = np.zeros(n)
    k = 0
    seg = min(a, n); out[:seg] = np.linspace(0, 1, seg); k = seg
    if k < n:
        seg = min(d, n - k); out[k:k + seg] = np.linspace(1, s, seg); k += seg
    if k < n and sus > 0:
        seg = min(int(sus * SR), n - k); out[k:k + seg] = s; k += seg
    if k < n:
        seg = n - k
        out[k:] = s * np.exp(-np.linspace(0, 5, seg))
    return out

def expdec(n, tau):
    return np.exp(-np.linspace(0, n / SR, n) / tau)

def osc(kind, f, n, phase=0.0):
    t = np.arange(n) / SR
    ph = 2 * np.pi * f * t + phase
    if kind == 'sin': return np.sin(ph)
    if kind == 'saw': return 2 * ((f * t + phase / (2 * np.pi)) % 1.0) - 1
    if kind == 'sq': return np.sign(np.sin(ph))
    if kind == 'tri': return 2 * np.abs(2 * ((f * t) % 1.0) - 1) - 1
    return np.sin(ph)

def lp(x, fc, order=2):
    fc = min(fc, SR / 2 * 0.98)
    sos = signal.butter(order, fc / (SR / 2), 'low', output='sos')
    return signal.sosfilt(sos, x)

def hp(x, fc, order=2):
    sos = signal.butter(order, max(20, fc) / (SR / 2), 'high', output='sos')
    return signal.sosfilt(sos, x)

def bp(x, f1, f2, order=2):
    sos = signal.butter(order, [max(20, f1) / (SR / 2), min(SR / 2 * 0.98, f2) / (SR / 2)],
                        'band', output='sos')
    return signal.sosfilt(sos, x)

def noise(n): return rng.standard_normal(n)

NOTE = {'A1': 55.0, 'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.0,
        'A2': 110.0, 'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.0,
        'A3': 220.0, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
        'G4': 392.0, 'A4': 440.0, 'C5': 523.25, 'E5': 659.26, 'A5': 880.0}

# ─────────────────────────────────────────────── instruments
def kick(amp=1.0, sub=False):
    n = int(0.34 * SR)
    t = np.arange(n) / SR
    f = 155 * np.exp(-t * 28) + (46 if sub else 52)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * expdec(n, 0.10)
    s += noise(n)[:n] * expdec(n, 0.004) * 0.4
    return lp(s, 3000) * amp

def snare(amp=1.0, tight=0.0):
    n = int(0.26 * SR)
    body = osc('tri', 195, n) * expdec(n, 0.05) * 0.5
    nz = bp(noise(n), 1400, 9000) * expdec(n, 0.075 + tight)
    return (body + nz * 1.1) * amp

def hat(amp=1.0, open_=False):
    n = int((0.14 if open_ else 0.05) * SR)
    return hp(noise(n), 7500) * expdec(n, 0.05 if open_ else 0.014) * amp

def pluck(f, amp=1.0, dur=0.24, bright=2400):
    n = int(dur * SR)
    s = osc('saw', f, n) * 0.6 + osc('sq', f * 2, n) * 0.18
    e = expdec(n, dur * 0.32) * env(n, 0.003, 0.01, 1.0, dur * 0.4, 0.05)
    return lp(s * e, bright) * amp

def bassnote(f, dur, amp=1.0, growl=0.0):
    n = int(dur * SR)
    s = osc('saw', f, n) * (1 + growl * 0.5) + osc('sin', f, n) * 0.85
    if growl:
        s += osc('saw', f * 1.005, n) * growl * 0.6
    e = env(n, 0.006, 0.06, 0.8, dur * 0.6, 0.07)
    return lp(s * e, 420 + growl * 900) * amp

def sub(f, dur, amp=1.0):
    n = int(dur * SR)
    return osc('sin', f, n) * env(n, 0.01, 0.05, 0.9, dur * 0.7, 0.12) * amp

def padchord(freqs, dur, amp=1.0, cutoff=950, det=0.4):
    n = int(dur * SR)
    s = np.zeros(n)
    for f in freqs:
        s += osc('saw', f * (1 - det / 100), n) + osc('saw', f * (1 + det / 100), n)
    s /= max(1, len(freqs) * 2)
    e = env(n, dur * 0.18, dur * 0.3, 0.7, dur * 0.3, dur * 0.22)
    return lp(s * e, cutoff) * amp

def stab(freqs, amp=1.0, dur=0.5):
    n = int(dur * SR)
    s = np.zeros(n)
    for f in freqs:
        s += osc('saw', f, n) + osc('sq', f, n) * 0.4
    s /= max(1, len(freqs))
    e = env(n, 0.004, 0.10, 0.35, dur * 0.4, dur * 0.4)
    return lp(s * e, 3600) * amp

def riser(dur=1.3, amp=1.0, f0=200, f1=4200):
    n = int(dur * SR)
    nz = noise(n)
    # sweeping bandpass approximated in 6 chunks
    out = np.zeros(n)
    steps = 6
    for k in range(steps):
        a, b = k * n // steps, (k + 1) * n // steps
        fc = f0 * (f1 / f0) ** (k / (steps - 1))
        seg = bp(nz[max(0, a - 800):b], fc * 0.7, min(18000, fc * 1.6))
        out[a:b] = seg[-(b - a):]
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(np.linspace(180, 1400, n)) / SR
    tone = np.sin(ph) * 0.25
    e = np.linspace(0, 1, n) ** 1.6
    return (out * 0.7 + tone) * e * amp

def boom(amp=1.0):
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    f = 70 * np.exp(-t * 3) + 34
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * expdec(n, 0.45)
    s += lp(noise(n), 400) * expdec(n, 0.14) * 0.55
    return s * amp

def whoosh(dur=0.55, amp=1.0, rev=False):
    n = int(dur * SR)
    nz = bp(noise(n), 300, 4800)
    e = np.linspace(0, 1, n) ** 2 if not rev else np.linspace(1, 0, n) ** 1.4
    return nz * e * amp

# ─────────────────────────────────────────────── arrangement
CH = {
    'Am': [NOTE['A3'], NOTE['C4'], NOTE['E4'], NOTE['A4']],
    'F':  [NOTE['F3'], NOTE['A3'], NOTE['C4'], NOTE['F4']],
    'C':  [NOTE['C4'], NOTE['E4'], NOTE['G4'], NOTE['C5']],
    'G':  [NOTE['G3'], NOTE['B3'], NOTE['D4'], NOTE['G4']],
    'Dm': [NOTE['D3'], NOTE['F3'], NOTE['A3'], NOTE['D4']],
    'E':  [NOTE['E3'], NOTE['G4'] * 0.5, NOTE['B3'], NOTE['E4']],
}
ROOT = {'Am': NOTE['A1'], 'F': NOTE['F2'], 'C': NOTE['C2'], 'G': NOTE['G2'],
        'Dm': NOTE['D2'], 'E': NOTE['E2']}
# 2-bar chord blocks per section: (start, [chords x2 per 2 bars])
PROG = [
    (0.0,   ['Am', 'Am']),
    (8.0,   ['Am', 'F']),
    (26.0,  ['C', 'G']),
    (44.0,  ['Am', 'F']),
    (62.0,  ['Am', 'Am']),
    (80.0,  ['Am', 'F']),
    (98.0,  ['Dm', 'E']),
    (116.0, ['F', 'Am']),
]
def chord_at(t):
    cur = PROG[0][1][0]
    idx = 0
    for st, ch in PROG:
        if t >= st: cur_pair = ch; st0 = st
    # find pair + which bar
    cur_pair, st0 = PROG[0][1], PROG[0][0]
    for st, ch in PROG:
        if t >= st: cur_pair, st0 = ch, st
    bar_i = int((t - st0) / (BAR * 2))
    which = min(1, max(0, bar_i))
    # alternate chords each bar inside pair
    bi = int((t - st0) / BAR) % 2
    return cur_pair[bi]

def section_gain(t):
    # arrangement dynamics per section
    if t < 8:   return 0.55, 0.0, 0.0        # intro: pad+sub only
    if t < 26:  return 0.8, 1.0, 1.0         # packets: groove in
    if t < 44:  return 0.85, 1.0, 1.0        # dns
    if t < 62:  return 0.95, 1.0, 1.0        # speed: fullest
    if t < 80:  return 0.85, 1.0, 0.9        # datacenter: steppy
    if t < 98:  return 0.9, 1.0, 1.0         # crypto: dark
    if t < 116: return 0.7, 0.55, 1.0        # threat: half-time
    return 0.9, 0.7, 0.6                     # outro: release

# PAD (continuous, chord-following, wide)
t = 0.0
while t < 127.6:
    ch = chord_at(t)
    dur = BAR * 2
    freqs = [f for f in CH[ch]]
    cutoff = 700 if t >= 98 and t < 116 else (1250 if 44 <= t < 62 else 950)
    amp = 0.16 * section_gain(t)[0]
    p = padchord(freqs, dur * 1.04, amp, cutoff, det=0.45)
    add(t, p, 1.0, -0.35)
    p2 = padchord([f * 1.002 for f in freqs], dur * 1.04, amp * 0.9, cutoff * 0.9, det=0.6)
    add(t, p2, 1.0, +0.35)
    t += dur

# BASS + SUB (from intro sub, groove from 8)
t = 8.0
while t < 124.0:
    ch = chord_at(t)
    root = ROOT[ch]
    _, drum_on, bass_on = section_gain(t)
    # 8th-note pulse pattern
    for k in range(8):
        tt = t + k * SPB / 2
        if tt >= 124.0: break
        if tt >= 98 and tt < 116:
            if k not in (0, 3, 6): continue          # half-time sparse
        if k in (0, 2, 3, 5, 6, 7):
            g = 0.30 * bass_on * (1.15 if k == 0 else 1.0)
            add(tt, bassnote(root * 2, SPB / 2 * 0.92, g,
                             growl=0.5 if 98 <= tt < 116 else 0.15))
        if k == 0:
            add(tt, sub(root, SPB * 1.6, 0.34 * bass_on))
    t += BAR
# intro sub pulse
for k in range(6):
    tt = 0.5 + k * SPB
    if tt > 7.5: break
    add(tt, sub(NOTE['A1'], SPB, 0.22 * (0.6 + k * 0.07)))

# ARP (16ths; sections gate style)
def arp_section(t0, t1, mode='std', amp=1.0):
    steps = int(round((t1 - t0) / (SPB / 4)))
    for i in range(steps):
        tt = t0 + i * SPB / 4
        if tt >= 127.4: break
        ch = chord_at(tt)
        tones = CH[ch]
        idx = [0, 1, 2, 3, 2, 1, 2, 3][i % 8]
        if mode == 'fast': idx = [0, 2, 1, 3, 2, 3, 1, 2][i % 8]
        if mode == 'dark': idx = [0, 2, 3, 2, 0, 3, 2, 1][i % 8]
        if mode == 'sparse' and i % 2: continue
        f = tones[idx]
        if mode == 'fast': f *= 1.0 if i % 4 else 2.0
        a = 0.11 * amp * (1.0 if i % 4 else 1.35)
        pan = -0.5 if i % 2 else 0.5
        add(tt, pluck(f, a, 0.20, 2000 if mode == 'dark' else 2600), 1.0, pan)

arp_section(8.0, 26.0, 'std', 0.9)
arp_section(26.0, 44.0, 'fast', 0.85)
arp_section(44.0, 62.0, 'std', 1.0)
arp_section(62.0, 80.0, 'sparse', 0.95)
arp_section(80.0, 98.0, 'dark', 0.9)
arp_section(98.0, 112.0, 'dark', 0.5)
arp_section(116.0, 124.5, 'std', 0.8)

# DRUMS
def groove(t0, t1, mode='full', amp=1.0):
    tt = t0
    beat = 0
    while tt < min(t1, 126.5):
        bar_pos = beat % 4
        if mode == 'half':
            if bar_pos == 0: add(tt, kick(0.95 * amp))
            if bar_pos == 2: add(tt, snare(0.7 * amp))
        else:
            if bar_pos in (0, 2): add(tt, kick(0.9 * amp * (1.1 if bar_pos == 0 else 0.95)))
            if bar_pos in (1, 3): add(tt, snare(0.62 * amp))
            if bar_pos == 2 and int(tt / BAR) % 4 == 3: add(tt, kick(0.6 * amp))
        # hats: 8ths (16ths in speed)
        div = 4 if (44 <= tt < 62) else 2
        for h in range(div):
            ht = tt + h * SPB / div
            if ht >= min(t1, 126.5): break
            g = 0.16 if h == 0 else 0.10
            add(ht, hat(g * amp * (1.25 if h == 0 else 1.0), open_=(h == div - 1 and bar_pos == 3)))
        if mode == 'full' and bar_pos == 3:
            add(tt + SPB * 0.75, hat(0.12 * amp))
        tt += SPB
        beat += 1

groove(8.0, 44.0, 'full', 0.9)
groove(44.0, 62.0, 'full', 1.0)
groove(62.0, 80.0, 'full', 0.95)
groove(80.0, 98.0, 'full', 0.9)
groove(98.0, 116.0, 'half', 1.0)
groove(116.0, 124.0, 'full', 0.75)

# risers into every section boundary + title
for b in BEATS['glitch_cuts']:
    if b <= 8.0: continue
    add(b - 1.45, riser(1.45, 0.16, 240, 5200))
    add(b, boom(0.5))
add(3.9, riser(1.45, 0.2, 200, 6000))
add(5.4, boom(0.62))
# musical accents on picture events
for tt, g in [(34.0, 0.42), (52.0, 0.4), (54.6, 0.36), (73.0, 0.34),
              (88.8, 0.4), (96.6, 0.55), (103.3, 0.5), (116.4, 0.45),
              (122.8, 0.6), (23.6, 0.34), (119.6, 0.3)]:
    add(tt, boom(g))
# brass stabs (chord hits)
for tt in [5.4, 34.0, 44.0, 54.6, 80.0, 88.8, 96.6, 103.3, 122.8]:
    ch = chord_at(tt + 0.01)
    add(tt, stab(CH[ch], 0.34, 0.55), 1.0, 0.0)
# outro warm resolve
add(124.0, padchord(CH['Am'], 4.0, 0.30, 1400, det=0.5), 1.0, -0.3)
add(124.0, padchord([f * 1.001 for f in CH['Am']], 4.0, 0.27, 1300, det=0.6), 1.0, 0.3)
add(124.0, sub(NOTE['A1'], 3.4, 0.30))
add(124.0, stab(CH['Am'], 0.22, 1.6))

# ─────────────────────────────────────────────── SFX (from beats.sfx)
def s_boot():  return hp(bp(noise(int(0.07*SR)), 1800, 9000) * expdec(int(0.07*SR), 0.02), 900) * 0.5
def s_key():   return bp(noise(int(0.05*SR)), 900, 5200) * expdec(int(0.05*SR), 0.012) * 0.7
def s_type():  return bp(noise(int(0.05*SR)), 1500, 7000) * expdec(int(0.05*SR), 0.011) * 0.6
def s_glitch():
    n = int(0.16*SR); out = np.zeros(n)
    seg = n // 8
    for k in range(8):
        a = k * seg
        if k % 2 == 0:
            chunk = bp(noise(seg), 600, 9000) * expdec(seg, 0.02)
            chunk += osc('sq', 220 + k * 140, seg) * expdec(seg, 0.015) * 0.5
            out[a:a + seg] = chunk
    return out * 0.55
def s_stamp():
    n = int(0.3*SR); s = bp(noise(n), 200, 3000) * expdec(n, 0.03)
    s += osc('sin', 90, n) * expdec(n, 0.08) * 1.2
    return s * 0.9
def s_slide(): return whoosh(0.3, 0.5)
def s_rip():   return bp(noise(int(0.22*SR)), 900, 8000) * np.linspace(1, 0.2, int(0.22*SR)) * 0.55
def s_pop():   n = int(0.09*SR); return (osc('sin', 620, n) * expdec(n, 0.02) + bp(noise(n), 800, 6000) * expdec(n, 0.012)) * 0.6
def s_header(): return s_stamp() * 0.7
def s_wire():  n = int(0.5*SR); return bp(noise(n), 3000, 12000) * np.linspace(1, 0, n) ** 2 * 0.30
def s_zip2():
    n = int(0.25*SR)
    ph = 2 * np.pi * np.cumsum(np.linspace(350, 3600, n)) / SR
    return np.sin(ph) * np.linspace(1, 0, n) ** 1.5 * 0.35
def s_drop():
    n = int(0.3*SR)
    ph = 2 * np.pi * np.cumsum(np.linspace(900, 90, n)) / SR
    s = np.sin(ph) * expdec(n, 0.1)
    s += bp(noise(n), 400, 5000) * expdec(n, 0.05) * 0.7
    return s * 0.6
def s_rezip(): return s_zip2() * 1.1
def s_clack(): return s_key() * 1.2
def s_beep():
    n = int(0.12*SR); return (osc('sq', 1180, n) * expdec(n, 0.045)) * 0.35
def s_term():  n = int(0.18*SR); return bp(noise(n), 1200, 6500) * expdec(n, 0.05) * 0.5
def s_zap():
    n = int(0.16*SR)
    ph = 2 * np.pi * np.cumsum(np.linspace(2600, 300, n)) / SR
    return np.sin(ph) * expdec(n, 0.05) * 0.55
def s_hop():   return s_beep() * 0.8
def s_slam():
    n = int(0.5*SR); s = bp(noise(n), 150, 4000) * expdec(n, 0.06)
    s += osc('sin', 78, n) * expdec(n, 0.16) * 1.3
    return s * 0.85
def s_chip():  return s_beep() * 1.15
def s_tick():
    n = int(0.06*SR); return bp(noise(n), 2400, 9000) * expdec(n, 0.012) * 0.55
def s_map():   return whoosh(0.45, 0.4)
def s_whoosh(): return whoosh(0.6, 0.55)
def s_ding():
    n = int(0.5*SR)
    s = osc('sin', 1245, n) + osc('sin', 1867, n) * 0.4
    return s * expdec(n, 0.18) * 0.35
def s_bass():  return boom(0.4)
def s_ping():
    n = int(0.35*SR)
    s = osc('sin', 1480, n) * expdec(n, 0.1)
    s += osc('sin', 740, n) * expdec(n, 0.16) * 0.4
    return s * 0.4
def s_sweep():
    n = int(0.7*SR); out = np.zeros(n)
    for k in range(4):
        a, b = k * n // 4, (k + 1) * n // 4
        seg = bp(noise(n), 600 + k * 900, 2000 + k * 2200)
        out[a:b] = seg[a:b] * np.linspace(1, 0, b - a) ** 1.2
    return out * 0.35
def s_rack():
    n = int(0.4*SR); s = lp(noise(n), 700) * expdec(n, 0.14)
    s += osc('sin', 120, n) * expdec(n, 0.2) * 0.6
    return s * 0.5
def s_fan():
    n = int(0.5*SR); return lp(noise(n), 900) * env(n, 0.05, 0.1, 0.7, 0.2, 0.15) * 0.3
def s_fanout(): return s_whoosh() * 0.8
def s_stitch(): return s_wire() * 1.3
def s_slap():
    n = int(0.18*SR); s = bp(noise(n), 300, 5000) * expdec(n, 0.035)
    s += osc('sin', 170, n) * expdec(n, 0.07) * 0.9
    return s * 0.8
def s_gauge():
    n = int(0.45*SR)
    ph = 2 * np.pi * np.cumsum(np.linspace(220, 990, n)) / SR
    return np.sin(ph) * np.linspace(1, 0.3, n) * 0.3
def s_hum():
    n = int(0.6*SR)
    return lp(noise(n), 500) * env(n, 0.1, 0.2, 0.7, 0.2, 0.2) * 0.32
def s_click(): return s_tick() * 1.2
def s_ticket(): return s_slide() * 0.9
def s_swap():  return whoosh(0.3, 0.5)
def s_shred():
    n = int(0.35*SR); out = np.zeros(n); seg = n // 7
    for k in range(7):
        c = bp(noise(seg), 500 + k * 700, 3000 + k * 1400) * expdec(seg, 0.03)
        out[k * seg:(k + 1) * seg] = c
    return out * 0.5
def s_stall():
    n = int(0.55*SR)  # sad deflating tone
    ph = 2 * np.pi * np.cumsum(np.linspace(520, 180, n)) / SR
    return np.sin(ph) * np.linspace(1, 0, n) ** 1.4 * 0.32
def s_snap():
    n = int(0.25*SR); s = bp(noise(n), 700, 7000) * expdec(n, 0.02)
    s += osc('sin', 240, n) * expdec(n, 0.05)
    return s * 0.9
def s_drone():
    n = int(1.1*SR)
    s = osc('saw', 55, n) * 0.5 + osc('saw', 55.7, n) * 0.5 + osc('sin', 110, n) * 0.4
    return lp(s * env(n, 0.4, 0.3, 0.8, 0.2, 0.3), 380) * 0.42
def s_hook():
    n = int(0.4*SR)
    ph = 2 * np.pi * np.cumsum(np.linspace(1300, 260, n)) / SR
    return np.sin(ph) * expdec(n, 0.12) * 0.4
def s_alarm():
    n = int(0.6*SR)
    t = np.arange(n) / SR
    sq = osc('sq', 880, n) * (np.sign(np.sin(2 * np.pi * 9 * t)) * 0.5 + 0.5)
    return sq * env(n, 0.02, 0.1, 0.8, 0.3, 0.15) * 0.3
def s_hash():
    n = int(0.3*SR); out = np.zeros(n); seg = n // 9
    for k in range(9):
        c = osc('sq', 300 + k * 190, seg) * expdec(seg, 0.014)
        out[k * seg:(k + 1) * seg] = c
    return out * 0.4
def s_powerdown():
    n = int(1.0*SR)
    ph = 2 * np.pi * np.cumsum(np.linspace(680, 40, n)) / SR
    s = np.sin(ph) * np.linspace(1, 0, n) ** 1.2
    s += bp(noise(n), 200, 3000) * np.linspace(1, 0, n) ** 2 * 0.4
    return s * 0.5

SFX = {
    'boot_blip': s_boot, 'key_clack': s_key, 'type': s_type, 'glitch': s_glitch,
    'stamp': s_stamp, 'slide': s_slide, 'rip': s_rip, 'pop': s_pop,
    'header': s_header, 'wire': s_wire, 'zip': s_zip2, 'drop': s_drop,
    'rezip': s_rezip, 'clack': s_clack, 'beep': s_beep, 'term': s_term,
    'zap': s_zap, 'hop': s_hop, 'slam': s_slam, 'chip': s_chip, 'tick': s_tick,
    'map': s_map, 'whoosh': s_whoosh, 'ding': s_ding, 'bass': s_bass,
    'ping': s_ping, 'sweep': s_sweep, 'rack': s_rack, 'fan': s_fan,
    'fanout': s_fanout, 'stitch': s_stitch, 'slap': s_slap, 'gauge': s_gauge,
    'hum': s_hum, 'click': s_click, 'ticket': s_ticket, 'swap': s_swap,
    'shred': s_shred, 'stall': s_stall, 'snap': s_snap, 'drone': s_drone,
    'hook': s_hook, 'alarm': s_alarm, 'hash': s_hash, 'powerdown': s_powerdown,
}
for cue in BEATS['sfx']:
    fn = SFX.get(cue['id'], s_beep)
    sig = fn()
    if sig is None: continue
    add(cue['t'], sig, 1.0, 0.0)

# ─────────────────────────────────────────────── master
mix = np.stack([L, R], axis=1)
# gentle tape-ish saturation + presence tilt
mix = np.tanh(mix * 1.25) * 0.9
b, a = signal.butter(1, 60 / (SR / 2), 'high')
mix = signal.lfilter(b, a, mix, axis=0)
# fades
fi = int(0.5 * SR); fo0 = int(127.35 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix[fo0:] *= np.linspace(1, 0, N - fo0)[:, None] ** 1.5

os.makedirs('../assets', exist_ok=True)
from scipy.io import wavfile
peak = np.abs(mix).max()
mix = mix / max(peak, 1e-9) * 0.89
wavfile.write('../assets/score.wav', SR, (mix * 32767).astype(np.int16))
rms = np.sqrt(np.mean(mix ** 2))
print(f"score.wav  {DUR}s  peak={20*math.log10(np.abs(mix).max()):.2f} dBFS  rms={20*math.log10(rms):.2f}")
