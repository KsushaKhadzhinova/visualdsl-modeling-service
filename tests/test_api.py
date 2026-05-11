import pytest
from fastapi.testclient import TestClient
from udl_project.backend.main import app

client = TestClient(app)

def test_api_process_udl():
    """Тест API: Парсинг через POST запрос"""
    response = client.post("/api/process", json={
        "code": "class Test {}",
        "engine": "udl",
        "notation": "none"
    })
    assert response.status_code == 200
    assert "parseTree" in response.json()

def test_api_save_diagram():
    """Тест API: Сохранение через POST запрос"""
    response = client.post("/api/save", json={
        "title": "API Save Test",
        "code": "A -> B",
        "engine": "mermaid",
        "notation": "none"
    })
    assert response.status_code == 200
    assert "id" in response.json()

def test_api_ai_no_auth():
    """Тест API: Проверка ошибки AI без ключа (или с неверным ключом)"""
    # Этот тест пройдет, если сервер вернет ошибку при отсутствии переменной окружения
    response = client.post("/api/ai", json={"prompt": "draw a cat"})
    assert response.status_code in [400, 500]