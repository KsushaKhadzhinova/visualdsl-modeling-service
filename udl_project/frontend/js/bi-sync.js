window.biSync = {
    /**
     * Подсвечивает конкретную строку кода в редакторе Monaco.
     * @param {number} line - Номер строки для подсветки.
     */
    highlightCodeLine(line) {
        // Проверка наличия сервиса и инстанса редактора без использования ?.
        if (!window.editorService || !window.editorService.editor) return;

        // Создаем диапазон для выделения всей строки
        const range = new monaco.Range(line, 1, line, 1);

        // Применяем декорацию (класс 'line-highlight' должен быть описан в CSS)
        window.editorService.editor.deltaDecorations([], [{
            range: range,
            options: {
                isWholeLine: true,
                className: 'line-highlight',
            },
        }]);

        // Центрируем редактор на подсвеченной строке
        window.editorService.editor.revealLineInCenter(line);
    },

    /**
     * Очищает все текущие декорации и подсветки в редакторе.
     */
    clearHighlights() {
        if (!window.editorService || !window.editorService.editor) return;

        // Передача пустого массива вторым аргументом очищает декорации
        window.editorService.editor.deltaDecorations([], []);
    },
};