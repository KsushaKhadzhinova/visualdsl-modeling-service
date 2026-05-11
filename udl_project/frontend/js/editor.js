window.editorService = {
    editor: null,
    initEditor(defaultValue, theme) {
        return new Promise((resolve, reject) => {
            if (!window.require) return reject(new Error('RequireJS не найден'));

            window.require(['vs/editor/editor.main'], () => {
                // --- ДОБАВИТЬ ЭТОТ БЛОК: Регистрация языка UDL ---
                monaco.languages.register({ id: 'udl' });
                monaco.languages.setMonarchTokensProvider('udl', {
                    tokenizer: {
                        root: [
                            [/\b(UML|BPMN|ERD|IDEF0|IDEF3|DFD|class|node|edge)\b/, "keyword"],
                            [/".*?"/, "string"],
                            [/\/\/.*/, "comment"],
                            [/[{}()\[\]]/, "delimiter"],
                            [/[->]/, "operator"]
                        ]
                    }
                });
                // ----------------------------------------------------

                this.editor = monaco.editor.create(document.getElementById('monaco-container'), {
                    value: defaultValue,
                    language: 'udl', // ЗАМЕНИТЬ 'plaintext' на 'udl'
                    theme: theme === 'dark' ? 'vs-dark' : 'vs',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    fontFamily: 'Fira Code, monospace',
                    fontSize: 14, // Чуть покрупнее
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