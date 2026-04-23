import re

def fix_grammar(text: str) -> str:
    """
    Lightweight Python-native grammar fixer. 
    Does not require Java or heavy models.
    """
    if not text.strip():
        return text

    # 1. Capitalize first letter
    text = text.strip()
    if text:
        text = text[0].upper() + text[1:]

    # 2. Add period if missing
    if text and text[-1] not in ('.', '!', '?'):
        text += "."

    # 3. Clean up extra spaces
    text = re.sub(r'\s+', ' ', text)

    return text
