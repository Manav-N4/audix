from transformers import pipeline
import torch

# SmolLM2 is a state-of-the-art small model that works perfectly with the 'text-generation' task
MODEL_NAME = "HuggingFaceTB/SmolLM2-135M-Instruct"

_pipe = None

def get_pipeline():
    global _pipe
    if _pipe is None:
        print(f"[DeepAI] Loading model {MODEL_NAME}...")
        _pipe = pipeline(
            "text-generation",
            model=MODEL_NAME,
            device="cpu", # Force CPU for cheap cloud hosting
            max_new_tokens=100
        )
    return _pipe

def deep_clean(text: str) -> str:
    """
    Uses SmolLM2 to fix grammar and improve phrasing.
    """
    if not text or len(text.split()) < 3:
        return text

    pipe = get_pipeline()
    
    # FEW-SHOT PATTERN: This forces the model to follow the pattern instead of 'chatting'
    # We provide examples so it understands the 'Input -> Output' transformation
    prompt = (
        "Clean the following speech:\n"
        "Input: Let's go to- I mean, at 5.\nOutput: Let's go at 5.\n"
        "Input: We have uh, many items. Actually, we have ten.\nOutput: We have ten items.\n"
        f"Input: {text}\nOutput:"
    )
    
    try:
        # do_sample=False makes it deterministic (no 'creative' reasoning)
        res = pipe(prompt, num_return_sequences=1, truncation=True, max_new_tokens=50, do_sample=False)
        cleaned_text = res[0]['generated_text']
        
        # Extract only the result after the last 'Output:'
        if "Output:" in cleaned_text:
            cleaned_text = cleaned_text.split("Output:")[-1].strip()
            
        # Strip any extra meta-chatter that might leak through (like 'Here is' etc.)
        if "\n" in cleaned_text:
            cleaned_text = cleaned_text.split("\n")[0].strip()

        return cleaned_text if len(cleaned_text) > 5 else text
            
    except Exception as e:
        print(f"[DeepAI] Error: {e}")
        return text
