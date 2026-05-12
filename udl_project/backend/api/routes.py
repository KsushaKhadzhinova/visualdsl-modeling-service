"""
REST API endpoints для обработки диаграмм, сохранения, AI и экспорта.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..schemas import (
    ProcessRequest, ProcessResponse,
    DiagramCreate, DiagramResponse,
    AiRequest, AiResponse,
    ExportGithubRequest, ExportGithubResponse,
    HealthResponse
)
from ..db import get_db, Diagram
from ..parser import parse_udl, UDLParseError
from ..services import GeminiService, KrokiService, GitHubService
from ..core import logger, settings

router = APIRouter(prefix="/api", tags=["diagrams"])


# ===== HEALTH CHECK =====

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Проверка здоровья сервиса (доступность БД и API)."""
    logger.debug("Health check endpoint called")
    return HealthResponse(
        status="ok",
        service="VisualDSL Backend",
        version=settings.app_version,
        database="sqlite"
    )


# ===== DIAGRAM PROCESSING =====

@router.post("/process", response_model=ProcessResponse)
async def process_diagram(payload: ProcessRequest):
    """
    Обработать код диаграммы и вернуть результат (SVG или AST).
    
    Поддерживаемые движки: udl, mermaid, plantuml, graphviz, d2, kroki
    """
    engine = payload.engine.lower().strip()
    notation = payload.notation.lower().strip()
    
    logger.info(f"Processing diagram: engine={engine}, notation={notation}, code_len={len(payload.code)}")
    
    try:
        # === Внутренний UDL парсер ===
        if engine == "udl":
            try:
                parse_tree = parse_udl(payload.code)
                logger.debug("UDL parsing successful")
                return ProcessResponse(
                    status="success",
                    engine=engine,
                    notation=notation,
                    parse_tree=parse_tree,
                    metadata={"lines": len(payload.code.splitlines()), "chars": len(payload.code)}
                )
            except UDLParseError as exc:
                logger.error(f"UDL parse error: {exc.message}")
                raise HTTPException(status_code=422, detail=str(exc.message))
        
        # === Внешние рендеры (Kroki) ===
        if engine in {"mermaid", "plantuml", "graphviz", "d2", "kroki"}:
            target_type = engine if engine != "kroki" else (notation if notation and notation != "none" else "mermaid")
            
            try:
                svg = await KrokiService.render(payload.code, target_type)
                logger.debug(f"Kroki rendering successful for {target_type}")
                return ProcessResponse(
                    status="success",
                    engine=engine,
                    notation=notation,
                    svg=svg,
                    metadata={"lines": len(payload.code.splitlines()), "chars": len(payload.code)}
                )
            except Exception as exc:
                logger.error(f"Kroki rendering failed: {exc}")
                raise HTTPException(status_code=502, detail=f"Rendering failed: {str(exc)}")
        
        # === Неподдерживаемый движок ===
        logger.warning(f"Unsupported engine: {engine}")
        raise HTTPException(status_code=400, detail=f"Unsupported engine: {engine}")
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error in process_diagram: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== DATABASE OPERATIONS =====

@router.post("/save", response_model=DiagramResponse)
async def save_diagram(payload: DiagramCreate, db: Session = Depends(get_db)):
    """Сохранить диаграмму в БД."""
    logger.info(f"Saving diagram: title={payload.title}")
    
    try:
        diagram = Diagram(
            title=payload.title,
            code=payload.code,
            engine=payload.engine,
            notation=payload.notation
        )
        db.add(diagram)
        db.commit()
        db.refresh(diagram)
        
        logger.info(f"Diagram saved with ID: {diagram.id}")
        return DiagramResponse.from_orm(diagram)
        
    except Exception as exc:
        db.rollback()
        logger.error(f"Error saving diagram: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save diagram")


@router.get("/diagrams/{diagram_id}", response_model=DiagramResponse)
async def get_diagram(diagram_id: int, db: Session = Depends(get_db)):
    """Получить диаграмму по ID."""
    logger.debug(f"Fetching diagram {diagram_id}")
    
    diagram = db.query(Diagram).filter(
        Diagram.id == diagram_id,
        Diagram.is_active == True
    ).first()
    
    if not diagram:
        logger.warning(f"Diagram {diagram_id} not found")
        raise HTTPException(status_code=404, detail="Diagram not found")
    
    return DiagramResponse.from_orm(diagram)


@router.get("/diagrams", response_model=list[DiagramResponse])
async def list_diagrams(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """Получить список диаграмм."""
    logger.debug(f"Listing diagrams: skip={skip}, limit={limit}")
    
    diagrams = db.query(Diagram).filter(
        Diagram.is_active == True
    ).offset(skip).limit(limit).all()
    
    return [DiagramResponse.from_orm(d) for d in diagrams]


# ===== AI ASSISTANT =====

@router.post("/ai", response_model=AiResponse)
async def generate_ai_response(payload: AiRequest):
    """Запросить помощь AI для генерации или исправления кода диаграммы."""
    logger.info(f"AI request: mode={payload.mode}, prompt_len={len(payload.prompt)}")
    
    if not settings.gemini_api_key:
        logger.error("GEMINI_API_KEY not configured")
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        response_text = await GeminiService.generate_response(
            prompt=payload.prompt,
            context_code=payload.context_code
        )
        
        logger.info(f"AI response generated: {len(response_text)} chars")
        return AiResponse(
            status="success",
            response=response_text
        )
        
    except Exception as exc:
        logger.error(f"AI service error: {exc}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"AI service error: {str(exc)}")


# ===== EXPORT =====

@router.post("/export/github", response_model=ExportGithubResponse)
async def export_to_github(payload: ExportGithubRequest):
    """Экспортировать код диаграммы на GitHub как публичный Gist."""
    logger.info(f"GitHub export: title={payload.title}")
    
    try:
        result = await GitHubService.create_gist(
            code=payload.code,
            title=payload.title,
            description=payload.description
        )
        
        logger.info(f"GitHub export successful: {result['gist_url']}")
        return ExportGithubResponse(
            status="success",
            gist_url=result["gist_url"],
            gist_id=result["gist_id"]
        )
        
    except Exception as exc:
        logger.error(f"GitHub export failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(exc)}")
