#!/usr/bin/env python3
"""Chiptune score for ABC Pixel Party — 120 BPM, 96 s.

Reads plan/beats.json (the only timing source) so every blip lands on the
same frame as its visual event. Pure NumPy synthesis, no samples.

  lead   square 25 %  — the ABC melody (with a harmony 3rd in pass 2)
  bass   pulse 50 %   — bouncy eighths
  chord  detuned saw  — soft pads
  arp    triangle     — sparkle fills
  drums  kick/snare/hat, noise + sine
  sfx    letter blips, object dings, land thuds, fireworks, cheer
"""
import json, math, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEATS = json.load(open(os.path.join(ROOT, 'plan', 'beats.json')))
SR = 48000
DUR = 96.0
N = int(SR * DUR)
BEAT = BEATS['beat']          # 0.5 s
rng = np.random.default_rng(20261017)

# ------------------------------------------------------------------ helpers
def t_arr(dur):
    return np.arange(int(SR * dur)) / SR

def adsr(n, a=0.004, d=0.06, s=0.7, r=0.08):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, n - a_n - d_n - r_n)
    env = np.concatenate([
        np.linspace(0, 1, a_n, endpoint=False) if a_n else np.array([]),
        np.linspace(1, s, d_n, endpoint=False) if d_n else np.array([]),
        np.full(s_n, s),
        np.linspace(s, 0, r_n) if r_n else np.array([]),
    ])
    if len(env) < n:
        env = np.pad(env, (0, n - len(env)))
    return env[:n]

def square(freq, dur, duty=0.5, vib=0.0, vib_hz=5.5):
    t = t_arr(dur)
    f = freq * (1 + vib * np.sin(2 * np.pi * vib_hz * t)) if vib else freq
    ph = np.cumsum(f) / SR
    return np.where((ph % 1.0) < duty, 1.0, -1.0)

def tri(freq, dur):
    t = t_arr(dur)
    ph = (freq * t) % 1.0
    return 4 * np.abs(ph - 0.5) - 1

def saw(freq, dur):
    t = t_arr(dur)
    return 2 * ((freq * t) % 1.0) - 1

def noise(dur):
    return rng.uniform(-1, 1, int(SR * dur))

def note_hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

def soft(g, curve=3.0):
    return np.tanh(g * curve) / np.tanh(curve)

# buses: (data, gain, pan) — pan -1 L .. +1 R
buses = {k: np.zeros(N) for k in ('lead', 'bass', 'chord', 'arp', 'drum', 'sfx', 'vo_marker')}
def put(bus, t, sig, g=1.0):
    i = int(t * SR)
    if i < 0:
        sig = sig[-i:]; i = 0
    j = min(N, i + len(sig))
    if j > i:
        buses[bus][i:j] += sig[:j - i] * g

# ------------------------------------------------------------------ pitches
SC = {'C':0,'C#':1,'D':2,'Eb':3,'E':4,'F':5,'F#':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}
def m(name, octv=4):
    return 12 * (octv + 1) + SC[name]

# ------------------------------------------------------------------ melody
# map lyric word → pitch (ABC tune, C major)
MELODY = {
    'L1': dict(zip(['A','B','C','D','E','F','G'],
                   [m('C'),m('C'),m('G'),m('G'),m('A'),m('A'),m('G')])),
    'L2': dict(zip(['H','I','J','K','L','M','N','O','P'],
                   [m('F'),m('F'),m('E'),m('E'),m('D'),m('D'),m('C'),m('C'),m('C')])),
    'L3': dict(zip(['Q','R','S','T','U','V'],
                   [m('G'),m('G'),m('F'),m('F'),m('E'),m('E')])),
    'L4': dict(zip(['W','X','Y','and','Z'],
                   [m('D'),m('D'),m('C'),m('C'),m('C')])),
    'C1': dict(zip(['Now','I','know','my','A','B','Cs'],
                   [m('C'),m('C'),m('G'),m('G'),m('A'),m('A'),m('G')])),
    'C2': dict(zip(['Next','time',"won't",'you','sing','with','me'],
                   [m('F'),m('F'),m('E'),m('E'),m('D'),m('D'),m('C')])),
}

