"""
Pydantic модели для валидации входящих и исходящих данных.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ===== DIAGRAM SCHEMAS =====


class DiagramBase(BaseModel):
    """Базовые поля диаграммы."""

    title: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1)
    engine: str = Field(
        default="udl",
        pattern="^(udl|mermaid|plantuml|graphviz|d2|kroki)$",
    )
    notation: str = Field(default="none")


class DiagramCreate(DiagramBase):
    """Схема для создания новой диаграммы."""


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
    metadata: Optional[dict[str, object]] = None
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
    title: str = Field("diagram.udl", max_length=100)
    description: str = Field("Exported from VisualDSL IDE")


class ExportGithubResponse(BaseModel):
    """Ответ при экспорте на GitHub."""

    status: str = Field(default="success")
    gist_url: Optional[str] = None
    gist_id: Optional[str] = None
    error: Optional[str] = None


# ===== HISTORY / DIFF / ROLLBACK (MVP) =====


class DiagramVersionResponse(BaseModel):
    id: int
    diagram_id: int
    code: str
    engine: str
    notation: str
    created_at: datetime

    class Config:
        from_attributes = True


class DiffRequest(BaseModel):
    from_version_id: int = Field(..., ge=1)
    to_version_id: int = Field(..., ge=1)


class DiffResponse(BaseModel):
    status: str = Field(default="success")
    diff: str


class RollbackRequest(BaseModel):
    version_id: int = Field(..., ge=1)


# ===== EXPORT (SVG/PNG) (MVP) =====


class ExportRequest(BaseModel):
    engine: str
    notation: str
    code: str
    format: str = Field(..., pattern="^(svg|png)$")


class ExportResponse(BaseModel):
    status: str = Field(default="success")
    format: str
    svg: Optional[str] = None
    png_base64: Optional[str] = None
    error: Optional[str] = None


# ===== HEALTH CHECK =====


class HealthResponse(BaseModel):
    """Ответ health check эндпоинта."""

    status: str
    service: str
    version: str
    database: str

