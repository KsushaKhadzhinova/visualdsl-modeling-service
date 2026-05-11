import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from udl_project.backend.db import Base, Diagram

# Используем временную базу данных в памяти для тестов
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_diagram(db_session):
    """Тест: Запись диаграммы в БД"""
    new_diag = Diagram(title="Test", code="class A{}", engine="udl")
    db_session.add(new_diag)
    db_session.commit()
    
    saved = db_session.query(Diagram).first()
    assert saved.title == "Test"
    assert saved.code == "class A{}"