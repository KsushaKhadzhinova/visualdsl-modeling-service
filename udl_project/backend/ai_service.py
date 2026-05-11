import os
import httpx

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
# Правильный URL для Google Gemini 1.5 Flash
GEMINI_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}'

async def generate_ai_response(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError('Gemini API key is not configured.')

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            GEMINI_URL,
            headers={'Content-Type': 'application/json'},
            json={
                "contents": [{
                    "parts": [{"text": f"You are an expert assistant for UDL and diagram DSL generation. Respond with code only.\n\nUser request: {prompt}"}]
                }]
            }
        )
        response.raise_for_status()
        payload = response.json()
        return payload['candidates'][0]['content']['parts'][0]['text']
