import re

# Words that are almost always fillers
SOFT_FILLERS = [
    r"\bum+\b",
    r"\buh+\b",
    r"\byou know\b",
    r"\bkind of\b",
    r"\bsort of\b",
]

def remove_fillers(text: str) -> str:
    """
    Removes spoken fillers WITHOUT destroying meaning.

    Key rules:
    - Never remove 'like' when used as a verb or preposition
    - Only remove 'like' when it is clearly a discourse filler
    - Prefer weakening structure over deleting meaning
    """

    if not text:
        return text

    # Normalize spacing first
    text = re.sub(r"\s+", " ", text).strip()

    # 1️⃣ Remove obvious fillers (um, uh, you know, etc.)
    for f in SOFT_FILLERS:
        text = re.sub(f, "", text, flags=re.IGNORECASE)

    # 2️⃣ Handle "like" VERY carefully
    # Remove only when surrounded by pauses or hesitation patterns
    # Examples allowed:
    #   "I was, like, thinking"
    #   "It's like, you know, weird"
    text = re.sub(
        r"(?<=,)\s*like\s*(?=,)",
        "",
        text,
        flags=re.IGNORECASE
    )

    # Remove leading filler-like "like,"
    text = re.sub(
        r"^\s*like\s*,\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    # Remove trailing ", like"
    text = re.sub(
        r",\s*like\s*$",
        "",
        text,
        flags=re.IGNORECASE
    )

    # 3️⃣ Clean up spacing and punctuation
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text
