#!/usr/bin/env python3
"""srt.py — subtitles from plan/beats.json caption groups (exact script text)."""
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BEATS = json.load(open(os.path.join(ROOT, 'plan', 'beats.json')))

def ts(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000: s += 1; ms = 0
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'

groups = []
for sid in [f's{i}' for i in range(1, 9)]:
    for g in BEATS['captions'][sid]:
        groups.append(g)
groups.sort(key=lambda g: g['t'])

lines = []
for i, g in enumerate(groups, 1):
    t1 = g['t1'] + 0.05
    # avoid overlap with next cue (sequential display)
    if i < len(groups):
        t1 = min(t1, groups[i]['t'] - 0.01)
        t1 = max(t1, g['t'] + 0.30)
    lines.append(f'{i}\n{ts(g["t"])} --> {ts(t1)}\n{g["text"]}\n')

out = os.path.join(ROOT, 'subtitles', 'cube-infinite-space.srt')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w').write('\n'.join(lines))
print(f'{out}  {len(groups)} cues')
