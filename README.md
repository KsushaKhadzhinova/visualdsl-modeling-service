# VisualDSL Modeling Service

Минимальный fullstack-проект с vanilla frontend и FastAPI backend.

## Структура

- `udl_project/frontend/` — статический клиент на HTML/CSS/JS
- `udl_project/backend/` — FastAPI сервер для UDL-парсинга и Kroki-рендеринга

## Запуск локально

**Требования:** Python 3.11+

1. Установите зависимости:
   ```powershell
   python -m pip install -r udl_project/backend/requirements.txt
   ```
2. Запустите сервер из корня репозитория:
   ```powershell
   python -m uvicorn udl_project.backend.main:app --reload --host 0.0.0.0 --port 8000
   ```
3. Откройте браузер:
   ```text
   http://127.0.0.1:8000/
   ```

## API

- `POST /api/process` — принимает JSON `{ code, engine, notation }`
- `POST /api/save` — сохраняет диаграмму в SQLite БД
- `POST /api/ai` — принимает JSON `{ prompt }` для генерации кода через Gemini
- `POST /api/export/github` — экспортирует код в GitHub Gist
- `GET /api/health` — проверка состояния сервиса

## Переменные окружения

- `GEMINI_API_KEY` — API-ключ для Google Gemini (требуется для AI Assistant)

## Примечания

Frontend теперь обслуживается напрямую FastAPI из `udl_project/frontend`.
AI Assistant доступен через кнопку "AI" в toolbar — поддерживает генерацию, рефакторинг и исправление кода.Zoom & Pan: масштабирование и перемещение диаграммы мышкой.
Bi-Sync: клик по SVG подсвечивает строку в редакторе.
Сохранение в БД: кнопка SAVE сохраняет в SQLite с версионированием.
Экспорт: SVG для диаграмм, код для текста.
GitHub интеграция: экспорт в публичные Gist.