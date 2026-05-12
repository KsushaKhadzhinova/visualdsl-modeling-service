"""
VisualDSL IDE Backend - точка входа FastAPI приложения.
Асинхронный REST API для обработки диаграмм, парсинга, AI и сохранения.
"""
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import time

from udl_project.backend.core import settings, logger
from udl_project.backend.db import init_db
from udl_project.backend.api import router as api_router

# ===== ИНИЦИАЛИЗАЦИЯ FASTAPI == ===

app = FastAPI(
    title=settings.app_title,
    description="REST API для генерации и визуализации диаграмм через различные нотации",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# ===== MIDDLEWARE СТЕК =====

# CORS Middleware - разрешаем запросы с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Middleware - сжимаем большие ответы (SVG, parse trees)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ===== CUSTOM MIDDLEWARE =====

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Добавляет время обработки запроса в заголовки ответа для отладки."""
    start_time = time.time()
    
    # Логируем входящий запрос
    logger.debug(f"{request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(f"Request failed: {exc}", exc_info=True)
        raise
    
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Логируем исходящий ответ
    logger.debug(f"Response: {response.status_code} ({process_time:.3f}s)")
    
    return response


# ===== GLOBAL ERROR HANDLER =====

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Обработчик HTTP исключений - преобразует их в красивый JSON."""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "detail": exc.detail,
            "path": str(request.url.path)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Обработчик всех необработанных исключений."""
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "code": 500,
            "detail": "Internal server error. Please check the logs.",
            "path": str(request.url.path)
        }
    )


# ===== ЖИЗНЕННЫЙ ЦИКЛ ПРИЛОЖЕНИЯ =====

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске приложения."""
    logger.info(f"Starting {settings.app_title} v{settings.app_version}")
    logger.info(f"Environment: {settings.app_env}")
    logger.info(f"Database: {settings.database_url}")
    init_db()
    logger.info("Database initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Очистка при завершении приложения."""
    logger.info(f"Shutting down {settings.app_title}")


# ===== РЕГИСТРАЦИЯ МАРШРУТОВ =====

# API routes
app.include_router(api_router)


# ===== СТАТИЧЕСКИЕ ФАЙЛЫ =====

# Подключаем фронтенд (HTML, CSS, JS)
frontend_dir = Path(__file__).resolve().parents[1] / "frontend"
if frontend_dir.exists():
    logger.info(f"Mounting frontend from: {frontend_dir}")
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    logger.warning(f"Frontend directory not found: {frontend_dir}")


# ===== ЛОГИРОВАНИЕ ЗАПУСКА =====

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting Uvicorn server on {settings.app_host}:{settings.app_port}")
    uvicorn.run(
        "udl_project.backend.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_debug,
        log_level=settings.log_level.lower()
    )
