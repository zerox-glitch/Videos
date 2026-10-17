#!/usr/bin/env python3
"""Emit plan/beats.json — the ONLY timing source for the ABC Pixel Party video.

Song rhythm: 120 BPM (beat = 0.5 s), melody = the classic ABC tune
(Twinkle-Twinkle family) in C major.

  L1 "A B C D E F G"        quarters, G held            (4.0 s)
  L2 "H I J K L M N O P"    quarters + rush + P held    (4.0 s)
  L3 "Q R S T U V"          quarters                    (3.0 s)
  L4 "W X Y and Z"          quarters, Z held            (2.5 s)
  C1 "Now I know my ABCs"   quarters, Cs held           (4.0 s)
  C2 "Next time won't you sing with me"                 (4.0 s)

Both song passes use identical phrase starts shifted by SONG2_SHIFT.
"""
import json, os

BPM = 120
BEAT = 60.0 / BPM
DURATION = 96.0

# ---------------------------------------------------------------- phrase table
# (name, text, [(word, start_s), ...], line_end_s)  offsets relative to phrase t0
def words(seq):
    """seq: list of (word, start_beats). Returns (list, dur_beats)."""
    return seq

L1 = [("A",0),("B",1),("C",2),("D",3),("E",4),("F",5),("G",6)]          # G holds to beat 8
L2 = [("H",0),("I",1),("J",2),("K",3),("L",4),("M",4.5),("N",5),("O",5.5),("P",6)]
L3 = [("Q",0),("R",1),("S",2),("T",3),("U",4),("V",5)]
L4 = [("W",0),("X",1),("Y",2),("and",2.5),("Z",3)]
C1 = [("Now",0),("I",1),("know",2),("my",3),("A",4),("B",5),("Cs",6)]
C2 = [("Next",0),("time",1),("won't",2),("you",3),("sing",4),("with",5),("me",6)]

PHRASE_DUR = {"L1":4.0,"L2":4.0,"L3":3.0,"L4":2.5,"C1":4.0,"C2":4.0}

# phrase text + start times for pass 1
PASS1 = [
    ("L1","A B C D E F G",  8.0),
    ("L2","H I J K L M N O P", 12.5),
    ("L3","Q R S T U V",    17.0),
    ("L4","W X Y and Z",    20.5),
    ("C1","Now I know my ABCs", 24.0),
    ("C2","Next time won't you sing with me", 28.0),
]
SONG2_SHIFT = 56.0            # pass 2 starts at 64.0, ends 88.0

def letter_schedule():
    """26 absolute letter-pop times per pass."""
    times = [None] * 26
    for key, text, t0 in PASS1:
        seq = {"L1":L1,"L2":L2,"L3":L3,"L4":L4,"C1":C1,"C2":C2}[key]
        for w, b in seq:
            if len(w) == 1 and "A" <= w <= "Z":
                i = ord(w) - 65
                if times[i] is None:   # first occurrence wins (C1 repeats "A","B")
                    times[i] = round(t0 + b * BEAT, 4)
    return times

def build_lines(shift=0.0, tag="s1"):
    lines = []
    for key, text, t0 in PASS1:
        seq = {"L1":L1,"L2":L2,"L3":L3,"L4":L4,"C1":C1,"C2":C2}[key]
        ws = [[w, round(t0 + shift + b * BEAT, 4)] for w, b in seq]
        lines.append({
            "id": f"{tag}-{key}",
            "text": text,
            "t0": round(t0 + shift, 4),
            "t1": round(t0 + shift + PHRASE_DUR[key], 4),
            "words": ws,
        })
    return lines

SHOWCASE_WORDS = [
    ("A","Apple"),("B","Ball"),("C","Cat"),("D","Dog"),
    ("E","Egg"),("F","Fish"),("G","Grapes"),("H","Hat"),
]
SHOWCASE_T0 = 40.5
SHOWCASE_STEP = 2.9           # 8 items -> last starts 60.8, ends 63.7

showcase = []
for i,(letter, word) in enumerate(SHOWCASE_WORDS):
    t = round(SHOWCASE_T0 + i * SHOWCASE_STEP, 4)
    showcase.append({
        "t": t, "tEnd": round(t + SHOWCASE_STEP, 4),
        "letter": letter, "word": word,
        "phrase": f"{letter} is for {word}",
        "sprite": word.lower(),
    })

beats = {
    "bpm": BPM, "beat": BEAT, "duration": DURATION,
    "sections": {
        "intro":     [0.0, 8.0],
        "song1":     [8.0, 32.0],
        "interlude": [32.0, 40.5],
        "showcase":  [40.5, 64.0],
        "song2":     [64.0, 88.0],
        "finale":    [88.0, 96.0],
    },
    "wipes": [32.0, 40.5, 64.0, 88.0],
    "letters1": letter_schedule(),
    "letters2": [round(t + SONG2_SHIFT, 4) for t in letter_schedule()],
    "lines": build_lines(0.0, "s1") + build_lines(SONG2_SHIFT, "s2"),
    "showcase": showcase,
    "hook":  {"t": 2.6, "text": "Let's learn our ABCs!"},
    "cheer": {"t": 89.0, "text": "Yay! Great job!"},
    "endcard": {"t": 89.0},
    "fade": {"t0": 94.3, "t1": 96.0},
}

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "plan", "beats.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(beats, f, indent=1)

# sanity: every letter scheduled exactly once per pass
for key in ("letters1", "letters2"):
    got = [t for t in beats[key] if t is not None]
    assert len(got) == 26, (key, len(got))
print(f"wrote {out}")
print("letters1:", beats["letters1"][0], "->", beats["letters1"][-1])
print("showcase:", showcase[0]["t"], "->", showcase[-1]["tEnd"])
