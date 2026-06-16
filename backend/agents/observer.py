import json
from services.llm import evaluate_with_llm, generate_text_with_llm

def get_observer_prompt(personality_style: str = "Standard Brutal") -> str:
    base = """You are "The Observer" — a behavioral psychologist analyzing the candidate.
RESPOND ONLY WITH THIS EXACT JSON, NO OTHER TEXT:
{
    "observation": "Clinical behavioral observation 2-3 sentences",
    "blink_analysis": "Comment on blink rate",
    "posture_analysis": "Comment on posture",
    "anxiety_level": "LOW or MODERATE or HIGH or CRITICAL",
    "behavioral_verdict": "Psychological read on this candidate",
    "score": 6.5
}
Score out of 10. 10 = ice cold nerves. 1 = visibly falling apart.
"""
    if personality_style == "Soft & Encouraging":
        style_desc = """PERSONALITY: Warm, calming, and reassuring behavioral guide.
STYLE: Interpret fidgeting or high blink rate with empathy and understanding as normal nervous excitement. Frame behavioral notes constructively, reassuring them and helping them build physiological comfort."""
    elif personality_style == "Hyper-Technical Deep":
        style_desc = """PERSONALITY: Advanced cognitive science researcher.
STYLE: Describe behaviors in terms of oculomotor patterns, vestibular balance, postural drift, sympathetic nervous system activation, micro-tremors, and focus metrics. Use highly precise, academic physiological vocabulary."""
    else: # Standard Brutal
        style_desc = """PERSONALITY: Quiet, clinical, unsettling precision. Speak infrequently but devastatingly. Reference specific numbers."""
        
    return f"{base}\n{style_desc}"

def evaluate_behavior(blink_rate, posture_score, fidget_count, eye_contact_percentage, session_duration_seconds, local_inference: bool = False, personality_style: str = "Standard Brutal"):
    prompt = f"""
BEHAVIORAL DATA:
- Blink Rate: {blink_rate:.1f} per minute (normal 15-20)
- Posture Score: {posture_score:.1f}/100
- Fidget Movements: {fidget_count}
- Eye Contact: {eye_contact_percentage:.1f}% of session
- Duration: {session_duration_seconds} seconds
Analyze as The Observer. Respond ONLY in JSON.
"""
    system_prompt = get_observer_prompt(personality_style)
    try:
        result = evaluate_with_llm(system_prompt, prompt, max_tokens=400, temperature=0.6, local_inference=local_inference)
        result["agent"] = "observer"
        result["score"] = float(max(0.0, min(10.0, result.get("score", 5.0))))
        return result
    except Exception as e:
        return {"agent":"observer","observation":"Analysis unavailable.","anxiety_level":"MODERATE","behavioral_verdict":"Inconclusive.","score":5.0,"error":str(e)}

def get_mid_interview_comment(behavioral_data, local_inference: bool = False, personality_style: str = "Standard Brutal"):
    system_prompt = get_observer_prompt(personality_style)
    try:
        raw_text = generate_text_with_llm(system_prompt, f"Data: {json.dumps(behavioral_data)}. Generate ONE clinical or supportive behavioral observation. One sentence only. No JSON.", max_tokens=80, temperature=0.9, local_inference=local_inference)
        return raw_text.strip().strip('"')
    except Exception:
        return "Your micro-expressions suggest significantly higher anxiety than your words imply."
