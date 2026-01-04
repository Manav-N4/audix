

from difflib import SequenceMatcher

def collapse_redundant_clauses(sentences, similarity_threshold=0.75):
    """
    Removes consecutive clauses that express the same idea.
    Keeps the later, more complete clause.
    """
    cleaned = []

    for s in sentences:
        if not cleaned:
            cleaned.append(s)
            continue

        prev = cleaned[-1]

        similarity = SequenceMatcher(None, prev.lower(), s.lower()).ratio()

        if similarity < similarity_threshold:
            cleaned.append(s)
        else:
            # replace previous with the newer (more refined) clause
            cleaned[-1] = s

    return cleaned
