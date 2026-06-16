"""
Mentor Mode API Route — V2
Generates personalized, empathetic AI mentor feedback based on 
per-question snapshots with full behavioral + technical data.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.llm import evaluate_with_llm

router = APIRouter()


class QuestionSnapshot(BaseModel):
    questionIndex: int = 0
    questionText: str = ""
    candidateAnswer: str = ""
    idealAnswer: str = ""
    score: float = 5.0
    emotionSummary: Optional[dict] = {}
    postureSnapshot: Optional[dict] = {}
    gazeAwayCount: int = 0
    blinkCount: int = 0
    screenExits: int = 0
    answerDuration: float = 30.0
    fillerCount: int = 0
    feedback: Optional[dict] = {}


class MentorFeedbackRequest(BaseModel):
    session_id: Optional[str] = ""
    scores: Optional[dict] = {}
    emotion_analytics: Optional[dict] = {}
    posture_summary: Optional[dict] = {}
    questions_summary: Optional[list] = []
    verdict: Optional[dict] = {}
    question_snapshots: Optional[List[QuestionSnapshot]] = []
    total_screen_exits: int = 0
    total_gaze_away: int = 0


@router.post("/feedback")
async def generate_mentor_feedback(request: MentorFeedbackRequest):
    """
    Generate personalized mentor feedback with empathetic, human-like coaching.
    Uses per-question snapshots for granular analysis.
    """

    # Build per-question detail block for the prompt
    per_question_block = ""
    snapshots = request.question_snapshots or []
    for i, snap in enumerate(snapshots):
        emotion = snap.emotionSummary.get("dominant_emotion", "neutral") if snap.emotionSummary else "neutral"
        posture_angle = snap.postureSnapshot.get("avg_angle", 0) if snap.postureSnapshot else 0
        posture_status = snap.postureSnapshot.get("worst_status", "GOOD") if snap.postureSnapshot else "GOOD"
        per_question_block += f"""
--- Question {i + 1} ---
Question: {snap.questionText}
Candidate's Answer: {snap.candidateAnswer or '(No response)'}
Correct/Ideal Answer: {snap.idealAnswer or '(Not available)'}
Score: {snap.score}/10
Dominant Emotion: {emotion}
Posture: angle={posture_angle}°, status={posture_status}
Gaze-Away Count: {snap.gazeAwayCount}
Blink Count: {snap.blinkCount}
Screen Exits (tab switches): {snap.screenExits}
Filler Words: {snap.fillerCount}
Answer Duration: {snap.answerDuration:.0f}s
AI Feedback: {snap.feedback.get('architectReaction', '') if snap.feedback else ''}
What Was Right: {snap.feedback.get('whatWasRight', '') if snap.feedback else ''}
What Was Wrong: {snap.feedback.get('whatWasWrong', '') if snap.feedback else ''}
"""

    # Fallback to questions_summary if no snapshots
    if not snapshots and request.questions_summary:
        for i, q in enumerate(request.questions_summary):
            per_question_block += f"""
--- Question {i + 1} ---
Question: {q.get('question', '')}
Candidate's Answer: {q.get('answer', '(No response)')}
Correct/Ideal Answer: {q.get('ideal_answer', '(Not available)')}
Score: {q.get('score', 5)}/10
Dominant Emotion: {q.get('dominant_emotion', 'neutral')}
"""

    system_prompt = """You are an empathetic, experienced interview coach named "Sentinel Mentor". 
You genuinely care about the candidate's growth. You speak warmly but honestly — like a wise 
older colleague who has mentored hundreds of professionals. You notice body language, 
facial expressions, and subtle behavioral patterns that others miss.

Your tone should be:
- Warm and encouraging, but never fake or patronizing
- Specific and actionable — reference exact questions and observations
- Emotionally intelligent — acknowledge the candidate's feelings
- Direct about weaknesses but always paired with a clear path forward

IMPORTANT: For each question, compare their answer to the ideal answer and explain 
what they got right, what they missed, and how to improve.

Return a JSON object with EXACTLY this structure:
{
  "greeting": "A warm, personalized opening that acknowledges the candidate just finished an interview (2-3 sentences)",
  "overall_impression": "A candid 3-4 sentence assessment of the overall interview (be specific about patterns you noticed)",
  "per_question_review": [
    {
      "question_number": 1,
      "question_text": "The question text",
      "your_answer_summary": "Brief summary of what the candidate said",
      "correct_answer_summary": "Brief summary of the ideal answer",
      "answer_verdict": "CORRECT or PARTIAL or INCORRECT or NO_RESPONSE",
      "emotion_observation": "What emotion was detected and what it suggests (e.g., 'You showed nervousness here — your fear response spiked. This is completely normal for pointer questions.')",
      "posture_observation": "Specific posture note (e.g., 'Your posture slouched to 15° — you were physically retreating from this question.')",
      "screen_exit_note": "Note about screen exits if any (e.g., 'You switched tabs once during this question — this is a red flag in real interviews.')",
      "improvement_tip": "One specific, actionable tip for this question"
    }
  ],
  "emotional_coaching": "2-3 sentences about their emotional patterns and how to improve composure (reference specific emotions detected)",
  "body_language_coaching": "2-3 sentences about posture, gaze, and physical presence with specific angles/data",
  "technical_coaching": "2-3 sentences about their technical knowledge gaps and study recommendations",
  "screen_presence_note": "A note about tab-switching and screen exits — this is critical in real remote interviews",
  "encouragement": "A genuine, motivating closing statement that leaves them feeling capable of improvement (2-3 sentences)",
  "priority_actions": ["Action 1 — the single most impactful change", "Action 2 — the second priority", "Action 3 — the third priority"]
}"""

    user_prompt = f"""INTERVIEW SESSION DATA:
═══════════════════════════════════════
Overall Score: {request.scores.get('overall', 'N/A')}/10
Technical Score: {request.scores.get('technical', 'N/A')}/10
Behavioral Score: {request.scores.get('behavioral', 'N/A')}/10
Communication Score: {request.scores.get('communication', 'N/A')}/10
Verdict: {request.verdict.get('hire_decision', 'N/A')}
One-Line Verdict: {request.verdict.get('one_line_verdict', '')}

EMOTION ANALYTICS:
- Session Dominant Emotion: {request.emotion_analytics.get('session_dominant_emotion', 'neutral')}
- Emotional Stability: {request.emotion_analytics.get('emotion_stability', 100)}%
- Composure Score: {request.emotion_analytics.get('emotion_composure_score', 10)}/10
- Total Mood Shifts: {request.emotion_analytics.get('emotion_changes', 0)}
- Emotion Distribution: {request.emotion_analytics.get('emotion_distribution', {{}})}

POSTURE DATA:
- Average Sitting Angle: {request.posture_summary.get('avg_angle', 0)}°
- Peak Angle: {request.posture_summary.get('max_angle', 0)}°
- Posture Stability: {request.posture_summary.get('stability_score', 100)}%
- Status Breakdown: {request.posture_summary.get('status_distribution', {{}})}

SCREEN PRESENCE:
- Total Tab Switches / Screen Exits: {request.total_screen_exits}
- Total Gaze-Away Events: {request.total_gaze_away}

DETAILED PER-QUESTION DATA:
{per_question_block}

Top Strength: {request.verdict.get('top_strength', '')}
Critical Weakness: {request.verdict.get('critical_weakness', '')}"""

    try:
        result = evaluate_with_llm(
            system_prompt, user_prompt,
            max_tokens=2000,
            temperature=0.7
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Mentor feedback generation failed: {str(e)}"
        )
