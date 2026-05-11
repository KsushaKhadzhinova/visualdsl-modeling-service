window.editorService = {
    editor: null,
    initEditor(defaultValue, theme) {
        return new Promise((resolve, reject) => {
            if (!window.require) {
                reject(new Error('RequireJS не найден'));
                return;
            }

            window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs' } });
            window.require(['vs/editor/editor.main'], () => {
                this.editor = monaco.editor.create(document.getElementById('monaco-container'), {
                    value: defaultValue,
                    language: 'plaintext',
                    theme: theme === 'dark' ? 'vs-dark' : 'vs',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    fontFamily: 'Fira Code, monospace',
                    fontSize: 13,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                });

                this.editor.onDidChangeModelContent(() => {
                    localStorage.setItem('visualdsl-code', this.getValue());
                });

                resolve(this.editor);
            });
        });
    },
    getValue() {
        return this.editor ? this.editor.getValue() : '';
    },
    setValue(value) {
        if (this.editor) {
            this.editor.setValue(value);
        }
    },
    setTheme(theme) {
        if (this.editor) {
            monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
        }
    },
};