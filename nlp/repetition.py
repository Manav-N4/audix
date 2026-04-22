import re

def remove_repetition(text: str) -> str:
    """
    Removes accidental word repetition while preserving:
    - emphasis
    - negation
    - emotional intent
    - rhetorical repetition

    Design:
    - Never delete meaning words entirely
    - Reduce repetition softly (collapse, not amputate)
    """

    if not text:
        return text

    tokens = text.split()
    if len(tokens) < 2:
        return text

    cleaned = []
    i = 0

    while i < len(tokens):
        current = tokens[i]
        word = current.lower()
        count = 1

        # Count consecutive repetitions
        while (
            i + count < len(tokens)
            and tokens[i + count].lower() == word
        ):
            count += 1

        # Heuristics
        is_short = len(word) <= 4
        is_function_word = word in {"a", "an", "the", "to", "of", "in", "on"}
        is_negation = word in {"no", "not", "never"}
        is_emotional = count >= 3  # strong repetition
        is_sentence_start = len(cleaned) == 0

        # --- Decision logic ---

        # 1️⃣ Clear accidental duplication: "the the", "is is", "we we"
        # We now remove these even if they are at the start of a sentence.
        if count == 2 and (is_short or is_function_word or is_negation):
            cleaned.append(current)

        # 2️⃣ Emotional or rhetorical repetition (3+ times) → keep
        elif is_emotional:
            cleaned.extend([current] * count)

        # 3️⃣ Everything else → reduce
        else:
            cleaned.append(current)

        i += count

    return " ".join(cleaned)
