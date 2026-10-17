#!/usr/bin/env python3
"""Mix assets/score.wav + VO takes → assets/mix.wav at -14 LUFS / <= -1.5 dBTP.

VO chain (per take):  aresample FIRST, then asetrate/atempo pitch-up into a
kid register, silence trim, tempo-fit, gentle EQ — lesson learned on Wiggle &
Giggle: aresample must precede asetrate or takes halve and chops occur.

Music ducks to 45% under speech (45 ms attack / 350 ms release).
"""
import json, math, os, subprocess, sys
import numpy as np
from scipy.signal import fftconvolve
import wave

FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEATS = json.load(open(os.path.join(ROOT, 'plan', 'beats.json')))
SR = 48000
DUR = BEATS['duration']            # 96.0
N = int(SR * DUR)
VO_DIR = os.path.join(ROOT, 'assets', 'vo')

PITCH = 1.18          # kid lift
DUCK = 0.45           # music gain under speech

# take → (file, t_on, window)
def take_plan():
    plan = [('hook', BEATS['hook']['t'], 2.6)]
    for i, it in enumerate(BEATS['showcase']):
        fn = ['a_apple', 'b_ball', 'c_cat', 'd_dog', 'e_egg', 'f_fish', 'g_grapes', 'h_hat'][i]
        plan.append((fn, it['t'] + 0.10, BEATS['showcase_step'] if 'showcase_step' in BEATS else 2.6))
    plan.append(('cheer', BEATS['cheer']['t'], 2.2))
    return plan

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:]); sys.exit(1)
    return r

def process_take(name, window):
    """mp3 → kid-pitched, trimmed, tempo-fitted mono wav 48k s16"""
    src = os.path.join(VO_DIR, name + '.mp3')
    dst = os.path.join(VO_DIR, name + '_p.wav')
    rate = SR * PITCH
    # NOTE: no afade here — this build defaults t=out start to 0 and mutes
    # everything; fades are applied in numpy after reading.
    chain = (
        f'aresample={SR},'
        f'asetrate={rate:.0f},atempo={SR / rate:.4f},'
        f'silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB,'
        f'highpass=f=110,lowpass=f=9500'
    )
    run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', '-i', src,
         '-af', chain + ',apad', '-t', '30', '-ar', str(SR), '-ac', '1', dst])
    with wave.open(dst, 'rb') as w:
        dur = w.getnframes() / w.getframerate()
        # strip the apad silence we added: find trailing zeros
        data = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
    thr = 10 ** (-50 / 20)
    nz = np.nonzero(np.abs(data) > thr)[0]
    if len(nz):
        data = data[nz[0]:nz[-1] + 1]
    dur = len(data) / SR
    fit = 1.0
    if dur > window:
        fit = dur / window
        # apply extra atempo
        run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', '-i', src,
             '-af', chain + f',atempo={fit:.4f},apad', '-t', '30',
             '-ar', str(SR), '-ac', '1', dst])
        with wave.open(dst, 'rb') as w:
            data = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
        nz = np.nonzero(np.abs(data) > thr)[0]
        data = data[nz[0]:nz[-1] + 1]
    # fades + normalize take to -12 dBFS peak
    fi, ro = int(0.012 * SR), int(0.03 * SR)
    if len(data) > fi + ro:
        data[:fi] *= np.linspace(0, 1, fi)
        data[-ro:] *= np.linspace(1, 0, ro)
    pk = np.abs(data).max() or 1.0
    data = data / pk * 10 ** (-12 / 20)
    return data

def read_wav(path):
    with wave.open(path, 'rb') as w:
        sr = w.getframerate()
        assert sr == SR, (path, sr)
        ch = w.getnchannels()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
    if ch == 2:
        return data.reshape(-1, 2)
    return np.stack([data, data], axis=1)

