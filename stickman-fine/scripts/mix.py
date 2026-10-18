#!/usr/bin/env python3
"""mix.py — score + VO -> assets/mix.wav, master targeted for the AAC stage:
WAV lands at -13.6 LUFS / -4.5 dBFS; the renderer's 14 kHz LP + AAC encode
then lands the MP4 near -14.0 LUFS with peak <= -1.5 dB (lessons from
ABC Pixel Party). Voice is the raw adult voice-00 — no pitch shift.
"""
import json, os, subprocess, sys
import numpy as np
from scipy.signal import fftconvolve
import wave

FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEATS = json.load(open(os.path.join(ROOT, 'plan', 'beats.json')))
SR = 48000
DUR = BEATS['meta']['dur']          # 72.0
N = int(SR * DUR)
VO_DIR = os.path.join(ROOT, 'assets', 'vo')

DUCK = 0.42
SCORE_G = 0.55                      # bed: -11.7 LUFS score -> ~-16.5
TARGET = -13.0                      # WAV target (AAC+LP will land ~-14.0)
CEIL = 10 ** (-4.5 / 20)

# take windows (seconds) — generous; overrun gets tempo-fitted
WINDOWS = {'hook': 2.4, 'p1': 3.6, 'p2': 2.2, 'p3': 5.0, 'p4': 5.8,
           'p5': 3.8, 'outro': 3.4, 'boss': 1.8}

def take_plan():
    order = ['hook', 'p1', 'p2', 'p3', 'p4', 'p5', 'outro', 'boss']
    return [(k, BEATS['vo'][k]['t'], WINDOWS[k]) for k in order]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:]); sys.exit(1)
    return r

def process_take(name, window):
    src = os.path.join(VO_DIR, name + '.mp3')
    dst = os.path.join(VO_DIR, name + '_p.wav')
    chain = (
        f'aresample={SR},'
        f'silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB,'
        f'highpass=f=90,lowpass=f=9000'
    )
    run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', '-i', src,
         '-af', chain + ',apad', '-t', '30', '-ar', str(SR), '-ac', '1', dst])
    with wave.open(dst, 'rb') as w:
        data = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
    thr = 10 ** (-50 / 20)
    nz = np.nonzero(np.abs(data) > thr)[0]
    if len(nz):
        data = data[nz[0]:nz[-1] + 1]
    dur = len(data) / SR
    if dur > window:
        fit = dur / window
        run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', '-i', src,
             '-af', chain + f',atempo={fit:.4f},apad', '-t', '30',
             '-ar', str(SR), '-ac', '1', dst])
        with wave.open(dst, 'rb') as w:
            data = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
        nz = np.nonzero(np.abs(data) > thr)[0]
        data = data[nz[0]:nz[-1] + 1]
    fi, ro = int(0.012 * SR), int(0.03 * SR)
    if len(data) > fi + ro:
        data[:fi] *= np.linspace(0, 1, fi)
        data[-ro:] *= np.linspace(1, 0, ro)
    pk = np.abs(data).max() or 1.0
    return data / pk * 10 ** (-12 / 20)

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
    k = np.ones(9) / 9
    for c in range(2):
        ir[:, c] = np.convolve(ir[:, c], k, mode='same')
    ir[:int(0.008 * SR)] = 0
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
    p2 = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-i', path,
                         '-af', 'volumedetect', '-f', 'null', '-'],
                        capture_output=True, text=True)
    pk = None
    for line in p2.stderr.splitlines():
        if 'max_volume' in line:
            pk = float(line.split(':')[1].strip().split()[0])
    return I, pk

print('processing VO takes...')
vo = np.zeros((N, 2))
windows = []
for name, t_on, win in take_plan():
    data = process_take(name, win)
    i0 = int(t_on * SR)
    j0 = min(N, i0 + len(data))
    if i0 < N:
        vo[i0:j0] += data[:j0 - i0][:, None]
    windows.append((t_on, t_on + len(data) / SR))
    print(f'  {name:10s} @{t_on:6.2f}s  {len(data)/SR:.2f}s')

ir = make_ir()
wet = np.stack([fftconvolve(vo[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
wet /= max(np.abs(wet).max(), 1e-9)
vo_ref = max(np.abs(vo).max(), 1e-9)
vo_mix = vo * (1 - 0.13) + wet * vo_ref * 0.13

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
score = score[:N] * SCORE_G

mix = score * env[:, None] + vo_mix * 1.1
# pre-normalize so the soft-clip knee actually engages while the loop iterates
mix = mix / max(np.abs(mix).max(), 1e-9) * 0.95

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

g = 1.0
I, pk = None, None
for it in range(6):
    cand = soft_clip(mix * g, 0.66)
    m = np.abs(cand).max()
    if m > 1e-9:
        cand = cand * (CEIL / m)
    write(out, cand)
    I, pk = measure(out)
    print(f'  iter {it}: I={I} LUFS  peak={pk} dBFS  g={g:.3f}')
    if I is None:
        break
    if abs(I - TARGET) <= 0.3:
        break
    g *= 10 ** ((TARGET - I) / 20)
    g = float(np.clip(g, 0.05, 12.0))
print(f'{out}  I={I:.1f} LUFS  peak={pk:.1f} dBFS')
