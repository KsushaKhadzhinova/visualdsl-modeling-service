window.editorService = {
    editor: null,

    /**
     * Инициализирует редактор Monaco с поддержкой языка UDL.
     * @param {string} defaultValue - Код, который будет в редакторе при загрузке.
     * @param {string} theme - Текущая тема ('dark' или 'light').
     */
    initEditor(defaultValue, theme) {
        return new Promise((resolve, reject) => {
            if (!window.require) {
                return reject(new Error('RequireJS не найден. Проверьте подключение в index.html.'));
            }

            // Настройка путей для загрузки Monaco Editor из CDN
            window.require.config({
                paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs' }
            });

            window.require(['vs/editor/editor.main'], () => {
                // --- РЕГИСТРАЦИЯ ЯЗЫКА UDL ---
                monaco.languages.register({ id: 'udl' });

                // Определение правил подсветки синтаксиса (Monarch)
                monaco.languages.setMonarchTokensProvider('udl', {
                    tokenizer: {
                        root: [
                            // Ключевые слова (Keywords)
                            [/\b(class|node|edge|UML|BPMN|ERD|IDEF0|IDEF3|DFD)\b/, "keyword"],
                            // Строковые литералы
                            [/".*?"/, "string"],
                            // Комментарии
                            [/\/\/.*/, "comment"],
                            // Скобки и разделители
                            [/[{}()\[\]]/, "delimiter"],
                            // Операторы и стрелки связей
                            [/[->|<-|-->|<--|<->]/, "operator"],
                            // Типы данных
                            [/\b(String|Int|Float|Boolean|List|Map)\b/, "type"]
                        ]
                    }
                });

                // Создание экземпляра редактора
                this.editor = monaco.editor.create(document.getElementById('monaco-container'), {
                    value: defaultValue,
                    language: 'udl', // Устанавливаем наш зарегистрированный язык
                    theme: theme === 'dark' ? 'vs-dark' : 'vs',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    fontFamily: 'Fira Code, monospace',
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'all',
                    scrollbar: {
                        vertical: 'visible',
                        horizontal: 'visible',
                        useShadows: false,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10
                    }
                });

                // Сохранение в LocalStorage при каждом изменении (защита данных)
                this.editor.onDidChangeModelContent(() => {
                    localStorage.setItem('visualdsl-code', this.getValue());
                });

                resolve(this.editor);
            });
        });
    },

    /**
     * Возвращает текущий текст из редактора.
     */
    getValue() {
        if (this.editor) {
            return this.editor.getValue();
        }
        return '';
    },

    /**
     * Устанавливает новый текст в редактор.
     */
    setValue(value) {
        if (this.editor) {
            this.editor.setValue(value);
        }
    },

    /**
     * Переключает тему оформления (светлая/темная).
     */
    setTheme(theme) {
        if (this.editor) {
            monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
        }
    }
};