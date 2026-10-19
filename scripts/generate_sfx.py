#!/usr/bin/env python3
"""Create the project's original short UI/transition SFX from plan/beats.json (stdlib only)."""
from __future__ import annotations

import json
import math
import random
import sys
import wave
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "plan" / "beats.json"
DEFAULT_OUTPUT = ROOT / "assets" / "sfx" / "reel-sfx.wav"
SAMPLE_RATE = 48_000


def envelope(kind: str, x: float) -> float:
    x = min(1.0, max(0.0, x))
    if kind in {"impact", "tap", "tick"}:
        return math.exp(-x * (8.2 if kind == "impact" else 10.5 if kind == "tap" else 13.0)) * (1.0 - math.exp(-x * 90.0))
    if kind == "confirm":
        return math.exp(-x * 5.7) * min(1.0, x * 45.0)
    return math.sin(math.pi * x) ** 1.55


def add_event(left: array, right: array, event: dict, seed: int) -> None:
    kind = event["type"]
    start = int(round(float(event["time"]) * SAMPLE_RATE))
    duration = {"impact": 0.22, "tap": 0.105, "tick": 0.075, "confirm": 0.28, "swipe": 0.32}.get(kind)
    if duration is None:
        raise ValueError(f"Unsupported SFX type: {kind}")
    count = int(round(duration * SAMPLE_RATE))
    gain = float(event.get("gain", 0.2))
    pan = min(1.0, max(-1.0, float(event.get("pan", 0.0))))
    pan_l = math.sqrt((1.0 - pan) * 0.5)
    pan_r = math.sqrt((1.0 + pan) * 0.5)
    rng = random.Random(seed)
    phase_a = 0.0
    phase_b = 0.0
    low_noise = 0.0
    for i in range(count):
        x = i / max(1, count - 1)
        env = envelope(kind, x)
        noise = rng.uniform(-1.0, 1.0)
        if kind == "impact":
            freq = 92.0 - 34.0 * x
            phase_a += 2.0 * math.pi * freq / SAMPLE_RATE
            tonal = math.sin(phase_a) * math.exp(-x * 7.5) * 0.60
            transient = noise * math.exp(-x * 54.0) * 0.16
            sample = (tonal + transient) * env
        elif kind == "tap":
            freq = 920.0 - 250.0 * x
            phase_a += 2.0 * math.pi * freq / SAMPLE_RATE
            sample = (math.sin(phase_a) * 0.60 + noise * math.exp(-x * 52.0) * 0.13) * env
        elif kind == "tick":
            freq = 1450.0 - 300.0 * x
            phase_a += 2.0 * math.pi * freq / SAMPLE_RATE
            sample = (math.sin(phase_a) * 0.46 + noise * math.exp(-x * 62.0) * 0.10) * env
        elif kind == "confirm":
            phase_a += 2.0 * math.pi * 660.0 / SAMPLE_RATE
            phase_b += 2.0 * math.pi * 880.0 / SAMPLE_RATE
            sample = (math.sin(phase_a) * 0.34 + math.sin(phase_b) * 0.22) * env
            sample += noise * math.exp(-x * 58.0) * 0.055 * env
        else:  # compact, filtered, dry synthetic swipe
            low_noise += 0.085 * (noise - low_noise)
            freq = 245.0 - 110.0 * x
            phase_a += 2.0 * math.pi * freq / SAMPLE_RATE
            low_body = math.sin(phase_a) * (0.30 - 0.12 * x)
            high_air = (noise - low_noise) * 0.11
            sample = (low_body + low_noise * 0.28 + high_air) * env
        sample *= gain
        pos = start + i
        if pos < len(left):
            left[pos] += sample * pan_l
            right[pos] += sample * pan_r


def main() -> None:
    if len(sys.argv) > 2:
        raise SystemExit("Usage: python3 scripts/generate_sfx.py [output.wav]")
    output = Path(sys.argv[1]) if len(sys.argv) == 2 else DEFAULT_OUTPUT
    if not output.is_absolute():
        output = ROOT / output
    beats = json.loads(PLAN.read_text(encoding="utf-8"))
    frames = int(round(float(beats["duration"]) * SAMPLE_RATE))
    left = array("f", [0.0]) * frames
    right = array("f", [0.0]) * frames
    cue_index = 0
    for beat in beats["beats"]:
        for cue in beat.get("sound_cues", []):
            add_event(left, right, cue, seed=1907 + cue_index * 13)
            cue_index += 1
    peak = max(max(abs(value) for value in left), max(abs(value) for value in right), 1e-9)
    # Preserve headroom; normalization is fixed and deterministic, not frame-dependent.
    master = min(5.0, 0.42 / peak)
    output.parent.mkdir(parents=True, exist_ok=True)
    pcm = array("h")
    actual_peak = 0.0
    for l, r in zip(left, right):
        lv = max(-0.98, min(0.98, l * master))
        rv = max(-0.98, min(0.98, r * master))
        actual_peak = max(actual_peak, abs(lv), abs(rv))
        pcm.append(int(round(lv * 32767)))
        pcm.append(int(round(rv * 32767)))
    if sys.byteorder != "little":
        pcm.byteswap()
    with wave.open(str(output), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())
    print(f"Generated {cue_index} original SFX cues · {frames / SAMPLE_RATE:.2f} s · 48 kHz stereo · peak {20 * math.log10(max(actual_peak, 1e-9)):.1f} dBFS")
    print(f"Output: {output.relative_to(ROOT) if output.is_relative_to(ROOT) else output}")


if __name__ == "__main__":
    main()
