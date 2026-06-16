from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import random
from database import get_db
from models.session import InterviewSession, QuestionRecord
from services.question_bank import get_questions, get_answer_key, find_question_by_text
from agents.architect import evaluate_answer, generate_opening
from agents.observer import get_mid_interview_comment
from agents.manager import evaluate_communication
from services.physics import calculate_kinematic_stress

router = APIRouter()

class StartInterviewRequest(BaseModel):
    user_name: Optional[str] = "Anonymous"
    topic: str
    difficulty: str
    question_count: Optional[int] = 5
    adaptive_mode: Optional[bool] = False
    local_inference: Optional[bool] = False
    personality_style: Optional[str] = "Standard Brutal"

class SubmitAnswerRequest(BaseModel):
    session_id: int
    question_id: str
    question_text: str
    answer_text: str
    blink_rate: Optional[float] = 15.0
    posture_score: Optional[float] = 70.0
    fidget_count: Optional[int] = 0
    filler_word_count: Optional[int] = 0
    answer_duration_seconds: Optional[float] = 30.0
    gaze_away_count: Optional[int] = 0
    kinematic_frames: Optional[list] = []
    emotion_data: Optional[dict] = None

@router.post("/start")
async def start_interview(request: StartInterviewRequest, db: Session = Depends(get_db)):
    valid_topics = ["c_programming", "python"]
    valid_difficulties = ["intern", "junior", "mid", "senior", "lead"]
    if request.topic not in valid_topics:
        raise HTTPException(status_code=400, detail=f"Invalid topic. Choose from: {valid_topics}")
    if request.difficulty not in valid_difficulties:
        raise HTTPException(status_code=400, detail=f"Invalid difficulty. Choose from: {valid_difficulties}")
    
    diff_val = f"adaptive_{request.difficulty}" if request.adaptive_mode else request.difficulty
    session = InterviewSession(
        user_name=request.user_name, 
        topic=request.topic, 
        difficulty=diff_val, 
        status="in_progress", 
        started_at=datetime.now(),
        local_inference=request.local_inference,
        personality_style=request.personality_style
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    questions = get_questions(request.topic, request.difficulty, count=request.question_count or 5)
    
    # Create QuestionRecords for ALL questions upfront (not just the first)
    for i, q in enumerate(questions):
        question_record = QuestionRecord(
            session_id=session.id, 
            question_number=i + 1, 
            question_text=q["question"], 
            asked_by="architect"
        )
        db.add(question_record)
    db.commit()
    
    first_question = questions[0]
    opening = generate_opening(request.topic, request.difficulty, local_inference=session.local_inference, personality_style=session.personality_style)
    return {
        "success": True, 
        "session_id": session.id, 
        "user_name": session.user_name, 
        "topic": session.topic, 
        "difficulty": session.difficulty, 
        "opening_statement": opening, 
        "first_question": {
            "id": first_question["id"], 
            "text": first_question["question"], 
            "asked_by": "architect", 
            "question_number": 1
        }, 
        "total_questions": len(questions), 
        "all_questions": questions  # includes ideal_answer for frontend display
    }

@router.post("/answer")
async def submit_answer(request: SubmitAnswerRequest, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Look up the answer key for this question
    answer_key = get_answer_key(request.question_id, session.topic, session.difficulty)
    ideal_answer = answer_key["ideal_answer"] if answer_key else None
    expected_keywords = answer_key["expected_keywords"] if answer_key else None
    
    # Evaluate with answer key context
    architect_result = evaluate_answer(
        question=request.question_text, 
        user_answer=request.answer_text, 
        topic=session.topic, 
        difficulty=session.difficulty,
        ideal_answer=ideal_answer,
        expected_keywords=expected_keywords,
        local_inference=session.local_inference,
        personality_style=session.personality_style
    )
    manager_result = evaluate_communication(
        answer_text=request.answer_text, 
        filler_word_count=request.filler_word_count, 
        speech_duration_seconds=request.answer_duration_seconds,
        local_inference=session.local_inference,
        personality_style=session.personality_style
    )
    
    # Find existing record or create one if missing
    question_record = db.query(QuestionRecord).filter(
        QuestionRecord.session_id == request.session_id, 
        QuestionRecord.question_text == request.question_text
    ).first()
    
    if not question_record:
        # Fallback: create the record if it wasn't pre-created
        existing_count = db.query(QuestionRecord).filter(
            QuestionRecord.session_id == request.session_id
        ).count()
        question_record = QuestionRecord(
            session_id=request.session_id,
            question_number=existing_count + 1,
            question_text=request.question_text,
            asked_by="architect"
        )
        db.add(question_record)
    
    question_record.answer_text = request.answer_text
    question_record.answer_score = architect_result.get("score", 5.0)
    question_record.ai_comment = architect_result.get("reaction", "")
    
    # Process Kinematics
    kinematic_results = calculate_kinematic_stress(request.kinematic_frames)
    question_record.max_angular_velocity = kinematic_results["max_angular_velocity"]
    question_record.stress_spikes = kinematic_results["stress_spikes"]

    # Process Emotion Data
    emotion_data = request.emotion_data or {}
    question_record.dominant_emotion = emotion_data.get("dominant_emotion", "neutral")
    question_record.emotion_stability = emotion_data.get("stability_score", 100.0)
    emotion_dist = emotion_data.get("emotion_distribution", {})
    question_record.emotion_distribution = str(emotion_dist) if emotion_dist else ""
    
    session.posture_score = request.posture_score
    session.blink_rate_score = request.blink_rate
    session.total_flexion_seconds = (session.total_flexion_seconds or 0.0) + kinematic_results["flexion_seconds"]
    if session.total_flexion_seconds > 180.0:
        session.biomechanical_fatigue = 1
        
    # ── Adaptive Difficulty Logic ──
    if session.difficulty.startswith("adaptive_"):
        curr_diff = session.difficulty.replace("adaptive_", "")
        score = architect_result.get("score", 5.0)
        
        DIFFICULTIES = ["intern", "junior", "mid", "senior", "lead"]
        new_diff = curr_diff
        
        if score >= 8.0:
            if curr_diff in DIFFICULTIES:
                idx = DIFFICULTIES.index(curr_diff)
                if idx < 4:
                    new_diff = DIFFICULTIES[idx + 1]
        elif score < 5.0:
            if curr_diff in DIFFICULTIES:
                idx = DIFFICULTIES.index(curr_diff)
                if idx > 0:
                    new_diff = DIFFICULTIES[idx - 1]
                    
        if new_diff != curr_diff:
            session.difficulty = f"adaptive_{new_diff}"
            # Find all future questions for this session
            future_records = db.query(QuestionRecord).filter(
                QuestionRecord.session_id == session.id,
                QuestionRecord.question_number > question_record.question_number
            ).order_by(QuestionRecord.question_number).all()
            
            num_future = len(future_records)
            if num_future > 0:
                # Select new questions for the remaining slot(s)
                previous_records = db.query(QuestionRecord).filter(
                    QuestionRecord.session_id == session.id,
                    QuestionRecord.question_number <= question_record.question_number
                ).all()
                prev_texts = [r.question_text.strip().lower() for r in previous_records]
                
                # Fetch pool of questions
                new_qs_pool = get_questions(session.topic, new_diff, count=num_future + 5)
                filtered_qs = [q for q in new_qs_pool if q["question"].strip().lower() not in prev_texts]
                
                for idx, rec in enumerate(future_records):
                    if idx < len(filtered_qs):
                        rec.question_text = filtered_qs[idx]["question"]
                        
    db.commit()
    
    # Fetch all questions to build updated_questions list for frontend
    all_qs = db.query(QuestionRecord).filter(QuestionRecord.session_id == session.id).order_by(QuestionRecord.question_number).all()
    updated_questions = []
    for q_rec in all_qs:
        q_meta = find_question_by_text(q_rec.question_text, session.topic)
        if q_meta:
            updated_questions.append({
                "id": q_meta.get("id", "unknown"),
                "question": q_rec.question_text,
                "ideal_answer": q_meta.get("ideal_answer", ""),
                "expected_keywords": q_meta.get("expected_keywords", [])
            })
        else:
            updated_questions.append({
                "id": f"q_{q_rec.question_number}",
                "question": q_rec.question_text,
                "ideal_answer": "",
                "expected_keywords": []
            })
            
    observer_comment = None
    if random.random() < 0.2:
        observer_comment = get_mid_interview_comment(
            {"blink_rate": request.blink_rate, "posture": request.posture_score, "fidgets": request.fidget_count},
            local_inference=session.local_inference,
            personality_style=session.personality_style
        )
    
    return {
        "success": True, 
        "architect_feedback": {
            "reaction": architect_result.get("reaction"), 
            "verdict": architect_result.get("technical_verdict"), 
            "what_was_right": architect_result.get("what_was_right"), 
            "what_was_wrong": architect_result.get("what_was_wrong"), 
            "follow_up": architect_result.get("follow_up_question"), 
            "score": architect_result.get("score"),
            "ideal_answer": ideal_answer  # send to frontend for display
        }, 
        "manager_feedback": {
            "reaction": manager_result.get("reaction"), 
            "clarity": manager_result.get("clarity_rating"), 
            "filler_penalty": manager_result.get("filler_word_penalty"), 
            "score": manager_result.get("score")
        }, 
        "observer_interrupt": observer_comment, 
        "answer_score": architect_result.get("score", 5.0),
        "emotion_detected": emotion_data.get("dominant_emotion", "neutral"),
        "updated_questions": updated_questions
    }

@router.get("/history/all")
async def get_history(db: Session = Depends(get_db)):
    sessions = db.query(InterviewSession).filter(InterviewSession.status == "completed").order_by(InterviewSession.started_at.desc()).all()
    return {"sessions": [{
        "id": s.id, 
        "user_name": s.user_name, 
        "topic": s.topic, 
        "difficulty": s.difficulty, 
        "overall_score": s.overall_score, 
        "started_at": s.started_at,
        "accuracy_score": s.accuracy_score,
        "communication_score": s.communication_score,
        "posture_score": s.posture_score,
        "blink_rate_score": s.blink_rate_score
    } for s in sessions]}

@router.get("/{session_id}")
async def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.id, 
        "user_name": session.user_name, 
        "topic": session.topic, 
        "difficulty": session.difficulty, 
        "status": session.status, 
        "overall_score": session.overall_score,
        "local_inference": session.local_inference,
        "personality_style": session.personality_style
    }
