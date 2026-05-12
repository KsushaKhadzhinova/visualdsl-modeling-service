"""
Централизованное логирование через loguru.
"""
import sys
from pathlib import Path
from loguru import logger

from .config import settings

# Создаем папку для логов если её нет
log_dir = Path(settings.log_file).parent
log_dir.mkdir(parents=True, exist_ok=True)

# Удаляем стандартный обработчик loguru
logger.remove()

# Добавляем обработчик для вывода в консоль
logger.add(
    sys.stderr,
    level=settings.log_level,
    format="<level>{level: <8}</level> | <cyan>{name}:{function}:{line}</cyan> - <level>{message}</level>"
)

# Добавляем обработчик для записи в файл
logger.add(
    settings.log_file,
    level=settings.log_level,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    rotation="500 MB",  # Ротация при достижении 500 МБ
    retention="7 days"  # Хранить логи 7 дней
)

__all__ = ["logger"]
