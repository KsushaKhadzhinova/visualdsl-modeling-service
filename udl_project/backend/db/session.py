"""
Управление сессиями базы данных через SQLAlchemy.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from ..core import settings, logger
from .models import Base

# Создание движка БД
# Для SQLite: connect_args нужны для многопоточности
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    poolclass=StaticPool if "sqlite" in settings.database_url else None,
    echo=settings.app_debug  # Выводить SQL запросы в лог при debug=True
)

# Фабрика сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Инициализация БД: создание всех таблиц."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except Exception as exc:
        logger.error(f"Failed to initialize database: {exc}")
        raise


def get_db() -> Session:
    """
    Dependency для FastAPI: предоставляет сессию БД на время запроса.
    
    Пример использования в endpoint'е:
    ```python
    @app.get("/diagrams")
    async def list_diagrams(db: Session = Depends(get_db)):
        return db.query(Diagram).all()
    ```
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as exc:
        logger.error(f"Database session error: {exc}")
        db.rollback()
        raise
    finally:
        db.close()


# Инициализируем БД при импорте модуля
init_db()
