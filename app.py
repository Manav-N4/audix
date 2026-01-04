from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File
from pipeline.full_pipeline import process
from stt.whisper_engine import transcribe_audio
import tempfile
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ✅ allow ALL pages (required for extension)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/process")
def process_text(data: dict):
    return {
        "output": process(data["text"])
    }
@app.post("/dictate")
async def dictate(audio: UploadFile = File(...)):
    suffix = os.path.splitext(audio.filename)[-1] or ".webm"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()

        if len(content) < 1000:
            return {"raw": "", "final": ""}

        tmp.write(content)
        tmp_path = tmp.name

    try:
        raw_text = transcribe_audio(tmp_path)

        if not raw_text.strip():
            return {"raw": "", "final": ""}

        final_text = process(raw_text)
        return {
            "raw": raw_text,
            "final": final_text
        }

    finally:
        os.remove(tmp_path)