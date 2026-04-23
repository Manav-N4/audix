from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File
from pipeline.full_pipeline import process
from stt.whisper_engine import transcribe_audio
import tempfile
import uvicorn
import os

app = FastAPI(title="Audix Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "ok"}

@app.post("/process")
async def process_text(data: dict):
    print(f"Received text for processing: {data.get('text', '')[:50]}...")
    try:
        text = data.get("text", "")
        deep = data.get("deep", False)
        if not text:
            return {"output": ""}
            
        result = process(text, deep=deep)
        print("Text processing complete.")
        return {"output": result}
    except Exception as e:
        print(f"!!! Error in process endpoint: {str(e)}")
        from fastapi.responses import JSONResponse
        return JSONResponse(content={"error": str(e)}, status_code=500)
@app.on_event("startup")
async def startup_event():
    print("[Audix] Waking up Deep AI models...")
    try:
        from nlp.deep_ai import get_pipeline
        get_pipeline()
        print("[Audix] Systems ready.")
    except Exception as e:
        print(f"[Audix] WARNING: Deep AI could not be pre-loaded: {e}")
        print("[Audix] System will fall back to fast heuristic mode.")

@app.post("/dictate")
async def dictate(audio: UploadFile = File(...)):
    print(f"Received audio upload: {audio.filename}")
    suffix = os.path.splitext(audio.filename)[-1] or ".webm"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            print(f"Audio content size: {len(content)} bytes")

            if len(content) < 1000:
                print("Audio too short, skipping.")
                return {"raw": "", "final": ""}

            tmp.write(content)
            tmp_path = tmp.name

        print(f"Starting transcription for {tmp_path}...")
        raw_text = transcribe_audio(tmp_path)
        print(f"Transcription complete: {raw_text[:50]}...")

        if not raw_text.strip():
            return {"raw": "", "final": ""}

        print("Starting pipeline processing...")
        final_text = process(raw_text, deep=False) # Restore reliable heuristic mode
        print("Pipeline processing complete.")
        
        return {
            "raw": raw_text,
            "final": final_text
        }

    except Exception as e:
        print(f"!!! Error in dictate endpoint: {str(e)}")
        from fastapi.responses import JSONResponse
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)