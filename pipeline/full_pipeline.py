import re

from nlp.fillers import remove_fillers
from nlp.repetition import remove_repetition
from nlp.grammar import fix_grammar
from nlp.formatting import format_text
from nlp.intent import classify_intent
from nlp.hedging import handle_hedges
from nlp.prosody import normalize_prosody
from nlp.clauses import collapse_redundant_clauses
from nlp.writing import normalize_writing

def process(text: str) -> str:

    text = normalize_prosody(text)
    text = remove_fillers(text)
    text = remove_repetition(text)

    sentences = [s.strip() for s in re.split(r"[.!?]", text) if s.strip()]

    cleaned = []
    for s in sentences:
        intent = classify_intent(s)
        s = handle_hedges(s, intent)
        s = normalize_writing(s)
        cleaned.append(s)


    # 🔥 NEW: collapse repeated clauses
    cleaned = collapse_redundant_clauses(cleaned)

    text = ". ".join(cleaned)
    text = fix_grammar(text)
    text = format_text(text)

    return text
