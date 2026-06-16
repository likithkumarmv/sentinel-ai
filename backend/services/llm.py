import os
import json
from groq import Groq
from google import genai
from google.genai import types

def call_ollama(system_prompt: str, user_prompt: str, json_format: bool = False, max_tokens: int = 150, temperature: float = 0.8) -> str:
    import httpx
    url = "http://localhost:11434/api/chat"
    payload = {
        "model": os.getenv("OLLAMA_MODEL", "llama3"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens
        },
        "stream": False
    }
    if json_format:
        payload["format"] = "json"
        
    try:
        response = httpx.post(url, json=payload, timeout=10.0)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]
    except Exception as e:
        print(f"Ollama call failed: {e}")
        raise e

def evaluate_with_llm(system_prompt: str, user_prompt: str, max_tokens: int = 600, temperature: float = 0.7, local_inference: bool = False) -> dict:
    """
    Evaluates the prompt using local Ollama if local_inference is active.
    Otherwise uses Gemini API first (if available), falls back to Groq.
    Returns the parsed JSON response.
    """
    if local_inference:
        try:
            print("[*] LLM Router: Querying local Ollama instance")
            content = call_ollama(system_prompt, user_prompt, json_format=True, max_tokens=max_tokens, temperature=temperature)
            return json.loads(content)
        except Exception as e:
            print(f"Ollama local inference failed, falling back to standard pipeline: {e}")
            # fall through to Gemini/Groq

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            client = genai.Client(api_key=gemini_key)
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini API failed, falling back to Groq: {e}")
            pass # Fall back to Groq
    
    # Fallback to Groq
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    try:
        res = groq_client.chat.completions.create(
            model=groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"}
        )
        return json.loads(res.choices[0].message.content)
    except Exception as e:
        raise e

def generate_text_with_llm(system_prompt: str, user_prompt: str, max_tokens: int = 150, temperature: float = 0.8, local_inference: bool = False) -> str:
    if local_inference:
        try:
            print("[*] LLM Router: Querying local Ollama instance")
            return call_ollama(system_prompt, user_prompt, json_format=False, max_tokens=max_tokens, temperature=temperature).strip()
        except Exception as e:
            print(f"Ollama local inference failed, falling back to standard pipeline: {e}")
            # fall through to Gemini/Groq

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            client = genai.Client(api_key=gemini_key)
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            )
            return response.text.strip()
        except Exception as e:
            pass

    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    res = groq_client.chat.completions.create(
        model=groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=temperature,
        max_tokens=max_tokens
    )
    return res.choices[0].message.content.strip()
