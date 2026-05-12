# TODO — закрытие ТЗ по коду (по этапам)

## Этап 1: Bi-Sync + SVG tagging + корректный mapping “SVG node → Monaco span”
- [ ] (BE) Добавить post-process SVG: проставлять стабильные атрибуты кликабельным DOM-узлам (data-udl-* / data-line или data-span), сохраняя структуру Kroki/PlantUML/Mermaid.
- [ ] (BE) Добавить слой mapping “AST/узел → исходный span”: минимум line range, лучше token/span диапазоны, чтобы фронт не делал ненадёжный includes(text).
- [x] (FE) Обновить `app.js`: клики по SVG должны использовать data-* атрибуты и вызывать `biSync.highlightCodeLine(...)` (fallback эвристика без includes()).

- [ ] (FE) Обновить `app.js`: клики по SVG должны использовать data-* атрибуты и вызывать `biSync.syncToSpan(...)` или `highlightCodeSpan(...)`.
- [ ] (FE) Обновить `bi-sync.js`: хранить active decorations ids и поддерживать highlight по диапазону (startLine/endLine либо start/end + column), а не только whole-line.
- [ ] (Tests) Добавить тесты mapping-контракта на нескольких sample SVG (юнит/интеграция с моками).

## Этап 2: AI контракт/очистка ответа
- [ ] (BE) Ввести контракт ответа от AI: JSON `{status, code, warnings}`.
- [ ] (BE) Добавить строгую очистку от markdown/fences и извлечение кода только по правилам.
- [ ] (BE) Защитить от prompt-injection: игнорировать попытки модифицировать формат/контракт.
- [ ] (FE) Применять только `code` (текст), не HTML.

## Этап 3: Persistence/Alembic/versioning
- [ ] (BE) Подключить Alembic и сделать первые миграции.
- [ ] (BE) Добавить таблицы версий/снапшотов и endpoints для history/rollback.

## Этап 4: Security/Quality gates
- [ ] (BE) Добавить rate limiting.
- [ ] (BE) Расширить `/health`: проверка БД подключения и внешних сервисов.
- [ ] (Tests) Увеличить coverage edge-cases: моки внешних API (Kroki/Gemini/GitHub).

## Этап 5: Export PDF/PNG и расширенный GitHub export
- [ ] (BE/FE) Добавить экспорт PDF/PNG.
- [ ] (BE/FE) Расширить GitHub export fail-cases и валидацию.

