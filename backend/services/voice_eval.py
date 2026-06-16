import os
import json
from services.llm import evaluate_with_llm

SYSTEM_PROMPT = """You are The Observer agent in a SentinelAI interview panel.
Evaluate the candidate's spoken answer and return ONLY a JSON object in this format:
{
  "score": 0.0,
  "accuracy": "",
  "missing": "",
  "tip": "",
  "verdict": ""
}"""

def evaluate_voice_answer(question: str, transcript: str):
    prompt = f"The candidate was asked: {question}\nTheir transcribed spoken answer is: {transcript}"
    
    try:
        result = evaluate_with_llm(SYSTEM_PROMPT, prompt, max_tokens=300, temperature=0.7)
        return result
    except Exception as e:
        return {
            "score": 5.0,
            "accuracy": "Could not evaluate due to system error.",
            "missing": "Unknown",
            "tip": "Speak clearly and try again.",
            "verdict": "Average"
        }
