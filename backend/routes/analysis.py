from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class BehavioralData(BaseModel):
    session_id: int
    blink_count: int
    duration_seconds: float
    avg_posture_score: float
    fidget_events: int
    eye_contact_frames: int
    total_frames: int

@router.post("/frame")
async def analyze_frame(session_id: int):
    return {"session_id": session_id, "blink_detected": False, "posture_score": 75.0, "face_detected": True}

@router.post("/behavioral-summary")
async def get_behavioral_summary(data: BehavioralData):
    duration_minutes = data.duration_seconds / 60
    blink_rate = data.blink_count / duration_minutes if duration_minutes > 0 else 15
    blink_score = 10.0 if 15 <= blink_rate <= 20 else 7.0 if blink_rate <= 30 else 4.0
    eye_pct = (data.eye_contact_frames / data.total_frames * 100) if data.total_frames > 0 else 50
    fidget_score = max(0, 10 - data.fidget_events * 0.5)
    return {
        "blink_rate": round(blink_rate, 1), 
        "blink_score": round(blink_score, 1), 
        "posture_score": round(data.avg_posture_score, 1), 
        "eye_contact_percentage": round(eye_pct, 1), 
        "fidget_score": round(fidget_score, 1), 
        "overall_behavioral_score": round((blink_score + (eye_pct/10) + fidget_score) / 3, 1)
    }
