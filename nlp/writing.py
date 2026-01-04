import re

DISCOURSE_OPENERS = [
    r"^so[, ]+",
    r"^and[, ]+",
    r"^yeah[, ]+",
]

THINKING_PHRASES = [
    r"^i was[, ]+i was[, ]+",
    r"^i was talking to",
    r"^i was thinking( that)?",
]

REPAIR_PHRASES = [
    r"^wait[, ]+no[, ]+",
]

def normalize_writing(sentence: str) -> str:
    s = sentence.strip()

    # Remove spoken repair scaffolding (audio-robust)
    s = re.sub(
        r"\b(wait|no),?\s+(that'?s)?\s*(not)?\s*(fully|right)?\b",
        "",
        s,
        flags=re.I
    )

    # Remove spoken lead-ins like "okay so"
    s = re.sub(
        r"^(okay|so)[, ]+",
        "",
        s,
        flags=re.I
    )


    # 1. Remove discourse openers
    for p in DISCOURSE_OPENERS:
        s = re.sub(p, "", s, flags=re.I)

    # 2. Collapse thinking repetition
    s = re.sub(r"\b(i was),?\s+\1\b", r"\1", s, flags=re.I)

    # 3. Normalize weak perception phrasing
    s = re.sub(
        r"\bit feels (that )?",
        "it appears that ",
        s,
        flags=re.I
    )

    # 4. Normalize causal hedging (with or without 'and')
    s = re.sub(
        r"(?:,\s*)?(?:and\s+)?which may explain why",
        ", which may explain why",
        s,
        flags=re.I
    )

    s = re.sub(
        r"(?:,\s*)?(?:and\s+)?maybe that’s why",
        ", which may explain why",
        s,
        flags=re.I
    )

    # 5. Repair → contrast
    for p in REPAIR_PHRASES:
        if re.match(p, s, flags=re.I):
            s = re.sub(p, "", s, flags=re.I)
            s = "However, " + s

    # 6. FINAL punctuation cleanup (ABSOLUTELY LAST)
    s = re.sub(r",+", ",", s)
    s = re.sub(r"\s+,", ",", s)
    s = re.sub(r",\s+(lower|higher|worse|better)", r" \1", s, flags=re.I)
    s = re.sub(r"\band,\s+it\b", "and it", s, flags=re.I)
    # Fix 'are, lower' / 'is, bad' style artifacts
    s = re.sub(r"\b(is|are|was|were),\s+", r"\1 ", s, flags=re.I)

    s = re.sub(
        r"(screen|page|flow)\s+(the traffic|traffic levels|traffic is)",
        r"\1. \2",
        s,
        flags=re.I
    )

    return s.strip()



