"""
SQLAlchemy модели для хранения диаграмм и истории.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Diagram(Base):
    """Модель для сохранения диаграмм."""
    __tablename__ = "diagrams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="Untitled Diagram", nullable=False)
    code = Column(Text, nullable=False)
    engine = Column(String(50), default="udl", nullable=False)
    notation = Column(String(50), default="none", nullable=False)
    svg_output = Column(Text, nullable=True)  # Кэш последнего SVG результата
    is_active = Column(Boolean, default=True)  # Мягкое удаление
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Diagram(id={self.id}, title='{self.title}', engine='{self.engine}')>"


class DiagramVersion(Base):
    """Модель для истории версий диаграмм (будущая фича)."""
    __tablename__ = "diagram_versions"

    id = Column(Integer, primary_key=True, index=True)
    diagram_id = Column(Integer, nullable=False, index=True)  # FK на diagrams.id
    code = Column(Text, nullable=False)
    engine = Column(String(50), nullable=False)
    notation = Column(String(50), nullable=False)
    change_description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<DiagramVersion(diagram_id={self.diagram_id}, id={self.id})>"
