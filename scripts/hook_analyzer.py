#!/usr/bin/env python3
"""
hook_analyzer.py — Transcript normalization, hook-strength scoring,
story-arc selection (Beginning -> Development -> Payoff), dead-air pause
tightening (EDL), and multi-variation title/hook generation.
"""
import copy
import re
from typing import Dict, List, Optional, Tuple

WEAK_OPENING_PATTERNS = [
    r"^(and|but|or)\s+(the|that|those|this|so)\b",
    r"^so\s+let'?s\s+say\b",
    r"^well,?\s+(what\s+does\s+it\s+mean|one\s+way|i\s+suppose|you\s+might)\b",
    r"^(i\s+suppose|i\s+mean|you\s+know|sort\s+of|kind\s+of)\b",
    r"^what\s+does\s+it\s+mean\??$",
    r"^does\s+it\s+really\s+mean\??$",
    r"^when\s+we\s+contemplate\s+the\s+size\s+and\s+the\s+scale\b",
    r"^so\s+how\s+do\s+you\s+observe\s+something\b",
]

DANGLING_REFERENT_PATTERNS = [
    r"\b(those\s+clock\s+faces|that\s+prescription|the\s+prescription|this\s+thing|that\s+one)\b",
]

HIGH_CURIOSITY_MARKERS = [
    (r"\bone\s+particle\s+at\s+a\s+time\b", 38),
    (r"\bsend\s+one\s+(particle|electron)\b", 34),
    (r"\bquantum\s+mechanics\s+tells\s+us\b", 36),
    (r"\bsmaller\s+the\s+wavelength\b", 28),
    (r"\bhigher\s+the\s+energy\b", 24),
    (r"\bform\s+a\s+black\s+hole\b", 40),
    (r"\bwhat\s+are\s+we\?", 36),
    (r"\blittle\s+specks\b", 32),
    (r"\bmote\s+of\s+dust\b", 30),
    (r"\b400\s+billion\s+stars\b", 30),
    (r"\btwo\s+trillion\s+galaxies\b", 32),
    (r"\bandromeda\s+galaxy\b", 34),
    (r"\bevery\s+possible\s+route\b", 30),
    (r"\bexplore[s]?\s+(both|all|every)\s+(paths|routes)\b", 32),
    (r"\bnature\s+is\s+not\s+like\s+that\b", 26),
]

PAYOFF_CLOSURE_MARKERS = [
    (r"\bthe\s+particle\s+does\.?$", 42),
    (r"\bcorrect\s+description\s+of\s+reality\b", 32),
    (r"\bedge\s+of\s+our\s+current\s+understanding\.?$", 40),
    (r"\bbuilding\s+blocks\s+of\s+space\b", 28),
    (r"\bfundamental\s+property\s+of\s+the\s+universe\.?$", 34),
    (r"\bmeaningless\s+galaxy\.?$", 45),
    (r"\bbring\s+meaning\b", 34),
    (r"\bexplore\s+all\s+routes\b", 28),
]

FILLER_STANDALONE = {"uh", "um", "erm", "ah", "hmm"}


