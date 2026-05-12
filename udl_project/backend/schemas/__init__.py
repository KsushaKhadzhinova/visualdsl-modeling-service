"""
Pydantic модели для валидации входящих и исходящих данных.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ===== DIAGRAM SCHEMAS =====

class DiagramBase(BaseModel):
    """Базовые поля диаграммы."""
    title: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1)
    engine: str = Field(default="udl", pattern="^(udl|mermaid|plantuml|graphviz|d2|kroki)$")
    notation: str = Field(default="none")


class DiagramCreate(DiagramBase):
    """Схема для создания новой диаграммы."""
    pass


class DiagramUpdate(BaseModel):
    """Схема для обновления диаграммы."""
    title: Optional[str] = Field(None, max_length=255)
    code: Optional[str] = Field(None, min_length=1)
    engine: Optional[str] = None
    notation: Optional[str] = None


class DiagramResponse(DiagramBase):
    """Схема ответа для диаграммы (с ID и датой)."""
    id: int
    svg_output: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ===== PROCESS REQUEST/RESPONSE =====

class ProcessRequest(BaseModel):
    """Запрос на обработку кода диаграммы."""
    code: str = Field(..., min_length=1)
    engine: str = Field(default="udl")
    notation: str = Field(default="none")


class ProcessResponse(BaseModel):
    """Ответ после обработки кода."""
    status: str = Field(default="success")
    engine: str
    notation: str
    svg: Optional[str] = None
    parse_tree: Optional[str] = None
    metadata: Optional[dict] = None
    error: Optional[str] = None


# ===== AI REQUEST/RESPONSE =====

class AiRequest(BaseModel):
    """Запрос к AI помощнику."""
    prompt: str = Field(..., min_length=1)
    mode: Optional[str] = Field(default="write", pattern="^(write|refactor|fix|ask)$")
    context_code: Optional[str] = None


class AiResponse(BaseModel):
    """Ответ от AI помощника."""
    status: str = Field(default="success")
    response: str
    tokens_used: Optional[int] = None
    error: Optional[str] = None


# ===== EXPORT REQUEST/RESPONSE =====

class ExportGithubRequest(BaseModel):
    """Запрос на экспорт на GitHub."""
    code: str = Field(..., min_length=1)
    title: Optional[str] = Field("diagram.udl", max_length=100)
    description: Optional[str] = Field("Exported from VisualDSL IDE")


class ExportGithubResponse(BaseModel):
    """Ответ при экспорте на GitHub."""
    status: str = Field(default="success")
    gist_url: Optional[str] = None
    gist_id: Optional[str] = None
    error: Optional[str] = None


# ===== HEALTH CHECK =====

class HealthResponse(BaseModel):
    """Ответ health check эндпоинта."""
    status: str
    service: str
    version: str
    database: str
