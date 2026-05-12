"""API module - REST endpoints."""
from fastapi import APIRouter

router = APIRouter()

# Импортируем все роуты (они будут зарегистрированы ниже)
from . import routes  # noqa: F401, E402

__all__ = ["router"]
