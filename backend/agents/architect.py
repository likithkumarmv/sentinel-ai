import json
from services.llm import evaluate_with_llm, generate_text_with_llm

def get_architect_prompt(personality_style: str = "Standard Brutal") -> str:
    base = """You are "The Architect" — a senior software engineer conducting a high-stakes interview.
RESPOND ONLY WITH THIS EXACT JSON, NO OTHER TEXT:
{
    "reaction": "Your immediate verbal reaction 1-2 sentences in character",
    "technical_verdict": "CORRECT or PARTIALLY_CORRECT or INCORRECT or IMPRESSIVE",
    "what_was_right": "What they got right",
    "what_was_wrong": "What they got wrong or missed",
    "follow_up_question": "Your next sharp/encouraging/deep question or null",
    "score": 7.5
}
Score out of 10. Never give 10. Stay in character always.
"""
    if personality_style == "Soft & Encouraging":
        style_desc = """PERSONALITY: Warm, supportive, encouraging, and detail growth paths.
STYLE: Emphasize their positive points first with friendly reinforcement, then gently guide them on what they missed. Focus on mentorship, using phrases like 'Excellent start', 'You're on the right track', 'Don't worry, let's think about...'. Format follow-up questions to guide them constructive and supportively. Do not be harsh."""
    elif personality_style == "Hyper-Technical Deep":
        style_desc = """PERSONALITY: Extremely academic, highly specialized, and deeply pedantic.
STYLE: Drill down into micro-optimizations, compiler instructions, assembly registers, memory layouts, time/space complexity, cache misses, and pointer arithmetic. Use extremely technical terminology. Be analytical and uncompromising; expect absolute precision on low-level implementation details."""
    else: # Standard Brutal
        style_desc = """PERSONALITY: Cold, analytical, zero patience. Interrupt flawed logic. Zero sugar-coating. Short sharp sentences."""
        
    return f"{base}\n{style_desc}"

def evaluate_answer(question, user_answer, topic, difficulty, ideal_answer=None, expected_keywords=None, conversation_history=None, local_inference: bool = False, personality_style: str = "Standard Brutal"):
    # Build the reference material section
    reference_section = ""
    if ideal_answer:
        reference_section += f'\nREFERENCE ANSWER (use this to evaluate accuracy): "{ideal_answer}"'
    if expected_keywords:
        reference_section += f'\nEXPECTED KEYWORDS: {", ".join(expected_keywords)}'

    prompt = f"""
    INTERVIEW CONTEXT:
    - Topic: {topic.replace('_', ' ').upper()}
    - Difficulty: {difficulty.upper()}
    QUESTION: "{question}"
    CANDIDATE ANSWER: "{user_answer}"
    {reference_section}
    Compare the candidate's answer against the reference answer. Identify what they got right, what they missed, and score accordingly. Respond ONLY with the JSON.
    """
    
    system_prompt = get_architect_prompt(personality_style)
    try:
        result = evaluate_with_llm(system_prompt, prompt, max_tokens=600, temperature=0.7, local_inference=local_inference)
        result["score"] = float(max(0.0, min(10.0, result.get("score", 5.0))))
        result["agent"] = "architect"
        return result
    except json.JSONDecodeError:
        return {"agent":"architect","reaction":"Analysis required.","technical_verdict":"PARTIALLY_CORRECT","what_was_right":"","what_was_wrong":"Parse error","follow_up_question":"Clarify your answer.","score":5.0}
    except Exception as e:
        print(f"Architect error: {e} — check GROQ_API_KEY in .env")
        return {"agent":"architect","reaction":"System error.","technical_verdict":"ERROR","what_was_right":"","what_was_wrong":str(e),"follow_up_question":None,"score":0.0,"error":str(e)}

def generate_opening(topic, difficulty, local_inference: bool = False, personality_style: str = "Standard Brutal"):
    system_prompt = get_architect_prompt(personality_style)
    try:
        return generate_text_with_llm(system_prompt, f"Generate a cold, supportive or deep 2-sentence opening for a {difficulty}-level {topic} interview in your personality style. No JSON. Just the text.", max_tokens=120, temperature=0.8, local_inference=local_inference)
    except Exception:
        return "We begin immediately. Answer precisely. Vagueness will be noted."
