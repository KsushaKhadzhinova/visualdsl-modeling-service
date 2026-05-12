"""
GitHub Service - экспорт диаграмм как Gist.
"""
import httpx
from ..core import settings, logger


class GitHubService:
    """Сервис для создания публичных GitHub Gist'ов."""
    
    BASE_URL = "https://api.github.com/gists"
    TIMEOUT = 10.0
    
    @staticmethod
    async def create_gist(code: str, title: str = "diagram.udl", description: str = "") -> dict:
        """
        Создает публичный GitHub Gist с кодом диаграммы.
        
        Args:
            code: Исходный код диаграммы
            title: Название файла в Gist
            description: Описание Gist
            
        Returns:
            Словарь с url и id созданного Gist
            
        Raises:
            Exception: При ошибках API
        """
        if not code or not code.strip():
            raise ValueError("Code cannot be empty")
        
        try:
            logger.debug(f"Creating GitHub Gist: {title}")
            
            payload = {
                "description": description or "Exported from VisualDSL IDE",
                "public": settings.github_gist_public,
                "files": {
                    title: {
                        "content": code
                    }
                }
            }
            
            async with httpx.AsyncClient(timeout=GitHubService.TIMEOUT) as client:
                response = await client.post(
                    GitHubService.BASE_URL,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code not in (200, 201):
                    error_detail = response.text[:200]
                    logger.error(f"GitHub API error {response.status_code}: {error_detail}")
                    raise Exception(f"GitHub API error: {response.status_code}")
                
                result = response.json()
                gist_url = result.get("html_url")
                gist_id = result.get("id")
                
                logger.info(f"Gist created successfully: {gist_url}")
                
                return {
                    "gist_url": gist_url,
                    "gist_id": gist_id
                }
                
        except httpx.TimeoutException:
            logger.error("GitHub API timeout")
            raise Exception("GitHub API timeout")
        except Exception as exc:
            logger.error(f"GitHub service error: {exc}", exc_info=True)
            raise
