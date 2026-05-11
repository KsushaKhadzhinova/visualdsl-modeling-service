from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func

# Подключение к локальной SQLite (создаст файл visualdsl.db)
SQLALCHEMY_DATABASE_URL = 'sqlite:///./visualdsl.db'

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- ДОБАВЛЯЕМ МОДЕЛЬ ТАБЛИЦЫ ---
class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Untitled Diagram")
    code = Column(Text, nullable=False)
    engine = Column(String, default="udl")
    notation = Column(String, default="none")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Автоматически создаем таблицу при запуске
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
