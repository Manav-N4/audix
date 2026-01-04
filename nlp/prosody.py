

import re

def normalize_prosody(text: str) -> str:
    
    # Normalize ellipses and pause markers to sentence breaks
    text = re.sub(r"[.…]{2,}", ".", text)

    # Remove isolated punctuation artifacts
    text = re.sub(r"\s*[?]\s*", "?", text)

    # Fix repeated commas
    text = re.sub(r",\s*,+", ",", text)
    # Remove repeated commas globally
    text = re.sub(r",+", ",", text)


    # Fix comma before punctuation
    text = re.sub(r",\s*([.!?])", r"\1", text)

    # Remove duplicated punctuation
    text = re.sub(r"([.!?]){2,}", r"\1", text)

    # Normalize repeated words with punctuation in between
    text = re.sub(r"\b(\w+)[,.\s]+\1\b", r"\1", text, flags=re.I)

    # Clean extra spaces
    text = re.sub(r"\s{2,}", " ", text)

    return text.strip()
