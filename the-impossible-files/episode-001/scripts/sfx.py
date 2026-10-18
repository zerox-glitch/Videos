#!/usr/bin/env python3
"""sfx.py — procedural one-shot SFX library (36 ids) for EP.001.
Deterministic (seeded), 48 kHz stereo WAVs → audio/sfx/<id>.wav.
No external samples — synthesized per skill's procedural-SFX authorization."""
import os, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, fftconvolve

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio', 'sfx')
os.makedirs(OUT, exist_ok=True)

def T(d): return np.linspace(0, d, int(SR * d), endpoint=False)
def env_ad(n, a, d, curve=3.0):
    e = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    if na: e[:na] = np.linspace(0, 1, na) ** 1.5
    if nd: e[-nd:] *= np.linspace(1, 0, nd) ** curve
    return e
def lp(x, fc, order=2):
    b, a = butter(order, min(fc / (SR / 2), 0.99), 'low'); return lfilter(b, a, x)
def hp(x, fc, order=2):
    b, a = butter(order, max(min(fc / (SR / 2), 0.99), 1e-4), 'high'); return lfilter(b, a, x)
def bp(x, f1, f2, order=2):
    b, a = butter(order, [max(f1 / (SR / 2), 1e-4), min(f2 / (SR / 2), 0.99)], 'band'); return lfilter(b, a, x)
def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)
def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x * (peak / m)
def rev_ir(d=1.4, seed=7, damp=4500):
    n = int(d * SR)
    ir = noise(n, seed) * np.exp(-np.linspace(0, 7, n))
    ir = lp(ir, damp)
    ir[:80] *= np.linspace(0, 1, 80)
    return ir / (np.max(np.abs(ir)) or 1)
def verb(x, amt=0.3, d=1.4, seed=7):
    conv = fftconvolve(x, rev_ir(d, seed))
    conv *= amt / (np.max(np.abs(conv)) or 1) * (np.max(np.abs(x)) or 1)
    conv[:len(x)] += x
    return conv
def stereo(x, spread=0.12, seed=3):
    n = len(x)
    d = int(SR * 0.004)
    l = x.copy(); r = x.copy()
    rg = np.random.default_rng(seed)
    l = l + spread * np.concatenate([np.zeros(d), x[:-d]]) * rg.uniform(0.6, 1.0)
    r = r + spread * np.concatenate([x[d:], np.zeros(d)]) * rg.uniform(0.6, 1.0)
    return np.stack([l, r], 1)
def save(name, x, peak=0.9):
    x = norm(x, peak)
    wavfile.write(os.path.join(OUT, f'{name}.wav'), SR, (x * 32767).astype(np.int16))
    print('·', name)

def sine(f, t, ph=0.0):
    if np.isscalar(f): return np.sin(2 * np.pi * f * t + ph)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)
def saw(f, t):
    ph = np.cumsum(np.full_like(t, f)) / SR
    return 2 * (ph % 1.0) - 1

# ── generators ──────────────────────────────────────────────
def sub_pulse(d=0.7, f0=62, f1=34, seed=1):
    t = T(d)
    f = np.linspace(f0, f1, len(t)) ** 1
    x = sine(f, t) * env_ad(len(t), 0.004, d * 0.9, 2.2)
    x += 0.18 * lp(noise(len(t), seed), 260) * env_ad(len(t), 0.002, d * 0.5)
    return verb(x, 0.22, 1.0, seed)

def whoosh(d=1.0, down=True, seed=5, f1=2600, f2=260):
    n = int(d * SR); t = T(d)
    x = noise(n, seed)
    # sweeping bandpass via chunk-wise filtering
    out = np.zeros(n)
    K = 24
    for i in range(K):
        a, b = i * n // K, (i + 1) * n // K
        u = i / (K - 1)
        fc = f1 * (f2 / f1) ** (u if down else 1 - u)
        out[a:b] = bp(x[max(a - 600, 0):b], max(fc * 0.5, 60), min(fc * 1.7, 18000))[-(b - a):]
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.3
    return out * env

