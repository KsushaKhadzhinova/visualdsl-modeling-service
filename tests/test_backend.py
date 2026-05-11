import pytest
from fastapi.testclient import TestClient
from udl_project.backend.main import app

client = TestClient(app)

def test_read_main():
    """Проверка доступности фронтенда"""
    response = client.get("/")
    assert response.status_code == 200

def test_process_udl_valid():
    """Тест парсинга корректного UDL кода"""
    payload = {
        "code": "class User { +name: String }",
        "engine": "udl",
        "notation": "none"
    }
    response = client.post("/api/process", json=payload)
    assert response.status_code == 200
    assert "parseTree" in response.json()

def test_save_diagram():
    """Тест сохранения диаграммы в базу данных"""
    payload = {
        "title": "Test Diagram",
        "code": "node A -> node B",
        "engine": "mermaid",
        "notation": "none"
    }
    response = client.post("/api/save", json=payload)
    assert response.status_code == 200
    assert "id" in response.json()

def test_ai_endpoint_no_key():
    """Проверка обработки ошибки, если API ключ не настроен"""
    response = client.post("/api/ai", json={"prompt": "Hello"})
    # Если ключ не задан, сервер должен вернуть 500 или 400 с описанием
    assert response.status_code in [400, 500]