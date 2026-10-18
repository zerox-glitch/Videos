#!/usr/bin/env python3
"""Generate plan/beats.json — authoritative cue sheet for Stickman's Fine.

Dark-ish stickman comedy, 72 s @ 108 BPM. Every visual event, VO line and SFX
cue that film.js consumes is defined here. Run: python3 scripts/make_beats.py
"""
import json, pathlib

DUR = 72.0
FPS = 30

def sec(name, a, b): return {"name": name, "t0": a, "t1": b}

sections = [
    sec("intro",  0.0,   6.0),
    sec("joke1",  6.0,   17.5),   # the snooze -> museum
    sec("joke2",  17.5,  29.5),   # espresso bloodstream
    sec("joke3",  29.5,  42.5),   # meeting -> email -> thought
    sec("joke4",  42.5,  55.5),   # smartwatch marathon
    sec("joke5",  55.5,  66.5),   # duck therapist
    sec("outro",  66.5,  72.0),   # rooftop -> endcard
]

# VO takes (text kept verbatim into scripts/takes.py / generate_speech)
vo = {
    "hook":  {"t": 2.2,  "text": "This is Stickman. He is completely fine."},
    "p1":    {"t": 13.25,"text": "He once hit snooze so hard, he woke up in a museum."},
    "p2":    {"t": 24.95,"text": "His blood type is espresso."},
    "p3":    {"t": 37.3, "text": "This meeting could have been an email. The email could have been a thought."},
    "p4":    {"t": 49.35,"text": "He told his smartwatch he ran a marathon. The watch believed him. Neither of them moved."},
    "p5":    {"t": 61.7, "text": "Turns out, the only one who ever listened was rubber."},
    "outro": {"t": 67.35,"text": "Stickman insists he is fine. The coffee agrees."},
    "boss":  {"t": 30.1, "text": "Quick five minute meeting!"},
}

# picture events (id -> time) driven from film.js / scenes.js
events = {
    # intro
    "hook_wave":      1.0,
    "hook_stamp":     4.1,
    # joke1 — snooze / museum
    "alarm_ring":     6.7,
    "snooze_slap":    8.1,
    "days_start":     9.7,
    "days_end":      12.4,
    "museum_case":   13.0,
    "flash1":        14.6,
    "flash2":        15.4,
    "flash3":        16.4,
    # joke2 — espresso clinic
    "chart_pop":     18.6,
    "drip_start":    20.3,
    "ecg_wave":      21.6,
    "nurse_faint":   24.2,
    "stamp_espresso":25.05,
    "sip":           27.4,
    # joke3 — meeting
    "boss_enter":    29.9,
    "clock_spin":    31.2,
    "paper_pile":    33.4,
    "room_fold":     36.55,
    "envelope_clunk":37.1,
    "bubble_shrink": 39.3,
    "bubble_pop":    40.4,
    "paper_flutter": 41.2,
    # joke4 — smartwatch
    "watch_goal":    43.6,
    "shake_start":   44.6,
    "shake_end":     47.4,
    "badge":         47.7,
    "stamp_proud":   49.7,
    "deadpan_zoom":  51.1,
    "crickets":      52.4,
    "split_panel":   53.9,
    # joke5 — duck therapist
    "couch_settle":  56.0,
    "talk_scribble": 57.2,
    "duck_reveal":   58.6,
    "duck_write":    59.8,
    "notepad_80":    60.9,
    "duck_squeak":   63.6,
    "tear":          64.7,
    # outro
    "sip_outro":     66.9,
    "alarm_callback":70.0,
    "endcard":       70.35,
    "iris_close":    71.15,
}

# SFX cues (same ids as events where synced; synth in scripts/music.py)
sfx = [
    ("alarm_buzz",    6.72),
    ("slap",          8.12),
    ("whoosh",        9.75),
    ("thud",         12.45),
    ("clunk_glass",  13.02),
    ("shutter",      14.62),
    ("shutter",      15.42),
    ("shutter",      16.42),
    ("pop_chart",    18.62),
    ("glug",         20.6),
    ("ecg_beep",     21.65),
    ("thud",         24.22),
    ("stamp",        25.07),
    ("sip",          27.45),
    ("whoosh",       29.95),
    ("rattle",       31.25),
    ("whoosh",       36.6),
    ("clunk_glass",  37.12),
    ("pop",          40.42),
    ("beepbeep",     43.62),
    ("shake_rattle", 44.7),
    ("fanfare",      47.75),
    ("stamp",        49.72),
    ("cricket",      52.45),
    ("page",         53.95),
    ("plop",         56.05),
    ("scribble",     57.3),
    ("quack",        58.65),
    ("pencil",       59.85),
    ("quack",        63.62),
    ("plop",         64.78),
    ("sip",          66.95),
    ("alarm_buzz",   70.0),
    ("stamp",        70.4),
    ("ding",         71.6),
]

beats = {
    "meta": {
        "title": "Stickman's Fine",
        "tagline": "A stickman comedy about being completely fine",
        "dur": DUR, "fps": FPS, "bpm": 108, "key": "A minor",
        "size": [1920, 1080],
        "loudness_target": -14.0,
    },
    "sections": sections,
    "vo": vo,
    "events": events,
    "sfx": [{"id": i, "t": round(t, 3)} for i, t in sfx],
    "iris": [6.0, 17.5, 29.5, 42.5, 55.5, 66.5],
    "fade": {"in": [0.0, 0.45], "out": [71.55, 72.0]},
}

out = pathlib.Path(__file__).resolve().parent.parent / "plan" / "beats.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(beats, indent=1) + "\n")

# sanity
assert all(sections[i]["t1"] == sections[i + 1]["t0"] for i in range(len(sections) - 1))
assert sections[-1]["t1"] == DUR
for k, v in events.items():
    assert 0 <= v < DUR, k
for v in vo.values():
    assert 0 <= v["t"] < DUR
for s in beats["sfx"]:
    assert 0 <= s["t"] < DUR
print(f"wrote {out}: {len(sections)} sections, {len(vo)} VO, {len(events)} events, {len(beats['sfx'])} sfx")
