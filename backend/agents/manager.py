import json
from services.llm import evaluate_with_llm, generate_text_with_llm

def get_manager_prompt(personality_style: str = "Standard Brutal") -> str:
    base = """You are "The Manager" — a Head of Engineering conducting an interview. You evaluate communication quality.
RESPOND ONLY WITH THIS EXACT JSON, NO OTHER TEXT:
{
    "reaction": "Your verbal reaction in character",
    "clarity_rating": "EXCELLENT or GOOD or AVERAGE or POOR or TERRIBLE",
    "filler_word_penalty": "Comment on filler words used",
    "conciseness_verdict": "CONCISE or ACCEPTABLE or RAMBLING or INCOHERENT",
    "coaching_note": "One specific communication tip in character",
    "score": 6.0
}
Score out of 10. 10 = professional communicator. 1 = unpresentable.
"""
    if personality_style == "Soft & Encouraging":
        style_desc = """PERSONALITY: Warm, empathetic, and highly supportive of professional growth.
STYLE: Welcome communication with patience. Be coaching and positive in feedback. Give gentle tips to improve structural pacing and clarity while boosting the candidate's confidence."""
    elif personality_style == "Hyper-Technical Deep":
        style_desc = """PERSONALITY: Highly systematic, structured, and logical.
STYLE: Expect top-down communication structures, clear use of industry framing, precise technical terminology, and clean taxonomies. Assess their ability to communicate complex architectures without hand-waving."""
    else: # Standard Brutal
        style_desc = """PERSONALITY: Polished, sharp, impatient. Count every filler word. Hate rambling."""
        
    return f"{base}\n{style_desc}"

def evaluate_communication(answer_text, filler_word_count, speech_duration_seconds, words_per_minute=0, local_inference: bool = False, personality_style: str = "Standard Brutal"):
    word_count = len(answer_text.split())
    prompt = f"""
COMMUNICATION DATA:
- Answer: "{answer_text}"
- Filler Words: {filler_word_count}
- Duration: {speech_duration_seconds:.1f} seconds
- Word Count: {word_count}
- Pace: {words_per_minute:.0f} wpm (ideal 130-150)
Evaluate as The Manager. Respond ONLY in JSON.
"""
    system_prompt = get_manager_prompt(personality_style)
    try:
        result = evaluate_with_llm(system_prompt, prompt, max_tokens=400, temperature=0.7, local_inference=local_inference)
        result["agent"] = "manager"
        result["score"] = float(max(0.0, min(10.0, result.get("score", 5.0))))
        return result
    except Exception as e:
        return {"agent":"manager","reaction":"Analysis unavailable.","clarity_rating":"AVERAGE","filler_word_penalty":"Could not analyze.","conciseness_verdict":"ACCEPTABLE","coaching_note":"Focus on clarity.","score":5.0,"error":str(e)}

def generate_final_verdict(architect_score, observer_score, manager_score, architect_feedback, observer_feedback, manager_feedback, topic, difficulty, local_inference: bool = False, personality_style: str = "Standard Brutal"):
    overall = (architect_score * 0.5) + (observer_score * 0.25) + (manager_score * 0.25)
    prompt = f"""
FINAL DEBRIEF:
SCORES: Architect={architect_score}/10, Observer={observer_score}/10, Manager={manager_score}/10, Overall={overall:.1f}/10
SUMMARIES: Architect: {architect_feedback} | Observer: {observer_feedback} | Manager: {manager_feedback}
CONTEXT: {topic} at {difficulty} level.
Respond ONLY with this exact JSON:
{{
    "architect_closing": "The Architect brutal/supportive/technical closing 1-2 sentences",
    "observer_closing": "The Observer clinical/warm/technical closing 1-2 sentences",
    "manager_closing": "The Manager communication closing 1-2 sentences",
    "hire_decision": "STRONG HIRE or HIRE or BORDERLINE or NO HIRE or DEFINITE NO",
    "one_line_verdict": "The single most honest sentence about this candidate",
    "top_strength": "Their single best quality today",
    "critical_weakness": "The one thing that damaged their evaluation most",
    "action_plan": ["Specific action 1", "Specific action 2", "Specific action 3"],
    "overall_score": {overall:.1f}
}}
"""
    system_prompt = get_manager_prompt(personality_style)
    try:
        result = evaluate_with_llm(system_prompt, prompt, max_tokens=700, temperature=0.7, local_inference=local_inference)
        result["overall_score"] = overall
        return result
    except Exception as e:
        return {"hire_decision":"BORDERLINE","one_line_verdict":"Evaluation error.","overall_score":overall,"action_plan":["Fix API connection and retry."],"error":str(e)}
