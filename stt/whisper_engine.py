from faster_whisper import WhisperModel
import time
import re
import os

# Optimized for Render Free Tier (512MB RAM)
threads = int(os.getenv("WHISPER_THREADS", "2"))
model = WhisperModel(
    "base.en",
    device="cpu",
    compute_type="int8",
    cpu_threads=threads,
    num_workers=1
)

def transcribe_audio(path: str) -> str:
    print(f"Opening audio performance for {path}...")
    start = time.time()
    
    # word_timestamps=True is the key to 'hearing' your pauses
    segments, _ = model.transcribe(
        path,
        vad_filter=True,
        beam_size=5,
        word_timestamps=True,
        initial_prompt="A professional transcript. Use commas and periods based on natural breath pauses."
    )
    
    full_text = []
    for segment in segments:
        segment_text = ""
        for i, word in enumerate(segment.words):
            current_text = word.word.strip()
            
            # Check for pause AFTER this word
            if i < len(segment.words) - 1:
                next_word = segment.words[i+1]
                pause_duration = next_word.start - word.end
                
                # Logic: Short pause = comma, Long pause = period
                if pause_duration > 1.2:
                    current_text += "."
                elif pause_duration > 0.6:
                    current_text += ","
            
            segment_text += current_text + " "
        full_text.append(segment_text.strip())

    text = " ".join(full_text)

    # 5️⃣ Catch joined stutters like "Thethe", "Nono", "Letlet"
    # Truly case-insensitive joined-word removal using a lambda
    def remove_joined_repeat(match):
        full = match.group(0)
        half_len = len(full) // 2
        first = full[:half_len]
        second = full[half_len:]
        if first.lower() == second.lower():
            return first
        return full

    text = re.sub(r"\b[A-Za-z]{4,}\b", remove_joined_repeat, text) 
    
    latency = round((time.time() - start) * 1000)
    print(f"[Whisper] Transcription latency: {latency} ms")

    return text
