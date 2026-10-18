#!/usr/bin/env python3
"""make_beats.py — THE IMPOSSIBLE FILES EP.001 timing plan (narration-driven).

VO masters in assets/vo/s1..s8.mp3 are authoritative; windows below place them
with breathing gaps. Caption groups come from the exact script and are timed
proportionally inside each take. Regenerate: python3 scripts/make_beats.py
"""
import json, os

FPS = 30
DUR = 109.0            # s8 ends 107.75 + 1.25 s loop-hold tail

sections = [
    ("object",    0.00,  11.48),
    ("scan",     11.48,  23.61),
    ("chamber",  23.61,  43.33),
    ("recursion",43.33,  63.20),
    ("seventh",  63.20,  78.36),
    ("lab",      78.36,  90.45),
    ("paradox",  90.45, 103.62),
    ("ending",  103.62, 109.00),
]

# id, start, tempo-corrected take length (masters in assets/vo; atempo applied in mix)
vo = [
    {"id": "s1", "t":   0.45, "dur":  7.75, "win":  7.91},
    {"id": "s2", "t":  11.48, "dur": 11.15, "win": 11.31},
    {"id": "s3", "t":  23.61, "dur": 18.60, "win": 18.76},
    {"id": "s4", "t":  43.33, "dur": 18.02, "win": 18.18},
    {"id": "s5", "t":  63.20, "dur": 10.95, "win": 11.11},
    {"id": "s6", "t":  78.36, "dur": 10.85, "win": 11.01},
    {"id": "s7", "t":  90.45, "dur": 12.20, "win": 12.36},
    {"id": "s8", "t": 103.62, "dur":  3.75, "win":  3.91},
]

# exact script, split into caption groups (2-6 words); hi = highlight (shown caps)
captions = {
    "s1": [("It was just", 0), ("a black cube.", 0), ("Ten centimeters wide.", 1),
           ("No buttons.", 0), ("No openings.", 0), ("Nothing unusual.", 0)],
    "s2": [("Until someone tried", 0), ("to measure what was inside.", 0),
           ("The scanner detected", 0), ("an empty room...", 0),
           ("Nearly a kilometer long.", 1), ("That should have been", 0),
           ("impossible.", 0)],
    "s3": [("So they sent", 0), ("a miniature camera", 0), ("through its surface.", 0),
           ("On the other side", 0), ("was a hallway.", 0), ("Massive pillars.", 0),
           ("A ceiling lost in darkness.", 0), ("And at the far end...", 0),
           ("Another black cube.", 1)],
    "s4": [("The camera entered it.", 0), ("Another hallway.", 0),
           ("Ten times larger.", 1), ("Then another cube.", 0), ("And another.", 0),
           ("Each one led", 0), ("to a world", 0), ("bigger than the last.", 0)],
    "s5": [("But after", 0), ("the seventh cube...", 1), ("Something changed.", 0),
           ("The camera entered", 0), ("a room it recognized.", 0),
           ("The same walls.", 0), ("The same table.", 0)],
    "s6": [("The same laboratory", 1), ("where the experiment began.", 0),
           ("And on that table...", 0), ("Sat a black cube.", 0),
           ("Then the researchers noticed", 0), ("something terrifying.", 0)],
    "s7": [("On their monitor...", 0), ("They could see themselves", 0),
           ("watching the camera feed.", 0), ("But behind them,", 0),
           ("standing in the laboratory...", 0), ("Was the camera.", 1)],
    "s8": [("It hadn't traveled deeper", 0), ("into the cube.", 0),
           ("It had somehow", 0), ("come back out.", 1)],
}

# picture events (absolute seconds)
events = {
    # object
    "anomaly": 1.95, "measure_line": 2.55, "scan_dot": 3.6,
    # scan
    "beam_start": 11.60, "wire_on": 12.5, "tunnel_on": 13.4,
    "count_10": 14.6, "count_100": 15.6, "count_500": 16.5, "count_987": 17.6,
    "warning": 18.1, "align_face": 20.6, "face_fills": 23.1, "portal_1": 23.61,
    # chamber
    "cube_far": 33.5, "cube_recognize": 37.6, "cube_center": 41.6, "portal_2": 43.33,
    # recursion (4 escalating entries)
    "portal_3": 47.30, "portal_4": 52.60, "portal_5": 57.40, "portal_6": 61.60,
    # seventh
    "blackout": 63.24, "light_rect": 65.2, "room_emerge": 68.5,
    "table_seen": 72.4, "recognize": 76.2,
    # lab
    "monitor_on": 79.2, "feed_lock": 84.0, "probe_reflect": 87.6,
    # paradox
    "researchers": 91.3, "feed_mirror": 94.0, "probe_behind": 96.4,
    "ring_clear": 98.2, "they_turn": 100.6, "probe_turn": 101.8,
    # ending
    "pullback": 103.66, "collapse": 105.4, "outer_lab": 106.4,
    "match_frame": 107.55,
}
# 1-frame subtle cool flashes only on recursion entries (impact sync)
flashes = [47.30, 52.60, 57.40, 61.60]

