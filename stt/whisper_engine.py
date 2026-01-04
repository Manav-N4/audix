from faster_whisper import WhisperModel
import time

model = WhisperModel(
    "base.en",
    device="cpu",
    compute_type="int8"
)

def transcribe_audio(path: str) -> str:
    start = time.time()
    segments, _ = model.transcribe(
        path,
        vad_filter=True,
        beam_size=3
    )
    text = " ".join(seg.text.strip() for seg in segments)

    latency = round((time.time() - start) * 1000)
    print(f"[Whisper] Transcription latency: {latency} ms")

    return text
