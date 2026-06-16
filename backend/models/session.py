from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
import enum
from database import Base

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(100), default="Anonymous")
    topic = Column(String(50), nullable=False)
    difficulty = Column(String(20), nullable=False)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    full_transcript = Column(Text, nullable=True)
    posture_score = Column(Float, default=0.0)
    blink_rate_score = Column(Float, default=0.0)
    fidget_score = Column(Float, default=0.0)
    clarity_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    filler_word_score = Column(Float, default=0.0)
    accuracy_score = Column(Float, default=0.0)
    depth_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    total_flexion_seconds = Column(Float, default=0.0)
    biomechanical_fatigue = Column(Integer, default=0) # 0 or 1
    # Emotion analytics (session-level)
    dominant_emotion = Column(String(20), default="neutral")
    emotion_stability = Column(Float, default=100.0)
    architect_feedback = Column(Text, nullable=True)
    observer_feedback = Column(Text, nullable=True)
    manager_feedback = Column(Text, nullable=True)
    final_verdict = Column(Text, nullable=True)
    status = Column(String(20), default="in_progress")
    local_inference = Column(Boolean, default=False)
    personality_style = Column(String(50), default="Standard Brutal")
    scorecard_json = Column(Text, nullable=True)

    def __repr__(self):
        return f"<InterviewSession id={self.id} topic={self.topic} score={self.overall_score}>"

class QuestionRecord(Base):
    __tablename__ = "questions_asked"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)
    asked_by = Column(String(50), default="architect")
    answer_score = Column(Float, default=0.0) 
    ai_comment = Column(Text, nullable=True)
    max_angular_velocity = Column(Float, default=0.0)
    stress_spikes = Column(Integer, default=0)
    # Emotion analytics (per-question)
    dominant_emotion = Column(String(20), default="neutral")
    emotion_stability = Column(Float, default=100.0)
    emotion_distribution = Column(Text, nullable=True)