# sfx cues: (t, id)
sfx = [
    (0.45, "sub_pulse"), (1.2, "vent"), (1.95, "hum_tick"), (2.55, "meas_blip"),
    (3.6, "dot_blink"), (5.4, "vent"), (9.0, "hum_tick"),
    (11.60, "scan_start"), (12.4, "scan_pulse"), (13.4, "scan_pulse"),
    (14.6, "scan_pulse"), (15.6, "scan_pulse"), (16.5, "scan_pulse"),
    (17.6, "impact_mid"), (18.1, "warning_beep"), (18.6, "warning_beep"),
    (20.6, "riser_short"), (23.10, "whoosh"), (23.61, "impact_1"),
    (25.0, "hall_amb"), (28.5, "metal_far"), (31.5, "hall_amb"),
    (33.5, "tone_high"), (37.6, "tone_high"), (41.6, "riser_short"),
    (43.33, "impact_2"), (47.30, "impact_3"), (52.60, "impact_4"),
    (57.40, "impact_5"), (61.60, "impact_6"), (46.0, "riser_mid"),
    (51.0, "riser_mid"), (56.0, "riser_late"), (60.5, "riser_late"),
    (63.24, "stop_swell"), (65.2, "room_tone"), (68.5, "soft_whoosh"),
    (72.4, "heart"), (74.6, "heart"), (76.2, "heart"),
    (79.2, "monitor_buzz"), (84.0, "feed_lock_beep"), (87.6, "metal_click"),
    (91.3, "heart"), (94.0, "feed_glitch"), (96.4, "ring_ping"),
    (98.2, "ring_ping"), (100.6, "breath_rev"), (101.8, "ring_ping"),
    (103.66, "pull_whoosh"), (105.4, "collapse_rumble"),
    (106.4, "impact_final"), (107.55, "sub_tick"),
]

beats = {
    "meta": {"dur": DUR, "fps": FPS, "size": [1080, 1920],
             "title": "The Cube With Infinite Space Inside",
             "series": "THE IMPOSSIBLE FILES", "episode": "EP.001",
             "bpm": 54, "key": "D minor"},
    "sections": [{"id": i, "t0": a, "t1": b} for i, a, b in sections],
    "vo": vo,
    "captions": {k: [{"text": t, "hi": bool(h)} for t, h in groups]
                 for k, groups in captions.items()},
    "events": events,
    "flashes": flashes,
    "sfx": [{"t": t, "id": i} for t, i in sfx],
    "fade": {"in": [0.0, 0.0], "out": [DUR, DUR]},   # loop film: no fades
}

# proportional caption timings inside each take window
for v in vo:
    groups = captions[v["id"]]
    w0, w1 = v["t"], v["t"] + v["dur"] - 0.10
    weights = [max(3, len(t)) for t, _ in groups]
    total = sum(weights)
    acc = w0
    out = []
    for (txt, hi), w in zip(groups, weights):
        span = (w1 - w0) * w / total
        out.append({"text": txt, "hi": bool(hi), "t": round(acc, 2),
                    "t1": round(min(acc + span + 0.14, w1 + 0.35), 2)})
        acc += span
    beats["captions"][v["id"]] = out

if __name__ == "__main__":
    os.makedirs("plan", exist_ok=True)
    with open("plan/beats.json", "w") as f:
        json.dump(beats, f, indent=1)
    ncap = sum(len(v) for v in beats["captions"].values())
    print(f"plan/beats.json  {DUR}s  {FPS}fps  {len(sections)} sections  "
          f"{len(vo)} VO  {ncap} captions  {len(events)} events  {len(sfx)} sfx")
