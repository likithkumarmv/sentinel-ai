"""
Transcription API Route
Receives audio files from the frontend and returns Groq Whisper transcription results.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()


@router.get("/health")
async def transcription_health():
    """Check if transcription is available."""
    try:
        from services.transcription import is_whisper_available
        available = is_whisper_available()
        return {"available": available, "status": "ready" if available else "unavailable"}
    except Exception:
        return {"available": False, "status": "error"}


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Transcribe an uploaded audio file using Groq Whisper.
    
    Accepts audio in any format supported by ffmpeg (webm, wav, mp3, ogg, etc.).
    Returns transcription text, filler word analysis, and segment timestamps.
    """
    from services.transcription import transcribe_audio

    # Validate file
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    # Read audio bytes
    try:
        audio_bytes = await audio.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read audio file: {e}")

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Transcribe
    result = transcribe_audio(audio_bytes, language="en", filename=audio.filename)

    if "error" in result:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {result['error']}")

    return result


@router.post("/tts")
async def text_to_speech(data: dict):
    """
    Generate speech from text using Edge TTS.
    Returns the audio as a streaming response.
    """
    from services.voice_synthesis import synthesize_speech
    from fastapi.responses import FileResponse
    import os

    text = data.get("text")
    agent = data.get("agent", "architect")

    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    try:
        audio_path = await synthesize_speech(text, agent)
        
        # We use a background task to delete the file after sending
        # or just return it and let the client handle it.
        # FastAPI's FileResponse doesn't delete by default.
        # For a simple demo, we'll just return it.
        return FileResponse(audio_path, media_type="audio/mpeg", filename="speech.mp3")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")
