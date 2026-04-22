import re
import time

from nlp.fillers import remove_fillers
from nlp.repetition import remove_repetition
from nlp.grammar import fix_grammar
from nlp.formatting import format_text
from nlp.intent import classify_intent
from nlp.hedging import handle_hedges
from nlp.prosody import normalize_prosody
from nlp.clauses import collapse_redundant_clauses
from nlp.writing import normalize_writing
from nlp.corrections import resolve_corrections, clean_disfluencies
from nlp.deep_ai import deep_clean


def split_sentences(text: str):
    """Lightweight sentence split that works well for speech."""
    return [s.strip() for s in re.split(r"[.!?]", text) if s.strip()]


def process(text: str, deep: bool = False) -> str:
    """
    Audix speech-first processing pipeline.

    Design principles:
    - Early stages clean speech artifacts
    - Middle stages are intent-aware
    - Writing normalization happens late
    - Grammar correction is last
    """

    if not text or not text.strip():
        return ""

    print("[Pipeline] Stage 1: Prosody normalization...")
    text = normalize_prosody(text)

    print("[Pipeline] Stage 2: Filler removal...")
    text = remove_fillers(text)

    print("[Pipeline] Stage 2.5: Self-correction resolving...")
    text = resolve_corrections(text)
    text = clean_disfluencies(text)

    print("[Pipeline] Stage 3: Repetition removal...")
    text = remove_repetition(text)

    print("[Pipeline] Stage 4: Intent classification...")
    sentences = split_sentences(text)
    cleaned = []
    for s in sentences:
        intent = classify_intent(s)
        s = handle_hedges(s, intent)
        cleaned.append(s)

    print("[Pipeline] Stage 5: Clause collapsing...")
    cleaned = collapse_redundant_clauses(cleaned)

    print("[Pipeline] Stage 7: Writing normalization...")
    text = ". ".join(cleaned)
    text = normalize_writing(text)

    print("[Pipeline] Stage 8: Grammar correction (with speed budget)...")
    loop_start = time.time()
    final_cleaned = []
    for s in cleaned:
        # If we've spent more than 3 seconds on grammar, skip the rest to stay fast
        if time.time() - loop_start > 3.0:
            print("[Pipeline] Grammar budget exceeded, skipping remaining sentences.")
            final_cleaned.append(s)
            continue
        final_cleaned.append(fix_grammar(s))
    text = ". ".join(final_cleaned)

    print("[Pipeline] Stage 9: Final formatting...")
    text = format_text(text)

    if deep:
        print("[Pipeline] Stage 10: Deep AI Polish (Transformer active)...")
        text = deep_clean(text)

    print("[Pipeline] All stages complete.")
    return text
