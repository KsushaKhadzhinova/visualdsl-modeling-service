window.apiService = {
    async processDiagram(code, engine, notation) {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, engine, notation }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.detail || response.statusText || 'Network error');
        }

        return response.json();
    },
};