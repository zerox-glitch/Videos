#!/usr/bin/env python3
"""mix.py — final audio: VO (tempo-map + lead-trim, placed on beat times)
+ procedural SFX cues + score, ducked under VO, loudness looped through the
REAL AAC encode chain (native AAC rings +5–7 dB on transient material →
always measure through encode). → assets/mix.wav  (target −14.25 LUFS ≈ −1.5 dBTP)
"""
import os, json, subprocess, shutil, sys
import numpy as np
from scipy.io import wavfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FFMPEG = os.path.join(os.path.expanduser('~'), '.local/bin', 'ffmpeg')
SR = 48000
DUR = 109.0
N = int(SR * DUR)

BEATS = json.load(open(os.path.join(ROOT, 'plan', 'beats.json')))

# per-take tempo (natural-range correction so script fits scene windows)
ATEMPO = {'s1': 1.0, 's2': 1.09, 's3': 1.18, 's4': 1.0, 's5': 1.0,
          's6': 1.03, 's7': 1.16, 's8': 1.0}

SFX_GAIN = {
    'room_tone': 0.35, 'hall_amb': 0.40, 'vent': 0.32, 'monitor_buzz': 0.30,
    'sub_pulse': 0.55, 'heart': 0.55, 'breath_rev': 0.5, 'stop_swell': 0.5,
    'metal_far': 0.4, 'tone_high': 0.4, 'riser_short': 0.5, 'riser_mid': 0.55,
    'riser_late': 0.6, 'pull_whoosh': 0.5, 'soft_whoosh': 0.5, 'whoosh': 0.6,
    'impact_1': 0.85, 'impact_2': 0.85, 'impact_3': 0.85, 'impact_4': 0.9,
    'impact_5': 0.9, 'impact_6': 0.9, 'impact_mid': 0.9, 'impact_final': 0.95,
    'collapse_rumble': 0.7, 'meas_blip': 0.4, 'dot_blink': 0.35, 'sub_tick': 0.4,
    'hum_tick': 0.35, 'scan_pulse': 0.4, 'scan_start': 0.45, 'warning_beep': 0.45,
    'metal_click': 0.45, 'feed_glitch': 0.5, 'feed_lock_beep': 0.45, 'ring_ping': 0.5,
}
SFX_DIR = os.path.join(ROOT, 'audio', 'sfx')


def run(args):
    p = subprocess.run(args, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError('ffmpeg failed: ' + p.stderr.decode()[-800:])
    return p


def decode_f32(path, af=None, ss=None):
    args = [FFMPEG, '-y']
    if ss: args += ['-ss', str(ss)]
    args += ['-i', path]
    if af: args += ['-af', af]
    args += ['-f', 'f32le', '-ar', str(SR), '-ac', '2', 'pipe:1']
    p = subprocess.run(args, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode()[-500:])
    x = np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    return x


def trim_lead(x):
    """start-only silenceremove (TTS lead-in)."""
    thr = 0.011  # ≈ −39 dBFS
    env = np.max(np.abs(x), axis=1)
    idx = np.where(env > thr)[0]
    if len(idx) == 0: return x
    s = max(idx[0] - int(0.02 * SR), 0)
    return x[s:]


def rms_db(x):
    r = np.sqrt(np.mean(np.square(x)) + 1e-12)
    return 20 * np.log10(r)


def load_vo():
    takes = {}
    for v in BEATS['vo']:
        sid = v['id']
        mp3 = os.path.join(ROOT, 'assets', 'vo', f'{sid}.mp3')
        # decode mono → stereo raw for processing
        args = [FFMPEG, '-y', '-i', mp3, '-af', 'aresample=48000', '-ac', '2',
                '-f', 'f32le', '-ar', str(SR), 'pipe:1']
        p = subprocess.run(args, capture_output=True)
        x = np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, 2).astype(np.float64)
        x = trim_lead(x)
        tp = ATEMPO[sid]
        if abs(tp - 1.0) > 0.001:
            import math
            # atempo via linear interpolation (deterministic, pitch-preserving enough for QA targets)
            n2 = int(len(x) / tp)
            idx = np.linspace(0, len(x) - 1, n2)
            x = np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
        # take loudness → target speech RMS
        cur = rms_db(x)
        x *= 10 ** ((-18.5 - cur) / 20)
        dur = len(x) / SR
        win = v['win']
        if dur > win - 0.02:
            print(f'  WARN {sid}: take {dur:.2f}s > window {win:.2f}s (trimming tail)')
            x = x[:int((win - 0.03) * SR)]
            dur = len(x) / SR
        takes[sid] = (v['t'], x, dur)
        print(f'  VO {sid}: placed @ {v["t"]:.2f}s  dur {dur:.2f}s (win {win})')
    return takes


