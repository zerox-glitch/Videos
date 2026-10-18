#!/usr/bin/env python3
"""mix.py — VO processing + iterative master for THE INTERNET ON PAPER.

Reads plan/beats.json vo windows; trims/places takes at −12 dBFS; ducks the
cinematic score to 42 % under VO; light VO reverb; iterative loudness loop to
TARGET −13.0 LUFS with WAV peak pinned ≤ −4.5 dBFS (AAC headroom).
Writes assets/mix.wav (stereo 44.1 kHz).
"""
import json, os, subprocess, math, shutil, tempfile
import numpy as np
from scipy.io import wavfile
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FFMPEG = os.path.join(os.path.expanduser('~'), '.local', 'bin', 'ffmpeg')
SR = 44100
DUR = 128.0
N = int(SR * DUR)

with open(os.path.join(ROOT, 'plan', 'beats.json')) as f:
    BEATS = json.load(f)

VO_DIR = os.path.join(ROOT, 'assets', 'vo')
DUCK = 0.42
SCORE_G = 0.80
TARGET = -14.25   # decoded-chain target; buys ~0.3 dB peak margin
CEIL = 10 ** (-7.8 / 20)   # native AAC rings hard (+~5 dB) on this transient material:
                           # calibrate the WAV ceiling against the DECODED chain
TAKE_DB = 10 ** (-12 / 20)

