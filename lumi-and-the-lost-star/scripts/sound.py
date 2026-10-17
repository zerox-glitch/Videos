#!/usr/bin/env python3
"""Music + sound design for "Lumi & the Lost Star".

Everything is synthesised locally with NumPy from plan/beats.json:
a music-box score in F major, character "voice" chirps (a rounded lead
blended with formant-filtered noise, so it reads as a friendly hum rather
than speech), and foley (impacts, whooshes, sparkles, crickets, wind).

    python3 scripts/sound.py            # builds assets/mix.wav
"""
import json
import math
import os
import re
import subprocess
import sys
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
FFMPEG = os.environ.get("MVD_FFMPEG", "ffmpeg")
rng = np.random.default_rng(2026)


# --------------------------------------------------------------- helpers
def axis(dur):
    return np.arange(int(round(dur * SR))) / SR


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env_adsr(n, a, d, s, r, sustain_level=0.7):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    e = np.ones(n)
    e[:] = sustain_level
    a_n = min(a_n, n)
    e[:a_n] = np.linspace(0, 1, a_n)
    d_n = min(d_n, n - a_n)
    if d_n > 0:
        e[a_n:a_n + d_n] = np.linspace(1, sustain_level, d_n)
    if r_n > 0:
        r_n = min(r_n, n)
        e[-r_n:] *= np.linspace(1, 0, r_n)
    return e


def fade(x, a=0.003, r=0.02):
    return x * env_adsr(len(x), a, 0, 1, r, 1.0) if False else np.concatenate([
        x[:max(1, int(a * SR))] * np.linspace(0, 1, max(1, int(a * SR))),
        x[max(1, int(a * SR)):len(x) - int(r * SR)],
        x[len(x) - int(r * SR):] * np.linspace(1, 0, int(r * SR)) if int(r * SR) > 0 else np.array([]),
    ]) if len(x) > int(a * SR) + int(r * SR) + 2 else x * np.linspace(0, 1, len(x))


def band(x, fc, octaves=1.0, gain=1.0):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    lf = np.log2(np.maximum(f, 1.0))
    g = np.exp(-0.5 * ((lf - np.log2(fc)) / (octaves / 2)) ** 2) * gain
    return np.fft.irfft(X * g, len(x))


def normalize(x, peak=0.9):
    m = np.max(np.abs(x)) + 1e-12
    return x / m * peak


def pan_gains(pan):
    a = (float(pan) + 1) * math.pi / 4
    return math.cos(a), math.sin(a)


# --------------------------------------------------------------- voices
def music_box(f, dur, bright=1.0):
    """Struck bell / music box: inharmonic partials with fast decays."""
    t = axis(dur)
    out = np.zeros_like(t)
    partials = [(1.0, 1.00, 1.25), (2.0, 0.34, 0.7), (3.01, 0.16, 0.42), (4.2, 0.09, 0.26), (5.4, 0.05, 0.18)]
    for ratio, amp, tau in partials:
        out += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / tau)
        out += amp * 0.3 * np.sin(2 * np.pi * f * ratio * 1.002 * t + 0.4) * np.exp(-t / (tau * 0.9))
    # felt hammer noise
    n = rng.standard_normal(len(t)) * np.exp(-t / 0.006)
    out += 0.12 * bright * band(n, 2400, 2.2)
    return out * np.minimum(1, np.exp(-t * 0.5))


def pad_note(f, dur, bright=0.5):
    t = axis(dur)
    out = np.zeros_like(t)
    for det in (-0.0025, 0.0, 0.0028):
        fq = f * (1 + det)
        for k in range(1, 7):
            amp = (1 / k ** 1.8) * (bright ** (k - 1))
            out += amp * np.sin(2 * np.pi * fq * k * t + k * 0.7)
    env = np.minimum(1, t / 0.6) * np.exp(-t / (dur * 0.55))
    return out * env


def bass_note(f, dur):
    t = axis(dur)
    out = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t / (dur * 0.4))
    return out * np.minimum(1, t / 0.02)