def riser(d=2.0, seed=11, f0=90, f1=1400, tail=True):
    t = T(d); n = len(t)
    f = f0 * (f1 / f0) ** (np.linspace(0, 1, n) ** 1.6)
    x = 0.5 * sine(f, t)
    x += 0.7 * bp(noise(n, seed), 400, 6000) * np.linspace(0, 1, n) ** 2
    e = np.linspace(0.02, 1, n) ** 2
    if tail:
        k = int(0.05 * SR); e[-k:] *= np.linspace(1, 0, k)
    return verb(x * e, 0.3, 1.2, seed)

def impact(d=1.8, seed=21, f0=70, f1=32, crack=0.5):
    t = T(d); n = len(t)
    f = f0 * (f1 / f0) ** (np.linspace(0, 1, n) ** 0.35)
    x = sine(f, t) * env_ad(n, 0.002, d * 0.96, 2.0)
    x += crack * 0.45 * hp(noise(n, seed), 1200) * env_ad(n, 0.001, 0.10, 3.5)
    x += 0.30 * lp(noise(n, seed + 1), 180) * env_ad(n, 0.003, 0.5, 2.4)
    return verb(x, 0.4, d * 0.9, seed)

def padadd(a, b):
    n = max(len(a), len(b))
    out = np.zeros(n)
    out[:len(a)] += a
    out[:len(b)] += b
    return out

def beep(f, d=0.14, vib=0.0, shape='sine'):
    t = T(d)
    if shape == 'square':
        x = np.sign(sine(f, t)) * 0.5
    else:
        x = sine(f * (1 + vib * np.sin(2 * np.pi * 6 * t)), t)
    return x * env_ad(len(t), 0.006, d * 0.8, 2.0)

def tone(f, d, det=0.003):
    t = T(d)
    x = sine(f, t) + 0.6 * sine(f * (1 + det), t) + 0.25 * sine(f * 2, t)
    return x * env_ad(len(t), 0.12, d * 0.7, 1.6)

def bell(f, d=2.2, seed=31):
    t = T(d); n = len(t)
    mod = sine(f * 2.76, t) * np.exp(-np.linspace(0, 9, n)) * 3.2
    x = np.sin(2 * np.pi * f * t + mod)
    x *= np.exp(-np.linspace(0, 5.5, n))
    return verb(x, 0.5, 1.6, seed)

def heart(d=1.1, seed=41):
    n = int(d * SR); x = np.zeros(n)
    for off, amp, f in [(0.0, 1.0, 55), (0.34, 0.7, 48)]:
        i0 = int(off * SR); seg = T(0.26)
        s = sine(f * (np.linspace(1, 0.6, len(seg))), seg) * env_ad(len(seg), 0.005, 0.24, 2.4)
        x[i0:i0 + len(seg)] += amp * s
    return verb(x, 0.18, 0.8, seed)

def rumble(d=3.0, seed=51, fc=120):
    n = int(d * SR)
    x = lp(noise(n, seed), fc) * 4 + 0.4 * sine(38, T(d))
    return x * env_ad(n, 0.25, d * 0.7, 1.4)

def air(d=3.0, seed=61, fc=1800, lvl=1.0):
    n = int(d * SR)
    x = lp(noise(n, seed), fc) * lvl
    x *= 1 + 0.25 * np.sin(2 * np.pi * 0.4 * T(d))
    return x

