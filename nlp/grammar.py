import re

def fix_grammar(text: str) -> str:
    # Basic cleanup — safe & fast
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"\s+\.", ".", text)
    text = re.sub(r"\s+\?", "?", text)
    text = re.sub(r"\s+!", "!", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
