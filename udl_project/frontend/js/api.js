window.apiService = {
    async processDiagram(code, engine, notation) {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, engine, notation }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error ? .detail || response.statusText || 'Network error');
        }

        return response.json();
    },

    async saveDiagram(code, engine, notation) {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('file-path').textContent || "Diagram",
                code,
                engine,
                notation
            }),
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении в базу данных');
        }
        return response.json();
    },
    async generateAiResponse(prompt) {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error ? .detail || response.statusText || 'AI error');
        }

        return response.json().then(data => data.response);
    },
};