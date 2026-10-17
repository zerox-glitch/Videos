#!/usr/bin/env python3
"""Mix the sing-along vocal takes over the score with gentle ducking."""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
import subprocess, os, sys

SR = 48000
FF = os.environ.get('FFMPEG', 'ffmpeg')
DUR = 75.0
N = int(SR * DUR)

# (file, start_time, target_duration or None, tempo)
TAKES = [
    ('verse1',  9.40, None, 1.00),
    ('chorus2', 21.30, 11.50, 1.00),   # reuse the tighter chorus take
    ('verse2',  33.40, 8.70, 1.00),
    ('chorus2', 42.30, 11.60, 1.00),
    ('bridge',  54.50, None, 1.00),
    ('outro',   68.45, None, 1.00),
]

def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def load_vo(name, target, tempo):
    src = f'assets/vo/{name}.mp3'
    out = f'assets/vo/{name}_p.wav'
    # pitch up a semitone for a brighter, younger sing-song read, then
    # time-correct, trim silence and (optionally) fit the target length.
    af = ['aresample=48000', 'asetrate=50870', 'atempo=0.9435']
    if target:
        # probe length first
        p = subprocess.run([FF, '-hide_banner', '-i', src], capture_output=True, text=True)
        dur = 0.0
        for line in (p.stderr or '').splitlines():
            if 'Duration:' in line:
                hms = line.split('Duration:')[1].split(',')[0].strip()
                h, m, s = hms.split(':')
                dur = int(h)*3600 + int(m)*60 + float(s)
        rate = max(0.75, min(1.5, (dur * 0.9435) / target))
        af.append(f'atempo={rate:.4f}')
    af += ['silenceremove=start_periods=1:start_threshold=-48dB',
           'areverse', 'silenceremove=start_periods=1:start_threshold=-48dB', 'areverse',
           'afade=t=in:st=0:d=0.02', 'afade=t=out:st=9999:d=0.05']
    run([FF, '-y', '-i', src, '-af', ','.join(af), '-ar', str(SR), '-ac', '1', out])

def read_wav(path):
    sr, d = wavfile.read(path)
    if d.dtype == np.int16:
        d = d.astype(np.float32) / 32768.0
    elif d.dtype == np.int32:
        d = d.astype(np.float32) / 2147483648.0
    if d.ndim > 1:
        d = d.mean(axis=1)
    return d

# ---------------------------------------------------------------- build
voice = np.zeros(N, dtype=np.float32)
for name, at, target, tempo in TAKES:
    load_vo(name, target, tempo)
    d = read_wav(f'assets/vo/{name}_p.wav')
    i = int(at * SR)
    n = min(len(d), N - i)
    if n <= 0:
        continue
    # fade edges so nothing clicks
    f = int(0.015 * SR)
    if len(d) > f*2:
        d[:f] *= np.linspace(0, 1, f)
        d[-f:] *= np.linspace(1, 0, f)
    voice[i:i+n] += d[:n] * 0.92
    print(f'{name:8s} at {at:5.2f}s  len {len(d)/SR:5.2f}s')

# small reverb on the voice
irn = int(1.1 * SR)
t = np.arange(irn) / SR
rng = np.random.default_rng(3)
ir = rng.standard_normal(irn) * np.exp(-t * 4.2)
sos = butter(2, 4800/(SR/2), btype='low', output='sos')
ir = sosfilt(sos, ir)
ir[:int(0.012*SR)] = 0
ir /= np.sqrt(np.sum(ir**2)) + 1e-9
from scipy.signal import fftconvolve
wet = fftconvolve(voice, ir)[:N].astype(np.float32)
voice = voice + 0.16 * wet

# band-limit the voice a little for a warmer cartoon read
sos_hp = butter(2, 110/(SR/2), btype='high', output='sos')
voice = sosfilt(sos_hp, voice).astype(np.float32)
sos_lp = butter(2, 9500/(SR/2), btype='low', output='sos')
voice = sosfilt(sos_lp, voice).astype(np.float32)

# ---------------------------------------------------------------- duck
sr, music = wavfile.read('assets/score.wav')
if music.dtype != np.float32:
    music = music.astype(np.float32)
if music.ndim == 1:
    music = np.stack([music, music], axis=1)

# envelope follower on the voice
env = np.abs(voice)
a = np.exp(-1/(SR*0.045)); r = np.exp(-1/(SR*0.35))
e = np.zeros_like(env)
prev = 0.0
for i in range(0, N, 1):
    c = a if env[i] > prev else r
    prev = c*prev + (1-c)*env[i]
    e[i] = prev

thr = 0.012
duck = np.where(e > thr, 1.0 - 0.42*np.clip((e - thr)/0.10, 0, 1), 1.0)
duck = np.convolve(duck, np.ones(int(0.02*SR))/int(0.02*SR), mode='same')

mix = np.zeros((N, 2), dtype=np.float32)
for ch in (0, 1):
    mix[:, ch] = music[:, ch] * duck + voice * 0.95

# ---------------------------------------------------------------- master
peak = np.max(np.abs(mix)) + 1e-9
mix = mix / peak * 1.02
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
m = np.max(np.abs(mix)) + 1e-9
mix = mix / m * 0.64

fade = int(0.06 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

wavfile.write('assets/mix.wav', SR, mix.astype(np.float32))
print('wrote assets/mix.wav')