def chirp(f0, f1, dur, formant=1100.0, bright=0.4, vib=0.0):
    """A wordless character 'voice': triangular lead + breath through a formant."""
    t = axis(dur)
    u = t / dur
    f = f0 + (f1 - f0) * np.sin(np.pi * u) ** 0.8
    if vib:
        f = f * (1 + vib * np.sin(2 * np.pi * 7 * t))
    phase = 2 * np.pi * np.cumsum(f) / SR
    tri = 2 / np.pi * np.arcsin(0.92 * np.sin(phase))
    out = 0.75 * tri
    breath = rng.standard_normal(len(t)) * 0.35
    out += bright * band(breath, formant, 1.1)
    out += bright * 0.4 * band(breath, formant * 2.4, 1.3)
    env = np.sin(np.pi * np.clip(u, 0, 1)) ** 0.7
    return out * env


# --------------------------------------------------------------- foley
def whoosh(dur=0.8, f_from=300, f_to=4200, q=0.6):
    n = rng.standard_normal(int(dur * SR))
    u = np.linspace(0, 1, len(n))
    # simple time-varying bandpass via cascaded one-pole (cheap + smooth)
    out = np.zeros_like(n)
    lp = bp = 0.0
    for i in range(len(n)):
        fc = f_from * (f_to / f_from) ** (math.sin(math.pi * u[i]) ** 1.3)
        F = 2 * math.sin(math.pi * min(fc, SR / 6) / SR)
        hp = n[i] - lp - q * bp
        bp += F * hp
        lp += F * bp
        out[i] = bp
    return normalize(out * np.sin(np.pi * u) ** 1.7, 0.9)


def impact(dur=1.2, size=1.0):
    t = axis(dur)
    f = 40 + 90 * np.exp(-t * 12)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (3.2 / size))
    sub = np.sin(2 * np.pi * 28 * t) * np.exp(-t * 2.0)
    crack = band(rng.standard_normal(len(t)), 2600, 2.0) * np.exp(-t / 0.004)
    x = np.tanh(2.0 * (0.9 * body + 0.5 * sub)) + 0.3 * crack
    return normalize(x, 0.95)


def thud(dur=0.5):
    t = axis(dur)
    body = np.sin(2 * np.pi * np.cumsum(90 + 50 * np.exp(-t * 18)) / SR) * np.exp(-t * 12)
    knock = band(rng.standard_normal(len(t)), 700, 1.4) * np.exp(-t / 0.02)
    return normalize(0.8 * body + 0.45 * knock, 0.9)


def sparkle(dur=0.9, base=2093, count=6):
    t = axis(dur)
    out = np.zeros_like(t)
    for i in range(count):
        f = base * (1.5 ** (i * 0.37)) * (1 + rng.normal(0, 0.004))
        start = rng.uniform(0, dur * 0.55)
        idx = int(start * SR)
        seg = np.sin(2 * np.pi * f * t[: len(t) - idx]) * np.exp(-t[: len(t) - idx] / 0.18)
        out[idx:] += seg * (0.6 + rng.random() * 0.4)
    return normalize(out, 0.7)


def chime(f=1046.5, dur=2.2):
    t = axis(dur)
    out = np.zeros_like(t)
    for ratio, amp, tau in [(1, 1, 1.0), (2.01, 0.4, 0.55), (3.02, 0.2, 0.34), (4.97, 0.08, 0.22)]:
        out += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / tau)
        out += amp * 0.3 * np.sin(2 * np.pi * f * ratio * 1.003 * t) * np.exp(-t / tau)
    return normalize(out, 0.8)


def crickets(dur, density=1.0, seed=5):
    r = np.random.default_rng(seed)
    out = np.zeros(int(dur * SR))
    t = 0.0
    while t < dur:
        f = r.uniform(3900, 4600)
        chirp_dur = r.uniform(0.045, 0.09)
        n = int(chirp_dur * SR)
        tt = np.arange(n) / SR
        pulse = np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / chirp_dur) ** 2
        idx = int(t * SR)
        if idx + n < len(out):
            out[idx:idx + n] += pulse * r.uniform(0.3, 0.7)
        t += r.uniform(0.12, 0.6) / density
    return normalize(band(out, 4200, 1.4), 0.6)


