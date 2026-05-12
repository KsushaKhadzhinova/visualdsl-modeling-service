"""API module - REST endpoints."""
from fastapi import APIRouter

router = APIRouter()

# Импортируем роуты и экспортируем router из routes.py
from .routes import router as router  # noqa: F401

__all__ = ["router"]
