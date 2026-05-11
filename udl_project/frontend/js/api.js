window.apiService = {
    /**
     * Отправляет код диаграммы на сервер для рендеринга.
     */
    async processDiagram(code, engine, notation) {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, engine: engine, notation: notation }),
        });

        if (!response.ok) {
            const error = await response.json().catch(function() { return null; });
            // Заменили error?.detail на классическую проверку
            const errorMessage = (error && error.detail) || response.statusText || 'Network error';
            throw new Error(errorMessage);
        }

        return response.json();
    },

    /**
     * Сохраняет текущую диаграмму в базу данных SQLite.
     */
    async saveDiagram(code, engine, notation) {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('file-path').textContent || "Diagram",
                code: code,
                engine: engine,
                notation: notation
            }),
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении в базу данных');
        }
        return response.json();
    },

    /**
     * Запрашивает генерацию или исправление кода у AI (Gemini).
     */
    async generateAiResponse(prompt) {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }),
        });

        if (!response.ok) {
            const error = await response.json().catch(function() { return null; });
            const errorMessage = (error && error.detail) || response.statusText || 'AI error';
            throw new Error(errorMessage);
        }

        return response.json().then(function(data) { return data.response; });
    },

    /**
     * Экспортирует код на GitHub Gist (демонстрация работы с внешними API).
     */
    async exportToGithub(code) {
        const response = await fetch('/api/export/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                description: "Exported from VisualDSL Modeling Service"
            }),
        });

        if (!response.ok) {
            throw new Error('Ошибка экспорта на GitHub');
        }
        return response.json();
    }
};