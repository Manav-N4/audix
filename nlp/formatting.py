import re

def format_text(text: str) -> str:
    sentences = [s.strip() for s in text.split(".") if s.strip()]
    formatted = []

    for s in sentences:
        s = s[0].upper() + s[1:]
        s = s.replace(" i ", " I ")
        s = s.replace(" qa ", " QA ")

        if not s.endswith("."):
            s += "."

        formatted.append(s)

    text = "\n\n".join(formatted)

    # 3. Handle joined stutters (Thethe, Nono, Letlet)
    def remove_joined_repeat(match):
        full = match.group(0)
        half_len = len(full) // 2
        first = full[:half_len]
        second = full[half_len:]
        if first.lower() == second.lower():
            return first
        return full

    text = re.sub(r"\b[A-Za-z]{4,}\b", remove_joined_repeat, text)

    # 4. Handle redundant punctuation (,,, or ., or ..)
    # Be extremely aggressive with whitespaced commas
    text = re.sub(r"[\s,]+,", ",", text)
    text = re.sub(r",[\s,]+", ",", text)
    text = re.sub(r"\.\s*,", ".", text)
    text = re.sub(r",\s*\.", ".", text)
    text = re.sub(r"\.{2,}", ".", text)
    
    # 5. Final capitalization check
    return text.strip()