# chord per phrase: list of (name, start_offset, dur)
CHORDS = {
    'L1': [('C',0,4.0)],
    'L2': [('F',0,2.0), ('C',2.0,2.0)],
    'L3': [('G',0,3.0)],
    'L4': [('G',0,1.0), ('C',1.0,1.5)],
    'C1': [('C',0,4.0)],
    'C2': [('F',0,2.0), ('C',2.0,2.0)],
}
CHORD_TONES = {
    'C': [m('C',3), m('E',4), m('G',4), m('C',5)],
    'F': [m('F',3), m('A',4), m('C',5), m('F',4)],
    'G': [m('G',3), m('B',4), m('D',5), m('G',4)],
    'Am': [m('A',3), m('C',5), m('E',5), m('A',4)],
}
ROOT3 = {'C': m('C',2), 'F': m('F',2), 'G': m('G',2), 'Am': m('A',2)}

def phrase_key(line_id):
    return line_id.split('-')[1]

# ------------------------------------------------------------------ voices
def play_lead(t, midi, dur, g=1.0, harm=False):
    f = note_hz(midi)
    sig = square(f, dur, duty=0.25, vib=0.006 if dur > 0.45 else 0)
    sig *= adsr(len(sig), 0.006, 0.05, 0.75, min(0.09, dur * 0.35))
    put('lead', t, sig, g * 0.30)
    if harm:
        # a third below (chord-aware enough at this scale)
        f2 = note_hz(midi - 3 if midi % 12 in (0, 5, 7) else midi - 4)
        s2 = square(f2, dur, duty=0.25)
        s2 *= adsr(len(s2), 0.008, 0.05, 0.7, min(0.08, dur * 0.3))
        put('lead', t, s2, g * 0.14)

def play_chord(t, name, dur, g=0.5, sparkle_top=True):
    tones = CHORD_TONES[name]
    for k, mi in enumerate(tones):
        det = 1.0 + (0.0015 * (k - 1.5))
        sig = saw(note_hz(mi) * det, dur)
        sig *= adsr(len(sig), 0.03, 0.12, 0.6, 0.2)
        put('chord', t, sig, g * 0.045)
    if sparkle_top:
        top = tones[2]
        sig = tri(note_hz(top + 12), 0.09)
        sig *= adsr(len(sig), 0.004, 0.05, 0.3, 0.03)
        put('arp', t, sig, g * 0.10)

def play_bass(t, name, dur, g=1.0, eighths=True):
    root = ROOT3[name]
    step = BEAT / 2 if eighths else BEAT
    k = 0
    while k * step < dur - 1e-6:
        f = note_hz(root if k % 4 != 3 else root + 7)
        d = step * 0.92
        sig = square(f, d, duty=0.5)
        sig *= adsr(len(sig), 0.004, 0.04, 0.55, 0.03)
        put('bass', t + k * step, sig, 0.24 * g)
        k += 1

def arp_fill(t, name, n=8, g=1.0, step=None):
    step = step or BEAT / 4
    tones = CHORD_TONES[name]
    seq = [tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[3] + 12] * 3
    for k in range(n):
        if k >= len(seq):
            break
        sig = tri(note_hz(seq[k]), step * 0.9)
        sig *= adsr(len(sig), 0.003, 0.04, 0.35, 0.02)
        put('arp', t + k * step, sig, 0.13 * g)

# ------------------------------------------------------------------ drums
def kick(t, g=1.0):
    d = 0.13
    tt = t_arr(d)
    f = 120 * np.exp(-tt * 28) + 45
    ph = np.cumsum(f) / SR
    sig = np.sin(2 * np.pi * ph) * np.exp(-tt * 22)
    click = np.zeros(len(tt)); n2 = min(len(tt), int(0.004 * SR))
    click[:n2] = rng.uniform(-1, 1, n2)
    sig += click * 0.4 * np.exp(-tt * 200)
    put('drum', t, sig, 0.46 * g)

