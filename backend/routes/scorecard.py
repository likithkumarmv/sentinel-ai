from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models.session import InterviewSession, QuestionRecord
from agents.manager import generate_final_verdict
from services.question_bank import get_answer_key

router = APIRouter()

class GenerateScorecardRequest(BaseModel):
    session_id: int
    avg_blink_rate: Optional[float] = 15.0
    avg_posture_score: Optional[float] = 70.0
    total_fidget_count: Optional[int] = 0
    total_filler_words: Optional[int] = 0
    full_transcript: Optional[str] = ""
    gaze_away_count: Optional[int] = 0
    total_blinks: Optional[int] = 0
    emotion_summary: Optional[dict] = None
    screen_exit_count: Optional[int] = 0

@router.post("/generate")
async def generate_scorecard(request: GenerateScorecardRequest, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    questions = db.query(QuestionRecord).filter(QuestionRecord.session_id == request.session_id).order_by(QuestionRecord.question_number).all()
    answered = [q for q in questions if q.answer_score and q.answer_score > 0]
    avg_technical = sum(q.answer_score for q in answered) / len(answered) if answered else 5.0
    blink_score = 10.0 if 15 <= request.avg_blink_rate <= 20 else max(0, 10 - abs(request.avg_blink_rate - 17.5) * 0.3)
    posture_score = request.avg_posture_score / 10
    fidget_score = max(0, 10 - request.total_fidget_count * 0.5)
    gaze_score = max(0, 10 - request.gaze_away_count * 0.8)
    behavioral_score = (blink_score + posture_score + fidget_score + gaze_score) / 4
    comm_score = max(0, 10 - request.total_filler_words * 0.2)

    # Process emotion summary
    emotion_summary = request.emotion_summary or {}
    session_dominant_emotion = emotion_summary.get("dominant_emotion", "neutral")
    session_emotion_stability = emotion_summary.get("stability_score", 100.0)
    emotion_distribution = emotion_summary.get("emotion_distribution", {})
    emotion_changes = emotion_summary.get("emotion_changes", 0)

    # Save session-level emotion data
    session.dominant_emotion = session_dominant_emotion
    session.emotion_stability = session_emotion_stability

    # Calculate emotion composure score (factors into behavioral)
    # Calm, stable emotions = higher score; erratic, negative emotions = lower
    negative_emotions = sum(emotion_distribution.get(e, 0) for e in ["angry", "fearful", "disgusted", "sad"])
    positive_emotions = emotion_distribution.get("happy", 0) + emotion_distribution.get("neutral", 0)
    emotion_composure = max(0, min(10, 10 - (negative_emotions / 10) + (session_emotion_stability / 20)))

    verdict = generate_final_verdict(
        architect_score=avg_technical, 
        observer_score=behavioral_score, 
        manager_score=comm_score, 
        architect_feedback=f"Avg technical: {avg_technical:.1f}", 
        observer_feedback=f"Blink: {request.avg_blink_rate}, Fidgets: {request.total_fidget_count}, Emotion: {session_dominant_emotion}", 
        manager_feedback=f"Fillers: {request.total_filler_words}", 
        topic=session.topic, 
        difficulty=session.difficulty,
        local_inference=session.local_inference,
        personality_style=session.personality_style
    )
    session.overall_score = verdict.get("overall_score", 5.0)
    session.architect_feedback = verdict.get("architect_closing", "")
    session.observer_feedback = verdict.get("observer_closing", "")
    session.manager_feedback = verdict.get("manager_closing", "")
    session.final_verdict = verdict.get("one_line_verdict", "")
    session.status = "completed"
    session.full_transcript = request.full_transcript
    
    # Save quantitative scores in columns
    session.accuracy_score = avg_technical
    session.communication_score = comm_score
    session.posture_score = request.avg_posture_score
    session.blink_rate_score = request.avg_blink_rate
    
    # Build questions summary with ideal answers and emotion data
    questions_summary = []
    from services.question_bank import C_QUESTIONS, PYTHON_QUESTIONS
    bank = C_QUESTIONS if session.topic == "c_programming" else PYTHON_QUESTIONS
    for q in questions:
        entry = {
            "question": q.question_text, 
            "answer": q.answer_text, 
            "score": q.answer_score,
            "max_angular_velocity": getattr(q, 'max_angular_velocity', 0.0),
            "stress_spikes": getattr(q, 'stress_spikes', 0),
            "dominant_emotion": getattr(q, 'dominant_emotion', 'neutral'),
            "emotion_stability": getattr(q, 'emotion_stability', 100.0),
        }
        # Find ideal answer by matching question text in the bank
        for diff_questions in bank.values():
            for bq in diff_questions:
                if bq["question"] == q.question_text:
                    entry["ideal_answer"] = bq.get("ideal_answer", "")
                    break
            if "ideal_answer" in entry:
                break
        questions_summary.append(entry)
    
    scorecard_payload = {
        "session_id": request.session_id, 
        "scores": {
            "technical": round(avg_technical, 1), 
            "behavioral": round(behavioral_score, 1), 
            "communication": round(comm_score, 1), 
            "overall": round(verdict.get("overall_score", 5.0), 1)
        }, 
        "kinematic_analytics": {
            "avg_blink_rate": round(request.avg_blink_rate, 1),
            "avg_posture_score": round(request.avg_posture_score, 1),
            "gaze_away_count": request.gaze_away_count,
            "total_fidget_count": request.total_fidget_count,
            "total_blinks": request.total_blinks,
            "biomechanical_fatigue": bool(session.biomechanical_fatigue),
            "total_flexion_seconds": round(session.total_flexion_seconds or 0.0, 1),
            "total_stress_spikes": sum(getattr(q, 'stress_spikes', 0) for q in questions),
            "peak_angular_velocity": round(max((getattr(q, 'max_angular_velocity', 0.0) for q in questions), default=0.0), 1),
            "screen_exit_count": request.screen_exit_count
        },
        "emotion_analytics": {
            "session_dominant_emotion": session_dominant_emotion,
            "emotion_stability": round(session_emotion_stability, 1),
            "emotion_composure_score": round(emotion_composure, 1),
            "emotion_distribution": emotion_distribution,
            "emotion_changes": emotion_changes,
            "per_question_emotions": [
                {
                    "question_number": i + 1,
                    "dominant_emotion": getattr(q, 'dominant_emotion', 'neutral'),
                    "stability": getattr(q, 'emotion_stability', 100.0)
                }
                for i, q in enumerate(questions)
            ]
        },
        "verdict": verdict, 
        "questions_summary": questions_summary
    }
    
    import json
    session.scorecard_json = json.dumps(scorecard_payload)
    db.commit()
    
    return scorecard_payload

@router.get("/{session_id}")
async def get_scorecard(session_id: int, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.id, 
        "overall_score": session.overall_score, 
        "architect_feedback": session.architect_feedback, 
        "observer_feedback": session.observer_feedback, 
        "manager_feedback": session.manager_feedback, 
        "final_verdict": session.final_verdict, 
        "status": session.status
    }

@router.get("/public/{session_id}")
async def get_public_scorecard(session_id: int, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.scorecard_json:
        raise HTTPException(status_code=404, detail="Public scorecard not generated or frozen yet")
    import json
    try:
        payload = json.loads(session.scorecard_json)
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load public scorecard: {str(e)}")
