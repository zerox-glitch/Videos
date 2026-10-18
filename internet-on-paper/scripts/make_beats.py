#!/usr/bin/env python3
"""make_beats.py — THE INTERNET ON PAPER: 128 s tech explainer, paper-cyberpunk.

Regenerates plan/beats.json (authoritative timeline for picture, VO, SFX).
Sections 18 s each (after intro), 104 BPM A minor, 30 fps, 1920x1080.
"""
import json, os

DUR, FPS, BPM = 128.0, 30, 104

sections = [
    ("intro",     0.0,   8.0),
    ("packets",   8.0,  26.0),
    ("dns",      26.0,  44.0),
    ("speed",    44.0,  62.0),
    ("datacenter",62.0, 80.0),
    ("crypto",   80.0,  98.0),
    ("threat",   98.0, 116.0),
    ("outro",   116.0, 128.0),
]

events = {
    # intro
    "boot_grid": 0.20, "boot_open": 0.60, "title_scramble": 3.90,
    "title_stamp": 5.40, "subtitle": 5.85,
    # packets
    "msg_card": 8.40, "split": 11.00, "header_stamp": 13.20,
    "route_draw": 15.40, "packet_move": 16.60, "packet_drop": 20.90,
    "retransmit": 21.60, "assemble": 23.60, "ack": 25.20,
    # dns
    "dns_prompt": 26.60, "dns_query": 29.40, "dns_jump": 31.20,
    "dns_answer": 34.00, "dns_cache": 36.80, "dns_ms": 39.50,
    # speed
    "map_draw": 44.60, "cable_draw": 46.20, "light_run": 49.00,
    "speed_fact": 52.00, "cable_stat": 54.60, "cable_ping": 57.40,
    "deep_ping": 59.80,
    # datacenter
    "racks_in": 62.50, "fan_spin": 64.40, "query_fan": 67.00,
    "stitch": 70.60, "cloud_note": 73.00, "power_fact": 75.40,
    "heat_wave": 78.20,
    # crypto
    "lock_draw": 80.40, "handshake": 83.00, "key_swap": 86.00,
    "aes_shred": 88.80, "key_fact": 91.40, "brute_bar": 93.90,
    "lock_snap": 96.60,
    # threat
    "dark_rise": 98.20, "phish_hook": 100.40, "ransom_card": 103.30,
    "hash_type": 106.00, "salt_reroll": 108.90, "twofa": 111.40,
    "patch_note": 113.80,
    # outro
    "recap_fan": 116.40, "final_gauge": 119.60, "end_stamp": 122.80,
    "powerdown": 126.60,
}

# section-boundary glitch cuts (0.18 s frame bursts)
glitch_cuts = [8.0, 26.0, 44.0, 62.0, 80.0, 98.0, 116.0]
# extra in-scene glitch bursts (frame-level): (id, t, dur)
glitch_extra = [
    ("g_packet_drop", 20.90, 0.16), ("g_title", 4.15, 0.14),
    ("g_key_fact", 91.35, 0.16), ("g_ransom", 103.25, 0.14),
    ("g_salt", 108.85, 0.14), ("g_powerdown", 126.60, 0.12),
]

vo = [
    {"id": "hook",   "t": 1.40,  "win": 7.0},
    {"id": "p1",     "t": 9.00,  "win": 17.0},
    {"id": "p2",     "t": 27.00, "win": 14.5},
    {"id": "p3",     "t": 45.20, "win": 13.5},
    {"id": "p4",     "t": 63.00, "win": 15.5},
    {"id": "p5",     "t": 80.05, "win": 19.10},
    {"id": "p6",     "t": 99.20, "win": 16.0},
    {"id": "outro",  "t": 116.15, "win": 11.30},
]

# 1-frame impact flashes (white/neon)
flashes = [5.40, 23.65, 34.05, 96.65, 122.85]

sfx = [
    (0.25, "boot_blip"), (1.00, "key_clack"), (1.60, "type"), (2.30, "type"),
    (3.00, "type"), (4.20, "glitch"), (5.45, "stamp"),
    (8.55, "slide"), (11.05, "rip"), (11.65, "pop"), (13.25, "header"),
    (15.50, "wire"), (16.70, "zip"), (20.95, "drop"), (21.65, "rezip"),
    (23.70, "clack"), (25.30, "beep"),
    (26.65, "term"), (27.35, "type"), (28.15, "type"), (29.50, "zap"),
    (31.30, "hop"), (34.10, "slam"), (36.90, "chip"), (39.55, "tick"),
    (44.65, "map"), (46.30, "wire"), (49.10, "whoosh"), (52.10, "ding"),
    (54.70, "bass"), (57.50, "ping"), (59.90, "sweep"),
    (62.55, "rack"), (64.45, "fan"), (67.10, "fanout"), (70.70, "stitch"),
    (73.10, "slap"), (75.50, "gauge"), (78.30, "hum"),
    (80.50, "click"), (83.10, "ticket"), (86.10, "swap"), (88.90, "shred"),
    (91.45, "glitch"), (93.95, "stall"), (96.70, "snap"),
    (98.30, "drone"), (100.50, "hook"), (103.40, "alarm"), (106.10, "hash"),
    (108.95, "hash"), (111.50, "beep"), (113.85, "slap"),
    (116.50, "whoosh"), (119.70, "tick"), (122.90, "stamp"), (126.70, "powerdown"),
]
# boundary glitch SFX
for g in glitch_cuts:
    sfx.append((g + 0.02, "glitch"))
sfx.sort()

beats = {
    "meta": {"dur": DUR, "fps": FPS, "bpm": BPM, "key": "A minor",
             "title": "The Internet on Paper",
             "size": [1920, 1080]},
    "sections": [{"id": i, "t0": a, "t1": b} for i, a, b in sections],
    "events": events,
    "glitch_cuts": glitch_cuts,
    "glitch_extra": [{"id": i, "t": t, "dur": d} for i, t, d in glitch_extra],
    "flashes": flashes,
    "vo": vo,
    "sfx": [{"t": t, "id": i} for t, i in sfx],
    "fade": {"in": [0.0, 0.5], "out": [127.5, 128.0]},
}

if __name__ == "__main__":
    os.makedirs("plan", exist_ok=True)
    with open("plan/beats.json", "w") as f:
        json.dump(beats, f, indent=1)
    print(f"plan/beats.json  {DUR}s  {FPS}fps  {BPM}BPM  "
          f"{len(sections)} sections  {len(events)} events  {len(sfx)} sfx  {len(vo)} VO")