def normalize_transcript_words(words: List[Dict], clip_id: str = "") -> List[Dict]:
    """
    Fixes common ASR homophones in physics/science interviews while keeping
    exact word-level timing intact.
    """
    cleaned: List[Dict] = []
    n = len(words)
    i = 0
    while i < n:
        w = copy.deepcopy(words[i])
        txt = (w.get("word") or "").strip()
        if not txt:
            i += 1
            continue

        low = re.sub(r"[^a-z0-9'-]", "", txt.lower())
        if low in FILLER_STANDALONE:
            i += 1
            continue

        # Merge split "o" + "'clock"
        if low == "o" and i + 1 < n and words[i + 1]["word"].strip().lower().startswith("'clock"):
            cleaned.append({
                "word": "o" + words[i + 1]["word"].strip(),
                "start": float(w["start"]),
                "end": float(words[i + 1]["end"]),
            })
            i += 2
            continue

        # Merge split "plank"/"planck" + "-sized"
        if low in ("plank", "planck") and i + 1 < n and words[i + 1]["word"].strip().startswith("-"):
            cleaned.append({
                "word": "Planck" + words[i + 1]["word"].strip(),
                "start": float(w["start"]),
                "end": float(words[i + 1]["end"]),
            })
            i += 2
            continue

        # Merge "double" + "split" -> "double-slit"
        if low == "double" and i + 1 < n and words[i + 1]["word"].strip().lower().startswith("split"):
            punct = ""
            nxt = words[i + 1]["word"].strip()
            if nxt[-1] in ".,?!":
                punct = nxt[-1]
            cleaned.append({
                "word": f"double-slit{punct}",
                "start": float(w["start"]),
                "end": float(words[i + 1]["end"]),
            })
            i += 2
            continue

        # Fix "Andromeda Galaxy in Bank" -> "Andromeda Galaxy and back"
        if (
            low == "in"
            and i >= 1
            and "galaxy" in cleaned[-1]["word"].lower()
            and i + 1 < n
            and words[i + 1]["word"].strip().lower().startswith("bank")
        ):
            nxt_w = words[i + 1]
            punct = nxt_w["word"].strip()[-1] if nxt_w["word"].strip()[-1] in ".,?!" else "."
            cleaned.append({"word": "and", "start": float(w["start"]), "end": float(w["end"])})
            cleaned.append({"word": f"back{punct}", "start": float(nxt_w["start"]), "end": float(nxt_w["end"])})
            i += 2
            continue

        # Fix "plank" -> "Planck"
        if low == "plank":
            suffix = txt[5:] if len(txt) > 5 else ""
            txt = "Planck" + suffix

        # Fix "moat of dust" -> "mote of dust"
        if low == "moat" and i + 2 < n and words[i + 1]["word"].strip().lower() == "of":
            suffix = txt[4:] if len(txt) > 4 else ""
            txt = "mote" + suffix

        # Split accidental space-joined words
        parts = txt.split()
        if len(parts) > 1:
            dur = max(0.06, float(w["end"]) - float(w["start"]))
            step = dur / len(parts)
            for k, p in enumerate(parts):
                cleaned.append({
                    "word": p,
                    "start": round(float(w["start"]) + k * step, 3),
                    "end": round(float(w["start"]) + (k + 1) * step, 3),
                })
        else:
            cleaned.append({
                "word": txt,
                "start": float(w["start"]),
                "end": max(float(w["end"]), float(w["start"]) + 0.04),
            })
        i += 1

    return cleaned


def segment_sentences(words: List[Dict]) -> List[Dict]:
    """Splits word timestamps into sentence units."""
    sentences: List[Dict] = []
    cur: List[Dict] = []
    for idx, w in enumerate(words):
        cur.append({**w, "orig_idx": idx})
        txt = w["word"].strip()
        ends_sent = len(txt) > 0 and txt[-1] in ".?!"
        long_gap = (idx + 1 < len(words)) and (words[idx + 1]["start"] - w["end"] > 0.95)
        if (ends_sent and len(cur) >= 3) or long_gap or idx == len(words) - 1:
            s_text = " ".join(x["word"] for x in cur)
            sentences.append({
                "text": s_text,
                "start": cur[0]["start"],
                "end": cur[-1]["end"],
                "words": cur,
            })
            cur = []
    return sentences


def strip_leading_conversational_filler(sentence_words: List[Dict]) -> List[Dict]:
    """
    Removes weak conversational discourse markers at the very start of an opening
    hook sentence (e.g. 'But remember, quantum mechanics...' -> 'Quantum mechanics...',
    'And it is true... What are we?' -> 'What are we?') ONLY when there is a clean
    acoustic boundary or discourse prefix, preserving 100% of the speaker's meaning.
    """
    if len(sentence_words) < 5:
        return sentence_words

    toks = [re.sub(r"[^a-z']", "", w["word"].lower()) for w in sentence_words]

    # Prefix patterns safe to trim cleanly at word boundary
    prefixes_to_trim = [
        ["but", "remember"],
        ["so", "the", "statement", "is", "that"],
        ["and", "here's", "another", "property"],
        ["so", "let's", "say"],
        ["well"],
        ["so"],
        ["and"],
    ]
    for pref in prefixes_to_trim:
        k = len(pref)
        if len(toks) > k + 4 and toks[:k] == pref:
            trimmed = copy.deepcopy(sentence_words[k:])
            # Capitalize first word cleanly for captions
            first_w = trimmed[0]["word"]
            if first_w and first_w[0].islower():
                trimmed[0]["word"] = first_w[0].upper() + first_w[1:]
            return trimmed

    return sentence_words


