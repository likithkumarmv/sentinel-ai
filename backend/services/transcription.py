"""
Hybrid Transcription Service
Uses Gemini 2.0 Flash for high-fidelity multi-modal transcription,
with Groq (Whisper-large-v3-turbo) as a high-performance fallback.
"""

import os
import re
import tempfile
import logging
from groq import Groq
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

FILLER_WORDS = [
    "um", "uh", "uh huh", "hmm",
    "like", "you know", "basically", "literally",
    "actually", "so", "well", "right", "okay",
    "i mean", "sort of", "kind of"
]

def is_whisper_available() -> bool:
    """Always available via cloud APIs."""
    return True

def count_filler_words(text: str) -> dict:
    """Count occurrences of each filler word in the text."""
    text_lower = text.lower()
    counts = {}
    total = 0
    for filler in FILLER_WORDS:
        pattern = rf'\b{re.escape(filler)}\b'
        matches = re.findall(pattern, text_lower)
        if matches:
            counts[filler] = len(matches)
            total += len(matches)
    return {"total": total, "breakdown": counts}

def transcribe_audio(audio_bytes: bytes, language: str = "en", filename: str = "audio.webm") -> dict:
    """
    Transcribe audio using Gemini 2.0 Flash first, then fallback to Groq Whisper.
    """
    try:
        # 1. Try Gemini 2.0 Flash (High Fidelity)
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                client = genai.Client(api_key=gemini_key)
                
                # Determine mime type
                mime_type = "audio/webm"
                if filename.endswith(".wav"): mime_type = "audio/wav"
                elif filename.endswith(".mp3"): mime_type = "audio/mp3"
                elif filename.endswith(".ogg"): mime_type = "audio/ogg"
                
                response = client.models.generate_content(
                    model="gemini-2.0-flash-exp",
                    contents=[
                        "Transcribe this audio exactly as spoken. Return ONLY the transcription text.",
                        types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
                    ]
                )
                
                if response.text:
                    full_text = response.text.strip()
                    filler_analysis = count_filler_words(full_text)
                    word_count = len(full_text.split())
                    
                    # Gemini doesn't return duration/segments easily in simple generate_content
                    # We'll return a simplified structure or use Groq if detailed segments are needed
                    logger.info("Transcribed using Gemini 2.0 Flash")
                    return {
                        "text": full_text,
                        "language": language,
                        "language_probability": 1.0,
                        "duration": 0.0, # Will be calculated by frontend or estimate
                        "filler_word_count": filler_analysis["total"],
                        "filler_details": filler_analysis["breakdown"],
                        "word_count": word_count,
                        "words_per_minute": 0,
                        "segments": [], # Simplified for now
                        "provider": "gemini"
                    }
            except Exception as e:
                logger.warning(f"Gemini transcription failed: {e}. Falling back to Groq.")

        # 2. Fallback to Groq Whisper (Fast)
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return {"error": "No API keys (Gemini/Groq) set in environment."}
            
        client = Groq(api_key=api_key)
        res = client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model="whisper-large-v3-turbo",
            response_format="verbose_json",
            language=language
        )

        full_text = getattr(res, "text", "")
        duration = getattr(res, "duration", 0.0)
        filler_analysis = count_filler_words(full_text)
        word_count = len(full_text.split()) if full_text else 0
        segments_list = getattr(res, "segments", [])
        
        parsed_segments = []
        for seg in segments_list:
            start = seg.get("start", 0) if isinstance(seg, dict) else getattr(seg, "start", 0)
            end = seg.get("end", 0) if isinstance(seg, dict) else getattr(seg, "end", 0)
            text = seg.get("text", "").strip() if isinstance(seg, dict) else getattr(seg, "text", "").strip()
            parsed_segments.append({"start": round(start, 2), "end": round(end, 2), "text": text})

        logger.info(f"Transcribed using Groq Whisper: {duration:.1f}s")
        return {
            "text": full_text,
            "language": language,
            "language_probability": 1.0,
            "duration": round(duration, 2),
            "filler_word_count": filler_analysis["total"],
            "filler_details": filler_analysis["breakdown"],
            "word_count": word_count,
            "words_per_minute": round((word_count / duration) * 60, 1) if duration > 0 else 0,
            "segments": parsed_segments,
            "provider": "groq"
        }

    except Exception as e:
        logger.error(f"All transcription attempts failed: {e}")
        return {"error": str(e), "text": ""}
