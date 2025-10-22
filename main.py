# main.py
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import whisper
from pydub import AudioSegment

# --------------------------- FastAPI Setup ---------------------------
app = FastAPI(
    title="Silent-Sphere NIRVAN API",
    description="Deep learning based Audio Language Model (ALM)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------- Root & Health ---------------------------
@app.get("/")
def read_root():
    return {"message": "Silent-Sphere NIRVAN server is running!"}

@app.get("/health")
def health_check():
    return {"status": "OK", "detail": "Server is healthy."}

# --------------------------- Load Whisper Model ---------------------------
@app.on_event("startup")
def load_models():
    global whisper_model
    whisper_model = whisper.load_model("base")
    print("✅ Whisper model loaded successfully.")

# --------------------------- Audio Transcription ---------------------------
@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if whisper_model is None:
        return JSONResponse(content={"error": "Whisper model not loaded."}, status_code=500)

    # Save uploaded file temporarily
    temp_input = f"temp_input_{file.filename}"
    with open(temp_input, "wb") as f:
        f.write(await file.read())

    # Convert to WAV if needed
    temp_wav = f"{temp_input}.wav"
    try:
        audio = AudioSegment.from_file(temp_input)
        audio.export(temp_wav, format="wav")
    except Exception as e:
        os.remove(temp_input)
        return JSONResponse(content={"error": f"Could not process audio: {e}"}, status_code=400)

    # Transcribe using Whisper
    try:
        result = whisper_model.transcribe(temp_wav)
        text = result.get("text", "")
    except Exception as e:
        text = f"Error transcribing audio: {e}"

    # Cleanup temp files
    os.remove(temp_input)
    os.remove(temp_wav)

    return {"filename": file.filename, "transcription": text}
