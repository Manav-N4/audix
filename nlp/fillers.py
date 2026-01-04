import re

def remove_fillers(text: str) -> str:
    # Remove filler "like" only when surrounded by pauses or commas
    text = re.sub(
        r"(,|\b)\s*like\s*(,|\b)",
        " ",
        text,
        flags=re.IGNORECASE
    )

    # Remove other fillers
    fillers = [
        r"\bum+\b",
        r"\buh+\b",
        r"\byou know\b",
        r"\bkind of\b",
        r"\bsort of\b",
    ]

    for f in fillers:
        text = re.sub(f, "", text, flags=re.IGNORECASE)

    return re.sub(r"\s+", " ", text).strip()
