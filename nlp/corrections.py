import re

CORRECTION_MARKERS = [
    r"no wait",
    r"no sorry",
    r"actually",
    r"i mean",
    r"let me rephrase",
    r"let me start over",
    r"wait",
    r"sorry",
    r"correction"
]

def resolve_corrections(text: str) -> str:
    """
    Experimental disfluency resolver for speech.
    Tries to handle patterns like 'I want five- no sorry, six items'.
    """
    if not text:
        return text

    # Join the markers into a single regex pattern
    marker_pattern = "|".join(CORRECTION_MARKERS)
    
    # 1. Handle "let me start over" / "let me rephrase" (discard preceding text)
    hard_reset_patterns = [r".*let me start over,?\s*", r".*let me rephrase,?\s*"]
    for pattern in hard_reset_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            text = text[match.end():]

    # 2. Handle inline corrections (no wait, actually, i mean)
    for marker in CORRECTION_MARKERS:
        # Pattern to find a marker and the text around it
        # We look for a marker preceded by a few words and followed by a new thought
        pattern = rf"(.*?)(?:,\s*|\s+)({marker})(?:,\s*|\s+)(.*)"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            pre = match.group(1).strip()
            # marker = match.group(2)
            post = match.group(3).strip()

            # SURGICAL FIX: Only discard the last fragment, never the whole block.
            # We look for the last punctuation point (., ?, !, etc.) or comma
            boundary = max(pre.rfind("."), pre.rfind(","), pre.rfind("?"), pre.rfind("!"))
            
            if boundary != -1:
                preserved = pre[:boundary+1]
                text = preserved + " " + post
            else:
                # If no punctuation at all, it was likely a short fragment anyway
                text = post
    
    return text.strip()

def clean_disfluencies(text: str) -> str:
    """
    Removes stammers and filler debris that might remain.
    Example: 'I- I- I am' -> 'I am'
    """
    # Remove letter stammers: 'T- t- text'
    text = re.sub(r"\b(\w)-\s*\1", r"\1", text, flags=re.IGNORECASE)
    
    # Remove repeated short words with debris: 'I I' already handled by repetition.py
    # but 'and and' or 'the the'
    text = re.sub(r"\b(\w+)\s+\1\b", r"\1", text, flags=re.IGNORECASE)
    
    return text