def wind(dur, seed=9, low=90, high=420):
    """Band-limited noise with a slow breathing LFO. FFT-shaped, so it stays
    inside its band and never produces broadband hiss."""
    r = np.random.default_rng(seed)
    n = r.standard_normal(int(dur * SR))
    X = np.fft.rfft(n)
    f = np.fft.rfftfreq(len(n), 1 / SR)
    centre = math.sqrt(low * high)
    width = math.log2(high / low) / 2
    lf = np.log2(np.maximum(f, 1.0))
    shape = np.exp(-0.5 * ((lf - math.log2(centre)) / width) ** 2)
    # steep skirts so nothing leaks up the spectrum
    shape *= (f > low * 0.5) * (f < high * 2.2)
    out = np.fft.irfft(X * shape, len(n))
    t = np.arange(len(n)) / SR
    env = 0.55 + 0.45 * np.sin(2 * np.pi * 0.045 * t + 0.4) * np.sin(2 * np.pi * 0.017 * t + 1.1)
    return normalize(out * env, 0.5)


def rumbly(dur, start=30, end=90):
    t = axis(dur)
    f = np.linspace(start, end, len(t))
    out = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return normalize(out * np.minimum(1, t / 0.3), 0.6)


# --------------------------------------------------------------- music
CHORD_NOTES = {
    'F': [53, 57, 60, 65],
    'Dm': [50, 57, 60, 65],
    'Bb': [46, 53, 58, 62],
    'C': [48, 55, 60, 64],
    'Gm': [43, 55, 58, 62],
    'Am': [45, 57, 60, 64],
}


def build_music(spec, total):
    bpm = spec['bpm']
    beat = 60.0 / bpm
    n = int(total * SR)
    dry = np.zeros((n, 2))
    wet = np.zeros((n, 2))

    def place(buf, x, at, gain, pan=0.0):
        i = int(at * SR)
        if i >= n:
            return
        seg = x[: n - i]
        gl, gr = pan_gains(pan)
        buf[i:i + len(seg), 0] += seg * gain * gl
        buf[i:i + len(seg), 1] += seg * gain * gr

    melody_bars = {}
    for bar, b, length, note, vel in spec['melody']:
        melody_bars.setdefault(bar, []).append((b, length, note, vel))

    for bar in range(spec['bars']):
        chord = spec['chords'][bar]
        t0 = bar * 4 * beat
        notes = CHORD_NOTES[chord]
        # bar intensity: opening sparse, middle fuller, ending gentle
        intensity = 0.55
        if bar >= 12:
            intensity = 0.85
        if bar >= 16:
            intensity = 1.0
        if bar >= 20:
            intensity = 0.7
        # rolling arpeggio in eighths
        pattern = [0, 2, 1, 3, 2, 4, 1, 3]
        for step, idx in enumerate(pattern):
            midi = notes[idx % len(notes)] + 12
            at = t0 + step * beat / 2
            if at > total:
                break
            g = 0.125 * intensity * (0.9 if step % 4 else 1.12)
            place(wet, music_box(hz(midi), 1.6, 0.55), at, g, pan=(-0.35 + step * 0.1))
        # soft pad per bar
        for k, midi in enumerate(notes[:3]):
            place(wet, pad_note(hz(midi), 4 * beat, 0.35), t0, 0.055 * intensity, pan=-0.2 + k * 0.2)
        # bass on beats 1 and 3
        place(dry, bass_note(hz(notes[0] - 12), beat * 1.6), t0, 0.26, 0)
        place(dry, bass_note(hz(notes[0] - 12), beat * 1.2), t0 + 2 * beat, 0.17, 0)

        for (b, length, note, vel) in melody_bars.get(bar, []):
            at = t0 + b * beat
            if at > total:
                continue
            place(wet, music_box(hz(note), 2.4, 0.85), at, 0.15 * vel * 2, pan=0.05)
            # a little shimmer octave for the climax
            if bar >= 16:
                place(wet, music_box(hz(note + 12), 1.6, 1.0), at + 0.012, 0.05 * vel * 2, pan=0.3)

    music = dry + wet * 0.9
    return music