def glitch(d=0.35, seed=71):
    n = int(d * SR)
    x = bp(noise(n, seed), 700, 9000)
    step = int(SR * 0.02)
    for i in range(0, n, step):            # gated stutters
        x[i:i + step] *= 1.0 if (i // step) % 2 == 0 else 0.15
    return x * env_ad(n, 0.004, d * 0.6, 2.0)

# ── render all ──────────────────────────────────────────────
def main():
    save('sub_pulse', stereo(sub_pulse(0.7)), 0.85)
    save('vent', stereo(air(3.2, 62, 900, 0.9), seed=62), 0.5)
    save('meas_blip', stereo(padadd(beep(1180, 0.12), 0.4 * beep(2360, 0.06)), seed=63), 0.7)
    save('dot_blink', stereo(beep(1560, 0.07) + 0.6 * beep(1560, 0.07)[::-1], seed=64), 0.6)
    save('sub_tick', stereo(beep(160, 0.09), seed=65), 0.55)
    save('hum_tick', stereo(beep(420, 0.10, shape='square'), seed=66), 0.4)
    save('scan_pulse', stereo(np.concatenate([beep(880, 0.16), beep(1320, 0.16), beep(990, 0.2)]), seed=67), 0.7)
    save('scan_start', stereo(np.concatenate([beep(660, 0.08, shape='square'), whoosh(0.5, down=False, seed=68, f1=700, f2=3000)]), seed=69), 0.7)
    save('warning_beep', stereo(np.concatenate([beep(740, 0.18, shape='square'), np.zeros(int(0.06 * SR)), beep(560, 0.18, shape='square')]), seed=70), 0.6)
    save('whoosh', stereo(whoosh(1.0, seed=5), 0.16, 5), 0.8)
    save('soft_whoosh', stereo(whoosh(0.8, seed=6, f1=1600, f2=340), 0.14, 6), 0.55)
    save('pull_whoosh', stereo(whoosh(0.9, down=False, seed=7, f1=240, f2=2400), 0.16, 7), 0.6)
    save('riser_short', stereo(riser(1.2, 11), 0.15, 11), 0.72)
    save('riser_mid', stereo(riser(2.2, 12, 80, 1200), 0.15, 12), 0.75)
    save('riser_late', stereo(riser(3.0, 13, 70, 1800), 0.15, 13), 0.78)
    for i in range(6):
        save(f'impact_{i + 1}', stereo(impact(1.7, 21 + i, 70 - i * 3, 30, 0.45 + 0.05 * (i % 3)), 0.12, 21 + i), 0.9)
    save('impact_mid', stereo(impact(2.0, 27, 66, 27, 0.55), 0.14, 27), 0.9)
    save('impact_final', stereo(impact(2.6, 29, 78, 28, 0.7), 0.16, 29), 0.95)
    save('collapse_rumble', stereo(rumble(3.0, 51, 100), 0.18, 51), 0.8)
    save('metal_click', stereo(hp(padadd(beep(2900, 0.06, shape='square'), beep(1750, 0.05)), 900), seed=72), 0.6)
    save('metal_far', stereo(verb(bp(saw(70, T(1.4)), 140, 900) * env_ad(int(1.4 * SR), 0.3, 0.8, 1.5), 0.5, 1.4, 73), 0.2, 73), 0.55)
    save('room_tone', stereo(air(3.4, 61, 1400, 1.0), seed=61), 0.35)
    save('hall_amb', stereo(lp(air(3.4, 62, 700, 1.2), 700) + 0.3 * sine(46, T(3.4)), seed=62), 0.45)
    save('heart', stereo(heart(1.1), 0.1, 41), 0.75)
    save('monitor_buzz', stereo((0.5 * beep(120, 0.8, shape='square') + 0.4 * bp(noise(int(0.8 * SR), 81), 900, 5000) * 0.4), seed=82), 0.45)
    save('feed_glitch', stereo(glitch(0.35), 0.2, 71), 0.65)
    save('feed_lock_beep', stereo(np.concatenate([beep(880, 0.1), beep(1100, 0.1), beep(1480, 0.18)]), seed=83), 0.65)
    save('ring_ping', stereo(verb(np.concatenate([beep(2640, 0.5), 0.5 * beep(3960, 0.4)]), 0.45, 1.2, 84), seed=84), 0.6)
    n = int(1.2 * SR)
    save('breath_rev', stereo(bp(noise(n, 91), 300, 3500) * (np.linspace(0, 1, n) ** 2.2), 0.2, 91), 0.55)
    n = int(1.5 * SR)
    save('stop_swell', stereo(hp(noise(n, 92), 2500) * (np.linspace(0, 1, n) ** 2.6), 0.2, 92), 0.55)
    save('tone_high', stereo(verb(tone(880, 1.1), 0.4, 1.4, 93), 0.25, 93), 0.5)
    save('metal_click2', stereo(hp(beep(2500, 0.05, shape='square'), 1000), seed=74), 0.5)

if __name__ == '__main__':
    main()
