import re

def normalize_token(token: str) -> str:
    # lowercase + strip punctuation for comparison
    return re.sub(r"[^\w']", "", token.lower())


def remove_repetition(text: str) -> str:
    tokens = text.split()
    if len(tokens) < 2:
        return text

    cleaned = []
    prev_norm = None

    for token in tokens:
        norm = normalize_token(token)

        # skip if same token repeated (we, we | it's not, it's not)
        if norm and norm == prev_norm:
            continue

        cleaned.append(token)
        prev_norm = norm

    # SECOND PASS: collapse repeated short phrases (2–4 tokens)
    result = []
    i = 0
    while i < len(cleaned):
        # try phrase lengths from 4 down to 2
        collapsed = False
        for size in range(4, 1, -1):
            if i + size * 2 <= len(cleaned):
                a = cleaned[i:i+size]
                b = cleaned[i+size:i+size*2]

                a_norm = [normalize_token(t) for t in a]
                b_norm = [normalize_token(t) for t in b]

                if a_norm == b_norm:
                    result.extend(a)
                    i += size * 2
                    collapsed = True
                    break

        if not collapsed:
            result.append(cleaned[i])
            i += 1

    return " ".join(result)