def score_opening_sentence(text: str, next_text: str = "") -> float:
    """Scores how strong, self-contained, and curiosity-inducing an opening sentence is."""
    combined = f"{text} {next_text}".strip()
    low = text.strip().lower()
    comb_low = combined.lower()
    score = 50.0

    for pat in WEAK_OPENING_PATTERNS:
        if re.search(pat, low):
            score -= 42.0

    first_eight = " ".join(low.split()[:8])
    for pat in DANGLING_REFERENT_PATTERNS:
        if re.search(pat, first_eight):
            score -= 35.0

    for pat, bonus in HIGH_CURIOSITY_MARKERS:
        if re.search(pat, comb_low):
            score += bonus

    wc = len(text.split())
    if 4 <= wc <= 24:
        score += 12.0
    elif wc > 34:
        score -= 18.0

    if "?" in text and wc <= 14 and not re.search(r"what does it mean", low):
        score += 14.0

    return round(score, 1)


def score_payoff_sentence(text: str) -> float:
    low = text.strip().lower()
    score = 40.0
    if low.endswith((".", "!", "?")):
        score += 15.0
    for pat, bonus in PAYOFF_CLOSURE_MARKERS:
        if re.search(pat, low):
            score += bonus
    return round(score, 1)


def build_tightened_edl(
    segment_ranges: List[Tuple[float, float]],
    all_words: List[Dict],
    max_pause_sec: float = 0.44,
    target_pause_sec: float = 0.19,
    lead_pad: float = 0.08,
    tail_pad: float = 0.24,
) -> Tuple[List[Tuple[float, float]], List[Dict]]:
    """
    Given one or more coarse [start, end] source time ranges and word timestamps:
      1. Collects words inside each range.
      2. Splits across any unnatural dead-air pauses (> max_pause_sec) so silences
         are tightened down to ~target_pause_sec without clipping breaths.
      3. Computes the exact post-cut timeline timestamps for every word!

    Returns:
      edl_cuts: List of (src_start, src_end) intervals to concatenate cleanly.
      remapped_words: List of {"word", "start", "end", "src_start"} on the new 0-based timeline.
    """
    fine_cuts: List[Tuple[float, float]] = []
    grouped_words: List[List[Dict]] = []

    for r_idx, (r_start, r_end) in enumerate(segment_ranges):
        r_words = [
            copy.deepcopy(w)
            for w in all_words
            if w["end"] > r_start + 0.01 and w["start"] < r_end - 0.01
        ]
        if not r_words:
            continue

        # Strip weak discourse filler on the very first sentence of the clip
        if r_idx == 0:
            r_words = strip_leading_conversational_filler(r_words)

        cur_chunk = [r_words[0]]
        for k in range(1, len(r_words)):
            gap = r_words[k]["start"] - r_words[k - 1]["end"]
            if gap > max_pause_sec:
                c_s = max(0.0, cur_chunk[0]["start"] - (lead_pad if not fine_cuts else target_pause_sec * 0.5))
                c_e = cur_chunk[-1]["end"] + target_pause_sec * 0.5
                fine_cuts.append((round(c_s, 3), round(c_e, 3)))
                grouped_words.append(cur_chunk)
                cur_chunk = [r_words[k]]
            else:
                cur_chunk.append(r_words[k])

        if cur_chunk:
            c_s = max(0.0, cur_chunk[0]["start"] - (lead_pad if not fine_cuts else target_pause_sec * 0.5))
            is_final = (r_idx == len(segment_ranges) - 1)
            c_e = cur_chunk[-1]["end"] + (tail_pad if is_final else target_pause_sec * 0.55)
            fine_cuts.append((round(c_s, 3), round(c_e, 3)))
            grouped_words.append(cur_chunk)

    # Remap word timestamps onto the tightened output timeline
    remapped: List[Dict] = []
    timeline_cursor = 0.0
    for (c_s, c_e), chunk in zip(fine_cuts, grouped_words):
        seg_dur = max(0.02, c_e - c_s)
        for w in chunk:
            new_s = timeline_cursor + max(0.0, w["start"] - c_s)
            new_e = timeline_cursor + min(seg_dur, w["end"] - c_s)
            remapped.append({
                "word": w["word"],
                "start": round(new_s, 3),
                "end": round(max(new_e, new_s + 0.04), 3),
                "src_start": round(w["start"], 3),
            })
        timeline_cursor += seg_dur

    if remapped and remapped[0]["word"] and remapped[0]["word"][0].islower():
        w0 = remapped[0]["word"]
        remapped[0]["word"] = w0[0].upper() + w0[1:]

    return fine_cuts, remapped