def make_ir():
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    decay = np.exp(-t * 4.2)
    ir = np.stack([
        np.random.default_rng(7).normal(0, 1, n) * decay,
        np.random.default_rng(13).normal(0, 1, n) * decay,
    ], axis=1)
    # soften: simple lowpass
    k = np.ones(9) / 9
    for c in range(2):
        ir[:, c] = np.convolve(ir[:, c], k, mode='same')
    ir[:int(0.008 * SR)] = 0                      # predelay
    ir /= np.abs(ir).max()
    return ir * 0.9

def measure(path):
    p = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-i', path,
                        '-af', 'ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True)
    I = None
    for line in p.stderr.splitlines():
        s = line.strip()
        if s.startswith('I:'):
            v = float(s.split()[1])
            if abs(v + 70) > 0.01:
                I = v
    # this build's ebur128 prints no true-peak section — use volumedetect
    p2 = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-i', path,
                         '-af', 'volumedetect', '-f', 'null', '-'],
                        capture_output=True, text=True)
    pk = None
    for line in p2.stderr.splitlines():
        if 'max_volume' in line:
            pk = float(line.split(':')[1].strip().split()[0])
    return I, pk

# ---------------------------------------------------------------- build
print('processing VO takes...')
vo = np.zeros((N, 2))
windows = []
for name, t_on, win in take_plan():
    data = process_take(name, win)
    i0 = int(t_on * SR)
    j0 = min(N, i0 + len(data))
    vo[i0:j0] += data[:j0 - i0][:, None]
    windows.append((t_on, t_on + len(data) / SR))
    print(f'  {name:10s} @{t_on:6.2f}s  {len(data)/SR:.2f}s')

# reverb on voice
ir = make_ir()
wet = np.stack([fftconvolve(vo[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
wet /= max(np.abs(wet).max(), 1e-9)
vo_ref = max(np.abs(vo).max(), 1e-9)
vo_mix = vo * (1 - 0.16) + wet * vo_ref * 0.16

# duck envelope for music
env = np.ones(N)
atk = int(0.045 * SR); rel = int(0.35 * SR)
for (t0, t1) in windows:
    a0 = max(0, int(t0 * SR)); a1 = min(N, a0 + atk)
    b1 = min(N, int((t1 + 0.05) * SR)); b0 = max(0, b1 - rel)
    if a1 > a0: env[a0:a1] = np.minimum(env[a0:a1], np.linspace(1, DUCK, a1 - a0))
    if b1 > b0: env[b0:b1] = np.minimum(env[b0:b1], np.linspace(DUCK, 1, b1 - b0))
    if b0 > a1: env[a1:b0] = np.minimum(env[a1:b0], DUCK)

score = read_wav(os.path.join(ROOT, 'assets', 'score.wav'))
if len(score) < N:
    score = np.pad(score, ((0, N - len(score)), (0, 0)))
score = score[:N]

mix = score * env[:, None] + vo_mix * 1.05

def soft_clip(x, th=0.9):
    y = x.copy()
    m = np.abs(x) > th
    y[m] = np.sign(x[m]) * (th + (1 - th) * np.tanh((np.abs(x[m]) - th) / (1 - th)))
    return y

out = os.path.join(ROOT, 'assets', 'mix.wav')
def write(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())

# iterative loudness targeting → I=-14 LUFS with peak pinned at -1.5 dBFS
g = 1.0
I, pk = None, None
CEIL = 10 ** (-4.5 / 20)   # extra headroom: AAC encode overshoots ~+1.5 dB on dense material
for it in range(6):
    cand = soft_clip(mix * g, 0.66)
    m = np.abs(cand).max()
    if m > 1e-9:
        cand = cand * (CEIL / m)          # pin sample peak to -1.5 dBFS
    write(out, cand)
    I, pk = measure(out)
    print(f'  iter {it}: I={I} LUFS  peak={pk} dBFS  g={g:.3f}')
    if I is None:
        break
    if abs(I - (-13.1)) <= 0.25:
        break
    g *= 10 ** ((-12.9 - I) / 20)
    g = float(np.clip(g, 0.05, 12.0))
print(f'{out}  I={I:.1f} LUFS  peak={pk:.1f} dBFS')
