HEDGES = [
    "i think", "i guess", "maybe",
    "probably", "kind of", "sort of"
]

def handle_hedges(sentence: str, intent: str) -> str:
    s = sentence.lower()

    # Remove hedges ONLY for decisions
    if intent == "decision":
        for h in HEDGES:
            s = s.replace(h, "")

    return " ".join(s.split()).capitalize()
