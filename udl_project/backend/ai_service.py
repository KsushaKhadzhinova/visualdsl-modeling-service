import os
import httpx

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GEMINI_URL = 'https://api.openai.com/v1/chat/completions'

async def generate_ai_response(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError('Gemini API key is not configured.')

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            GEMINI_URL,
            headers={
                'Authorization': f'Bearer {GEMINI_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'gpt-4o-mini',
                'messages': [
                    {'role': 'system', 'content': 'You are an expert assistant for UDL and diagram DSL generation.'},
                    {'role': 'user', 'content': prompt},
                ],
                'max_tokens': 650,
            },
        )
        response.raise_for_status()
        payload = response.json()
        return payload['choices'][0]['message']['content']
