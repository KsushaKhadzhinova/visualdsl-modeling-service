"""
AI Service - интеграция с Google Gemini API.
"""
from typing import Optional
import httpx
from ..core import settings, logger


class GeminiService:
    """Сервис для работы с Google Gemini API."""
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    TIMEOUT = 30.0
    
    @staticmethod
    async def generate_response(prompt: str, context_code: Optional[str] = None) -> str:
        """
        Генерирует ответ от Gemini AI.
        
        Args:
            prompt: Пользовательский запрос
            context_code: Опциональный код для контекста
            
        Returns:
            Сгенерированный ответ (код или текст)
            
        Raises:
            Exception: При ошибках API
        """
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY не установлен в .env")
        
        # Формируем системный контекст
        system_prompt = """You are an expert UDL (Universal Diagram Language) and architecture assistant. 
Your role is to help users write and refactor diagram code.
Respond with clean code only, without markdown backticks unless necessary.
Be concise and technical."""
        
        # Формируем полный промпт
        full_prompt = system_prompt
        if context_code:
            full_prompt += f"\n\nCurrent code:\n{context_code}\n\n"
        full_prompt += f"User request: {prompt}"
        
        try:
            logger.debug(f"Calling Gemini API with prompt length: {len(full_prompt)}")
            
            async with httpx.AsyncClient(timeout=GeminiService.TIMEOUT) as client:
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": full_prompt
                        }]
                    }]
                }
                
                response = await client.post(
                    f"{GeminiService.BASE_URL}?key={settings.gemini_api_key}",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code != 200:
                    error_detail = response.text
                    logger.error(f"Gemini API error {response.status_code}: {error_detail}")
                    raise Exception(f"Gemini API error: {response.status_code}")
                
                result = response.json()
                # Извлекаем текст из ответа
                text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                
                if not text:
                    raise Exception("Empty response from Gemini API")
                
                logger.info(f"Gemini response generated successfully ({len(text)} chars)")
                return text
                
        except httpx.TimeoutException:
            logger.error("Gemini API timeout")
            raise Exception("Gemini API timeout after 30 seconds")
        except Exception as exc:
            logger.error(f"Gemini service error: {exc}", exc_info=True)
            raise
