"""
Kroki Service - агрегатор рендеринга диаграмм.
Поддерживает PlantUML, Mermaid, Graphviz/DOT, D2.
"""
import httpx
from ..core import logger


class KrokiService:
    """Сервис для рендеринга диаграмм через Kroki API."""
    
    BASE_URL = "https://kroki.io"
    TIMEOUT = 30.0
    SUPPORTED_TYPES = {"mermaid", "plantuml", "dot", "d2"}
    
    @staticmethod
    async def render(code: str, diagram_type: str) -> str:
        """
        Рендерит диаграмму через Kroki API и возвращает SVG.
        
        Args:
            code: Исходный код диаграммы
            diagram_type: Тип диаграммы (mermaid, plantuml, dot, d2)
            
        Returns:
            SVG строка
            
        Raises:
            Exception: При ошибках рендеринга
        """
        diagram_type = diagram_type.lower().strip()
        
        # Нормализуем типы
        if diagram_type == "graphviz":
            diagram_type = "dot"
        
        if diagram_type not in KrokiService.SUPPORTED_TYPES:
            raise ValueError(f"Unsupported diagram type: {diagram_type}. Supported: {KrokiService.SUPPORTED_TYPES}")
        
        if not code or not code.strip():
            raise ValueError("Diagram code cannot be empty")
        
        try:
            logger.debug(f"Rendering {diagram_type} diagram ({len(code)} chars) via Kroki")
            
            url = f"{KrokiService.BASE_URL}/{diagram_type}/svg"
            
            async with httpx.AsyncClient(timeout=KrokiService.TIMEOUT) as client:
                response = await client.post(
                    url,
                    content=code.encode("utf-8"),
                    headers={"Content-Type": "text/plain"}
                )
                
                if response.status_code != 200:
                    error_text = response.text[:200]  # Первые 200 символов ошибки
                    logger.error(f"Kroki error {response.status_code}: {error_text}")
                    raise Exception(f"Kroki render failed: {response.status_code}")
                
                svg = response.text
                logger.info(f"Kroki rendering successful ({len(svg)} bytes SVG)")
                return svg
                
        except httpx.TimeoutException:
            logger.error("Kroki API timeout")
            raise Exception("Kroki API timeout after 30 seconds")
        except Exception as exc:
            logger.error(f"Kroki service error: {exc}", exc_info=True)
            raise