def snare(t, g=1.0):
    d = 0.11
    tt = t_arr(d)
    body = np.sin(2 * np.pi * 185 * tt) * np.exp(-tt * 32) * 0.4
    nz = rng.uniform(-1, 1, len(tt)) * np.exp(-tt * 26)
    sig = body + nz * 0.7
    put('drum', t, sig, 0.28 * g)

def hat(t, g=1.0, open_=False):
    d = 0.09 if open_ else 0.032
    tt = t_arr(d)
    nz = rng.uniform(-1, 1, len(tt))
    nz = nz - np.convolve(nz, np.ones(7) / 7, mode='same')  # crude HP
    sig = nz * np.exp(-tt * (14 if open_ else 60))
    put('drum', t, sig, (0.20 if open_ else 0.15) * g)

def clap(t, g=1.0):
    for k, off in enumerate((0.0, 0.012, 0.026)):
        tt = t_arr(0.07)
        nz = rng.uniform(-1, 1, len(tt))
        nz = nz - np.convolve(nz, np.ones(5) / 5, mode='same')
        sig = nz * np.exp(-tt * (50 - k * 8))
        put('drum', t + off, sig, 0.22 * g)

def groove(t0, t1, g=1.0, snare_on=True, kick_on=True):
    """standard 120bpm backbeat between t0 and t1"""
    t = t0
    beat_i = round((t0 - 0.0) / BEAT)
    while t < t1 - 1e-6:
        pos = beat_i % 4
        if kick_on and pos in (0, 2):
            kick(t, g)
        if snare_on and pos in (1, 3):
            snare(t, g)
        hat(t, g * 0.9)
        hat(t + BEAT / 2, g * 0.7, open_=(pos == 3))
        beat_i += 1
        t = t0 + (beat_i - round(t0 / BEAT)) * BEAT if False else t + BEAT
    # (loop recompute safe)

def hat_only(t0, t1, g=1.0):
    t, i = t0, 0
    while t < t1 - 1e-6:
        hat(t, g * (1.0 if i % 2 == 0 else 0.65))
        t += BEAT / 2
        i += 1

# ------------------------------------------------------------------ sfx
def blip(t, midi, g=1.0, d=0.07):
    sig = square(note_hz(midi), d, duty=0.5)
    sig *= adsr(len(sig), 0.002, 0.03, 0.5, 0.03)
    put('sfx', t, sig, 0.16 * g)

