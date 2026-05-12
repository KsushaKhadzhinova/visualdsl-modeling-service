from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func

# Параметры подключения к локальной базе данных SQLite
SQLALCHEMY_DATABASE_URL = 'sqlite:///./visualdsl.db'

# В тестах и локальном запуске часто используется существующая БД.
# Чтобы не получить несовпадение схемы (например, без столбца svg_output),
# перед созданием таблиц приводим модель к актуальному виду.
# В проде заменить на Alembic миграции.





# Создание движка БД (connect_args нужны специфично для SQLite)
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- МОДЕЛЬ ТАБЛИЦЫ ДЛЯ СОХРАНЕНИЯ ДИАГРАММ ---
class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Untitled Diagram")
    code = Column(Text, nullable=False)
    engine = Column(String, default="udl")
    notation = Column(String, default="none")
    svg_output = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    # Автоматическая фиксация времени создания записи
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DiagramVersion(Base):
    """Версии DSL-диаграммы для истории, diff и rollback."""

    __tablename__ = "diagram_versions"

    id = Column(Integer, primary_key=True, index=True)
    diagram_id = Column(Integer, nullable=False, index=True)
    code = Column(Text, nullable=False)
    engine = Column(String, default="udl")
    notation = Column(String, default="none")
    # метаданные MVP
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Инициализация (создает таблицы, если они еще не существуют)
Base.metadata.create_all(bind=engine)

# Для согласованности моделей с существующей схемой БД
# (особенно важно для sqlite в тестах)
Diagram.__table__.columns['svg_output'].nullable = True


# Генератор сессий для использования в FastAPI (Depends)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()