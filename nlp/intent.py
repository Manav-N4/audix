import re

DECISION_VERBS = [
    "should", "must", "need to",
    "have to", "recommend", "decide",
    "plan to", "will"
]

OBSERVATION_VERBS = [
    "seems", "looks", "appears",
    "feels", "might", "could"
]

QUESTION_PATTERN = r"\?$"

def classify_intent(sentence: str) -> str:
    s = sentence.lower()

    if re.search(QUESTION_PATTERN, s):
        return "question"

    if any(v in s for v in DECISION_VERBS):
        return "decision"

    if any(v in s for v in OBSERVATION_VERBS):
        return "observation"

    return "statement"
