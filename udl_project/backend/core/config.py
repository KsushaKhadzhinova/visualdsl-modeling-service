"""
Конфигурация приложения через Pydantic Settings.
Загружает переменные из .env файла в корне проекта.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Конфигурация FastAPI приложения."""
    
    # Database
    database_url: str = "sqlite:///./visualdsl.db"
    
    # API Keys
    gemini_api_key: Optional[str] = None
    
    # Application
    app_env: str = "development"
    app_debug: bool = True
    app_title: str = "VisualDSL IDE"
    app_version: str = "1.0.0"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/app.log"
    
    # Security
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:8000,file://"
    rate_limit: int = 100
    
    # GitHub
    github_api_url: str = "https://api.github.com"
    github_gist_public: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Глобальный экземпляр конфигурации
settings = Settings()
