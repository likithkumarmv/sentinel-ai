"""
Voice Synthesis Service — Edge TTS (Free, No API Key)

Uses Microsoft's Neural voices via the edge-tts library.
Each agent gets a distinct, realistic voice:
  - Architect: Deep, authoritative male (Christopher)
  - Observer:  Calm, analytical female (Emma)
  - Manager:   Sharp, professional male (Eric)
  - Mentor:    Warm, coaching male (Guy)
"""

import edge_tts
import os
import tempfile
import logging

logger = logging.getLogger(__name__)

# ── Voice Map ─────────────────────────────────────────────
# Full list: run `edge-tts --list-voices`
# These are high-quality Microsoft Neural voices — completely free.
VOICE_MAP = {
    "architect": "en-US-ChristopherNeural",  # Deep, authoritative male
    "observer":  "en-US-EmmaNeural",          # Calm, analytical female
    "manager":   "en-US-EricNeural",           # Sharp, professional male
    "mentor":    "en-US-GuyNeural",            # Warm, coaching male
}

# Optional pitch/rate adjustments per agent for extra personality
VOICE_STYLE = {
    "architect": {"rate": "-5%",  "pitch": "-3Hz"},   # Slightly slower, deeper
    "observer":  {"rate": "-10%", "pitch": "+0Hz"},    # Measured, deliberate
    "manager":   {"rate": "+0%",  "pitch": "+0Hz"},    # Default crisp delivery
    "mentor":    {"rate": "-8%",  "pitch": "-2Hz"},    # Warm, unhurried
}


async def synthesize_speech(text: str, agent: str = "architect") -> str:
    """
    Synthesize text to speech using Edge TTS.
    Returns the path to the temporary MP3 audio file.
    
    This is 100% free — uses the same neural TTS engine as Microsoft Edge.
    Voices are realistic, human-like, and require no API key.
    """
    voice = VOICE_MAP.get(agent, VOICE_MAP["architect"])
    style = VOICE_STYLE.get(agent, {})

    # Create temporary file
    fd, path = tempfile.mkstemp(suffix=".mp3")
    os.close(fd)

    try:
        communicate = edge_tts.Communicate(
            text, 
            voice,
            rate=style.get("rate", "+0%"),
            pitch=style.get("pitch", "+0Hz"),
        )
        await communicate.save(path)
        
        # Verify file was actually created and has content
        file_size = os.path.getsize(path)
        if file_size < 100:
            raise Exception(f"Generated audio too small ({file_size} bytes)")
        
        logger.info(f"[TTS] Synthesized {len(text)} chars with {voice} → {file_size/1024:.1f}KB")
        return path
    except Exception as e:
        logger.error(f"Edge TTS failed for agent '{agent}': {e}")
        if os.path.exists(path):
            os.unlink(path)
        raise e


async def list_available_voices(language: str = "en") -> list:
    """List all available Edge TTS voices for a language."""
    voices = await edge_tts.list_voices()
    return [v for v in voices if v["Locale"].startswith(language)]
