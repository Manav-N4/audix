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

    return "\n\n".join(formatted)