def letter_blip(t, i):
    SCAL = [0, 2, 4, 5, 7, 9, 11]
    deg = SCAL[i % 7]
    octv = min(2, i // 7)
    blip(t, m('C', 5) + deg + 12 * octv - 12, g=1.0)

def ding(t, g=1.0):
    for k, f in enumerate((1318.5, 1760.0)):
        sig = square(f, 0.1, duty=0.25)
        sig *= adsr(len(sig), 0.002, 0.05, 0.4, 0.04)
        put('sfx', t + k * 0.085, sig, 0.17 * g)

def pop_sfx(t, g=1.0):
    tt = t_arr(0.1)
    f = 640 * np.exp(-tt * 24) + 160
    ph = np.cumsum(f) / SR
    sig = np.sin(2 * np.pi * ph) * np.exp(-tt * 30)
    put('sfx', t, sig, 0.30 * g)
    blip(t + 0.02, m('G', 6), g=0.7, d=0.05)

def thud(t, midi, g=1.0):
    tt = t_arr(0.16)
    sig = np.sin(2 * np.pi * (95 * np.exp(-tt * 20) + 55) * tt) * np.exp(-tt * 24)
    put('sfx', t, sig, 0.42 * g)
    blip(t + 0.01, midi, g=1.1, d=0.12)

def firework(t, g=1.0):
    tt = t_arr(0.3)
    nz = rng.uniform(-1, 1, len(tt))
    nz = nz - np.convolve(nz, np.ones(4) / 4, mode='same')
    sig = nz * np.exp(-tt * 10)
    f = 1400 * np.exp(-tt * 14) + 300
    ph = np.cumsum(f) / SR
    sig += np.sin(2 * np.pi * ph) * np.exp(-tt * 14) * 0.5
    put('sfx', t, sig, 0.26 * g)

def cheer_swell(t, g=1.0):
    # "yay" sparkle: rising pentatonic run + clap trio
    run = [m('C',5), m('D',5), m('E',5), m('G',5), m('C',6)]
    for k, mi in enumerate(run):
        sig = square(note_hz(mi), 0.09, duty=0.25)
        sig *= adsr(len(sig), 0.003, 0.05, 0.4, 0.03)
        put('sfx', t + k * 0.07, sig, 0.15 * g)
    for off in (0.0, 0.1, 0.22):
        clap(t + off, g * 0.9)

# ================================================================== ARRANGE
S = BEATS['sections']

# ---------------- INTRO 0–8
play_chord(0.0, 'C', 8.0, g=0.45, sparkle_top=False)
# block land thuds (visual: t0 + ~0.45)
for k, t0 in enumerate((0.55, 1.10, 1.65)):
    thud(t0 + 0.45, m('C', 6) + [0, 4, 7][k])
hat_only(2.4, 6.5, g=0.8)
# light bass pickup
play_bass(4.0, 'C', 4.0, g=0.7)
# hook chip at 2.6 gets a little chime
blip(2.6, m('C', 6), g=1.2, d=0.1); blip(2.72, m('E', 6), g=1.0, d=0.1)
# pickup run into song 1
arp_fill(6.5, 'C', n=6, g=1.0, step=BEAT / 4)
groove(7.0, 8.0, g=0.9, snare_on=False)
snare(7.75, 0.6); snare(7.875, 0.8)

# ---------------- SONG 1  (8–32) and SONG 2 (64–88)
def arrange_song(tag, t_shift, pass2=False):
    for line in [l for l in BEATS['lines'] if l['id'].startswith(tag)]:
        key = phrase_key(line['id'])
        words = line['words']
        # melody notes on word starts, duration until next word / line end
        for wi, (w, tw) in enumerate(words):
            nxt = words[wi + 1][1] if wi + 1 < len(words) else line['t1']
            dur = max(0.18, nxt - tw)
            if w in MELODY[key]:
                play_lead(tw, MELODY[key][w], dur + 0.03, g=1.12 if pass2 else 1.0,
                          harm=pass2)
        # chords + bass + drums per phrase window
        for name, off, dur in CHORDS[key]:
            t0 = line['t0'] + off
            play_chord(t0, name, dur, g=0.9 if pass2 else 0.75)
            play_bass(t0, name, dur, g=1.0 if pass2 else 0.9)
        # sparkle fill in the phrase breath
        arp_fill(line['t1'] + 0.1, CHORDS[key][-1][0], n=6, g=0.8)
    # drums across the whole pass
    groove(S[tag][0] + 0.5, S[tag][1], g=1.0 if pass2 else 0.95)
    # letter blips exactly on the visual pops
    times = BEATS['letters1' if tag == 'song1' else 'letters2']
    for i, tt_ in enumerate(times):
        if tt_ is not None:
            letter_blip(tt_, i)
    if pass2:
        arp_fill(S['song2'][0], 'C', n=8, g=0.6)

arrange_song('song1', 0.0, pass2=False)
arrange_song('song2', 0.0, pass2=True)

# ---------------- INTERLUDE 32–40.5
groove(32.0, 40.5, g=0.8, snare_on=False)
hat_only(32.0, 40.5, g=0.9)
play_chord(32.0, 'C', 4.0, g=0.8)
play_chord(36.0, 'F', 4.0, g=0.8)
play_bass(32.0, 'C', 4.0, g=0.9)
play_bass(36.0, 'F', 4.5, g=0.9)
# playful pluck melody
for k, (tt_, mi) in enumerate([
    (33.4, m('E',5)), (33.65, m('G',5)), (33.9, m('C',6)),
    (34.4, m('G',5)), (34.65, m('E',5)), (34.9, m('C',5)),
    (36.6, m('F',5)), (36.85, m('A',5)), (37.1, m('C',6)),
    (37.6, m('A',5)), (37.85, m('F',5)),
]):
    sig = square(note_hz(mi), 0.13, duty=0.25)
    sig *= adsr(len(sig), 0.004, 0.06, 0.4, 0.05)
    put('lead', tt_, sig, 0.17)
pop_sfx(33.0)                       # chip pop
for i in range(8):                  # pair pops
    blip(32.45 + i * 0.13, m('C', 6) + [0, 4, 7, 12, 7, 4, 0, 12][i], g=0.8, d=0.06)
# transition fill
snare(40.0, 0.7); snare(40.15, 0.8); snare(40.3, 0.9)

# ---------------- SHOWCASE 40.5–64
groove(40.5, 64.0, g=0.85, snare_on=True)
SC_C = ['C', 'F', 'G', 'C', 'F', 'C', 'G', 'C']
for i, item in enumerate(BEATS['showcase']):
    t0 = item['t']
    name = SC_C[i]
    play_chord(t0, name, 2.9, g=0.8, sparkle_top=False)
    play_bass(t0, name, 2.9, g=0.95)
    ding(t0 + 0.06)                 # object reveal
    blip(t0 + 0.14, m('C', 6), g=0.9, d=0.07)
    # little answer motif while the line is spoken
    mi = CHORD_TONES[name][2]
    sig = square(note_hz(mi), 0.12, duty=0.25)
    sig *= adsr(len(sig), 0.004, 0.06, 0.4, 0.04)
    put('lead', t0 + 1.5, sig, 0.15)
    sig2 = square(note_hz(mi + 4 if name in ('C', 'G') else mi + 3), 0.16, duty=0.25)
    sig2 *= adsr(len(sig2), 0.004, 0.07, 0.4, 0.05)
    put('lead', t0 + 1.7, sig2, 0.15)
arp_fill(63.0, 'C', n=4, g=0.9)

# ---------------- FINALE 88–96
groove(88.0, 94.0, g=1.0, snare_on=True)
play_chord(88.0, 'C', 4.0, g=1.0, sparkle_top=False)
play_chord(92.0, 'G', 1.6, g=0.9, sparkle_top=False)
play_chord(93.6, 'C', 2.4, g=1.0, sparkle_top=False)
play_bass(88.0, 'C', 4.0, g=1.0)
play_bass(92.0, 'G', 1.6, g=1.0)
play_bass(93.6, 'C', 2.4, g=1.0)
for tt_ in (88.35, 89.15, 89.95, 90.9, 91.7):
    firework(tt_)
cheer_swell(89.0)
# final flourish
arp_fill(92.2, 'G', n=8, g=1.0)
arp_fill(93.8, 'C', n=8, g=1.0)
sig = square(note_hz(m('C', 6)), 1.2, duty=0.25)
sig *= adsr(len(sig), 0.01, 0.3, 0.6, 0.7)
put('lead', 94.0, sig, 0.22)

# ============================== MIX → stereo
def stereo(bus, pan):
    L = math.sqrt((1 - pan) / 2)
    R = math.sqrt((1 + pan) / 2)
    return buses[bus] * L, buses[bus] * R

L = np.zeros(N); R = np.zeros(N)
for bus, g, pan in [
    ('lead', 1.0, 0.0), ('bass', 1.0, 0.0), ('chord', 1.0, -0.12),
    ('arp', 1.0, 0.18), ('drum', 1.0, 0.06), ('sfx', 1.0, -0.05),
]:
    l, r = stereo(bus, pan)
    L += l * g; R += r * g

# gentle stereo widen on chords/arp already panned; master
mix = np.stack([L, R], axis=1)
mix = soft(mix * 0.85, 3.6)   # earlier, gentler bus saturation → lower crest
peak = np.abs(mix).max()
mix = mix / peak * 10 ** (-1.5 / 20)         # -1.5 dBFS (mix.py masters loudness)

# fades matching picture
fi = int(0.12 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
f0, f1 = int(94.3 * SR), int(96.0 * SR)
mix[f0:f1] *= np.linspace(1, 0, f1 - f0)[:, None]

out = os.path.join(ROOT, 'assets', 'score.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
print(f'{out}  {len(mix)/SR:.2f}s  peak {20*np.log10(np.abs(mix).max()):.1f} dBFS')