def find_phrase_time(words: List[Dict], phrase: str) -> Optional[Tuple[int, float]]:
    """Finds the word index and start timestamp of a multi-word phrase."""
    norm_w = [re.sub(r"[^a-z0-9]", "", w["word"].lower()) for w in words]
    toks = [re.sub(r"[^a-z0-9]", "", t.lower()) for t in phrase.split() if t]
    m = len(toks)
    for i in range(len(norm_w) - m + 1):
        if norm_w[i:i + m] == toks:
            return i, float(words[i]["start"])
    return None


def find_phrase_end_time(words: List[Dict], phrase: str, from_idx: int = 0) -> Optional[Tuple[int, float]]:
    norm_w = [re.sub(r"[^a-z0-9]", "", w["word"].lower()) for w in words]
    toks = [re.sub(r"[^a-z0-9]", "", t.lower()) for t in phrase.split() if t]
    m = len(toks)
    for i in range(from_idx, len(norm_w) - m + 1):
        if norm_w[i:i + m] == toks:
            return i + m - 1, float(words[i + m - 1]["end"])
    return None


def build_curated_variations(
    clip_id: str,
    words: List[Dict],
    total_dur: float,
) -> Dict:
    """
    Analyzes the clip transcript, scores candidate openings & endings, and builds
    3 selectable variations (A = Primary Best Hook, B = Alternative Angle, C = Punchy Cut),
    each with a clean 3-7 word 2-line curiosity title and single accent keyword!
    """
    sentences = segment_sentences(words)

    if clip_id == "short1_double_slit":
        # Check if we have the expanded double-slit window ("send one particle at a time")
        m_single = find_phrase_time(words, "you still get that pattern if you send")
        m_slit_end = find_phrase_end_time(words, "gun to the screen")
        m_does_mean = find_phrase_time(words, "does it really mean that the electron")
        m_andromeda_end = find_phrase_end_time(words, "andromeda galaxy and back")
        m_every_point = find_phrase_time(words, "at every point on the screen")
        m_right_ans = find_phrase_end_time(words, "get the right answer")
        m_every_journey = find_phrase_time(words, "every possible route on its journey")
        m_part_does = find_phrase_end_time(words, "the particle does")

        if m_single and m_slit_end and m_does_mean and m_part_does:
            ranges_a = [(m_single[1], m_slit_end[1]), (m_does_mean[1], m_part_does[1])]
        elif m_does_mean and m_andromeda_end and m_every_point and m_right_ans and m_every_journey and m_part_does:
            # Cold-open on the gripping Andromeda question -> Feynman clock-sum explanation
            # (skipping the weak "Well, what does it mean?" filler!) -> "The particle does." payoff!
            ranges_a = [
                (m_does_mean[1], m_andromeda_end[1]),
                (m_every_point[1], m_right_ans[1]),
                (m_every_journey[1], m_part_does[1]),
            ]
        else:
            ranges_a = [(m_does_mean[1] if m_does_mean else 0.0, total_dur)]

        ranges_b = (
            [(m_does_mean[1], m_part_does[1])]
            if (m_does_mean and m_part_does)
            else ranges_a
        )
        ranges_c = (
            [(m_every_point[1], m_right_ans[1]), (m_does_mean[1], m_part_does[1])]
            if (m_every_point and m_right_ans and m_does_mean and m_part_does)
            else ranges_a
        )

        variations = {
            "A": {
                "label": "Andromeda Hook -> Feynman Sum -> Reality Payoff (Recommended)",
                "title_lines": ["ONE ELECTRON", "TAKES EVERY PATH"],
                "accent_words": ["EVERY"],
                "ranges": ranges_a,
            },
            "B": {
                "label": "Tight 28s Andromeda Sprint",
                "title_lines": ["TO ANDROMEDA", "AND BACK"],
                "accent_words": ["ANDROMEDA"],
                "ranges": ranges_b,
            },
            "C": {
                "label": "Quantum Clocks -> Every Route",
                "title_lines": ["HOW QUANTUM", "PATHS CANCEL"],
                "accent_words": ["QUANTUM"],
                "ranges": ranges_c,
            },
        }

    elif clip_id == "short2_planck_black_hole":
        # Trim the 34s "So let's say we want to make an observation..." preamble!
        # Start directly on: "Quantum mechanics tells us that the smaller the wavelength..."
        m_qm = find_phrase_time(words, "quantum mechanics tells us")
        m_wl = find_phrase_time(words, "the wavelength cant be bigger")
        s_a = m_qm[1] if m_qm else 0.0
        s_b = m_wl[1] if m_wl else s_a
        m_what = find_phrase_time(words, "what happens if you try to approach")
        s_c = m_what[1] if m_what else s_a

        variations = {
            "A": {
                "label": "Quantum Wavelength -> Accidental Black Hole (Recommended)",
                "title_lines": ["LOOK TOO CLOSE,", "MAKE A BLACK HOLE"],
                "accent_words": ["BLACK", "HOLE"],
                "ranges": [(s_a, total_dur)],
            },
            "B": {
                "label": "The Smallest Scale in Nature",
                "title_lines": ["REALITY'S SMALLEST", "PIXEL LIMIT"],
                "accent_words": ["PIXEL"],
                "ranges": [(s_b, total_dur)],
            },
            "C": {
                "label": "Instant Paradox Cold-Open",
                "title_lines": ["WHY SPACE HAS", "A RESOLUTION LIMIT"],
                "accent_words": ["RESOLUTION"],
                "ranges": [(s_c, total_dur)],
            },
        }

    elif clip_id == "short3_cosmic_meaning":
        # Trim the 22s "When we contemplate the size and the scale..." preamble
        # AND cut the mid-clip meta-filler "So I've tended in the past to focus arguments..."!
        m_what = find_phrase_time(words, "what are we")
        m_insig_end = find_phrase_end_time(words, "physically insignificant")
        m_notwith = find_phrase_time(words, "notwithstanding our physical insignificance")
        s_a = m_what[1] if m_what else 0.0

        if m_what and m_insig_end and m_notwith:
            ranges_a = [
                (m_what[1], m_insig_end[1]),
                (m_notwith[1], total_dur),
            ]
        else:
            ranges_a = [(s_a, total_dur)]

        variations = {
            "A": {
                "label": "Specks of Dust -> Cosmic Meaning (Recommended)",
                "title_lines": ["SPECKS OF DUST", "THAT THINK"],
                "accent_words": ["THINK"],
                "ranges": ranges_a,
            },
            "B": {
                "label": "Are Humans Insignificant?",
                "title_lines": ["ARE HUMANS", "MEANINGLESS?"],
                "accent_words": ["MEANINGLESS?"],
                "ranges": [(s_a, total_dur)],
            },
            "C": {
                "label": "Alone in 2 Trillion Galaxies",
                "title_lines": ["MEANING IN A", "SILENT GALAXY"],
                "accent_words": ["MEANING"],
                "ranges": [(m_notwith[1] if m_notwith else s_a, total_dur)],
            },
        }
    else:
        # Generic automatic scorer for arbitrary new YouTube videos/clips!
        best_s_idx = 0
        best_score = -999.0
        for idx, s in enumerate(sentences[:max(1, len(sentences) // 2)]):
            nxt = sentences[idx + 1]["text"] if idx + 1 < len(sentences) else ""
            sc = score_opening_sentence(s["text"], nxt)
            if sentences[-1]["end"] - s["start"] >= 45.0 and sc > best_score:
                best_score = sc
                best_s_idx = idx

        s_start = sentences[best_s_idx]["start"] if sentences else 0.0
        variations = {
            "A": {
                "label": "Auto-Selected Highest Hook Score",
                "title_lines": ["THE HIDDEN TRUTH", "OF REALITY"],
                "accent_words": ["TRUTH"],
                "ranges": [(s_start, total_dur)],
            }
        }

    # Attach hook & payoff scores to every variation for reporting and QA!
    for v_key, v_data in variations.items():
        edl, remapped_words = build_tightened_edl(v_data["ranges"], words)
        v_sents = segment_sentences(remapped_words)
        open_txt = v_sents[0]["text"] if v_sents else ""
        next_txt = v_sents[1]["text"] if len(v_sents) > 1 else ""
        end_txt = v_sents[-1]["text"] if v_sents else ""
        v_data["edl"] = edl
        v_data["words"] = remapped_words
        v_data["duration_sec"] = round(sum(e - s for s, e in edl), 2)
        v_data["opening_text"] = open_txt
        v_data["closing_text"] = end_txt
        v_data["hook_score"] = score_opening_sentence(open_txt, next_txt)
        v_data["payoff_score"] = score_payoff_sentence(end_txt)

    return variations


def group_caption_phrases(
    words: List[Dict],
    max_words: int = 4,
    max_chars: int = 23,
) -> List[Dict]:
    """
    Groups remapped words into natural 2-5 word animated subtitle phrases:
      - Breaks cleanly at punctuation (.,?!:;), speech pauses > 0.24s, or max_words/max_chars
      - Avoids awkward 1-word orphans by joining into a 5-word phrase when natural
      - Guarantees strictly monotonic, non-overlapping [start, end] intervals
    """
    if not words:
        return []

    raw_groups: List[List[Dict]] = []
    cur: List[Dict] = []

    for i, w in enumerate(words):
        cur.append(w)
        txt = w["word"]
        has_punct = txt.endswith((".", ",", "?", "!", ":", ";"))
        gap_next = (float(words[i + 1]["start"]) - float(w["end"])) if i + 1 < len(words) else 9.9
        next_chars = sum(len(x["word"]) for x in cur) + (len(words[i + 1]["word"]) if i + 1 < len(words) else 0) + len(cur)

        if has_punct or gap_next > 0.24 or len(cur) >= max_words or next_chars > max_chars:
            raw_groups.append(cur)
            cur = []

    if cur:
        raw_groups.append(cur)

    # Absorb 1-word non-sentence-ending orphans into neighboring <=4-word group when close in time
    merged: List[List[Dict]] = []
    for grp in raw_groups:
        if (
            merged
            and len(grp) == 1
            and len(merged[-1]) <= 4
            and not merged[-1][-1]["word"].endswith((".", "?", "!"))
            and (float(grp[0]["start"]) - float(merged[-1][-1]["end"])) <= 0.22
        ):
            merged[-1].extend(grp)
        else:
            merged.append(grp)

    phrases: List[Dict] = []
    for idx, grp in enumerate(merged):
        p_s = float(grp[0]["start"])
        p_e = float(grp[-1]["end"]) + 0.08
        if idx + 1 < len(merged):
            p_e = min(p_e, float(merged[idx + 1][0]["start"]) - 0.01)
        p_e = max(p_s + 0.06, p_e)
        phrases.append({
            "start": round(p_s, 3),
            "end": round(p_e, 3),
            "text": " ".join(x["word"] for x in grp),
            "words": grp,
        })

    return phrases