# --------------------------------------------------------------- sfx bank
def pad_to(x, n):
    if len(x) >= n:
        return x[:n]
    out = np.zeros(n)
    out[: len(x)] = x
    return out


def make_bank():
    B = {}
    f1 = chirp(900, 1250, 0.18, 1400, 0.25, 0.02) * 0.5
    f2 = chirp(1150, 900, 0.16, 1600, 0.2) * 0.35
    B['flutter'] = pad_to(f1, max(len(f1), len(f2))) + pad_to(f2, max(len(f1), len(f2)))
    B['twinkle'] = sparkle(0.7, 2600, 5)
    B['whooshBig'] = whoosh(1.3, 160, 3000, 0.75)
    B['impact'] = impact(1.4, 1.15)
    B['dust'] = band(rng.standard_normal(int(0.7 * SR)), 900, 1.4) * np.exp(-axis(0.7) / 0.22) * 0.4
    B['flicker'] = sparkle(0.5, 1800, 3) * 0.6
    B['strain'] = chirp(300, 260, 0.7, 620, 0.6, 0.012) * 0.7
    B['thud'] = thud(0.55)
    B['sigh'] = chirp(520, 300, 0.55, 800, 0.18) * 0.55
    idea = np.zeros(int(0.9 * SR))
    sp = sparkle(0.5, 2093, 4)
    idea[: len(sp)] += sp
    ch = chime(1568, 1.2)
    idea[int(0.12 * SR): int(0.12 * SR) + len(ch[: int(0.7 * SR)])] += ch[: int(0.7 * SR)] * 0.5
    B['idea'] = idea

    def pop(step=0):
        f = 520 * (2 ** (step * 3 / 12))
        b = chirp(f, f * 1.7, 0.14, 1300 + step * 180, 0.35, 0.02)
        return b * 0.8

    for i in range(5):
        B[f'pop{i}'] = pop(i)
    B['pulse'] = (np.sin(2 * np.pi * 220 * axis(0.9)) * np.exp(-axis(0.9) / 0.35)) * 0.35
    B['chime'] = chime(1046.5, 2.0)
    B['thread'] = sparkle(1.1, 1568, 7) * 0.7
    B['heave'] = impact(1.0, 0.8) * 0.8
    B['liftoff'] = whoosh(2.4, 120, 1600, 0.5) * 0.9 + rumbly(2.4, 34, 70) * 0.25
    B['windGust'] = wind(2.2, 11, 200, 900)
    B['shimmer'] = sparkle(2.6, 3136, 12) * 0.8
    B['riser'] = whoosh(1.4, 200, 6000, 0.5) * 0.9
    n_burst = int(2.6 * SR)
    B['burst'] = pad_to(impact(2.2, 1.6), n_burst) + pad_to(chime(2093, 2.6) * 0.7, n_burst)
    B['sparkleCascade'] = sparkle(3.0, 2093, 16)
    B['yawn'] = chirp(420, 250, 0.9, 700, 0.15, 0.02) * 0.6
    n_t = int(3.0 * SR)
    B['titleChime'] = pad_to(chime(784, 3.0), n_t) + pad_to(chime(1174.7, 2.6) * 0.6, n_t)
    B['crickets'] = crickets(4.0, 1.0) * 0.55
    B['nightWind'] = wind(6.0, 3, 70, 300)
    B['highWind'] = wind(6.0, 7, 160, 780)
    return B


# --------------------------------------------------------------- mix
def load_beats():
    with open(os.path.join(ROOT, 'plan', 'beats.json')) as f:
        return json.load(f)