def decode(path, ch=1):
    raw = subprocess.run(
        [FFMPEG, '-hide_banner', '-loglevel', 'error', '-i', path,
         '-ar', str(SR), '-ac', str(ch), '-f', 'f32le', '-'],
        capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return x.reshape(-1, ch) if ch > 1 else x

def start_trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0: return x
    s = max(0, idx[0] - int(0.05 * SR))
    return x[s:]

def fade_io(x, fi=12, fo=30):
    n = len(x)
    fi = min(int(fi / 1000 * SR), n // 2); fo = min(int(fo / 1000 * SR), n // 2)
    if fi: x[:fi] *= np.linspace(0, 1, fi)
    if fo: x[-fo:] *= np.linspace(1, 0, fo)
    return x

# ---------- place VO takes -------------------------------------------------
vo_bus = np.zeros(N)
duck_env = np.zeros(N)
for take in BEATS['vo']:
    tid = take['id']
    mp3 = os.path.join(VO_DIR, f'{tid}.mp3')
    x = start_trim(decode(mp3))
    peak = np.abs(x).max() or 1.0
    x = x * (TAKE_DB / peak)
    max_n = int(take['win'] * SR)
    if len(x) > max_n:
        print(f'  ! {tid} {len(x)/SR:.2f}s > win {take["win"]}s — trimming tail')
        x = x[:max_n]
    x = fade_io(x.copy())
    i0 = int(take['t'] * SR)
    n = min(len(x), N - i0)
    vo_bus[i0:i0 + n] += x[:n]
    duck_env[i0:i0 + n] = np.maximum(duck_env[i0:i0 + n], 1.0)
    print(f'  take {tid:6s} @{take["t"]:7.2f}  {len(x)/SR:5.2f}s')

# smooth duck envelope (45 ms down / 350 ms up)
def smooth(env, up_win, down_win):
    up = np.ones(up_win) / up_win
    dn = np.ones(down_win) / down_win
    e = signal.lfilter(dn, [1], env)
    e = np.maximum(e, signal.lfilter(up, [1], env))
    return np.clip(e, 0, 1)
du = int(0.045 * SR); ur = int(0.35 * SR)
d_env = smooth(duck_env, du, ur)
duck = 1.0 - (1.0 - DUCK) * d_env

# ---------- score + reverb --------------------------------------------------
sr_score, score = wavfile.read(os.path.join(ROOT, 'assets', 'score.wav'))
score = score.astype(np.float64) / 32768.0
if len(score) < N:
    score = np.vstack([score, np.zeros((N - len(score), 2))])
score = score[:N]
if score.shape[1] == 1:
    score = np.repeat(score, 2, axis=1)
score *= SCORE_G * duck[:, None]

# small plate-ish reverb on VO (exp-decay noise IR, 1.1 s, wet 0.13)
rng = np.random.default_rng(4242)
ir_n = int(1.1 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.linspace(0, 7, ir_n))
ir[:int(0.012 * SR)] = 0
ir /= np.abs(ir).sum() / 40
vo_st = np.stack([vo_bus, vo_bus], axis=1)
wet = np.zeros_like(vo_st)
for c in range(2):
    w = signal.fftconvolve(vo_bus, ir if c == 0 else ir * 0.92)[:N]
    wet[:, c] = w
vo_mix = vo_st * (1 - 0.13) + wet * 0.13

mix = score + vo_mix

# ---------- iterative loudness loop ---------------------------------------
tmpd = tempfile.mkdtemp()
tmp_wav = os.path.join(tmpd, 'iter.wav')
tmp_mp4 = os.path.join(tmpd, 'iter.mp4')
tmp_dec = os.path.join(tmpd, 'iter_dec.wav')

def measure(x):
    """Write WAV -> encode exactly like render.mjs -> decode -> (I, peak)."""
    wavfile.write(tmp_wav, SR, np.clip(x * 32767, -32767, 32767).astype(np.int16))
    subprocess.run(
        [FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', '-i', tmp_wav,
         '-af', 'lowpass=f=14000', '-c:a', 'aac', '-b:a', '320k', tmp_mp4],
        check=True, capture_output=True)
    subprocess.run(
        [FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', '-i', tmp_mp4,
         '-vn', '-c:a', 'pcm_f32le', tmp_dec],
        check=True, capture_output=True)
    dec = wavfile.read(tmp_dec)[1].astype(np.float64)
    pk = 20 * math.log10(max(np.abs(dec).max() / 32768.0, 1e-9)) if dec.dtype != np.float32 \
        else 20 * math.log10(max(np.abs(dec).max(), 1e-9))
    if np.issubdtype(wavfile.read(tmp_dec)[0].dtype if False else np.int16, np.integer):
        pass
    r = subprocess.run(
        [FFMPEG, '-hide_banner', '-nostats', '-i', tmp_dec, '-af', 'ebur128', '-f', 'null', '-'],
        capture_output=True, text=True)
    I = None
    for line in r.stderr.splitlines():
        s = line.strip()
        if s.startswith('I:') and 'LUFS' in s:
            I = float(s.split()[1])
    if np.issubdtype(np.asarray(dec).dtype, np.integer):
        pk = 20 * math.log10(max(np.abs(dec).max() / 32767.0, 1e-9))
    else:
        # pcm_f32le decode stays float
        pk = 20 * math.log10(max(np.abs(dec).max(), 1e-9))
    return I, pk

def softclip(x, th=0.42):
    a = np.abs(x)
    over = a > th
    y = x.copy()
    y[over] = np.sign(x[over]) * (th + (1 - th) * np.tanh((a[over] - th) / (1 - th)))
    return y

# pre-normalize so the knee actually engages
peak = np.abs(mix).max()
mix = mix / max(peak, 1e-9) * 0.95

def out_tail(_):
    return ''

g = 1.0
I, pk = None, None
prevI = None
th = 0.42
for it in range(16):
    out = softclip(mix * g, th)
    p = np.abs(out).max()
    if p > CEIL:
        out *= CEIL / p
    I, pk = measure(out)
    if I is None:
        print('MEASURE FAIL')
        break
    print(f'  I={I:+.2f} LUFS  dec_peak={pk:+.2f}  g={g:.3f}  th={th:.2f}  it={it}')
    if abs(I - TARGET) <= 0.3 and pk <= -1.8:
        break
    if prevI is not None and abs(I - prevI) < 0.15 and abs(I - TARGET) > 0.3:
        th = max(0.25, th * 0.8)
        print(f'   (loudness stall -> deeper knee th={th:.2f})')
    g_prev = g
    prevI = I
    g *= 10 ** ((TARGET - I) / 20)
    if abs(g - g_prev) < 0.01 * g_prev and abs(I - TARGET) <= 0.3:
        break

final = out
wavfile.write(os.path.join(ROOT, 'assets', 'mix.wav'),
              SR, np.clip(final * 32767, -32767, 32767).astype(np.int16))
I2, pk2 = measure(final)
shutil.rmtree(tmpd, ignore_errors=True)
print(f'mix.wav  I={I2:+.2f} LUFS  peak={pk2:+.2f} dBFS')
