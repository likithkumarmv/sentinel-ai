from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.voice_eval import evaluate_voice_answer

router = APIRouter()

class VoiceEvalRequest(BaseModel):
    question: str
    transcript: str

@router.post("/")
async def evaluate_answer(req: VoiceEvalRequest):
    if not req.transcript or not req.question:
        raise HTTPException(status_code=400, detail="Missing question or transcript")
    
    result = evaluate_voice_answer(req.question, req.transcript)
    return result