def build_mix(beats):
    total = beats['duration']
    n = int(total * SR)
    music = build_music(beats['music'], total)

    # music automation: duck under the quiet opening and the ending
    t = np.arange(n) / SR
    m_gain = np.interp(t, [0, 2.0, 12, 24, 36, 48, 56, 62, 70, 72],
                          [0.0, 0.85, 0.9, 0.85, 1.0, 1.05, 1.0, 0.75, 0.6, 0.0])
    music = music * m_gain[:, None]

    sfx = np.zeros((n, 2))
    bank = make_bank()

    def place(buf, x, at, gain, pan=0.0):
        i = int(at * SR)
        if i >= n or i < 0:
            return
        seg = x[: n - i]
        gl, gr = pan_gains(pan)
        buf[i:i + len(seg), 0] += seg * gain * gl
        buf[i:i + len(seg), 1] += seg * gain * gr

    for cue in beats['cues']:
        kind = cue['sound']
        extra = cue.get('extra')
        if kind == 'pop':
            x = bank[f'pop{int(extra or 0)}']
        elif kind in bank:
            x = bank[kind]
        else:
            continue
        if kind in ('crickets', 'nightWind', 'highWind') and extra:
            x = x[: int(extra * SR)] if extra * SR < len(x) else x
        place(sfx, x, cue['t'], cue.get('gain', 0.3) * 1.6, cue.get('pan', 0.0) or 0.0)

    for start, end, kind, gain in beats['beds']:
        if kind not in bank:
            continue
        dur = end - start
        base = bank[kind]
        reps = int(np.ceil(dur / (len(base) / SR)))
        x = np.tile(base, reps + 1)[: int(dur * SR)]
        # gentle fades at the bed edges
        edge = int(min(1.2, dur / 3) * SR)
        x[:edge] *= np.linspace(0, 1, edge)
        x[-edge:] *= np.linspace(1, 0, edge)
        place(sfx, x, start, gain * 0.9, 0.0)

    mix = music * 0.9 + sfx * 0.95
    peak = np.max(np.abs(mix))
    if peak > 0:
        mix *= 0.72 / peak
    return mix


def write_wav(path, stereo):
    data = np.clip(stereo, -1, 1)
    pcm = (data * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def loudnorm(raw, out):
    print('  measuring loudness …')
    p = subprocess.run(
        [FFMPEG, '-hide_banner', '-nostats', '-i', raw,
         '-af', 'loudnorm=I=-14:TP=-2.0:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, check=True)
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S)
    if not m:
        raise RuntimeError('loudnorm parse failed')
    s = json.loads(m.group(0))
    print(f"  measured: I={s['input_i']} LUFS · TP={s['input_tp']} dBTP")
    af = ('loudnorm=I=-14:TP=-2.0:LRA=11'
          f":measured_I={s['input_i']}:measured_TP={s['input_tp']}"
          f":measured_LRA={s['input_lra']}:measured_thresh={s['input_thresh']}"
          f":offset={s['target_offset']}:linear=true")
    subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', raw,
                    '-af', af, '-ar', str(SR), '-c:a', 'pcm_s24le', out], check=True)
    c = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-i', out,
                        '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    for line in c.stderr.strip().splitlines()[-10:]:
        if 'I:' in line or 'Peak:' in line or 'LRA:' in line:
            print('   ', line.strip())


def main():
    beats = load_beats()
    print(f"  cue sheet: {len(beats['cues'])} cues · {beats['music']['bars']} bars of music · {beats['duration']}s")
    mix = build_mix(beats)
    cache = os.path.join(ROOT, 'cache')
    os.makedirs(cache, exist_ok=True)
    raw = os.path.join(cache, 'mix_raw.wav')
    write_wav(raw, mix)
    out = os.path.join(ROOT, 'assets', 'mix.wav')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    loudnorm(raw, out)
    print(f'  mix → {out} ({os.path.getsize(out) / 1e6:.1f} MB)')


if __name__ == '__main__':
    sys.exit(main())
