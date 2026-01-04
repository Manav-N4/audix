# pipeline/full_pipeline.py

from nlp.fillers import remove_fillers
from nlp.repetition import remove_repetition


def normalize_whitespace(text: str) -> str:
    """Clean spacing and line breaks."""
    lines = [line.strip() for line in text.splitlines()]
    text = " ".join(lines)
    return " ".join(text.split())


def process(text: str) -> str:
    """
    Main Audix processing pipeline.

    Order matters:
    1. Normalize text
    2. Remove filler words (uh, um, like, etc.)
    3. Remove repetitions
    4. Final cleanup
    """

    if not text or not text.strip():
        return ""

    # Step 1: normalize input
    text = normalize_whitespace(text)

    # Step 2: remove filler words
    try:
        text = remove_fillers(text)
    except Exception:
        pass  # never crash pipeline

    # Step 3: remove repetitions
    try:
        text = remove_repetition(text)
    except Exception:
        pass

    return normalize_whitespace(text)
