window.biSync = {
    highlightCodeLine(line) {
        if (!window.editorService ? .editor) return;
        const range = new monaco.Range(line, 1, line, 1);
        window.editorService.editor.deltaDecorations([], [{
            range,
            options: {
                isWholeLine: true,
                className: 'line-highlight',
            },
        }]);
        window.editorService.editor.revealLineInCenter(line);
    },
    clearHighlights() {
        if (!window.editorService ? .editor) return;
        window.editorService.editor.deltaDecorations([], []);
    },
};