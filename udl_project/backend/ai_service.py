import os
import httpx

# Получаем ключ из переменных окружения
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

# Правильный URL для Google Gemini 1.5 Flash
GEMINI_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}'

async def generate_ai_response(prompt: str) -> str:
    """
    Отправляет запрос к Google Gemini API и возвращает сгенерированный код.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError('Gemini API key is not configured. Проверьте файл .env или настройки среды.')

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Структура запроса для Gemini (отличается от OpenAI)
        payload = {
            "contents": [{
                "parts": [{
                    "text": f"You are an expert assistant for UDL and diagram DSL generation. Respond with code only, without markdown backticks if possible.\n\nUser request: {prompt}"
                }]
            }]
        }

        response = await client.post(
            GEMINI_URL,
            headers={'Content-Type': 'application/json'},
            json=payload
        )
        
        # Выбрасывает исключение, если статус код не 200
        response.raise_for_status()
        
        result = response.json()
        
        # Извлечение текста ответа из структуры Gemini
        try:
            return result['candidates'][0]['content']['parts'][0]['text']
        except (KeyError, IndexError):
            raise RuntimeError('Не удалось разобрать ответ от Gemini API.')