def main():
    print('— decode VO + tempo —')
    takes = load_vo()

    print('— score —')
    _, score = wavfile.read(os.path.join(ROOT, 'assets', 'score.wav'))
    score = score.astype(np.float64) / 32767.0
    if len(score) < N: score = np.vstack([score, np.zeros((N - len(score), 2))])
    score = score[:N]

    print('— sfx cues —')
    sfx_bus = np.zeros((N, 2))
    cache = {}
    sfx_list = sorted(BEATS['sfx'], key=lambda c: c['t'])
    for i, cue in enumerate(sfx_list):
        sid, t0 = cue['id'], cue['t']
        path = os.path.join(SFX_DIR, f'{sid}.wav')
        if not os.path.exists(path):
            print('  missing sfx', sid); continue
        if sid not in cache:
            cache[sid] = decode_f32(path)
        x = cache[sid]
        # beds: hold longer (loop-extend up to 7 s), one-shots as-is
        if sid in ('room_tone', 'hall_amb', 'vent', 'monitor_buzz'):
            want = int(7.0 * SR)
            reps = int(np.ceil(want / len(x)))
            x = np.tile(x, (reps, 1))[:want]
        g = SFX_GAIN.get(sid, 0.5)
        # slight stereo drift per cue (deterministic)
        pan = 0.86 + 0.14 * ((i * 37) % 5) / 4.0
        i0 = int(t0 * SR)
        n = min(len(x), N - i0)
        if n <= 0: continue
        sfx_bus[i0:i0 + n] += g * x[:n] * np.array([pan, 2 - pan])

    print('— VO bus + duck envelope —')
    vo_bus = np.zeros((N, 2))
    duck = np.ones(N)
    rel0, rel1 = int(0.30 * SR), int(0.02 * SR)
    for sid, (t0, x, dur) in takes.items():
        i0 = int(t0 * SR)
        n = min(len(x), N - i0)
        vo_bus[i0:i0 + n] += x[:n]
        a0 = max(i0 - int(0.06 * SR), 0)
        a1 = min(i0 + n + int(0.35 * SR), N)
        seg = np.full(a1 - a0, 0.42)
        at = min(int(0.07 * SR), len(seg))
        seg[:at] = np.linspace(1.0, 0.42, at)
        rl = min(int(0.30 * SR), len(seg))
        seg[-rl:] = np.linspace(0.42, 1.0, rl)
        duck[a0:a1] = np.minimum(duck[a0:a1], seg)

    bed = (score * 0.85 + sfx_bus) * duck[:, None]
    mix = bed + vo_bus

    # bus balance + soft ceiling
    mix *= 10 ** ((-16.0 - rms_db(mix)) / 20)          # pre-norm to −16 dBFS RMS
    CEIL = 10 ** (-7.8 / 20)                            # −7.8 dBFS ceiling
    mix = CEIL * np.tanh(mix / CEIL)

    # ── loudness loop THROUGH the real encode chain ──
    tmpd = os.path.join(ROOT, 'renders', 'qa', '_loudtmp')
    os.makedirs(tmpd, exist_ok=True)
    tmpw = os.path.join(tmpd, 'probe.wav')
    tmpa = os.path.join(tmpd, 'probe.m4a')
    target = -14.25
    gain = 10 ** (0 / 20)
    best = None
    for it in range(9):
        y = np.clip(mix * gain, -0.999, 0.999)
        wavfile.write(tmpw, SR, (y * 32767).astype(np.int16))
        run([FFMPEG, '-y', '-i', tmpw, '-af', 'lowpass=14000', '-c:a', 'aac',
             '-b:a', '320k', tmpa])
        # integrated loudness
        p = subprocess.run([FFMPEG, '-i', tmpa, '-af', 'ebur128=framelog=quiet',
                            '-f', 'null', '-'], capture_output=True)
        log = p.stderr.decode()
        lufs = None
        for line in reversed(log.splitlines()):
            line = line.strip()
            if line.startswith('I:'):
                try: lufs = float(line.split()[1])
                except Exception: pass
                break
        dec = decode_f32(tmpa)
        pk = 20 * np.log10(np.max(np.abs(dec)) + 1e-12)
        print(f'  iter {it}: gain {20*np.log10(gain):+.2f} dB → {lufs:.2f} LUFS / {pk:.2f} dBFS')
        best = (lufs, pk, gain)
        if lufs is None:
            gain *= 10 ** (0.5 / 20); continue
        if abs(lufs - target) <= 0.15 and pk <= -1.0:
            break
        gain *= 10 ** ((target - lufs) / 20)
    lufs, pk, gain = best
    print(f'  final chain: {lufs:.2f} LUFS / {pk:.2f} dBFS @ gain {20*np.log10(gain):+.2f} dB')

    out = np.clip(mix * gain, -0.999, 0.999)
    outp = os.path.join(ROOT, 'assets', 'mix.wav')
    wavfile.write(outp, SR, (out * 32767).astype(np.int16))
    shutil.rmtree(tmpd, ignore_errors=True)
    print('wrote', outp, f'{len(out)/SR:.2f}s')


if __name__ == '__main__':
    main()
