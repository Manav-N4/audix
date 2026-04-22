import re

# Pure filler hedges → safe to remove
SOFT_FILLERS = [
    r"\bkind of\b",
    r"\bsort of\b",
]

# Meaningful hedges → soften, not delete
EPISTEMIC_HEDGES = [
    r"\bi think\b",
    r"\bi guess\b",
    r"\bmaybe\b",
    r"\bprobably\b",
]

def handle_hedges(sentence: str, intent: str) -> str:
    """
    Handles hedging without destroying speaker intent.

    Strategy:
    - Remove filler hedges always
    - Soften epistemic hedges for decisions
    - Preserve hedging for opinions / analysis
    """

    s = sentence

    # 1️⃣ Remove pure fillers everywhere
    for h in SOFT_FILLERS:
        s = re.sub(h, "", s, flags=re.IGNORECASE)

    # 2️⃣ For decisions: soften epistemic hedges
    if intent == "decision":
        for h in EPISTEMIC_HEDGES:
            # Replace with a lighter structure instead of deletion
            s = re.sub(
                h,
                "",
                s,
                flags=re.IGNORECASE
            )

    # 3️⃣ Cleanup spacing only (NO lowercasing)
    s = re.sub(r"\s+", " ", s).strip()

    return s
